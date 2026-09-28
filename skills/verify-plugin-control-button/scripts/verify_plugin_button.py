#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
verify_plugin_button.py
插件常显调控按钮的断言器：静态契约 + **运行时 DOM 打桩**双层验证。

第一层（静态）：包结构符合宿主 client 插件契约
  * package.json 的 dsh.client.platform == "web"，client 入口存在且可解析；
  * cordis.patch.yml 与本插件 id 一致；
  * lib/client.js 经 __ModuleLoader__.load 注册且 id 逐字正确；
  * bundle 内联的内核与 src/inject-core.cjs 内容一致（内联不得漂移）。

第二层（运行时）：用 DOM 打桩真实执行注入内核（scripts/harness.cjs，Node）
  * 每 (容器, 插件 id) 恰 1 个按钮；
  * 重复扫描幂等（新增 0）；
  * 无插件 id 的条目绝不注入；
  * 点击属性与插件 id 逐字一致。

Exit Code:
  0 - 两层全过
  1 - 任一断言失败
  2 - 输入不可读（包目录缺失、内核不可读、Node 不可用）
"""

import sys

sys.dont_write_bytecode = True

import os
import io
import json
import shutil
import argparse
import subprocess

EXIT_OK = 0
EXIT_FAIL = 1
EXIT_INPUT = 2

HERE = os.path.dirname(os.path.abspath(__file__))
# 合并后布局（2026-09-28）：docs/、plugins/ 随技能池主体迁入 <项目根>/skill-pool/，
# 而 skills/ 仍在 <项目根>。以下先探测技能池根，探测不到时回退旧的「三级上溯」写法。
_POOL_CANDIDATE = os.path.abspath(os.path.join(HERE, "../../../skill-pool"))
POOL_ROOT = _POOL_CANDIDATE if os.path.isdir(os.path.join(_POOL_CANDIDATE, "docs", "operations")) else os.path.abspath(os.path.join(HERE, "..", "..", ".."))
DEFAULT_PLUGIN = os.path.join(POOL_ROOT, "plugins", "dsh-plugin-control-jump")
HARNESS = os.path.join(HERE, "harness.cjs")
PLUGIN_ID = "dsh-plugin-control-jump"


def emit(payload):
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def find_node():
    candidates = [
        os.path.join(os.environ.get("DSH_HOME", ""), ".desktop-bin", "node"),
        shutil.which("node"),
        "/opt/homebrew/bin/node",
        "/usr/local/bin/node",
    ]
    for path in candidates:
        if path and os.path.isfile(path) and os.access(path, os.X_OK):
            return path
    return None


def static_checks(plugin_dir):
    checks = []

    def add(name, passed, detail):
        checks.append({"name": name, "pass": bool(passed), "detail": str(detail)})

    manifest_path = os.path.join(plugin_dir, "package.json")
    add("package_json_exists", os.path.isfile(manifest_path), manifest_path)
    manifest = None
    if os.path.isfile(manifest_path):
        try:
            with io.open(manifest_path, encoding="utf-8") as handle:
                manifest = json.load(handle)
            add("package_json_parsable", True, "可解析")
        except (OSError, ValueError) as exc:
            add("package_json_parsable", False, str(exc))
    if manifest is None:
        return checks, None

    add("plugin_name_matches_dir", manifest.get("name") == PLUGIN_ID,
        "name=%s" % manifest.get("name"))
    client_meta = (manifest.get("dsh") or {}).get("client") or {}
    add("dsh_client_platform_web", client_meta.get("platform") == "web",
        "platform=%s" % client_meta.get("platform"))
    add("dsh_client_inject_declared", isinstance(client_meta.get("inject"), list),
        "inject=%s" % (client_meta.get("inject"),))
    exports = manifest.get("exports") or {}
    client_entry = exports.get("./client")
    add("client_export_declared", bool(client_entry), "exports[./client]=%s" % client_entry)

    patch = os.path.join(plugin_dir, "cordis.patch.yml")
    patch_ok = False
    if os.path.isfile(patch):
        with io.open(patch, encoding="utf-8") as handle:
            text = handle.read()
        patch_ok = PLUGIN_ID in text
        add("cordis_patch_matches_id", patch_ok, "patch 含 %s" % PLUGIN_ID)
    else:
        add("cordis_patch_matches_id", False, "缺少 cordis.patch.yml")

    bundle = os.path.join(plugin_dir, "lib", "client.js")
    add("client_bundle_exists", os.path.isfile(bundle), bundle)
    if os.path.isfile(bundle):
        with io.open(bundle, encoding="utf-8") as handle:
            body = handle.read()
        add("bundle_registers_module", '__ModuleLoader__.load' in body and PLUGIN_ID in body,
            "含 ModuleLoader 注册与正确 id")
        add("bundle_exports_apply", "async apply(ctx)" in body, "含 async apply(ctx)")
        add("bundle_has_no_external_ref",
            not any(p in body for p in ('src="http', "href=\"http", "<link")),
            "零外部资源引用")
    core = os.path.join(plugin_dir, "src", "inject-core.cjs")
    add("inject_core_exists", os.path.isfile(core), core)
    if os.path.isfile(bundle) and os.path.isfile(core):
        core_text = io.open(core, encoding="utf-8").read().rstrip("\n")
        bundle_text = io.open(bundle, encoding="utf-8").read()
        add("bundle_inlines_core_verbatim", core_text in bundle_text,
            "bundle 逐字包含内核（%d 字节）" % len(core_text.encode("utf-8")))
    return checks, bundle


def runtime_checks(node, plugin_dir, bundle):
    core = os.path.join(plugin_dir, "src", "inject-core.cjs")
    if not os.path.isfile(HARNESS):
        return [{"name": "harness_exists", "pass": False, "detail": HARNESS}]
    completed = subprocess.run([node, HARNESS, core, bundle or ""],
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        payload = json.loads(completed.stdout.decode("utf-8", "replace"))
    except ValueError:
        return [{"name": "harness_output", "pass": False,
                 "detail": "harness 输出不可解析: %s" % completed.stderr.decode("utf-8", "replace")[:200]}]
    return payload.get("checks") or []


def main(argv):
    parser = argparse.ArgumentParser(
        prog="verify_plugin_button.py",
        description="插件常显调控按钮断言器（静态契约 + 运行时 DOM 打桩）",
    )
    parser.add_argument("--plugin", default=DEFAULT_PLUGIN, help="插件包目录")
    parser.add_argument("--all", action="store_true", help="扫描全量插件包（默认行为）")
    parser.add_argument("--json", action="store_true", help="兼容开关；脚本恒输出 JSON")
    args = parser.parse_args(argv)

    plugin_dir = os.path.abspath(os.path.expanduser(args.plugin))
    if not os.path.isdir(plugin_dir):
        emit({"success": False, "error": "plugin_dir_missing", "detail": plugin_dir})
        return EXIT_INPUT

    node = find_node()
    if node is None:
        emit({"success": False, "error": "node_unavailable",
              "detail": "运行时验证需要 node；找不到 node 时不得降级为只做静态断言"})
        return EXIT_INPUT

    static, bundle = static_checks(plugin_dir)
    runtime = runtime_checks(node, plugin_dir, bundle)
    checks = static + runtime
    failed = [item for item in checks if not item["pass"]]
    payload = {
        "success": not failed,
        "plugin": plugin_dir,
        "plugin_id": PLUGIN_ID,
        "node": node,
        "static_checks": len(static),
        "runtime_checks": len(runtime),
        "checks": checks,
        "failed": [item["name"] for item in failed],
        "verdict": "control_button_verified" if not failed else "control_button_not_verified",
    }
    emit(payload)
    return EXIT_OK if not failed else EXIT_FAIL


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
