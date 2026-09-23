# 地图导航式能力路由层规范 (Map Navigation Routing Layer)

> ### 🏷️ **版本信息与实施追踪**
> - **当前文档版本**：`v4.2.0`
> - **对应实施版本**：`v4.2.0`
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
  - **执行命令/入口**：`./scripts/xxx.sh [参数]`
  - **核心操作目标**：[最终落盘文件或操作]
- ⚠️ **避坑路况警示 (Road Conditions / Hazard Warning)**：
  - [负面反例：何时坚决不用、典型误用场景]
```

---

## 🛠️ 三、自动化导航路由工具

系统提供轻量级导航脚本支持：
```bash
node scripts/route_navigate.mjs --entry        # 快速输出当前交付物或核心入口
node scripts/route_navigate.mjs <能力/关键词>   # 自动规划并打印地图导航路线
```
- **单一权威源**：路由知识基于 `indexes/capabilities_index.md` 与 `indexes/shortcuts_index.md` 动态生成；
- **免推理降耗**：利用本地 Node.js 脚本毫秒级匹配并拼接路线，节省大模型规划 Token。
