#!/usr/bin/env node
/**
 * ⛔⛔⛔ [DEPRECATED 已废弃 · 2026-10-01 · REQ-089 D4] ⛔⛔⛔
 *
 * 本脚本**已永久失效，禁止再运行，也不得据其输出判定任何机制是否生效**。
 *
 * 失效根因（两层叠加，两层都不可逆）：
 *   ① **宿主更名**：`RUNTIME_ROOTS` 只认 `/Applications/DSH Desktop.app/…`，
 *      而当前应用已是 `/Applications/DeepSeek Harness.app`；
 *   ② **打包形态变更**：前端成品包已从"可写的目录"变成塞进 **`app.asar`（121MB 签名产物）**，
 *      不再是 `Resources/app/node_modules/@deepseek-ai/…` 那种可直接 patch 的目录。
 *   结果：本脚本 `--check` 永远找不到目标 → 长期处于"没打上"状态而无人察觉。
 *   这与 `mechanism_audit.mjs` 报「任务列表面板 ⛔ 找不到宿主前端产物」是**同一根因**。
 *
 * 替代路线（REQ-089 D4 裁决：改走**客户端插件**，不再 patch 宿主前端产物）：
 *   · 新载体：`skill-pool/plugins/` 下的客户端插件（`dsh.client.inject` + `cordis.patch.yml` 的 `insert`）；
 *   · 为什么换路线：客户端插件装在 `$DSH_HOME/profiles/<name>/node_modules`，
 *     **不碰 app.asar、不破签名、DSH 升级不会被覆盖**——而 patch 成品包每次升级都会丢。
 *
 * 保留本文件仅为**历史留痕与失效证据**（退役说明见文件头，做法同 `scripts/test_v180_spec.sh`）。
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 以下为废弃前的原始说明（仅存档，不代表当前可用）：
 *
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
/**
 * 可写的 DSH 前端成品包根目录。
 *
 * 2026-09-28 实测修正：App 的实际布局已变为
 * `…/Resources/app/node_modules/@deepseek-ai`（`Resources/runtime/…` 已不存在），
 * 而本脚本原先只认旧路径 → 体检直接报"未找到 DSH 运行时目录"→
 * **补丁长期处于"没打上"的状态而无人察觉**，表现为：任务列表没有逐条进度、
 * 完成项不打钩。故把真实路径放在最前，旧路径保留兼容。
 */
const RUNTIME_ROOTS = [
  "/Applications/DSH Desktop.app/Contents/Resources/app/node_modules/@deepseek-ai",
  "/Applications/DSH Desktop.app/Contents/Resources/runtime/harness/node_modules/@deepseek-ai",
  path.join(HOME, "Applications/DSH Desktop.app/Contents/Resources/app/node_modules/@deepseek-ai"),
  path.join(HOME, "Applications/DSH Desktop.app/Contents/Resources/runtime/harness/node_modules/@deepseek-ai"),
  "/Volumes/DSH Desktop/DSH Desktop.app/Contents/Resources/app/node_modules/@deepseek-ai",
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

/**
 * 工具名中文化。
 *
 * 2026-09-28 实测：新版产物已把标签改成 i18n 键（`search: "tool.title.search"`），
 * 由语言包统一出中文，**不再需要字面量替换**。原实现写死 `search: "Search"`，
 * App 升级后锚点全部落空，却只表现为"少打几处"而不报错 —— 于是体检长期红着、
 * 没人知道原因。现在这些条目一律 `replace: null`（跳过），并在体检里如实标注为
 * "已由 i18n 接管（无需补丁）"，而不是继续报 ❌ 制造假故障。
 */
const TOOL_PATCHES = [
  { name: "行标题（i18n 已接管）", find: '\t\t\tsearch: "Search",', replace: null },
  { name: "行标题（i18n 已接管）", find: '\t\t\tbash: "Bash",', replace: null },
];

const MARKER = "TodoPanel_module_css_default.barFill";

/**
 * 定位 TodoPanel 模块的 CSS 前缀（形如 `lXshSW`）与其样式串。
 *
 * 为什么必须动态解析、且**必须锚定 TodoPanel 自己的块**：
 *   ① 前缀是构建时哈希，App 每次发版都可能变；
 *   ② 一个产物里有 9 个 CSS 模块（`const css = …` 反复出现），
 *      用正则找"第一个 root 映射"会命中别的组件（实测拿到 `pXSMma`），
 *      于是补丁插错地方、体检永久红 —— 只在**组件专属注释**之后取前缀才可靠。
 * 2026-09-28 实测教训：旧实现把 `lXshSW` 与 `const css$9` 写死，App 升级后
 * 匹配不上却只表现为"少打一半、不报错"，没人发现进度条其实没装上。
 */
function locateTodoCss(text) {
  const marker = "TodoPanel.module.css.mjs";
  const at = text.indexOf(marker);
  if (at === -1) return null;
  const window = text.slice(at);
  const prefixMatch = window.match(/"root":\s*"([A-Za-z0-9]+)_root"/);
  if (!prefixMatch) return null;
  const prefix = prefixMatch[1];
  const anchor = `const css = ".${prefix}_root`;
  const start = text.indexOf(anchor, at);
  if (start === -1) return null;
  const end = text.indexOf('";', start);
  if (end === -1) return null;
  return { prefix, start, end };
}

/** 只取 TodoPanel 的 CSS 前缀（体检与补丁共用同一判据，避免两处各写一套）。 */
function detectTodoPrefix(text) {
  const found = locateTodoCss(text);
  return found ? found.prefix : null;
}

/** 追加进度条 CSS：插入到 TodoPanel 样式串尾部。 */
function patchCss(text) {
  const found = locateTodoCss(text);
  if (!found) return { text, changed: false, missing: true };
  const { prefix, end } = found;
  if (text.includes(`.${prefix}_bar{`)) return { text, changed: false };
  const P = `.${prefix}`;
  const cssExtra =
    `${P}_progressWrap{min-width:0;flex:auto;flex-direction:column;gap:3px;display:flex}` +
    `${P}_bar{background:var(--dsw-alias-border-l1);border-radius:2px;flex:none;width:100%;height:4px;overflow:hidden}` +
    `${P}_barFill{background:var(--dsw-alias-state-business-primary);border-radius:2px;height:100%;display:block;transition:width .3s ease}` +
    `${P}_itemProgress{color:var(--dsw-alias-label-tertiary);flex:none;align-items:center;gap:6px;font-size:12px;line-height:18px;display:flex}` +
    `${P}_itemState{flex:none;white-space:nowrap}` +
    `${P}_itemTrack{background:var(--dsw-alias-border-l1);border-radius:2px;width:36px;height:4px;overflow:hidden}` +
    `${P}_itemFill{background:var(--dsw-alias-label-tertiary);border-radius:2px;height:100%;display:block}` +
    `${P}_item[data-status="completed"] .${prefix}_itemFill{background:var(--dsw-alias-state-success-primary)}` +
    `${P}_item[data-status="in_progress"] .${prefix}_itemFill{background:var(--dsw-alias-state-business-primary)}` +
    // 完成态打钩：让"做好一个就钩上一个"在列表里肉眼可见
    `${P}_item[data-status="completed"] .${prefix}_itemState::before{content:"✓ ";font-weight:700;color:var(--dsw-alias-state-success-primary)}` +
    `${P}_item[data-status="in_progress"] .${prefix}_itemState::before{content:"◐ ";color:var(--dsw-alias-state-business-primary)}`;
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

/** 体检：补丁是否在位（判据全部与版本无关，不再依赖写死的前缀/字面量）。 */
function verify(root) {
  const checks = [];
  const conv = fs.readFileSync(path.join(root, CONV), "utf8");
  const tool = fs.readFileSync(path.join(root, TOOL), "utf8");
  const prefix = detectTodoPrefix(conv);
  checks.push(["看板总进度条（DOM）", conv.includes(MARKER)]);
  checks.push(["每行进度（DOM）", conv.includes("itemStateText")]);
  checks.push(["完成态打钩样式", prefix ? conv.includes(`.${prefix}_item[data-status="completed"] .${prefix}_itemState::before`) : false]);
  checks.push(["进度条样式（CSS）", prefix ? conv.includes(`.${prefix}_bar{`) : false]);
  // 工具名中文化：新版由 i18n 键驱动，如实区分"无需补丁"与"补丁缺失"
  const i18nManaged = tool.includes('bash: "tool.title.bash"') || tool.includes('search: "tool.title.search"');
  checks.push([i18nManaged ? "工具名中文化（i18n 已接管，无需补丁）" : "工具名中文化（需补丁）", i18nManaged || tool.includes('bash: "执行命令"')]);
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
