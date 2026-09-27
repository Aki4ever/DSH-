#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_gcm_infographic.py
管控机制信息图生成器：从磁盘实况提取真实数字，渲染成零依赖单文件交互 HTML。

设计原则（对齐 visualize-governance-topology 与 format-zoomable-visual）：
  - **物理提取**：所有数字都从 catalog / execution-tree / instance-safety / layer-graph /
    GCM status.json 实读，脚本内不硬编码任何计数，「杜绝凭空想象」；
  - **零外部依赖**：不含 <link>、不含 <script src=>、不含任何 http 外链，
    字体与图形全部内联，离线可开；
  - **可缩放三件套**：产物必须含 data-zoom-in / data-zoom-out / data-zoom-reset；
  - **生活化比喻**：非专业读者 1 分钟内能说出流程走向。

Exit Code:
  0 - 生成成功且自检通过
  1 - 自检未通过（缺控制标识 / 缺标签对 / 出现外链）
  2 - 输入不可读（数据源缺失或不可解析）
"""

import sys

sys.dont_write_bytecode = True

import os
import io
import json
import html
import argparse
import subprocess

EXIT_OK = 0
EXIT_FAIL = 1
EXIT_INPUT = 2

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL_POOL = os.path.abspath(os.path.join(HERE, "..", ".."))
GLOBAL_RULES = os.path.abspath(os.path.join(SKILL_POOL, ".."))
OPS = os.path.join(SKILL_POOL, "docs", "operations")
DEFAULT_OUT = os.path.join(HERE, "gcm-infographic.html")

EXTERNAL_PATTERNS = ["src=\"http", "href=\"http", "url(http", "<script src=", "<link"]
REQUIRED_MARKERS = ["data-zoom-in", "data-zoom-out", "data-zoom-reset"]


def load_json(path):
    if not os.path.isfile(path):
        return None
    try:
        with io.open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, ValueError):
        return None


def read_gcm_status():
    home = os.environ.get("DSH_HOME") or os.path.expanduser("~/.dsh")
    path = os.path.join(home, ".dsh-control", "status.json")
    payload = load_json(path)
    if payload is not None:
        return payload, path
    script = os.path.join(GLOBAL_RULES, "scripts", "control_gates.sh")
    if os.path.isfile(script):
        subprocess.run(["bash", script, "check"], cwd=GLOBAL_RULES,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        payload = load_json(path)
    return payload, path


def read_g0_naming():
    """G0 会话命名是一票否决闸，不计入 G1~G4 的四闸计数。

    内核实现：gates.conf 的 G0_NAMING_ENFORCE=true 时，调用 scripts/check_task_naming.sh --exit，
    非 0 即把 execAllowed 置 false（见 control_gates.sh「G0 会话命名硬门禁联动」段）。
    """
    script = os.path.join(GLOBAL_RULES, "scripts", "check_task_naming.sh")
    if not os.path.isfile(script):
        return {"available": False, "passed": None, "detail": "未找到会话判定脚本"}
    completed = subprocess.run(["bash", script, "--exit"], cwd=GLOBAL_RULES,
                               stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    output = completed.stdout.decode("utf-8", "replace").strip().splitlines()
    detail = output[-1] if output else ""
    return {"available": True, "passed": completed.returncode == 0,
            "detail": detail, "exit_code": completed.returncode}


def collect():
    catalog = load_json(os.path.join(OPS, "skill-catalog.json"))
    if catalog is None:
        return None, "skill-catalog.json 不可读"
    tree = load_json(os.path.join(OPS, "execution-tree.json")) or {}
    safety = load_json(os.path.join(OPS, "instance-safety.json")) or {}
    graph = load_json(os.path.join(OPS, "layer-graph.json")) or {}
    naming = load_json(os.path.join(OPS, "capability-naming.json")) or {}
    retired = load_json(os.path.join(OPS, "retired-names.json")) or {}
    layers = load_json(os.path.join(OPS, "execution-layers.json")) or {}
    gcm, gcm_path = read_gcm_status()
    g0 = read_g0_naming()

    skills = catalog.get("skills", [])
    levels = {}
    for item in skills:
        levels[item.get("level")] = levels.get(item.get("level"), 0) + 1
    cluster_map = tree.get("cluster_map") or {}
    clusters = {}
    for skill_id, cluster in cluster_map.items():
        clusters.setdefault(cluster, []).append(skill_id)

    layer_counts = {}
    for layer in tree.get("layers") or []:
        layer_counts[layer.get("layer")] = layer.get("count", 0)

    data = {
        "total": catalog.get("total_skills", len(skills)),
        "levels": levels,
        "clusters": clusters,
        "layer_counts": layer_counts,
        "probe_types": 4,
        "gates": gcm.get("gates", []) if gcm else [],
        "gcm_percent": gcm.get("percent") if gcm else None,
        "gcm_passed": gcm.get("gatePassed") if gcm else None,
        "gcm_total": gcm.get("gateTotal") if gcm else None,
        "gcm_root": gcm.get("projectRoot") if gcm else GLOBAL_RULES,
        "gcm_generated": gcm.get("generatedAt") if gcm else "未读取到状态文件",
        "gcm_path": gcm_path,
        "edges": len(graph.get("edges") or []),
        "nodes": len(graph.get("nodes") or []) or catalog.get("total_skills", 0),
        "safety": safety.get("counts") or {},
        "verbs": len(naming.get("verb_vocabulary") or []),
        "banned": len(naming.get("banned_words") or []),
        "naming_version": naming.get("version", "—"),
        "retired": len(retired.get("renames") or []),
        "registry_layers": len(layers.get("entries") or []),
        "g0": g0,
    }
    return data, None


CLUSTER_ORDER = ["① 意图与路由", "② 契约与合规", "③ 冲突·冗余·质量", "④ 输出规约",
                 "⑤ 需求与透视", "⑥ 外部纳管", "⑦ 技能引入与演进"]
CLUSTER_ROLE = {
    "① 意图与路由": "听懂你要什么，找到该谁干",
    "② 契约与合规": "检查每个工位的说明书合不合规",
    "③ 冲突·冗余·质量": "查撞车、查重复、查死循环",
    "④ 输出规约": "管说话方式：中文、量化、不啰嗦",
    "⑤ 需求与透视": "从需求图纸出发，并把系统画给你看",
    "⑥ 外部纳管": "与外部世界打交道（Git、需求台账）",
    "⑦ 技能引入与演进": "从外面引进新工位，先审后进",
}

TWELVE_GATES = [
    ("skill-pool validate", "每个工位说明书齐不齐"),
    ("skill-pool consistency", "三处口径对不对得上"),
    ("audit_compliance", "全池契约合规体检"),
    ("verify_tree", "工位树与索引是否四方一致"),
    ("build_layer_graph --check", "依赖图是不是最新的"),
    ("detect_coupling", "有没有偷偷绕过契约互相调用"),
    ("verify_decoupling", "解耦断言过不过"),
    ("verify_instance_safety", "能不能多开、要不要上锁"),
    ("verify_naming --strict", "命名合规率是否 100%"),
    ("render_naming_spec --check", "规范文档与真相源是否漂移"),
    ("verify_mutual_exclusion", "同时处理时真的互斥吗"),
    ("search_skills --eval", "检索命中率是否达标"),
]

PROBES = [
    ("length", "量长度", "字数、条数、段数", "#38bdf8"),
    ("regex", "验样子", "名字长得对不对、格式合不合规", "#a78bfa"),
    ("exitcode", "看仪表", "脚本跑完是 0 还是非 0", "#34d399"),
    ("file", "查实体", "文件真在磁盘上、字节数大于 0", "#fbbf24"),
]


def esc(text):
    return html.escape(str(text), quote=True)


def build_html(data):
    clusters = data["clusters"]
    levels = data["levels"]

    pyramid_rows = []
    layer_meta = [("L1", "零件级 · 单条硬规矩", "#38bdf8"),
                  ("L2", "工序级 · 干一件具体活", "#a78bfa"),
                  ("L3", "车间级 · 把几道工序串成门禁", "#f472b6"),
                  ("L4", "厂长级 · 唯一中枢", "#fbbf24")]
    for level, note, color in layer_meta:
        count = levels.get(level, 0)
        width = max(8, int(count / max(1, data["total"]) * 100))
        pyramid_rows.append(
            '<div class="pyr-row">'
            '<div class="pyr-label"><b>%s</b><span>%s</span></div>'
            '<div class="pyr-bar"><i style="width:%d%%;background:%s"></i></div>'
            '<div class="pyr-count">%d</div>'
            '</div>' % (esc(level), esc(note), width, color, count))

    cluster_cards = []
    for index, name in enumerate(CLUSTER_ORDER):
        members = sorted(clusters.get(name, []))
        chips = "".join('<span class="chip">%s</span>' % esc(m) for m in members)
        cluster_cards.append(
            '<div class="cluster">'
            '<div class="cluster-head"><span class="cluster-no">%d</span>'
            '<div><b>%s</b><em>%s</em></div><span class="cluster-count">%d 个车间</span></div>'
            '<div class="chips">%s</div>'
            '</div>' % (index + 1, esc(name), esc(CLUSTER_ROLE.get(name, "")), len(members), chips))

    gate_rows = []
    gate_name_cn = {"naming": "会话命名", "init": "项目初始化", "structure": "工程结构化",
                    "sync": "需求文档同步", "redundancy": "冗余检测"}
    g0 = data.get("g0") or {}
    if g0.get("available"):
        g0_ok = bool(g0.get("passed"))
        gate_rows.append(
            '<tr><td class="g-id veto">G0</td><td>会话命名 <span class="veto-tag">一票否决</span></td>'
            '<td class="g-state %s">%s</td><td class="g-detail">%s</td></tr>'
            % ("ok" if g0_ok else "bad", "通过" if g0_ok else "阻断",
               esc(g0.get("detail", ""))))
    for index, gate in enumerate(data["gates"], start=1):
        ok = gate.get("status") == "pass"
        gate_rows.append(
            '<tr><td class="g-id">G%d</td><td>%s</td>'
            '<td class="g-state %s">%s</td><td class="g-detail">%s</td></tr>'
            % (index, esc(gate_name_cn.get(gate.get("id"), gate.get("name", ""))),
               "ok" if ok else "bad", "通过" if ok else "待修",
               esc(gate.get("detail", ""))))

    probe_cards = "".join(
        '<div class="probe" style="border-color:%s"><code>%s</code><b>%s</b><span>%s</span></div>'
        % (color, esc(code), esc(title), esc(desc)) for code, title, desc, color in PROBES)

    gate_cards = "".join(
        '<div class="gate12"><span class="gate12-no">%02d</span><code>%s</code><em>%s</em></div>'
        % (index + 1, esc(cmd), esc(purpose)) for index, (cmd, purpose) in enumerate(TWELVE_GATES))

    safety = data["safety"]
    safety_bits = " · ".join("%s %s" % (esc(k), v) for k, v in sorted(safety.items())) or "—"

    return TEMPLATE.replace("@@TOTAL@@", str(data["total"])) \
        .replace("@@L1@@", str(levels.get("L1", 0))) \
        .replace("@@L2@@", str(levels.get("L2", 0))) \
        .replace("@@L3@@", str(levels.get("L3", 0))) \
        .replace("@@L4@@", str(levels.get("L4", 0))) \
        .replace("@@CLUSTERS@@", str(len(clusters))) \
        .replace("@@L3SUM@@", str(sum(len(v) for v in clusters.values()))) \
        .replace("@@EDGES@@", str(data["edges"])) \
        .replace("@@SKILLLAYER@@", str(data["layer_counts"].get("skill", data["total"]))) \
        .replace("@@CLILAYER@@", str(data["layer_counts"].get("cli", 0))) \
        .replace("@@AGENTLAYER@@", str(data["layer_counts"].get("agent", 0))) \
        .replace("@@SAFETY@@", esc(safety_bits)) \
        .replace("@@VERBS@@", str(data["verbs"])) \
        .replace("@@BANNED@@", str(data["banned"])) \
        .replace("@@NAMINGVER@@", esc(data["naming_version"])) \
        .replace("@@RETIRED@@", str(data["retired"])) \
        .replace("@@GCM_PASSED@@", str(data["gcm_passed"] if data["gcm_passed"] is not None else "—")) \
        .replace("@@GCM_TOTAL@@", str(data["gcm_total"] if data["gcm_total"] is not None else "—")) \
        .replace("@@GCM_PERCENT@@", str(data["gcm_percent"] if data["gcm_percent"] is not None else 0)) \
        .replace("@@GCM_ROOT@@", esc(data["gcm_root"])) \
        .replace("@@GCM_TIME@@", esc(data["gcm_generated"])) \
        .replace("@@GCM_PATH@@", esc(data["gcm_path"])) \
        .replace("@@PYRAMID@@", "".join(pyramid_rows)) \
        .replace("@@CLUSTERCARDS@@", "".join(cluster_cards)) \
        .replace("@@GATEROWS@@", "".join(gate_rows)) \
        .replace("@@PROBECARDS@@", probe_cards) \
        .replace("@@GATE12@@", gate_cards)


TEMPLATE = r"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>管控机制运作信息图 · 一图看懂</title>
<style>
  :root{
    --bg:#0b1220; --bg2:#121c31; --card:#16223a; --line:#24334f;
    --fg:#e8eefc; --dim:#93a4c4; --ok:#34d399; --bad:#fb7185; --warn:#fbbf24;
    --a1:#38bdf8; --a2:#a78bfa; --a3:#f472b6; --a4:#fbbf24;
  }
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:var(--bg);color:var(--fg);
    font-family:"PingFang SC","Hiragino Sans GB","Microsoft YaHei",system-ui,-apple-system,sans-serif;
    -webkit-font-smoothing:antialiased}
  body{overflow:hidden}
  #stage{position:fixed;inset:0;overflow:hidden;background:
    radial-gradient(1200px 700px at 18% -8%,#1b2b4a 0%,transparent 60%),
    radial-gradient(900px 600px at 92% 6%,#26204a 0%,transparent 58%),var(--bg)}
  #poster{position:absolute;top:0;left:0;width:1640px;transform-origin:0 0;
    padding:34px 40px 48px;cursor:grab}
  #poster.dragging{cursor:grabbing}
  .toolbar{position:fixed;right:18px;top:18px;z-index:50;display:flex;gap:8px;
    background:rgba(18,28,49,.92);border:1px solid var(--line);border-radius:14px;
    padding:8px;backdrop-filter:blur(10px)}
  .toolbar button{width:42px;height:38px;border-radius:10px;border:1px solid var(--line);
    background:#1d2b46;color:var(--fg);font-size:17px;font-weight:700;cursor:pointer;
    display:flex;align-items:center;justify-content:center;transition:.15s}
  .toolbar button:hover{background:#27395c;transform:translateY(-1px)}
  .toolbar .lvl{min-width:62px;font-size:12px;color:var(--dim);font-weight:600}
  .hintbar{position:fixed;left:18px;bottom:16px;z-index:50;font-size:12px;color:var(--dim);
    background:rgba(18,28,49,.9);border:1px solid var(--line);border-radius:10px;padding:8px 12px}
  header.top{display:flex;align-items:flex-end;justify-content:space-between;
    border-bottom:2px solid var(--line);padding-bottom:16px;margin-bottom:22px}
  header.top h1{margin:0;font-size:34px;letter-spacing:.5px}
  header.top .sub{color:var(--dim);font-size:14px;margin-top:8px;line-height:1.7}
  .badge{background:linear-gradient(135deg,#1d4ed8,#0ea5e9);border-radius:12px;
    padding:10px 16px;font-size:13px;font-weight:700;white-space:nowrap}
  .analogy{background:linear-gradient(135deg,#132241,#1a2b4d);border:1px solid var(--line);
    border-left:5px solid var(--a1);border-radius:14px;padding:18px 22px;margin-bottom:22px;
    font-size:16px;line-height:1.95}
  .analogy b{color:var(--a1)}
  .analogy .flow{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;align-items:center}
  .analogy .flow span{background:#1e2f4f;border:1px solid var(--line);border-radius:9px;
    padding:7px 12px;font-size:13px}
  .analogy .flow i{color:var(--a2);font-style:normal}
  h2.sec{font-size:19px;margin:26px 0 14px;padding-left:11px;border-left:4px solid var(--a2)}
  h2.sec small{color:var(--dim);font-weight:400;font-size:13px;margin-left:8px}
  .grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
  .mech{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;
    position:relative;overflow:hidden}
  .mech:before{content:"";position:absolute;left:0;top:0;width:100%;height:3px;background:var(--ac)}
  .mech .code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;
    color:var(--ac);font-weight:700}
  .mech h3{margin:8px 0 8px;font-size:16px}
  .mech p{margin:0;color:var(--dim);font-size:13px;line-height:1.75}
  .mech .impl{display:block;margin-top:10px;font-family:ui-monospace,Menlo,monospace;
    font-size:11.5px;color:#7dd3fc;word-break:break-all}
  .cols{display:grid;grid-template-columns:1.02fr 1fr;gap:18px;align-items:start}
  .panel{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px}
  .pyr-row{display:flex;align-items:center;gap:12px;margin-bottom:11px}
  .pyr-label{width:210px;display:flex;flex-direction:column}
  .pyr-label b{font-size:15px}
  .pyr-label span{font-size:11.5px;color:var(--dim)}
  .pyr-bar{flex:1;height:26px;background:#101a2e;border-radius:8px;overflow:hidden;
    border:1px solid var(--line)}
  .pyr-bar i{display:block;height:100%;border-radius:7px}
  .pyr-count{width:52px;text-align:right;font-weight:800;font-size:17px;font-family:ui-monospace,monospace}
  table.gcm{width:100%;border-collapse:collapse;font-size:13px}
  table.gcm th{color:var(--dim);font-weight:600;text-align:left;padding:8px 6px;
    border-bottom:1px solid var(--line);font-size:12px}
  table.gcm td{padding:9px 6px;border-bottom:1px solid #1c2942;vertical-align:top}
  .g-id{font-family:ui-monospace,monospace;font-weight:700;color:var(--a1);width:44px}
  .g-state{font-weight:700;width:62px}
  .g-state.ok{color:var(--ok)} .g-state.bad{color:var(--bad)}
  .g-id.veto{color:var(--warn)}
  .veto-tag{background:#3b2a06;color:var(--warn);border-radius:5px;padding:1px 5px;
    font-size:10.5px;margin-left:4px}
  .g-detail{color:var(--dim);font-size:12px;line-height:1.6}
  .probes{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
  .probe{background:var(--card);border:1px solid var(--line);border-left:4px solid;
    border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:6px}
  .probe code{font-family:ui-monospace,monospace;font-size:12px;color:#7dd3fc}
  .probe b{font-size:15px}
  .probe span{color:var(--dim);font-size:12.5px;line-height:1.65}
  .cluster{background:var(--card);border:1px solid var(--line);border-radius:13px;
    padding:14px;margin-bottom:11px}
  .cluster-head{display:flex;align-items:center;gap:10px;margin-bottom:9px}
  .cluster-no{width:26px;height:26px;border-radius:8px;background:#1e3a8a;color:#dbeafe;
    display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px}
  .cluster-head b{font-size:15px;display:block}
  .cluster-head em{font-style:normal;color:var(--dim);font-size:12px}
  .cluster-count{margin-left:auto;font-size:12px;color:var(--a4);font-weight:700;white-space:nowrap}
  .chips{display:flex;flex-wrap:wrap;gap:6px}
  .chip{background:#101c33;border:1px solid #223350;border-radius:7px;padding:3px 8px;
    font-size:11.5px;color:#b9c8e6;font-family:ui-monospace,monospace}
  .gate12{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
  .gate12 .gate12-no{font-family:ui-monospace,monospace;color:var(--a3);font-size:11.5px}
  .gate12>div{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px}
  .gate12 code{display:block;font-family:ui-monospace,monospace;font-size:12px;
    color:#7dd3fc;margin:5px 0 6px;word-break:break-all}
  .gate12 em{font-style:normal;color:var(--dim);font-size:12.5px;line-height:1.6}
  .kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-top:4px}
  .kpi{background:linear-gradient(160deg,#16233c,#111a2c);border:1px solid var(--line);
    border-radius:13px;padding:14px;text-align:center}
  .kpi b{display:block;font-size:26px;font-family:ui-monospace,monospace;color:var(--a1)}
  .kpi span{display:block;color:var(--dim);font-size:12px;margin-top:6px;line-height:1.55}
  .trust{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
  .trust>div{background:var(--card);border:1px solid var(--line);border-radius:13px;padding:15px}
  .trust h4{margin:0 0 8px;font-size:14.5px;color:var(--ok)}
  .trust p{margin:0;color:var(--dim);font-size:12.5px;line-height:1.75}
  footer{margin-top:26px;padding-top:14px;border-top:1px solid var(--line);
    color:var(--dim);font-size:12px;line-height:1.9}
</style>
</head>
<body>
<div class="toolbar">
  <button data-zoom-in title="放大">＋</button>
  <button data-zoom-out title="缩小">－</button>
  <button data-zoom-reset title="复位到原始大小">⟲</button>
  <button class="lvl" id="zoomLevel" title="当前缩放">100%</button>
</div>
<div class="hintbar">滚轮缩放 · 按住拖动平移 · ⟲ 一键复位</div>

<div id="stage">
<div id="poster">

<header class="top">
  <div>
    <h1>管控机制运作信息图</h1>
    <div class="sub">
      机制正式名称：<b>管控机制</b>（英文代号 <code>GCM</code>，Global Constraint Mechanism）<br>
      落地根目录：@@GCM_ROOT@@　·　能力池：@@TOTAL@@ 个执行层　·　状态取自磁盘实况，非任何自述
    </div>
  </div>
  <div class="badge">G1~G4 累积门禁 @@GCM_PASSED@@/@@GCM_TOTAL@@ 通过（@@GCM_PERCENT@@%）· G0 一票否决另计</div>
</header>

<div class="analogy">
  <b>一句话看懂：</b>这是一座管得很严的工厂 —— 进门前先挂牌，车间里有一把必须逐级往上爬的<b>物理锁梯</b>，
  出厂前要过<b>一道一票否决闸 + 四道累积质检闸</b>，每一道闸都靠<b>拿尺子量产品</b>（读磁盘实况）来决定放不放行，
  <b>从不听工人自己说“我做完了”</b>。
  <div class="flow">
    <span>① 门口挂牌<br><small>会话命名</small></span><i>→</i>
    <span>② 爬锁梯<br><small>LOCK-0 → LOCK-4</small></span><i>→</i>
    <span>③ 过质检闸<br><small>G0 否决 · G1→G4 累积</small></span><i>→</i>
    <span>④ 分给合适的车间<br><small>7 个集群 · @@TOTAL@@ 个工位</small></span><i>→</i>
    <span>⑤ 每个动作挂量具<br><small>四类探针</small></span><i>→</i>
    <span>⑥ 过十二道出厂检验</span><i>→</i>
    <span>⑦ 交付 + 全程留痕</span>
  </div>
</div>

<h2 class="sec">一、机制的四层骨架 <small>每层只干一件事 —— 一条流程 = 一个判定点 = 一组可量化证据</small></h2>
<div class="grid4">
  <div class="mech" style="--ac:#38bdf8">
    <span class="code">GCM-INJECT</span><h3>注入层</h3>
    <p>每次开工自动送进来的「红线 + 指针」。只放必须当场知道的东西，细则一律按需读取。</p>
    <span class="impl">AGENTS.md（全局 + 项目）</span>
  </div>
  <div class="mech" style="--ac:#a78bfa">
    <span class="code">GCM-STATE</span><h3>状态层</h3>
    <p>把「现在到哪一步了」从磁盘事实算出来，写成一份状态文件。<b>绝不采信任何自我宣称</b>，所以跨会话不会漂移。</p>
    <span class="impl">scripts/control_gates.sh → status.json</span>
  </div>
  <div class="mech" style="--ac:#f472b6">
    <span class="code">GCM-GATE</span><h3>判定层</h3>
    <p>逐道判定 + 双检（冗余、冲突）。门禁是累积的：必须按顺序全部通过，才算「可以动手」。</p>
    <span class="impl">G0~G4 · LOCK-0~4 物理锁 · 十二道出厂检验</span>
  </div>
  <div class="mech" style="--ac:#fbbf24">
    <span class="code">GCM-GUARD</span><h3>拦截层</h3>
    <p>没过门禁就<b>拒绝改动型调用</b>，只读操作照放。想绕开只能显式设环境变量，绕不开就绕不过。</p>
    <span class="impl">ai-control/plugin/index.mjs</span>
  </div>
</div>

<h2 class="sec">二、物理锁梯 + 质检闸 <small>锁梯防跳步，质检闸防“嘴上说做完了”</small></h2>
<div class="cols">
  <div class="panel">
    <h3 style="margin:0 0 12px;font-size:15px">底层物理锁阶梯（单会话内单向严格工序链）</h3>
    <table class="gcm">
      <tr><th style="width:86px">阶梯</th><th>阶段名</th><th style="width:150px">此刻状态</th></tr>
      <tr><td class="g-id">LOCK-0</td><td>初始探境</td><td class="g-detail">刚开工，什么都没定</td></tr>
      <tr><td class="g-id">LOCK-1</td><td>探境定标达成</td><td class="g-detail">目标已锁定，待筹策</td></tr>
      <tr><td class="g-id">LOCK-2</td><td>筹策分解达成</td><td class="g-detail">拆解完毕，攻坚中</td></tr>
      <tr><td class="g-id">LOCK-3</td><td>质检验证达成</td><td class="g-detail">验证通过，待归卷</td></tr>
      <tr><td class="g-id">LOCK-4</td><td>归卷结项达成</td><td class="g-detail">全闭环，可以收工</td></tr>
    </table>
    <p style="color:var(--dim);font-size:12.5px;line-height:1.8;margin:12px 0 0">
      任何跳步的工具调用会被底层物理拦截拒止。爬梯子是「单会话内的一次任务」的进度，
      和下面五道闸不是一回事：<b>闸是能力门槛，梯是任务进度</b>。
    </p>
  </div>
  <div class="panel">
    <h3 style="margin:0 0 12px;font-size:15px">G0 一票否决 + G1~G4 累积门禁（实时实况）</h3>
    <table class="gcm">
      <tr><th>闸</th><th>查什么</th><th>状态</th><th>量到的实数</th></tr>
      @@GATEROWS@@
    </table>
    <p style="color:var(--dim);font-size:12.5px;line-height:1.8;margin:12px 0 0">
      状态时间：@@GCM_TIME@@　·　口径：<b>G0 会话命名是一票否决</b>（未过则 execAllowed 直接置 false），
      <b>G1~G4 是累积闸</b>（脚本内核 <code>GATE_IDS=(init structure sync redundancy)</code>，必须依次全过）。
      调参入口 <code>ai-control/config/gates.conf</code>，改完即时生效。
    </p>
  </div>
</div>

<h2 class="sec">三、能力金字塔 <small>厂长 1 个 · 车间 @@L3SUM@@ 个 · 工位 @@TOTAL@@ 个</small></h2>
<div class="cols">
  <div class="panel">
    @@PYRAMID@@
    <p style="color:var(--dim);font-size:12.5px;line-height:1.8;margin:14px 0 0">
      <b>L4</b> 只有一个 —— <code>dsh-butler</code>，全池唯一中枢，改名会破坏全部上位引用，因此固定不动。<br>
      <b>L3</b> 是「门禁 / 总控」，把几道工序串成一道不可跳步的闸；<b>L2</b> 是干具体活的工序；
      <b>L1</b> 是单条硬规矩，只出定义不做检测。
    </p>
  </div>
  <div class="panel">
    <h3 style="margin:0 0 12px;font-size:15px">七个集群（车间的分工）</h3>
    @@CLUSTERCARDS@@
  </div>
</div>

<h2 class="sec">四、每个动作必须挂一把量具 <small>挂不上量具的动作，不准上流水线</small></h2>
<div class="probes">
  @@PROBECARDS@@
</div>
<p style="color:var(--dim);font-size:13px;line-height:1.85;margin:14px 0 0">
  这就是「粒度递归分裂门禁」：任何管控步骤若不能绑定上面四类物理探针之一，一律阻断实施并强制向下再拆一层。
  写不出可测量具的口号，进不了流程 —— 这是整套机制「可验证」的地基。
</p>

<h2 class="sec">五、出厂检验：十二道门禁 <small>全绿才放行，任一道非 0 即阻断</small></h2>
<div class="gate12">@@GATE12@@</div>

<h2 class="sec">六、实时家底 <small>全部为磁盘实测值</small></h2>
<div class="kpis">
  <div class="kpi"><b>@@TOTAL@@</b><span>执行层工位总数<br>skill @@SKILLLAYER@@ · cli @@CLILAYER@@ · agent @@AGENTLAYER@@</span></div>
  <div class="kpi"><b>@@CLUSTERS@@</b><span>集群（车间）<br>@@L3SUM@@ 个 L3 总控</span></div>
  <div class="kpi"><b>@@EDGES@@</b><span>层间依赖边<br>只经契约通信、单向无环</span></div>
  <div class="kpi"><b>@@VERBS@@</b><span>命名动词表 v@@NAMINGVER@@<br>禁词 @@BANNED@@ · 已改名 @@RETIRED@@</span></div>
  <div class="kpi"><b>@@GCM_PERCENT@@%</b><span>G1~G4 累积门禁<br>@@GCM_PASSED@@/@@GCM_TOTAL@@ · G0 另计否决</span></div>
</div>
<p style="color:var(--dim);font-size:12.5px;line-height:1.8;margin:14px 0 0">
  实例安全分档（能不能多开、要不要上锁）：@@SAFETY@@
</p>

<h2 class="sec">七、为什么这套机制可信 <small>四条可当场验证的理由</small></h2>
<div class="trust">
  <div>
    <h4>① 状态来自磁盘，不来自嘴</h4>
    <p>门禁状态由脚本读磁盘算出来写进 status.json。模型说「已完成」不算数，文件在不在、字节数是不是 0、退出码是不是 0 才算数。</p>
  </div>
  <div>
    <h4>② 没有判定点的条款会被降级</h4>
    <p>一条流程如果既没有脚本判定、也没有独立检查命令，就从「必须」降级为「建议」。机制里不留只会写在纸上的规矩。</p>
  </div>
  <div>
    <h4>③ 改名要同步六处，漏一处就报错</h4>
    <p>目录名、编目 id、契约头、组装边、树与索引、文档与登记表 —— 六处必须一次改完。改完扫悬空引用，必须为 0。</p>
  </div>
  <div>
    <h4>④ 检测器本身要能被证伪</h4>
    <p>并发互斥必须同时给出「不锁时会撞车」的对照段；旧名扫描必须能在人为注入一行后立刻转红。一个永远说“通过”的检测器不算证据。</p>
  </div>
</div>

<footer>
  数据来源：skill-catalog.json · execution-tree.json · layer-graph.json · instance-safety.json ·
  capability-naming.json · retired-names.json · GCM status.json（@@GCM_PATH@@）<br>
  本图由 <code>docs/visuals/build_gcm_infographic.py</code> 从上述磁盘实况提取数字后渲染，零外部依赖、可离线打开。<br>
  缩放：滚轮 或 右上角 ＋ / －；复位：⟲。
</footer>

</div>
</div>

<script>
(function () {
  var scale = 1, min = 0.35, max = 3.2;
  var tx = 0, ty = 0, dragging = false, lx = 0, ly = 0;
  var poster = document.getElementById('poster');
  var stage = document.getElementById('stage');
  var level = document.getElementById('zoomLevel');
  var lw = 1640;

  function apply() {
    poster.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
    level.textContent = Math.round(scale * 100) + '%';
  }
  function fit() {
    var avail = stage.clientWidth - 80;
    scale = Math.min(1, avail / lw);
    if (scale < min) { scale = min; }
    tx = Math.max(0, (stage.clientWidth - lw * scale) / 2);
    ty = 0;
    apply();
  }
  function zoom(factor, cx, cy) {
    var next = Math.min(max, Math.max(min, scale * factor));
    if (next === scale) { return; }
    var rect = stage.getBoundingClientRect();
    var px = (cx === undefined ? rect.width / 2 : cx - rect.left) - tx;
    var py = (cy === undefined ? rect.height / 2 : cy - rect.top) - ty;
    tx -= px * (next / scale - 1);
    ty -= py * (next / scale - 1);
    scale = next;
    apply();
  }

  document.querySelector('[data-zoom-in]').addEventListener('click', function () { zoom(1.2); });
  document.querySelector('[data-zoom-out]').addEventListener('click', function () { zoom(1 / 1.2); });
  document.querySelector('[data-zoom-reset]').addEventListener('click', function () { fit(); });

  stage.addEventListener('wheel', function (event) {
    event.preventDefault();
    zoom(event.deltaY < 0 ? 1.12 : 1 / 1.12, event.clientX, event.clientY);
  }, { passive: false });

  stage.addEventListener('mousedown', function (event) {
    dragging = true; lx = event.clientX; ly = event.clientY;
    poster.classList.add('dragging');
  });
  window.addEventListener('mousemove', function (event) {
    if (!dragging) { return; }
    tx += event.clientX - lx; ty += event.clientY - ly;
    lx = event.clientX; ly = event.clientY;
    apply();
  });
  window.addEventListener('mouseup', function () {
    dragging = false; poster.classList.remove('dragging');
  });
  window.addEventListener('resize', fit);
  window.addEventListener('keydown', function (event) {
    if (event.key === '+' || event.key === '=') { zoom(1.2); }
    if (event.key === '-') { zoom(1 / 1.2); }
    if (event.key === '0') { fit(); }
  });
  document.addEventListener('DOMContentLoaded', fit);
  fit();
})();
</script>
</body>
</html>
"""


def self_check(path):
    text = io.open(path, "r", encoding="utf-8").read()
    checks = []
    checks.append(("file_non_empty", os.path.getsize(path) > 0, "%d 字节" % os.path.getsize(path)))
    for marker in REQUIRED_MARKERS:
        checks.append(("marker:%s" % marker, marker in text, "命中" if marker in text else "缺失"))
    for tag in ("<!DOCTYPE html", "<html", "</html>", "<body", "</body>"):
        checks.append(("tag:%s" % tag, tag in text, "命中" if tag in text else "缺失"))
    hits = [pattern for pattern in EXTERNAL_PATTERNS if pattern in text]
    checks.append(("no_external_resource", not hits, "命中" if not hits else "出现外链模式 %s" % hits))
    return checks


def main(argv):
    parser = argparse.ArgumentParser(description="管控机制信息图生成器（零依赖单文件 HTML）")
    parser.add_argument("--out", default=DEFAULT_OUT, help="输出 HTML 路径")
    parser.add_argument("--json", action="store_true", help="兼容开关；脚本恒输出 JSON")
    args = parser.parse_args(argv)

    data, error = collect()
    if data is None:
        print(json.dumps({"error": "input_unreadable", "detail": error}, ensure_ascii=False, indent=2))
        return EXIT_INPUT

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    io.open(args.out, "w", encoding="utf-8").write(build_html(data))
    checks = self_check(args.out)
    passed = all(item[1] for item in checks)
    payload = {
        "success": passed,
        "output": args.out,
        "bytes": os.path.getsize(args.out),
        "sources": {
            "catalog_total": data["total"],
            "levels": data["levels"],
            "clusters": len(data["clusters"]),
            "edges": data["edges"],
            "instance_safety": data["safety"],
            "gcm_status": data["gcm_path"],
            "gcm_passed": data["gcm_passed"],
            "gcm_total": data["gcm_total"],
        },
        "checks": [{"name": n, "pass": p, "detail": d} for n, p, d in checks],
        "verdict": "infographic_ready" if passed else "infographic_invalid",
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return EXIT_OK if passed else EXIT_FAIL


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
