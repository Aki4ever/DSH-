# visual-interaction-guard

L3 复合流程级技能：可视化交互四件套放行门禁：档位表 / 吸附分支 / 下载三段降级 / 26 项断言四项实数齐备才放行。

## 用途

可视化交互四件套放行门禁：档位表 / 吸附分支 / 下载三段降级 / 26 项断言四项实数齐备才放行。

## 使用方式

```bash
python3 skills/build-image-viewer/scripts/build_viewer.py --image a.png --out viewer.html
python3 skills/verify-interactive-html/scripts/verify_html.py --file viewer.html --json
```

## 退出码

| 码 | 含义 |
| --- | --- |
| `0` | 四项实数齐备 |
| `1` | 任一环失败 |
| `2` | 输入不可读 |

## 上下游

上游 `format-zoomable-visual`、`zoom-level-policy`、`build-image-viewer`；并列 `interactive-image-viewer`。

## 边界

- 不适用就不套用；
- 连续乘法不算多级；
- 禁止静默无反应；
- 零外链不可破。
