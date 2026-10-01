# 地图导航式能力路由层规范 (Map Navigation Routing Layer)

> ### 🏷️ **版本信息与实施追踪**
> - **当前文档版本**：`v4.29.0`
> - **对应实施版本**：`v4.29.0`
> - **版本治理规范**：遵循 [`rules/workflow/versioning_standard.md`](../rules/workflow/versioning_standard.md)
> - **需求依据**：`REQ-054` / `CR-009`（地图导航式能力路由层）
> - **生效状态**：`[Release 稳定生效]`

本文档确立了工程全域能力索引成功后的**“地图导航式路由机制”**。其设计参考车载地图导航（高德/腾讯地图）的“起点 → 路线规划 → 逐级途径点指引 (Turn-by-Turn) → 终点执行落地点 → 避坑路况提示”模型，确保用户和智能体在索引命中后，清晰掌握执行的全程流水线。

---

## 🗺️ 一、地图导航三级路由模型 (Navigation Model)

```text
 🚩 [起点: 用户意图/指令]
          │
          ▼
 🧭 [路线规划器: 匹配索引能力] ─── (检索 indexes/capabilities_index.md)
          │
          ▼
 🚗 [逐级途径指引 (Turn-by-Turn)]
    ├─ 途径点 1: 权限与环境依赖检查
    ├─ 途径点 2: 读取对应的业务/技术规范
    ├─ 途径点 3: 检查安全基线与全局调度锁
    └─ 途径点 4: 门禁状态判定 (G1~G4)
          │
          ▼
 🏁 [终点: 执行落地点与参数] ─── (调用 CLI/脚本/写文件/开GUI)
          │
          ▼
 ⚠️ [避坑路况提示 (Road Hazards)] ─── (负面反例/踩坑红线前置警告)
```

---

## 📌 二、标准导航输出卡片规范 (Navigation Output Format)

当通过口令“地图导航 <能力/目标>”或能力索引命中后，系统必须输出以下结构化路线图：

```markdown
### 🗺️ 能力导航路线规划已就绪：【目标能力名】

- 🚩 **起点 (Origin)**：[当前会话上下文或用户意图]
- 🛣️ **路线评级 (Route Tier)**：G0 高速 / G1 干线 / G2 支线 / G3 辅道
- 📍 **途径节点指引 (Turn-by-Turn Waypoints)**：
  1. **[检查站 1]**：核查依赖环境（如 Node/Python 环境或宿主权限）；
  2. **[检查站 2]**：载入业务规范 [`knowledge/...`] 或元规则；
  3. **[检查站 3]**：申领排他独占锁或确认只读权限；
  4. **[检查站 4]**：门禁四验确认（`./scripts/control_gates.sh badge`）。
- 🏁 **终点 (Destination)**：
  - **执行命令/入口**：模板占位（登记真实条目时替换为已存在的脚本路径，禁止留 `scripts/xxx.sh` 这类占位）
  - **核心操作目标**：[最终落盘文件或操作]
- ⚠️ **避坑路况警示 (Road Conditions / Hazard Warning)**：
  - [负面反例：何时坚决不用、典型误用场景]
```

---

## 🛠️ 三、自动化导航路由工具

路由层的**可执行载体**是 [`scripts/route_plan.mjs`](../scripts/route_plan.mjs)（需求依据 `REQ-089` / `R5`）：

```bash
node scripts/route_plan.mjs "<意图或关键词>"   # 命中后输出调配方案：执行层调用命令 + 前置门禁 + 依赖与顺序 + 并行串行裁决 + 建议批次 + 失败回退
node scripts/route_plan.mjs --check            # 路由层自检：文档-实现一致性 / 死通道 / 可达性覆盖率 / 反向用例
node scripts/route_plan.mjs --json "<关键词>"  # 机器可读输出
```
- **退出码**：`0` 全过 · `1` 有问题（含未命中）· `2` 取不到证据（铁律：没有可解析的证据 ≠ 通过）；
- **单一权威源**：路由知识基于 [`indexes/capabilities_index.json`](capabilities_index.json)（缺失时回退解析 [`indexes/capabilities_index.md`](capabilities_index.md) 的 §3.1 表）与 [`indexes/shortcuts_index.md`](shortcuts_index.md) 动态生成；通道解析与说法命中直接复用 [`scripts/channel_audit.mjs`](../scripts/channel_audit.mjs) 的导出函数，不在本层另写一套匹配逻辑；
- **依赖与裁决的权威源**（取自以下文件，查不到即写"未登记"）：工序依赖取自 [`ai-control/config/flow_graph.json`](../ai-control/config/flow_graph.json)，组合依赖取自 [`skill-pool/docs/operations/layer-graph.json`](../skill-pool/docs/operations/layer-graph.json)，实例安全档位（safe_multi / needs_lock / single_only）取自 [`skill-pool/docs/operations/instance-safety.json`](../skill-pool/docs/operations/instance-safety.json)，技能登记触发词取自 [`skill-pool/docs/operations/skill-catalog.json`](../skill-pool/docs/operations/skill-catalog.json)；
- **门禁边界**取自 [`scripts/lib/physical_lock.mjs`](../scripts/lib/physical_lock.mjs) 的 `STAGES` 与 `evaluatePhysicalLock`，并由 `--check` 以 12 支探针 × 5 个阶逐格对拍；
- **免推理降耗**：利用本地 Node.js 脚本毫秒级匹配并拼接调配方案，节省大模型规划 Token。

> **历史实现（并存不弃，禁止当作路由知识来源）**：[`scripts/route_navigate.mjs`](../scripts/route_navigate.mjs) 仅保留 `--entry` 与 `--version` 两个入口；它**不读取任何索引文件**——其中 `capFile` 是死变量（第 65 行 `const capFile = path.join(WORKSPACE, 'indexes/capabilities_index.md')` 声明后从未被读取），因此 `--check` 的 ① 会把它判为"纸面声明"。保留它的理由：兼容历史入口，同时把"文档承诺 ≠ 实现读取"变成可执行判定。
