#!/usr/bin/env node
// ==============================================================================
// 脚本名称：batch_fix_sidebar_titles.mjs
// 核心功能：全量穿透修复前端侧边栏及权威存储中的全部存量会话标题
// ==============================================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { execSync } from 'node:child_process'

const DESKTOP_STORAGE = join(homedir(), 'Library/Application Support/dsh-desktop/harness/profiles/web/desktop-storage.json')
const WEB_URL = process.env.DSH_WEB_URL || 'http://127.0.0.1:43129'

// 映射表：将旧白话标题或不合规标题精确重构为三段式合规标题
const TITLE_MAP = {
  // Skill池
  'session-b84ade80-4e47-41eb-877f-c7bbd95f58df': '[新需001][20分] 技能池初始化',
  // 冗余垃圾文件清除
  'session-777c3f47-c703-4748-bd68-134a0a7fd280': '[重构001][30分] 垃圾文件清除',
  // 日常琐碎
  'session-f437c8ee-9158-4672-9781-41c2604c5bf4': '[修漏001][25分] 问题排查解决',
  'session-c96d5364-4d41-403f-84d6-19f1d4992f7a': '[调研002][40分] 产品交接文案',
  // DSH 股票
  'session-012e52b4-0ea7-4146-bfe0-0f04c99565c1': '[调研005][50分] 股票数据调研',
  'session-2edb8ed4-56aa-4a9e-8fa8-95dd97aaa03c': '[调研006][35分] 大宗交易调研',
  'session-2e8e3e47-0d2a-4288-9129-a3292337004c': '[调研007][45分] 买卖理论汇总',
  'session-cb06f259-4f6c-46dc-b739-2d5c644d0f42': '[调研004][20分] 股票产品入口',
  'session-0e7c819a-3051-4c8c-a648-22670d8a9cc9': '[调研008][40分] 产品对接文案',
  // 全局规则
  'session-f0931765-8bfa-4fb3-b532-6d3c8a2ff7d3': '[优规052][50分] 管控机制优化',
  'session-7f04e437-8ae9-46fd-a58e-d0551d9fd04a': '[优规053][40分] 管控梳理文案',
  'session-260a3acc-a3f9-400d-b18e-30ea48b3159d': '[调研009][30分] 产品对接文案',
  'session-dfcae4c4-1b7f-45bc-a08c-e7dc5eba4e39': '[调研010][30分] 产品梳理文案'
}

async function run() {
  console.log('🚀 开始全量批量改名与前端侧边栏强同步...')

  if (!existsSync(DESKTOP_STORAGE)) {
    console.error('❌ 找不到 desktop-storage.json:', DESKTOP_STORAGE)
    process.exit(1)
  }

  const rawStorage = JSON.parse(readFileSync(DESKTOP_STORAGE, 'utf-8'))
  const titlesObj = JSON.parse(rawStorage['dsh.betterWorkspace.titles.v1'] || '{"byId":{}}')
  titlesObj.byId = titlesObj.byId || {}

  let updatedCount = 0

  for (const [sid, newTitle] of Object.entries(TITLE_MAP)) {
    console.log(`\n🔄 处理会话 [${sid}] -> "${newTitle}"`)

    // 1. 调用 rename_session.sh 进行 RPC 广播与会话存储落盘
    try {
      execSync(`./scripts/rename_session.sh "${newTitle}" "${sid}" "${WEB_URL}"`, { stdio: 'inherit' })
    } catch (err) {
      console.warn(`⚠️ rename_session.sh 警告: ${err.message}`)
    }

    // 2. 同步更新 desktop-storage.json 缓存
    titlesObj.byId[sid] = {
      title: newTitle,
      at: Date.now()
    }
    updatedCount++
  }

  // 3. 落盘 desktop-storage.json
  rawStorage['dsh.betterWorkspace.titles.v1'] = JSON.stringify(titlesObj)
  writeFileSync(DESKTOP_STORAGE, JSON.stringify(rawStorage, null, 2), 'utf-8')
  console.log(`\n✅ desktop-storage.json 前端本地存储已同步重写完成！共更新 ${updatedCount} 条会话。`)
}

run().catch(console.error)
