#!/usr/bin/env python3
import os
import sys
import argparse
import json

# 合并后布局（2026-09-28）：docs/、plugins/ 随技能池主体迁入 <项目根>/skill-pool/，
# 而 skills/ 仍在 <项目根>。以下先探测技能池根，探测不到时回退旧的「三级上溯」写法。
_POOL_CANDIDATE = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../skill-pool"))
REPO_ROOT = _POOL_CANDIDATE if os.path.isdir(os.path.join(_POOL_CANDIDATE, "docs", "operations")) else os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
INDEX_PATH = os.path.join(REPO_ROOT, "docs/requirements/index.md")
PRODUCT_PATH = os.path.join(REPO_ROOT, "docs/requirements/product.md")

def check_requirements(req_id: str) -> dict:
    if not os.path.exists(INDEX_PATH) or not os.path.exists(PRODUCT_PATH):
        return {"ok": False, "error": "Requirements files missing"}

    with open(INDEX_PATH, "r", encoding="utf-8") as f:
        index_content = f.read()

    with open(PRODUCT_PATH, "r", encoding="utf-8") as f:
        product_content = f.read()

    in_index = req_id in index_content
    in_product = req_id in product_content

    return {
        "ok": in_index and in_product,
        "req_id": req_id,
        "in_index": in_index,
        "in_product": in_product,
        "index_file": INDEX_PATH,
        "product_file": PRODUCT_PATH
    }

def main():
    parser = argparse.ArgumentParser(description="Check requirement lifecycle presence")
    parser.add_argument("--req-id", "-r", default="REQ-BUTLER-SPEC-GOVERNANCE-009", help="Requirement ID")
    args = parser.parse_args()

    res = check_requirements(args.req_id)
    print(json.dumps(res, ensure_ascii=False, indent=2))
    sys.exit(0 if res["ok"] else 1)

if __name__ == "__main__":
    main()
