# classify-step-tier

L2 工序动作：把一条过程事件确定性判定为 milestone / micro / action。

## 用途

`milestone-only-progress` 规约的物理执行层：给出逐条事件的粒度标签与动作归类，
作为 `fold-repeated-events` 折叠的前置判据。

## 使用方式

```bash
python3 skills/classify-step-tier/scripts/classify_tier.py --text "<一条过程事件>" [--json]
python3 skills/classify-step-tier/scripts/classify_tier.py --file <每行一条事件的文本文件> [--json]
```

`--file` 每行一条事件：纯文本行与 JSON `{"text": "..."}` 行都支持（与 `fold-repeated-events` 输入口径一致）；空行丢弃。

## 判定规则（先命中先返回，确定性）

| 优先级 | 档位 | 判据 |
| :--- | :--- | :--- |
| 1 | milestone | 命中阶段词表：完成 / 已完成 / 到达 / 通过 / 落库 / 交付 / 生成完毕 / 合并 / 发布 / 验收 / 门禁通过 / 全量 / 里程碑 / 阶段目标 / 结束 / 就绪 |
| 2 | micro | 命中微操作词表：读取文件 / 打开 / 关闭 / 写入一行 / 执行命令 / 调用脚本 / 点击 / 滚动 / 复制 / 粘贴 / 切换窗口 / 重试一次 / 重试 / 格式化 / 编译单文件 / 单条测试 / 查看 / 列出 / 打印 / 上车 / 下车 / 进站 / 出站 / 驶入 / 驶出 / 开门 / 关门 / 拾取 / 拿起 / 放下 / 按下 |
| 3 | action | 两表皆未命中 |

`category` 归类：读取 / 命令 / 写入 / 检索 / 测试 / 网络 / 其他（按顺序先命中先返回）。

标杆样例（判定口径基准，改动词表后必须逐条回归）：

| 事件原文 | 期望 tier | 说明 |
| :--- | :--- | :--- |
| `上车` / `下车` | micro | 交通载具上下，高度重复的机械动作 |
| `已到达长沙` | milestone | 命中「到达」 |
| `在长沙加了一次油` | action | 两表皆未命中 |
| `已完成全部装卸` | milestone | milestone 优先于 micro，即使含 micro 词也判 milestone |

## 输出字段

单条事件输出扁平对象；多条事件输出 `{"count": N, "results": [ ... ]}`。

| 字段 | 含义 |
| :--- | :--- |
| `tier` | milestone / micro / action |
| `category` | 读取 / 命令 / 写入 / 检索 / 测试 / 网络 / 其他 |
| `matched` | 命中的词表词条（按词长降序） |
| `reason` | 判定依据（人类可读） |
| `text` | 事件原文（逐字不变） |

## 退出码

| 码 | 含义 |
| :--- | :--- |
| 0 | 判定完成 |
| 1 | 输入为空、文件不存在/不可读、缺少 `--text` 与 `--file` |

## 上下游

- 上游：`milestone-only-progress`（三档定义与词表口径）。
- 下游：`fold-repeated-events`（importlib 直接加载本脚本的 `classify()` 函数）。
