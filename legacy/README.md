# legacy/ —— 历史实现归档

这里的代码**不再维护**，仅为兼容旧文档中的安装路径而保留。

## dynamic-plugin/

| 文件 | 说明 |
| --- | --- |
| `host.js` | 早期 `cordis_define` 动态插件版的宿主半边（文件头标注 `v8`） |
| `client.js` | 同上的客户端半边 |

### 为什么不维护了

动态插件版与当前 npm 包版（`lib/`）在通信架构上已经分叉：

| | 动态插件版（本目录） | npm 包版（`lib/`） |
| --- | --- | --- |
| 宿主导出 | `cordis_define` 的 `code.host` 函数体 | `export default { name, inject, apply }` |
| 前后端通信 | typert 远程服务反射 | `webServer` 注册 `/balance-api/*` HTTP JSON 路由 |
| 客户端加载 | `code.client` 函数体 | `__ModuleLoader__` 工厂形态 |
| 配置文件定位 | 仅工作区派生 | 宿主设置目录优先，兼容旧路径并自动迁移 |
| 缺失能力 | 无 `doCheck` / `setConfig` / HTTP 路由 | 完整 |

两者差异较大且都已能独立工作，**强行同步的维护成本高于收益**，因此 v1.0.7 起停止对动态插件版的功能同步：
新功能只进 `lib/`，本目录仅作为「方式二」的历史可复现版本存在。

### 仍然可以用的场景

README「安装方式二」需要把这两份文件的内容交给 agent 通过 `cordis_define` 创建会话级动态插件。
该路径现在指向本目录，行为与早期版本一致——**包含已知的架构差异，需要 HTTP 路由能力的功能不可用**。

新项目请使用 npm 包版：

```bash
dsh plugin --profile web add dsh-balance-monitor
```
