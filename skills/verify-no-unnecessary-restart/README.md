# verify-no-unnecessary-restart

L2 工序动作：对实际发生的重启事件做三项硬断言，不必要或无证据即阻断。

## 用途

「零重启」链路的断言层：把「路径是否真的变了」→「是否真的需要重启」→「是否带重建命令」
串成三项断言，任一不成立即退 1，并逐条列出 `unnecessary` 与 `unproven`。
判定口径来自 `classify-change-scope`（importlib 直接加载同仓库脚本，失败才退化为子进程）。

## 使用方式

```bash
python3 skills/verify-no-unnecessary-restart/scripts/verify_no_restart.py \
  --paths <变更路径...> --restarts <restart 事件 jsonl> [--json]
```

`--restarts` 每行一个 JSON 对象：`{"path":"...","command":"...","reason":"..."}`；
文件不存在或为空视为通过（本次没有重启）。

## 三项断言

| 序 | 断言名 | 内容 | 不通过的记录 |
| :--- | :--- | :--- | :--- |
| 1 | `restart_path_in_change_set` | 每个重启事件的 `path` 都在当前变更路径集合内 | 不必要重启 |
| 2 | `restart_required_by_classifier` | 每个重启事件的 `path` 经判定器判定为 `restart` | 不必要重启 |
| 3 | `restart_has_rebuild_command` | 每个重启事件带非空 `command` | 无证据重启 |

## 输出字段

| 字段 | 含义 |
| :--- | :--- |
| `success` | 三项断言是否全过（等价于 `checks` 全 `pass`） |
| `restart_events` | 解析到的重启事件条数 |
| `unnecessary[]` | 不必要重启明细 `{path, reason}` |
| `unproven[]` | 无证据重启明细 `{path}` |
| `checks[]` | 逐条断言 `{name, pass, detail}` |

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 三项断言全过（`--restarts` 不存在或为空也算通过） |
| 1 | 存在不必要重启或存在无证据重启 |
| 2 | 参数缺失（无 `--paths` / 无 `--restarts`）、restart 记录不可解析，或判定器不可用 |

## 上下游

- 上游：`classify-change-scope`（逐路径处置判据）、`prefer-hot-reload-policy`（三级处置定义）。
- 下游：`zero-restart-guard`（L3 写入门禁的断言环节）。
