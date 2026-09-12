# Changelog

本文件记录 dsh-balance-monitor 的所有重要变更。
格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.0.8] - 2026-09-13

### Added

- `scripts/verify.js` 自检脚本：语法检查、包清单路径有效性、`cordis.patch.yml` 包名一致性、
  版本号与 CHANGELOG 一致性、源码密钥字面量扫描，`npm run verify` 一键执行。
- GitHub Actions：CI 在 Node 22/24 上跑自检 + `npm pack --dry-run`；
  tag 推送时自动创建 GitHub Release，配置 `NPM_TOKEN` 后一并发布到 npm。
- `CHANGELOG.md`（本文件）。
- README「贡献指南」补充发布前检查步骤。

### Changed

- 早期 `cordis_define` 动态插件版源码 `host.js` / `client.js` 移至
  `legacy/dynamic-plugin/`，并明确标注为**不再维护**——它与 `lib/` 在通信架构上已经分叉
  （typert 远程服务 vs `webServer` HTTP 路由），强行同步的维护成本高于收益。
  新功能只进 `lib/`；README「安装方式二」改为指向新路径。
- README 项目结构表同步更新。

## [1.0.7] - 2026-09

### Added

- 新增总开关 `enabled`：一键停用全部余额监控（停止查询、强制检查与提醒）。
  接入其他模型服务商时不再被打扰，可在配置页或悬浮卡片上切换。

### Security

- **余额查询改用 node 内置 `fetch`，修复 API Key 泄露在进程命令行的问题（P0）。**
  此前通过 `curl.exe` 发起请求，密钥会出现在进程参数中，同机其他进程可读取。

## [1.0.6] - 2026-09

### Fixed

- `apply` 改为 async 并注入 `webServer`，路由同步注册，修复 `/balance-api` 返回 HTML 的问题。

## [1.0.5] - 2026-09

### Changed

- 宿主改为 `webServer` HTTP 路由 + 客户端 `fetch` 通信，绕开 typert 远程服务，
  根治 `remote.balance` 长期 pending 的问题。

## [1.0.4] - 2026-09

### Fixed

- 构造函数运行 `__runInitializers` 标记 `@Remote` 方法，修复网关发现不到 `balance` 远程方法。

## [1.0.3] - 2026-09

### Changed

- 宿主改为服务类插件导出，注册 Remote 服务反射。

## [1.0.2] - 2026-09

### Fixed

- 客户端工厂 `return` 导出对象，修复 web 引导收到 `undefined`；宿主补充 default 导出。

## [1.0.1] - 2026-09

### Added

- 配置持久化到宿主设置目录（跨会话/跨工作区共享），自动迁移旧配置文件。
- 检查频率可配置（自动查询间隔 / 强制检查节流）。
- 余额历史记录（最多 500 个采样点）+ 配置页 SVG 趋势图。
- 余额不足浏览器系统通知 + 提示音（可开关）。

## [1.0.0] - 2026-09

### Added

- 首个版本：实时查询 DeepSeek API 余额（复用 `DEEPSEEK_API_KEY` 凭据）。
- 余额低于阈值时暂停任务并询问用户（继续任务 / 去充值）。
- `check_api_balance` 工具，agent 可主动检查。
- 聊天界面悬浮余额胶囊卡片，可拖动、限位、位置持久化。
- 现代化配置页（Hero / 进度条 / 趋势图 / 统计磁贴），自适应深浅色主题。
