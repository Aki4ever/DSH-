# 全端可读性与无障碍排版设计法典 (Universal Readability & Typography Specification)

> ### 🏷️ **版本信息与实施追踪**
> - **当前文档版本**：`v4.17.0`
> - **对应实施版本**：`v4.17.0`
> - **规范层级**：`【知识库总纲 · 通用公共规范】`（所有工程 100% 共享继承）
> - **生效状态**：`[Release 稳定生效]`

本文档是系统全域跨平台（Web端、App移动端、DMG桌面客户端、微信及主流小程序）的**排版设计与可读性最高法定基线**。所有前后端UI研发必须无条件遵守**《Don't Make Me Think》（点石成金）零思考直觉原则**与 **WCAG 2.1 AA 级无障碍标准**。

---

## 💡 一、《Don't Make Me Think》排版三大认知铁律

用户面对任何屏幕，默认行为是“扫视（Scan）”而非“研读（Read）”。排版设计的唯一目的就是让用户以最小脑力开销一眼看穿核心信息：

1. **建立绝对明确的视觉层次 (Clear Visual Hierarchy)**：
   - 越重要的内容越显著（通过字号比例阶梯、位置、对比度体现）；
   - 逻辑上相关的内容视觉上也相关（遵循格式塔接近律与卡片闭合律）；
   - 嵌套层级严禁超过 3 级（页面标题 ➔ 模块标题 ➔ 正文/辅助）。
2. **为快速扫视而设计 (Design for Scanning)**：
   - 页面必须提供清晰的“视觉锚点”（大标题、导航 Tab、关键指标）；
   - 正文行高锁定在 `1.5~1.6` 黄金阅读比，段间距保持为行间距的 `1.5~2` 倍；
   - 单行字符数严格受控：桌面端单行建议 `45~75` 个汉字，移动端单行建议 `20~35` 个汉字，严禁无边际通栏平铺。
3. **消除视觉噪点与多余格式 (Omit Needless Formatting)**：
   - 同一屏幕可视区域内，字体种类严禁超过 1 种无衬线字体族（代码块等宽除外）；
   - 字体颜色等级严格收敛为 3 层（主标题/强正文、次要说明、失效占位），坚决杜绝五彩斑斓的混排；
   - 字重实行极简阶梯：严禁全篇加粗，粗体仅用于即时捕捉焦点的关键词。

---

## 🔤 二、全域字体族与字体使用标准规范 (Typography & Font Standards)

全局统一采用现代无衬线系统字体，兼顾高清视网膜屏抗锯齿、原生极速加载与零外部字体网络依赖：

### 1. 跨端系统级字体栈 (System Font Stack Matrix)
```css
/* 1. Web 桌面端 & DMG 桌面客户端推荐栈 (优先 macOS/Windows 系统级渲染) */
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;

/* 2. App 移动端 (iOS / Android 原生及 Flutter/React Native 跨端) */
font-family: -apple-system, "PingFang SC", "Helvetica Neue", STHeiti, "Microsoft YaHei", sans-serif;

/* 3. 微信小程序与跨平台小程序 (兼顾 iOS PingFang 与 Android 默认无衬线) */
font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", Arial, sans-serif;

/* 4. 代码块、终端输出、数据指标、哈希值与时间戳 (等宽字体栈) */
font-family: "SF Mono", Monaco, Menlo, Consolas, "Liberation Mono", "Courier New", monospace;
```

### 2. 字体选型与引入红线 (Font Selection Principles)
- **零网络字体依赖 (Zero Webfont Blocking)**：业务系统主界面严禁通过 `@import` 或 `<link>` 异步加载未授权的几十兆中文字体包，杜绝 FOUT（无样式文字闪烁）与 FOIT（隐形文字闪烁）；
- **禁用艺术花体与手写体**：在数据呈现、后台管理、表单操作及正文场景，**严禁引入楷体、圆体、书法体等异构花体**，杜绝增加用户辨识认知负担；
- **英文西文混排规范 (CJK & Latin Pairing)**：字体声明中西文字体（`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`）必须前置于中文字体（`"PingFang SC", "Microsoft YaHei"`），确保中英混排时英文字符与数字采用专用西文字形；
- **数字等宽渲染 (Tabular Numerals)**：金融、审计、库存、工单、倒计时等涉及数值比对的场景，必须强制声明：
  ```css
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
  ```
  保证所有数字具有完全相同的物理宽度，彻底消除跳动与参差。


---

## 📏 三、跨端字号阶梯、导航与绝对可读底线 (Size Hierarchy Table)

各端物理分辨率不同，前后端必须依循以下严格对应矩阵实现：

| 文本层级 | Web 桌面端 (px) | DMG 客户端 (px) | App 移动端 (pt/dp) | 微信/主流小程序 (rpx) | 推荐字重 (Weight) | 核心应用场景与排版要求 |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **L1 页面主标题** | `24px~28px` | `22px~26px` | `20px~22px` | `40rpx~44rpx` | **Bold (700)** | 整个视窗主标题，一屏仅出现 1 次，定性当前场景 |
| **L2 模块/卡片标题**| `18px~20px` | `17px~19px` | `16px~18px` | `32rpx~36rpx` | **Semibold (600)** | 独立容器卡片、分组面板顶部标题 |
| **L3 导航栏文字** | `14px~15px` | `13px~14px` | `16px~17px` | `32rpx` | **Medium (500)** | 顶部导航栏、侧边栏菜单、底部 TabBar |
| **L4 正文核心内容** | `14px` | `13px~14px` | `15px~16px` | `28rpx~30rpx` | **Regular (400)** | 用户阅读的核心正文、表单输入值、常规列表 |
| **L5 辅助说明与标签**| `12px~13px` | `12px` | `12px~13px` | `24rpx~26rpx` | **Regular (400)** | 时间戳、表单占位提示、次级状态 Tag |
| 🛑 **最小文字底线** | **`12px`** | **`11px`** | **`12px` (pt)** | **`22rpx` (11px)** | **禁止低于此线** | **绝对红线**：严禁出现破坏可读性的微型字 |

---

## 🎨 四、色彩对比度与字重节制铁律

### 1. WCAG 2.1 AA 级对比度标准
- **核心文本基准**：L1~L4 层级文字（标题、导航、正文）与背景色对比度必须 **$\ge 4.5:1$**：
  - *暗色模式推荐*：高亮主文本 `#FFFFFF`（对比度 > 15:1），标准正文 `#E0E6ED` 或 `#D1D5DB`；
  - *亮色模式推荐*：标准正文 `#1A202C` 或 `#2D3748`。
- **次要文本基准**：L5 辅助说明、不可编辑标签与禁用态文本，对比度必须 **$\ge 3.0:1$**，坚决消灭不可见的“隐形灰字”；
- **状态表达禁止单用色彩**：报错、成功或告警等状态，严禁仅依靠红/绿色文字区分，必须同时搭配具象化图标（如 ✅ / ❌ / ⚠️）与文字标签。

### 2. 字重运用与加粗面积控制
- **全屏加粗上限 10% 铁律**：同一视窗内，加粗文字所占面积不得超过正文总面积的 10%；
- **字重语义匹配**：
  - `Regular (400)`：90% 的正文、说明与常规列表项；
  - `Medium (500)`：导航项、按钮文本、表格表头等交互媒介；
  - `Semibold (600)`：模块卡片标题、统计数据关键数字；
  - `Bold (700)`：全屏一级页面主标题。
- **严禁全段加粗**：重点文字仅加粗最核心的 2~6 个字，不得对整个段落施加粗体。

---

## ⚙️ 五、前后端协同约束标准

1. **前端 CSS/Tailwind 统一语义 Token**：
   - 禁用随意手写异构字号（如 `font-size: 13.5px` 或 `font-size: 9px`）；统一使用 Design Tokens（`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`）；
2. **后端富文本与接口校验**：
   - 后端下发富文本时，过滤掉前端非法注入的 `<span style="font-size: 8px">` 等违规样式；
   - 移动端接口下发字体大小配置时，设下限校验门禁（移动端最低 12pt / 24rpx）。

---

## 📐 六、文字布局、对齐、间距与转行排版铁律 (Layout, Alignment & Spacing)

### 1. 黄金单行长度与容器约束 (Line Measure & Container)
- **桌面端 (Web / DMG)**：正文单行文本字符数严格限制在 **45~75 个中文字符**（英文字符 60~85 字），超过此长度必须在 CSS 中限定容器最大宽度（推荐 `max-w-[720px]` 或 `max-w-[65ch]`），严禁通栏全屏无限铺开导致视线迷失；
- **移动端 / 小程序**：单行维持在 **20~35 个中文字符**，页面两侧保留至少 `16px / 32rpx` 的固定安全边距；
- **段落与标题间距比例**：段间距统一设为正文字号的 `1.5~2.0` 倍；标题距上方内容的间距必须是距下方正文间距的 **2~3 倍**（遵循格式塔接近律）。

### 2. 严格文字对齐矩阵 (Text Alignment Matrix)
- **中文正文统一左对齐 (Left-aligned)**：坚决禁止全端中文正文使用非必要“两端对齐 (Justified)”，杜绝英文混排与标点挤压造成的空隙拉扯与视觉白道；
- **数值与财务数据右对齐 (Right-aligned)**：数据表格中的数字、金额、百分比一律靠右对齐并搭配等宽字体，确保小数点与数位垂直对齐，便于纵向比对大小；
- **交互标签居中对齐 (Center-aligned)**：按钮、标签 (Tag)、徽标 (Badge) 文字一律严格水平居中；
- **标题对齐一致性**：标题必须与正文保持相同垂直轴线（左对齐），严禁居中标题与居左正文混排。

### 3. 文字间距与行高系统 (Spacing & Line Height)
- **行高阶梯 (Line Height)**：
  - 正文与常规列表行高锁定为 **`1.5 ~ 1.6`**（如 14px 正文配 22px 行高），保障通透呼吸感；
  - 大标题（L1/L2）行高收紧至 **`1.2 ~ 1.3`**，避免字号放大后标题上下割裂松散；
- **字间距微调 (Letter Spacing / Tracking)**：
  - 中文正文字间距保持 `normal`（或 `0.02em`）；
  - 英文全大写（ALL CAPS）必须强制增加字间距（`0.05em ~ 0.08em`）以防粘连；紧凑数据列使用等宽字体（`font-variant-numeric: tabular-nums`）。

### 4. 智能转行与避头尾法则 (Text Wrapping & Kinsoku Shori)
- **容器防溢出**：全端容器强制配置：
  ```css
  overflow-wrap: break-word;
  word-break: break-word;
  hyphens: auto;
  ```
- **避头尾法则 (Kinsoku Shori)**：
  - 严禁出现在行首的符号：`， 。 ！ ？ 、 ； ： ） 》 】 ” ’ ℃ % ‰`；
  - 严禁出现在行尾的符号：`（ 《 【 “ ‘ ¥ $ #`；
- **杜绝孤字成行 (Widow & Orphan Prevention)**：段落末行若仅剩 1 个字孤悬，必须微调前置文本边距或利用 `text-wrap: pretty;`，严禁孤字单列一行。

