#!/usr/bin/env python3
import os
import sys
import argparse
import json

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
CATALOG_PATH = os.path.join(REPO_ROOT, "docs/operations/skill-catalog.json")

def render_dispatch_mermaid() -> str:
    return """graph TD
    UserMsg(["1. 用户原始自然语言输入"]) --> F1

    subgraph Defense1 ["防线一: 意图检测 (intent-detector L3)"]
        F1["filter-conversational-noise (L1 噪音过滤)"] --> F1_1["strip-whitespace-newlines (L1 空白修整)"]
        F1_1 --> F1_2["detect-action-verb (L2 动作动词判定)"]
        F1_2 --> F1_3["detect-target-entity (L2 目标实体提取)"]
    end

    F1_3 --> F2

    subgraph Defense2 ["防线二: 冗余检测 (redundancy-detector L3)"]
        F2["search-duplicate-rules (L2 相似度比对)"] --> F2_1["prune-bloated-prompts (L1 剪除同义反复)"]
    end

    F2_1 --> F3

    subgraph Defense3 ["防线三: 冲突检测与自愈 (conflict-detector L3)"]
        F3["detect-rule-conflicts (L2 排他逻辑扫描)"] --> F3_1["arbitrate-priority-resolver (L1 优先级仲裁裁决)"]
    end

    F3_1 --> F4

    subgraph Defense4 ["防线四: 索引控制与路由 (skill-index-router L3)"]
        F4["match-intent-keywords (L2 倒排关键词快速初筛)"] --> F4_1["disambiguate-candidates (L2 权重打分与消歧精选)"]
    end

    F4_1 --> F5

    subgraph Defense5 ["防线五: 索引头部契约 (index-header-contract L3)"]
        F5["validate-header-triggers (L2 触发词覆盖度校验)"] --> F5_1["standardize-when-to-use (L1 正反向场景契约审查)"]
    end

    F5_1 --> F6

    subgraph Defense6 ["防线六: 索引主体运作与质量门禁 (index-body & qa-gatekeeper L3)"]
        F6["standardize-workflow-sop (L1 状态机步骤审查)"] --> F6_1["verify-file-exists (L2 物理文件存在验证)"]
        F6_1 --> F6_2["check-python-syntax (L2 Python编译语法校验)"]
        F6_2 --> F6_3["ensure-utf8-encoding (L2 UTF-8编码防乱码断言)"]
        F6_3 --> F6_4["assert-zero-exitcode (L2 命令退出码0硬断言)"]
    end

    F6_4 --> Success(["7. 100% 物理确定性最终交付"])
"""

def render_landscape_mermaid() -> str:
    if not os.path.exists(CATALOG_PATH):
        return "graph TD\n    NoCatalog[Catalog not found]"

    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    skills = data.get("skills", [])
    l1_nodes = [s["id"] for s in skills if s.get("level") == "L1"]
    l2_nodes = [s["id"] for s in skills if s.get("level") == "L2"]
    l3_nodes = [s["id"] for s in skills if s.get("level") == "L3"]
    l4_nodes = [s["id"] for s in skills if s.get("level") == "L4"]

    lines = ["graph TD"]
    lines.append("    subgraph L4_Layer [\"L4 中枢编排层 (Orchestrator)\"]")
    for n in l4_nodes:
        lines.append(f"        {n.replace('-', '_')}[\"{n}\"]")
    lines.append("    end\n")

    lines.append("    subgraph L3_Layer [\"L3 复合流程层 (Composite SOPs)\"]")
    for n in l3_nodes[:6]:
        lines.append(f"        {n.replace('-', '_')}[\"{n}\"]")
    lines.append("    end\n")

    lines.append("    subgraph L2_Layer [\"L2 工序动作层 (Action Tools with Scripts)\"]")
    for n in l2_nodes[:8]:
        lines.append(f"        {n.replace('-', '_')}[\"{n}\"]")
    lines.append("    end\n")

    lines.append("    subgraph L1_Layer [\"L1 原子规约层 (Atomic Primitives)\"]")
    for n in l1_nodes[:8]:
        lines.append(f"        {n.replace('-', '_')}[\"{n}\"]")
    lines.append("    end\n")

    # 关键连接
    lines.append("    dsh_butler --> intent_detector")
    lines.append("    dsh_butler --> skill_index_router")
    lines.append("    dsh_butler --> qa_gatekeeper")
    lines.append("    intent_detector -.-> filter_conversational_noise")
    lines.append("    intent_detector -.-> detect_action_verb")
    lines.append("    qa_gatekeeper -.-> verify_file_exists")
    lines.append("    qa_gatekeeper -.-> assert_zero_exitcode")

    return "\n".join(lines)

def main():
    parser = argparse.ArgumentParser(description="Render governance mermaid diagrams")
    parser.add_argument("--mode", choices=["dispatch", "landscape"], default="dispatch", help="Diagram mode")
    args = parser.parse_args()

    if args.mode == "dispatch":
        print(render_dispatch_mermaid())
    else:
        print(render_landscape_mermaid())

if __name__ == "__main__":
    main()
