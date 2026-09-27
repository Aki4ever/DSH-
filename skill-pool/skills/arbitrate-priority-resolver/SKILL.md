---
name: arbitrate-priority-resolver
level: L1
description: 微观原子规约：优先级仲裁基元。在多条规则发生逻辑冲突时，强制遵循固定优先级决断法则。
---

# Arbitrate Priority Resolver (优先级仲裁规约)

## Overview

本技能是 L1 原子级基础规约。解决多规则组合时的碰撞与死锁。

## Strict Rules

1. **P0 安全红线 (Safety & Sandbox)**：破坏性操作拦截、系统沙箱限制最高；
2. **P1 用户强约束 (User Explicit Constraint)**：本次对话用户显式要求的字数/语种/格式；
3. **P2 L1/L2 原子规约 (Skill Core Invariants)**：被调用技能声明的不可破坏硬约束；
4. **P3 默认环境基线 (Default Conventions)**：常规模版与风格惯例。

当同级冲突时，以“范围更窄、更具体”的规则胜出。
