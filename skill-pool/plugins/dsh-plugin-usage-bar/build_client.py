#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""build_client.py — 把 src/usage-core.cjs 内联进 src/client.template.js，产出 lib/client.js。

为什么要构建而不是手写两份：
    bundle 里不能 require 本地文件（宿主只提供 seed 模块），因此内核必须内联；
    而内联必然产生「两份实现」。构建脚本 + 摘要断言把这两份锁死成一份：
    lib/client.js 里必须含有 src/usage-core.cjs 的完整内容与它的 sha256 短摘要。

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
CORE = os.path.join(HERE, "src", "usage-core.cjs")
TEMPLATE = os.path.join(HERE, "src", "client.template.js")
OUTPUT = os.path.join(HERE, "lib", "client.js")
MARK = "__USAGE_CORE__"


def render():
    core = io.open(CORE, encoding="utf-8").read().rstrip("\n")
    template = io.open(TEMPLATE, encoding="utf-8").read()
    digest = hashlib.sha256(core.encode("utf-8")).hexdigest()
    if MARK not in template:
        raise ValueError("模板缺少内联锚点 %s" % MARK)
    body = core + "\n// usage-core sha256=" + digest
    return template.replace(MARK, body), digest


def main(argv):
    if not os.path.isfile(CORE):
        print(json.dumps({"error": "input_missing", "path": CORE}, ensure_ascii=False))
        return 2
    if not os.path.isfile(TEMPLATE):
        print(json.dumps({"error": "input_missing", "path": TEMPLATE}, ensure_ascii=False))
        return 2

    rendered, digest = render()

    if "--check" in argv:
        current = io.open(OUTPUT, encoding="utf-8").read() if os.path.isfile(OUTPUT) else ""
        fresh = current == rendered and digest in current
        print(json.dumps({"success": fresh, "stale": not fresh, "output": OUTPUT,
                          "usage_core_sha256": digest}, ensure_ascii=False, indent=2))
        return 0 if fresh else 1

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    io.open(OUTPUT, "w", encoding="utf-8").write(rendered)
    # 断言：产物必须真的含内核与摘要，否则这次构建等于没生效
    written = io.open(OUTPUT, encoding="utf-8").read()
    assert digest in written and "resolvePeriod" in written, "构建产物断言失败"
    print(json.dumps({"success": True, "output": OUTPUT, "bytes": len(written.encode("utf-8")),
                      "usage_core_sha256": digest}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
