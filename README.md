# 💳 DSH API 余额监控插件（dsh-balance-monitor）

> DeepSeek Harness（DSH）的动态 Cordis 插件：实时监控 DeepSeek API 账户余额，**余额低于你设定的阈值时自动暂停任务并询问用户**，一键跳转开放平台充值。

![badge](https://img.shields.io/badge/platform-DeepSeek%20Harness-blue)
![badge](https://img.shields.io/badge/license-MIT-green)

---

## ✨ 功能特性

- **实时余额监控**：每 60 秒自动向 DeepSeek 查询一次余额，页面每 5 秒自动刷新显示
- **可拖动悬浮余额卡片**：聊天界面上的紧凑胶囊小卡片，可自由拖动、**限制在页面内、拖出界面自动回弹**，位置自动持久化
- **强制检查（自动暂停）**：每个任务步骤前自动检查余额（约 5 分钟节流一次），**余额不足时暂停任务**，弹出「继续任务 / 去充值」选择框
  - 选「继续任务」→ 任务继续，但会提醒后续可能因欠费中断
  - 选「去充值」→ **拦截当前步骤**（不发模型请求、不消耗额度），等充值后重新发送消息即可继续
- **`check_api_balance` 工具**：agent 可随时主动检查余额（支持临时指定阈值、跳过询问）
- **现代化配置页**：设置 → 插件 → 余额监控
  - 大号余额 Hero + 余额/阈值进度条 + 统计磁贴
  - 阈值、充值入口 URL 设置
  - 强制检查 / 聊天卡片 开关（现代滑块样式）
  - 界面配色使用 DSH 主题令牌，**自动适配深浅色主题**
- **配置持久化（宿主级目录）**：阈值、充值入口、开关、卡片位置、历史数据自动保存到**宿主设置目录**（`settings.prepareDocument()` 所在目录，如 `~/.dsh`）的 `dsh-balance-config.json`，**所有会话/工作区共享**，重启不丢失；自动迁移旧的工作区配置文件
- **检查频率可配置**：自动查询间隔（默认 60 秒）与强制检查节流（默认 5 分钟）都可在配置页调整，修改后立即生效
- **余额历史与趋势图**：每次查询自动记录余额历史（同一分钟同值合并、最多 500 条），配置页以 SVG 折线图展示趋势
- **通知提醒**：余额**首次从充足转为不足**时，触发浏览器**系统通知**（Notification API，自动申请授权）+ **提示音**（WebAudio），可在配置页开关
- **系统提示引导**：自动注入提示段，引导 agent 在耗时任务前调用检查工具

## 🧩 工作原理

```
┌─ Host（Node 进程）────────────────────────────────────────────┐
│ · 查询余额：GET https://api.deepseek.com/user/balance          │
│   （Authorization: Bearer <DEEPSEEK_API_KEY>，复用凭据引用）     │
│ · 每 N 秒自动查询（timer 服务，间隔可配置）                        │
│ · agent/pre-step 强制检查（waterfall，余额不足→userQuestions 暂停）│
│ · check_api_balance 动态工具 + 余额历史记录                        │
│ · 配置读写：宿主设置目录 dsh-balance-config.json（fs 服务）         │
└──────────────┬─────────────────────────────────────────────────┘
               │  Package 私有 RPC（balance/state、check、set-config…）
┌──────────────┴─────────────────────────────────────────────────┐
│ ┌ Client（浏览器）──────────────────────────────────────────┐ │
│ │ · shell.overlay 悬浮余额卡片（可拖动/限位/回弹/持久化）      │ │
│ │ · settings.plugins.tab 配置页（主题令牌自适应）              │ │
│ │ · 每 5 秒轮询 Host 状态实现实时更新（timer 服务）            │ │
│ └───────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

**API Key 来源**：插件复用 `DEEPSEEK_API_KEY` 凭据引用（与 DeepSeek LLM/搜索提供方同一密钥，不新增密钥）；每次查询实时解析，在 Models 设置中更换密钥无需重启插件。

## 📦 安装

### 方式三：npm 包 + `dsh plugin add` 一键安装（推荐，可像其他 DSH 插件一样管理）

本仓库已打包为标准的 DSH web profile 插件包（`dsh.bundle.patch` + 宿主/客户端双入口），发布到 npm 后即可：

```bash
# 安装（自动加入 dsh.profile.bundles 组合层）
dsh plugin --profile web add dsh-balance-monitor

# 启动 web 后生效（重启一次 web）
dsh web

# 卸载
dsh plugin --profile web remove dsh-balance-monitor
```

**包结构：**

```
dsh-balance-monitor/
├── package.json          # dsh.bundle.patch + dsh.client（web）+ exports
├── cordis.patch.yml      # 组合补丁：向 profile 插入 balance-monitor 行
├── lib/index.js          # 宿主插件（真实 Cordis API：ctx.tools.register、
│                         #   TypertRemoteService + @Remote 暴露 balance 服务）
├── lib/client.js         # 客户端插件（__ModuleLoader__ 工厂，ctx.remote.balance.*）
└── host.js / client.js   # 动态插件版源码（方式一用）
```

**本地开发调试（无需发布）：**

```bash
dsh plugin --profile web add link:C:\path\to\dsh-balance-monitor
# 源码目录需能解析 @deepseek-ai/* peer 依赖（软链到 $DSH_HOME/profiles/node_modules 即可）
```

**发布到 npm（一次即可，之后所有人可用 `dsh plugin add` 安装）：**

```bash
cd dsh-balance-monitor
npm login        # 首次
npm publish      # 之后改版本号再发
```

### 方式一：动态插件（无需改动宿主配置）

> 动态插件是 DSH 的会话级插件机制，随会话运行，停止后恢复原状；配置（阈值、开关等）会持久化到宿主设置目录。

**步骤：**

1. 打开任意 DSH 会话（Web GUI），确认模型提供商为 DeepSeek；
2. 确保已配置 API Key：**设置 → Models** 中保存 `DEEPSEEK_API_KEY`；
3. 将以下「一键安装指令」发给会话中的 agent（或直接把 `host.js` / `client.js` 的内容作为 `code.host` / `code.client` 传给 agent）：

```text
请帮我安装 dsh-balance-monitor 插件：
1. 用 cordis_define 创建动态插件（idPrefix 使用 "balan"），
   code.host 使用本仓库 host.js 的内容，code.client 使用 client.js 的内容；
2. 定义成功后用 cordis_run 激活；
3. 批准运行授权。
```

4. 批准 `cordis_run` 的授权请求（如需后续免确认可勾选「信任此插件」）。

### 方式二：宿主级常驻（进阶）

`lib/index.js` + `lib/client.js` 已封装为标准 Cordis 插件包（见方式三），直接 `dsh plugin --profile web add dsh-balance-monitor` 即可在所有会话自动启用（无需手动改 cordis.yml——`dsh plugin` 会自动把带 `dsh.bundle` 声明的依赖加入组合层）。

## 🚀 使用说明

### 1. 余额悬浮卡片

- 出现在聊天界面右上角（默认位置），显示：`💳 ¥余额 · 充足/余额不足`
- **拖动**：按住卡片任意位置拖到喜欢的位置，松手自动记住（写入配置文件）
- **限制**：卡片限制在页面可视范围内，窗口缩放导致出界会自动回弹
- **充值**：点击卡片上的「充值」按钮，直接打开充值入口（默认 DeepSeek 开放平台）

### 2. 配置页（设置 → 插件 → 余额监控）

| 配置项 | 说明 | 默认值 |
| --- | --- | --- |
| 余额阈值（元） | 余额低于该值视为「不足」，触发暂停询问与通知 | `10` |
| 自动检查间隔（秒） | Host 自动查询余额的频率（≥10 秒，修改后立即重启定时器） | `60` |
| 强制检查间隔（分钟） | 任务步骤前自动检查的节流间隔（≥1 分钟） | `5` |
| 充值入口 | 「去充值」按钮与提示中使用的充值地址 | `https://platform.deepseek.com/top_up` |
| 强制检查 | 任务步骤前自动检查余额，不足时暂停询问 | `开启` |
| 通知提醒 | 余额首次转低时发出系统通知 + 提示音 | `开启` |
| 聊天余额卡片 | 显示/隐藏悬浮余额卡片 | `开启` |

配置页还包含：大号余额 Hero、余额/阈值进度条、**📈 余额趋势图**（SVG 折线）、API Key/开关状态/最近检查时间统计磁贴。配置保存后立即生效并写入宿主设置目录的 `dsh-balance-config.json`。

### 3. 强制检查（暂停任务）

开启「强制检查」后，**任何任务**的步骤开始前都会自动检查余额（约每 5 分钟一次，避免频繁打扰）：

- 余额 ≥ 阈值 → 正常继续；
- 余额 < 阈值 → **任务暂停**，弹出询问框：
  - **继续任务**：任务继续执行（会提示可能因欠费中断）；
  - **去充值**：当前步骤被拦截（不消耗额度），引导前往充值页；充值完成后重新发送消息即可继续。

### 4. 主动检查（check_api_balance 工具）

agent 在开始耗时的任务（批量处理、长生成、多轮工具调用）前，会自动（或在系统提示引导下）调用：

```
check_api_balance(threshold?: number, ask_if_low?: boolean)
```

- `threshold`：本次检查临时使用的阈值（元），缺省用配置页阈值
- `ask_if_low`：余额不足时是否暂停询问，缺省 `true`

工具返回：`ok / balance / currency / threshold / belowThreshold / action / rechargeUrl / checkedAt / message`。

## ⚙️ 配置文件

插件自动创建并维护**宿主设置目录**（`settings.prepareDocument()` 所在目录，通常为 `~/.dsh`；找不到时回退到工作区）下的 `dsh-balance-config.json`，**跨会话/跨工作区共享**：

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

| 字段 | 含义 |
| --- | --- |
| `threshold` | 余额阈值（元） |
| `rechargeUrl` | 充值入口地址 |
| `forceCheck` | 强制检查开关 |
| `showChatCard` | 聊天余额卡片开关 |
| `notifyLow` | 余额不足通知（系统通知 + 提示音）开关 |
| `autoCheckMs` | 自动查询间隔（毫秒） |
| `forceIntervalMs` | 强制检查节流间隔（毫秒） |
| `history` | 余额历史采样点（最多 500 条，供趋势图） |
| `cardX` / `cardY` | 悬浮卡片位置（像素） |

## ❓ 常见问题

**Q：显示「未配置 DEEPSEEK_API_KEY 凭据」？**
A：在 **设置 → Models** 中保存 DeepSeek API Key。插件每次查询都会实时解析凭据，保存后无需重启。

**Q：余额查询失败（HTTP_FAILED / BAD_JSON）？**
A：确认网络可访问 `https://api.deepseek.com`、API Key 有效。插件通过本机 `curl.exe` 发起请求。

**Q：插件重启后阈值又变回 10 了？**
A：检查配置页底部显示的「配置文件」路径（宿主设置目录 `dsh-balance-config.json`）是否存在且可写。若该目录被清理，配置会恢复默认。

**Q：收不到余额不足的系统通知？**
A：首次触发时浏览器会请求通知权限，请在浏览器地址栏左侧允许；同时确认配置页「通知提醒」开关已开启、页面处于打开状态。

**Q：强制检查会每次都弹窗吗？**
A：不会。强制检查有节流（默认 5 分钟一次）；查询失败时也不会阻塞任务。

**Q：动态插件重启后需要重新授权吗？**
A：首次运行需授权；勾选「信任此插件」后，后续版本免确认。

## 🗺️ Roadmap

**v7 已完成：**
- [x] 配置迁移到宿主设置目录（跨会话/跨工作区共享，自动迁移旧配置）
- [x] 检查频率可配置（自动查询间隔、强制检查节流）
- [x] 余额历史记录 + 配置页趋势图
- [x] 余额不足系统通知 + 提示音（可开关）

**规划中：**
- [ ] 宿主级常驻：封装为宿主 Cordis 插件包并在 `cordis.yml` 挂载，所有会话自动启用（当前为会话级动态插件，配置与数据已跨会话共享）
- [ ] 配置真正接入宿主 settings 命名空间（需 zod schema 支持）
- [ ] 多币种 / 多账户支持
- [ ] 余额每日快照与更长周期趋势（天/周视图）

## 📄 License

[MIT](./LICENSE)
