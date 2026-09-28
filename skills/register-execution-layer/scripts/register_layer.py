#!/usr/bin/env python3
"""
register_layer.py
登记与维护非技能执行层条目（cli / agent / api / mcp / plugin）。

Exit Code:
  0 - 登记成功、幂等命中，或 --list 输出完成
  1 - 层名非法 / 路径缺失 / id 冲突且内容不同 / 移除不存在的 id
"""

import os
import sys
import json
import argparse

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
REGISTRY = os.path.join(REPO_ROOT, "docs/operations/execution-layers.json")

LAYERS = {
    "skill": {"title": "技能层", "auto": True, "source": "docs/operations/skill-catalog.json"},
    "cli": {"title": "命令层", "auto": False, "source": "manual"},
    "agent": {"title": "智能体层", "auto": False, "source": "manual"},
    "api": {"title": "接口层", "auto": False, "source": "manual"},
    "mcp": {"title": "协议层", "auto": False, "source": "manual"},
    "plugin": {"title": "插件层", "auto": False, "source": "manual"},
}


def load_registry(path=REGISTRY):
    if not os.path.exists(path):
        return {"registry_version": "1.0.0", "layers": LAYERS, "entries": []}
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, ValueError):
        return {"registry_version": "1.0.0", "layers": LAYERS, "entries": []}
    data.setdefault("registry_version", "1.0.0")
    data.setdefault("layers", LAYERS)
    data.setdefault("entries", [])
    return data


def save_registry(data, path=REGISTRY):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    payload = json.dumps(data, ensure_ascii=False, sort_keys=True, indent=1) + "\n"
    old = None
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            old = f.read()
    if old == payload:
        return False
    with open(path, "w", encoding="utf-8") as f:
        f.write(payload)
    return True


def validate_entry(entry):
    layer = entry.get("layer")
    if layer not in LAYERS:
        return f"illegal layer: {layer!r} (allowed: {sorted(LAYERS)})"
    if not entry.get("id"):
        return "missing id"
    if entry.get("source", "repo") == "repo":
        path = entry.get("path")
        if not path:
            return f"missing path for repo entry {entry['id']}"
        if not os.path.exists(os.path.join(REPO_ROOT, path)):
            return f"path not found for {entry['id']}: {path}"
    return None


def cmd_add(data, entry):
    err = validate_entry(entry)
    if err:
        return None, err

    for i, existing in enumerate(data["entries"]):
        if existing.get("id") == entry["id"]:
            if existing == entry:
                return {"changed": False, "action": "noop", "id": entry["id"]}, None
            data["entries"][i] = entry
            changed = save_registry(data)
            return {"changed": changed, "action": "updated", "id": entry["id"]}, None

    data["entries"].append(entry)
    data["entries"].sort(key=lambda e: (e.get("layer", ""), e.get("id", "")))
    changed = save_registry(data)
    return {"changed": changed, "action": "added", "id": entry["id"]}, None


def cmd_remove(data, entry_id):
    before = len(data["entries"])
    data["entries"] = [e for e in data["entries"] if e.get("id") != entry_id]
    if len(data["entries"]) == before:
        return None, f"entry not found: {entry_id}"
    changed = save_registry(data)
    return {"changed": changed, "action": "removed", "id": entry_id}, None


def main() -> int:
    parser = argparse.ArgumentParser(description="Register non-skill execution layers")
    parser.add_argument("--add", action="store_true")
    parser.add_argument("--remove", action="store_true")
    parser.add_argument("--list", action="store_true")
    parser.add_argument("--id")
    parser.add_argument("--layer", choices=sorted(LAYERS))
    parser.add_argument("--path")
    parser.add_argument("--parent", default="dsh-butler")
    parser.add_argument("--source", default="repo", choices=["repo", "host"])
    parser.add_argument("--description", default="")
    parser.add_argument("--status", default="active")
    parser.add_argument("--registry", default=REGISTRY)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    data = load_registry(args.registry)

    if args.list:
        print(json.dumps({
            "success": True,
            "layers": data["layers"],
            "counts": {k: len([e for e in data["entries"] if e.get("layer") == k])
                       for k in data["layers"]},
            "entries": data["entries"],
        }, ensure_ascii=False, sort_keys=True, indent=1))
        return 0

    if args.remove:
        if not args.id:
            print(json.dumps({"success": False, "error": "missing --id"}, ensure_ascii=False))
            return 1
        result, err = cmd_remove(data, args.id)
        if result is None:
            print(json.dumps({"success": False, "error": err}, ensure_ascii=False, indent=2))
            return 1
        print(json.dumps(dict(success=True, **result), ensure_ascii=False, indent=2))
        return 0

    if args.add:
        if not args.id or not args.layer:
            print(json.dumps({"success": False, "error": "missing --id or --layer"},
                             ensure_ascii=False, indent=2))
            return 1
        entry = {
            "id": args.id,
            "layer": args.layer,
            "parent": args.parent,
            "path": args.path,
            "source": args.source,
            "status": args.status,
            "description": args.description,
        }
        result, err = cmd_add(data, entry)
        if result is None:
            print(json.dumps({"success": False, "error": err}, ensure_ascii=False, indent=2))
            return 1
        print(json.dumps(dict(success=True, **result), ensure_ascii=False, indent=2))
        return 0

    parser.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
