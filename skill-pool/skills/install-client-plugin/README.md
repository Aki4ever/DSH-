# install-client-plugin

L2 工序动作级技能：把自建 DSH client 插件幂等装配进 profile，改动前备份、支持一键回滚。

## 用途

把自建 DSH client 插件幂等装配进 profile，改动前备份、支持一键回滚。

## 使用方式

```bash
python3 skills/install-client-plugin/scripts/install_plugin.py --profile web           # 干跑
python3 skills/install-client-plugin/scripts/install_plugin.py --profile web --apply    # 装配
python3 skills/install-client-plugin/scripts/install_plugin.py --profile web --rollback # 回滚
```

## 退出码

| 码 | 含义 |
| --- | --- |
| `0` | 干跑 / 装配成功 / 回滚成功 / 幂等 |
| `1` | 无记录无法回滚、profile 不可写 |
| `2` | 输入不可读或构建失败 |

## 上下游

上游 `plugin-control-guard`；被装配对象是本仓 `plugins/` 下的 client 插件。

## 边界

- 只装配本仓插件，不动宿主与第三方插件；
- 必须先备份；
- 幂等；
- 诚实声明「需重启宿主才生效」。
