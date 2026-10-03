# 执行层接口契约规范 (Execution Layer Interface Contract Specification)

> ### 🏷️ **版本信息与实施追踪**
> - **当前文档版本**：`v4.29.10`（REQ-089 实施中；完成后随总版本归位）
> - **对应实施版本**：`v4.29.10`
> - **规范层级**：`【知识库总纲 · 通用公共规范】`
> - **需求依据**：`REQ-089`（GCM-ORCH）R4-a
> - **生效状态**：`[Release 稳定生效]`

本规范定义**每一个执行层单元**（skill / agent / plugin / CLI / MCP）必须提供的**接口契约**格式。

---

## 一、为什么需要它（实测病根，不是纸面要求）

| 事实 | 实测证据（2026-10-01） |
| :--- | :--- |
| 技能层没有接口 | 179 个 `SKILL.md` 的 frontmatter **只有** `name` / `description` / `level` / `composition` 四个键，无入参出参调用方式 |
| 非技能层几乎没接口 | 54 个非技能执行层里，只有 6 个 CLI 在 `indexes/tool_interfaces.md` 有人手写接口 |
| 覆盖率是自证式的 | `build_capabilities_index.mjs` 的判据是 `indexText.includes(id)` —— 度量的是"**名字**在不在索引里" |

后果：会出现 **「名字覆盖率 100% / 接口覆盖率 0%」** 的假象——索引看起来全绿，**却一个都调不起来**。

因此本规范的判定器 `scripts/check_layer_interfaces.mjs` 把**接口覆盖率与名字覆盖率分开报**，
并禁止用"名字齐备"掩盖"接口为零"。

---

## 二、契约的物理位置（唯一约定）

| 单元形态 | 契约位置 | 示例 |
| :--- | :--- | :--- |
| **目录型**（技能 / 智能体 / 插件 / MCP） | `<unit>/interface.json`，与 `README.md` / `SKILL.md` / `PROMPT.md` 并列 | `skills/acquire-atomic-lock/interface.json` |
| **文件型**（CLI 脚本） | `scripts/interfaces/<basename>.interface.json`（去掉原扩展名） | `scripts/interfaces/control_gates.interface.json` |

> 为什么文件型不放在脚本旁边：`scripts/` 会被 `build_capabilities_index.mjs` 扫盘，
> 相邻堆放会污染执行层清单；独立 `scripts/interfaces/` 目录既集中又不入执行层表。

---

## 三、字段口径（v1）

| 字段 | 必填 | 类型 | 口径 |
| :--- | :---: | :--- | :--- |
| `id` | ✅ | string | **必须与 `indexes/capabilities_index.json` 里的条目 id 完全一致**（判定器会逐条对拍） |
| `layer` | ✅ | string | 所属执行层（技能 / 智能体 / 插件 / 脚本 CLI / MCP） |
| `path` | ✅ | string | 物理路径，必须与索引一致且真实存在 |
| `invoke` | ✅ | string | **可直接执行的调用命令**（不是描述） |
| `summary` | ✅ | string | 一句话职责，≤120 字 |
| `inputs` | ✅ | array | 入参列表，每项 `{name, type, required, desc, values?}`；**没有入参就写 `[]`，不许省略字段** |
| `outputs` | ✅ | array | 出参/产物列表，每项 `{name, type, desc}` |
| `exitCodes` | ✅ | object | 退出码 → 含义；**空对象视为没写**（判定器会判违规） |
| `sideEffects` | ⬜ | array | 副作用（写哪些文件、改哪些状态） |
| `dependencies` | ⬜ | array | 依赖的其他执行层 id |
| `parallel` | ⬜ | enum | `readonly`（只读，可并行）/ `shared`（可并发但需注意）/ `exclusive`（独占，必须串行）。**路由层据此裁决编排** |
| `examples` | ⬜ | array | 可直接复制的用法示例 |
| `source` | ✅ | enum | `handwritten`（人工核对）/ `extracted-from-header`（从文件头自动抽取的基线） |
| `verified` | ⬜ | boolean | 是否已人工核对内容准确性 |

---

## 四、硬性纪律

1. **`已声明 ≠ 已核对`**：`source: extracted-from-header` + `verified: false` 的契约是**基线占位**，
   证明"有接口这一点"，**不证明接口内容准确**。判定器必须把"已声明"与"已人工核对"分成两个数报。
2. **抽不到就写待补**：自动抽取失败时写 `(待补)`，**严禁编造入参或退出码**；
3. **一处权威源**：接口内容以契约文件为唯一真相源，`indexes/tool_interfaces.md` 等文档只放指针；
4. **改了实现必须同步改契约**：契约与实现不一致时，以实跑退出码为准修正契约；
5. **不得用"以后再补"绕过必填字段**：必填缺失即判 schema 违规。

---

## 五、判定与门槛

```bash
node scripts/check_layer_interfaces.mjs --coverage   # 分层报覆盖率（只读）
node scripts/check_layer_interfaces.mjs --scaffold   # 为缺失单元生成基线契约（verified:false）
node scripts/check_layer_interfaces.mjs --check      # 契约校验 + CLI 层覆盖率门槛（退出码 0/1/2）
```

- **门槛口径（REQ-089 R4-b 分批策略）**：**CLI 层要求声明覆盖率 100%** 才判通过；
  技能层（178 个）量大，**只报数不判红**，按批次补齐；
- 退出码 `2` = 取不到证据（机读索引缺失/不可解析），**绝不算通过**。

---

## 六、契约的治理规则

| 动作 | 必须同步改哪里 | 不改的后果 |
| :--- | :--- | :--- |
| 新增一种执行层类型 | 本文档 §三字段表 + `check_layer_interfaces.mjs` 的 `REQUIRED_FIELDS` | 新类型永远判"未声明"，覆盖率卡在 0 |
| 调整门槛（CLI 100% / 技能层只报数） | 本文档 §五 + 判定器 `--check` 的门槛常量 | 规范与实跑两套口径，谁也不知道以哪个为准 |
| 修改契约字段名 | `build_capabilities_index.mjs` 的 `interfaceFor()` 路径推导 + 全部既有契约文件 | 索引里的接口指针集体失配，覆盖率假跌 |
| 判定器自身逻辑变更 | 重跑 `--scaffold` 后 `--check`，并把结果登记进迭代台账 | 改了判定却没人复跑，属本工程明令禁止的"假绿" |

> 一句话：**契约格式是规则，不是代码细节**——它的任何改动都必须走六步变更循环并留痕。
