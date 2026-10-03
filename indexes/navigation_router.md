# 地图导航式能力路由层规范 (Map Navigation Routing Layer)

> ### 🏷️ **版本信息与实施追踪**
> - **当前文档版本**：`v4.29.9`
> - **对应实施版本**：`v4.29.9`
> - **版本治理规范**：[`rules/workflow/versioning_standard.md`](../rules/workflow/versioning_standard.md)
> - **需求依据**：`REQ-054` / `CR-009`（地图导航式能力路由层）
> - **生效状态**：`[Release 稳定生效]`

命中索引后按本文执行。

---

## 🗺️ 一、地图导航三级路由模型

```text
🚩 起点 用户意图 → 🧭 规划器（检索 capabilities_index）
▼ 🚗 途径指引 ① 权限与环境依赖 ② 业务/技术规范 ③ 安全基线与调度锁 ④ 门禁 G1~G4
▼ 🏁 终点 落地点与参数 → CLI/脚本/写文件/开GUI
▼ ⚠️ 避坑提示 → 负面反例/踩坑红线
```

---

## 📌 二、标准导航输出卡片规范

口令"地图导航 <能力/目标>"或索引命中后必须输出：

```markdown
### 🗺️ 能力导航路线规划已就绪：【目标能力名】

- 🚩 **起点**：会话上下文
- 🛣️ **路线评级**：G0 / G1 / G2 / G3
- 📍 **途径节点**：① 依赖环境 ② 规范或元规则 ③ 独占锁或只读 ④ 门禁四验（`control_gates.sh`）
- 🏁 **终点**：**执行入口**须填真实脚本路径，禁止留 `scripts/xxx.sh` 占位，**操作目标**为最终落盘文件
- ⚠️ **警示**：[负面反例：何时不用、典型误用]
```

---

## 🛠️ 三、自动化导航路由工具

路由层**可执行载体**：[`scripts/route_plan.mjs`](../scripts/route_plan.mjs)（`REQ-089` / `R5`）：

```bash
node scripts/route_plan.mjs "<意图或关键词>"   # 调配方案：调用命令 + 门禁 + 依赖顺序 + 并行裁决 + 批次与回退
node scripts/route_plan.mjs --check            # 自检：文档-实现 / 死通道 / 可达性 / 反向用例
node scripts/route_plan.mjs --json "<关键词>"  # 机器可读输出
```
- **退出码**：`0` 全过 · `1` 有问题 · `2` 取不到证据（**无可解析证据 ≠ 通过**）
- **知识权威源**：[`indexes/capabilities_index.json`](capabilities_index.json)（缺失回退 [`indexes/capabilities_index.md`](capabilities_index.md) §3.1）· [`indexes/shortcuts_index.md`](shortcuts_index.md)；通道解析复用 [`scripts/channel_audit.mjs`](../scripts/channel_audit.mjs)
- **依赖权威源**（查不到即写"未登记"）：工序 [`ai-control/config/flow_graph.json`](../ai-control/config/flow_graph.json) · 组合 [`skill-pool/docs/operations/layer-graph.json`](../skill-pool/docs/operations/layer-graph.json)；档位 `safe_multi` / `needs_lock` / `single_only` 取 [`skill-pool/docs/operations/instance-safety.json`](../skill-pool/docs/operations/instance-safety.json)，触发词 [`skill-pool/docs/operations/skill-catalog.json`](../skill-pool/docs/operations/skill-catalog.json)
- **门禁边界**取 [`scripts/lib/physical_lock.mjs`](../scripts/lib/physical_lock.mjs) 的 `STAGES` 与 `evaluatePhysicalLock`；`--check` 12 探针 × 5 阶
- **免推理降耗**：本地脚本毫秒级匹配拼接，省规划 Token

> **历史实现（并存不弃，禁止当作路由知识来源）**：[`scripts/route_navigate.mjs`](../scripts/route_navigate.mjs) 仅留 `--entry` 与 `--version`，**不读索引文件**——`capFile` 是死变量（第 65 行声明后从未被读），`--check` ① 判其为"纸面声明"。
