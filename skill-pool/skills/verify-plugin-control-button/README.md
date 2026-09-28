# verify-plugin-control-button

L2 工序动作级技能：插件常显调控按钮断言器：静态契约 13 项 + Node DOM 打桩运行时 18 项，共 31 项。

## 用途

插件常显调控按钮断言器：静态契约 13 项 + Node DOM 打桩运行时 18 项，共 31 项。

## 使用方式

```bash
python3 skills/verify-plugin-control-button/scripts/verify_plugin_button.py --all --json
```

## 退出码

| 码 | 含义 |
| --- | --- |
| `0` | 两层全过 |
| `1` | 任一断言失败 |
| `2` | 输入不可读或 Node 不可用 |

## 上下游

上游 `plugin-control-guard`、`install-client-plugin`；下游 `plugin-control-guard` 门禁放行。

## 边界

- 两层缺一不可；
- 缺 Node 即退 2，不降级；
- 只读；
- 每个断言都有失败构造，可证伪。
