/**
 * dsh-balance-monitor · 宿主插件（npm 包版）
 *
 * 以「服务类插件」形式导出（default = BalanceService 类）：
 * loader 实例化时 `super(ctx, 'balance')` 注册服务 + 反射（ctx.reflect.props），
 * 网关据此向客户端暴露 `ctx.remote.balance.*`。
 * 与官方 dsh-commands / dsh-message-feedback 的 TypertRemoteService 模式一致。
 */
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

import { Service } from '@deepseek-ai/cordis';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';

export const name = 'balance-monitor';

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
        static inject = ['timer', 'tools'];

        constructor(ctx) {
            super(ctx, 'balance');
            this.state = {
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
            };
            this.configTarget = null;
            this.configDir = null;
            this.autoDispose = null;
            this.lastForcedCheck = 0;
            this.configFilename = 'dsh-balance-config.json';
        }

        async [Service.init]() {
            await this.loadConfig();
            this.startAutoTick();
            this.ctx.effect(() => () => { if (this.autoDispose) this.autoDispose(); });
            this.ctx.on('agent/pre-step', (payload, next) => this.onPreStep(payload, next));
            this.ctx.tools.register(defineTool({
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
                execute: (args, exec) => this.executeCheck(args, exec),
            }));
            const sysp = this.ctx.get('systemPrompt');
            if (sysp !== undefined) {
                sysp.section({
                    name: 'balance-guard',
                    order: 150,
                    text: 'API 余额监控插件已启用：强制检查开启时，任务步骤前会自动检查余额，余额不足会暂停询问用户。另外在开始耗时的任务（批量处理、长生成、多轮工具调用等）之前，也应主动调用 check_api_balance 工具确认余额。',
                });
            }
        }

        // ---- 配置持久化 ----
        workspaceRoot() {
            const sp = this.ctx.get('sandboxPolicy');
            return sp !== undefined && sp.workspaceRoot ? sp.workspaceRoot : undefined;
        }
        async resolveConfigDir() {
            const settings = this.ctx.get('settings');
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
            return this.workspaceRoot();
        }
        async readConfigFile(dir) {
            const fs = this.ctx.get('fs');
            if (fs === undefined || dir === undefined) return null;
            try {
                const target = await fs.resolve(this.configFilename, { cwd: dir });
                const info = await fs.stat(target);
                if (info === undefined) return null;
                return JSON.parse(await fs.readText(target));
            } catch (e) {
                return null;
            }
        }
        async loadConfig() {
            const fs = this.ctx.get('fs');
            if (fs === undefined) return;
            this.configDir = await this.resolveConfigDir();
            const ws = this.workspaceRoot();
            let data = await this.readConfigFile(this.configDir);
            if (data === null && ws !== undefined && ws !== this.configDir) data = await this.readConfigFile(ws);
            if (data !== null && typeof data === 'object') {
                const s = this.state;
                if (typeof data.threshold === 'number' && data.threshold >= 0) s.threshold = data.threshold;
                if (typeof data.rechargeUrl === 'string' && /^https?:\/\//.test(data.rechargeUrl)) s.rechargeUrl = data.rechargeUrl;
                if (typeof data.forceCheck === 'boolean') s.forceCheck = data.forceCheck;
                if (typeof data.showChatCard === 'boolean') s.showChatCard = data.showChatCard;
                if (typeof data.notifyLow === 'boolean') s.notifyLow = data.notifyLow;
                if (typeof data.autoCheckMs === 'number' && data.autoCheckMs >= 10000) s.autoCheckMs = Math.round(data.autoCheckMs);
                if (typeof data.forceIntervalMs === 'number' && data.forceIntervalMs > 0) s.forceIntervalMs = Math.round(data.forceIntervalMs);
                if (Array.isArray(data.history)) {
                    s.history = data.history.filter((h) => h !== null && typeof h === 'object' && typeof h.t === 'number' && typeof h.balance === 'number');
                    if (s.history.length > 500) s.history = s.history.slice(s.history.length - 500);
                }
                if (typeof data.cardX === 'number' && Number.isFinite(data.cardX)) s.cardX = Math.round(data.cardX);
                if (typeof data.cardY === 'number' && Number.isFinite(data.cardY)) s.cardY = Math.round(data.cardY);
            }
            if (this.configDir !== undefined) {
                try {
                    const fs2 = this.ctx.get('fs');
                    this.configTarget = await fs2.resolve(this.configFilename, { cwd: this.configDir });
                } catch (e) {
                    this.configTarget = null;
                }
            }
        }
        async saveConfig() {
            const fs = this.ctx.get('fs');
            if (fs === undefined || this.configTarget === null) return;
            try {
                await fs.writeText(this.configTarget, JSON.stringify({
                    threshold: this.state.threshold,
                    rechargeUrl: this.state.rechargeUrl,
                    forceCheck: this.state.forceCheck,
                    showChatCard: this.state.showChatCard,
                    notifyLow: this.state.notifyLow,
                    autoCheckMs: this.state.autoCheckMs,
                    forceIntervalMs: this.state.forceIntervalMs,
                    history: this.state.history,
                    cardX: this.state.cardX,
                    cardY: this.state.cardY,
                }, null, 2));
            } catch (e) {
                console.error('[balance-monitor] config save failed', String(e && e.message || e));
            }
        }

        // ---- 余额查询 ----
        cwd() {
            const sp = this.ctx.get('sandboxPolicy');
            if (sp !== undefined && sp.workspaceRoot) return sp.workspaceRoot;
            return 'C:\\';
        }
        async resolveApiKey() {
            const creds = this.ctx.get('credentials');
            if (creds === undefined) return undefined;
            try {
                const resolved = await creds.resolve('DEEPSEEK_API_KEY');
                return resolved !== undefined && resolved.value.length > 0 ? resolved.value : undefined;
            } catch (e) {
                return undefined;
            }
        }
        async queryBalance() {
            const key = await this.resolveApiKey();
            if (key === undefined) {
                return { ok: false, reason: 'NO_API_KEY', message: '未配置 DEEPSEEK_API_KEY 凭据，无法查询余额。请在 Models 设置中配置 API Key。' };
            }
            const sub = this.ctx.get('subprocess');
            if (sub === undefined) {
                return { ok: false, reason: 'NO_SUBPROCESS', message: 'subprocess 服务不可用，无法发起余额查询。' };
            }
            let handle;
            try {
                handle = sub.spawn({
                    argv: ['curl.exe', '-sS', '--max-time', '20', '-H', 'Authorization: Bearer ' + key, 'https://api.deepseek.com/user/balance'],
                    cwd: this.cwd(),
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

        recordHistory(r) {
            if (r === undefined || r.ok !== true || r.balance === null) return;
            const now = Date.now();
            const lastH = this.state.history[this.state.history.length - 1];
            if (lastH !== undefined && now - lastH.t < 60000 && Math.abs(lastH.balance - r.balance) < 0.001) return;
            this.state.history.push({ t: now, balance: r.balance, currency: r.currency || '' });
            if (this.state.history.length > 500) this.state.history.splice(0, this.state.history.length - 500);
        }

        startAutoTick() {
            if (this.autoDispose) { this.autoDispose(); this.autoDispose = null; }
            this.autoDispose = this.ctx.interval(() => {
                this.doCheck().catch((e) => {
                    console.error('[balance-monitor] auto balance check failed', String(e && e.message || e));
                });
            }, this.state.autoCheckMs);
        }

        async doCheck() {
            const r = await this.queryBalance();
            this.state.last = Object.assign({}, r, { checkedAt: new Date().toISOString(), threshold: this.state.threshold });
            this.recordHistory(r);
            this.saveConfig();
            return this.state.last;
        }

        async snapshot() {
            return {
                threshold: this.state.threshold,
                rechargeUrl: this.state.rechargeUrl,
                forceCheck: this.state.forceCheck,
                showChatCard: this.state.showChatCard,
                notifyLow: this.state.notifyLow,
                autoCheckMs: this.state.autoCheckMs,
                forceIntervalMs: this.state.forceIntervalMs,
                cardX: this.state.cardX,
                cardY: this.state.cardY,
                last: this.state.last,
                rechargeIntent: this.state.rechargeIntent,
                keyConfigured: (await this.resolveApiKey()) !== undefined,
                configPath: this.configDir !== undefined && this.configDir !== null ? this.configDir : this.workspaceRoot(),
                historyCount: this.state.history.length,
            };
        }

        async setConfig(args) {
            let restartTick = false;
            if (args !== null && typeof args === 'object') {
                const s = this.state;
                if (typeof args.threshold === 'number' && Number.isFinite(args.threshold) && args.threshold >= 0) s.threshold = args.threshold;
                if (typeof args.rechargeUrl === 'string' && /^https?:\/\//.test(args.rechargeUrl.trim())) s.rechargeUrl = args.rechargeUrl.trim();
                if (typeof args.forceCheck === 'boolean') s.forceCheck = args.forceCheck;
                if (typeof args.showChatCard === 'boolean') s.showChatCard = args.showChatCard;
                if (typeof args.notifyLow === 'boolean') s.notifyLow = args.notifyLow;
                if (typeof args.autoCheckMs === 'number' && Number.isFinite(args.autoCheckMs) && args.autoCheckMs >= 10000) {
                    s.autoCheckMs = Math.round(args.autoCheckMs);
                    restartTick = true;
                }
                if (typeof args.forceIntervalMs === 'number' && Number.isFinite(args.forceIntervalMs) && args.forceIntervalMs >= 60000) s.forceIntervalMs = Math.round(args.forceIntervalMs);
                if (typeof args.cardX === 'number' && Number.isFinite(args.cardX)) s.cardX = Math.max(0, Math.round(args.cardX));
                if (typeof args.cardY === 'number' && Number.isFinite(args.cardY)) s.cardY = Math.max(0, Math.round(args.cardY));
            }
            await this.saveConfig();
            if (restartTick) this.startAutoTick();
            return this.snapshot();
        }

        async onPreStep(payload, next) {
            if (this.state.forceCheck !== true) return next();
            const now = Date.now();
            if (now - this.lastForcedCheck < this.state.forceIntervalMs) return next();
            this.lastForcedCheck = now;
            let result;
            try {
                result = await this.queryBalance();
            } catch (e) {
                return next();
            }
            if (result === undefined || result.ok !== true || result.balance === null) return next();
            this.state.last = Object.assign({}, result, { checkedAt: new Date().toISOString(), threshold: this.state.threshold });
            this.recordHistory(result);
            if (result.balance >= this.state.threshold) return next();
            const uq = this.ctx.get('userQuestions');
            if (uq === undefined) return next();
            try {
                const answer = await uq.ask({
                    agent: payload.agent,
                    signal: payload.signal,
                    questions: [{
                        id: 'balance-low-force',
                        header: 'API 余额不足（强制检查）',
                        question: '当前余额 ' + result.currency + ' ' + result.balance + ' 元，低于设定的阈值 ' + this.state.threshold + ' 元。任务已暂停，是否继续，还是先去开放平台充值？',
                        detail: '充值入口：' + this.state.rechargeUrl + '（屏幕上的余额小卡片也有「充值」按钮）',
                        options: [
                            { label: '继续任务', description: '继续执行，但余额不足时后续请求可能因欠费中断。' },
                            { label: '去充值', description: '前往 DeepSeek 开放平台为账户充值。' },
                        ],
                    }],
                });
                const selected = answer && answer.answers && answer.answers[0] && answer.answers[0].selected ? answer.answers[0].selected : [];
                if (selected.indexOf('去充值') !== -1) {
                    this.state.rechargeIntent = true;
                    return { kind: 'reject' };
                }
                return next();
            } catch (e) {
                return next();
            }
        }

        async executeCheck(args, exec) {
            const result = await this.queryBalance();
            const threshold = typeof args.threshold === 'number' && Number.isFinite(args.threshold) ? args.threshold : this.state.threshold;
            const checkedAt = new Date().toISOString();
            const base = { threshold, checkedAt, rechargeUrl: this.state.rechargeUrl, reason: result.reason || 'ok' };
            if (!result.ok) {
                this.state.last = { ok: false, reason: result.reason, message: result.message, checkedAt, threshold };
                return Object.assign({}, base, { ok: false, balance: null, currency: '', belowThreshold: false, action: 'report', message: result.message });
            }
            const balance = result.balance;
            const belowThreshold = balance !== null && balance < threshold;
            this.state.last = { ok: true, balance, currency: result.currency, isAvailable: result.isAvailable, raw: result.raw, checkedAt, threshold, reason: 'ok' };
            this.recordHistory(result);
            this.saveConfig();
            let action = belowThreshold ? 'low' : 'ok';
            let message = belowThreshold
                ? 'API 余额不足：当前 ' + result.currency + ' ' + balance + ' 元，低于设定的阈值 ' + threshold + ' 元。'
                : 'API 余额充足：当前 ' + result.currency + ' ' + balance + ' 元（阈值 ' + threshold + ' 元）。';
            if (belowThreshold && args.ask_if_low !== false) {
                const uq = this.ctx.get('userQuestions');
                if (uq !== undefined && exec.agent !== undefined) {
                    try {
                        const answer = await uq.ask({
                            agent: exec.agent,
                            signal: exec.signal,
                            questions: [{
                                id: 'balance-low',
                                header: 'API 余额不足提醒',
                                question: message + ' 是否继续当前任务，还是先去开放平台充值？',
                                detail: '充值入口：' + this.state.rechargeUrl + '（屏幕上的余额小卡片也有「充值」按钮）',
                                options: [
                                    { label: '继续任务', description: '继续执行，但余额不足时后续请求可能因欠费中断。' },
                                    { label: '去充值', description: '前往 DeepSeek 开放平台为账户充值。' },
                                ],
                            }],
                        });
                        const selected = answer && answer.answers && answer.answers[0] && answer.answers[0].selected ? answer.answers[0].selected : [];
                        if (selected.indexOf('去充值') !== -1) {
                            action = 'recharge';
                            this.state.rechargeIntent = true;
                            message = '用户选择去充值。请提醒用户打开 ' + this.state.rechargeUrl + ' 完成充值，充值后可再次调用本工具确认余额。';
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
        }

        // ---- Remote 方法（客户端 ctx.remote.balance.*） ----
        async state() { return this.snapshot(); }
        async check() { return this.doCheck(); }
        async history() { return { points: this.state.history.map((h) => ({ t: h.t, balance: h.balance })) }; }
        async rechargeClicked() {
            this.state.rechargeIntent = true;
            return { ok: true, rechargeUrl: this.state.rechargeUrl };
        }
    };
})();

export { BalanceService, BalanceService as default };
