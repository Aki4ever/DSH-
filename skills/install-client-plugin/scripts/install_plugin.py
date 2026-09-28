#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
install_plugin.py
把本仓自建的 DSH client 插件幂等装配进指定 profile，并支持一键回滚。

为什么不是「打补丁到宿主」：宿主应用包已签名，改它即破签名（PKG-006 结论）；
插件市场本体（dshmarket）是第三方包，重装即覆盖。合规落点只有自建 client 插件。

装配动作（全部可回滚）：
  1 构建：跑 plugins/<id>/build_client.py 生成 lib/client.js；
  2 拷贝：整包复制到 <profile>/node_modules/<id>/；
  3 登记：profile/package.json 的 dependencies 加一条 file: 依赖；
  4 启用：profile/package.json 的 dsh.profile.bundles 追加插件名；
  5 备份：改动前把 package.json 与 cordis.patch.yml 备份成 .bak-<时间戳>。

生效条件（诚实声明）：新增插件的注册表在宿主启动时读取，
**需要重新加载 dsh web（重启宿主）后按钮才会出现**；只刷新页面不够。
装配脚本会把 restart_required 与具体动作一并输出，不假装热更成功。

Exit Code:
  0 - 干跑完成 / 装配成功 / 回滚成功 / 已是目标状态（幂等）
  1 - 目标 profile 不可写、备份缺失导致无法回滚
  2 - 输入不可读（插件目录缺失、构建失败、package.json 不可解析）
"""

import sys

sys.dont_write_bytecode = True

import os
import io
import json
import time
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
PLUGIN_ID = "dsh-plugin-control-jump"
PLUGIN_SRC = os.path.join(POOL_ROOT, "plugins", PLUGIN_ID)
BUILD_SCRIPT = os.path.join(PLUGIN_SRC, "build_client.py")
ROOT = os.path.join(POOL_ROOT, "..", "..")


def emit(payload):
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def profiles_root(explicit=None):
    if explicit:
        return os.path.abspath(os.path.expanduser(explicit))
    home = os.environ.get("DSH_HOME")
    if home:
        return os.path.join(home, "profiles")
    return os.path.join(os.path.expanduser("~"), "Library", "Application Support",
                        "dsh-desktop", "harness", "profiles")


def read_manifest(path):
    with io.open(path, encoding="utf-8") as handle:
        return json.load(handle)


def write_manifest(path, payload):
    with io.open(path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=1)
        handle.write("\n")


def main(argv):
    parser = argparse.ArgumentParser(
        prog="install_plugin.py",
        description="把自建 DSH client 插件幂等装配进 profile（可回滚）",
    )
    parser.add_argument("--profile", default="web", help="profile 名，默认 web")
    parser.add_argument("--root", default=None, help="profiles 根目录覆盖")
    parser.add_argument("--apply", action="store_true", help="真正写入；缺省为干跑")
    parser.add_argument("--rollback", action="store_true", help="回滚最近一次装配")
    parser.add_argument("--json", action="store_true", help="兼容开关；脚本恒输出 JSON")
    args = parser.parse_args(argv)

    root = profiles_root(args.root)
    profile_dir = os.path.join(root, args.profile)
    manifest_path = os.path.join(profile_dir, "package.json")
    if not os.path.isfile(manifest_path):
        emit({"success": False, "error": "profile_missing", "detail": manifest_path})
        return EXIT_INPUT

    state_dir = os.path.join(profile_dir, ".plugin-install-state")
    state_path = os.path.join(state_dir, PLUGIN_ID + ".json")

    # ── 回滚 ──────────────────────────────────────────────────────────────────
    if args.rollback:
        if not os.path.isfile(state_path):
            emit({"success": False, "error": "no_state", "detail": "没有可回滚的装配记录"})
            return EXIT_FAIL
        state = read_manifest(state_path)
        manifest = read_manifest(manifest_path)
        manifest.get("dependencies", {}).pop(PLUGIN_ID, None)
        bundles = ((manifest.get("dsh") or {}).get("profile") or {}).get("bundles")
        if isinstance(bundles, list):
            bundles[:] = [item for item in bundles if item != PLUGIN_ID]
        write_manifest(manifest_path, manifest)
        target = os.path.join(profile_dir, "node_modules", PLUGIN_ID)
        if os.path.isdir(target):
            shutil.rmtree(target)
        for key in ("manifest_backup", "patch_backup"):
            backup = state.get(key)
            if backup and os.path.isfile(backup):
                original = manifest_path if key == "manifest_backup" else os.path.join(profile_dir, "cordis.patch.yml")
                shutil.copy2(backup, original)
        os.remove(state_path)
        emit({"success": True, "rolled_back": True, "plugin": PLUGIN_ID,
              "manifest": manifest_path, "state_removed": state_path})
        return EXIT_OK

    # ── 构建 ──────────────────────────────────────────────────────────────────
    build = {"ran": False}
    if os.path.isfile(BUILD_SCRIPT):
        completed = subprocess.run([sys.executable, BUILD_SCRIPT], stdout=subprocess.PIPE,
                                   stderr=subprocess.PIPE)
        if completed.returncode != 0:
            emit({"success": False, "error": "build_failed",
                  "detail": completed.stderr.decode("utf-8", "replace")[:400]})
            return EXIT_INPUT
        try:
            build = json.loads(completed.stdout.decode("utf-8", "replace"))
            build["ran"] = True
        except ValueError:
            build = {"ran": True, "output": None}
    else:
        emit({"success": False, "error": "build_script_missing", "detail": BUILD_SCRIPT})
        return EXIT_INPUT

    manifest = read_manifest(manifest_path)
    dependencies = manifest.setdefault("dependencies", {})
    profile_meta = manifest.setdefault("dsh", {}).setdefault("profile", {})
    bundles = profile_meta.setdefault("bundles", [])
    if not isinstance(bundles, list):
        emit({"success": False, "error": "bundles_not_list"})
        return EXIT_INPUT

    already = dependencies.get(PLUGIN_ID) == ("file:" + PLUGIN_SRC) and PLUGIN_ID in bundles
    target_dir = os.path.join(profile_dir, "node_modules", PLUGIN_ID)
    installed = os.path.isdir(target_dir)
    if already and installed:
        emit({"success": True, "status": "already_installed", "plugin": PLUGIN_ID,
              "profile": profile_dir, "restart_required": False,
              "changed": 0})
        return EXIT_OK

    if not args.apply:
        emit({"success": True, "status": "dry_run", "plugin": PLUGIN_ID,
              "profile": profile_dir,
              "would": {
                  "build": BUILD_SCRIPT,
                  "copy_to": target_dir,
                  "dependency": "%s -> file:%s" % (PLUGIN_ID, PLUGIN_SRC),
                  "bundles_append": PLUGIN_ID,
                  "backup_manifest": manifest_path + ".bak-<时间戳>",
              },
              "restart_required": True,
              "restart_note": "装配后需重新加载 dsh web（重启宿主）才会出现按钮；只刷新页面不够。"})
        return EXIT_OK

    # ── 备份 + 装配 ───────────────────────────────────────────────────────────
    stamp = time.strftime("%Y%m%d-%H%M%S")
    os.makedirs(state_dir, exist_ok=True)
    manifest_backup = "%s.bak-%s" % (manifest_path, stamp)
    shutil.copy2(manifest_path, manifest_backup)
    patch_path = os.path.join(profile_dir, "cordis.patch.yml")
    patch_backup = None
    if os.path.isfile(patch_path):
        patch_backup = "%s.bak-%s" % (patch_path, stamp)
        shutil.copy2(patch_path, patch_backup)

    if os.path.isdir(target_dir):
        shutil.rmtree(target_dir)
    os.makedirs(os.path.dirname(target_dir), exist_ok=True)
    shutil.copytree(PLUGIN_SRC, target_dir,
                    ignore=shutil.ignore_patterns("__pycache__", "*.pyc", "node_modules"))

    dependencies[PLUGIN_ID] = "file:" + PLUGIN_SRC
    if PLUGIN_ID not in bundles:
        bundles.append(PLUGIN_ID)
    write_manifest(manifest_path, manifest)

    state = {"plugin": PLUGIN_ID, "installed_at": stamp, "profile": profile_dir,
             "manifest_backup": manifest_backup, "patch_backup": patch_backup,
             "target_dir": target_dir}
    write_manifest(state_path, state)

    emit({"success": True, "status": "installed", "plugin": PLUGIN_ID,
          "profile": profile_dir, "target_dir": target_dir,
          "manifest_backup": manifest_backup, "patch_backup": patch_backup,
          "bundles_total": len(bundles), "build": build,
          "restart_required": True,
          "restart_note": "需重新加载 dsh web（重启宿主）后按钮才会出现；只刷新页面不够。",
          "rollback_command": "python3 skills/install-client-plugin/scripts/install_plugin.py "
                              "--profile %s --rollback" % args.profile})
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
