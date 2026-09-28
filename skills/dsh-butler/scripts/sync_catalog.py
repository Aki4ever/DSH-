#!/usr/bin/env python3
"""
sync_catalog.py
由 DSH 管家统一调度维护的全局 Skill Catalog 同步与更新脚本。
支持 L1~L4 四级能力模型与积木式加法 (Composition) 拓扑映射。
"""

import os
import sys
import json
import re
from datetime import datetime

# 合并后布局（2026-09-28）：docs/、plugins/ 随技能池主体迁入 <项目根>/skill-pool/，
# 而 skills/ 仍在 <项目根>。以下先探测技能池根，探测不到时回退旧的「三级上溯」写法。
_POOL_CANDIDATE = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../skill-pool"))
REPO_ROOT = _POOL_CANDIDATE if os.path.isdir(os.path.join(_POOL_CANDIDATE, "docs", "operations")) else os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
_SKILLS_CANDIDATE = os.path.join(os.path.dirname(REPO_ROOT), "skills")
SKILLS_ROOT = _SKILLS_CANDIDATE if os.path.isdir(_SKILLS_CANDIDATE) else os.path.join(REPO_ROOT, "skills")
SKILLS_DIR = SKILLS_ROOT
CATALOG_JSON_PATH = os.path.join(REPO_ROOT, "docs/operations/skill-catalog.json")
CATALOG_MD_PATH = os.path.join(REPO_ROOT, "docs/operations/skills-catalog.md")

# 类别定义与默认等级
CATEGORY_DEFAULTS = {
    # L1 原子规约级 (Atomic)
    "output-chinese-only": ("L1", "原子规约-语言基元", ["纯中文", "中文输出", "不要英文", "汉字"]),
    "limit-words-under-10": ("L1", "原子规约-长度基元", ["10字内", "不超过10字", "简短", "极短"]),
    "markdown-bold-only": ("L1", "原子规约-排版基元", ["全黑体", "全加粗", "Markdown粗体"]),
    "strip-markdown-fence": ("L1", "原子规约-结构基元", ["去代码块", "去围栏", "纯净输出", "裸文本"]),
    "no-conversational-filler": ("L1", "原子规约-风格基元", ["不要废话", "零寒暄", "免开场白", "直接说"]),
    "filter-conversational-noise": ("L1", "原子规约-噪音过滤", ["过滤噪音", "去口癖", "过滤语气词", "去套话"]),
    "prune-bloated-prompts": ("L1", "原子规约-防膨胀", ["防膨胀", "裁剪提示词", "去同义反复", "机制简洁"]),
    "arbitrate-priority-resolver": ("L1", "原子规约-仲裁准则", ["优先级仲裁", "冲突裁决", "裁定优先级", "仲裁法则"]),
    "standardize-when-to-use": ("L1", "原子规约-场景规范", ["场景规范", "触发场景", "When to Use", "正反向场景"]),
    "standardize-workflow-sop": ("L1", "原子规约-SOP规范", ["SOP规范", "状态机流程", "运作SOP", "执行步骤"]),
    "strip-whitespace-newlines": ("L1", "原子规约-排版基元", ["去空白", "折叠空行", "剥离空格", "首尾修整"]),
    "format-visual-inspection": ("L1", "原子规约-可视化规约", ["可视化规约", "强制图表", "拒绝纯文本", "图表输出"]),
    "format-status-block": ("L1", "原子规约-状态规范", ["当前状态", "状态标记", "状态输出", "阶段总结"]),
    "conditional-deliverable-router": ("L1", "原子规约-分支路由", ["条件分支", "产物路由", "核心结论", "零空地址"]),
    "high-relevance-notes-only": ("L1", "原子规约-说明过滤", ["重要说明", "高相关说明", "操作指南", "去套话"]),
    "format-iconized-tail": ("L1", "原子规约-图标尾部", ["尾部图标", "特异化图标", "集中输出", "Emoji图标"]),
    "enforce-contract-completeness": ("L1", "原子规约-契约完整性", ["契约完整", "头体规范", "场景规范", "必须SOP"]),
    "fastpath-dispatch-guide": ("L1", "原子规约-快捷路由指引", ["快捷路由指引", "直调卡片", "秒级触达", "路由规范"]),
    "concise-focused-output": ("L1", "原子规约-简短聚焦", ["简短输出", "聚焦重点", "拒绝冗长", "精简表达"]),
    "plain-analogy-explanation": ("L1", "原子规约-通俗比喻", ["通俗易懂", "生活比喻", "常识解释", "静默技术细节"]),
    "enforce-atomic-granularity": ("L1", "原子规约-粒度物理化", ["粒度原子化", "探针绑定", "不可断言不得实施", "递归分裂"]),
    "fastlane-redline-policy": ("L1", "原子规约-快车道红线", ["红线规约", "不可逆动作", "红线优先", "强制完整流程"]),
    "format-zoomable-visual": ("L1", "原子规约-可缩放可视化", ["可缩放", "点击放大", "复位交互", "拒绝静态图"]),
    "lazy-load-policy": ("L1", "原子规约-按需加载", ["按需加载", "未命中不加载", "禁止通配", "懒加载"]),
    "snippet-only-recall": ("L1", "原子规约-片段回灌", ["只回灌片段", "不回灌全文", "检索返回面", "省token"]),
    "token-budget-policy": ("L1", "原子规约-token预算", ["token预算", "上下文预算", "裁剪顺序", "预算优先级"]),
    "milestone-only-progress": ("L1", "原子规约-里程碑输出", ["里程碑", "阶段目标", "只报阶段", "微操作折叠"]),

    "chinese-end-to-end": ("L1", "原子规约-全流程中文", ["全流程中文", "中文回复", "技术标识符释义", "缩写给全称"]),
    "tree-update-mandatory": ("L1", "原子规约-树同步强制", ["改能力必改树", "同步索引", "树及时更新", "禁止手写树"]),
    "anti-pattern-policy": ("L1", "原子规约-反例清单", ["反例层", "禁止事件", "死循环", "无反馈", "不允许发生"]),
    "prefer-hot-reload-policy": ("L1", "原子规约-不重启优先", ["能不重启就不重启", "热更优先", "重启证据", "不可热更边界"]),
    "quantify-modifier-policy": ("L1", "原子规约-程度词量化", ["程度词量化", "高大量化", "四要素", "场景量化", "不可量化声明"]),
    "concretize-ambiguity-policy": ("L1", "原子规约-含糊具像化", ["含糊具像化", "具像化", "避免含糊", "范围指代时序"]),
    "one-shot-resolution-policy": ("L1", "原子规约-一次性解决", ["一次性解决", "不反复提问", "自行决断", "假设留痕"]),
    "layer-decoupling-policy": ("L1", "原子规约-执行层解耦", ["执行层解耦", "契约通信", "禁止逆向依赖", "隐式耦合判据"]),
    "instance-pool-policy": ("L1", "原子规约-多实例准入", ["实例多开", "并发安全", "资源键", "独占资源声明"]),
    "atomic-lock-policy": ("L1", "原子规约-物理原子锁", ["原子锁", "物理互斥", "mkdir原子目录", "陈旧锁回收", "释放必达"]),
    "capability-naming-policy": ("L1", "原子规约-能力层命名", ["能力层命名", "命名四要素", "命名形态", "禁词表", "同义归一"]),
    "zoom-level-policy": ("L1", "原子规约-可视化交互", ["多级缩放", "缩放档位", "吸附", "下载降级"]),
    "process-conformance-policy": ("L1", "原子规约-流程合规", ["流程合规", "九步流程", "必需项否决", "na第三态"]),
    "multi-source-search-policy": ("L1", "原子规约-多源检索", ["检索源", "本地优先", "候选契约", "失败语义"]),
    "plugin-control-jump-policy": ("L1", "原子规约-插件调控入口", ["常显按钮", "幂等去重", "降级导航", "三态语义"]),
    "parallel-lock-policy": ("L1", "原子规约-并行调控锁", ["并行锁", "锁粒度", "字典序加锁", "超时释放"]),
    # L2 工序动作级 (Procedural)
    "verify-file-exists": ("L2", "工序动作-文件探针", ["文件检测", "落地验证", "文件存在"]),
    "check-python-syntax": ("L2", "工序动作-语法编译", ["Python语法", "编译校验", "代码检查"]),
    "extract-json-payload": ("L2", "工序动作-数据抽取", ["提取JSON", "正则提取", "JSON解析"]),
    "extract-core-objective": ("L2", "工序动作-目标提取", ["提取意图", "动宾提取", "实体识别", "核心目标"]),
    "search-duplicate-rules": ("L2", "工序动作-重复比对", ["检测重复", "冗余规则", "相似度比对", "规则重复"]),
    "detect-rule-conflicts": ("L2", "工序动作-冲突对拍", ["冲突检测", "互斥检测", "规则冲突", "矛盾检测"]),
    "match-intent-keywords": ("L2", "工序动作-关键词索引", ["匹配关键词", "检索技能", "初筛候选", "倒排索引"]),
    "disambiguate-candidates": ("L2", "工序动作-消歧打分", ["消除歧义", "消歧", "候选打分", "精准命中"]),
    "validate-header-triggers": ("L2", "工序动作-头部校验", ["头部校验", "Frontmatter校验", "元数据检查", "触发词校验"]),
    "verify-execution-contract": ("L2", "工序动作-契约脚本验证", ["执行契约", "验证脚本", "白盒运作", "脚本存在"]),
    "detect-action-verb": ("L2", "工序动作-动词识别", ["动作词", "动词判定", "指令动作", "动词提取"]),
    "detect-target-entity": ("L2", "工序动作-实体提取", ["实体识别", "操作对象", "目标实体", "实体边界"]),
    "ensure-utf8-encoding": ("L2", "工序动作-编码检测", ["UTF8检测", "编码断言", "防乱码", "编码校验"]),
    "assert-zero-exitcode": ("L2", "工序动作-退出码断言", ["退出码0", "命令断言", "执行成功断言", "硬性校验"]),
    "extract-catalog-topology": ("L2", "工序动作-拓扑提取", ["提取拓扑", "读取Catalog", "拓扑数据", "节点提取"]),
    "render-governance-mermaid": ("L2", "工序动作-图谱编译", ["渲染Mermaid", "编译图表", "生成拓扑图", "流程图编译"]),
    "verify-deliverable-paths": ("L2", "工序动作-地址探针", ["校验路径", "输出地址", "地址物理检测", "文件存在"]),
    "validate-icon-syntax": ("L2", "工序动作-图标正则校验", ["校验图标", "尾部正则", "图标断言", "合规图标"]),
    "audit-all-skills-compliance": ("L2", "工序动作-全量合规审计", ["全量审计", "存量合规", "契约体检", "头体验收"]),
    "generate-fastpath-route": ("L2", "工序动作-快捷路由生成", ["快捷路由", "提取直调命令", "直达原子", "快速触达"]),
    "measure-routing-metrics": ("L2", "工序动作-路由耗时测算", ["测算耗时", "路由时长", "索引命中测算", "耗时量化"]),
    "verify-mermaid-syntax": ("L2", "工序动作-流程图语法校验", ["Mermaid校验", "流程图语法", "图表合法性", "语法探针"]),
    "check-script-executable": ("L2", "工序动作-脚本可执行检测", ["执行权限检测", "可执行检查", "脚本存在", "chmod检测"]),
    "sync-requirements-lifecycle": ("L2", "工序动作-需求生命周期同步", ["需求同步", "需求版本", "图纸检查", "需求对齐"]),
    "run-test-cases-gate": ("L2", "工序动作-测试用例门禁", ["测试用例", "测试门禁", "自动化测试", "用例验证"]),
    "reconcile-knowledge-specs": ("L2", "工序动作-规范对照仲裁", ["规范对照", "知识库规范", "规范对拍", "冲突仲裁"]),
    "plan-fission": ("L2", "工序动作-分裂规划", ["分裂规划", "粒度评估", "分裂清单", "探针绑定检查"]),
    "render-catalog-docs": ("L2", "工序动作-受管区块生成", ["生成受管区块", "刷新组装表", "禁止手写", "幂等生成"]),
    "verify-catalog-consistency": ("L2", "工序动作-口径对拍", ["口径对拍", "三方一致", "漂移检测", "文档与技能不一致"]),
    "score-task-lane": ("L2", "工序动作-分流判定", ["分流判定", "快车道", "完整流程", "红线判定"]),
    "verify-lane-decision": ("L2", "工序动作-判定复算", ["判定复算", "分流确定性", "lane抖动", "结果可复现"]),
    "build-image-viewer": ("L2", "工序动作-查看器生成", ["生成查看器", "单文件HTML", "内联图片", "零依赖产物"]),
    "verify-interactive-html": ("L2", "工序动作-交互HTML探针", ["交互探针", "缩放控件断言", "零外链校验", "HTML结构校验"]),
    "search-github-skill": ("L2", "工序动作-外部技能检索", ["检索技能", "GitHub候选", "候选清单", "外部技能发现"]),
    "audit-imported-skill": ("L2", "工序动作-引入审计", ["引入审计", "许可白名单", "供应链风险", "候选体检"]),
    "normalize-skill-contract": ("L2", "工序动作-契约归一", ["契约归一", "补齐Frontmatter", "统一SOP", "幂等生成"]),
    "place-skill-into-cluster": ("L2", "工序动作-定级挂载", ["定级挂载", "集群归属", "依赖边校验", "挂载建议"]),
    "select-skills-for-task": ("L2", "工序动作-选技清单", ["选技", "技能清单", "命中技能", "候选技能"]),
    "load-skill-contract": ("L2", "工序动作-单契约加载", ["加载技能", "按需读取", "单契约", "禁止通配"]),
    "verify-context-payload": ("L2", "工序动作-上下文预算断言", ["上下文预算", "加载量断言", "越权加载", "字节预算"]),
    "build-inverted-index": ("L2", "工序动作-倒排索引", ["倒排索引", "建索引", "term检索", "分词索引"]),
    "parse-query": ("L2", "工序动作-查询解析", ["查询解析", "分词", "同义词", "拼写纠错"]),
    "rank-skills-bm25": ("L2", "工序动作-相关度排序", ["BM25", "相关度排序", "排序", "分页"]),
    "emit-search-snippet": ("L2", "工序动作-摘要片段", ["摘要片段", "snippet", "命中片段", "截断"]),
    "log-query-events": ("L2", "工序动作-质量信号", ["检索日志", "质量信号", "query日志", "点击反馈"]),
    "measure-token-budget": ("L2", "工序动作-token度量", ["统计token", "token消耗", "上下文统计", "token估算", "度量预算"]),
    "prune-redundant-context": ("L2", "工序动作-上下文裁剪", ["裁剪上下文", "去重复", "冗余裁剪", "压缩上下文"]),
    "verify-token-reduction": ("L2", "工序动作-降幅断言", ["降幅断言", "token下降", "能力不变", "等价断言"]),
    "classify-step-tier": ("L2", "工序动作-事件分档", ["事件分档", "milestone判定", "micro识别", "进度分级"]),
    "fold-repeated-events": ("L2", "工序动作-事件折叠", ["事件折叠", "计数折叠", "重复合并", "进度聚合"]),
    "verify-progress-budget": ("L2", "工序动作-进度预算断言", ["进度预算", "里程碑覆盖", "micro泄漏", "事件数断言"]),

    "strip-non-prose-scope": ("L2", "工序动作-非散文剥离", ["剥离代码", "剥离路径", "剥离URL", "待检正文"]),
    "verify-chinese-output": ("L2", "工序动作-中文断言", ["中文占比", "拉丁词零容忍", "缩写释义", "中文探针"]),
    "register-execution-layer": ("L2", "工序动作-执行层登记", ["登记执行层", "cli登记", "mcp登记", "插件登记"]),
    "build-execution-tree": ("L2", "工序动作-执行层建树", ["执行层树", "树状结构", "集群归属", "建树"]),
    "verify-execution-tree": ("L2", "工序动作-树一致性断言", ["树一致性", "结构漂移", "孤儿原子", "手写集群表"]),
    "detect-forbidden-state": ("L2", "工序动作-反例检测", ["反例检测", "禁止状态", "事件流检测", "AP检测"]),
    "verify-no-forbidden-event": ("L2", "工序动作-反例零命中断言", ["零命中", "反例断言", "事件流合规", "阻断禁用"]),
    "classify-change-scope": ("L2", "工序动作-变更处置判定", ["变更判定", "热更判定", "是否需要重启", "处置级别"]),
    "verify-no-unnecessary-restart": ("L2", "工序动作-重启必要性断言", ["不必要重启", "重启证据", "重建命令", "零重启"]),
    "build-quantifier-table": ("L2", "工序动作-量化映射表", ["量化映射表", "建量化表", "场景阈值", "量化依据"]),
    "detect-vague-modifier": ("L2", "工序动作-模糊词检测", ["模糊词检测", "含糊词检测", "程度词检测", "词表真相源"]),
    "quantify-modifier": ("L2", "工序动作-程度词量化", ["量化程度词", "把高量化", "给出数值区间", "补数值"]),
    "verify-quantified-output": ("L2", "工序动作-量化断言", ["未量化断言", "量化门禁", "同义替换拦截", "量化校验"]),
    "concretize-term": ("L2", "工序动作-含糊词具像化", ["具像化词汇", "把若干变具体", "实体枚举", "补判据"]),
    "verify-concretized-output": ("L2", "工序动作-具像化断言", ["具像化断言", "含糊词校验", "同义替换检测", "未具像化拦截"]),
    "classify-decision-reversibility": ("L2", "工序动作-决策可逆判定", ["可逆判定", "自行决断还是提问", "红线不可逆", "决策判定"]),
    "record-assumptions": ("L2", "工序动作-假设留痕", ["假设留痕", "记录假设", "假设清单", "可回滚默认值"]),
    "verify-no-unnecessary-question": ("L2", "工序动作-反问检测断言", ["反问检测", "提问次数断言", "挤牙膏追问", "零提问"]),
    "build-layer-graph": ("L2", "工序动作-层间依赖图", ["层间依赖图", "建图", "层级关系", "边集合"]),
    "detect-layer-coupling": ("L2", "工序动作-耦合检测", ["耦合检测", "依赖违规", "隐式耦合", "共享可变状态"]),
    "verify-decoupling": ("L2", "工序动作-解耦断言", ["解耦断言", "零违规", "显式豁免", "解耦门禁"]),
    "classify-instance-safety": ("L2", "工序动作-实例安全分档", ["实例分档", "并发安全判定", "safe_multi", "single_only"]),
    "verify-instance-safety": ("L2", "工序动作-实例声明断言", ["声明一致性", "实例安全断言", "声明陈旧检测"]),
    "declare-lock-set": ("L2", "工序动作-锁集合声明", ["锁集合", "锁键归一", "加锁顺序", "缺锁检测"]),
    "detect-lock-conflict": ("L2", "工序动作-锁冲突检测", ["锁冲突", "死锁检测", "超时未释放", "并行分组"]),
    "verify-no-lock-violation": ("L2", "工序动作-锁违规断言", ["锁违规断言", "并行派单门禁", "死循环体检"]),
    "acquire-atomic-lock": ("L2", "工序动作-物理原子锁", ["获取锁", "释放锁", "陈旧锁回收", "token校验"]),
    "verify-atomic-mutual-exclusion": ("L2", "工序动作-互斥压测断言", ["互斥压测", "临界区重叠", "多进程并发", "无锁对照"]),
    # L3 复合流程级 (Composite)
    "concise-chinese-bold-guard": ("L3", "复合流程-极简加粗", ["极简中文加粗", "10个字以内全加粗中文"]),
    "schema-guard": ("L3", "复合流程-格式守卫", ["纯JSON", "严格YAML", "Schema契约", "无噪音数据"]),
    "qa-gatekeeper": ("L3", "复合流程-质量门禁", ["交付", "终审", "质量门禁", "自检"]),
    "intent-detector": ("L3", "复合流程-意图检测", ["意图识别", "意图检测", "检测目的", "过滤无用表达"]),
    "redundancy-detector": ("L3", "复合流程-冗余检测", ["冗余检测", "去冗余", "保持简洁", "防膨胀"]),
    "conflict-detector": ("L3", "复合流程-冲突检测", ["冲突检测", "冲突仲裁", "解决冲突", "互斥自愈"]),
    "skill-index-router": ("L3", "复合流程-索引控制", ["控制索引", "快速索引", "技能路由", "消歧命中"]),
    "index-header-contract": ("L3", "复合流程-头部契约", ["索引头部", "头部契约", "场景契约", "使用场景"]),
    "index-body-contract": ("L3", "复合流程-主体契约", ["索引主体", "主体契约", "运作机制", "具体运作"]),
    "visualize-governance-topology": ("L3", "复合流程-可视化透视", ["可视化", "查看索引", "调用链路", "透视管家", "看索引"]),
    "standard-output-framework": ("L3", "复合流程-输出总控", ["输出框架", "交付规范", "标准输出", "收尾模版"]),
    "iconized-output-showcase": ("L3", "复合流程-图标展示总控", ["图标展示", "尾部图标总控", "图标输出"]),
    "full-spectrum-skill-auditor": ("L3", "复合流程-全量审计门禁", ["全量体检", "合规门禁", "全盘审计"]),
    "atomic-fastpath-router": ("L3", "复合流程-快捷路由总控", ["快捷路由总控", "原子直达", "路由引擎"]),
    "tail-metrics-showcase": ("L3", "复合流程-量化指标总控", ["量化指标", "通俗交付", "指标总控", "聚焦输出"]),
    "spec-driven-governance": ("L3", "复合流程-规范驱动总控", ["规范驱动", "需求驱动", "测试闭环", "知识库优先"]),
    "atomic-fission-guard": ("L3", "复合流程-粒度分裂门禁", ["粒度门禁", "不可断言阻断", "递归分裂门禁", "物理原子性"]),
    "catalog-consistency-guard": ("L3", "复合流程-口径一致性门禁", ["口径门禁", "一致性门禁", "消除漂移", "文档对齐"]),
    "dual-lane-router": ("L3", "复合流程-双流程分流总控", ["双流程", "快慢分流", "流程选择", "任务分流"]),
    "interactive-image-viewer": ("L3", "复合流程-可缩放查看器总控", ["查看器总控", "图片放大", "缩放交付", "可视化交互"]),
    "skill-import-pipeline": ("L3", "复合流程-技能引入管线", ["技能引入", "外部技能纳管", "引入即纳管", "外部资产接入"]),
    "on-demand-dispatcher": ("L3", "复合流程-按需调用总控", ["按需调用", "派发下属", "上下文成本", "只读命中"]),
    "google-style-skill-search-router": ("L3", "复合流程-技能检索总控", ["技能检索", "搜索技能", "找技能", "检索总控"]),
    "token-economy-guard": ("L3", "复合流程-token门禁", ["token门禁", "省token", "token优化", "结构降本"]),
    "milestone-progress-reporter": ("L3", "复合流程-里程碑输出总控", ["里程碑输出", "进度播报", "阶段汇报", "过程输出"]),

    "chinese-output-guard": ("L3", "复合流程-中文输出门禁", ["中文门禁", "全中文交付", "中文校验门禁"]),
    "execution-tree-guard": ("L3", "复合流程-执行层树门禁", ["树门禁", "结构一致性门禁", "执行层树维护"]),
    "anti-pattern-guard": ("L3", "复合流程-反例门禁", ["反例门禁", "禁止事件门禁", "死循环阻断"]),
    "zero-restart-guard": ("L3", "复合流程-零重启门禁", ["零重启门禁", "重启审批", "热更门禁"]),
    "quantification-guard": ("L3", "复合流程-量化门禁", ["量化门禁", "程度词门禁", "交付前量化"]),
    "concretization-guard": ("L3", "复合流程-具像化门禁", ["具像化门禁", "含糊词门禁", "实体化交付"]),
    "one-shot-guard": ("L3", "复合流程-一次性解决门禁", ["一次性门禁", "不反复提问门禁", "假设门禁"]),
    "decoupling-guard": ("L3", "复合流程-解耦门禁", ["解耦门禁", "依赖合法性门禁", "契约通信门禁"]),
    "instance-pool-guard": ("L3", "复合流程-实例准入门禁", ["实例准入门禁", "多开许可", "并发准入"]),
    "parallel-lock-guard": ("L3", "复合流程-并行锁门禁", ["并行锁门禁", "派单前门禁", "并行安全性"]),
    "atomic-lock-guard": ("L3", "复合流程-物理原子锁门禁", ["原子锁门禁", "物理互斥证明", "同时处理放行"]),
    "audit-layer-naming": ("L2", "工序动作-命名体检", ["命名体检", "违规清单", "命名合规率", "file:line定位"]),
    "rename-execution-layer": ("L2", "工序动作-命名整改", ["改名整改", "六处同步", "幂等重跑", "旧名留痕"]),
    "verify-layer-naming": ("L2", "工序动作-命名断言", ["合规率断言", "悬空引用", "词边界扫描", "登记表零违规"]),
    "render-capability-naming": ("L2", "工序动作-命名文档渲染", ["命名规范文档", "受管区块渲染", "漂移检测", "知识库同步"]),
    "layer-naming-guard": ("L3", "复合流程-命名规范门禁", ["命名规范门禁", "命名放行", "三项实数"]),
    "search-official-source": ("L2", "工序动作-官网源检索", ["官网检索", "sitemap", "来源可追溯", "官方文档"]),
    "merge-search-candidates": ("L2", "工序动作-候选去重归一", ["候选去重", "统一契约", "全序排序", "空检索不通过"]),
    "dispatch-skill-search": ("L2", "工序动作-四源检索调度", ["四源调度", "本地优先", "短路留痕", "同义桥"]),
    "install-client-plugin": ("L2", "工序动作-客户端插件装配", ["插件装配", "幂等", "备份回滚", "重启声明"]),
    "verify-plugin-control-button": ("L2", "工序动作-调控按钮断言", ["按钮断言", "DOM打桩", "幂等验证", "逐字内联"]),
    "visual-interaction-guard": ("L3", "复合流程-可视化交互门禁", ["交互四件套", "档位门禁", "下载门禁", "零外链"]),
    "plugin-control-guard": ("L3", "复合流程-插件调控门禁", ["插件调控门禁", "装配放行", "31项断言"]),
    "collect-process-evidence": ("L2", "工序动作-流程取证", ["流程取证", "证据包", "无证据即fail", "三态判定"]),
    "score-process-conformance": ("L2", "工序动作-流程打分", ["流程打分", "权重分子分母", "必需项否决", "算式公开"]),
    "plan-process-rectification": ("L2", "工序动作-流程整改", ["整改清单", "可执行命令", "空话判不合格"]),
    "retire-legacy-workspace": ("L2", "工序动作-工作区退役", ["工作区退役", "不丢文件", "摘注册", "台账留痕"]),
    "verify-workspace-retirement": ("L2", "工序动作-退役断言", ["退役断言", "源已消失", "会话完整"]),
    "process-supervisor": ("L3", "复合流程-流程监督员", ["流程监督员", "出口自检", "独立复核", "整改闭环"]),
    # L4 中枢调度级 (Orchestration)
    "dsh-butler": ("L4", "中枢编排-全局管家", ["管家", "统筹", "调度", "动态造物", "规划", "治理"]),

    # 系统内置协同级
    "manage-requirements": ("L3", "系统协同-需求管理", ["需求", "REQ-", "需求变更", "基线"]),
    "confirm-before-coding": ("L2", "安全准入-变更审批", ["代码修改", "破坏性操作", "写入前确认"]),
    "manage-problem-log": ("L3", "质量运维-问题归档", ["bug", "问题", "报错", "复盘"]),
    "track-task-progress": ("L2", "执行监控-进度追踪", ["进度", "步骤跟踪", "任务看板"]),
    "github": ("L3", "代码协同-Git/PR", ["git commit", "push", "pr", "github"]),
}

def parse_frontmatter(content):
    meta = {"name": "", "description": "", "level": None, "composition": []}
    fm_match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", content, re.DOTALL)
    if not fm_match:
        return meta, content

    fm_text = fm_match.group(1)
    body = fm_match.group(2)
    current_key = None

    for line in fm_text.splitlines():
        line_strip = line.strip()
        if not line_strip or line_strip.startswith("#"):
            continue

        if line_strip.startswith("- ") and current_key == "composition":
            val = line_strip[2:].strip().strip('"').strip("'")
            meta["composition"].append(val)
            continue

        if ":" in line:
            k, v = line.split(":", 1)
            current_key = k.strip()
            v = v.strip().strip('"').strip("'")
            if current_key == "composition":
                meta["composition"] = []
                if v:
                    # inline array [a, b]
                    arr_match = re.findall(r"[\w\-]+", v)
                    meta["composition"].extend(arr_match)
            else:
                meta[current_key] = v

    return meta, body

def scan_skills():
    catalog_items = []

    # 1. 扫描 skills/ 目录
    if os.path.exists(SKILLS_DIR):
        for entry in sorted(os.listdir(SKILLS_DIR)):
            entry_path = os.path.join(SKILLS_DIR, entry)
            if not os.path.isdir(entry_path) or entry.startswith(".") or entry.startswith("_"):
                continue

            skill_md = os.path.join(entry_path, "SKILL.md")
            if not os.path.exists(skill_md):
                continue

            with open(skill_md, "r", encoding="utf-8") as f:
                content = f.read()

            meta, _ = parse_frontmatter(content)
            skill_id = meta.get("name") or entry
            desc = meta.get("description", "")

            # 匹配默认定义
            default_level, default_title, default_triggers = CATEGORY_DEFAULTS.get(
                skill_id, ("L3", "业务定制技能", [skill_id])
            )

            level = meta.get("level") or default_level
            composition = meta.get("composition") or []

            scripts_dir = os.path.join(entry_path, "scripts")
            has_scripts = os.path.exists(scripts_dir) and len(os.listdir(scripts_dir)) > 0

            catalog_items.append({
                "id": skill_id,
                "name": entry,
                "layer": "skill",
                "level": level,
                "category_title": default_title,
                "scope": "local-pool",
                "description": desc,
                "triggers": default_triggers,
                "composition": composition,
                "has_scripts": has_scripts,
                "path": f"skills/{entry}"
            })

    # 2. 融入系统级工程技能
    for sys_id, (def_level, def_title, def_triggers) in CATEGORY_DEFAULTS.items():
        if not any(item["id"] == sys_id for item in catalog_items):
            catalog_items.append({
                "id": sys_id,
                "name": sys_id,
                "layer": "skill",
                "level": def_level,
                "category_title": def_title,
                "scope": "system-builtin",
                "description": f"系统能力：{def_title}",
                "triggers": def_triggers,
                "composition": [],
                "has_scripts": False,
                "path": f"@system/{sys_id}"
            })

    # 排序：L1 -> L2 -> L3 -> L4
    level_order = {"L1": 1, "L2": 2, "L3": 3, "L4": 4}
    catalog_items.sort(key=lambda x: (level_order.get(x["level"], 9), x["id"]))
    return catalog_items

def generate_markdown(catalog_items):
    lines = [
        "# DSH 全局 Skill Catalog (四级能力模型与积木式映射表)",
        "",
        "> 本文档由 DSH 管家统一调度维护。严格遵循 **L1 原子规约 → L2 工序动作 → L3 复合流程 → L4 中枢编排** 四级能力模型，并基于微观原子操作做加法（Composition）。",
        "",
        f"- **最后同步时间**：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"- **总纳管技能数**：{len(catalog_items)} 个",
        "",
        "---",
        "",
        "## 1. 技能四级能力分级总览",
        "",
        "| 级别 | Skill ID | 类别名称 | 触发关键词 | 加法依赖 (Composition) | 路径 |",
        "| :--- | :--- | :--- | :--- | :--- | :--- |"
    ]

    for item in catalog_items:
        triggers_str = "、".join(f"`{t}`" for t in item["triggers"][:3])
        comp_str = " + ".join(f"`{c}`" for c in item["composition"]) if item["composition"] else "*(原子基元)*"
        lines.append(f"| **{item['level']}** | `{item['id']}` | {item['category_title']} | {triggers_str} | {comp_str} | `{item['path']}` |")

    lines.extend([
        "",
        "---",
        "",
        "## 2. 经典积木加法配方 (Addition Recipes)",
        "",
        "管家在调度时，通过微观原子操作的叠加来构建确定性：",
        "",
        "- **配方 1: 极简中文加粗 (`concise-chinese-bold-guard`)**",
        "  `output-chinese-only (L1)` + `limit-words-under-10 (L1)` + `markdown-bold-only (L1)` + `no-conversational-filler (L1)`",
        "- **配方 2: 严格数据守卫 (`schema-guard`)**",
        "  `no-conversational-filler (L1)` + `strip-markdown-fence (L1)` + `extract-json-payload (L2)`",
        "- **配方 3: 交付终审门禁 (`qa-gatekeeper`)**",
        "  `verify-file-exists (L2)` + `check-python-syntax (L2)`",
        "",
        "---",
        "",
        "## 3. 编目维护说明",
        "- 任何新增或修改 Skill 时，运行 `python3 skills/dsh-butler/scripts/sync_catalog.py` 自动更新本文件与 `skill-catalog.json`；",
        "- CLI 查询支持分级检索：`bin/skill-pool catalog --level L1`。"
    ])

    return "\n".join(lines) + "\n"

def main():
    os.makedirs(os.path.dirname(CATALOG_JSON_PATH), exist_ok=True)
    items = scan_skills()

    catalog_data = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "catalog_version": "2.0.0",
        "updated_at": datetime.now().isoformat(),
        "total_skills": len(items),
        "levels_summary": {
            "L1": len([x for x in items if x["level"] == "L1"]),
            "L2": len([x for x in items if x["level"] == "L2"]),
            "L3": len([x for x in items if x["level"] == "L3"]),
            "L4": len([x for x in items if x["level"] == "L4"]),
        },
        "skills": items
    }

    with open(CATALOG_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(catalog_data, f, ensure_ascii=False, indent=2)

    md_content = generate_markdown(items)
    with open(CATALOG_MD_PATH, "w", encoding="utf-8") as f:
        f.write(md_content)

    print(f"Catalog 2.0 successfully synced! {len(items)} skills mapped across L1~L4.")
    print(f"- L1: {catalog_data['levels_summary']['L1']} | L2: {catalog_data['levels_summary']['L2']} | L3: {catalog_data['levels_summary']['L3']} | L4: {catalog_data['levels_summary']['L4']}")
    print(f"- JSON: {CATALOG_JSON_PATH}")
    print(f"- MD:   {CATALOG_MD_PATH}")

if __name__ == "__main__":
    main()
