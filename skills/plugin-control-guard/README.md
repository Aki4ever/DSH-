# plugin-control-guard

L3 复合流程级技能：插件常显调控按钮放行门禁：契约齐备 + 装配成功可回滚 + 静态 13 项与运行时 18 项全过。

## 用途

插件常显调控按钮放行门禁：契约齐备 + 装配成功可回滚 + 静态 13 项与运行时 18 项全过。

## 使用方式

```bash
python3 skills/install-client-plugin/scripts/install_plugin.py --profile web --apply --json
python3 skills/verify-plugin-control-button/scripts/verify_plugin_button.py --all --json
```

## 退出码

| 码 | 含义 |
| --- | --- |
| `0` | 三项齐备 |
| `1` | 任一环失败 |
| `2` | 输入不可读或 Node 不可用 |

## 上下游

上游 本门禁钉死的按钮契约；下游 `install-client-plugin`（装配）、`verify-plugin-control-button`（断言）。

## 边界

- 落点只能是 plugin 层；
- 无备份不许改 profile；
- 缺 Node 即退 2；
- 诚实声明需重启宿主。
