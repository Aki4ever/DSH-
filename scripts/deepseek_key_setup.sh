#!/usr/bin/env bash
# ==============================================================================
# DeepSeek API Key 一键接入 (scripts/deepseek_key_setup.sh)
# ==============================================================================
# 为什么需要它：底部用量栏与常显看板要显示**真实**剩余额度，就必须调用官方
#   GET https://api.deepseek.com/user/balance
# 而该接口只认 `Authorization: Bearer sk-...`（实测用桌面端账号令牌调用返回
#   401 Authentication Fails (auth header format should be Bearer sk-...)）。
# 也就是说：账号能登录，不等于有 API Key —— 两套东西。所以需要一个"把 Key 安全落盘"
# 的入口，而不是让你把密钥粘进对话记录里。
#
# 用法：
#   ./scripts/deepseek_key_setup.sh            # 交互式粘贴（输入不回显），写盘并当场验证
#   ./scripts/deepseek_key_setup.sh --from-env # 从 $DEEPSEEK_API_KEY 读取（CI/脚本场景）
#   ./scripts/deepseek_key_setup.sh --check    # 只报告是否已配置（绝不打印密钥）
#   ./scripts/deepseek_key_setup.sh --clear    # 删除已落盘的密钥
#
# 落盘位置：$DSH_HOME/.dsh-control/deepseek_api_key（权限 600，单行，仅接受 sk- 开头）
# 安全约束：任何分支都**不回显**密钥；--check 只输出"已配置/未配置 + 长度"。
#
# 退出码：0 已就绪（配置成功且接口可用）/ 1 校验或取数失败 / 2 用法错误
# ==============================================================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DSH_HOME_DIR="${DSH_HOME:-$HOME/.dsh}"
KEY_FILE="$DSH_HOME_DIR/.dsh-control/deepseek_api_key"
PROBE="$ROOT/scripts/deepseek_usage_probe.mjs"

find_node() {
  if [ -n "${DSH_NODE_BIN:-}" ] && [ -x "${DSH_NODE_BIN}" ]; then printf '%s' "${DSH_NODE_BIN}"; return; fi
  for c in "$(command -v node 2>/dev/null)" /opt/homebrew/bin/node /usr/local/bin/node; do
    [ -n "$c" ] && [ -x "$c" ] && { printf '%s' "$c"; return; }
  done
}
NODE_BIN="$(find_node)"

report_check() {
  echo "🔎 DeepSeek API Key 接入状态"
  echo "-----------------------------------------"
  echo "落盘位置: $KEY_FILE"
  if [ -f "$KEY_FILE" ]; then
    local len
    len="$(tr -d '\n\r' < "$KEY_FILE" | wc -c | tr -d ' ')"
    echo "状态    : ✅ 已配置（长度 ${len}，不回显内容）"
    echo "权限    : $(stat -f '%Sp' "$KEY_FILE" 2>/dev/null || echo '未知')"
    return 0
  fi
  if [ -n "${DEEPSEEK_API_KEY:-}" ]; then
    echo "状态    : ✅ 已配置（来源：环境变量 DEEPSEEK_API_KEY，长度 ${#DEEPSEEK_API_KEY}）"
    return 0
  fi
  echo "状态    : ⛔ 未配置"
  echo "接入方式: ./scripts/deepseek_key_setup.sh"
  return 1
}

verify_live() {
  echo "-----------------------------------------"
  echo "▶ 调用官方余额接口验证…"
  [ -n "$NODE_BIN" ] || { echo "❌ 找不到 node，无法验证"; return 1; }
  local out
  out="$("$NODE_BIN" "$PROBE" --json 2>/dev/null)" || { echo "❌ 探针执行失败"; return 1; }
  printf '%s' "$out" | "$NODE_BIN" -e '
    let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
      let d;try{d=JSON.parse(s)}catch{console.log("❌ 探针输出不是合法 JSON");process.exit(1)}
      const b=d.balance||{};
      console.log(`   时段: ${d.periodLabel} · 距切换 ${Math.round((d.nextSwitchInSeconds||0)/60)} 分钟`);
      if(b.available&&Array.isArray(b.items)&&b.items.length){
        for(const it of b.items) console.log(`   ✅ 额度: ${it.currency} ${it.totalBalance} = 赠金 ${it.grantedBalance} + 充值 ${it.toppedUpBalance}`);
        process.exit(0);
      }
      console.log(`   ⛔ 额度仍不可用: errorKind=${b.errorKind||"unknown"}`);
      if(b.errorMessage) console.log(`      原因: ${b.errorMessage}`);
      process.exit(1);
    })'
}

ACTION="${1:-prompt}"

case "$ACTION" in
  --check)
    report_check
    exit $?
    ;;
  --clear)
    if [ -f "$KEY_FILE" ]; then rm -f "$KEY_FILE"; echo "✅ 已删除：$KEY_FILE"; else echo "ℹ️ 本就未配置"; fi
    exit 0
    ;;
  --from-env)
    if [ -z "${DEEPSEEK_API_KEY:-}" ]; then echo "❌ 环境变量 DEEPSEEK_API_KEY 为空"; exit 1; fi
    KEY="$DEEPSEEK_API_KEY"
    ;;
  prompt)
    echo "请输入 DeepSeek API Key（sk- 开头，输入不回显）："
    IFS= read -rs KEY
    echo
    ;;
  *)
    echo "用法：$0 [--check|--clear|--from-env]"; exit 2
    ;;
esac

# 校验：只接受 sk- 前缀且长度足够，避免把账号令牌当 Key 写进去
KEY="$(printf '%s' "$KEY" | tr -d '\n\r' | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
case "$KEY" in
  sk-*) ;;
  *) echo "❌ 格式不符：Key 必须以 sk- 开头（桌面端账号令牌不是 API Key）"; exit 1 ;;
esac
if [ "${#KEY}" -lt 20 ]; then echo "❌ 长度不足（${#KEY}），疑似粘贴不完整"; exit 1; fi

mkdir -p "$(dirname "$KEY_FILE")"
umask 077
printf '%s\n' "$KEY" > "$KEY_FILE"
chmod 600 "$KEY_FILE"
unset KEY
echo "✅ 已写入 ${KEY_FILE}（权限 600，内容不回显）"

verify_live
rc=$?
if [ "$rc" -eq 0 ]; then
  echo "🎉 接入完成：底栏与常显看板将显示真实剩余额度"
else
  echo "⚠️ Key 已落盘，但接口取数未成功 —— 请核对 Key 是否有效/是否欠费"
fi
exit $rc
