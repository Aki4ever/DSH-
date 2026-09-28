#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""build_client.py — 把 src/inject-core.cjs 内联进 src/client.template.js，产出 lib/client.js。

为什么要构建而不是手写两份：
    bundle 里不能 require 本地文件（宿主只提供 seed 模块），因此内核必须内联；
    而内联必然产生「两份实现」。构建脚本 + 摘要断言把这两份锁死成一份：
    lib/client.js 里必须含有 src/inject-core.cjs 的完整内容与它的 sha256 短摘要。

Exit Code: 0 成功 / 2 输入缺失
"""
import hashlib
import io
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
CORE = os.path.join(HERE, "src", "inject-core.cjs")
TEMPLATE = os.path.join(HERE, "src", "client.template.js")
OUTPUT = os.path.join(HERE, "lib", "client.js")


def main():
    for path in (CORE, TEMPLATE):
        if not os.path.isfile(path):
            print(json.dumps({"error": "input_missing", "path": path}, ensure_ascii=False))
            return 2
    core = io.open(CORE, encoding="utf-8").read().rstrip("\n")
    template = io.open(TEMPLATE, encoding="utf-8").read()
    digest = hashlib.sha256(core.encode("utf-8")).hexdigest()[:16]
    body = template.replace("__INJECT_CORE__", core)
    body = body.replace("//#region inject-core",
                        "//#region inject-core sha256:%s" % digest)
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    io.open(OUTPUT, "w", encoding="utf-8").write(body)
    print(json.dumps({
        "success": True, "output": OUTPUT, "bytes": len(body.encode("utf-8")),
        "core_sha256_16": digest, "core_bytes": len(core.encode("utf-8")),
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
