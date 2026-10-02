# CLI 规划清单 (CLI Plan) —— `<项目名>`

> ### 🏷️ **版本信息与实施追踪**
> - **当前模板版本**：`v4.29.4`
> - **对应实施版本**：`v4.29.4`
> - **版本治理规范**：遵循 [`rules/workflow/versioning_standard.md`](../rules/workflow/versioning_standard.md)
> - **规范层级**：`【模板 · 项目立项必填件】`
> - **需求依据**：`REQ-097` / R4（项目开启时把 CLI 规划进去，方便 AI 调用）
> - **生效状态**：`[Release 稳定生效]`

**为什么立项就要写它**：AI 能不能用上这个项目，取决于"有没有一条能跑的命令"。
事后补 CLI 会返工；立项时先写清单，后面每加一个能力就往表里补一行，判定器 `scripts/cli_plan_audit.mjs` 会核对表里的路径是否真实存在。

---

## 📋 一、能力清单（每个能力一行，最少一行）

| 能力名 | 一条可跑命令 | 接口契约位置 | 并行口径 | 反例（不许做什么） |
| :--- | :--- | :--- | :--- | :--- |
| 示例：体检 | `node scripts/<你的脚本>.mjs --check` | `scripts/interfaces/<你的脚本>.interface.json` | `readonly`（只读可并行） | 不许在没有需求依据时改判定基线 |

> **并行口径**只填三个值之一：`readonly`（只读，可并发）/ `shared`（读共享态、只写自己的产物）/ `exclusive`（独占，必须串行）。

---

## ✅ 二、立项必过的三条（判定器逐条核对）

1. **至少一条能跑的命令**：清单里的命令必须能在本项目里真的跑起来（脚本文件真实存在）；
2. **接口契约在位**：每个能力都要有接口契约文件（目录型 `<单元>/interface.json`，文件型 `scripts/interfaces/<脚本名>.interface.json`），
   字段口径见 [`knowledge/common/execution_layer_interface_spec.md`](../knowledge/common/execution_layer_interface_spec.md)；
3. **登记进索引**：能力要登记进本项目的索引文件，方便 AI 检索（本工程口径见 `indexes/capabilities_index.md`）。

---

## 🔍 三、判定入口

```bash
node scripts/cli_plan_audit.mjs --check                 # 判本工程
node scripts/cli_plan_audit.mjs --project <项目路径>     # 判指定工程
node scripts/cli_plan_audit.mjs --selftest              # 反向用例：缺清单/悬空命令必须判红
```

退出码：`0` 三条全过 · `1` 存在不达标 · `2` 取不到证据（**2 绝不算通过**）。

---

## 🗂️ 四、维护约定

- 新增能力 → 表里补一行 → 跑一次 `--check`（表里写了但磁盘没有，会判红）；
- 退役能力 → 从表里删行（留着的死行同样会被判红）；
- 清单文件的默认位置：项目根 `CLI_PLAN.md`（也接受 `docs/cli_plan.md`）。
