#!/usr/bin/env python3
"""
build_quantifier_table.py
场景量化映射表生成器：把内置种子映射表写成 docs/operations/quantifier-table.json。

四要素纪律（来自 L1 规约 skills/quantify-modifier-policy）：
    每条映射必须同时含 term / domain / quantified / unit / basis，五者缺一即不合格；
    其中 basis 必须能追溯到公开统计、国家标准、行业惯例或本项目既有基线，**缺 basis 一律 exit 1**。

场景优先：同一个词在不同场景量化不同（「大」在日志场景 >=100 MB，在代码库场景 >=1 MB），
因此条目主键是 (term, domain)，禁止只按 term 建全局映射。

确定性：条目按 (term, domain) 排序，JSON 键排序（sort_keys），无时间戳、无随机数 —— 连跑两次第二次必为 changed:false。

Exit Code:
  0 - 写入成功（含 changed:false），或 --check 检测到文件已是最新
  1 - 存在缺 basis 或字段为空的条目，或 --check 检测到文件陈旧、缺失
  2 - 输出目录不可写等 I/O 故障
"""

import os
import sys
import json
import argparse

# 仓库根：本脚本位于 skills/build-quantifier-table/scripts/ 之下
# 合并后布局（2026-09-28）：docs/、plugins/ 随技能池主体迁入 <项目根>/skill-pool/，
# 而 skills/ 仍在 <项目根>。以下先探测技能池根，探测不到时回退旧的「三级上溯」写法。
_POOL_CANDIDATE = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../../skill-pool"))
REPO_ROOT = _POOL_CANDIDATE if os.path.isdir(os.path.join(_POOL_CANDIDATE, "docs", "operations")) else os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../.."))
TABLE_PATH = os.path.join(REPO_ROOT, "docs/operations/quantifier-table.json")

TABLE_VERSION = "1.0.0"

# 四要素字段：全部必须非空，basis 为硬门槛。
REQUIRED_FIELDS = ("term", "domain", "quantified", "unit", "basis")

# 内置种子映射表：覆盖 高/大/快/多/好/严重/频繁/明显/显著/稳定/偏高/偏低/较高/较多/丰富/完善，
# 每个词至少 3 个场景；basis 全部给出可追溯出处（公开分布 / 行业惯例 / 本项目既有基线）。
SEED_ENTRIES = (
    # ---- 高 ----
    {"term": "高", "domain": "成年男性身高", "quantified": ">=180", "unit": "cm",
     "basis": "公开身高分布：中国成年男性平均身高约 170 cm，180 cm 约处前 10% 分位"},
    {"term": "高", "domain": "服务可用性", "quantified": ">=99.9", "unit": "%",
     "basis": "公开 SLA 分级惯例：99.9%（三个九）为高可用基线"},
    {"term": "高", "domain": "接口并发", "quantified": ">=1000", "unit": "QPS",
     "basis": "单机无状态服务压测经验：4 核 8G 实例约 1000 QPS"},
    {"term": "高", "domain": "圈复杂度", "quantified": ">=10", "unit": "复杂度",
     "basis": "McCabe 圈复杂度经验阈值：大于 10 视为高复杂度"},
    # ---- 大 ----
    {"term": "大", "domain": "代码库", "quantified": ">=1", "unit": "MB",
     "basis": "本项目基线：单文件源码超过 1 MB 即超出单屏审阅范围"},
    {"term": "大", "domain": "日志", "quantified": ">=100", "unit": "MB",
     "basis": "本项目日志轮转基线：单文件 100 MB 触发轮转"},
    {"term": "大", "domain": "单表数据量", "quantified": ">=10000000", "unit": "行",
     "basis": "单机关系库经验阈值：千万行级需索引优化或分表"},
    {"term": "大", "domain": "变更集", "quantified": ">=400", "unit": "行",
     "basis": "代码评审经验阈值：单次 diff 超过 400 行评审质量下降"},
    {"term": "大", "domain": "请求体", "quantified": ">=10", "unit": "MB",
     "basis": "常见网关默认请求体上限为 10 MB"},
    # ---- 快 ----
    {"term": "快", "domain": "接口响应", "quantified": "P95<=200", "unit": "ms",
     "basis": "行业常见 SLA 区间：P95 不超过 200 ms 属快"},
    {"term": "快", "domain": "单元测试", "quantified": "<=100", "unit": "ms",
     "basis": "本项目测试基线：单条单测应在 100 ms 内跑完"},
    {"term": "快", "domain": "冷启动", "quantified": "<=500", "unit": "ms",
     "basis": "交互体验阈值：500 ms 内无明显等待感"},
    # ---- 多 ----
    {"term": "多", "domain": "单次检索候选", "quantified": ">=20", "unit": "条",
     "basis": "本项目 --top-k 默认 5 的 4 倍冗余，作为召回安全垫"},
    {"term": "多", "domain": "批量改动文件", "quantified": ">=2", "unit": "个",
     "basis": "本项目 workflows.md 红线口径：批量改动不低于 2 个文件须走完整流程"},
    {"term": "多", "domain": "过程事件", "quantified": ">=20", "unit": "条",
     "basis": "过程折叠基线：同类动作累计不低于 20 条才折叠为 ×N"},
    {"term": "多", "domain": "技能总量", "quantified": ">=141", "unit": "个",
     "basis": "PKG-005 目标编制：既有 126 加新增 15 等于 141"},
    # ---- 好 ----
    {"term": "好", "domain": "代码质量", "quantified": "=0", "unit": "个严重缺陷",
     "basis": "以静态检查 P0 与 P1 缺陷数为 0 作为可核对判据"},
    {"term": "好", "domain": "方案质量", "quantified": ">=3", "unit": "道门禁",
     "basis": "交付方案须通过不少于 3 道既有门禁方为「好」"},
    {"term": "好", "domain": "测试覆盖", "quantified": ">=80", "unit": "%",
     "basis": "行业常见覆盖率门槛：行覆盖不低于 80%"},
    # ---- 严重 ----
    {"term": "严重", "domain": "线上故障", "quantified": ">=1000", "unit": "受影响用户",
     "basis": "故障分级惯例（ITIL 影响面口径）：影响用户不低于 1000 计为严重"},
    {"term": "严重", "domain": "性能退化", "quantified": ">=50", "unit": "%",
     "basis": "回归基线：同场景耗时相对上一版本上涨不低于 50% 判为严重退化"},
    {"term": "严重", "domain": "数据偏差", "quantified": ">=5", "unit": "%",
     "basis": "数据质量惯例：与基准值偏差不低于 5% 判为严重偏差"},
    # ---- 频繁 ----
    {"term": "频繁", "domain": "定时任务", "quantified": ">=60", "unit": "次每小时",
     "basis": "调度惯例：每分钟一次即每小时 60 次，属频繁"},
    {"term": "频繁", "domain": "日志刷屏", "quantified": ">3", "unit": "次",
     "basis": "本项目 AP-07 播报风暴判据：同一文本重复超过 3 次即频繁"},
    {"term": "频繁", "domain": "提交节奏", "quantified": ">=10", "unit": "次每天",
     "basis": "版本控制惯例：单日提交不少于 10 次属高频"},
    # ---- 明显 ----
    {"term": "明显", "domain": "指标变化", "quantified": ">=5", "unit": "%",
     "basis": "统计惯例：变化不低于 5% 才超出常规波动，可称明显"},
    {"term": "明显", "domain": "资源占用差异", "quantified": ">=10", "unit": "%",
     "basis": "监控惯例：资源占用差异不低于 10% 可称明显"},
    {"term": "明显", "domain": "视觉差异", "quantified": ">=20", "unit": "%",
     "basis": "视觉比对惯例：像素差异不低于 20% 可称明显"},
    # ---- 显著 ----
    {"term": "显著", "domain": "A-B 指标差异", "quantified": ">=10", "unit": "%",
     "basis": "实验惯例：组间差异不低于 10% 才称显著"},
    {"term": "显著", "domain": "统计显著性", "quantified": "<=0.05", "unit": "p值",
     "basis": "统计学习惯例：p 值小于 0.05 判为统计显著"},
    {"term": "显著", "domain": "异常增幅", "quantified": ">=3", "unit": "倍",
     "basis": "监控惯例：异常计数增至 3 倍以上判为显著"},
    # ---- 稳定 ----
    {"term": "稳定", "domain": "服务运行", "quantified": ">=30", "unit": "天",
     "basis": "SRE 惯例：连续 30 天无 P1 故障可称稳定"},
    {"term": "稳定", "domain": "基准波动", "quantified": "<=5", "unit": "%",
     "basis": "基准测量惯例：同场景重复测量偏差不超过 5% 视为稳定"},
    {"term": "稳定", "domain": "压测吞吐波动", "quantified": "<=3", "unit": "%",
     "basis": "压测惯例：同场景吞吐波动不超过 3% 视为稳定"},
    # ---- 偏高 ----
    {"term": "偏高", "domain": "接口耗时", "quantified": ">=300", "unit": "ms",
     "basis": "本项目接口耗时监控告警线：不低于 300 ms 记为偏高"},
    {"term": "偏高", "domain": "内存占用", "quantified": ">=80", "unit": "%",
     "basis": "运维惯例：内存占用不低于 80% 记为偏高"},
    {"term": "偏高", "domain": "错误率", "quantified": ">=1", "unit": "%",
     "basis": "监控惯例：错误率不低于 1% 记为偏高"},
    # ---- 偏低 ----
    {"term": "偏低", "domain": "测试覆盖", "quantified": "<=60", "unit": "%",
     "basis": "行业常见覆盖率门槛：行覆盖不高于 60% 记为偏低"},
    {"term": "偏低", "domain": "缓存命中率", "quantified": "<=70", "unit": "%",
     "basis": "缓存惯例：命中率不高于 70% 记为偏低"},
    {"term": "偏低", "domain": "接口吞吐", "quantified": "<=100", "unit": "QPS",
     "basis": "容量惯例：单实例吞吐不高于 100 QPS 记为偏低"},
    # ---- 较高 ----
    {"term": "较高", "domain": "上下文占用", "quantified": ">=60", "unit": "%",
     "basis": "本项目 token 预算纪律：上下文占用不低于 60% 记为较高"},
    {"term": "较高", "domain": "磁盘占用", "quantified": ">=80", "unit": "%",
     "basis": "运维惯例：磁盘占用不低于 80% 记为较高"},
    {"term": "较高", "domain": "数据重复率", "quantified": ">=30", "unit": "%",
     "basis": "数据质量惯例：重复率不低于 30% 记为较高"},
    # ---- 较多 ----
    {"term": "较多", "domain": "并发连接", "quantified": ">=500", "unit": "个",
     "basis": "单机连接数经验阈值：不低于 500 记为较多"},
    {"term": "较多", "domain": "依赖数量", "quantified": ">=10", "unit": "个",
     "basis": "依赖治理惯例：直接依赖不少于 10 个记为较多"},
    {"term": "较多", "domain": "告警数量", "quantified": ">=20", "unit": "条每天",
     "basis": "运维惯例：单日告警不少于 20 条记为较多"},
    # ---- 丰富 ----
    {"term": "丰富", "domain": "知识库案例", "quantified": ">=20", "unit": "条",
     "basis": "本项目知识页面基线：单一主题案例不少于 20 条方可称丰富"},
    {"term": "丰富", "domain": "示例代码", "quantified": ">=5", "unit": "个",
     "basis": "交付惯例：单一能力示例不少于 5 个方可称丰富"},
    {"term": "丰富", "domain": "测试用例", "quantified": ">=30", "unit": "条",
     "basis": "本项目测试基线：单一模块用例不少于 30 条方可称丰富"},
    # ---- 完善 ----
    {"term": "完善", "domain": "技能契约", "quantified": "=6", "unit": "个章节",
     "basis": "本项目契约要求：Overview 起至 Boundaries 共 6 个必备章节全到位方为完善"},
    {"term": "完善", "domain": "需求追溯", "quantified": ">=1", "unit": "条验收",
     "basis": "需求管理惯例：每条需求至少 1 条验收证据方可称完善"},
    {"term": "完善", "domain": "文档章节", "quantified": ">=6", "unit": "节",
     "basis": "文档惯例：单一主题正文不少于 6 节方可称完善"},
)


def validate_entries(entries):
    """自检：逐条校验四要素非空，返回问题清单（空清单即合格）。"""
    problems = []
    seen = set()
    for idx, entry in enumerate(entries, start=1):
        for field in REQUIRED_FIELDS:
            value = entry.get(field)
            if value is None or str(value).strip() == "":
                problems.append({
                    "index": idx,
                    "term": entry.get("term"),
                    "domain": entry.get("domain"),
                    "field": field,
                    "reason": "字段缺失或为空" + ("（缺 basis 的条目一律不合格）" if field == "basis" else ""),
                })
        key = (entry.get("term"), entry.get("domain"))
        if key in seen:
            problems.append({
                "index": idx,
                "term": entry.get("term"),
                "domain": entry.get("domain"),
                "field": "term+domain",
                "reason": "条目主键重复，场景优先要求 (term, domain) 唯一",
            })
        seen.add(key)
    return problems


def build_payload():
    """产出确定性载荷：条目按 (term, domain) 排序，版本号固定。"""
    entries = sorted(SEED_ENTRIES, key=lambda e: (e["term"], e["domain"]))
    return {"table_version": TABLE_VERSION, "entries": entries}


def serialize(payload):
    """序列化口径固定：键排序、两空格缩进、末尾单换行、无时间戳。"""
    return json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def read_existing(path):
    """读取既有文件内容，不存在或不可读返回 None。"""
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return handle.read()
    except (OSError, UnicodeDecodeError):
        return None


def main() -> int:
    parser = argparse.ArgumentParser(description="生成并维护场景量化映射表 quantifier-table.json")
    parser.add_argument("--check", action="store_true", help="只检测文件是否最新，不写入")
    parser.add_argument("--list", action="store_true", help="打印条目数")
    parser.add_argument("--json", action="store_true", help="以 JSON 输出结果")
    args = parser.parse_args()

    payload = build_payload()
    problems = validate_entries(payload["entries"])

    # 自检先于一切写动作：缺 basis 直接 exit 1 并列出问题条目。
    if problems:
        result = {
            "success": False,
            "error": "存在不合格条目：四要素必须全部非空，缺 basis 的条目一律不合格",
            "problems": problems,
            "count": len(payload["entries"]),
        }
        print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
        return 1

    text = serialize(payload)
    existing = read_existing(TABLE_PATH)
    up_to_date = existing == text

    if args.list:
        counts = {}
        for entry in payload["entries"]:
            counts[entry["term"]] = counts.get(entry["term"], 0) + 1
        result = {
            "success": True,
            "path": os.path.relpath(TABLE_PATH, REPO_ROOT),
            "table_version": TABLE_VERSION,
            "count": len(payload["entries"]),
            "terms": len(counts),
            "by_term": dict(sorted(counts.items())),
        }
        if args.json:
            print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
        else:
            print("条目数: {}（词 {} 个，table_version={}）".format(
                result["count"], result["terms"], TABLE_VERSION))
        return 0

    if args.check:
        result = {
            "success": up_to_date,
            "check": True,
            "changed": not up_to_date,
            "path": os.path.relpath(TABLE_PATH, REPO_ROOT),
            "message": "映射表已是最新" if up_to_date else "映射表缺失或已陈旧，需重建",
        }
        print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
        return 0 if up_to_date else 1

    if up_to_date:
        result = {
            "success": True,
            "changed": False,
            "path": os.path.relpath(TABLE_PATH, REPO_ROOT),
            "count": len(payload["entries"]),
            "table_version": TABLE_VERSION,
        }
        print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
        return 0

    try:
        os.makedirs(os.path.dirname(TABLE_PATH), exist_ok=True)
        with open(TABLE_PATH, "w", encoding="utf-8") as handle:
            handle.write(text)
    except OSError as exc:
        print(json.dumps({"success": False, "error": "写入失败: {}".format(exc)},
                         ensure_ascii=False, indent=2, sort_keys=True))
        return 2

    result = {
        "success": True,
        "changed": True,
        "path": os.path.relpath(TABLE_PATH, REPO_ROOT),
        "count": len(payload["entries"]),
        "table_version": TABLE_VERSION,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
