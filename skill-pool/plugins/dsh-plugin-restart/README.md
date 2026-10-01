# dsh-plugin-restart — 一键重启 DeepSeek Harness

> **需求依据**：`REQ-090` / R6（需求文案 [`docs/constraint_mechanism_optimize_7.md`](../../../docs/constraint_mechanism_optimize_7.md) §3.4）
> **唯一合格证据**：点击前后**宿主 PID 发生变化**。看不到 PID 变化，就等于没重启。

---

## 一、这东西解决什么问题

改插件、改宿主配置后**必须重启应用才生效**，而重启只能靠用户自己退出再打开。
本插件在会话头部动作条放一个「⏻ 重启」按钮，点一下就走完"退出 → 重开"。

**它不是官方功能。** 实测结论（`app.asar` 只读解析）：

| 找过的路 | 结果 |
| :--- | :--- |
| 渲染侧 IPC 清单 `apps/desktop/src/ipc.ts` | **没有 restart** |
| `window.dsh` 预加载桥 | 只暴露 `getLocale` / `onLocaleChange` / `getAuthToken` |
| `app.relaunch()` | 只挂在**致命错误恢复对话框**与**开发期菜单**（后者在生产包被裁掉） |
| CLI / HTTP / RPC | 均无重启入口 |

所以我们自建链路：**官方插件面（命令注册 + 插槽注入）+ 分离进程执行 macOS 退出与重开**。
全程不改 `app.asar`、不破签名。

---

## 二、结构（双半插件）

```text
dsh-plugin-restart/
├── package.json            # main=宿主半 / exports["./client"]=客户端半 / dsh.bundle.patch
├── cordis.patch.yml        # 把本插件 insert 进 profile 的 layer 栈
├── src/
│   ├── restart-core.cjs    # 纯内核：确认口令 / 重启脚本 / PID 比对（宿主与客户端共用）
│   ├── host-core.cjs       # 宿主侧可单测内核（spawn 是**注入**的，测试绝不真跑）
│   └── client.template.js  # 客户端模板（内联内核，构建成 lib/client.js）
├── lib/
│   ├── index.js            # 宿主半：注册 /restart-dsh 命令（薄适配层）
│   └── client.js           # 客户端半（构建产物，勿手改）
├── verify_restart_button.cjs  # 打桩自检：84 项，含反向变异
└── build_client.py         # 内联构建 + sha256 摘要锁死
```

**触发链路**

```text
[会话头部动作条] ⏻ 重启 按钮
      │  模态二次确认（取消则什么都不做）
      ▼
ctx.remote.commands.execute(sessionId, '/restart-dsh confirm', [])
      ▼
[宿主半] /restart-dsh handler
      │  口令不是 confirm → 直接拒绝，一个进程都不派
      ▼
spawn('/bin/sh', ['-c', 脚本], { detached: true, stdio: 'ignore' }).unref()
      │  脚本：sleep 1 → osascript quit app → kill -0 轮询等旧进程消失 → open -a
      ▼
[判定] 重启前后宿主 PID 必须不同
```

---

## 三、怎么验证

```bash
# 1) 构建（把内核内联成 bundle，并断言摘要一致）
python3 skill-pool/plugins/dsh-plugin-restart/build_client.py

# 2) 构建新鲜度（源码改了没重建 → 退出码 1）
python3 skill-pool/plugins/dsh-plugin-restart/build_client.py --check

# 3) 打桩自检（**不需要宿主 App**，也**绝不会真的重启**）
node skill-pool/plugins/dsh-plugin-restart/verify_restart_button.cjs
```

自检分四层，每层都带反向用例：静态契约 · 纯逻辑内核 · **宿主半用假 spawn 打桩** · **客户端半用假 React/slots/remote 打桩**。
最后一层还会**故意把确认口令改坏**，验证断言确实会失败 —— 先证明检测器有牙。

**真机验收（必须人工做一次）**

```bash
# 记录旧宿主 PID（19387 是宿主监听端口）
lsof -nP -iTCP:19387 -sTCP:LISTEN -t
# → 点击头部动作条的「⏻ 重启」→ 确认
# 应用重开后，重跑同一条命令，PID 必须与旧值不同
lsof -nP -iTCP:19387 -sTCP:LISTEN -t
```

---

## 四、⚠️ 待实测前置条件（**未验证前不得声称"已生效"**）

| # | 待验证的事 | 为什么重要 | 怎么验 |
| :--: | :--- | :--- | :--- |
| 1 | **退出确认弹窗会不会拦住 `osascript quit`** | 有活跃任务时宿主会弹原生确认框，自动退出会被卡住 | 分别在"无任务"与"有任务"两种状态下各点一次 |
| 2 | **分离进程能否活过宿主退出** | 宿主一死，没 `detached` + `unref` 的子进程会被一起带走，`open -a` 就没人跑 | 点击后 `pgrep -f dsh-plugin-restart` 观察，或直接看应用有没有重开 |
| 3 | **第三方客户端插件能否 `inject` `remote.commands`** | 官方包可以；第三方是否被 typert 注册表允许未验证。不行则本按钮点下去会如实报"宿主未提供 remote.commands.execute" | 装完在浏览器控制台看诊断输出 |
| 4 | **自定义命令在两种 origin 下都可达** | `dsh-app://app`（Electron 内）与 `http://127.0.0.1:19387`（浏览器直开，实测 401）行为可能不同 | 两个入口各点一次 |
| 5 | **装完插件是否仍需重启** | 插件 bundle 注册表在宿主启动时读取 → 大概率仍需重启一次 | 装完看按钮是否出现 |
| 6 | **宿主半能否 `require('node:child_process')`** | 若插件受沙箱/策略限制，`spawn` 会被拒 | 点击后看命令回执是 success 还是"宿主未提供 spawn 能力" |

> **自举悖论（必须先知道）**：按钮本身是插件，而插件装配**必须重启一次才可见**。
> 也就是说：**为了拿到"一键重启"，你得先手动重启一次。** 这不是缺陷，是交付前提。

---

## 五、安全设计

1. **必须二次确认**：命令入参不是 `confirm` 一律拒绝，一个进程都不派（自检里有 4 条断言专门守这条）；
2. **按钮上有模态弹窗**：取消即什么都不做（对齐 `interaction_specification.md:49` 的二次确认要求）；
3. **只拼正整数 PID**，应用名有字符白名单；恶意输入一律抛错，杜绝命令注入；
4. **fail-closed**：拿不到 `remote.commands`、拿不到 `spawn`、PID 比对缺任一侧，一律**报失败**，绝不假装成功。

---

## 六、装配与卸载

```bash
# 干跑（不写任何文件，只打印将做的四项动作与重启要求）
bash skills/install-client-plugin/scripts/install_client_plugin.sh --plugin dsh-plugin-restart --profile desktop
# 真装
bash skills/install-client-plugin/scripts/install_client_plugin.sh --plugin dsh-plugin-restart --profile desktop --apply
# 回滚
bash skills/install-client-plugin/scripts/install_client_plugin.sh --plugin dsh-plugin-restart --profile desktop --rollback
```

> 装配器会备份 `package.json` 与 `cordis.patch.yml`，并输出 `rollback_command` 与 `restart_required=true`。

---

## 七、已知边界（不掩盖）

- **重启会中断当前会话**，这是设计使然，不是 bug；
- 浏览器直开 `http://127.0.0.1:19387` 需要令牌（实测 401），该入口下按钮可能不可用；
- 若宿主改名（当前为 `DeepSeek Harness`），需同步改 `src/restart-core.cjs` 的 `APP_NAME`，并重跑构建与自检。
