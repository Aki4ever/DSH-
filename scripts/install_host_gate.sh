#!/usr/bin/env bash
# ==============================================================================
# 管控拦截层 · 宿主注册脚本 (scripts/install_host_gate.sh)
# ==============================================================================
# 为什么需要它（2026-09-28 实测根因）：
#   本工程把「待办常显」「硬门禁」「常显看板」「自动命名」写在规则里当硬要求，
#   但这些能力的**唯一执行者是 ai-control/plugin 这个宿主机插件**。
#   实测：DSH 的 profiles/web/cordis.patch.yml 里从来没有它的注册条目，
#   plugin-status.txt 的 isHost=false（最后一次激活来自自检脚本）。
#   结论：规则在，机制不在——所有"必须"都只是 Markdown 里的一句话。
#
# 本脚本把"注册"变成一条幂等、可验证、可回滚的动作：
#   install  幂等注册**两条通道**：层栈补丁条目 + profile bundle 通道（写前自动备份）
#   verify   机器判定：条目是否存在（任一通道）+ 宿主是否真的激活过它（isHost=true）
#   uninstall 移除层栈补丁条目并摘掉 bundle 通道登记（回滚）
#
# 为什么 install 必须同时写 bundle 通道（2026-10-02 二次事故）：
#   旧版 install 只往 `cordis.patch.yml` 追加条目，而该文件被本仓之外的写者
#   整文件重写（实测 827 字节、条目消失），于是"注册过"的机制在宿主里再次不存在；
#   profile 的 `dependencies` + `dsh.profile.bundles`（结构化清单）在同一时刻原样存活。
#   判据早就认这条通道，但**没有任何动作去写它** —— 通道有判定、缺载体，等于没有。
#   本版补上写入动作，并按"条目已存在"的同一幂等语义处理，避免重复登记。
#
# 用法：
#   ./scripts/install_host_gate.sh verify        # 只查，退出码 1 表示载体坏了，2 表示已注册待重载
#   ./scripts/install_host_gate.sh install       # 补写两条通道（写前自动备份）
#   ./scripts/install_host_gate.sh uninstall     # 回滚两条通道
#
# 生效条件：DSH 需重新加载 profile（重启 App 或触发 HMR）；本脚本只保证"条目在位"，
#           **不谎称已生效**——生效与否一律以 verify 的 isHost 与条目双证据为准。
# ==============================================================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DSH_HOME_DIR="${DSH_HOME:-$HOME/.dsh}"
# ── profile 解析（2026-09-29 修 F3）────────────────────────────────────────────
# 原实现把 profile 硬编码成 `profiles/web/`。实测本机 `~/.dsh/profiles/` 下**只有 desktop**，
# `profiles/web/` 目录根本不存在 —— 于是 install 直接"找不到 profile 配置"、
# verify 永远报"条目缺失"，这个自证工具本身失去判定力（机制没坏，是工具查错了地方）。
# 现在按「显式环境变量 → 磁盘上真实存在的 profile 目录」解析，并把结果打印出来，绝不猜。
resolve_profile_dir() {
  if [ -n "${DSH_PROFILE_DIR:-}" ] && [ -d "$DSH_PROFILE_DIR" ]; then printf '%s' "$DSH_PROFILE_DIR"; return 0; fi
  if [ -n "${DSH_PROFILE:-}" ] && [ -d "$DSH_HOME_DIR/profiles/${DSH_PROFILE}" ]; then
    printf '%s' "$DSH_HOME_DIR/profiles/${DSH_PROFILE}"; return 0
  fi
  local d
  for d in "$DSH_HOME_DIR"/profiles/*/; do
    [ -f "${d}cordis.patch.yml" ] && { printf '%s' "${d%/}"; return 0; }
  done
  return 1
}
PROFILE_DIR="$(resolve_profile_dir || true)"
PROFILE_RESOLVED=1
if [ -z "$PROFILE_DIR" ]; then
  PROFILE_DIR="$DSH_HOME_DIR/profiles/web"   # 兼容旧布局：不崩，但下面会明确报"目录不存在"
  PROFILE_RESOLVED=0
fi
PATCH_FILE="$PROFILE_DIR/cordis.patch.yml"

# Node 运行时解析（REQ-087 R1 修复）：统一走单一权威实现，不依赖外部 PATH。
. "$SCRIPT_DIR/lib/find_node.sh"
NODE_BIN="$(find_node || true)"
STATUS_FILE="$DSH_HOME_DIR/.dsh-control/plugin-status.txt"
ENTRY_ID="ai-execution-control"
LOADER_ABS="$ROOT/ai-control/plugin/loader.mjs"
PLUGIN_DIR="$ROOT/ai-control/plugin"

ACTION="${1:-verify}"

# file:// URL 需要把空格与中文百分号编码，否则 YAML 里的 name 指向不存在的路径
url_encode_path() {
  "${NODE_BIN:-node}" -e 'const p=process.argv[1];process.stdout.write("file://"+p.split("/").map(s=>encodeURIComponent(s)).join("/"))' "$1"
}

# 拦截层注册的两条通道（任一成立即算"条目在位"）：
#   ① 旧通道：profile 层栈补丁 `cordis.patch.yml` 里的 `- insert: id: <ENTRY_ID>`；
#   ② 新通道：profile `package.json` 的 `dependencies` + `dsh.profile.bundles`（结构化清单）。
# 为什么必须认第二条（2026-10-02 实测事故）：层栈补丁文件会被**本仓之外的写者整文件重写**，
# 实测 00:42 它从 1475 字节被改写成 829 字节，条目连同 4 条用户设置一起消失；
# 而同一时刻 package.json 的 bundles 通道**原样存活**。判据只认单通道，就等于把机制押在最脆弱的那个文件上。
ENTRY_PKG="dsh-plugin-execution-control"
has_entry_bundles() {
  local pkgjson="$PROFILE_DIR/package.json"
  [ -f "$pkgjson" ] || return 1
  "${NODE_BIN:-node}" -e '
const fs=require("node:fs");
const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
const name=process.argv[2];
const dep=!!(j.dependencies&&j.dependencies[name]);
const bundle=!!(j.dsh&&j.dsh.profile&&Array.isArray(j.dsh.profile.bundles)&&j.dsh.profile.bundles.includes(name));
process.exit(dep&&bundle?0:1);
' "$pkgjson" "$ENTRY_PKG" 2>/dev/null
}
has_entry() { [ -f "$PATCH_FILE" ] && grep -q "id: $ENTRY_ID" "$PATCH_FILE"; }

# ── bundle 通道写入/摘除（2026-10-02 补物理载体）────────────────────────────────
# 结构化 JSON 用 node 改，不用 sed/grep：层栈补丁可以被整文件重写，但 package.json
# 必须保持合法 JSON，否则宿主连 profile 都读不了 —— 改坏比不改更糟。
# 幂等：dependencies 缺则补，bundles 缺则追加，已存在则逐项报告"已登记"，绝不重复写。
write_bundles_entry() {
  local pkgjson="$PROFILE_DIR/package.json"
  if [ ! -f "$pkgjson" ]; then
    echo "❌ 找不到 profile 清单：$pkgjson（bundle 通道无法登记）"
    return 1
  fi
  "${NODE_BIN:-node}" -e '
const fs = require("node:fs")
const [file, name, dir] = process.argv.slice(1)
const raw = fs.readFileSync(file, "utf8")
let j
try { j = JSON.parse(raw) } catch (e) { console.error("❌ package.json 不是合法 JSON：" + e.message); process.exit(1) }
const dep = "file:" + dir
let depChanged = false, bundleChanged = false
if (!j.dependencies) j.dependencies = {}
if (j.dependencies[name] === dep) { console.log("dependencies: ℹ️ 已登记（幂等，不重复写）") }
else { j.dependencies[name] = dep; depChanged = true; console.log("dependencies: ✅ 已补登记") }
if (!j.dsh) j.dsh = {}
if (!j.dsh.profile) j.dsh.profile = {}
if (!Array.isArray(j.dsh.profile.bundles)) j.dsh.profile.bundles = []
if (j.dsh.profile.bundles.includes(name)) { console.log("dsh.profile.bundles: ℹ️ 已登记（幂等，不重复写）") }
else { j.dsh.profile.bundles.push(name); bundleChanged = true; console.log("dsh.profile.bundles: ✅ 已补登记") }
if (!depChanged && !bundleChanged) process.exit(0)
const out = JSON.stringify(j, null, 2) + "\n"
fs.writeFileSync(file, out, "utf8")
// 写后读回：JSON 必须仍可解析且两处都在，否则拒绝报成功
const back = JSON.parse(fs.readFileSync(file, "utf8"))
const ok = !!(back.dependencies && back.dependencies[name]) &&
           !!(back.dsh && back.dsh.profile && Array.isArray(back.dsh.profile.bundles) && back.dsh.profile.bundles.includes(name))
if (!ok) { console.error("❌ 写后读回校验失败：两处登记未同时成立"); process.exit(1) }
console.log("✅ 写后读回校验通过（dependencies + bundles 双登记）")
' "$pkgjson" "$ENTRY_PKG" "$PLUGIN_DIR"
}

remove_bundles_entry() {
  local pkgjson="$PROFILE_DIR/package.json"
  [ -f "$pkgjson" ] || { echo "ℹ️ 无 profile 清单，bundle 通道无需回滚"; return 0; }
  "${NODE_BIN:-node}" -e '
const fs = require("node:fs")
const [file, name] = process.argv.slice(1)
const j = JSON.parse(fs.readFileSync(file, "utf8"))
let changed = false
if (j.dsh && j.dsh.profile && Array.isArray(j.dsh.profile.bundles)) {
  const before = j.dsh.profile.bundles.length
  j.dsh.profile.bundles = j.dsh.profile.bundles.filter(x => x !== name)
  if (j.dsh.profile.bundles.length !== before) { changed = true; console.log("dsh.profile.bundles: ✅ 已摘除") }
}
console.log(changed ? "✅ bundle 通道已回滚" : "ℹ️ bundle 通道未登记，无需回滚")
if (changed) fs.writeFileSync(file, JSON.stringify(j, null, 2) + "\n", "utf8")
' "$pkgjson" "$ENTRY_PKG"
}
entry_channel() {
  if has_entry && has_entry_bundles; then printf '层栈补丁 + bundles 双通道'; return 0; fi
  if has_entry; then printf '层栈补丁（旧通道，宿主重写会丢）'; return 0; fi
  if has_entry_bundles; then printf 'bundles（宿主重写抹不掉）'; return 0; fi
  printf '无'; return 1
}

# 宿主激活证据有两个来源，任一成立即算激活：
#   1) 追加式台账 host-activation.log（只记 isHost=true 事件，测试进程覆盖不掉）——首选；
#   2) 覆盖式 plugin-status.txt 里的 isHost=true —— 兼容旧记录。
# 为什么必须两源：plugin-status.txt 会被任何一次 apply 覆盖。实测 2026-09-28：
# 自检脚本在默认 stateDir 里 apply 一次，就把宿主真实激活记录覆盖成 isHost=false，
# 于是 verify 在机制明明活着时误报"未激活"。凭据必须是不被无关进程抹掉的那种。
# 脚本自身版本: v1.1.0
ACTIVATION_LOG="$DSH_HOME_DIR/.dsh-control/host-activation.log"
host_activated() {
  if [ -f "$ACTIVATION_LOG" ] && grep -q 'HOST ' "$ACTIVATION_LOG"; then return 0; fi
  [ -f "$STATUS_FILE" ] && grep -q '^isHost=true' "$STATUS_FILE"
}

# 取最近一次宿主激活记录（供展示）
host_evidence() {
  if [ -f "$ACTIVATION_LOG" ]; then
    tail -1 "$ACTIVATION_LOG" | sed 's/^/宿主激活台账: /'
  else
    grep -m1 '插件已激活' "$STATUS_FILE" 2>/dev/null || true
  fi
}

case "$ACTION" in
  verify)
    echo "🔎 管控拦截层宿主注册核查"
    echo "-----------------------------------------"
    echo "DSH 家目录: $DSH_HOME_DIR"
    if [ "$PROFILE_RESOLVED" -eq 1 ]; then
      echo "目标 profile: ${PROFILE_DIR}（已解析）"
    else
      echo "目标 profile: $PROFILE_DIR ⛔ 目录不存在（DSH_HOME 下未找到任何含 cordis.patch.yml 的 profile）"
    fi
    echo "注册文件: $PATCH_FILE"
    local_ok=0
    if entry_channel >/dev/null; then echo "条目存在: ✅ id=${ENTRY_ID}（通道：$(entry_channel)）"; local_ok=1; else echo "条目存在: ⛔ 缺失（两条通道均无：层栈补丁与 bundles）"; fi
    echo "加载器路径: $LOADER_ABS"
    [ -f "$LOADER_ABS" ] && echo "加载器文件: ✅ 存在" || { echo "加载器文件: ⛔ 不存在"; local_ok=0; }
    # 载体"能解析"才算在位（2026-09-29 新增）
    # 为什么必须补这一条：实战中 `ai-control/plugin/index.mjs` 曾带一个**真语法错误**
    # （try 块少一个闭括号）并被正常提交，而 verify 只检查"文件存在"就报在位 ——
    # 结果是"文件在、机制不在"：import 抛异常 → loader 降级为空插件 → 门禁与看板全都不存在，
    # 外观症状却与"插件没注册"一模一样。存在性检查抓不到这一类，必须真的解析一遍。
    if [ -x "$NODE_BIN" ]; then
      for f in "$LOADER_ABS" "$ROOT/ai-control/plugin/index.mjs"; do
        if "$NODE_BIN" --check "$f" >/dev/null 2>&1; then
          echo "语法自检  : ✅ $(basename "$f") 可解析"
        else
          echo "语法自检  : ⛔ $(basename "$f") 解析失败 —— 插件无法加载，机制等于不存在"
          local_ok=0
        fi
      done
    else
      echo "语法自检  : ⚠️ 找不到 node，跳过（此项判「未验证」，不算通过）"
    fi
    if host_activated; then
      echo "宿主激活: ✅ 有宿主激活凭据（$(host_evidence)）"
      host_ok=1
    else
      echo "宿主激活: ⛔ 无宿主激活凭据（host-activation.log 与 plugin-status.txt 均无 isHost=true）"
      echo "          提示：条目写入后需重载 profile 才会激活；未激活前所有硬门禁都不生效。"
      # 关键：这里**不能**把 local_ok 归零。载体是否存在与宿主是否已激活是两件事；
      # 混在一个变量里会让"已注册但还没重载"被判成"载体坏了"（实测踩过：
      # verify 在载体完好的情况下退 1，调用方只能一律报警）。
      host_ok=0
    fi
    echo "-----------------------------------------"
    # 三态语义（2026-09-28 修正）：
    #   0 = 已注册 且 有宿主运行时激活凭据（唯一可宣称"机制在运行"的状态）；
    #   1 = 载体坏了（条目缺失或加载器文件不存在）——真正的故障；
    #   2 = 已注册，但宿主尚未落运行时凭据（未重载 / 刚清空回填凭据）。
    # 为什么把 2 单独拆出来：把"还没跑起来"与"装坏了"混成同一个失败码，
    # 调用方就无法区分"该重启"与"该修配置"，只能一律报警。
    # 同时修一个真实缺陷：旧写法 `[ … ] && exit 0 || exit 1` 在本脚本里
    # 实测恒定返回 0（未激活时 verify 也报成功），使这个自证工具本身失去判定力。
    if [ "$local_ok" -ne 1 ]; then exit 1; fi
    if [ "$host_ok" -eq 1 ]; then exit 0; fi
    exit 2
    ;;
  install)
    if [ ! -f "$PATCH_FILE" ]; then echo "❌ 找不到 profile 配置：$PATCH_FILE"; exit 2; fi
    # 通道①：层栈补丁（幂等；已存在则跳过，但不影响通道②照常登记）
    if has_entry; then
      echo "ℹ️ 层栈补丁条目已存在，无需重复写入（幂等）"
    else
    if ! cp "$PATCH_FILE" "$PATCH_FILE.bak-$(date +%Y%m%d-%H%M%S)-install-gate" 2>/dev/null; then
      echo "❌ 备份失败（profile 目录不可写）：$PATCH_FILE"
      echo "   处置：给宿主 profile 目录写权限，或以更高权限重跑本命令；未备份前不改配置。"
      exit 1
    fi
    URL="$(url_encode_path "$LOADER_ABS")"
    # 落盘结果必须复核（REQ-087 R1 实测根因）：
    # 旧实现无条件 `cat >>` 后直接打印"✅ 已写入"，而沙箱/权限拒绝时
    # 写入静默失败也照样报成功、退出码 0 —— 自证工具自己说谎，比没有工具更糟。
    if ! cat >> "$PATCH_FILE" <<EOF

# ── AI 执行流程管控 · 拦截层（由 scripts/install_host_gate.sh 写入）────────────
# 为什么必须在这里插一行：本插件是宿主运行时的硬门禁与过程可见性来源。
# 没有它，"待办常显/硬门禁/常显看板/自动命名"在物理上都不存在（只有文档写着）。
# 注意：本文件会被宿主整文件重写，条目随时可能消失；真正抹不掉的是下方 bundle 通道。
# 走 loader.mjs 而非 index.mjs：加载失败降级为空插件，避免管控故障拖垮桌面端。
- insert:
    - id: $ENTRY_ID
      name: "$URL"
EOF
    then
      echo "❌ 写入失败（profile 配置文件不可写）：$PATCH_FILE"
      echo "   处置：给该文件写权限后重跑；未写入前宿主不会加载拦截层，硬门禁不生效。"
      exit 1
    fi
    if ! has_entry; then
      echo "❌ 写入后复核失败：文件中仍找不到条目 ${ENTRY_ID}，拒绝报成功"
      exit 1
    fi
    echo "✅ 层栈补丁条目已写入并复核在位：$PATCH_FILE"
    fi
    # 通道②：profile 结构化清单（dependencies + dsh.profile.bundles）
    # 为什么必须补写（2026-10-02 二次事故）：判据早认这条通道，但**没有任何动作去写它**，
    # 于是"通道有判定、缺载体"—— 层栈补丁被宿主重写后，机制在运行时静默消失。
    if ! cp "$PROFILE_DIR/package.json" "$PROFILE_DIR/package.json.bak-$(date +%Y%m%d-%H%M%S)-install-gate" 2>/dev/null; then
      echo "❌ profile 清单备份失败，拒绝改 package.json（未备份前不改配置）"
      exit 1
    fi
    if ! write_bundles_entry; then
      echo "❌ bundle 通道登记失败：宿主重写层栈补丁后拦截层仍会丢失"
      exit 1
    fi
    echo "✅ 两条通道均已登记（层栈补丁 + bundles）"
    echo "▶ 下一步：重载 profile（重启 DSH 桌面端）后运行：./scripts/install_host_gate.sh verify"
    echo "   注：本脚本只保证「载体已登记」，**不谎称已生效**；运行时证据一律以 verify 为准。"
    ;;
  uninstall)
    if has_entry; then
      cp "$PATCH_FILE" "$PATCH_FILE.bak-$(date +%Y%m%d-%H%M%S)-uninstall-gate" 2>/dev/null || { echo "❌ 备份失败，拒绝改动配置"; exit 1; }
      # 只删本条目的插入块：从注释行到 name 行，避免误伤其它插件配置
      "$NODE_BIN" -e '
const fs=require("node:fs")
const file=process.argv[1], id=process.argv[2]
const lines=fs.readFileSync(file,"utf8").split("\n")
const out=[]; let skipping=false
for (const line of lines) {
  if (/^- insert:/.test(line)) { skipping=false }
  if (/id:\s*["\x27]?/.test(line) && line.includes(id)) { skipping=true; continue }
  if (skipping) { if (/^\s*- id:/.test(line)) { skipping=false } else { continue } }
  out.push(line)
}
fs.writeFileSync(file,out.join("\n").replace(/\n{3,}/g,"\n\n"),"utf8")
' "$PATCH_FILE" "$ENTRY_ID"
      echo "✅ 层栈补丁条目已移除（备份已留存）"
    else
      echo "ℹ️ 层栈补丁条目不存在，无需回滚"
    fi
    cp "$PROFILE_DIR/package.json" "$PROFILE_DIR/package.json.bak-$(date +%Y%m%d-%H%M%S)-uninstall-gate" 2>/dev/null || { echo "❌ profile 清单备份失败，拒绝改动"; exit 1; }
    remove_bundles_entry || exit 1
    echo "▶ 回滚完成（注：本命令不动 pnpm 依赖树，包文件仍在 node_modules，重启后不再由 bundles 加载）"
    ;;
  *)
    echo "用法：$0 {verify|install|uninstall}"; exit 2
    ;;
esac
