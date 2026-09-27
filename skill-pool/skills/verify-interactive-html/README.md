# verify-interactive-html

L2 工序技能：交互查看器 HTML 的静态断言探针。

## 用途

对查看器 HTML 做纯静态断言，不启动浏览器、不用第三方解析器。四类断言全部通过才放行：

1. 文件存在且字节数 > 0；
2. 含 `data-zoom-in` / `data-zoom-out` / `data-zoom-reset` 三个控制标识；
3. 含 `<!DOCTYPE html` / `<html` / `</html>` / `<body` / `</body>` 且标签成对；
4. 无外部资源引用（`src="http` / `href="http` / `url(http` / `<script src=` / `<link `）。

## 使用方式

```bash
python3 skills/verify-interactive-html/scripts/verify_html.py --file <html> [--json]
```

- `--json`：只输出 stdout JSON，抑制 stderr 的人类可读明细；
- 缺省：stdout 仍输出同一份 JSON，同时在 stderr 打印逐项 PASS/FAIL 明细。

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 四类断言全部通过 |
| 1 | 任一断言失败，或文件不可读 |

stdout 结构：

```json
{"success": true, "file": "/abs/path.html", "checks": [{"name": "file_exists", "pass": true, "detail": "..."}]}
```

`checks` 逐项命名规则：

| 前缀 | 覆盖 |
| :--- | :--- |
| `file_exists` / `file_size_positive` / `file_readable` / `utf8_decodable` | 物理存在与可读性 |
| `marker:<属性名>` | 三个缩放控制标识 |
| `tag:<标签>` / `pair:<开标签>` | 结构标签存在与开闭配对 |
| `no_external:<模式名>` | 五类外部资源模式排他扫描 |

## 已知边界

- 只做静态断言，不验证渲染效果与真实交互；
- 刻意不做泛化 `http` 扫描，避免把 `xmlns` 命名空间误判为外链；
- 只读不写，不自动修复失败项。

## 上下游

- 上游：`format-zoomable-visual`（L1，断言标准来源）。
- 下游：`interactive-image-viewer`（L3，交付门禁）。
