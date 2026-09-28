# classify-change-scope

L2 工序动作：把一组变更路径判定为 `hot_reload` / `incremental` / `restart`。

## 用途

`prefer-hot-reload-policy` 规约的物理执行层：给出逐路径的处置、理由与命中的「不可热更边界」，
并汇总一条 `no_restart_needed` / `restart_required` 总判定，供 `verify-no-unnecessary-restart` 与
`zero-restart-guard` 直接调用。**判定起点是不需要重启**，`restart` 必须由白名单边界举证。

## 使用方式

```bash
python3 skills/classify-change-scope/scripts/classify_scope.py --paths <路径...> [--json]
```

一次可给多条路径；`--json` 输出结构化结果，缺省为 `disposition<TAB>path<TAB>reason` 的紧凑文本加 `verdict` 行。
路径不存在**不报错**，照样给出判定；只有 `--paths` 为空才退 1。

## 判定规则（最长前缀匹配，先长后短）

| 序 | 路径模式 | disposition | boundary |
| :--- | :--- | :--- | :--- |
| 1 | `/Applications/DSH Desktop.app/**` | restart | `/Applications/DSH Desktop.app/**` |
| 2 | `apps/web/**` | restart | `apps/web/**` |
| 3 | `dist/**` | restart | `dist/**` |
| 4 | `*.bundle.js` | restart | `*.bundle.js` |
| 5 | `docs/operations/*.json`（直接子级） | hot_reload | 空 |
| 6 | `skills/**` | hot_reload | 空 |
| 7 | `docs/**` | hot_reload | 空 |
| 8 | `bin/skill-pool` | hot_reload | 空 |
| 9 | 其它未识别路径 | incremental | 空 |

具体度取「命中字面量长度」最大者（`*.bundle.js` 取文件名长度，`docs/operations/*.json` 取整条路径长度），同分取表内靠前者。

## 输出字段

```json
{"success":true,
 "decisions":[{"path":"skills/x/SKILL.md","disposition":"hot_reload","reason":"技能契约下次调用即生效","boundary":""}],
 "summary":{"hot_reload":1,"incremental":0,"restart":0},
 "verdict":"no_restart_needed"}
```

| 字段 | 含义 |
| :--- | :--- |
| `decisions[].path` | 归一化后的路径（仓库内为相对路径，仓库外为绝对路径） |
| `decisions[].disposition` | `hot_reload` / `incremental` / `restart` |
| `decisions[].reason` | 判定依据（对应判定表「依据」列） |
| `decisions[].boundary` | 命中的不可热更边界白名单模式；非 `restart` 时为空串 |
| `summary` | 三档处置计数 |
| `verdict` | 任一 `restart` 即 `restart_required`，否则 `no_restart_needed` |

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 判定完成（路径不存在也算完成） |
| 1 | `--paths` 缺失或过滤后为空 |

## 上下游

- 上游：`prefer-hot-reload-policy`（三级处置定义与判定表）。
- 下游：`verify-no-unnecessary-restart`（importlib 直接加载本脚本的 `classify_paths()` 做重启必要性断言）、`zero-restart-guard`（L3 写入门禁）。
