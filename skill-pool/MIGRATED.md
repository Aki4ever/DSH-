# 本目录已并入全局规则（只读镜像）

> ### 🏷️ 迁移信息
> - **迁移日期**：2026-09-28
> - **需求依据**：`REQ-REPO-MERGE-033`（执行包 PKG-007）
> - **新家**：`/Users/linqiyu/Documents/DSH/全局规则/skill-pool/`
> - **本目录状态**：`[只读镜像 · 保留用于回退]`

---

## 一、发生了什么

本仓库（Skill池）已通过**子树合并**整体迁入
`/Users/linqiyu/Documents/DSH/全局规则/skill-pool/`，**全部提交历史保留**。

迁移发生时的源提交为 `3d99364`；合并提交为 `全局规则` 仓库的 `27faaec`。

## 二、为什么原目录没有删除

当前会话的工作目录（cwd）就指向本目录。把目录搬走会让**正在运行的会话立即断链**。
因此采用「合并 + 校验 + 切换会话登记」而不是「搬走」，原目录原地保留为只读镜像。

这样做的额外好处是：整次合并可以零成本回退——源目录原封不动。

## 三、后续在哪里干活

| 用途 | 路径 |
| :--- | :--- |
| 新的仓库根 | `/Users/linqiyu/Documents/DSH/全局规则/skill-pool/` |
| 技能池 CLI 入口 | `全局规则/skill-pool/bin/skill-pool` |
| 需求台账 | `全局规则/skill-pool/docs/requirements/index.md` |
| 操作规范 | `全局规则/skill-pool/docs/operations/workflows.md` |
| 命名规范真相源 | `全局规则/skill-pool/docs/operations/capability-naming.json` |
| 知识库命名规范 | `全局规则/knowledge/common/capability_naming_spec.md` |

**远端**：并入后以 `全局规则` 的远端为准（`https://github.com/Aki4ever/DSH-.git`）。
本目录的远端 `https://github.com/akidotdot-ai/skill-pool.git` 保留为镜像，最后一次同步提交为 `3d99364`。

## 四、镜像冻结说明

本目录自「合并校验通过」之后即视为**冻结镜像**：其后的开发一律在 `全局规则/skill-pool/` 进行。
除台账类文件（如本文件与 `merge-snapshot.json`）外，本目录不再接受任何改动。

## 五、本目录的处置建议

确认新位置一切正常后，可将本目录归档或删除；在此之前请勿在其中继续开发，
否则会产生与 `全局规则/skill-pool/` 分叉的第二份真相。
