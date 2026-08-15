# 💳 DSH API 余额监控（dsh-balance-monitor）

<p align="center">
  <a href="https://www.npmjs.com/package/dsh-balance-monitor"><img src="https://img.shields.io/npm/v/dsh-balance-monitor" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/dsh-balance-monitor"><img src="https://img.shields.io/npm/dm/dsh-balance-monitor" alt="npm downloads"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License"></a>
  <a href="https://github.com/yuntaojinghong/dsh-balance-monitor"><img src="https://img.shields.io/badge/platform-DeepSeek%20Harness-blue" alt="Platform"></a>
</p>

> DeepSeek Harness（DSH）插件：实时监控 DeepSeek API 账户余额，**余额低于设定阈值时自动暂停任务并询问用户**，支持一键跳转开放平台充值。像其他 DSH 插件一样，一条命令安装。

```bash
dsh plugin --profile web add dsh-balance-monitor
```

---

## 📑 目录

- [功能特性](#-功能特性)
- [快速开始](#-快速开始)
- [安装方式](#-安装方式)
- [使用说明](#-使用说明)
- [配置项](#-配置项)
- [项目结构](#-项目结构)
- [工作原理](#-工作原理)
- [常见问题](#-常见问题)
- [路线图](#-路线图)
- [贡献指南](#-贡献指南)
- [许可证](#-许可证)

---

## ✨ 功能特性

**实时监控**

- 余额实时查询（DeepSeek `/user/balance` 接口，复用 `DEEPSEEK_API_KEY` 凭据）
- 自动检查间隔可配置（默认 60 秒），页面每 5 秒刷新显示
- 余额历史记录（最多 500 个采样点）+ 配置页 **SVG 趋势图**

**余额保护**

- **强制检查**：每个任务步骤前自动检查（节流间隔可配置），余额不足时**暂停任务**并弹出「继续任务 / 去充值」选择框
- 选「去充值」→ 拦截当前步骤（不消耗额度），充值后重新发送即可继续
- **通知提醒**：余额首次从充足转为不足时，浏览器**系统通知** + **提示音**（可开关）
- `check_api_balance` 工具：agent 可随时主动检查（支持临时阈值、跳过询问）

**界面**

- 聊天界面的**悬浮余额胶囊卡片**：实时显示余额与状态、一键去充值；**可自由拖动、限制在页面内、拖出自动回弹**，位置自动持久化
- 现代化配置页（设置 → 插件 → 余额监控）：大号余额 Hero、进度条、趋势图、统计磁贴、开关式切换，配色随 DSH 深浅色主题自适应

**配置**

- 配置持久化到**宿主设置目录**（跨会话/跨工作区共享），自动迁移旧配置文件
- 阈值、充值入口、检查频率、各开关全部可配置

---

## 🚀 快速开始

1. **确认环境**：已安装 [DeepSeek Harness](https://github.com/deepseek-ai/DeepSeek-Harness)，并在 **设置 → Models** 中配置了 DeepSeek API Key
2. **安装**：

   ```bash
   dsh plugin --profile web add dsh-balance-monitor
   ```

3. **激活**：重启 web（`dsh web`）
4. **配置**：打开 设置 → 插件 → 余额监控，设置你的余额阈值（默认 10 元）
5. **完成**：余额不足时任务会自动暂停询问，聊天界面右上角可拖动余额卡片实时显示余额

---

## 📦 安装方式

### 方式一：npm 包一键安装（推荐）

```bash
# 安装（自动加入 dsh.profile.bundles 组合层，无需手动改配置）
dsh plugin --profile web add dsh-balance-monitor

# 更新
dsh plugin --profile web update dsh-balance-monitor

# 卸载
dsh plugin --profile web remove dsh-balance-monitor
```

### 方式二：动态插件（会话级，不落宿主配置）

将下方指令发给任意 DSH 会话中的 agent：

```text
请帮我安装 dsh-balance-monitor 插件：
1. 用 cordis_define 创建动态插件（idPrefix 使用 "balan"），
   code.host 使用本仓库 host.js 的内容，code.client 使用 client.js 的内容；
2. 定义成功后用 cordis_run 激活；
3. 批准运行授权。
```

动态插件随会话运行，会话结束后失效；配置与历史数据仍持久化到宿主设置目录，下次安装自动恢复。

### 方式三：本地开发（link 安装）

```bash
dsh plugin --profile web add link:C:\path\to\dsh-balance-monitor
```

源码目录需能解析 `@deepseek-ai/*` 依赖（将其软链到 `$DSH_HOME/profiles/node_modules` 即可）。

---

## 📖 使用说明

### 余额卡片

- 悬浮于聊天界面，显示 `💳 ¥余额 · 充足/余额不足`
- **拖动**：按住拖到任意位置，松手自动保存；限制在页面内，窗口缩放导致出界会自动回弹
- **充值**：点击「充值」按钮直达充值入口（默认 DeepSeek 开放平台）

### 配置页（设置 → 插件 → 余额监控）

| 配置项 | 说明 | 默认值 |
| --- | --- | --- |
| 余额阈值（元） | 低于该值视为「不足」，触发暂停询问与通知 | `10` |
| 自动检查间隔（秒） | 后台查询余额的频率，修改后立即生效 | `60` |
| 强制检查间隔（分钟） | 任务步骤前自动检查的节流间隔 | `5` |
| 充值入口 | 「去充值」按钮与提示使用的地址 | `https://platform.deepseek.com/top_up` |
| 强制检查 | 任务步骤前自动检查，不足时暂停询问 | `开启` |
| 通知提醒 | 余额转低时系统通知 + 提示音 | `开启` |
| 聊天余额卡片 | 悬浮卡片显示开关 | `开启` |

### 强制检查行为

开启后，任何任务的步骤开始前自动检查余额（按节流间隔）：

- 余额 ≥ 阈值 → 正常继续；
- 余额 < 阈值 → **任务暂停**，弹窗询问：
  - **继续任务** → 任务继续（会提示可能欠费中断）；
  - **去充值** → 拦截该步骤（不消耗额度），引导充值，充值后重新发送消息继续。

### check_api_balance 工具

agent 在耗时任务（批量处理、长生成、多轮工具调用）前会自动（或按系统提示）调用：

```
check_api_balance(threshold?: number, ask_if_low?: boolean)
```

返回：`ok / balance / currency / threshold / belowThreshold / action / rechargeUrl / checkedAt / message`。

---

## ⚙️ 配置项

插件自动维护**宿主设置目录**（`settings.prepareDocument()` 所在目录，通常 `~/.dsh`）下的 `dsh-balance-config.json`，跨会话共享：

```json
{
  "threshold": 10,
  "rechargeUrl": "https://platform.deepseek.com/top_up",
  "forceCheck": true,
  "showChatCard": true,
  "notifyLow": true,
  "autoCheckMs": 60000,
  "forceIntervalMs": 300000,
  "history": [
    { "t": 1737000000000, "balance": 88.5, "currency": "CNY" }
  ],
  "cardX": 1670,
  "cardY": 88
}
```

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `threshold` | number | 余额阈值（元） |
| `rechargeUrl` | string | 充值入口地址 |
| `forceCheck` | boolean | 强制检查开关 |
| `showChatCard` | boolean | 聊天余额卡片开关 |
| `notifyLow` | boolean | 余额不足通知开关 |
| `autoCheckMs` | number | 自动查询间隔（毫秒） |
| `forceIntervalMs` | number | 强制检查节流（毫秒） |
| `history` | array | 余额历史采样点（最多 500 条） |
| `cardX` / `cardY` | number | 悬浮卡片位置（像素） |

---

## 🧩 项目结构

| 文件 | 作用 |
| --- | --- |
| `README.md` | 项目说明（本文档） |
| `package.json` | npm 包清单：声明 `dsh.bundle`（组合补丁）与 `dsh.client`（web 客户端入口） |
| `cordis.patch.yml` | 组合补丁：向 profile 插入 `balance-monitor` 插件行 |
| `lib/index.js` | **宿主插件**：余额查询、强制检查（agent/pre-step）、`check_api_balance` 工具、历史记录、配置持久化；通过 `TypertRemoteService + @Remote` 暴露 `balance` 远程服务 |
| `lib/client.js` | **客户端插件**：悬浮余额卡片、配置页（Hero/进度条/趋势图）、系统通知；经 `ctx.remote.balance.*` 与宿主通信 |
| `host.js` | 动态插件版宿主源码（`cordis_define` 的 `code.host`，安装方式二用） |
| `client.js` | 动态插件版客户端源码（`code.client`） |
| `dsh-balance-config.example.json` | 配置文件示例 |
| `.gitignore` | 忽略运行时配置与依赖目录 |
| `LICENSE` | MIT 许可 |

---

## 🏗️ 工作原理

```
┌─ 宿主（Node 进程）──────────────────────────────────────────────┐
│ · 查询余额：GET https://api.deepseek.com/user/balance             │
│   （Authorization: Bearer <DEEPSEEK_API_KEY>，复用凭据引用）        │
│ · 每 N 秒自动查询（timer，间隔可配置）                             │
│ · agent/pre-step 强制检查（waterfall，余额不足→userQuestions 暂停） │
│ · check_api_balance 动态工具 + 余额历史记录                        │
│ · 配置读写：宿主设置目录 dsh-balance-config.json（fs 服务）         │
└───────────────┬──────────────────────────────────────────────────┘
                │  Typert Remote（ctx.remote.balance.state/check/…）
┌───────────────┴──────────────────────────────────────────────────┐
│ ┌ 客户端（浏览器）─────────────────────────────────────────────┐ │
│ │ · shell.overlay 悬浮余额卡片（可拖动/限位/回弹/持久化）        │ │
│ │ · settings.plugins.tab 配置页（主题令牌自适应 + 趋势图）        │ │
│ │ · 每 5 秒轮询状态（timer）；余额转低→系统通知 + 提示音          │ │
│ └───────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

- **API Key**：复用 `DEEPSEEK_API_KEY` 凭据引用（与 DeepSeek LLM/搜索提供方同一密钥），每次查询实时解析，更换密钥无需重启。
- **零依赖外部服务**：余额请求由宿主经本机 `curl.exe` 发起。

---

## ❓ 常见问题

**Q：显示「未配置 DEEPSEEK_API_KEY 凭据」？**
A：在 **设置 → Models** 中保存 DeepSeek API Key，插件会实时解析凭据，保存后无需重启。

**Q：余额查询失败（HTTP_FAILED / BAD_JSON）？**
A：确认网络可访问 `https://api.deepseek.com` 且 API Key 有效。

**Q：插件重启后配置丢了？**
A：配置保存在宿主设置目录（配置页底部显示具体路径），若该目录被清理则恢复默认。

**Q：收不到余额不足的系统通知？**
A：首次触发时浏览器会请求通知权限，请在地址栏允许；同时确认「通知提醒」开关开启、页面处于打开状态。

**Q：强制检查每次都弹窗吗？**
A：不会。强制检查有节流（默认 5 分钟一次）；查询失败也不会阻塞任务。

**Q：如何卸载？**
A：`dsh plugin --profile web remove dsh-balance-monitor`，重启 web 生效。

---

## 🗺️ 路线图

**已完成（v7）：**

- [x] 配置持久化到宿主设置目录（跨会话共享、自动迁移）
- [x] 检查频率可配置（自动查询 / 强制检查节流）
- [x] 余额历史记录 + 配置页趋势图
- [x] 余额不足系统通知 + 提示音（可开关）
- [x] npm 包化，`dsh plugin add` 一键安装

**规划中：**

- [ ] 余额每日快照与天/周视图趋势
- [ ] 多币种 / 多账户支持
- [ ] 通知策略增强（重复提醒间隔、声音自定义）
- [ ] GitHub Actions 自动发布 npm

---

## 🤝 贡献指南

欢迎提交 Issue 与 Pull Request。

```bash
git clone https://github.com/yuntaojinghong/dsh-balance-monitor.git
cd dsh-balance-monitor

# 语法校验
npm run verify

# 本地联调（link 安装到 DSH web profile）
dsh plugin --profile web add link:$(pwd)
```

改动 `lib/`（npm 包版）与 `host.js` / `client.js`（动态插件版）时请保持两份实现同步。

---

## 📄 许可证

[MIT](./LICENSE) © dsh-balance-monitor contributors
