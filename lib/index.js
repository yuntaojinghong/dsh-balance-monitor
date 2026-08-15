/**
 * dsh-balance-monitor · 宿主插件（npm 包版，供 `dsh plugin --profile web add dsh-balance-monitor` 安装）
 *
 * 与 host.js（动态插件版）功能一致，但使用真实 Cordis API：
 *  - 工具注册：ctx.tools.register(defineTool(...))（@deepseek-ai/dsh-tools）
 *  - 客户端 RPC：TypertRemoteService + @Remote（@deepseek-ai/dsh-typert-protocol），
 *    客户端通过 ctx.remote.balance.<method>() 调用
 *  - 其余服务：ctx.get('subprocess' | 'fs' | 'credentials' | 'settings' | 'userQuestions' | 'systemPrompt')
 */
//#region decorator helpers (TypeScript 标准转译输出，避免原生装饰器语法)
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
//#endregion

import { defineTool } from '@deepseek-ai/dsh-tools';
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';

export const name = 'balance-monitor';
export const inject = ['timer', 'tools'];

/**
 * 提供给客户端（ctx.remote.balance）的 Remote 服务。
 * 方法均委托给 apply 中构造的 deps 闭包。
 */
let BalanceService = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _state_decorators;
    let _check_decorators;
    let _history_decorators;
    let _setConfig_decorators;
    let _rechargeClicked_decorators;
    return class BalanceService extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _state_decorators = [Remote("state")];
            _check_decorators = [Remote("check")];
            _history_decorators = [Remote("history")];
            _setConfig_decorators = [Remote("setConfig")];
            _rechargeClicked_decorators = [Remote("rechargeClicked")];
            __esDecorate(this, null, _state_decorators, {
                kind: "method", name: "state", static: false, private: false,
                access: { has: (obj) => "state" in obj, get: (obj) => obj.state },
                metadata: _metadata
            }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _check_decorators, {
                kind: "method", name: "check", static: false, private: false,
                access: { has: (obj) => "check" in obj, get: (obj) => obj.check },
                metadata: _metadata
            }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _history_decorators, {
                kind: "method", name: "history", static: false, private: false,
                access: { has: (obj) => "history" in obj, get: (obj) => obj.history },
                metadata: _metadata
            }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _setConfig_decorators, {
                kind: "method", name: "setConfig", static: false, private: false,
                access: { has: (obj) => "setConfig" in obj, get: (obj) => obj.setConfig },
                metadata: _metadata
            }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _rechargeClicked_decorators, {
                kind: "method", name: "rechargeClicked", static: false, private: false,
                access: { has: (obj) => "rechargeClicked" in obj, get: (obj) => obj.rechargeClicked },
                metadata: _metadata
            }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, {
                enumerable: true, configurable: true, writable: true,
                value: _metadata
            });
        }
        constructor(ctx, deps) {
            super(ctx, 'balance');
            this.deps = deps;
        }
        async state() { return this.deps.snapshot(); }
        async check() { return this.deps.check(); }
        async history() { return this.deps.history(); }
        async setConfig(args) { return this.deps.setConfig(args); }
        async rechargeClicked() { return this.deps.rechargeClicked(); }
    };
})();

export function apply(ctx) {
    // ---- 状态与持久化配置 ----
    const state = {
        threshold: 10,
        rechargeUrl: 'https://platform.deepseek.com/top_up',
        forceCheck: true,
        showChatCard: true,
        notifyLow: true,
        autoCheckMs: 60000,
        forceIntervalMs: 300000,
        history: [],
        cardX: null,
        cardY: null,
        last: null,
        rechargeIntent: false,
        lastForcedCheck: 0,
    };
    let configTarget = null;
    let configDir = null;
    const configFilename = 'dsh-balance-config.json';

    const sp = ctx.get('sandboxPolicy');
    const workspaceRoot = sp !== undefined && sp.workspaceRoot ? sp.workspaceRoot : undefined;
    const fs = ctx.get('fs');

    async function resolveConfigDir() {
        const settings = ctx.get('settings');
        if (settings !== undefined && settings.prepareDocument) {
            try {
                const doc = await settings.prepareDocument();
                if (typeof doc === 'string' && doc.length > 0) {
                    const idx = Math.max(doc.lastIndexOf('\\'), doc.lastIndexOf('/'));
                    if (idx > 0) return doc.slice(0, idx);
                }
            } catch (e) {
                console.error('[balance-monitor] settings.prepareDocument failed', String(e && e.message || e));
            }
        }
        return workspaceRoot;
    }

    async function readConfigFile(dir) {
        if (fs === undefined || dir === undefined) return null;
        try {
            const target = await fs.resolve(configFilename, { cwd: dir });
            const info = await fs.stat(target);
            if (info === undefined) return null;
            return JSON.parse(await fs.readText(target));
        } catch (e) {
            return null;
        }
    }

    async function loadConfig() {
        if (fs === undefined) return;
        configDir = await resolveConfigDir();
        let data = await readConfigFile(configDir);
        if (data === null && workspaceRoot !== undefined && workspaceRoot !== configDir) {
            data = await readConfigFile(workspaceRoot);
        }
        if (data !== null && typeof data === 'object') {
            if (typeof data.threshold === 'number' && data.threshold >= 0) state.threshold = data.threshold;
            if (typeof data.rechargeUrl === 'string' && /^https?:\/\//.test(data.rechargeUrl)) state.rechargeUrl = data.rechargeUrl;
            if (typeof data.forceCheck === 'boolean') state.forceCheck = data.forceCheck;
            if (typeof data.showChatCard === 'boolean') state.showChatCard = data.showChatCard;
            if (typeof data.notifyLow === 'boolean') state.notifyLow = data.notifyLow;
            if (typeof data.autoCheckMs === 'number' && data.autoCheckMs >= 10000) state.autoCheckMs = Math.round(data.autoCheckMs);
            if (typeof data.forceIntervalMs === 'number' && data.forceIntervalMs > 0) state.forceIntervalMs = Math.round(data.forceIntervalMs);
            if (Array.isArray(data.history)) {
                state.history = data.history.filter((h) => h !== null && typeof h === 'object' && typeof h.t === 'number' && typeof h.balance === 'number');
                if (state.history.length > 500) state.history = state.history.slice(state.history.length - 500);
            }
            if (typeof data.cardX === 'number' && Number.isFinite(data.cardX)) state.cardX = Math.round(data.cardX);
            if (typeof data.cardY === 'number' && Number.isFinite(data.cardY)) state.cardY = Math.round(data.cardY);
        }
        if (configDir !== undefined) {
            try {
                configTarget = await fs.resolve(configFilename, { cwd: configDir });
            } catch (e) {
                configTarget = null;
            }
        }
    }

    async function saveConfig() {
        if (fs === undefined || configTarget === null) return;
        try {
            await fs.writeText(configTarget, JSON.stringify({
                threshold: state.threshold,
                rechargeUrl: state.rechargeUrl,
                forceCheck: state.forceCheck,
                showChatCard: state.showChatCard,
                notifyLow: state.notifyLow,
                autoCheckMs: state.autoCheckMs,
                forceIntervalMs: state.forceIntervalMs,
                history: state.history,
                cardX: state.cardX,
                cardY: state.cardY,
            }, null, 2));
        } catch (e) {
            console.error('[balance-monitor] config save failed', String(e && e.message || e));
        }
    }

    function cwd() {
        const p = ctx.get('sandboxPolicy');
        if (p !== undefined && p.workspaceRoot) return p.workspaceRoot;
        return 'C:\\';
    }

    async function resolveApiKey() {
        const creds = ctx.get('credentials');
        if (creds === undefined) return undefined;
        try {
            const resolved = await creds.resolve('DEEPSEEK_API_KEY');
            return resolved !== undefined && resolved.value.length > 0 ? resolved.value : undefined;
        } catch (e) {
            console.error('[balance-monitor] resolve DEEPSEEK_API_KEY failed', String(e && e.message || e));
            return undefined;
        }
    }

    async function queryBalance() {
        const key = await resolveApiKey();
        if (key === undefined) {
            return { ok: false, reason: 'NO_API_KEY', message: '未配置 DEEPSEEK_API_KEY 凭据，无法查询余额。请在 Models 设置中配置 API Key。' };
        }
        const sub = ctx.get('subprocess');
        if (sub === undefined) {
            return { ok: false, reason: 'NO_SUBPROCESS', message: 'subprocess 服务不可用，无法发起余额查询。' };
        }
        let handle;
        try {
            handle = sub.spawn({
                argv: ['curl.exe', '-sS', '--max-time', '20', '-H', 'Authorization: Bearer ' + key, 'https://api.deepseek.com/user/balance'],
                cwd: cwd(),
                stdio: { stdin: 'ignore', stdout: { maxBytes: 65536 }, stderr: { maxBytes: 8192 } },
                graceMs: 5000,
            });
        } catch (e) {
            return { ok: false, reason: 'SPAWN_FAILED', message: '无法启动余额查询进程：' + String(e && e.message || e) };
        }
        try {
            const outcome = await handle.done;
            const out = handle.collected && handle.collected.stdout ? handle.collected.stdout.readFrom(0).text : '';
            const err = handle.collected && handle.collected.stderr ? handle.collected.stderr.readFrom(0).text : '';
            if (outcome.exitCode !== 0) {
                return { ok: false, reason: 'HTTP_FAILED', exitCode: outcome.exitCode, message: '余额接口请求失败（exit ' + outcome.exitCode + '）：' + String(err).slice(0, 300) };
            }
            let data;
            try {
                data = JSON.parse(out);
            } catch (e) {
                return { ok: false, reason: 'BAD_JSON', message: '余额接口返回了无法解析的内容。', body: String(out).slice(0, 500) };
            }
            const infos = Array.isArray(data.balance_infos) ? data.balance_infos : [];
            const info = infos.find((x) => x && x.currency === 'CNY') || infos[0] || null;
            if (!info) {
                return { ok: false, reason: 'NO_BALANCE_INFO', message: '余额接口未返回 balance_infos。', body: String(out).slice(0, 500) };
            }
            const balance = Number.parseFloat(String(info.total_balance));
            return {
                ok: true,
                balance: Number.isFinite(balance) ? balance : null,
                currency: String(info.currency || ''),
                isAvailable: data.is_available !== false,
                raw: {
                    total: String(info.total_balance),
                    granted: String(info.granted_balance != null ? info.granted_balance : ''),
                    toppedUp: String(info.topped_up_balance != null ? info.topped_up_balance : ''),
                },
                message: '查询成功',
            };
        } catch (e) {
            return { ok: false, reason: 'RUN_FAILED', message: '余额查询失败：' + String(e && e.message || e) };
        }
    }

    function recordHistory(r) {
        if (r === undefined || r.ok !== true || r.balance === null) return;
        const now = Date.now();
        const lastH = state.history[state.history.length - 1];
        if (lastH !== undefined && now - lastH.t < 60000 && Math.abs(lastH.balance - r.balance) < 0.001) return;
        state.history.push({ t: now, balance: r.balance, currency: r.currency || '' });
        if (state.history.length > 500) state.history.splice(0, state.history.length - 500);
    }

    async function doCheck() {
        const r = await queryBalance();
        state.last = Object.assign({}, r, { checkedAt: new Date().toISOString(), threshold: state.threshold });
        recordHistory(r);
        saveConfig();
        return state.last;
    }

    async function snapshot() {
        return {
            threshold: state.threshold,
            rechargeUrl: state.rechargeUrl,
            forceCheck: state.forceCheck,
            showChatCard: state.showChatCard,
            notifyLow: state.notifyLow,
            autoCheckMs: state.autoCheckMs,
            forceIntervalMs: state.forceIntervalMs,
            cardX: state.cardX,
            cardY: state.cardY,
            last: state.last,
            rechargeIntent: state.rechargeIntent,
            keyConfigured: (await resolveApiKey()) !== undefined,
            configPath: configDir !== undefined && configDir !== null ? configDir : workspaceRoot,
            historyCount: state.history.length,
        };
    }

    function setConfig(args) {
        let restartTick = false;
        if (args !== null && typeof args === 'object') {
            if (typeof args.threshold === 'number' && Number.isFinite(args.threshold) && args.threshold >= 0) state.threshold = args.threshold;
            if (typeof args.rechargeUrl === 'string' && /^https?:\/\//.test(args.rechargeUrl.trim())) state.rechargeUrl = args.rechargeUrl.trim();
            if (typeof args.forceCheck === 'boolean') state.forceCheck = args.forceCheck;
            if (typeof args.showChatCard === 'boolean') state.showChatCard = args.showChatCard;
            if (typeof args.notifyLow === 'boolean') state.notifyLow = args.notifyLow;
            if (typeof args.autoCheckMs === 'number' && Number.isFinite(args.autoCheckMs) && args.autoCheckMs >= 10000) {
                state.autoCheckMs = Math.round(args.autoCheckMs);
                restartTick = true;
            }
            if (typeof args.forceIntervalMs === 'number' && Number.isFinite(args.forceIntervalMs) && args.forceIntervalMs >= 60000) state.forceIntervalMs = Math.round(args.forceIntervalMs);
            if (typeof args.cardX === 'number' && Number.isFinite(args.cardX)) state.cardX = Math.max(0, Math.round(args.cardX));
            if (typeof args.cardY === 'number' && Number.isFinite(args.cardY)) state.cardY = Math.max(0, Math.round(args.cardY));
        }
        return saveConfig().then(() => {
            if (restartTick) startAutoTick();
            return snapshot();
        });
    }

    // ---- 自动检查（间隔可配置） ----
    let autoDispose = null;
    function startAutoTick() {
        if (autoDispose) { autoDispose(); autoDispose = null; }
        autoDispose = ctx.interval(() => {
            doCheck().catch((e) => {
                console.error('[balance-monitor] auto balance check failed', String(e && e.message || e));
            });
        }, state.autoCheckMs);
    }

    // 先加载配置再注册（apply 为异步）
    return loadConfig().then(() => {
        startAutoTick();
        ctx.effect(() => () => { if (autoDispose) autoDispose(); });

        // ---- 强制检查：任务步骤前自动检查，余额不足暂停询问 ----
        ctx.on('agent/pre-step', async (payload, next) => {
            if (state.forceCheck !== true) return next();
            const now = Date.now();
            if (now - state.lastForcedCheck < state.forceIntervalMs) return next();
            state.lastForcedCheck = now;
            let result;
            try {
                result = await queryBalance();
            } catch (e) {
                return next();
            }
            if (result === undefined || result.ok !== true || result.balance === null) return next();
            state.last = Object.assign({}, result, { checkedAt: new Date().toISOString(), threshold: state.threshold });
            recordHistory(result);
            if (result.balance >= state.threshold) return next();
            const uq = ctx.get('userQuestions');
            if (uq === undefined) return next();
            try {
                const answer = await uq.ask({
                    agent: payload.agent,
                    signal: payload.signal,
                    questions: [{
                        id: 'balance-low-force',
                        header: 'API 余额不足（强制检查）',
                        question: '当前余额 ' + result.currency + ' ' + result.balance + ' 元，低于设定的阈值 ' + state.threshold + ' 元。任务已暂停，是否继续，还是先去开放平台充值？',
                        detail: '充值入口：' + state.rechargeUrl + '（屏幕上的余额小卡片也有「充值」按钮）',
                        options: [
                            { label: '继续任务', description: '继续执行，但余额不足时后续请求可能因欠费中断。' },
                            { label: '去充值', description: '前往 DeepSeek 开放平台为账户充值。' },
                        ],
                    }],
                });
                const selected = answer && answer.answers && answer.answers[0] && answer.answers[0].selected ? answer.answers[0].selected : [];
                if (selected.indexOf('去充值') !== -1) {
                    state.rechargeIntent = true;
                    return { kind: 'reject' };
                }
                return next();
            } catch (e) {
                return next();
            }
        });

        // ---- 动态工具：check_api_balance ----
        ctx.tools.register(defineTool({
            name: 'check_api_balance',
            description: '检查 DeepSeek API 账户余额。当余额低于设定阈值时，会暂停任务并询问用户是继续还是前往开放平台充值。建议在开始耗时的任务前调用；强制检查开启时任务也会自动检查。',
            parameters: {
                threshold: { type: 'number', description: '本次检查使用的余额阈值（元）。缺省使用插件配置页中设置的阈值。' },
                ask_if_low: { type: 'boolean', description: '余额低于阈值时是否暂停并询问用户（默认 true）。' },
            },
            output: {
                schema: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        ok: { type: 'boolean', required: true },
                        balance: { oneOf: [{ type: 'number' }, { type: 'null' }], required: true },
                        currency: { type: 'string', required: true },
                        threshold: { type: 'number', required: true },
                        belowThreshold: { type: 'boolean', required: true },
                        action: { type: 'string', required: true },
                        rechargeUrl: { type: 'string', required: true },
                        checkedAt: { type: 'string', required: true },
                        message: { type: 'string', required: true },
                        reason: { type: 'string', required: true },
                    },
                },
                render: (args, value) => [{ type: 'text', text: JSON.stringify(value) }],
            },
            async execute(args, exec) {
                const result = await queryBalance();
                const threshold = typeof args.threshold === 'number' && Number.isFinite(args.threshold) ? args.threshold : state.threshold;
                const checkedAt = new Date().toISOString();
                const base = { threshold, checkedAt, rechargeUrl: state.rechargeUrl, reason: result.reason || 'ok' };
                if (!result.ok) {
                    state.last = { ok: false, reason: result.reason, message: result.message, checkedAt, threshold };
                    return Object.assign({}, base, { ok: false, balance: null, currency: '', belowThreshold: false, action: 'report', message: result.message });
                }
                const balance = result.balance;
                const belowThreshold = balance !== null && balance < threshold;
                state.last = { ok: true, balance, currency: result.currency, isAvailable: result.isAvailable, raw: result.raw, checkedAt, threshold, reason: 'ok' };
                recordHistory(result);
                saveConfig();
                let action = belowThreshold ? 'low' : 'ok';
                let message = belowThreshold
                    ? 'API 余额不足：当前 ' + result.currency + ' ' + balance + ' 元，低于设定的阈值 ' + threshold + ' 元。'
                    : 'API 余额充足：当前 ' + result.currency + ' ' + balance + ' 元（阈值 ' + threshold + ' 元）。';
                if (belowThreshold && args.ask_if_low !== false) {
                    const uq = ctx.get('userQuestions');
                    if (uq !== undefined && exec.agent !== undefined) {
                        try {
                            const answer = await uq.ask({
                                agent: exec.agent,
                                signal: exec.signal,
                                questions: [{
                                    id: 'balance-low',
                                    header: 'API 余额不足提醒',
                                    question: message + ' 是否继续当前任务，还是先去开放平台充值？',
                                    detail: '充值入口：' + state.rechargeUrl + '（屏幕上的余额小卡片也有「充值」按钮）',
                                    options: [
                                        { label: '继续任务', description: '继续执行，但余额不足时后续请求可能因欠费中断。' },
                                        { label: '去充值', description: '前往 DeepSeek 开放平台为账户充值。' },
                                    ],
                                }],
                            });
                            const selected = answer && answer.answers && answer.answers[0] && answer.answers[0].selected ? answer.answers[0].selected : [];
                            if (selected.indexOf('去充值') !== -1) {
                                action = 'recharge';
                                state.rechargeIntent = true;
                                message = '用户选择去充值。请提醒用户打开 ' + state.rechargeUrl + ' 完成充值，充值后可再次调用本工具确认余额。';
                            } else {
                                action = 'continue';
                                message = '用户选择继续任务。当前余额低于阈值，请留意后续可能因欠费中断。';
                            }
                        } catch (e) {
                            action = 'low';
                            message = message + '（暂停询问失败：' + String(e && e.message || e) + '，请转告用户自行判断）';
                        }
                    }
                }
                return Object.assign({}, base, { ok: true, balance, currency: result.currency, belowThreshold, action, message });
            },
        }));

        // ---- Remote 服务（供客户端调用） ----
        new BalanceService(ctx, {
            snapshot,
            check: doCheck,
            history: async () => ({ points: state.history.map((h) => ({ t: h.t, balance: h.balance })) }),
            setConfig,
            rechargeClicked: async () => {
                state.rechargeIntent = true;
                return { ok: true, rechargeUrl: state.rechargeUrl };
            },
        });

        // ---- 系统提示 ----
        const sysp = ctx.get('systemPrompt');
        if (sysp !== undefined) {
            sysp.section({
                name: 'balance-guard',
                order: 150,
                text: 'API 余额监控插件已启用：强制检查开启时，任务步骤前会自动检查余额，余额不足会暂停询问用户。另外在开始耗时的任务（批量处理、长生成、多轮工具调用等）之前，也应主动调用 check_api_balance 工具确认余额。',
            });
        }
    });
}
