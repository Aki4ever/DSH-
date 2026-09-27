# interactive-image-viewer

L3 复合流程技能：可缩放可视化「生成 → 自检 → 交付」端到端总控。

## 用途

把一张图片 / 图谱 / 示意图变成真正看得清的交付物：
自带点击放大、放大/缩小按钮、滚轮缩放、拖拽平移与一键复位，且为零依赖单文件 HTML。

本技能挂载于管家「⑤ 需求与透视」集群，是 `visualize-governance-topology` 的兄弟节点：
前者负责「画出来」，本技能负责「看得清」。

## 组成

| 组成 | 级别 | 职责 |
| :--- | :--- | :--- |
| `format-zoomable-visual` | L1 | 三件套交互与零依赖判据 |
| `build-image-viewer` | L2 | base64 内联生成单文件交互 HTML |
| `verify-interactive-html` | L2 | 四类静态断言，退出码 0/1 定生死 |

## 使用方式

本技能无独立脚本，按下面三步串行执行（示例可直接跑）：

```bash
# 步骤 1：生成
python3 skills/build-image-viewer/scripts/build_viewer.py \
  --image /path/to/topology.png \
  --out /tmp/topology-viewer.html --title "管家拓扑图"

# 步骤 2：自检（退出码 0 才继续）
python3 skills/verify-interactive-html/scripts/verify_html.py \
  --file /tmp/topology-viewer.html --json

# 步骤 3：交付前复核产物物理存在且非空
ls -l /tmp/topology-viewer.html
```

任一步失败则回到步骤 1，依据 `checks` 明细修正后重跑，不得带病交付。

## 退出码

本技能自身不产生退出码，其成败由组成链路的退出码复合判定：

| 环节 | 码 | 含义 |
| :--- | :--- | :--- |
| `build-image-viewer` | 0 | 产物已生成并落盘 |
| `build-image-viewer` | 1 | 输入不存在或扩展名不支持 |
| `verify-interactive-html` | 0 | 四类断言全部通过，允许交付 |
| `verify-interactive-html` | 1 | 缺控制标识 / 标签不配对 / 命中外部资源 |

复合判定规则：两个环节退出码均为 0 时整体放行，任一为 1 即整体阻断。

## 上下游

- 上游：`format-zoomable-visual`（规约）、`build-image-viewer`（生成）、`verify-interactive-html`（自检）。
- 下游：任何需要图片交付的管道；集群内与 `visualize-governance-topology` 并列服务于「⑤ 需求与透视」。
