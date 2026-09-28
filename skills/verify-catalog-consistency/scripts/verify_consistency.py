#!/usr/bin/env python3
"""
verify_consistency.py
口径三方对拍探针：Frontmatter / catalog JSON / docs 受管区块 / docs 正文手写表。

Exit Code:
  0 - 完全一致
  1 - 存在不一致（issues 数组逐条给出文件与行号）
"""

import os
import re
import sys
import json
import argparse
import subprocess

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
SKILLS_DIR = os.path.join(REPO_ROOT, "skills")
CATALOG_JSON = os.path.join(REPO_ROOT, "docs/operations/skill-catalog.json")
CATALOG_MD = os.path.join(REPO_ROOT, "docs/operations/skills-catalog.md")
PRODUCT_MD = os.path.join(REPO_ROOT, "docs/requirements/product.md")
RENDER_SCRIPT = os.path.join(REPO_ROOT, "skills/render-catalog-docs/scripts/render_docs.py")

# 正文手写组装行：`skill-id` (L3) = `a` (L1) + `b` (L2)
PROSE_ASSEMBLY_RE = re.compile(r"`([a-z0-9][a-z0-9\-]*)`\s*\(L[1-4]\)\s*=\s*(.+)$")
BACKTICK_ID_RE = re.compile(r"`([a-z0-9][a-z0-9\-]*)`")

SCAN_DOCS = [PRODUCT_MD]


def parse_frontmatter(content):
    meta = {"name": None, "level": None, "composition": []}
    m = re.match(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
    if not m:
        return meta
    current = None
    for raw in m.group(1).splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("- ") and current == "composition":
            meta["composition"].append(line[2:].strip().strip('"').strip("'"))
            continue
        if ":" in line:
            k, v = line.split(":", 1)
            current = k.strip()
            v = v.strip().strip('"').strip("'")
            if current == "composition":
                meta["composition"] = re.findall(r"[\w\-]+", v) if v else []
            elif current in ("name", "level"):
                meta[current] = v
    return meta


def load_catalog():
    if not os.path.exists(CATALOG_JSON):
        return None, f"catalog not found: {CATALOG_JSON}"
    try:
        with open(CATALOG_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, ValueError) as exc:
        return None, f"catalog unreadable: {exc}"
    for key in ("total_skills", "levels_summary", "skills"):
        if key not in data:
            return None, f"catalog missing required field: {key}"
    return data, None


def check_frontmatter_vs_catalog(catalog):
    issues = []
    by_id = {s["id"]: s for s in catalog.get("skills", [])}
    checked = 0

    for entry in sorted(os.listdir(SKILLS_DIR)):
        sdir = os.path.join(SKILLS_DIR, entry)
        if not os.path.isdir(sdir) or entry.startswith("_") or entry.startswith("."):
            continue
        skill_md = os.path.join(sdir, "SKILL.md")
        if not os.path.exists(skill_md):
            issues.append({"check": "C2", "file": f"skills/{entry}", "line": 0,
                           "detail": "missing SKILL.md"})
            continue

        with open(skill_md, "r", encoding="utf-8") as f:
            meta = parse_frontmatter(f.read())

        if meta["name"] != entry:
            issues.append({"check": "C2", "file": f"skills/{entry}/SKILL.md", "line": 1,
                           "detail": f"frontmatter name '{meta['name']}' != directory '{entry}'"})

        item = by_id.get(entry)
        if item is None:
            issues.append({"check": "C2", "file": f"skills/{entry}/SKILL.md", "line": 1,
                           "detail": "skill missing from catalog (run sync_catalog.py)"})
            continue

        checked += 1
        if (item.get("level") or "") != (meta["level"] or ""):
            issues.append({"check": "C2", "file": f"skills/{entry}/SKILL.md", "line": 1,
                           "detail": f"level mismatch: frontmatter '{meta['level']}' vs catalog '{item.get('level')}'"})

        fm_comp = sorted(meta["composition"])
        cat_comp = sorted(item.get("composition") or [])
        if fm_comp != cat_comp:
            issues.append({"check": "C2", "file": f"skills/{entry}/SKILL.md", "line": 1,
                           "detail": f"composition mismatch: frontmatter {fm_comp} vs catalog {cat_comp}"})

    return issues, checked


def check_managed_block():
    issues = []
    if not os.path.exists(RENDER_SCRIPT):
        issues.append({"check": "C3", "file": "skills/render-catalog-docs/scripts/render_docs.py",
                       "line": 0, "detail": "render script missing"})
        return issues

    proc = subprocess.run([sys.executable, RENDER_SCRIPT, "--check"],
                          capture_output=True, text=True)
    if proc.returncode != 0:
        detail = "managed block drift detected"
        try:
            payload = json.loads(proc.stdout)
            if payload.get("error"):
                detail = payload["error"]
        except (ValueError, TypeError):
            detail = (proc.stdout or proc.stderr).strip()[:300] or detail
        issues.append({"check": "C3", "file": "docs/requirements/product.md", "line": 0, "detail": detail})
    return issues


def check_prose_drift(catalog):
    issues = []
    by_id = {s["id"]: s for s in catalog.get("skills", [])}

    for doc in SCAN_DOCS:
        if not os.path.exists(doc):
            continue
        rel = os.path.relpath(doc, REPO_ROOT)
        with open(doc, "r", encoding="utf-8") as f:
            for lineno, line in enumerate(f, start=1):
                m = PROSE_ASSEMBLY_RE.search(line)
                if not m:
                    continue
                skill_id, rhs = m.group(1), m.group(2)
                item = by_id.get(skill_id)
                if item is None:
                    issues.append({"check": "C4", "file": rel, "line": lineno,
                                   "detail": f"prose references unknown skill '{skill_id}'"})
                    continue
                claimed = set(BACKTICK_ID_RE.findall(rhs))
                claimed.discard(skill_id)
                actual = set(item.get("composition") or [])
                if claimed != actual:
                    issues.append({
                        "check": "C4", "file": rel, "line": lineno,
                        "detail": (f"prose assembly drift for '{skill_id}': "
                                   f"docs claims {sorted(claimed)} vs frontmatter {sorted(actual)}")
                    })
    return issues


def check_catalog_md_count(catalog):
    issues = []
    if not os.path.exists(CATALOG_MD):
        issues.append({"check": "C5", "file": "docs/operations/skills-catalog.md",
                       "line": 0, "detail": "human-readable catalog missing"})
        return issues
    with open(CATALOG_MD, "r", encoding="utf-8") as f:
        content = f.read()
    m = re.search(r"总纳管技能数\*\*：\s*(\d+)", content)
    if not m:
        issues.append({"check": "C5", "file": "docs/operations/skills-catalog.md", "line": 0,
                       "detail": "cannot find 总纳管技能数 marker"})
        return issues
    listed = int(m.group(1))
    total = catalog.get("total_skills")
    if listed != total:
        issues.append({"check": "C5", "file": "docs/operations/skills-catalog.md", "line": 0,
                       "detail": f"catalog.md lists {listed} skills but catalog JSON has {total}"})
    return issues


def main() -> int:
    parser = argparse.ArgumentParser(description="Three-way catalog consistency probe")
    parser.add_argument("--json", action="store_true", help="JSON output (default)")
    args = parser.parse_args()

    catalog, err = load_catalog()
    if catalog is None:
        print(json.dumps({"success": False, "issues": [
            {"check": "C1", "file": os.path.relpath(CATALOG_JSON, REPO_ROOT), "line": 0, "detail": err}
        ]}, ensure_ascii=False, indent=2))
        return 1

    issues = []
    fm_issues, checked = check_frontmatter_vs_catalog(catalog)
    issues += fm_issues
    issues += check_managed_block()
    issues += check_prose_drift(catalog)
    issues += check_catalog_md_count(catalog)

    result = {
        "success": not issues,
        "checked_skills": checked,
        "total_skills": catalog.get("total_skills"),
        "issue_count": len(issues),
        "issues": issues,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if not issues else 1


if __name__ == "__main__":
    sys.exit(main())
