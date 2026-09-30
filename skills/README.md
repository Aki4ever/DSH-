# 项目技能层（skills/）

> ### 🏷️ 版本信息与实施追踪
> - **当前文档版本**：`v4.23.0`
> - **对应实施版本**：`v4.23.0`
> - **需求依据**：`REQ-083`
> - **生效状态**：`[Release 稳定生效]`

本目录是**本项目全部技能的唯一权威源**。DSH 技能面板（`@michengai/dsh-skills-manager`）
只扫描项目根下的固定路径，本目录正是其中优先级最高的 `Project Skills` 源
（源码依据：该插件 `lib/core.js` 的 `PROJECT_SOURCES` 含 `{ key: "openclaw", directory: "" }`，
即 `<项目根>/skills`）。

---

## 一、为什么必须有这个目录（历史根因，勿删）

技能池（原 `Skill池` 仓库）通过子树合并进入本仓库时，落点是 `skill-pool/skills/`。
那个路径**不在技能面板的扫描范围内**，于是出现"磁盘上有 178 个技能、面板里显示 0 个"
的断层：内容没丢，但**没有任何加载器能看见它**。

归位动作由 `scripts/restore_skill_pool.mjs` 完成，判据是字节级一致：

```bash
node scripts/restore_skill_pool.mjs --check    # 判定归位状态（退出码 0 = 已归位）
node scripts/restore_skill_pool.mjs --apply    # 从 skill-pool/skills 归位（幂等）
```

---

## 二、目录约定

| 项 | 约定 |
| :--- | :--- |
| 一个技能 | 一个目录：`skills/<kebab-case-name>/` |
| 必备文件 | `SKILL.md`（技能契约，含 YAML Frontmatter + 场景索引 + 运作 SOP） |
| 标准伴随文件 | `interface.json`（**执行层接口契约**，REQ-089 R4）：格式唯一权威源见 [`knowledge/common/execution_layer_interface_spec.md`](../knowledge/common/execution_layer_interface_spec.md)；由 `scripts/gen_skill_interfaces.mjs` 生成基线，**`verified:false` 属占位、须人工核对后才能升 `true`**。它与 `SKILL.md` 是"结构与调用口径"的关系，不重复正文 |
| 推荐文件 | `README.md`（人读说明）、`scripts/`（配套可执行脚本） |
| 排除项 | `_template`（脚手架模板，非技能）、以 `.` 开头的目录 |
| 清单 | `.skill-pool-manifest.json`（机器可读，由归位脚本生成） |

---

## 三、改完必须跑的三条判定（客观命令，非自述）

```bash
./skill-pool/bin/skill-pool validate            # 技能契约合规（逐条 pass/fail）
./skill-pool/bin/skill-pool status              # 技能总数与规范合规数
node scripts/build_capabilities_index.mjs --check   # 执行层是否 100% 入索引层
```

**新增或改名技能后**必须同步索引层，禁止只加技能不改索引：

```bash
node scripts/build_capabilities_index.mjs --apply
```

---

## 四、与索引层的关系

`indexes/capabilities_index.md` 的受管区间
（标记 `<!-- SKILL-POOL-INDEX:BEGIN -->` / `END`）由
`scripts/build_capabilities_index.mjs` 生成，覆盖本目录全部技能，外加
`skill-pool/agents`、`skill-pool/plugins`、`skill-pool/docs/cli/commands` 三个执行层目录。
覆盖率判定即 `--check` 的退出码，未收录数必须为 0。
