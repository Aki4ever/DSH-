#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""build_client.py — 把 src/restart-core.cjs 内联进 src/client.template.js，产出 lib/client.js。

为什么要构建而不是手写两份：
    bundle 里不能 require 本地文件（宿主只提供 seed 模块），因此内核必须内联；
    而内联必然产生「两份实现」。构建脚本 + 摘要断言把这两份锁死成一份：
    lib/client.js 里必须含有 src/restart-core.cjs 的完整内容与它的 sha256 短摘要。

用法：
    python3 build_client.py            # 构建并写入 lib/client.js
    python3 build_client.py --check    # 只判定 lib/client.js 是否与源码同步（退 1 表示陈旧）

Exit Code: 0 成功 / 1 --check 判定为陈旧 / 2 输入缺失
"""
import hashlib
import io
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
CORE = os.path.join(HERE, "src", "restart-core.cjs")
TEMPLATE = os.path.join(HERE, "src", "client.template.js")
OUTPUT = os.path.join(HERE, "lib", "client.js")
MARK = "__INJECT_CORE__"
REGION = "//#region restart-core"

# 产物必须含有的关键锚点：缺任何一个都说明内联被截断或模板被改坏
REQUIRED = (
    "handleRestartClick",          # 点击处理（核心行为）
    "parseRestartInput",           # 确认口令判定（安全闸）
    "buildRelaunchScript",         # 重启脚本生成
    "remote.commands.execute",     # 官方触发通道
    "conversation.session.header.actions",  # 挂载点
)


def render():
    core = io.open(CORE, encoding="utf-8").read().rstrip("\n")
    template = io.open(TEMPLATE, encoding="utf-8").read()
    digest = hashlib.sha256(core.encode("utf-8")).hexdigest()[:16]
    if MARK not in template:
        raise ValueError("模板缺少内联锚点 %s" % MARK)
    body = template.replace(MARK, core)
    body = body.replace(REGION, "%s sha256:%s" % (REGION, digest))
    return body, digest, core


def main(argv):
    for path in (CORE, TEMPLATE):
        if not os.path.isfile(path):
            print(json.dumps({"error": "input_missing", "path": path}, ensure_ascii=False))
            return 2

    rendered, digest, core = render()

    if "--check" in argv:
        current = io.open(OUTPUT, encoding="utf-8").read() if os.path.isfile(OUTPUT) else ""
        fresh = current == rendered and digest in current
        print(json.dumps({"success": fresh, "stale": not fresh, "output": OUTPUT,
                          "core_sha256_16": digest}, ensure_ascii=False, indent=2))
        return 0 if fresh else 1

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    io.open(OUTPUT, "w", encoding="utf-8").write(rendered)
    # 断言：产物必须真的含内核与摘要，且内联的是完整内核而不是被截断的前半段。
    written = io.open(OUTPUT, encoding="utf-8").read()
    assert digest in written, "构建产物断言失败：摘要缺失"
    for token in REQUIRED:
        assert token in written, "构建产物断言失败：缺少关键锚点 %s" % token
    assert MARK not in written, "构建产物断言失败：内联锚点未被替换"
    print(json.dumps({"success": True, "output": OUTPUT, "bytes": len(written.encode("utf-8")),
                      "core_sha256_16": digest, "output_bytes": len(written.encode("utf-8")),
                      "core_bytes": len(core.encode("utf-8"))},
                     ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
