/**
 * dsh-balance-monitor · Client 半边源码 (v8)
 *
 * 这是 cordis_define 的 `code.client` 参数所需的函数体（返回 Cordis Plugin 对象）。
 * 使用方式见 README.md「安装」章节。
 *
 * 功能（v7）：
 *  - shell.overlay 悬浮余额小卡片：可自由拖动、限制在页面内、拖出界面自动回弹、
 *    位置自动持久化（cardX/cardY 经 balance/set-config 保存）
 *  - 总开关：配置页主开关 + 卡片「停用」按钮；停用后卡片变「点此启用」迷你胶囊
 *  - 余额不足通知：余额首次从充足转为不足时，浏览器系统通知（Notification API）+ 提示音
 *    （WebAudio），由 notifyLow 开关控制，与卡片显隐解耦
 *  - settings.plugins.tab 插件配置页（设置 → 插件 → 余额监控）：
 *    现代化设计（主题令牌 --dsw-alias-* 自适应深浅色）、大号余额 Hero、
 *    余额/阈值进度条、余额趋势图（SVG 折线，数据来自 balance/history）、统计磁贴、
 *    开关式切换、阈值/充值入口/自动检查间隔/强制检查间隔设置
 *  - 每 5 秒轮询 Host 状态（timer 服务）实现实时更新
 */
return {
  apply(ctx) {
    const slots = ctx.get('slots')
    if (slots === undefined) return

    ctx.effect(() => styles.insert(`
.dsh-balance-chip { position: fixed; z-index: 1000; display: flex; align-items: center; gap: 6px; font-size: 11px; line-height: 1; padding: 5px 10px; border: 1px solid rgba(128,128,128,.35); border-radius: 999px; background: rgba(24,24,28,.88); color: #eee; box-shadow: 0 2px 10px rgba(0,0,0,.3); cursor: grab; user-select: none; -webkit-user-select: none; touch-action: none; pointer-events: auto; max-width: 280px; }
.dsh-balance-chip.dragging { cursor: grabbing; opacity: .85; }
.dsh-balance-chip .val { font-weight: 700; }
.dsh-balance-chip .ok { color: #2ecc71; }
.dsh-balance-chip .low { color: #f39c12; font-weight: 700; }
.dsh-balance-chip .err { color: #ff6b6b; }
.dsh-balance-chip .muted { color: rgba(210,210,210,.7); }
.dsh-balance-chip button { pointer-events: auto; cursor: pointer; border: none; background: #f39c12; color: #fff; border-radius: 999px; padding: 2px 8px; font-size: 10px; font-weight: 700; }
.dsh-balance-chip button:hover { background: #e08e0b; }
.dsh-balance-chip button.off-btn { background: rgba(128,128,128,.38); }
.dsh-balance-chip button.off-btn:hover { background: rgba(255,107,107,.85); }
.dsh-balance-chip.off { cursor: pointer; opacity: .82; }
.dsh-balance-chip.off:hover { opacity: 1; }
.dsh-balance-chip .on-hint { color: #4f8cff; font-weight: 700; }

.bal-set { font-size: 13px; line-height: 1.5; color: var(--dsw-alias-label-primary, #e6e6e6); max-width: 620px; }
.bal-set-head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.bal-set-badge { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; background: linear-gradient(135deg, var(--dsw-alias-brand-primary, #4f8cff), #7b5cff); box-shadow: 0 4px 14px rgba(79,140,255,.35); }
.bal-set-title { font-size: 16px; font-weight: 700; margin: 0; }
.bal-set-sub { font-size: 11px; color: var(--dsw-alias-label-secondary, #999); }
.bal-set-live { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: var(--dsw-alias-state-success-primary, #2ecc71); border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.3)); border-radius: 999px; padding: 3px 10px; }
.bal-set-live i { width: 7px; height: 7px; border-radius: 50%; background: currentColor; animation: bal-pulse 1.6s ease-in-out infinite; }
@keyframes bal-pulse { 0%,100% { opacity: 1; } 50% { opacity: .25; } }
.bal-set-live.off { color: var(--dsw-alias-label-secondary, #999); }
.bal-set-live.off i { animation: none; }
.bal-master { display: flex; align-items: center; gap: 14px; border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.3)); border-radius: 14px; padding: 14px 16px; background: var(--dsw-alias-bg-layer-1, rgba(128,128,128,.06)); margin-bottom: 12px; }
.bal-master.off { border-color: var(--dsw-alias-state-warn-primary, #f39c12); }
.bal-master-label { font-size: 14px; font-weight: 700; }
.bal-master .bal-switch { width: 52px; height: 28px; }
.bal-master .bal-switch-thumb { width: 22px; height: 22px; }
.bal-master .bal-switch input:checked + .bal-switch-track .bal-switch-thumb { transform: translateX(24px); }

.bal-hero { border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.3)); border-radius: 16px; padding: 18px; background: var(--dsw-alias-bg-layer-1, rgba(128,128,128,.08)); }
.bal-hero-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.bal-hero-label { font-size: 12px; color: var(--dsw-alias-label-secondary, #999); }
.bal-hero-amount { font-size: 32px; font-weight: 800; letter-spacing: -1px; margin-top: 2px; }
.bal-hero-amount small { font-size: 14px; font-weight: 600; color: var(--dsw-alias-label-secondary, #999); margin-left: 4px; letter-spacing: 0; }
.bal-pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; }
.bal-pill i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.bal-pill.ok { color: var(--dsw-alias-state-success-primary, #2ecc71); background: rgba(46,204,113,.13); }
.bal-pill.low { color: var(--dsw-alias-state-warn-primary, #f39c12); background: rgba(243,156,18,.15); }
.bal-pill.err { color: var(--dsw-alias-state-error-primary, #ff6b6b); background: rgba(255,107,107,.13); }
.bal-pill.muted { color: var(--dsw-alias-label-secondary, #999); background: rgba(128,128,128,.13); }
.bal-bar { height: 7px; border-radius: 999px; background: var(--dsw-alias-bg-layer-2, rgba(128,128,128,.22)); overflow: hidden; margin-top: 14px; }
.bal-bar-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--dsw-alias-brand-primary, #4f8cff), #7b5cff); transition: width .45s ease; }
.bal-bar-fill.low { background: linear-gradient(90deg, var(--dsw-alias-state-warn-primary, #f39c12), #ff7b3d); }
.bal-hero-meta { margin-top: 8px; font-size: 11px; color: var(--dsw-alias-label-secondary, #999); display: flex; gap: 14px; flex-wrap: wrap; }

.bal-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-top: 12px; }
.bal-tile { border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.25)); border-radius: 12px; padding: 10px 12px; background: var(--dsw-alias-bg-layer-1, rgba(128,128,128,.06)); }
.bal-tile-label { font-size: 11px; color: var(--dsw-alias-label-secondary, #999); }
.bal-tile-value { font-size: 14px; font-weight: 700; margin-top: 2px; }
.bal-tile-value small { font-size: 11px; font-weight: 400; color: var(--dsw-alias-label-secondary, #999); margin-left: 3px; }

.bal-section { border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.25)); border-radius: 14px; padding: 0 16px; background: var(--dsw-alias-bg-layer-1, rgba(128,128,128,.06)); margin-top: 12px; }
.bal-field { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.14)); }
.bal-field:last-child { border-bottom: none; }
.bal-field-label { min-width: 96px; font-size: 12px; color: var(--dsw-alias-label-secondary, #999); }
.bal-field input[type=number], .bal-field input[type=url] { flex: 1; min-width: 120px; padding: 7px 11px; border: 1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.4)); border-radius: 9px; background: var(--dsw-alias-bg-base, transparent); color: var(--dsw-alias-label-primary, inherit); font-size: 13px; outline: none; transition: border-color .15s, box-shadow .15s; }
.bal-field input:focus { border-color: var(--dsw-alias-brand-primary, #4f8cff); box-shadow: 0 0 0 3px rgba(79,140,255,.18); }
.bal-field-hint { font-size: 11px; color: var(--dsw-alias-label-secondary, #999); margin-left: auto; }

.bal-switch { position: relative; display: inline-block; width: 40px; height: 22px; flex-shrink: 0; }
.bal-switch input { position: absolute; opacity: 0; width: 0; height: 0; }
.bal-switch-track { position: absolute; inset: 0; border-radius: 999px; background: var(--dsw-alias-bg-layer-2, rgba(128,128,128,.38)); transition: background .2s; cursor: pointer; }
.bal-switch-thumb { position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.3); transition: transform .2s; }
.bal-switch input:checked + .bal-switch-track { background: var(--dsw-alias-brand-primary, #4f8cff); }
.bal-switch input:checked + .bal-switch-track .bal-switch-thumb { transform: translateX(18px); }

.bal-actions { display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap; }
.bal-btn { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; border: 1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.4)); background: var(--dsw-alias-bg-layer-2, rgba(128,128,128,.12)); color: var(--dsw-alias-label-primary, inherit); border-radius: 10px; padding: 8px 18px; font-size: 13px; font-weight: 600; transition: filter .15s, transform .05s; }
.bal-btn:hover { filter: brightness(1.1); }
.bal-btn:active { transform: translateY(1px); }
.bal-btn:disabled { opacity: .5; cursor: default; }
.bal-btn.primary { background: var(--dsw-alias-brand-primary, #4f8cff); border-color: transparent; color: #fff; }
.bal-btn.warn { background: var(--dsw-alias-state-warn-primary, #f39c12); border-color: transparent; color: #fff; }
.bal-foot { margin-top: 14px; font-size: 11px; color: var(--dsw-alias-label-secondary, #999); line-height: 1.7; }
.bal-chart-title { margin: 16px 0 8px; font-size: 13px; font-weight: 700; }
`))

    // 每 5 秒轮询 Host 状态，实现实时更新
    const refreshCbs = new Set()
    const timer = ctx.get('timer')
    if (timer !== undefined) {
      ctx.effect(() => timer.interval(() => {
        refreshCbs.forEach((cb) => { try { cb() } catch (e) {} })
      }, 5000))
    }

    // 通知状态（apply 级共享，避免闭包过期）
    const watch = { prevLow: false }

    function fireLowNotification(s) {
      const msg = 'API 余额不足：当前 ¥' + s.last.balance + '，低于阈值 ¥' + s.threshold
      try {
        if (typeof window !== 'undefined' && typeof window.Notification !== 'undefined') {
          if (window.Notification.permission === 'granted') {
            new window.Notification('💳 API 余额不足', { body: msg })
          } else if (window.Notification.permission !== 'denied') {
            window.Notification.requestPermission().then((p) => {
              if (p === 'granted') new window.Notification('💳 API 余额不足', { body: msg })
            }).catch(() => {})
          }
        }
      } catch (e) {}
      try {
        if (typeof window !== 'undefined' && (typeof window.AudioContext !== 'undefined' || typeof window.webkitAudioContext !== 'undefined')) {
          const AC = window.AudioContext || window.webkitAudioContext
          const ac = new AC()
          const osc = ac.createOscillator()
          const gain = ac.createGain()
          osc.connect(gain)
          gain.connect(ac.destination)
          osc.frequency.value = 880
          gain.gain.setValueAtTime(0.3, ac.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.6)
          osc.start()
          osc.stop(ac.currentTime + 0.6)
        }
      } catch (e) {}
    }

    // ---- 插件配置页 ----
    function SettingsView() {
      const [snap, setSnap] = React.useState(null)
      const [thresholdDraft, setThresholdDraft] = React.useState('')
      const [urlDraft, setUrlDraft] = React.useState('')
      const [enabledDraft, setEnabledDraft] = React.useState(true)
      const [forceDraft, setForceDraft] = React.useState(true)
      const [cardDraft, setCardDraft] = React.useState(true)
      const [notifyDraft, setNotifyDraft] = React.useState(true)
      const [autoSecDraft, setAutoSecDraft] = React.useState('60')
      const [forceMinDraft, setForceMinDraft] = React.useState('5')
      const [history, setHistory] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState(null)

      const refreshState = () => {
        host.call('balance/state').then((s) => {
          setSnap(s)
          if (s !== null && typeof s === 'object' && typeof s.enabled === 'boolean') setEnabledDraft(s.enabled)
          setError(null)
          setBusy(false)
        }).catch((e) => {
          setError('无法读取状态：' + String(e && e.message || e))
          setBusy(false)
        })
      }
      const loadHistory = () => {
        host.call('balance/history').then((h) => {
          if (h !== null && typeof h === 'object' && h.points) setHistory(h.points)
        }).catch(() => {})
      }

      React.useEffect(() => {
        refreshCbs.add(refreshState)
        host.call('balance/state').then((s) => {
          setSnap(s)
          if (s !== null && typeof s === 'object') {
            if (typeof s.enabled === 'boolean') setEnabledDraft(s.enabled)
            if (s.threshold != null) setThresholdDraft(String(s.threshold))
            if (s.rechargeUrl) setUrlDraft(s.rechargeUrl)
            if (typeof s.forceCheck === 'boolean') setForceDraft(s.forceCheck)
            if (typeof s.showChatCard === 'boolean') setCardDraft(s.showChatCard)
            if (typeof s.notifyLow === 'boolean') setNotifyDraft(s.notifyLow)
            if (s.autoCheckMs != null) setAutoSecDraft(String(Math.round(s.autoCheckMs / 1000)))
            if (s.forceIntervalMs != null) setForceMinDraft(String(Math.round(s.forceIntervalMs / 60000)))
          }
        }).catch((e) => {
          setError('无法读取状态：' + String(e && e.message || e))
        })
        loadHistory()
        return () => { refreshCbs.delete(refreshState) }
      }, [])

      const checkNow = () => {
        setBusy(true)
        host.call('balance/check').then(() => { refreshState(); loadHistory() }).catch((e) => {
          setError('检查失败：' + String(e && e.message || e))
          setBusy(false)
        })
      }
      const saveAll = () => {
        setBusy(true)
        host.call('balance/set-config', {
          threshold: thresholdDraft !== '' ? Number(thresholdDraft) : undefined,
          rechargeUrl: urlDraft,
          forceCheck: forceDraft,
          showChatCard: cardDraft,
          notifyLow: notifyDraft,
          autoCheckMs: autoSecDraft !== '' ? Number(autoSecDraft) * 1000 : undefined,
          forceIntervalMs: forceMinDraft !== '' ? Number(forceMinDraft) * 60000 : undefined,
        }).then(() => { refreshState(); loadHistory() }).catch((e) => {
          setError('保存失败：' + String(e && e.message || e))
          setBusy(false)
        })
      }
      const toggleMaster = (checked) => {
        setEnabledDraft(checked)
        setBusy(true)
        host.call('balance/set-config', { enabled: checked }).then(() => { refreshState(); loadHistory() }).catch((e) => {
          setError('保存失败：' + String(e && e.message || e))
          setBusy(false)
        })
      }
      const goRecharge = () => {
        host.call('balance/recharge-clicked').then(() => refreshState()).catch(() => {})
        if (typeof window !== 'undefined' && snap !== null && typeof snap === 'object' && snap.rechargeUrl) {
          window.open(snap.rechargeUrl, '_blank', 'noopener,noreferrer')
        }
      }

      const last = snap !== null && typeof snap === 'object' ? snap.last : null
      const enabledNow = snap === null || typeof snap !== 'object' || snap.enabled !== false
      let status = { text: enabledNow ? '等待首次查询' : '总开关已关闭', cls: 'muted' }
      if (error) status = { text: error, cls: 'err' }
      else if (!enabledNow) status = { text: '已停用', cls: 'muted' }
      else if (snap !== null && snap.keyConfigured === false) status = { text: '未配置 API Key', cls: 'err' }
      else if (last !== null && last.ok === false) status = { text: '查询失败', cls: 'err' }
      else if (last !== null && last.balance != null) {
        const thr = snap !== null && typeof snap === 'object' && snap.threshold != null ? snap.threshold : 0
        status = last.balance < thr
          ? { text: '余额不足，建议充值', cls: 'low' }
          : { text: '余额充足', cls: 'ok' }
      }
      const balanceText = last !== null && last.balance != null ? last.balance : null
      const thr = snap !== null && typeof snap === 'object' && snap.threshold != null ? snap.threshold : 0
      const pct = balanceText !== null && thr > 0 ? Math.min(100, Math.round(balanceText / thr * 100)) : (balanceText !== null ? 100 : 0)
      const checkedText = last !== null && last.checkedAt ? new Date(last.checkedAt).toLocaleString() : '—'
      const keyCfgText = snap !== null && typeof snap === 'object' && snap.keyConfigured === true ? '已配置' : '未配置'
      const autoSec = snap !== null && typeof snap === 'object' && snap.autoCheckMs != null ? Math.round(snap.autoCheckMs / 1000) : 60
      const forceMin = snap !== null && typeof snap === 'object' && snap.forceIntervalMs != null ? Math.round(snap.forceIntervalMs / 60000) : 5

      // 趋势图
      let chart = React.createElement('div', { className: 'bal-set-sub' }, '暂无足够历史数据（会自动记录每次查询）')
      if (history !== null && history.length >= 2) {
        const w = 600, h = 96, pad = 6
        let mn = Infinity, mx = -Infinity
        history.forEach((p) => { if (p.balance < mn) mn = p.balance; if (p.balance > mx) mx = p.balance })
        if (mx - mn < 0.5) mx = mn + 0.5
        const px = (i) => pad + i / (history.length - 1) * (w - pad * 2)
        const py = (v) => h - pad - (v - mn) / (mx - mn) * (h - pad * 2)
        const pts = history.map((p, i) => px(i).toFixed(1) + ',' + py(p.balance).toFixed(1)).join(' ')
        const lastPt = history[history.length - 1]
        const low = lastPt.balance < thr
        const color = low ? '#f39c12' : '#4f8cff'
        chart = React.createElement('div', null,
          React.createElement('svg', { viewBox: '0 0 ' + w + ' ' + h, style: { width: '100%', height: h + 'px' }, preserveAspectRatio: 'none' },
            React.createElement('polyline', { points: pts, fill: 'none', stroke: color, strokeWidth: 2, strokeLinejoin: 'round', strokeLinecap: 'round' }),
            React.createElement('circle', { cx: px(history.length - 1), cy: py(lastPt.balance), r: 3, fill: color }),
          ),
          React.createElement('div', { className: 'bal-hero-meta' },
            React.createElement('span', null, '最新 ¥' + lastPt.balance),
            React.createElement('span', null, '区间 ¥' + Number(mn.toFixed(2)) + ' ~ ¥' + Number(mx.toFixed(2))),
            React.createElement('span', null, history.length + ' 个采样点'),
          ),
        )
      }

      return React.createElement('div', { className: 'bal-set' },
        React.createElement('div', { className: 'bal-set-head' },
          React.createElement('div', { className: 'bal-set-badge' }, '💳'),
          React.createElement('div', null,
            React.createElement('h3', { className: 'bal-set-title' }, 'API 余额监控'),
            React.createElement('div', { className: 'bal-set-sub' }, 'DeepSeek 账户余额实时监控与充值提醒'),
          ),
          React.createElement('span', { className: 'bal-set-live' + (enabledNow ? '' : ' off') }, React.createElement('i', null), enabledNow ? '实时' : '已停用'),
        ),

        React.createElement('div', { className: 'bal-master' + (enabledDraft ? '' : ' off') },
          React.createElement('div', null,
            React.createElement('div', { className: 'bal-master-label' }, '启用余额监控（总开关）'),
            React.createElement('div', { className: 'bal-set-sub' }, '关闭后：不再查询余额、不拦截任务、不弹提醒。接入其他模型服务商时可关闭。'),
          ),
          React.createElement('label', { className: 'bal-switch', title: '余额监控总开关' },
            React.createElement('input', { type: 'checkbox', checked: enabledDraft, onChange: (e) => toggleMaster(e.target.checked) }),
            React.createElement('span', { className: 'bal-switch-track' }, React.createElement('span', { className: 'bal-switch-thumb' })),
          ),
        ),

        React.createElement('div', { className: 'bal-hero' },
          React.createElement('div', { className: 'bal-hero-top' },
            React.createElement('div', null,
              React.createElement('div', { className: 'bal-hero-label' }, '当前余额'),
              React.createElement('div', { className: 'bal-hero-amount' },
                balanceText !== null ? '¥' + balanceText : '—',
                React.createElement('small', null, last !== null && last.currency ? last.currency : ''),
              ),
            ),
            React.createElement('span', { className: 'bal-pill ' + status.cls }, React.createElement('i', null), status.text),
          ),
          React.createElement('div', { className: 'bal-bar' },
            React.createElement('div', { className: 'bal-bar-fill' + (status.cls === 'low' ? ' low' : ''), style: { width: pct + '%' } }),
          ),
          React.createElement('div', { className: 'bal-hero-meta' },
            React.createElement('span', null, '阈值 ¥' + thr),
            React.createElement('span', null, '已用阈值比例 ' + pct + '%'),
            React.createElement('span', null, '自动检查：每 ' + autoSec + ' 秒'),
          ),
        ),

        React.createElement('div', { className: 'bal-chart-title' }, '📈 余额趋势'),
        chart,

        React.createElement('div', { className: 'bal-grid' },
          React.createElement('div', { className: 'bal-tile' },
            React.createElement('div', { className: 'bal-tile-label' }, 'API Key'),
            React.createElement('div', { className: 'bal-tile-value ' + (keyCfgText === '已配置' ? 'ok' : 'err') }, keyCfgText),
          ),
          React.createElement('div', { className: 'bal-tile' },
            React.createElement('div', { className: 'bal-tile-label' }, '强制检查'),
            React.createElement('div', { className: 'bal-tile-value' }, forceDraft ? '开启' : '关闭'),
          ),
          React.createElement('div', { className: 'bal-tile' },
            React.createElement('div', { className: 'bal-tile-label' }, '聊天卡片'),
            React.createElement('div', { className: 'bal-tile-value' }, cardDraft ? '显示' : '隐藏'),
          ),
          React.createElement('div', { className: 'bal-tile' },
            React.createElement('div', { className: 'bal-tile-label' }, '最近检查'),
            React.createElement('div', { className: 'bal-tile-value' }, React.createElement('small', null, checkedText)),
          ),
        ),

        React.createElement('div', { className: 'bal-section' },
          React.createElement('div', { className: 'bal-field' },
            React.createElement('span', { className: 'bal-field-label' }, '余额阈值'),
            React.createElement('input', { type: 'number', min: '0', step: '1', value: thresholdDraft, onChange: (e) => setThresholdDraft(e.target.value), placeholder: '10' }),
            React.createElement('span', { className: 'bal-field-hint' }, '元'),
          ),
          React.createElement('div', { className: 'bal-field' },
            React.createElement('span', { className: 'bal-field-label' }, '自动检查间隔'),
            React.createElement('input', { type: 'number', min: '10', step: '10', value: autoSecDraft, onChange: (e) => setAutoSecDraft(e.target.value) }),
            React.createElement('span', { className: 'bal-field-hint' }, '秒'),
          ),
          React.createElement('div', { className: 'bal-field' },
            React.createElement('span', { className: 'bal-field-label' }, '强制检查间隔'),
            React.createElement('input', { type: 'number', min: '1', step: '1', value: forceMinDraft, onChange: (e) => setForceMinDraft(e.target.value) }),
            React.createElement('span', { className: 'bal-field-hint' }, '分钟'),
          ),
          React.createElement('div', { className: 'bal-field' },
            React.createElement('span', { className: 'bal-field-label' }, '充值入口'),
            React.createElement('input', { type: 'url', value: urlDraft, onChange: (e) => setUrlDraft(e.target.value), placeholder: 'https://platform.deepseek.com/top_up' }),
          ),
        ),

        React.createElement('div', { className: 'bal-section' },
          React.createElement('div', { className: 'bal-field' },
            React.createElement('label', { className: 'bal-switch' },
              React.createElement('input', { type: 'checkbox', checked: forceDraft, onChange: (e) => setForceDraft(e.target.checked) }),
              React.createElement('span', { className: 'bal-switch-track' }, React.createElement('span', { className: 'bal-switch-thumb' })),
            ),
            React.createElement('div', null,
              React.createElement('div', null, '强制检查'),
              React.createElement('div', { className: 'bal-set-sub' }, '任务步骤前自动查余额，不足时暂停询问'),
            ),
          ),
          React.createElement('div', { className: 'bal-field' },
            React.createElement('label', { className: 'bal-switch' },
              React.createElement('input', { type: 'checkbox', checked: notifyDraft, onChange: (e) => setNotifyDraft(e.target.checked) }),
              React.createElement('span', { className: 'bal-switch-track' }, React.createElement('span', { className: 'bal-switch-thumb' })),
            ),
            React.createElement('div', null,
              React.createElement('div', null, '通知提醒'),
              React.createElement('div', { className: 'bal-set-sub' }, '余额首次低于阈值时发出系统通知与提示音（需浏览器授权）'),
            ),
          ),
          React.createElement('div', { className: 'bal-field' },
            React.createElement('label', { className: 'bal-switch' },
              React.createElement('input', { type: 'checkbox', checked: cardDraft, onChange: (e) => setCardDraft(e.target.checked) }),
              React.createElement('span', { className: 'bal-switch-track' }, React.createElement('span', { className: 'bal-switch-thumb' })),
            ),
            React.createElement('div', null,
              React.createElement('div', null, '聊天余额卡片'),
              React.createElement('div', { className: 'bal-set-sub' }, '显示可拖动的余额小卡片，限制在页面内，拖出界面自动回弹'),
            ),
          ),
        ),

        React.createElement('div', { className: 'bal-actions' },
          React.createElement('button', { className: 'bal-btn', disabled: busy || !enabledNow, onClick: checkNow }, '↻ 立即检查'),
          React.createElement('button', { className: 'bal-btn primary', disabled: busy, onClick: saveAll }, '保存设置'),
          React.createElement('button', { className: 'bal-btn warn', disabled: busy, onClick: goRecharge }, '去充值 ↗'),
        ),

        React.createElement('div', { className: 'bal-foot' },
          error ? React.createElement('div', { className: 'err' }, error) : null,
          snap !== null && typeof snap === 'object' && snap.configPath
            ? React.createElement('div', null, '配置文件：' + snap.configPath + '（宿主级目录，跨会话共享）')
            : null,
        ),
      )
    }

    // ---- 聊天界面余额小卡片（悬浮、可拖动、限位回弹）+ 余额不足通知 ----
    function ChatCard() {
      const [snap, setSnap] = React.useState(null)
      const [pos, setPos] = React.useState(null)
      const [dragging, setDragging] = React.useState(false)
      const [size, setSize] = React.useState(null)
      const dragMoved = React.useRef(false)

      const clampToViewport = (x, y, w, h) => {
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
        const vh = typeof window !== 'undefined' ? window.innerHeight : 800
        const m = 8
        const cw = w && w > 0 ? w : 200
        const ch = h && h > 0 ? h : 30
        const maxX = Math.max(m, vw - cw - m)
        const maxY = Math.max(m, vh - ch - m)
        return { x: Math.min(Math.max(x, m), maxX), y: Math.min(Math.max(y, m), maxY) }
      }

      const refreshState = () => {
        host.call('balance/state').then((s) => {
          setSnap(s)
          // 余额首次转低：系统通知 + 提示音
          const lowNow = s !== null && typeof s === 'object' && s.enabled !== false && s.notifyLow === true && s.last !== null && s.last.ok === true && s.last.balance != null && s.last.balance < s.threshold
          if (lowNow && !watch.prevLow) fireLowNotification(s)
          watch.prevLow = lowNow === true
        }).catch(() => {})
      }

      React.useEffect(() => {
        refreshCbs.add(refreshState)
        host.call('balance/state').then((s) => {
          setSnap(s)
          if (s !== null && typeof s === 'object' && typeof s.cardX === 'number' && typeof s.cardY === 'number') {
            const c = clampToViewport(s.cardX, s.cardY)
            setPos(c)
            if (c.x !== s.cardX || c.y !== s.cardY) {
              host.call('balance/set-config', { cardX: c.x, cardY: c.y }).catch(() => {})
            }
          } else if (typeof window !== 'undefined') {
            setPos(clampToViewport(Math.max(12, window.innerWidth - 250), 88))
          }
          const lowNow = s !== null && typeof s === 'object' && s.enabled !== false && s.notifyLow === true && s.last !== null && s.last.ok === true && s.last.balance != null && s.last.balance < s.threshold
          if (lowNow && !watch.prevLow) fireLowNotification(s)
          watch.prevLow = lowNow === true
        }).catch(() => {})
        return () => { refreshCbs.delete(refreshState) }
      }, [])

      // 窗口尺寸变化时，若卡片落在界面外则自动回弹并保存
      React.useEffect(() => {
        const onResize = () => {
          setPos((p) => {
            if (p === null) return p
            const c = clampToViewport(p.x, p.y, size !== null ? size.w : undefined, size !== null ? size.h : undefined)
            if (c.x !== p.x || c.y !== p.y) {
              host.call('balance/set-config', { cardX: c.x, cardY: c.y }).catch(() => {})
              return c
            }
            return p
          })
        }
        if (typeof window !== 'undefined') {
          window.addEventListener('resize', onResize)
          return () => { window.removeEventListener('resize', onResize) }
        }
      })

      if (snap === null || snap.showChatCard !== true || pos === null) return null

      if (snap.enabled === false) {
        return React.createElement('div', {
          className: 'dsh-balance-chip off',
          style: { left: pos.x + 'px', top: pos.y + 'px' },
          title: '余额监控已停用，点击重新启用',
          onPointerDown: onPointerDown,
          onClick: () => {
            if (dragMoved.current) { dragMoved.current = false; return }
            toggleEnabled(true)
          },
        },
          React.createElement('span', null, '💤'),
          React.createElement('span', { className: 'muted' }, '余额监控已停用'),
          React.createElement('span', { className: 'on-hint' }, '点此启用'),
        )
      }

      const last = snap.last
      let cls = 'muted'
      let text = '尚未查询'
      if (last !== null && last.ok === false) { cls = 'err'; text = '查询失败' }
      else if (last !== null && last.balance != null) {
        cls = last.balance < snap.threshold ? 'low' : 'ok'
        text = cls === 'low' ? '余额不足' : '充足'
      }
      const balanceText = last !== null && last.balance != null ? '¥' + last.balance : '—'

      const goRecharge = () => {
        if (typeof window !== 'undefined' && snap.rechargeUrl) window.open(snap.rechargeUrl, '_blank', 'noopener,noreferrer')
      }

      const toggleEnabled = (next) => {
        host.call('balance/set-config', { enabled: next }).then((s) => {
          if (s !== null && typeof s === 'object') setSnap(s)
        }).catch(() => {})
      }

      const onPointerDown = (e) => {
        if (e.button !== 0) return
        e.preventDefault()
        const rect = e.currentTarget.getBoundingClientRect()
        setSize({ w: rect.width, h: rect.height })
        dragMoved.current = false
        const startX = e.clientX
        const startY = e.clientY
        const baseX = pos.x
        const baseY = pos.y
        setDragging(true)
        const move = (ev) => {
          if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) > 6) dragMoved.current = true
          const c = clampToViewport(baseX + ev.clientX - startX, baseY + ev.clientY - startY, rect.width, rect.height)
          setPos(c)
        }
        const up = (ev) => {
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', up)
          setDragging(false)
          const c = clampToViewport(baseX + ev.clientX - startX, baseY + ev.clientY - startY, rect.width, rect.height)
          host.call('balance/set-config', { cardX: Math.round(c.x), cardY: Math.round(c.y) }).catch(() => {})
        }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
      }

      return React.createElement('div', {
        className: 'dsh-balance-chip' + (dragging ? ' dragging' : ''),
        style: { left: pos.x + 'px', top: pos.y + 'px' },
        title: '拖动可移动位置（限制在页面内）',
        onPointerDown: onPointerDown,
      },
        React.createElement('span', null, '💳'),
        React.createElement('span', { className: 'val ' + cls }, balanceText),
        React.createElement('span', { className: cls }, text),
        React.createElement('button', {
          className: 'off-btn',
          title: '停用余额监控（接入其他模型服务商时建议关闭）',
          onPointerDown: (e) => e.stopPropagation(),
          onClick: () => toggleEnabled(false),
        }, '停用'),
        React.createElement('button', {
          onPointerDown: (e) => e.stopPropagation(),
          onClick: goRecharge,
        }, '充值'),
      )
    }

    slots.inject('shell.overlay', () => slots.register(
      { name: 'shell.overlay', id: 'balance-card', order: 20 },
      () => React.createElement(ChatCard, null),
    ))

    slots.inject('settings.plugins.tab', () => slots.register(
      { name: 'settings.plugins.tab', id: 'balance-monitor', order: 20, label: '余额监控' },
      () => React.createElement(SettingsView, null),
    ))
  },
}
