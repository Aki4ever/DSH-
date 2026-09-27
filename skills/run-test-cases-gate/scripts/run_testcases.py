#!/usr/bin/env python3
import os
import sys
import subprocess
import argparse
import json

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
STANDARDS_DIR = os.path.join(REPO_ROOT, "docs/knowledge/standards")

def run_tests() -> dict:
    cases = []
    all_passed = True

    # TC-SPEC-001: 7大规范物理存在且非空
    std_files = [
        "worldview-standard.md",
        "art-visual-standard.md",
        "interaction-standard.md",
        "text-language-standard.md",
        "layout-standard.md",
        "engineering-standard.md",
        "dialogue-standard.md"
    ]
    missing_stds = []
    for sf in std_files:
        p = os.path.join(STANDARDS_DIR, sf)
        if not os.path.exists(p) or os.path.getsize(p) == 0:
            missing_stds.append(sf)

    tc1_ok = len(missing_stds) == 0
    cases.append({
        "id": "TC-SPEC-001",
        "name": "7大知识库规范文件落地检测",
        "ok": tc1_ok,
        "details": "All 7 standard docs present and non-empty" if tc1_ok else f"Missing/empty: {missing_stds}"
    })
    if not tc1_ok:
        all_passed = False

    # TC-SPEC-002: 需求基线对齐
    sync_script = os.path.join(REPO_ROOT, "skills/sync-requirements-lifecycle/scripts/sync_reqs.py")
    if os.path.exists(sync_script):
        cmd = f"python3 {sync_script} --req-id REQ-BUTLER-SPEC-GOVERNANCE-009"
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        tc2_ok = res.returncode == 0
    else:
        tc2_ok = False
    cases.append({
        "id": "TC-SPEC-002",
        "name": "需求文档版本一致性自检",
        "ok": tc2_ok,
        "details": "REQ-BUTLER-SPEC-GOVERNANCE-009 present in index and product" if tc2_ok else "Sync script failed"
    })
    if not tc2_ok:
        all_passed = False

    # TC-SPEC-003: 全盘合规体检
    audit_script = os.path.join(REPO_ROOT, "skills/audit-all-skills-compliance/scripts/audit_compliance.py")
    if os.path.exists(audit_script):
        res = subprocess.run(f"python3 {audit_script}", shell=True, capture_output=True, text=True)
        tc3_ok = res.returncode == 0
    else:
        tc3_ok = False
    cases.append({
        "id": "TC-SPEC-003",
        "name": "全盘技能契约体检",
        "ok": tc3_ok,
        "details": "Full compliance audit passed" if tc3_ok else "Audit script failed"
    })
    if not tc3_ok:
        all_passed = False

    return {
        "all_passed": all_passed,
        "total_cases": len(cases),
        "passed_cases": sum(1 for c in cases if c["ok"]),
        "cases": cases
    }

def main():
    parser = argparse.ArgumentParser(description="Run requirement test cases gate")
    args = parser.parse_args()

    res = run_tests()
    print(json.dumps(res, ensure_ascii=False, indent=2))
    sys.exit(0 if res["all_passed"] else 1)

if __name__ == "__main__":
    main()
