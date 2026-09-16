#!/usr/bin/env bash
set -e

# 目录一键初始化脚本 (Directory Initialization Script)
# 用法: ./scripts/init_dir.sh <目录路径> [目录描述]

TARGET_DIR="$1"
DIR_DESC="${2:-暂无特别说明}"

if [ -z "$TARGET_DIR" ]; then
  echo "❌ 错误: 请指定要初始化的目录路径！"
  echo "用法: $0 <目录路径> [目录简述]"
  exit 1
fi

# 1. 确保目录存在
mkdir -p "$TARGET_DIR"

# 2. 生成防丢占位符
if [ ! -f "$TARGET_DIR/.gitkeep" ]; then
  touch "$TARGET_DIR/.gitkeep"
  echo "✅ 已生成防丢占位文件: $TARGET_DIR/.gitkeep"
fi

# 3. 生成专属说明文件
README_PATH="$TARGET_DIR/README.md"
if [ ! -f "$README_PATH" ]; then
  DIR_BASENAME=$(basename "$TARGET_DIR")
  cat <<EOF > "$README_PATH"
# ${DIR_BASENAME} 目录说明

## 📌 目录定位
- **路径**: \`${TARGET_DIR}\`
- **主要作用**: 用于管理 ${DIR_DESC}。

---

## 📋 收纳规范
1. 本目录内所有文件均用于支持上述主要作用；
2. 命名建议统一使用简明小写或下划线连接；
3. 重要规则需同步登记至 \`docs/requirements.md\`。

---

## 🛠️ 维护原则
- 遵循全局元规则与规则联动排查规范；
- 保持文档语言通俗易懂、无生僻字。
EOF
  echo "✅ 已生成目录专属说明: $README_PATH"
fi

echo "🎉 目录 [$TARGET_DIR] 结构化初始化完成！"
