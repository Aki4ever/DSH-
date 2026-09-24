#!/usr/bin/env node
// ==============================================================================
// 脚本名称：normalize_all_projects.mjs
// 核心功能：全域存量 DSH 工程文件夹批量合规与规范化治理脚本
// ------------------------------------------------------------------------------
// 为什么需要它：
//   满足管控机制第五条优化：“更新完后要对存量工程文件夹进行全局规范，让之前没有
//   按照规范执行的文件夹内的所有文件都规范化”。
//   一键遍历 DSH 工作区同级工程，对缺失 AGENTS.md、需求台账 docs/requirements.md
//   或标准配置的工程进行自动化补齐与规范化，彻底消除孤岛与脱管。
//
// 用法：
//   node scripts/normalize_all_projects.mjs              # 自动扫描并批量规范化
//   node scripts/normalize_all_projects.mjs --dry-run    # 仅预览待规范项，不写文件
// ==============================================================================

import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises'
import { join, resolve, basename } from 'node:path'
import { existsSync } from 'node:fs'

const ROOT_DSH = resolve(process.cwd(), '..')
const CURRENT_PROJECT = process.cwd()

const DRY_RUN = process.argv.includes('--dry-run')

function generateAgentsMd(projectName) {
  return `# ${projectName} · 项目级管控约束

> 本文件在本工程会话中被自动注入。
> 遵循全局规则权威法典，本工程 100% 纳入 DSH 全域管控机制与底层物理锁管辖。

---

## 一、开工前置：管控机制与物理锁强制执行

本工程受 **DSH 全局管控机制** 与 **底层物理锁 Agent (Physical Lock Agent)** 约束。
物理锁看守单向严格工序链：**必须完成上一步才可以执行下一步**，任何跳步工具调用将被底层物理拦截拒止。

任何改动型动作之前，必须执行：
1. **首动改名**：第一步调用全局改名工具锁定会话标题（三段式「[分类编号][难度分] 8字概述」）；
2. **查需求台账**：查阅 \`docs/requirements.md\` 确认需求依据与当前版本；
3. **查安全红线**：禁止越权删除与越界破坏。

---

## 二、文末固定五联装视觉强化交付收尾铁律

任务完成或输出汇报时，输出的最末尾处必须且只能包含以下 5 项固定总结结构（带大号图标与加粗）：

\`\`\`markdown
---

### 📦 任务执行与交付收尾回执

- **🏷️ 【当前状态】**：明确标注【规划阶段】还是【实施阶段】
- **🎯 【核心结论/输出物】**：有输出物就给具体输出物说明，没有输出物就给核心结论
- **📍 【输出物地址】**：如果有输出物就要给物理文件路径（行内代码格式），没有输出物填「无」
- **💡 【重要说明】**：对执行过程中遇到的问题、踩坑、潜伏风险或连带产生的非预期/连带改动进行透明显式说明
- **🌟 【执行效果】**：必须给出 0~100 分量化审计打分及扣分项，方便审计和回溯总结
\`\`\`

---

## 三、极简高信噪比原则
与任务不相关的少说，没有问到的不要说，只有很相关并且比较重要的才说，坚决剔除无关冗余客套。
`
}

function generateInitialRequirements(projectName) {
  return `# ${projectName} · 需求管理台账 (Requirements Ledger)

> ### 🏷️ **版本信息与实施追踪**
> - **当前系统实施总版本**：\`v1.0.0\`
> - **所属工程**：\`${projectName}\`
> - **创建时间**：${new Date().toISOString().split('T')[0]}
> - **版本状态**：\`[ACTIVE 稳定生效]\`

本文档是本工程唯一的**独立核心需求管理台账**。所有功能演进、配置变动与修复均必须在此登记。

---

## 📌 状态说明
- \`[ACTIVE]\`：生效中
- \`[EVOLVING]\`：演进中
- \`[DEPRECATED]\`：已废弃

---

## 📋 结构化需求明细表

### REQ-001: 工程标准化初始化与管控机制接入
- **当前状态**：\`[ACTIVE]\` 生效中
- **实施版本**：\`v1.0.0\`
- **提出时间**：${new Date().toISOString().split('T')[0]}
- **核心诉求与目标**：
  1. 建立工程标准目录架构与需求管理台账；
  2. 接入 DSH 全域管控机制，落实开工改名与文末五联装固定交付契约。
- **关联文件**：\`AGENTS.md\`、\`docs/requirements.md\`
- **验收标准**：
  - [x] AGENTS.md 管控规约就绪；
  - [x] docs/requirements.md 需求台账建立。
`
}

async function scanAndNormalize() {
  console.log(`🔍 开始全域 DSH 存量工程扫描与合规治理...`)
  console.log(`📁 扫描根路径：${ROOT_DSH}\n`)

  const entries = await readdir(ROOT_DSH, { withFileTypes: true })
  const report = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const name = entry.name
    if (name.startsWith('.') || name.startsWith('_retired_assets')) continue

    const projectDir = join(ROOT_DSH, name)
    const stats = {
      name,
      agentsMd: existsSync(join(projectDir, 'AGENTS.md')),
      requirements: existsSync(join(projectDir, 'docs', 'requirements.md')),
      git: existsSync(join(projectDir, '.git')),
      actions: []
    }

    // 1. 检查/规范 AGENTS.md
    const agentsPath = join(projectDir, 'AGENTS.md')
    if (!stats.agentsMd) {
      stats.actions.push('注入标准 AGENTS.md 管控约束')
      if (!DRY_RUN) {
        await writeFile(agentsPath, generateAgentsMd(name), 'utf-8')
      }
    } else {
      // 检查是否包含最新的五联装输出说明
      const content = await readFile(agentsPath, 'utf-8')
      if (!content.includes('重要说明') || !content.includes('五联装')) {
        stats.actions.push('升级 AGENTS.md 为五联装视觉强化收尾规范')
        if (!DRY_RUN) {
          await writeFile(agentsPath, generateAgentsMd(name), 'utf-8')
        }
      }
    }

    // 2. 检查/规范 docs/requirements.md
    const docsDir = join(projectDir, 'docs')
    const reqPath = join(docsDir, 'requirements.md')
    if (!stats.requirements) {
      stats.actions.push('初始化 docs/requirements.md 需求台账插槽')
      if (!DRY_RUN) {
        if (!existsSync(docsDir)) {
          await mkdir(docsDir, { recursive: true })
        }
        await writeFile(reqPath, generateInitialRequirements(name), 'utf-8')
      }
    }

    // 3. 检查 .gitignore
    const gitignorePath = join(projectDir, '.gitignore')
    if (!existsSync(gitignorePath)) {
      stats.actions.push('补齐 .gitignore 基础忽略配置')
      if (!DRY_RUN) {
        await writeFile(gitignorePath, ".DS_Store\nnode_modules/\n*.log\n", 'utf-8')
      }
    }

    report.push(stats)
  }

  // 输出治理总结
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 全域工程合规治理扫描报告')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  let totalActions = 0
  for (const item of report) {
    const status = item.actions.length === 0 ? '🟢 已完全合规' : `🟡 治理动作 (${item.actions.length}项)`
    console.log(`\n📦 工程：【${item.name}】 ➜ ${status}`)
    if (item.actions.length > 0) {
      for (const act of item.actions) {
        console.log(`   └─ ${DRY_RUN ? '[预览执行]' : '✅ [已落盘]'} ${act}`)
        totalActions++
      }
    } else {
      console.log(`   └─ AGENTS.md、需求台账及管控基线全齐备`)
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`🎉 治理总结：扫描工程 ${report.length} 个 · 执行规范化治理动作 ${totalActions} 项`)
  if (DRY_RUN) {
    console.log(`💡 当前为 --dry-run 模式，未实际写入磁盘。去掉参数即可落地。`)
  } else {
    console.log(`✅ 所有存量工程文件已 100% 完成标准化规范化！`)
  }
}

scanAndNormalize().catch(err => {
  console.error('❌ 治理过程异常:', err)
  process.exit(1)
})
