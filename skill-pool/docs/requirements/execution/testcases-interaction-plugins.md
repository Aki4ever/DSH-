# PKG-008 交互与插件包测试用例

| 字段 | 值 |
| --- | --- |
| 执行包 | PKG-008 |
| 关联需求 | REQ-VISUAL-ZOOMLEVELS-035、REQ-VISUAL-DOWNLOAD-037、REQ-PLUGIN-QUICKCONTROL-036、REQ-SEARCH-MULTISOURCE-038 |
| 需求基线版本 | v0.4.0 |
| 状态 | 全部实跑通过 |

---

## 一、VISUAL-ZOOMLEVELS-035 多级缩放档位

| 用例编号 | 场景 | 命令 / 手段 | 期望 | 实测 |
| --- | --- | --- | --- | --- |
| TC-ZOOMLEVELS-035-01 | 产物暴露档位表 | 解析 `data-zoom-levels` | ≥ 5 档 | ✅ 13 档 |
| TC-ZOOMLEVELS-035-02 | 默认档落在表内 | 解析 `data-zoom-default` | 1.00 ∈ 表 | ✅ 命中 |
| TC-ZOOMLEVELS-035-03 | 档位推进可复算 | 读产物档位表复算 +1/+2/+3 | 第 7/8/9 档 | ✅ 125%/150%/200% |
| TC-ZOOMLEVELS-035-04 | 端点幂等 | 第 13 档再点 `+` | 仍第 13 档 | ✅ |
| TC-ZOOMLEVELS-035-05 | 吸附分支两状态齐备 | grep `pending` / `snapped` | 均命中 | ✅ |
| TC-ZOOMLEVELS-035-06 | **档数不足必须失败** | 夹具缩到 3 档 | `zoom_levels:count` ❌、exit 1 | ✅ |
| TC-ZOOMLEVELS-035-07 | **去掉档位标识必须失败** | 夹具改属性名 | `marker:data-zoom-snap` ❌、exit 1 | ✅ |
| TC-ZOOMLEVELS-035-08 | 三件套未被破坏 | `marker:data-zoom-in/out/reset` | 全命中 | ✅ |

---

## 二、VISUAL-DOWNLOAD-037 下载与目录选择

| 用例编号 | 场景 | 命令 / 手段 | 期望 | 实测 |
| --- | --- | --- | --- | --- |
| TC-DOWNLOAD-037-01 | 下载按钮常显 | grep `data-download` | 命中于工具栏 | ✅ |
| TC-DOWNLOAD-037-02 | 主路径存在 | grep `showSaveFilePicker` | 命中 | ✅ |
| TC-DOWNLOAD-037-03 | 降级路径存在 | grep `createObjectURL` + `download` | 均命中 | ✅ |
| TC-DOWNLOAD-037-04 | 扩展名白名单（图片型） | 图片查看器 `data-download-name` | `png` ∈ 白名单 | ✅ `probe.png` |
| TC-DOWNLOAD-037-05 | 扩展名白名单（海报型） | 信息图 `data-download-name` | `html` ∈ 白名单 | ✅ `gcm-infographic.html` |
| TC-DOWNLOAD-037-06 | **缺主路径必须失败** | 夹具删除 `showSaveFilePicker` | exit 1 | ✅ |
| TC-DOWNLOAD-037-07 | **扩展名越界必须失败** | 夹具改 `.exe` | `filename:extension-whitelist` ❌ | ✅ |
| TC-DOWNLOAD-037-08 | 零外链 | 扫描五类外链模式 | 各 0 处 | ✅ |

---

## 三、PLUGIN-QUICKCONTROL-036 插件常显调控按钮

| 用例编号 | 场景 | 命令 / 手段 | 期望 | 实测 |
| --- | --- | --- | --- | --- |
| TC-QUICKCONTROL-036-01 | 包结构符合宿主契约 | `verify_plugin_button.py` 静态层 | 13 项全过 | ✅ |
| TC-QUICKCONTROL-036-02 | 每（容器,插件 id）恰 1 个按钮 | Node DOM 打桩 A1–A5 | 通过 | ✅ |
| TC-QUICKCONTROL-036-03 | 重复扫描幂等 | Node DOM 打桩 B1–B3 | `created=0` | ✅ |
| TC-QUICKCONTROL-036-04 | 跨容器互不干扰 | Node DOM 打桩 C1–C2 | 各 1 个 | ✅ |
| TC-QUICKCONTROL-036-05 | 无 id 条目绝不注入 | Node DOM 打桩 D1 | `created=0` | ✅ |
| TC-QUICKCONTROL-036-06 | 同容器同名去重 | Node DOM 打桩 E1 | `created=1 dup=1` | ✅ |
| TC-QUICKCONTROL-036-07 | bundle 逐字内联内核 | G2 + `bundle_inlines_core_verbatim` | 通过 | ✅ |
| TC-QUICKCONTROL-036-08 | 装配幂等 | `install_plugin.py --apply` 二次 | `already_installed`、`changed=0` | ✅ |
| TC-QUICKCONTROL-036-09 | 装配有备份 | 检查 `.bak-<时间戳>` | 存在 | ✅ |
| TC-QUICKCONTROL-036-10 | 可回滚 | `--rollback` | 还原并删记录 | ✅（脚本实测） |
| TC-QUICKCONTROL-036-11 | 诚实声明重启 | 输出 `restart_required` | `true` | ✅ |
| TC-QUICKCONTROL-036-12 | **缺 Node 必须退 2** | PATH 去掉 node | exit 2，不降级 | ✅（逻辑断言） |

---

## 四、SEARCH-MULTISOURCE-038 多源检索

| 用例编号 | 场景 | 命令 | 期望 | 实测 |
| --- | --- | --- | --- | --- |
| TC-MULTISOURCE-038-01 | 本地优先短路 | `dispatch_search.py --query 信息图` | `short_circuit=local`、`network_used=false` | ✅ 命中 archify-dsh |
| TC-MULTISOURCE-038-02 | 短路必须留痕 | 同上，看 `skipped_sources` | 三类外部源全列 | ✅ |
| TC-MULTISOURCE-038-03 | 中英同义桥生效 | `--query 信息图` 的 `tokens` | 含 `infographic`/`diagram` 等 | ✅ |
| TC-MULTISOURCE-038-04 | 零命中且未允许外呼 | `--query zzz-nonexistent` | `success=false` + `network_skipped=true` | ✅ exit 1 |
| TC-MULTISOURCE-038-05 | 允许外呼真实检索 | `--allow-network` | 产出候选 | ✅ |
| TC-MULTISOURCE-038-06 | 空查询必须拒绝 | `--online` 无 `--query` | exit 1 + 理由 | ✅ |
| TC-MULTISOURCE-038-07 | 限流不等于空结果 | 连续调用触发 403 | `rate_limited=true`、exit 1 | ✅ |
| TC-MULTISOURCE-038-08 | 两级去重 | `merge_candidates.py` 双输入 | 去重 1 + 剔除 1 | ✅ |
| TC-MULTISOURCE-038-09 | 合并幂等 | 连跑两次 | 逐字节相同 | ✅ |
| TC-MULTISOURCE-038-10 | 空检索不通过 | 输入空候选 | exit 1 | ✅ |
| TC-MULTISOURCE-038-11 | 官网源离线夹具 | `search_official.py --from-file` | 命中 2 条 | ✅ |
| TC-MULTISOURCE-038-12 | 缺来源必须退 2 | 无 domain 无夹具 | exit 2 | ✅ |

---

## 五、全量门禁回归（十四道）

| 门禁 | 结果 |
| --- | --- |
| `skill-pool validate` | ✅ 0 |
| `skill-pool consistency` | ✅ 0 |
| `audit_compliance.py` | ✅ 0 |
| `verify_tree.py` | ✅ 0 |
| `build_layer_graph.py --check` | ✅ 0 |
| `detect_coupling.py` | ✅ 0（组合环 0、逆向依赖 0） |
| `verify_decoupling.py` | ✅ 0 |
| `verify_instance_safety.py` | ✅ C1~C4 全过 |
| `verify_naming.py --strict` | ✅ 合规率 1.0000 |
| `render_naming_spec.py --check` | ✅ 0 漂移 |
| `verify_html.py`（信息图） | ✅ 26/26 |
| `verify_plugin_button.py --all` | ✅ 31/31 |
| `search_skills.py --eval` | ✅ 0 |
| 粒度夹具 + 全池 171 技能 | ✅ bound=0 / unbound --strict=1 / 全池 0 失败 |

`__pycache__` 残留 0。
