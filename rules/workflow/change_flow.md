# 规则与需求变更标准工作流 (Rule Change Workflow)

本文档规范了在日常研发与运营中，针对任何规则的“提出、查重、登记、落地、同步”标准操作规程。

---

## 🔄 标准五步变更循环

```text
1. 需求接收 ──▶ 2. 查重核验 ──▶ 3. 需求登记 ──▶ 4. 规则落地 ──▶ 5. Git 同步
   (Input)       (De-dup)       (docs/req)     (rules/*)       (GitHub)
```

---

### 第一步：需求接收与工单转化
- 接收到用户或系统输入的新指令/规则需求；
- 提炼核心意图，转化为结构化的“标准执行需求文案”。

### 第二步：去重核验 (De-duplication Check)
- **读取**：检索 [`docs/requirements.md`](../../docs/requirements.md) 与目标规则目录；
- **比对**：
  - 是否完全重复？ ➔ **直接过滤并通知，流程终止**；
  - 是否属于现有规则优化？ ➔ **进入增量演进分支**；
  - 是否为独立新规则？ ➔ **进入新建分支**。

### 第三步：需求台账登记与同步
- 在 [`docs/requirements.md`](../../docs/requirements.md) 中建立新编号（如 `REQ-xxx`）或更新已有条目状态为 `[EVOLVING]`；
- 记录变更时间、核心诉求与预期影响范围。

### 第四步：规则文件精准落地
- 依据分类分别写入或更新：
  - `rules/system/`：系统元规则与底层约束；
  - `rules/workflow/`：协作流程、命名与交互规范；
  - `rules/coding/`：工程实践、代码与提交规范；
  - `rules/security/`：凭证防护与安全红线。

### 第五步：Git 语义化提交与推送
- 执行 `git add .`；
- 编写语义化提交信息：
  - 新增：`feat(rule): add REQ-xxx <规则名称>`
  - 优化：`update(rule): refine REQ-xxx <更新说明>`
  - 废除：`deprecate(rule): retire REQ-xxx <废除原因>`
- 推送至远程 `origin/main`。
