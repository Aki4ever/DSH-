# Unity 结构化工程目录与文件形式全局规范 (Unity Project & File Standard)

> ### 🏷️ **版本信息与实施追踪**
> - **当前文档版本**：`v4.2.0`
> - **对应实施版本**：`v4.2.0`
> - **版本治理规范**：遵循 [`rules/workflow/versioning_standard.md`](../workflow/versioning_standard.md)
> - **最后更新日期**：2026-09-22
> - **版本状态**：`[Release 稳定生效]`

本文档是针对 Unity 游戏工程的**文件形式、目录架构、资产组织与代码规范**的全局最高执行准则。旨在彻底根除资产杂乱、`.meta` 丢失、编译膨胀与模块耦合等顽疾，为后续高效、规范地编写 Unity 业务代码提供坚实底座。

---

## 🔍 一、Unity 常见文件形式与结构痛点审计

在缺乏规范的传统 Unity 项目中，通常存在以下四大核心痛点：
1. **`.meta` 错位与资产悬空**：在文件管理器中粗暴移动或重命名文件，导致伴生 `.meta` 丢失或 GUID 改变，造成 Prefab 丢失材质、脚本丢失引用等“紫块/粉色”灾难；
2. **目录无序混杂**：业务脚本、美术贴图、第三方插件散落于 `Assets/` 根目录下，升级插件时极易误删或污染核心业务；
3. **全局单体程序集重编译过慢**：所有脚本堆在同一程序集（`Assembly-CSharp.dll`），修改一行代码触发全量重新编译，耗时数分钟；
4. **Editor 与 Runtime 强耦合**：在运行期代码中随意调用 `UnityEditor` 命名空间 API，导致打包编译时直接报错崩溃。

---

## 📁 二、工业级标准工程目录结构架构

所有自主研发的业务资产与代码，必须严格收拢在 `Assets/_Project/` 根命名空间下，与第三方插件保持物理物理隔离：

```text
Assets/
├── _Project/                           # 核心业务根空间 (下划线确保置顶且独占)
│   ├── Art/                            # 美术源资源
│   │   ├── Animations/                 # 动画片段与 Animator 控制器
│   │   ├── Materials/                  # 材质球 (.mat)
│   │   ├── Models/                     # 3D 网格模型 (.fbx / .obj)
│   │   ├── Shaders/                    # 着色器源码 (.shader / .hlsl)
│   │   └── Textures/                   # 贴图图片与图集
│   ├── Audio/                          # 音频资产 (BGM, SFX, Voice)
│   ├── Prefabs/                        # 预制体 (分模块归类)
│   │   ├── Characters/                 # 角色实体预制体
│   │   ├── Levels/                     # 关卡拼装块
│   │   ├── Props/                      # 交互物件与道具
│   │   └── UI/                         # 界面面板与悬浮控件
│   ├── Scenes/                         # 场景文件 (.unity)
│   │   ├── 00_Boot.unity               # 初始启动引导场景 (全局常驻)
│   │   ├── 01_MainMenu.unity           # 主界面大厅场景
│   │   └── 02_BattleField.unity        # 核心战斗/关卡场景
│   ├── Scripts/                        # 核心 C# 代码 (按程序集清晰隔离)
│   │   ├── Runtime/                    # 运行时游戏业务逻辑 (.asmdef)
│   │   │   ├── Core/                   # 基础设施、全局工具、基类
│   │   │   ├── Gameplay/               # 战斗玩法、关卡流转、角色控制
│   │   │   ├── UI/                     # UI 表现层与窗口调度
│   │   │   └── Network/                # 网络协议与数据同步
│   │   ├── Editor/                     # 编辑器专属扩展与打包管线 (.asmdef)
│   │   └── Tests/                      # 自动化单元测试与集成测试 (.asmdef)
│   └── Settings/                       # 核心配置文件 (URP, InputActions, Presets)
├── Plugins/                            # 底层原生动态库 (iOS/Android .so/.aar/.dll)
└── ThirdParty/                         # 外部第三方插件 (保持只读，严禁侵入业务)
```

---

## 🛡️ 三、Unity 文件形式与 `.meta` 强一致性铁律

### 1. `.meta` 文件同生共死原则
- Unity 中的每个文件和文件夹都会生成一个同名伴生 `.meta` 文件（包含专属 GUID 标识）；
- **增删改查原子化**：移动、重命名或删除任何资产时，**必须且只能**通过 Unity Editor 内部操作，或在外部同时对 `.meta` 文件进行成对的原子操作，严禁丢下 `.meta` 孤立改动。

### 2. 文本序列化与版本控制 (Version Control)
- 项目 `ProjectSettings/EditorSettings.asset` 必须强制锁定：
  - **Asset Serialization Mode**：`Force Text`（强制纯文本序列化，以便 Git 差异对比与合并）；
  - **Version Control Mode**：`Visible Meta Files`（保持 meta 文件明文可见）。

### 3. Git 忽略与受控边界

| 目录/文件类型 | Git 版本控制状态 | 关键说明 |
| :--- | :---: | :--- |
| `Assets/` (含所有 .meta) | **强制受控 (Tracked)** | 核心资产与代码源头 |
| `Packages/manifest.json` | **强制受控 (Tracked)** | 引擎包管理器依赖树配置文件 |
| `ProjectSettings/` | **强制受控 (Tracked)** | 项目层级设置（Tags, Physics, Quality等） |
| `Library/` | **绝对忽略 (Ignored)** | Unity 本地资产导入缓存，体积巨大且可重新生成 |
| `Temp/` / `Logs/` / `obj/` | **绝对忽略 (Ignored)** | 运行时临时日志与编译中间体 |
| `*.csproj` / `*.sln` | **绝对忽略 (Ignored)** | IDE 自动生成的项目工程描述文件 |

---

## ⚡ 四、C# 脚本架构与代码规范

### 1. 程序集定义 (.asmdef) 强制解耦
- 业务代码严禁全部掉入根程序集；
- 必须在 `Assets/_Project/Scripts/Runtime/` 下创建 `Project.Runtime.asmdef`；
- 在 `Assets/_Project/Scripts/Editor/` 下创建 `Project.Editor.asmdef`，并在 Platforms 中**仅勾选 Editor**，杜绝编辑器代码泄漏至运行包。

### 2. 文件与类命名强一致规约
- **一文件一类**：每个 `.cs` 脚本文件有且仅有一个公开主类或接口，**文件名必须与主类型名称完全一致（区分大小写）**；
- **命名范式**：
  - 类型名、方法名、公开属性：统一使用 **大驼峰法 (PascalCase)**，如 `PlayerController`、`OnHealthChanged`；
  - 私有/保护字段：统一使用 **下划线前缀小驼峰 (_camelCase)**，如 `_moveSpeed`、`_currentHealth`；
  - 接口定义：统一以大写 **`I` 开头**，如 `IDamageable`、`IInitializable`；
  - 常量与只读静态字段：统一大写下划线或 PascalCase，保持团队统一。

### 3. 生命周期与组件协同守则
```csharp
public class PlayerHealth : MonoBehaviour, IDamageable
{
    // 1. 字段声明区 (私有序列化在先，普通私有在后)
    [SerializeField] private int _maxHealth = 100;
    private int _currentHealth;

    // 2. 生命周期事件 (严格按执行时序排列)
    private void Awake()
    {
        // 仅处理自身内部状态初始化
        _currentHealth = _maxHealth;
    }

    private void Start()
    {
        // 处理跨组件或全局依赖的注册与绑定
    }

    private void OnDestroy()
    {
        // 必须显式清理所有注册的委托监听与外部事件，防内存泄漏
    }
}
```

---

## 🚫 五、反模式清单与避坑禁忌

在编写 Unity 代码或提交工程文件时，触碰以下反模式将视为不合格：
1. **严禁无谓的 Find**：禁止在 `Update()` 甚至循环中调用 `GameObject.Find()` 或 `GetComponent()`，必须在 `Awake()` 缓存引用或通过 Inspector 显式挂载；
2. **严禁空生命周期残留**：禁止在脚本中保留空的 `Update()`、`Start()` 函数（即使空方法也会被 Unity 引擎调用，造成无意义的底层跨语言反射开销）；
3. **严禁直接修改 Prefab 源码**：多人在同一 Git 分支修改同一大型 Prefab 极易造成冲突且无法合并，推行 **Prefab Variant (预制体变体)** 机制进行增量扩展。
