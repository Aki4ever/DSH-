#!/usr/bin/env node
/**
 * 补丁：给 DSH 输入坞任务条（TodoPanel）加「首栏总进度 + 每行实时进度」，并把
 * 硬编码英文标签（Think / Bash / Read …）中文化。
 *
 * 为什么是补丁而不是源码改动：DSH 桌面版把前端成品包放在
 * runtime/harness/node_modules/@deepseek-ai/&lt;包名&gt;/lib/client.js，宿主直接把这些文件
 * 作为浏览器模块服务（index.html 的 boot 图里是 /plugins/…/client.js?rev=哈希）。
 * 规则库不是 DSH 源码仓，因此只能对成品包做**幂等、可校验、可回滚**的补丁。
 *
 * 升级 App 覆盖后会失效 → 重跑本脚本即可（`--check` 用于体检）。
 *
 * 用法：
 *   node scripts/patch_dsh_todo_progress.cjs --check     # 只体检，不改（退出码 1 表示缺失）
 *   node scripts/patch_dsh_todo_progress.cjs --apply     # 打补丁（自动备份 + 校验 + 回读）
 *
 * 生效方式：刷新浏览器页面（宿主按文件哈希换 rev，无需重启 App）。
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const HOME = process.env.HOME || "";
/** 优先可写安装位；DMG 只读卷放最后（命中时会明确报错，见 main）。 */
const RUNTIME_ROOTS = [
  "/Applications/DSH Desktop.app/Contents/Resources/runtime/harness/node_modules/@deepseek-ai",
  path.join(HOME, "Applications/DSH Desktop.app/Contents/Resources/runtime/harness/node_modules/@deepseek-ai"),
  "/Volumes/DSH Desktop/DSH Desktop.app/Contents/Resources/runtime/harness/node_modules/@deepseek-ai",
];

const BACKUP_DIR = path.join(__dirname, "..", "ai-control", "reports", "bundle_backups");

/* ── 定位运行时目录（找不到就让调用方显式传 --root） ───────────────────── */
function resolveRuntime(explicit) {
  const roots = explicit ? [explicit] : RUNTIME_ROOTS;
  for (const root of roots) {
    if (fs.existsSync(path.join(root, "dsh-client-ui-conversation"))) return root;
  }
  return null;
}

/* ── 补丁定义：每处 = 文件 + 唯一锚点 + 期望出现次数 ───────────────────── */
const CONV = "dsh-client-ui-conversation/lib/client.js";
const TOOL = "dsh-client-ui-tool/lib/client.js";

/** 总进度 + 每行进度：注入工具函数与 CSS，并改写 progressLabel / 行渲染。 */
const CONV_PATCHES = [
  {
    name: "进度工具函数",
    find: "\t\tfunction progressLabel(todos, t) {",
    replace:
      "\t\tfunction todoDone(todos) {\n" +
      "\t\t\treturn todos.filter((item) => item.status === \"completed\").length + todos.filter((item) => item.status === \"in_progress\").length * 0.5;\n" +
      "\t\t}\n" +
      "\t\t/** 总进度百分比 —— 进行中按半步计（口径见 docs/constraint_mechanism_optimize_4.md）。 */\n" +
      "\t\tfunction todoPercent(todos) {\n" +
      "\t\t\tif (todos.length === 0) return 0;\n" +
      "\t\t\treturn Math.round(todoDone(todos) / todos.length * 100);\n" +
      "\t\t}\n" +
      "\t\t/** 单行进度：已完成 100% / 进行中 50% / 待处理 0%。 */\n" +
      "\t\tfunction itemPercent(status) {\n" +
      "\t\t\treturn status === \"completed\" ? 100 : status === \"in_progress\" ? 50 : 0;\n" +
      "\t\t}\n" +
      "\t\tfunction itemStateText(status) {\n" +
      "\t\t\treturn status === \"completed\" ? \"已完成\" : status === \"in_progress\" ? \"进行中\" : \"待处理\";\n" +
      "\t\t}\n" +
      "\t\tfunction progressLabel(todos, t) {",
  },
  {
    name: "标题栏进度文案带总数与百分比",
    find: "\t\t\t].join(\" · \");\n\t\t}",
    replace:
      "\t\t\t].join(\" · \") + \"　\" + todoPercent(todos) + \"%（\" + done + \"/\" + todos.length + \"）\";\n\t\t}",
  },
  {
    name: "首栏总进度条",
    find: "\t\t\t\t\t\t\t\tchildren: progressLabel(todos, t)\n\t\t\t\t\t\t\t}),",
    replace:
      "\t\t\t\t\t\t\t\tchildren: (\n" +
      "\t\t\t\t\t\t\t\t\t(0, react_jsx_runtime.jsxs)(\"span\", {\n" +
      "\t\t\t\t\t\t\t\t\t\tclassName: TodoPanel_module_css_default.progressWrap,\n" +
      "\t\t\t\t\t\t\t\t\t\tchildren: [(0, react_jsx_runtime.jsx)(\"span\", {\n" +
      "\t\t\t\t\t\t\t\t\t\t\tclassName: TodoPanel_module_css_default.progress,\n" +
      "\t\t\t\t\t\t\t\t\t\t\tchildren: progressLabel(todos, t)\n" +
      "\t\t\t\t\t\t\t\t\t\t}), (0, react_jsx_runtime.jsx)(\"span\", {\n" +
      "\t\t\t\t\t\t\t\t\t\t\tclassName: TodoPanel_module_css_default.bar,\n" +
      "\t\t\t\t\t\t\t\t\t\t\t\"aria-hidden\": true,\n" +
      "\t\t\t\t\t\t\t\t\t\t\tchildren: (0, react_jsx_runtime.jsx)(\"span\", {\n" +
      "\t\t\t\t\t\t\t\t\t\t\t\tclassName: TodoPanel_module_css_default.barFill,\n" +
      "\t\t\t\t\t\t\t\t\t\t\t\tstyle: { width: todoPercent(todos) + \"%\" }\n" +
      "\t\t\t\t\t\t\t\t\t\t\t})\n" +
      "\t\t\t\t\t\t\t\t\t\t})]\n" +
      "\t\t\t\t\t\t\t\t\t})\n" +
      "\t\t\t\t\t\t\t\t)\n" +
      "\t\t\t\t\t\t\t}),",
  },
  {
    name: "每行实时进度",
    find: "\t\t\t\t\t\t\t\tchildren: item.content\n\t\t\t\t\t\t\t})]",
    replace:
      "\t\t\t\t\t\t\t\tchildren: item.content\n" +
      "\t\t\t\t\t\t\t}), (0, react_jsx_runtime.jsxs)(\"span\", {\n" +
      "\t\t\t\t\t\t\t\tclassName: TodoPanel_module_css_default.itemProgress,\n" +
      "\t\t\t\t\t\t\t\tchildren: [(0, react_jsx_runtime.jsx)(\"span\", {\n" +
      "\t\t\t\t\t\t\t\t\tclassName: TodoPanel_module_css_default.itemState,\n" +
      "\t\t\t\t\t\t\t\t\tchildren: itemStateText(item.status)\n" +
      "\t\t\t\t\t\t\t\t}), (0, react_jsx_runtime.jsx)(\"span\", {\n" +
      "\t\t\t\t\t\t\t\t\tclassName: TodoPanel_module_css_default.itemTrack,\n" +
      "\t\t\t\t\t\t\t\t\t\"aria-hidden\": true,\n" +
      "\t\t\t\t\t\t\t\t\tchildren: (0, react_jsx_runtime.jsx)(\"span\", {\n" +
      "\t\t\t\t\t\t\t\t\t\tclassName: TodoPanel_module_css_default.itemFill,\n" +
      "\t\t\t\t\t\t\t\t\t\tstyle: { width: itemPercent(item.status) + \"%\" }\n" +
      "\t\t\t\t\t\t\t\t\t})\n" +
      "\t\t\t\t\t\t\t\t})]\n" +
      "\t\t\t\t\t\t\t})]",
  },
  {
    name: "进度条样式",
    find: 'const css$9 = "._',
    // 实际锚点是下面这行拼接出来的字符串，见 patchCss()
    replace: null,
  },
  { name: "思考中", find: '\t\t\t\t\ttitle: "Think",', replace: '\t\t\t\t\ttitle: "思考中",' },
];

/** 工具名中文化（硬编码设计字面量，非语言包）。 */
const TOOL_PATCHES = [
  { name: "行标题", find: '\t\t\tsearch: "Search",', replace: '\t\t\tsearch: "搜索",' },
  { name: "行标题", find: '\t\t\tread: "Read",', replace: '\t\t\tread: "读取",' },
  { name: "行标题", find: '\t\t\tbash: "Bash",', replace: '\t\t\tbash: "执行命令",' },
  { name: "行标题", find: '\t\t\twrite: "Write",', replace: '\t\t\twrite: "写入",' },
  { name: "行标题", find: '\t\t\tedit: "Edit",', replace: '\t\t\tedit: "编辑",' },
  { name: "行标题", find: '\t\t\tcode: "Code",', replace: '\t\t\tcode: "代码",' },
  { name: "行标题", find: '\t\t\tothers: "Tool call"', replace: '\t\t\tothers: "工具调用"' },
];

const MARKER = "TodoPanel_module_css_default.barFill";

/** 追加进度条 CSS：插入到看板样式串尾部（".lXshSW_item{...}" 之后）。 */
function patchCss(text) {
  if (text.includes(".lXshSW_bar{")) return { text, changed: false };
  const anchor = 'const css$9 = ".lXshSW_root';
  const start = text.indexOf(anchor);
  if (start === -1) return { text, changed: false, missing: true };
  const end = text.indexOf('";', start);
  const cssExtra =
    ".lXshSW_progressWrap{min-width:0;flex:auto;flex-direction:column;gap:3px;display:flex}" +
    ".lXshSW_bar{background:var(--dsw-alias-border-l1);border-radius:2px;flex:none;width:100%;height:4px;overflow:hidden}" +
    ".lXshSW_barFill{background:var(--dsw-alias-state-business-primary);border-radius:2px;height:100%;display:block;transition:width .3s ease}" +
    ".lXshSW_itemProgress{color:var(--dsw-alias-label-tertiary);flex:none;align-items:center;gap:6px;font-size:12px;line-height:18px;display:flex}" +
    ".lXshSW_itemState{flex:none;white-space:nowrap}" +
    ".lXshSW_itemTrack{background:var(--dsw-alias-border-l1);border-radius:2px;width:36px;height:4px;overflow:hidden}" +
    ".lXshSW_itemFill{background:var(--dsw-alias-label-tertiary);border-radius:2px;height:100%;display:block}" +
    '.lXshSW_item[data-status="completed"] .lXshSW_itemFill{background:var(--dsw-alias-state-success-primary)}' +
    '.lXshSW_item[data-status="in_progress"] .lXshSW_itemFill{background:var(--dsw-alias-state-business-primary)}';
  return { text: text.slice(0, end) + cssExtra + text.slice(end), changed: true };
}

function applyTo(root, { dryRun }) {
  const report = [];
  for (const [rel, patches] of [
    [CONV, CONV_PATCHES],
    [TOOL, TOOL_PATCHES],
  ]) {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) {
      report.push({ file: rel, ok: false, note: "文件不存在" });
      continue;
    }
    let text = fs.readFileSync(file, "utf8");
    const before = text;

    // CSS 追加
    const css = patchCss(text);
    if (css.changed) text = css.text;

    for (const p of patches) {
      if (p.replace === null) continue; // 由 patchCss 处理
      const count = text.split(p.find).length - 1;
      if (count === 0) continue; // 已打过或版本变了
      if (count > 1) {
        report.push({ file: rel, ok: false, note: `锚点不唯一（${count} 处）：${p.name}` });
        continue;
      }
      text = text.replace(p.find, p.replace);
    }

    const changed = text !== before;
    if (changed && !dryRun) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      fs.writeFileSync(path.join(BACKUP_DIR, `${rel.replace(/\//g, "_")}.${stamp}.bak`), before);
      fs.writeFileSync(file, text);
    }
    if (changed) report.push({ file: rel, ok: true, note: dryRun ? "待打补丁" : "已打补丁" });
  }
  return report;
}

/** 体检：补丁是否在位。 */
function verify(root) {
  const checks = [];
  const conv = fs.readFileSync(path.join(root, CONV), "utf8");
  const tool = fs.readFileSync(path.join(root, TOOL), "utf8");
  checks.push(["看板总进度条", conv.includes(MARKER)]);
  checks.push(["每行进度", conv.includes("itemStateText")]);
  checks.push(["看板进度样式", conv.includes(".lXshSW_bar{")]);
  checks.push(["思考中标签", conv.includes('title: "思考中"')]);
  checks.push(["执行命令标签", tool.includes('bash: "执行命令"')]);
  checks.push(["搜索标签", tool.includes('search: "搜索"')]);
  return checks;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--apply");
  const i = args.indexOf("--root");
  const explicit = i === -1 ? null : args[i + 1];
  if (i !== -1 && (!explicit || explicit.startsWith("--"))) {
    console.error("❌ --root 后面要跟 @deepseek-ai 目录路径");
    process.exit(2);
  }
  const root = resolveRuntime(explicit);
  if (!root) {
    console.error("❌ 未找到 DSH 运行时目录（用 --root 显式指定 @deepseek-ai 所在目录）");
    process.exit(2);
  }
  const roFs = fs.statfsSync ? fs.statfsSync(root).flags & 1 : 0; // ST_RDONLY = 1
  if (roFs && !dryRun) {
    console.error(`❌ ${root}\n   所在卷是只读的（App 仍在 DMG 里）→ 先把 App 复制到 /Applications 再打补丁。`);
    process.exit(3);
  }
  console.log(`运行时目录：${root}`);
  const report = applyTo(root, { dryRun });
  for (const r of report) console.log(`${r.ok ? "✅" : "❌"} ${r.file} — ${r.note}`);
  if (dryRun && report.length === 0) console.log("✅ 无待打补丁（已是目标状态）");
  const checks = verify(root);
  console.log("── 回读校验 ──");
  let all = true;
  for (const [name, ok] of checks) {
    console.log(`${ok ? "✅" : "❌"} ${name}`);
    if (!ok) all = false;
  }
  console.log(all ? "结果：补丁在位（刷新页面即生效，无需重启）" : "结果：补丁缺失，请跑 --apply");
  process.exit(all ? 0 : 1);
}

main();
