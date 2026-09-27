# catalog-consistency-guard

L3 复合流程：口径一致性门禁。

## 用途

让文档层与技能契约层永远一致：先生成受管区块，再三方对拍，不一致即阻断。

## 组成

| 组成 | 级别 | 职责 |
| :--- | :--- | :--- |
| `render-catalog-docs` | L2 | 由 catalog 生成 docs 受管区块 |
| `verify-catalog-consistency` | L2 | Frontmatter / catalog / docs 四方对拍 |

## 使用方式

```bash
./bin/skill-pool consistency
```

等价于：

```bash
python3 skills/render-catalog-docs/scripts/render_docs.py
python3 skills/verify-catalog-consistency/scripts/verify_consistency.py
```

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 受管区块已刷新且完全一致 |
| 1 | 生成失败或存在不一致（输出含 file/line） |

## 上下游

- 上游：`render-catalog-docs`、`verify-catalog-consistency`。
- 下游：所有技能池写入类交付的前置门禁。
