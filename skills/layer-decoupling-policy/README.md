# layer-decoupling-policy

L1 原子规约：执行层解耦判定基元（只通过契约通信 + 五类违规物理判据 + 共享资源登记）。

## 用途

回答「什么算执行层之间的耦合违规」：给出**只通过契约通信**的硬规则（契约 = `composition` 组装边 + 显式声明的产物路径）、
**依赖方向只允许 `L4 → L3 → L2 → L1` 与同层**的方向规则，以及五类违规的物理判据：

| 编号 | 类别 | `kind` | 判据摘要 |
| :--- | :--- | :--- | :--- |
| DC-01 | 逆向依赖 | `reverse_dependency` | 低层技能 `composition` 引用高层技能 |
| DC-02 | 依赖环 | `dependency_cycle` | `composition` 图存在有向环 |
| DC-03 | 跨层跳跃 | `cross_layer_jump` | L1/L2 直接引用 L4 中枢 |
| DC-04 | 隐式耦合 | `implicit_dependency` | 脚本 `importlib` 加载了未写进自己 `composition` 的技能模块 |
| DC-05 | 共享可变状态 | `shared_mutable_state` | 两个及以上技能写同一产物路径却未登记为共享资源 |

核心立场：契约之外的一切调用都是耦合；未声明即违规；判据不放宽，改造前就存在的违规如实上报。
本技能无脚本，只出判据与登记规约。

## 使用方式

```bash
# 规约本身无命令；按判据执行下游三条命令
python3 skills/build-layer-graph/scripts/build_layer_graph.py --json
python3 skills/detect-layer-coupling/scripts/detect_coupling.py --json
python3 skills/verify-decoupling/scripts/verify_decoupling.py --json
```

共享资源登记形态（写在 SKILL.md 或 README.md 中，一行一条，路径为仓库相对路径）：

```
[shared-resource] docs/operations/skill-query-log.jsonl
```

## 输出字段

规约裁决以固定条目结构表达，字段与下游违规条目一一对应：

| 字段 | 含义 |
| :--- | :--- |
| `kind` | 违规类别，闭集 `reverse_dependency` / `dependency_cycle` / `cross_layer_jump` / `implicit_dependency` / `shared_mutable_state` |
| `from` | 违规边/写入关系的发起技能 id |
| `to` | 违规边/写入关系的对端技能 id |
| `evidence` | 人类可读证据，必含被引用的技能 id 或产物路径与环路径 |
| `file` | 证据所在文件（仓库相对路径，如 `skills/x/SKILL.md`） |
| `line` | 证据所在行号（1 起算，无法定位时为 0） |

## 退出码表

本技能无脚本，退出码由执行代理脚本承载：

| 退出码 | 含义 |
| :--- | :--- |
| 0 | 五类违规计数全为 0，或已用 `--allow` 显式豁免并标注 `waived` |
| 1 | 存在未豁免的耦合违规，或 `--check` 检测到 layer-graph 陈旧 |
| 2 | 输入缺失/不可读（缺 catalog/登记表/SKILL.md，或 `--skill` 指向不存在的技能） |

## 上下游

- 上游：无（原子基元），是解耦判据与共享资源登记的唯一真相来源。
- 下游：`build-layer-graph`（建图）、`detect-layer-coupling`（五类检测）、`verify-decoupling`（零违规断言）、
  `decoupling-guard`（解耦写入门禁，挂载于管家「② 契约与合规」集群）。
