#!/usr/bin/env bash
# ==============================================================================
# 外部工程远程推送闭环 (External Projects Push Closure) — REQ-092 / R1-b
# ==============================================================================
# 为什么需要它：本轮给 4 个存量工程铺了管控入口并提交，但其中两个没有配置远程仓库，
# 另两个有远程却因本会话网络挂起未推送。"提交了"与"闭环了"是两件事，
# 不推送就不得声称闭环（change_flow 第六步）。本脚本把这件事变成一条可复跑命令。
#
# 判据（每条都打印实际结果，不美化）：
#   · 有远程 + 有未推送提交 → 执行推送，打印结果与退出码；
#   · 无远程               → 显式标注"未闭环"，并给出补配置命令；
#   · 无未推送提交         → 标注"已闭环"。
#
# 用法：bash scripts/push_external_projects.sh [工程名...]
# 退出码：0 全部闭环（推送成功或无待推送）；1 仍有未闭环工程
# ==============================================================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DSH_ROOT="${DSH_SCOPE_ROOT:-$(cd "$ROOT/.." && pwd)}"

# 与 scope_audit 的默认排除口径保持一致（不把主控仓库、退役资产、纯资产目录算作工程）
EXCLUDE="全局规则 _retired_assets_20260923 assets node_modules"

targets=("$@")
if [ "${#targets[@]}" -eq 0 ]; then
  while IFS= read -r d; do
    base="$(basename "$d")"
    skip=0
    for e in $EXCLUDE; do [ "$base" = "$e" ] && skip=1; done
    [ "$skip" -eq 0 ] && [ -d "$d/.git" ] && targets+=("$base")
  done < <(find "$DSH_ROOT" -maxdepth 1 -mindepth 1 -type d ! -name '.*')
fi

open=0
printf '📤 外部工程远程推送闭环 · 工作根 %s\n' "$DSH_ROOT"
for name in "${targets[@]}"; do
  dir="$DSH_ROOT/$name"
  printf '\n📦 %s\n' "$name"
  if [ ! -d "$dir/.git" ]; then
    printf '   ⛔ 不是 git 仓库 → 未闭环（先执行 git init 与远程配置）\n'
    open=$((open + 1)); continue
  fi
  remote_url="$(git -C "$dir" remote get-url origin 2>/dev/null || true)"
  if [ -z "$remote_url" ]; then
    printf '   ⛔ 未配置远程 origin → 未闭环\n'
    printf '      补配置：git -C "%s" remote add origin <仓库地址>\n' "$dir"
    open=$((open + 1)); continue
  fi
  ahead="$(git -C "$dir" rev-list --count '@{u}..HEAD' 2>/dev/null || echo '?')"
  if [ "$ahead" = "0" ]; then
    printf '   ✅ 已闭环（远程 %s · 无待推送提交）\n' "$remote_url"
    continue
  fi
  printf '   ⏳ 待推送 %s 个提交 · 远程 %s\n' "$ahead" "$remote_url"
  if git -C "$dir" push origin HEAD 2>&1 | tail -3 | sed 's/^/      /'; then
    after="$(git -C "$dir" rev-list --count '@{u}..HEAD' 2>/dev/null || echo '?')"
    if [ "$after" = "0" ]; then
      printf '   ✅ 推送成功，已闭环\n'
    else
      printf '   ⛔ 推送命令返回成功但仍有 %s 个待推送提交（不采信自述）→ 未闭环\n' "$after"
      open=$((open + 1))
    fi
  else
    printf '   ⛔ 推送失败（网络或鉴权）→ 未闭环；可稍后重跑本脚本\n'
    open=$((open + 1))
  fi
done

printf '\n----------------------------------------\n'
if [ "$open" -eq 0 ]; then
  printf '🎉 全部工程远程推送已闭环\n'; exit 0
fi
printf '⛔ 仍有 %s 个工程未闭环（详见上文逐条说明）\n' "$open"; exit 1
