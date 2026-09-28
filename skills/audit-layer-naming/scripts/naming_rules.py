#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
naming_rules.py
能力层命名规则引擎（全池唯一实现）。

真相源：docs/operations/capability-naming.json
口径说明：skills/capability-naming-policy/SKILL.md

本模块是三处共用的同一份规则实现，禁止任何下游另抄一份判据：
  - skills/audit-layer-naming/scripts/audit_naming.py         （体检出违规清单）
  - skills/verify-layer-naming/scripts/verify_naming.py       （合规率与悬空引用断言）
  - skills/render-capability-naming/scripts/render_naming_spec.py （合规快照渲染）

违规码闭集（violation codes）：
  catalog_id_empty / syntax_charset / segments / length / single_token_unregistered /
  banned_word / synonym_alias / shape_action / shape_orchestration / shape_l4 /
  level_prefix / description_too_short / owner_missing / dir_missing /
  frontmatter_mismatch / near_duplicate / layer_unknown / registry_grammar

本模块不做文件写入，也不决定退出码。
"""

import sys

sys.dont_write_bytecode = True

import os
import re
import json

SIX_LAYERS = ("skill", "cli", "agent", "api", "mcp", "plugin")

SHAPE_RULES = {
    "L1": "free",
    "L2": "action",
    "L3": "action|orchestration",
    "L4": "fixed",
}

FRONTMATTER_NAME = re.compile(r"^name\s*:\s*(\S+)\s*$", re.MULTILINE)
KEBAB = re.compile(r"^[a-z][a-z0-9]*(-[a-z0-9]+)*$")
KEBAB_SUBCOMMAND = re.compile(r"^[a-z][a-z0-9]*(-[a-z0-9]+)*(:[a-z][a-z0-9]*(-[a-z0-9]+)*)?$")


def load_json(path):
    if not os.path.isfile(path):
        return None, "not_found: %s" % path
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle), None
    except (OSError, ValueError) as exc:
        return None, "unreadable: %s: %s" % (path, exc)


class NamingRules(object):
    """由 capability-naming.json 构造的规则引擎实例。"""

    def __init__(self, spec):
        self.spec = spec
        syntax = spec["syntax"]
        self.pattern = re.compile(syntax["pattern"])
        self.min_segments = syntax["min_segments"]
        self.max_segments = syntax["max_segments"]
        self.min_length = syntax["min_length"]
        self.max_length = syntax["max_length"]
        self.verbs = {item["verb"] for item in spec["verb_vocabulary"]}
        self.orchestration = set(spec["orchestration_suffixes"])
        self.policy_suffixes = set(spec["policy_suffixes"])
        self.banned = set(spec["banned_words"])
        self.aliases = set()
        for group in spec["synonym_groups"]:
            self.aliases.update(group["aliases"])
        self.vendors = {item["id"] for item in spec["single_token_vendors"]}
        self.level_prefixes = spec["level_prefixes"]
        self.shape_rules = spec.get("shape_assignment", SHAPE_RULES)
        self.exempt_sources = set(spec.get("exempt_sources") or ["host", "external"])
        self.min_description_bytes = 20

    # ------------------------------------------------------------ 单条判定

    def check_skill(self, skill, context):
        """对一条 catalog 技能做全量判定，返回违规列表。"""
        identifier = skill.get("id") or ""
        level = skill.get("level") or ""
        scope = skill.get("scope") or "local-pool"
        description = skill.get("description") or ""
        location = context.get("catalog_location", "docs/operations/skill-catalog.json")
        out = []

        def add(code, detail):
            out.append({"code": code, "id": identifier, "level": level,
                        "detail": detail, "location": location})

        if not identifier:
            add("catalog_id_empty", "catalog 中的 id 为空")
            return out

        segments = identifier.split("-")
        if not identifier.isascii():
            add("syntax_charset", "id 含非 ASCII 字符：%s" % identifier)
        elif not self.pattern.match(identifier):
            add("syntax_charset",
                "id 不匹配语法 %s（禁止下划线/大写/连续连字符/首尾连字符）" % self.spec["syntax"]["pattern"])

        single_allowed = identifier in self.vendors or (
            context.get("registry_layer") == "cli" and len(segments) == 1)
        if len(segments) < self.min_segments and not single_allowed:
            add("segments", "段数 %d < %d，且不在单段白名单（厂商名 / cli 产品主入口）"
                % (len(segments), self.min_segments))
        if len(segments) > self.max_segments:
            add("segments", "段数 %d > %d" % (len(segments), self.max_segments))
        if not (self.min_length <= len(identifier) <= self.max_length):
            add("length", "长度 %d 不在 %d~%d 之间"
                % (len(identifier), self.min_length, self.max_length))

        hit = sorted(self.banned & set(segments))
        if hit:
            add("banned_word", "命中禁词：%s" % "、".join(hit))
        if segments[0] in self.aliases:
            add("synonym_alias",
                "首段 %s 是同义组别名；同义组保留词为 %s"
                % (segments[0], "、".join("`%s`" % g["keep"] for g in self.spec["synonym_groups"])))

        head_in_verbs = segments[0] in self.verbs
        tail_in_orchestration = segments[-1] in self.orchestration
        is_vendor = identifier in self.vendors
        if not is_vendor and level == "L2" and not head_in_verbs:
            add("shape_action", "L2 必须是动作形态，但首段 %s 不在动词词汇表内" % segments[0])
        if not is_vendor and level == "L3" and not head_in_verbs and not tail_in_orchestration:
            add("shape_orchestration",
                "L3 必须是动作形态或编排形态，但首段 %s 不是动词且末段 %s 不是编排名词"
                % (segments[0], segments[-1]))
        if level == "L4" and identifier != "dsh-butler":
            add("shape_l4", "L4 全池唯一中枢，id 必须固定为 dsh-butler")

        prefix_table = self.level_prefixes.get(scope) or self.level_prefixes.get("local-pool")
        expected = prefix_table.get(level) or prefix_table.get("any")
        if expected and not description.startswith(expected):
            add("level_prefix", "description 未以登记前缀 %r 开头（scope=%s level=%s）"
                % (expected, scope, level))
        if len(description.encode("utf-8")) < self.min_description_bytes:
            add("description_too_short", "description 仅 %d 字节，少于 %d"
                % (len(description.encode("utf-8")), self.min_description_bytes))

        if level in ("L1", "L2") and not context.get("owner_refs"):
            add("owner_missing", "L1/L2 未被任何同池 composition 边引用（孤儿，无归属）")
        if level == "L3" and not context.get("cluster"):
            add("owner_missing", "L3 未落在 execution-tree 的任一集群内（无归属）")

        skill_dir = os.path.join(context["root"], "skills", identifier)
        if scope == "local-pool":
            if not os.path.isdir(skill_dir):
                add("dir_missing", "目录不存在：skills/%s/" % identifier)
            else:
                declared = read_frontmatter_name(os.path.join(skill_dir, "SKILL.md"))
                if declared is None:
                    add("frontmatter_mismatch", "SKILL.md 缺少 YAML Frontmatter name 字段")
                elif declared != identifier:
                    add("frontmatter_mismatch",
                        "SKILL.md name=%s 与 catalog id=%s 不一致" % (declared, identifier))
        return out

    def check_identifier(self, identifier, level, scope="local-pool"):
        """仅按 id + level 判定（无 catalog / 磁盘上下文），用于改名前的目标名校验。"""
        out = []
        if not identifier:
            return [{"code": "catalog_id_empty", "detail": "id 为空"}]
        segments = identifier.split("-")

        def add(code, detail):
            out.append({"code": code, "detail": detail})

        if not identifier.isascii() or not self.pattern.match(identifier):
            add("syntax_charset", "id 不匹配语法 %s" % self.spec["syntax"]["pattern"])
        is_vendor = identifier in self.vendors
        if len(segments) < self.min_segments and not is_vendor:
            add("segments", "段数 %d < %d，且不在单段白名单" % (len(segments), self.min_segments))
        if len(segments) > self.max_segments:
            add("segments", "段数 %d > %d" % (len(segments), self.max_segments))
        if not (self.min_length <= len(identifier) <= self.max_length):
            add("length", "长度 %d 不在 %d~%d 之间"
                % (len(identifier), self.min_length, self.max_length))
        hit = sorted(self.banned & set(segments))
        if hit:
            add("banned_word", "命中禁词：%s" % "、".join(hit))
        if segments[0] in self.aliases:
            add("synonym_alias", "首段 %s 是同义组别名" % segments[0])
        head_in_verbs = segments[0] in self.verbs
        tail_in_orchestration = segments[-1] in self.orchestration
        if not is_vendor and level == "L2" and not head_in_verbs:
            add("shape_action", "L2 必须是动作形态，但首段 %s 不在动词词汇表内" % segments[0])
        if not is_vendor and level == "L3" and not head_in_verbs and not tail_in_orchestration:
            add("shape_orchestration", "L3 首段 %s 不是动词且末段 %s 不是编排名词"
                % (segments[0], segments[-1]))
        if level == "L4" and identifier != "dsh-butler":
            add("shape_l4", "L4 id 必须固定为 dsh-butler")
        return out

    def check_registry_entry(self, entry, context):
        """对执行层登记表（execution-layers.json）的一条做判定。"""
        identifier = entry.get("id") or ""
        layer = entry.get("layer") or ""
        source = entry.get("source") or "repo"
        description = entry.get("description") or ""
        location = context.get("registry_location", "docs/operations/execution-layers.json")
        out = []

        def add(code, detail):
            out.append({"code": code, "id": identifier, "level": layer,
                        "detail": detail, "location": location})

        if layer not in SIX_LAYERS:
            add("layer_unknown", "layer=%r 不在六层闭集 %s 内" % (layer, "/".join(SIX_LAYERS)))
        if not description.strip():
            add("description_too_short", "description 为空")
        if source in self.exempt_sources:
            return out
        if not KEBAB_SUBCOMMAND.match(identifier or ""):
            add("registry_grammar",
                "登记 id %r 既不是 kebab-case，也不是 <cli-id>:<subcommand> 形态" % identifier)
            return out
        segments = re.split(r"[:-]", identifier)
        hit = sorted(self.banned & set(segments))
        if hit:
            add("banned_word", "命中禁词：%s" % "、".join(hit))
        return out

    def _emit(self, code, identifier, level, detail, location):
        return {"code": code, "id": identifier, "level": level,
                "detail": detail, "location": location}

    def near_duplicates(self, identifiers, location):
        """近重复：拆分 → 词元集合去重 → 升序拼接；拼接结果相同即近重复。"""
        buckets = {}
        for identifier in identifiers:
            key = "-".join(sorted(set(identifier.split("-"))))
            buckets.setdefault(key, []).append(identifier)
        out = []
        for key in sorted(buckets):
            group = sorted(buckets[key])
            if len(group) > 1:
                out.append(self._emit("near_duplicate",
                                      "、".join(group), "",
                                      "词元集合相同，属近重复名（归一化键 %s）" % key,
                                      location))
        return out


def read_frontmatter_name(skill_md_path):
    if not os.path.isfile(skill_md_path):
        return None
    try:
        with open(skill_md_path, "r", encoding="utf-8") as handle:
            text = handle.read(4096)
    except OSError:
        return None
    if not text.startswith("---"):
        return None
    match = FRONTMATTER_NAME.search(text)
    return match.group(1) if match else None


def line_of(path, needle):
    """返回 needle 在文件中的首个行号（1 起），找不到返回 0。"""
    if not os.path.isfile(path):
        return 0
    try:
        with open(path, "r", encoding="utf-8") as handle:
            for index, line in enumerate(handle, start=1):
                if needle in line:
                    return index
    except OSError:
        return 0
    return 0


def evaluate(root, spec_path=None):
    """全池判定。返回完整报告字典（不决定退出码）。"""
    spec_path = spec_path or os.path.join(root, "docs", "operations", "capability-naming.json")
    spec, error = load_json(spec_path)
    if spec is None:
        return None, error
    catalog_path = os.path.join(root, "docs", "operations", "skill-catalog.json")
    registry_path = os.path.join(root, "docs", "operations", "execution-layers.json")
    tree_path = os.path.join(root, "docs", "operations", "execution-tree.json")
    catalog, catalog_error = load_json(catalog_path)
    if catalog is None:
        return None, catalog_error
    registry, _ = load_json(registry_path)
    tree, _ = load_json(tree_path)

    rules = NamingRules(spec)
    skills = catalog.get("skills", [])
    cluster_map = (tree or {}).get("cluster_map") or {}

    referenced = set()
    for skill in skills:
        for edge in skill.get("composition") or []:
            referenced.add(edge)
        for edge in skill.get("depends_on") or []:
            referenced.add(edge)

    violations = []
    identifiers = []
    by_level = {}
    for skill in skills:
        identifier = skill.get("id") or ""
        level = skill.get("level") or ""
        identifiers.append(identifier)
        by_level[level] = by_level.get(level, 0) + 1
        location = "%s:%d" % (catalog_path, line_of(catalog_path, '"id": "%s"' % identifier))
        context = {
            "root": root,
            "owner_refs": referenced,
            "cluster": cluster_map.get(identifier),
            "catalog_location": location,
        }
        violations.extend(rules.check_skill(skill, context))

    catalog_location = "%s:%d" % (registry_path, 1)
    for duplicate in rules.near_duplicates(identifiers, catalog_location):
        violations.append(duplicate)

    registry_violations = []
    if registry:
        for entry in registry.get("entries", []):
            location = "%s:%d" % (registry_path, line_of(registry_path, '"id": "%s"' % entry.get("id")))
            registry_violations.extend(rules.check_registry_entry(entry, {"registry_location": location}))

    total = len(skills)
    bad_ids = {v["id"] for v in violations if v.get("id")}
    compliant = total - len([i for i in identifiers if i in bad_ids])
    rate = (compliant / total) if total else 0.0
    codes = {}
    for item in violations:
        codes[item["code"]] = codes.get(item["code"], 0) + 1
    registry_codes = {}
    for item in registry_violations:
        registry_codes[item["code"]] = registry_codes.get(item["code"], 0) + 1
    return {
        "spec_version": spec.get("version"),
        "violation_codes": codes,
        "violations": sorted(violations, key=lambda v: (v["code"], v["id"])),
        "registry_violation_codes": registry_codes,
        "registry_violations": sorted(registry_violations, key=lambda v: (v["code"], v["id"])),
        "compliance": {
            "total": total,
            "compliant": compliant,
            "violations": len([i for i in identifiers if i in bad_ids]),
            "compliance_rate": rate,
            "by_level": sorted(by_level.items()),
        },
    }, None


def evaluate_or_die(root, spec_path=None):
    report, error = evaluate(root, spec_path)
    if report is None:
        return None, error
    return report, None
