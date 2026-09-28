# plugin-control-jump-policy

L1 微观原子规约：**插件常显调控按钮判定基元**。钉死按钮契约、幂等去重键、三级降级导航与三态语义。

## 用途

「每个插件市场下载的插件都带一个能直达其详情控制页的常显按钮」这件事的唯一口径来源。

| 项 | 取值 |
| :--- | :--- |
| 唯一标识 | `data-control-jump="<plugin-id>"` |
| 常显位置 | 市场已安装列表 + 宿主插件清单的**每个条目** |
| 点击语义 | 定位同 id 配置项 + 滚动 + 高亮 |
| 去重键 | `容器标识\|插件 id` |
| 无 id 条目 | **绝不注入** |
| 导航降级 | 宿主钩子 → 定位/点击原生导航 → 复制 id 并提示（第三级永远可用） |

## 使用方式

```bash
python3 plugins/dsh-plugin-control-jump/build_client.py                                  # 内核 -> bundle
python3 skills/install-client-plugin/scripts/install_plugin.py --profile web              # 干跑
python3 skills/verify-plugin-control-button/scripts/verify_plugin_button.py --all --json  # 31 项断言
```

## 退出码（由承载探针给出）

| 码 | 含义 |
| --- | --- |
| `0` | 契约齐备、装配成功且可回滚、断言全过 |
| `1` | 契约破损、装配失败、任一断言失败 |
| `2` | 输入不可读或依赖不可用 |

## 上下游

- 上游：本规约（按钮契约与降级顺序的唯一真相源）。
- 下游：`install-client-plugin`（装配）、`verify-plugin-control-button`（断言）、`plugin-control-guard`（L3 门禁）。

## 边界

- 只出判据，不注入不装配；
- 必须常显；
- 无 id 绝不注入；
- 幂等是硬要求；
- 永不静默无反应；
- 三态不得压成两态。
