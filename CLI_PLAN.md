# CLI 规划清单 (CLI Plan) —— 全局规则工程

> **需求依据**：`REQ-097` / R4（项目开启时把 CLI 规划进去，方便 AI 调用）
> **清单作用**：把"这台机器能怎么被 AI 调用"写成一张可核对的表——表里写的命令与接口契约必须真实存在，
> 判定入口 `node scripts/cli_plan_audit.mjs --check`（写了跑不起来的、契约悬空的，一律判红）。

---

## 📋 一、能力清单

| 能力名 | 一条可跑命令 | 接口契约位置 | 并行口径 | 反例（不许做什么） |
| :--- | :--- | :--- | :--- | :--- |
| 首动改名 | `bash scripts/name_me.sh "[分类编号][难度分] 8字概述"` | `scripts/interfaces/name_me.interface.json` | `exclusive` | 不许跳过改名直接动手 |
| 累积门禁体检 | `bash scripts/control_gates.sh check` | `scripts/interfaces/control_gates.interface.json` | `readonly` | 不许绕过门禁强行推进 |
| 需求登记与溯源判定 | `node scripts/req_new.mjs --check` | `scripts/interfaces/req_new.interface.json` | `exclusive` | 不许不升版本号就改台账 |
| 策略层表达判定 | `node scripts/strategy_layer_audit.mjs --check` | `scripts/interfaces/strategy_layer_audit.interface.json` | `readonly` | 不许把堆栈、JSON、日志原文裸甩给用户 |
| 知识库索引对拍 | `node scripts/knowledge_audit.mjs --check` | `scripts/interfaces/knowledge_audit.interface.json` | `readonly` | 不许有条目没有入口 |
| 立项 CLI 规划判定 | `node scripts/cli_plan_audit.mjs --check` | `scripts/interfaces/cli_plan_audit.interface.json` | `readonly` | 不许清单里写跑不起来的命令 |
| 执行层接口覆盖率 | `node scripts/check_layer_interfaces.mjs --check` | `scripts/interfaces/check_layer_interfaces.interface.json` | `readonly` | 不许只看"名字在不在索引里"就宣布通过 |
| 冗余与冲突双检 | `node scripts/redundancy_scan.mjs --root .` | `scripts/interfaces/redundancy_scan.interface.json` | `readonly` | 不许扫出高相似块后置之不理 |

> **并行口径**：`readonly`（只读，可并发）/ `shared`（读共享态、只写自己的产物）/ `exclusive`（独占，必须串行）。

---

## ✅ 二、维护约定

1. 新增执行层能力 → 本表补一行 → 跑 `node scripts/cli_plan_audit.mjs --check`；
2. 退役能力 → 从表里删行（留着的死行会被判红）；
3. 每个能力的接口契约字段口径见 [`knowledge/common/execution_layer_interface_spec.md`](knowledge/common/execution_layer_interface_spec.md)；
4. 全量能力登记见 [`indexes/capabilities_index.md`](indexes/capabilities_index.md)（本表只列"AI 最常用的入口"，不是全量索引）。
