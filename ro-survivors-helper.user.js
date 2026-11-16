// ==UserScript==
// @name         RO 倖存者：三系法術與寶箱助手
// @namespace    ro-survivors-local-helper
// @version      1.4.0
// @description  ro-survivors.com 多語系適配：三系法術、避怪拾取、寶箱優先級、放逐、重複遠征與背景掛機。
// @match        https://ro-survivors.com/*
// @run-at       document-start
// @grant        none
// @sandbox      raw
// @noframes
// @homepageURL  https://github.com/rzj0506/auto-ro-survivors
// @updateURL    https://raw.githubusercontent.com/rzj0506/auto-ro-survivors/userscript-release/ro-survivors-helper.meta.js
// @downloadURL  https://raw.githubusercontent.com/rzj0506/auto-ro-survivors/userscript-release/ro-survivors-helper.user.js
// ==/UserScript==

(() => {
  'use strict';
  const VERSION = '1.4.0';
  const BASIC_ANY = '__basic__';
  const FIXED = ['firebolt', 'coldbolt', 'lightning'];
  const SLOT_NAMES = { potion: '藥水', elixir: '秘藥', blessing: '祝福', dish: '料理', deity: '神格' };
  const SKILL_NAMES = { firebolt: '火箭術', coldbolt: '冰箭術', lightning: '雷擊術' };
  const STAGES = [
    ['prontera', '普隆德拉原野'], ['sewer', '普隆德拉地下水道'], ['sunken', '失事輪'], ['byalan', '柏伊亞嵐島'],
    ['payon', '斐揚森林'], ['payon_cave', '斐揚洞穴'], ['prt_castle', '普隆德拉城'], ['orcs', '獸人村'],
    ['pyramid', '夢羅克金字塔'], ['louyang', '洛陽燈籠節'],
  ];
  const ITEM_NAMES = {
    p_regen: '回復藥水', p_cd: '冷卻藥水', p_hp: '生命藥水', p_armor: '護甲藥水', p_area: '範圍藥水', p_pickup: '採集藥水', p_greed: '貪婪藥水', p_speed: '速度藥水', p_cast: '詠唱藥水', p_reach: '近戰範圍藥水', p_dmg: '傷害藥水',
    e_crit: '爆擊秘藥', e_dmg: '傷害秘藥', e_hp: '生命秘藥', e_critdmg: '爆擊傷害秘藥', e_surprise: '驚奇秘藥', e_dot: '持續傷害秘藥', e_dodge: '迴避秘藥', e_cast: '詠唱秘藥', e_area: '範圍秘藥', e_armor: '護甲秘藥',
    b_dmg: '傷害祝福', b_regen: '回復祝福', b_cd: '冷卻祝福', b_lifesteal: '吸血祝福', b_double: '雙倍投擲祝福', b_plenty: '豐饒祝福', b_cast: '詠唱祝福', b_area: '範圍祝福', b_reach: '近戰範圍祝福', b_wisdom: '智慧祝福',
    d_str: 'STR（力量）料理', d_agi: 'AGI（敏捷）料理', d_vit: 'VIT（體力）料理', d_int: 'INT（智力）料理', d_dex: 'DEX（靈巧）料理', d_luk: 'LUK（幸運）料理',
  };
  const ALIASES = {
    firebolt: ['火箭術', 'Fire Bolt', 'Saeta de fuego', 'Lanças de Fogo'],
    coldbolt: ['冰箭術', 'Cold Bolt', 'Saeta de hielo', 'Lanças de Gelo'],
    lightning: ['雷擊術', 'Lightning Bolt', 'Saeta de rayo', 'Relâmpago'],
  };
  const SLOT_ALIASES = {
    potion: ['藥水', 'potion', 'poción', 'poção'], elixir: ['秘藥', '祕藥', 'elixir'],
    blessing: ['祝福', 'blessing', 'bendición', 'bênção'], dish: ['料理', 'dish', 'plato', 'prato'],
    deity: ['神格', '神祇', '神祗', 'deity', 'divindade'],
  };
  const DEFAULTS = {
    enabled: false, skills: true, dodge: true, chests: true, pickups: true, background: true,
    skillSlots: 4, fourth: '', fifth: '', rarityFirst: true, skillReroll: true,
    banish: false, banishBasic: true, banishExcludeEnabled: false, banishExclude: [],
    repeat: false, expedition: 'prontera', repeatLimit: 0, repeatDelay: 5000,
    lootRange: 1800, partyRoll: 'greed',
    rerollMode: 'card-deck', maxRerolls: 6, reserveCard: 0, reserveDeck: 0,
    exhausted: 'best', delay: 1000, safety: 65, chestRange: 2400,
    priorities: { potion: '', elixir: '', blessing: '', dish: '', deity: '' },
  };
  const CHAR_MAP = Object.fromEntries('唤喚 术術 击擊 伤傷 传傳 说說 优優 诗詩 回回 药藥 秘秘 复復 却卻 护護 围圍 采採 贪貪 诵誦 咏詠 双雙 掷擲 丰豐 饶饒 智智 烹烹 调調 闪閃 络絡 连連 链鏈 灵靈 圣聖 体體 力力 敏敏 捷捷 运運 龙龍 毁毀 灭滅 寿壽 烈烈 风風 祝祝 觉覺 醒醒 标標 数數 时時 间間 动動 速速 强強 冰冰 箭箭'.split(' ').map(x => [x[0], x[1]]));
  const norm = value => String(value ?? '').normalize('NFKC').toLowerCase()
    .replace(/deity|神祇|神祗/g, '神格')
    .replace(/[\u3400-\u9fff]/g, ch => CHAR_MAP[ch] || ch)
    .replace(/[\s·•:：,，。!！()（）\[\]「」『』_\-]/g, '');
  const baseName = value => String(value ?? '').replace(/\s*\+\s*\d+\s*$/, '').trim();
  const tokenId = value => String(value ?? '').normalize('NFKC').match(/\[([a-z][\w.-]*)\]\s*$/i)?.[1] || '';
  const splitTiers = text => String(text || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean)
    .map(line => line.split(/[|｜]/).map(x => x.trim()).filter(Boolean)).filter(x => x.length);
  function slotId(label, definitions = []) {
    const value = norm(label);
    const found = definitions.find(d => SLOT_NAMES[d.id] && norm(d.name) === value);
    return found?.id || Object.keys(SLOT_ALIASES).find(id => SLOT_ALIASES[id].some(alias => norm(alias) === value)) || '';
  }
  function pickerKindOf(title) {
    if (/寶箱|宝箱|treasure chest|cofre del tesoro|baú do tesouro/i.test(title)) return 'chest';
    if (/升級|升级|level\s*up|subiu de nível/i.test(title)) return 'skill';
    return '';
  }
  function matchToken(token, card) {
    const t = norm(tokenId(token) || token);
    if (!t) return false;
    if (t === norm(card.id) || t === norm(baseName(card.name))) return true;
    // 星號是顯式包含匹配；不默認用「傷害」匹配「爆擊傷害」。
    return t.includes('*') && norm(baseName(card.name)).includes(t.replace(/\*/g, ''));
  }
  function tierOf(card, cfg) {
    const tiers = splitTiers(cfg.priorities[card.slot]);
    const n = tiers.findIndex(tier => tier.some(t => matchToken(t, card)));
    return n < 0 ? 1000 : n;
  }
  function rarityOf(text) {
    const n = norm(text);
    if (/傳說|legendary|legendari[oa]|lendári[oa]/.test(n)) return 3;
    if (/史詩|epic|épic[oa]|epica/.test(n)) return 2;
    if (/稀有|rare|rar[ao]/.test(n)) return 1;
    if (/優良|uncommon|pococomún|incomum/.test(n)) return .5;
    return 0;
  }
  function resolveItem(name, slot, icon, catalog) {
    const candidates = catalog.filter(i => i.slot === slot && norm(baseName(i.name)) === norm(baseName(name)));
    if (candidates.length === 1) return candidates[0];
    return candidates.find(i => i.icon && i.icon === icon) || null;
  }
  function upgradeOf(text) {
    const n = norm(text);
    if (/目標|targets?|objetivos?|alvos?/.test(n)) return 3;
    if (/急速|冷卻|haste|cooldown|celeridad|acelera/.test(n)) return 2;
    if (/傷害|damage|daño|dano/.test(n)) return 1;
    return 0;
  }
  function skillId(name, registry = {}) {
    const n = norm(tokenId(name) || baseName(name));
    for (const [id, aliases] of Object.entries(ALIASES)) {
      if ([id, ...aliases].some(a => norm(a) === n)) return id;
    }
    for (const [id, def] of Object.entries(registry)) {
      if (norm(id) === n || norm(def.name) === n) return id;
    }
    return '';
  }
  function chooseSkill(cards, owned, cfg, registry = {}) {
    const extras = owned.filter(id => !FIXED.includes(id));
    const limit = cfg.skillSlots === 5 ? 5 : 4;
    const configured = [cfg.fourth, ...(limit === 5 ? [cfg.fifth] : [])].filter(Boolean).map(v => skillId(v, registry) || v);
    const wanted = configured.filter(id => !owned.includes(id) && !FIXED.includes(id));
    const eligible = cards.filter(c => {
      if (owned.includes(c.id)) return true;
      if (owned.length >= limit) return false;
      if (FIXED.includes(c.id)) return true;
      if (extras.length >= limit - FIXED.length) return false;
      return wanted.length ? wanted.includes(c.id) : c.isNew && !!c.id && c.id !== 'potion';
    });
    const ranked = eligible.map(c => ({ ...c, pref: FIXED.includes(c.id) ? upgradeOf(c.lines) : 0 }));
    ranked.sort((a, b) => {
      const order = cfg.rarityFirst ? [b.rarity - a.rarity, b.pref - a.pref] : [b.pref - a.pref, b.rarity - a.rarity];
      return order.find(Boolean) || Number(FIXED.includes(b.id)) - Number(FIXED.includes(a.id)) || a.index - b.index;
    });
    return ranked[0] || null;
  }
  function banishCandidate(cards, owned, cfg, basicId = '') {
    if (!cfg.banish) return null;
    const excluded = cfg.banishExcludeEnabled ? new Set(cfg.banishExclude) : new Set();
    return cards.find(c => {
      const basic = !!basicId && c.id === basicId;
      if (!c.id || (!owned.includes(c.id) && !basic) || c.isNew || !c.canBanish || excluded.has(c.id)) return false;
      if (basic && (cfg.banishBasic === false || excluded.has(BASIC_ANY))) return false;
      return true;
    }) || null;
  }
  function displayPriority(value, slot, catalog = []) {
    return splitTiers(value).map(tier => tier.map(token => {
      const id = tokenId(token) || token.trim();
      const found = catalog.find(c => c.slot === slot && c.id === id);
      const name = found?.name || (slot === 'deity' && SKILL_NAMES[id] ? `${SKILL_NAMES[id]} 神格` : ITEM_NAMES[id]);
      return name ? `${name.replace(/Deity/g, '神格')} [${id}]` : token;
    }).join(' | ')).join('\n');
  }
  const pickupPriority = kind => kind === 'chest' || kind === 'magnet' ? 0 : 1;
  function pickupTargets(pickups, player, zeny, cost, cfg, enemies = []) {
    const candidates = pickups.filter(p => {
      if (p.dead || p.magnet || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return false;
      if (p.kind === 'chest') return cfg.chests && zeny >= cost;
      return cfg.pickups && /^(gem_blue|gem_yellow|gem_red|zeny|loot|card|egg|meat|magnet)$/.test(p.kind);
    }).map(p => ({ pickup: p, priority: pickupPriority(p.kind), x: p.x, y: p.y + 20, distance: Math.hypot(p.x - player.x, p.y + 20 - player.y) }))
      .filter(t => t.distance < (t.pickup.kind === 'chest' ? cfg.chestRange : cfg.lootRange))
      .sort((a, b) => a.distance - b.distance);
    // 分別保留高優先級與一般目標，避免大量近距離寶石擠掉較遠的寶箱／磁鐵。
    return [0, 1].flatMap(priority => candidates.filter(t => t.priority === priority).slice(0, 40)).map(t => {
      const danger = enemies.reduce((sum, e) => sum + Math.max(0, cfg.safety + (e.radius || 18) - Math.hypot(t.x - e.x, t.y - e.y)) ** 2 * 12, 0);
      return { ...t, danger, score: t.distance + danger };
    }).sort((a, b) => Number(a.danger > 0) - Number(b.danger > 0) || (a.danger > 0 ? a.danger - b.danger : 0) || a.priority - b.priority || a.distance - b.distance);
  }
  function rankChest(cards, cfg) {
    return cards.map(c => ({ ...c, tier: tierOf(c, cfg) })).sort((a, b) => {
      // 寶箱一律先遵守使用者優先級，技能用的 rarityFirst 不可覆蓋寶箱偏好。
      return a.tier - b.tier || b.rarity - a.rarity || a.index - b.index;
    });
  }
  const needsBackgroundClock = (config, hidden) => !!(config.enabled && config.background && hidden);
  function clampPanelPosition(position, size, viewport) {
    const width = Math.max(0, Number(size.width) || 0), height = Math.max(0, Number(size.height) || 0);
    const x = Number(position.x), y = Number(position.y);
    return { x: clamp(Number.isFinite(x) ? x : 8, 8, Math.max(8, viewport.width - width - 8)),
      y: clamp(Number.isFinite(y) ? y : 8, 8, Math.max(8, viewport.height - height - 8)) };
  }
  const BACKGROUND_WORKER_SOURCE = `let timer = null;
self.onmessage = event => {
  if (event.data === 'start' && timer === null) timer = setInterval(() => self.postMessage('pulse'), 50);
  if (event.data === 'stop' && timer !== null) { clearInterval(timer); timer = null; }
};`;
  function chestDecision(cards, cfg, budget, deckAvailable, catalog = []) {
    const ranked = rankChest(cards, cfg);
    const configured = Object.values(cfg.priorities).some(x => splitTiers(x).length);
    if (!ranked.length) return { type: 'wait', reason: '沒有可識別卡片' };
    const good = ranked.some(c => c.tier === 0);
    if (configured && !good && budget.used < cfg.maxRerolls && cfg.rerollMode !== 'off') {
      const cardChoices = ranked.filter(c => c.canReroll && budget.card > cfg.reserveCard && splitTiers(cfg.priorities[c.slot]).length)
        .filter(c => {
          // 有完整物品表時，只在該欄位確實有目標可抽時使用單張重抽。
          const items = catalog.filter(x => x.slot === c.slot && x.available !== false);
          return !catalog.length || items.some(x => splitTiers(cfg.priorities[c.slot])[0].some(t => matchToken(t, x)));
        });
      const card = () => cardChoices.length ? { type: 'card', card: cardChoices[cardChoices.length - 1] } : null;
      const deck = () => deckAvailable && budget.deck > cfg.reserveDeck ? { type: 'deck' } : null;
      const order = {
        'card-deck': [card, deck], 'deck-card': [deck, card], card: [card], deck: [deck], off: [],
      }[cfg.rerollMode] || [];
      for (const fn of order) { const action = fn(); if (action) return action; }
    }
    if (configured && !good && cfg.exhausted === 'wait') return { type: 'wait', reason: '未中第一優先級；重抽不可用或達上限，等待手動選擇' };
    return { type: 'pick', card: ranked[0] };
  }
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function validateConfig(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('設定必須是 JSON 物件');
    const out = JSON.parse(JSON.stringify(DEFAULTS));
    for (const key of ['enabled', 'skills', 'dodge', 'chests', 'pickups', 'background', 'rarityFirst', 'skillReroll', 'banish', 'banishBasic', 'banishExcludeEnabled', 'repeat']) if (typeof raw[key] === 'boolean') out[key] = raw[key];
    if (typeof raw.fourth === 'string') out.fourth = raw.fourth.slice(0, 100).trim();
    if (typeof raw.fifth === 'string') out.fifth = raw.fifth.slice(0, 100).trim();
    if ([4, 5].includes(Number(raw.skillSlots))) out.skillSlots = Number(raw.skillSlots);
    if (typeof raw.expedition === 'string') out.expedition = raw.expedition.slice(0, 150);
    if (Array.isArray(raw.banishExclude)) out.banishExclude = [...new Set(raw.banishExclude.filter(v => typeof v === 'string' && /^[\w.-]{1,100}$/.test(v)))].slice(0, 500);
    if (['greed', 'need', 'pass', 'manual'].includes(raw.partyRoll)) out.partyRoll = raw.partyRoll;
    if (['card-deck', 'deck-card', 'card', 'deck', 'off'].includes(raw.rerollMode)) out.rerollMode = raw.rerollMode;
    if (['best', 'wait'].includes(raw.exhausted)) out.exhausted = raw.exhausted;
    for (const [key, lo, hi] of [['maxRerolls', 0, 50], ['reserveCard', 0, 99], ['reserveDeck', 0, 99], ['delay', 850, 5000], ['safety', 25, 200], ['chestRange', 100, 12000], ['lootRange', 100, 12000], ['repeatLimit', 0, 9999], ['repeatDelay', 1500, 60000]]) {
      if (Number.isFinite(Number(raw[key]))) out[key] = clamp(Math.round(Number(raw[key])), lo, hi);
    }
    for (const slot of Object.keys(SLOT_NAMES)) if (typeof raw.priorities?.[slot] === 'string') out.priorities[slot] = raw.priorities[slot].slice(0, 5000);
    return out;
  }
  function pointSegmentDistance(x, y, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    return Math.hypot(x - ax - t * dx, y - ay - t * dy);
  }
  function insideZone(x, y, z, pad = 15) {
    const dx = x - z.x, dy = y - z.y, r = Math.hypot(dx, dy);
    if (z.kind === 'circle') return r < z.r + pad;
    if (z.kind === 'ring') return r < z.r + pad && r > z.r0 - pad;
    if (z.kind === 'line' || z.kind === 'rect') {
      const c = Math.cos(z.ang || 0), s = Math.sin(z.ang || 0);
      return Math.abs(dx * c + dy * s) < z.w / 2 + pad && Math.abs(-dx * s + dy * c) < z.h / 2 + pad;
    }
    if (z.kind === 'cone') return r < z.r + pad && (r < pad * 2 || Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - z.ang), Math.cos(Math.atan2(dy, dx) - z.ang))) < z.half + pad / Math.max(r, 1));
    return false;
  }
  // 在世界座標評估靜止及 24 個方向，按途經風險排序，最後才考慮寶箱距離。
  function planMove(scene, cfg) {
    const { player: p, enemies, target, bounds: b, walkable, zones = [] } = scene;
    const speed = Math.max(40, scene.speed || 180), horizon = .75;
    const candidates = [{ dx: 0, dy: 0 }];
    for (let i = 0; i < 24; i++) candidates.push({ dx: Math.cos(i * Math.PI / 12), dy: Math.sin(i * Math.PI / 12) });
    const goal = target || p;
    const goalDistance = Math.hypot(goal.x - p.x, goal.y - p.y);
    if (target && goalDistance > 0) candidates.push({ dx: (goal.x - p.x) / goalDistance, dy: (goal.y - p.y) / goalDistance, cap: goalDistance });
    let best = null;
    for (const c of candidates) {
      let risk = 0, minClear = 1e6, valid = true;
      let last = p;
      for (let j = 1; j <= 6; j++) {
        const t = j / 6 * horizon, travel = Math.min(speed * t, c.cap ?? Infinity), x = p.x + c.dx * travel, y = p.y + c.dy * travel;
        if (b && (x < b.x0 + 6 || x > b.x1 - 6 || y < b.y0 + 6 || y > b.y1 - 6) || walkable && !walkable(last.x, last.y, x, y)) { valid = false; break; }
        for (const e of enemies) {
          const ex = e.x + (e.vx || 0) * t, ey = e.y + (e.vy || 0) * t;
          const clear = Math.hypot(x - ex, y - ey) - (e.radius || 18) - 12;
          minClear = Math.min(minClear, clear);
          risk += Math.max(0, cfg.safety - clear) ** 2 / (j + 2);
          // 採樣間的近身穿越也有代價。
          if (pointSegmentDistance(ex, ey, last.x, last.y, x, y) < (e.radius || 18) + 12) risk += 20000;
        }
        for (const z of zones) if (insideZone(x, y, z)) risk += 60000;
        last = { x, y };
      }
      if (!valid) continue;
      const distance = Math.hypot(last.x - goal.x, last.y - goal.y);
      const inertia = scene.previous ? c.dx * scene.previous.dx + c.dy * scene.previous.dy : 0;
      const score = risk * 10 + distance * .35 - Math.min(180, minClear) * .2 - inertia * 6;
      if (!best || score < best.score) best = { ...c, x: last.x, y: last.y, score, risk };
    }
    return best;
  }
  const core = { VERSION, DEFAULTS, FIXED, BASIC_ANY, STAGES, SLOT_ALIASES, slotId, pickerKindOf, BACKGROUND_WORKER_SOURCE, needsBackgroundClock, clampPanelPosition, norm, baseName, tokenId, splitTiers, matchToken, tierOf, rarityOf, resolveItem, upgradeOf, skillId, chooseSkill, banishCandidate, displayPriority, pickupPriority, pickupTargets, rankChest, chestDecision, validateConfig, pointSegmentDistance, insideZone, planMove };
  if (typeof module === 'object' && module.exports) { module.exports = core; return; }
  if (typeof window === 'undefined' || window.top !== window.self) return;
  if (window.__RO_SURVIVORS_HELPER__) return;

  const STORAGE = 'ro-survivors-helper.settings.v1';
  const POSITION_STORAGE = 'ro-survivors-helper.panel-position.v1';
  let cfg = validateConfig(DEFAULTS);
  try { const saved = localStorage.getItem(STORAGE); if (saved) cfg = validateConfig(JSON.parse(saved)); } catch (error) { console.warn('[RO助手] 設定讀取失敗', error); }
  const state = {
    game: null, registry: {}, itemRegistry: {}, catalog: [], hooks: null, assets: null, attaching: false,
    bridge: '等待遊戲模組', message: '已暫停；開啟面板後按「啟動」', logs: [],
    pickerNode: null, born: 0, used: 0, pending: null, skillUsed: 0,
    manualUntil: 0, moveOwned: false, previous: null, velocities: new WeakMap(),
    lastMove: 0, lastGameTime: 0, errorCount: 0, zones: new Set(), observedGame: null,
    route: null,
    stages: [], flow: null, gameoverAt: null, runsStarted: 0, launchPending: false, launchStage: '',
    revealNode: null, revealAt: 0, revealClicked: false, lastListRead: 0,
    settings: null, slotDefinitions: [], catalogLang: null, autoPauseOriginal: null, clockWorker: null, clockFallback: null, clockRunning: false,
    clockTicker: null, clockTickerWasRunning: false, backgroundLastLogic: 0, backgroundStatus: '前台', resumeAfterVisibility: false,
    panelDrag: null, suppressMiniClickUntil: 0,
  };
  let root, panel, ui, interval, attachTimer;
  const $ = selector => document.querySelector(selector);
  const text = (element, selector) => element?.querySelector(selector)?.textContent?.trim() || '';
  const editingSettings = () => !panel?.hidden && /^(INPUT|TEXTAREA|SELECT)$/.test(ui?.activeElement?.tagName);
  const visible = el => !!el && !el.classList.contains('hidden') && !el.closest('.hidden') && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  function log(message) {
    state.message = message;
    if (state.logs.at(-1)?.message !== message) state.logs.push({ time: new Date().toLocaleTimeString(), message });
    state.logs = state.logs.slice(-50);
  }
  function save() {
    try { localStorage.setItem(STORAGE, JSON.stringify(cfg)); } catch { log('設定無法儲存；請檢查瀏覽器儲存空間'); }
  }
  function releaseBackgroundTicker() {
    const ticker = state.clockTicker, restart = state.clockTickerWasRunning;
    state.clockTicker = null; state.clockTickerWasRunning = false;
    try { if (restart && ticker?.start) ticker.start(); } catch { /* 已銷毀的時鐘無需恢復 */ }
  }
  function stopBackgroundClock() {
    if (state.clockRunning) { try { state.clockWorker?.postMessage('stop'); } catch {} }
    if (state.clockFallback !== null) { clearInterval(state.clockFallback); state.clockFallback = null; }
    state.clockRunning = false; releaseBackgroundTicker();
  }
  function resumeVisibilityPause() {
    const allowed = state.resumeAfterVisibility;
    state.resumeAfterVisibility = false;
    if (!allowed || !needsBackgroundClock(cfg, document.hidden) || state.game?.state !== 'paused') return;
    const pause = $('#pause'), resume = $('#btn-resume');
    if (visible(pause) && resume && !resume.disabled) { resume.click(); log('已恢復切換分頁造成的自動暫停'); }
  }
  function backgroundPulse() {
    if (!needsBackgroundClock(cfg, document.hidden) || window.RO_DEAD || $('#ro-tab-dead')) { syncBackground(); return; }
    try {
      resumeVisibilityPause();
      const now = performance.now();
      // 手動驅動原有的完整遊戲時鐘，保留正常速度、暫停狀態、組隊與結算邏輯。
      if (state.clockTicker?.update) state.clockTicker.update(now);
      if (now - state.backgroundLastLogic >= 100) { state.backgroundLastLogic = now; tick(); }
    } catch (error) {
      stopBackgroundClock(); cfg.background = false; save();
      log(`背景時鐘失敗，已關閉背景模式：${error.message}`);
    }
  }
  function startBackgroundFallback() {
    if (state.clockFallback === null) state.clockFallback = setInterval(backgroundPulse, 50);
    state.clockRunning = true; state.backgroundStatus = '瀏覽器計時器（可能被限速）';
  }
  function syncBackground() {
    if (state.settings) {
      if (cfg.enabled && cfg.background) {
        if (state.autoPauseOriginal === null) state.autoPauseOriginal = state.settings.autoPause;
        state.settings.autoPause = false;
      } else if (state.autoPauseOriginal !== null) {
        state.settings.autoPause = state.autoPauseOriginal; state.autoPauseOriginal = null;
      }
    }
    if (!needsBackgroundClock(cfg, document.hidden) || window.RO_DEAD || $('#ro-tab-dead')) {
      stopBackgroundClock(); state.backgroundStatus = cfg.enabled && cfg.background ? '已就緒，前台使用原時鐘' : '未啟用'; return;
    }
    const ticker = state.game?.app?.ticker;
    if (ticker && typeof ticker.update === 'function' && ticker !== state.clockTicker) {
      releaseBackgroundTicker(); state.clockTicker = ticker; state.clockTickerWasRunning = !!ticker.started;
      if (state.clockTickerWasRunning) ticker.stop?.();
    }
    if (state.clockRunning) {
      if (state.clockWorker && state.clockFallback === null) state.backgroundStatus = ticker ? 'Worker 時鐘約 20 Hz' : 'Worker 等待接入遊戲時鐘';
      return;
    }
    if (!state.clockWorker && typeof Worker === 'function' && typeof URL.createObjectURL === 'function') {
      let workerURL;
      try {
        workerURL = URL.createObjectURL(new Blob([BACKGROUND_WORKER_SOURCE], { type: 'application/javascript' }));
        state.clockWorker = new Worker(workerURL);
        state.clockWorker.onmessage = event => { if (event.data === 'pulse') backgroundPulse(); };
        state.clockWorker.onerror = () => {
          state.clockWorker?.terminate(); state.clockWorker = null;
          if (needsBackgroundClock(cfg, document.hidden)) startBackgroundFallback();
        };
      } catch { state.clockWorker = null; }
      finally { if (workerURL) URL.revokeObjectURL(workerURL); }
    }
    if (state.clockWorker) {
      try { state.clockWorker.postMessage('start'); state.clockRunning = true; state.backgroundStatus = ticker ? 'Worker 時鐘約 20 Hz' : 'Worker 等待接入遊戲時鐘'; }
      catch { state.clockWorker = null; startBackgroundFallback(); }
    } else startBackgroundFallback();
  }
  function stopMove() {
    if (state.moveOwned && state.game) state.game.movePath = null;
    state.moveOwned = false; state.previous = null;
  }
  function toggle() {
    cfg.enabled = !cfg.enabled; save();
    if (!cfg.enabled) stopMove();
    syncBackground();
    log(cfg.enabled ? '已啟動' : '已暫停'); renderStatus();
  }
  function refreshCatalog() {
    state.catalogLang = state.settings?.lang;
    const game = state.game;
    const abs = value => value ? new URL(value, location.href).href : '';
    const items = Object.values(state.itemRegistry).filter(d => d && SLOT_NAMES[d.slot]).map(d => ({ id: d.id, slot: d.slot, name: d.name,
      icon: abs(d.img ? 'assets/' + d.img : state.assets?.manifest?.items?.[d.icon]?.icon ? 'assets/' + state.assets.manifest.items[d.icon].icon : '') }));
    const learned = game?.deityLearned?.() || [];
    for (const [id, def] of Object.entries(state.registry)) {
      if (typeof def?.create === 'function' && !id.startsWith('atk_')) items.push({ id, slot: 'deity', name: `${def.name} Deity`, available: learned.includes(id), icon: abs(state.assets?.icons?.get(def.icon)) });
    }
    state.catalog = items;
    if (ui) {
      for (const slot of Object.keys(SLOT_NAMES)) {
        const select = ui.querySelector(`[data-catalog="${slot}"]`), old = select.value;
        select.innerHTML = '<option value="">從遊戲物品表加入一行優先級…</option>' + items.filter(i => i.slot === slot).map(i => `<option value="${esc(i.id)}">${esc(i.name.replace(/Deity/g, '神格'))} [${esc(i.id)}]${i.available === false ? '（本局未學）' : ''}</option>`).join('');
        select.value = old;
        const area = ui.querySelector(`[data-priority="${slot}"]`);
        if (area !== ui.activeElement) area.value = displayPriority(cfg.priorities[slot], slot, items);
      }
      ui.querySelector('#skills-list').innerHTML = Object.entries(state.registry).filter(([id]) => !id.startsWith('atk_')).map(([id, d]) => `<option value="${esc(`${d.name} [${id}]`)}"></option>`).join('');
      for (const key of ['fourth', 'fifth']) {
        const el = ui.querySelector(`[data-setting="${key}"]`), id = skillId(cfg[key], state.registry);
        if (id && el !== ui.activeElement) el.value = `${SKILL_NAMES[id] || state.registry[id]?.name || id} [${id}]`;
      }
      renderExclusions();
    }
  }
  function renderExclusions() {
    if (!ui) return;
    const query = norm(ui.querySelector('#banish-filter').value), owned = ownedSkills();
    const basic = basicAttackId();
    const choices = [...new Set([BASIC_ANY, ...owned, ...(basic ? [basic] : []), ...Object.keys(state.registry).filter(id => !id.startsWith('atk_')), ...cfg.banishExclude])];
    const label = id => id === BASIC_ANY ? '普攻（所有武器）' : id === basic ? `普攻 · ${state.registry[id]?.name || id}` : SKILL_NAMES[id] || state.registry[id]?.name || id;
    choices.sort((a, b) => Number(owned.includes(b)) - Number(owned.includes(a)) || a.localeCompare(b));
    ui.querySelector('#banish-list').innerHTML = choices.filter(id => norm(`${id} ${label(id)}`).includes(query)).map(id => `<label><input type="checkbox" data-exclude="${esc(id)}"${cfg.banishExclude.includes(id) ? ' checked' : ''}> ${esc(label(id))} <small>[${esc(id)}]${owned.includes(id) || id === basic ? ' · 已擁有' : ''}</small></label>`).join('') || '<small>等待遊戲技能表，或無符合搜尋的技能。</small>';
  }
  function readStages() {
    const cards = [...document.querySelectorAll('#stg-list .stg-card')];
    if (cards.length) state.stages = cards.map(card => {
      const name = text(card, '.stg-card-info b'), index = Number(card.dataset.i);
      const known = STAGES.find(([, n]) => norm(n) === norm(name)) || STAGES[index];
      return { id: known?.[0] || `name:${name}`, name, index, locked: card.classList.contains('locked') || card.classList.contains('soon') };
    });
    if (ui) {
      const options = state.stages.length ? state.stages : STAGES.map(([id, name], index) => ({ id, name, index }));
      const select = ui.querySelector('[data-setting="expedition"]');
      const signature = JSON.stringify(options);
      if (select.dataset.signature !== signature) {
        select.dataset.signature = signature;
        select.innerHTML = options.map(stage => `<option value="${esc(stage.id)}">${esc(stage.name)}${stage.locked ? '（未開放）' : ''}</option>`).join('');
        if (!options.some(s => s.id === cfg.expedition)) select.insertAdjacentHTML('beforeend', `<option value="${esc(cfg.expedition)}">${esc(cfg.expedition.replace(/^name:/, ''))}（等待確認）</option>`);
        select.value = cfg.expedition;
      }
    }
    return cards;
  }
  function observeGame(g) {
    if (!g?.player || typeof g.moveTo !== 'function' || !Array.isArray(g.enemies)) return;
    if (state.game === g) return;
    stopMove(); state.game = g; state.route = null; state.velocities = new WeakMap(); state.used = state.skillUsed = 0;
    if (state.launchPending) { state.runsStarted++; log(`第 ${state.runsStarted} 次自動遠征已開始`); }
    state.launchPending = false; state.flow = null; state.gameoverAt = null;
    syncBackground();
    state.zones.clear(); state.observedGame = g;
    // 記錄遊戲本來建立的紅色地面預警；不改寫傷害、技能、抽卡或角色能力。
    if (typeof g.zoneDecal === 'function') {
      const original = g.zoneDecal;
      const wrapped = function (kind, param) {
        const decal = original.apply(this, arguments);
        if (decal && typeof decal.dispose === 'function') {
          const entry = { kind, param, decal };
          state.zones.add(entry);
          const dispose = decal.dispose;
          decal.dispose = function () { state.zones.delete(entry); return dispose.apply(this, arguments); };
        }
        return decal;
      };
      g.zoneDecal = wrapped;
      g.cleanup?.push(() => { if (g.zoneDecal === wrapped) g.zoneDecal = original; });
    }
    log('已連接本局；讀取角色、怪物與掉落物座標'); refreshCatalog();
  }
  async function attach() {
    if (state.hooks || state.attaching) return;
    const urls = [...document.querySelectorAll('link[rel="modulepreload"][href],script[type="module"][src]')]
      .map(e => e.href || e.src).filter(u => /\/soul_linker[^/]*\.js(?:\?|$)/.test(u) && new URL(u).origin === location.origin);
    if (!urls.length) return;
    state.attaching = true;
    state.bridge = '正在連接遊戲模組';
    try {
      const ns = await import(urls[0]);
      const objects = Object.values(ns).filter(v => v && typeof v === 'object');
      const hooks = objects.find(v => ['start', 'tick', 'hurt', 'cast', 'kill'].every(k => Array.isArray(v[k])));
      const registry = objects.find(v => v.firebolt?.name && v.coldbolt?.name && v.lightning?.name);
      const items = objects.find(v => v.p_cd?.slot === 'potion' && v.e_dmg?.slot === 'elixir');
      if (!hooks || !registry || !items) throw new Error('當前版本的資料結構與適配器不同');
      state.registry = registry; state.itemRegistry = items; state.hooks = hooks;
      state.assets = objects.find(v => v.icons instanceof Map && v.itemTextures instanceof Map) || null;
      state.settings = objects.find(v => typeof v.autoPause === 'boolean' && typeof v.muteHidden === 'boolean' && typeof v.lang === 'string') || null;
      state.slotDefinitions = objects.find(v => Array.isArray(v) && Object.keys(SLOT_NAMES).every(id => v.some(d => d?.id === id && typeof d.name === 'string'))) || [];
      hooks.start.push(observeGame); hooks.tick.push(observeGame);
      syncBackground();
      state.bridge = '模組已連接，等待進入本局'; clearInterval(attachTimer); refreshCatalog();
      log('模組已連接；如已在局內，下一個遊戲幀會自動接入');
    } catch (error) { state.bridge = `連接失敗：${error.message}；選卡仍可用，走位等待連接`; }
    finally { state.attaching = false; }
  }
  function ownedSkills() {
    if (state.game?.slots) return [...state.game.slots];
    return [...document.querySelectorAll('#lu-sockets .skill-slot[data-skill]:not(.basic),#skillbar .skill-slot[data-skill]:not(.basic)')].map(e => e.dataset.skill).filter((v, i, a) => a.indexOf(v) === i);
  }
  function basicAttackId() {
    return state.game?.basicAttack || document.querySelector('#lu-sockets .skill-slot.basic[data-skill],#skillbar .skill-slot.basic[data-skill]')?.dataset.skill || '';
  }
  function readCard(button, index, kind) {
    const name = text(button, '.pk-name'), slotEl = button.closest('.pk-slot');
    const sub = text(button, '.pk-sub'), badge = text(button, '.pk-badge');
    const lines = text(button, '.pk-lines');
    let id = kind === 'skill' ? skillId(name, state.registry) : '', slot = '';
    if (kind === 'chest') {
      slot = slotId(sub, state.slotDefinitions);
      id = resolveItem(name, slot, button.querySelector('.pk-art img')?.src, state.catalog)?.id || '';
      if (slot === 'deity' && !id) id = skillId(name.replace(/\s*(?:Deity|神格)\s*(?:\+\s*\d+)?$/i, ''), state.registry);
    }
    // 新站的天賦可讓不同技能顯示成同名。優先用本組牌的原始 ID，文字作後備。
    const hand = state.game?.hand?.[kind === 'skill' ? 'level' : 'chest'];
    const native = state.game?.state === 'levelup' && Array.isArray(hand) && hand.length === $('#pk-cards')?.querySelectorAll('.pk-card').length ? hand[index] : null;
    if (kind === 'skill' && native && typeof native.id === 'string' && state.registry[native.id]) id = native.id;
    if (kind === 'chest' && native && SLOT_NAMES[native.slot] && typeof native.item === 'string' && state.catalog.some(c => c.slot === native.slot && c.id === native.item)) {
      slot = native.slot; id = native.item;
    }
    const reroll = [...(slotEl?.querySelectorAll('.pk-act') || [])].find(b => /重抽|重擲|reroll/i.test(`${b.title} ${b.textContent}`) && !b.disabled);
    const banish = [...(slotEl?.querySelectorAll('.pk-act') || [])].find(b => /放逐|banish|banir/i.test(`${b.title} ${b.textContent}`) && !b.disabled);
    return { index, name, id, slot, sub, lines, rarity: rarityOf(badge), isNew: kind === 'skill' && typeof native?.isNew === 'boolean' ? native.isNew : !!button.querySelector('.pk-ribbon') || /技能|habilidad|^skill$/i.test(badge), button, slotEl, reroll, canReroll: !!reroll, banish, canBanish: !!banish };
  }
  function deckButton(picker) {
    return [...picker.querySelectorAll('#pk-bar .pk-act')].find(b => /重抽|reroll/i.test(`${b.title} ${b.textContent}`) && !b.disabled);
  }
  function pickerKind(picker) {
    return pickerKindOf(text(picker, '#pk-title'));
  }
  function resetPicker() {
    state.pickerNode = null; state.pending = null; state.used = 0; state.skillUsed = 0;
  }
  function actPicker(now) {
    const picker = $('#picker');
    if (!visible(picker)) { resetPicker(); return; }
    stopMove();
    if (picker.classList.contains('closing')) return;
    const kind = pickerKind(picker);
    if (!kind || kind === 'skill' && !cfg.skills || kind === 'chest' && !cfg.chests) return;
    const buttons = [...picker.querySelectorAll('#pk-cards .pk-card')];
    if (!buttons.length) return;
    if (buttons[0] !== state.pickerNode) {
      state.pickerNode = buttons[0]; state.born = now; state.pending = null;
    }
    const cards = buttons.map((b, i) => readCard(b, i, kind));
    if (now - state.born < cfg.delay) return; // 遊戲有 380 + 卡數 ×120 ms 的入場鎖。
    if (state.pending) {
      if (state.pending.type === 'pick') {
        const card = cards.find(c => c.button === state.pending.button);
        const yes = card?.slotEl?.classList.contains('asking') && card.slotEl.querySelector('[data-yes]');
        if (yes && now - state.pending.at > 240 && !state.pending.confirmed) { yes.click(); state.pending.confirmed = true; return; }
      }
      if (now - state.pending.at > 3000) log('操作後頁面未更新；暫停此組操作，請手動處理或按「重新識別」');
      return;
    }
    if (kind === 'skill') {
      const owned = ownedSkills();
      const basic = basicAttackId();
      const banished = banishCandidate(cards, owned, cfg, basic);
      if (banished) {
        state.pending = { type: 'banish', at: now };
        banished.banish.click(); log(`放逐${banished.id === basic ? '普攻' : '已擁有技能'}：${banished.name}；本局不再出現其升級`); return;
      }
      const limit = Math.min(cfg.skillSlots, state.game?.maxSkills || cfg.skillSlots);
      const selected = chooseSkill(cards, owned, { ...cfg, skillSlots: limit }, state.registry);
      if (selected) return pick(selected, now);
      const deck = deckButton(picker);
      const left = state.game?.perksLeft?.reroll ?? Number(text(deck, 'small') || 0);
      if (cfg.skillReroll && deck && state.skillUsed < cfg.maxRerolls && (left === undefined || left > cfg.reserveDeck)) {
        state.skillUsed++; state.pending = { type: 'deck', at: now }; deck.click(); log(`技能牌沒有符合 ${limit} 技配置的選項，重抽整組`); return;
      }
      log(`技能牌沒有符合 ${limit} 技配置的選項；等待手動選擇`); return;
    }
    if (cards.some(c => !c.slot)) { log('寶箱欄位未識別；等待手動選擇'); return; }
    const deck = deckButton(picker), left = state.game?.perksLeft;
    const cardLeft = Math.max(0, ...cards.map(c => Number(text(c.reroll, 'small') || 0)));
    const result = chestDecision(cards, cfg, { used: state.used, card: left?.reroll_card ?? cardLeft, deck: left?.reroll ?? Number(text(deck, 'small') || 0) }, !!deck, state.catalog);
    if (result.type === 'pick') return pick(result.card, now);
    if (result.type === 'wait') { log(result.reason); return; }
    const button = result.type === 'card' ? result.card.reroll : deck;
    if (!button || button.disabled) return;
    state.used++; state.pending = { type: result.type, at: now };
    button.click(); log(`寶箱未中第一優先級，${result.type === 'card' ? '重抽單張：' + result.card.name : '重抽整組'}（本箱 ${state.used}/${cfg.maxRerolls}）`);
  }
  function pick(card, now) {
    if (!card.button.isConnected || card.button.disabled) return;
    state.pending = { type: 'pick', at: now, button: card.button, confirmed: false };
    card.button.click(); log(`選取：${card.name}（${({ 0: '普通', 0.5: '優良', 1: '稀有', 2: '史詩', 3: '傳說' })[card.rarity]}）`);
  }
  function readZones() {
    const zones = [];
    for (const { kind, param, decal: d } of state.zones) {
      if (d.alpha === 0) continue;
      const z = { kind, x: d.x, y: d.y, r: d.w / 2, r0: d.w / 2 * param, w: d.w, h: d.h, ang: d.rotation || 0, half: param };
      if (Number.isFinite(z.x) && Number.isFinite(z.y) && Number.isFinite(z.r)) zones.push(z);
    }
    return zones;
  }
  function collectReveal(now) {
    if (!cfg.pickups) return false;
    const reveal = $('#drop-reveal');
    if (!visible(reveal)) { state.revealNode = null; state.revealClicked = false; return false; }
    stopMove();
    const node = reveal.querySelector('.dr-inner') || reveal.firstElementChild;
    if (node !== state.revealNode) { state.revealNode = node; state.revealAt = now; state.revealClicked = false; }
    if (!node || now - state.revealAt < 750 || state.revealClicked) return true;
    let button = reveal.querySelector('.dr-get');
    if (!button && reveal.querySelector('.dr-roll-btns')) {
      if (cfg.partyRoll === 'manual') { log('組隊掉落等待手動分配'); return true; }
      button = [...reveal.querySelectorAll('.dr-roll-btns [data-c]')].find(b => b.dataset.c === cfg.partyRoll);
    }
    if (button && !button.disabled) {
      const name = text(reveal, '.dr-name');
      state.revealClicked = true; button.click(); log(`拾取掉落物：${name || '已確認'}`);
    }
    return true;
  }
  function flowClick(button, key, now) {
    if (!button || !visible(button) || button.disabled) return false;
    if (state.flow?.key === key && state.flow.node === button) {
      if (now - state.flow.at > 8000) log('遠征操作後未切換畫面，等待遊戲響應；可按「重新識別」重試');
      return true;
    }
    state.flow = { key, node: button, at: now };
    button.click(); return true;
  }
  function repeatStep(now) {
    if (!cfg.repeat) return false;
    if (cfg.repeatLimit > 0 && state.runsStarted >= cfg.repeatLimit) {
      if (!visible($('#hud')) || state.game?.state === 'over') log(`自動遠征已達 ${cfg.repeatLimit} 次上限，等待手動操作`);
      return false;
    }
    if (state.flow && now - state.flow.at < 700) return true;
    if (visible($('#gameover'))) {
      stopMove(); state.gameoverAt ??= now;
      if (now - state.gameoverAt >= cfg.repeatDelay) {
        if (flowClick($('#btn-restart'), 'return', now)) log('遠征結束，返回隊長並準備下一局');
      }
      return true;
    }
    const dialog = $('#npc-dialog');
    if (visible(dialog)) {
      if (state.game?.state === 'over' && /待續|continuar|continua|to be continued/i.test(text(dialog, '#npc-name'))) {
        return flowClick(dialog.querySelector('#npc-options button.primary'), 'continue-summary', now);
      }
      if (state.launchStage === cfg.expedition && dialog.querySelector('#npc-text .diff')) {
        const button = [...dialog.querySelectorAll('#npc-options button')].find(b => /前往野外|ir al campo|ir para o campo|go to the field/i.test(b.textContent));
        if (button) { state.launchPending = true; return flowClick(button, 'difficulty', now); }
        log('遠征確認不是單人出發流程，等待手動確認'); return true;
      }
      return true;
    }
    if (visible($('#stages'))) {
      const cards = readStages();
      const stage = state.stages.find(s => s.id === cfg.expedition);
      const card = stage && cards.find(c => Number(c.dataset.i) === stage.index);
      if (!card) { log('找不到設定的副本；請重新讀取副本清單'); return true; }
      if (stage.locked) { log(`副本未開放：${stage.name}；等待手動調整`); return true; }
      if (!card.classList.contains('sel')) return flowClick(card, `stage:${cfg.expedition}`, now);
      const go = $('#stg-go');
      if (!visible(go) || go.disabled) { log(`無法出發：${stage.name}；請檢查裝備評分、職業或劇情要求`); return true; }
      state.launchStage = cfg.expedition;
      if (flowClick(go, `depart:${cfg.expedition}`, now)) log(`自動遠征：${stage.name}，沿用遊戲目前的難度設定`);
      return true;
    }
    if (visible($('#lobby-ui')) && document.body.classList.contains('in-lobby') && !visible($('#loading'))) {
      const prompt = $('#lobby-prompt');
      if (visible(prompt) && /隊長|captain|capitán|capitão/i.test(prompt.textContent)) return flowClick(prompt, 'captain', now);
      log('重複遠征等待隊長；請先走到遠征隊長附近'); return true;
    }
    return false;
  }
  function movement(now) {
    const g = state.game;
    if (!g || !visible($('#hud')) || g.state !== 'playing' || g.player.dead || now < state.manualUntil || (document.hidden && !cfg.background) || (!document.hidden && editingSettings()) || g.replayMoves) { stopMove(); return; }
    if (!cfg.dodge && !cfg.chests && !cfg.pickups) { stopMove(); return; }
    if (now - state.lastMove < 110 || g.time === state.lastGameTime) return;
    state.lastMove = now; state.lastGameTime = g.time;
    const p = g.player;
    const enemies = [];
    for (const e of g.enemies) {
      if (e.dead || e.removed || !Number.isFinite(e.x) || Math.hypot(e.x - p.x, e.y - p.y) > 950) continue;
      const old = state.velocities.get(e), dt = old ? g.time - old.time : 0;
      const vx = dt > 0 && dt < .6 ? clamp((e.x - old.x) / dt, -400, 400) : 0;
      const vy = dt > 0 && dt < .6 ? clamp((e.y - old.y) / dt, -400, 400) : 0;
      state.velocities.set(e, { x: e.x, y: e.y, time: g.time });
      enemies.push({ x: e.x, y: e.y, vx, vy, radius: e.radius ?? e.def?.radius ?? 18 * (e.def?.scale ?? 1) });
    }
    enemies.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
    const targets = pickupTargets(g.pickups, p, g.zeny, g.chestCost(), cfg, enemies.slice(0, 100));
    let goal = null;
    // 遊戲拾取判定使用玩家 y-20，所有掉落物目標需加回 20。
    for (const target of targets.slice(0, 5)) {
      const destination = { x: target.x, y: target.y };
      if (!g.walk) { goal = destination; break; }
      if (state.route?.target !== target.pickup || state.route.until < now) {
        const [x, y] = g.walk.nearestWalkable(destination.x, destination.y);
        state.route = { target: target.pickup, until: now + 600, points: g.walk.pathTo(p.x, p.y, x, y) || [] };
      }
      while (state.route.points.length && Math.hypot(state.route.points[0].x - p.x, state.route.points[0].y - p.y) < 24) state.route.points.shift();
      if (state.route.points.length) { goal = state.route.points[0]; break; }
      if (Math.hypot(destination.x - p.x, destination.y - p.y) < 40) { goal = destination; break; }
    }
    if (!cfg.dodge && !goal) { stopMove(); return; }
    const zones = readZones();
    // 僅尋寶時仍評估路徑安全，怪物優先於拾箱。
    const scene = { player: p, enemies: enemies.slice(0, 100), zones, target: goal, bounds: g.bounds, previous: state.previous,
      speed: g.classDef.speed * 1.3 * g.stats.speedMult * (1 + g.buffValue('speed')) * (1 - g.buffValue('slow')),
      walkable: g.walk ? (ax, ay, bx, by) => {
        if (!g.walk.walkable(bx, by)) return false;
        const [x, y] = g.walk.resolve(ax, ay, bx, by);
        return Math.hypot(x - bx, y - by) < 3;
      } : null };
    const best = planMove(scene, cfg);
    if (!best || !best.dx && !best.dy) { stopMove(); return; }
    // 只呼叫與滑鼠移動相同的尋路入口；角色仍以遊戲原速度行走。
    g.moveTo(best.x, best.y); state.moveOwned = true; state.previous = best;
  }
  function tick() {
    try {
      if (!cfg.enabled) return;
      syncBackground();
      if (state.catalogLang !== state.settings?.lang) refreshCatalog();
      if ((!document.hidden && editingSettings()) || (document.hidden && !cfg.background)) { stopMove(); return; }
      if (window.RO_DEAD || $('#ro-tab-dead')) { stopMove(); log('遊戲分頁已停用，請先在遊戲中恢復'); return; }
      const now = performance.now();
      if (now < state.manualUntil) { stopMove(); return; }
      if (now - state.lastListRead > 1000) { state.lastListRead = now; if (visible($('#stages'))) readStages(); }
      if (collectReveal(now)) return;
      if (repeatStep(now)) return;
      if (visible($('#picker'))) actPicker(now);
      else { resetPicker(); movement(now); }
      state.errorCount = 0;
    } catch (error) {
      stopMove(); log(`執行失敗：${error.message}`); console.error('[RO助手]', error);
      if (++state.errorCount >= 3) { cfg.enabled = false; syncBackground(); save(); log('連續錯誤三次，已暫停；請查看診斷資訊'); }
    }
  }
  function renderStatus() {
    if (!ui) return;
    const g = state.game;
    ui.querySelector('#toggle').textContent = cfg.enabled ? '暫停 (F8)' : '啟動 (F8)';
    ui.querySelector('#toggle').classList.toggle('on', cfg.enabled);
    ui.querySelector('#mini').textContent = `RO ${cfg.enabled ? '▶' : 'Ⅱ'}`;
    ui.querySelector('#status').textContent = `${cfg.enabled ? '運行中' : '已暫停'} · ${g ? `本局 ${g.state}` : state.bridge}\n${state.message}`;
    const owned = ownedSkills();
    ui.querySelector('#owned').textContent = `本局技能 ${owned.length}/${cfg.skillSlots}（不含普攻）：` + (owned.map(id => SKILL_NAMES[id] || state.registry[id]?.name || id).join('、') || '等待進入遊戲');
    ui.querySelector('#fifth-field').hidden = cfg.skillSlots !== 5;
    ui.querySelector('#banish-toggle').textContent = cfg.banish ? '停止放逐' : '啟動放逐';
    ui.querySelector('#banish-toggle').classList.toggle('on', cfg.banish);
    ui.querySelector('#exclude-toggle').textContent = cfg.banishExcludeEnabled ? '停用排除放逐的技能' : '啟用排除放逐的技能';
    ui.querySelector('#exclude-toggle').classList.toggle('on', cfg.banishExcludeEnabled);
    ui.querySelector('#exclude-count').textContent = `${cfg.banishExcludeEnabled ? '排除名單已啟用' : '排除名單未啟用'}，已勾選 ${cfg.banishExclude.length} 個技能`;
    ui.querySelector('#repeat-status').textContent = `${cfg.repeat ? '重複遠征已啟用' : '重複遠征已關閉'} · 本次已自動開局 ${state.runsStarted} 次${cfg.repeatLimit ? `／${cfg.repeatLimit}` : '（無上限）'}`;
    ui.querySelector('#background-status').textContent = `背景掛機：${state.backgroundStatus}`;
    ui.querySelector('#log').textContent = state.logs.slice(-10).map(e => `${e.time} ${e.message}`).join('\n');
  }
  function populate() {
    for (const el of ui.querySelectorAll('[data-setting]')) {
      const value = cfg[el.dataset.setting];
      if (el.type === 'checkbox') el.checked = value;
      else if (el.type === 'radio') el.checked = Number(el.value) === value;
      else el.value = value;
    }
    for (const el of ui.querySelectorAll('[data-priority]')) el.value = displayPriority(cfg.priorities[el.dataset.priority], el.dataset.priority, state.catalog);
    readStages(); renderExclusions(); renderStatus();
  }
  function fitPanelPosition(remember = false) {
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const size = { width: rect.width || (panel?.hidden ? 84 : 390), height: rect.height || 42 };
    const point = clampPanelPosition({ x: parseFloat(root.style.left), y: parseFloat(root.style.top) }, size, { width: window.innerWidth, height: window.innerHeight });
    root.style.left = `${point.x}px`; root.style.top = `${point.y}px`; root.style.right = 'auto';
    if (remember) { try { localStorage.setItem(POSITION_STORAGE, JSON.stringify(point)); } catch {} }
    return point;
  }
  function resetPanelPosition() {
    root.style.left = `${window.innerWidth - (panel.hidden ? 100 : 410)}px`; root.style.top = '90px'; fitPanelPosition();
    try { localStorage.removeItem(POSITION_STORAGE); } catch {}
  }
  function togglePanel() { panel.hidden = !panel.hidden; fitPanelPosition(); }
  function installPanelDrag() {
    try {
      const stored = JSON.parse(localStorage.getItem(POSITION_STORAGE) || 'null');
      if (stored && Number.isFinite(stored.x) && Number.isFinite(stored.y)) { root.style.left = `${stored.x}px`; root.style.top = `${stored.y}px`; }
    } catch {}
    fitPanelPosition();
    ui.addEventListener('pointerdown', event => {
      const target = event.target, mini = target.closest?.('#mini'), handle = target.closest?.('#drag-handle');
      if ((!mini && !handle) || event.button !== 0 || event.isPrimary === false || (!mini && target.closest?.('button,input,select,textarea,a'))) return;
      const rect = root.getBoundingClientRect();
      state.panelDrag = { pointerId: event.pointerId, sx: event.clientX, sy: event.clientY,
        x: parseFloat(root.style.left) || rect.left, y: parseFloat(root.style.top) || rect.top, moved: false };
      try { (mini || handle).setPointerCapture?.(event.pointerId); } catch {}
      event.stopPropagation();
    });
    window.addEventListener('pointermove', event => {
      const drag = state.panelDrag;
      if (!drag || event.pointerId !== drag.pointerId) return;
      const dx = event.clientX - drag.sx, dy = event.clientY - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) < 5) return;
      drag.moved = true; root.style.left = `${drag.x + dx}px`; root.style.top = `${drag.y + dy}px`;
      fitPanelPosition(); event.preventDefault();
    }, { capture: true, passive: false });
    const end = event => {
      const drag = state.panelDrag;
      if (!drag || event.pointerId !== drag.pointerId) return;
      state.panelDrag = null;
      if (drag.moved) { state.suppressMiniClickUntil = performance.now() + 400; fitPanelPosition(true); }
    };
    window.addEventListener('pointerup', end, true); window.addEventListener('pointercancel', end, true);
    window.addEventListener('resize', () => { state.panelDrag = null; fitPanelPosition(true); });
  }
  function mount() {
    root = document.createElement('div'); root.id = 'ro-survivors-helper-host';
    root.style.cssText = `position:fixed;left:${window.innerWidth - 100}px;top:90px;z-index:2147483000;`;
    ui = root.attachShadow({ mode: 'open' });
    ui.innerHTML = `<style>
      :host{all:initial;color:#edf2ff;font:13px/1.6 system-ui,"Microsoft YaHei",sans-serif}*{box-sizing:border-box}button,input,select,textarea{font:inherit}button,select{cursor:pointer}button{border:1px solid #48628d;background:#253651;color:#e9f1ff;border-radius:7px;padding:5px 10px}button:hover{background:#354e76}button.on{background:#17654a}#mini{box-shadow:0 3px 15px #0008}#panel{width:390px;max-width:calc(100vw - 24px);max-height:calc(100vh - 130px);overflow:auto;background:#111d2af5;border:1px solid #50688b;border-radius:12px;box-shadow:0 8px 35px #0009;padding:15px;margin-top:7px}#panel[hidden]{display:none}.top{display:flex;gap:8px;align-items:center}.top strong{flex:1}#status{white-space:pre-wrap;color:#9fe3d0;margin:10px 0}label{display:block;margin:8px 0}input:not([type=checkbox]),select,textarea{width:100%;background:#0b1421;color:#e5edff;border:1px solid #40526c;border-radius:6px;padding:6px}input[type=checkbox]{accent-color:#5ad5ac}textarea{min-height:88px;resize:vertical}small,.hint{color:#adc0db}details{border-top:1px solid #31425d;padding-top:8px;margin-top:12px}summary{cursor:pointer;font-weight:650}h4{margin:12px 0 4px;color:#9bd9ff}#log{white-space:pre-wrap;word-break:break-word;font:11px/1.6 Consolas,monospace;max-height:160px;overflow:auto;color:#becce2}.row{display:flex;gap:8px}.row>*{flex:1}.checkrow{display:flex;flex-wrap:wrap;gap:0 12px}.checkrow label{margin:4px 0}.buttons{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}#config{min-height:150px}p{margin:7px 0}
      input[type=radio]{width:auto;accent-color:#5ad5ac}#fifth-field[hidden]{display:none}#banish-list{max-height:190px;overflow:auto;border:1px solid #31425d;border-radius:6px;padding:6px;margin-top:6px}#banish-list label{margin:3px 0}
      #drag-handle,#mini{touch-action:none;cursor:grab}#drag-handle strong{user-select:none}#drag-handle button{cursor:pointer}
    </style>
    <button id="mini" title="點擊展開／收起，按住拖動移位 (F9)">RO Ⅱ</button>
    <section id="panel" hidden>
      <div class="top" id="drag-handle"><strong title="按住標題拖動">RO 助手 ${VERSION} · 拖動</strong><button id="reset-position">歸位</button><button id="close">收起</button></div>
      <div id="status"></div><button id="toggle">啟動 (F8)</button>
      <div class="checkrow"><label><input data-setting="skills" type="checkbox"> 自動選技能</label><label><input data-setting="dodge" type="checkbox"> 自動避怪</label><label><input data-setting="chests" type="checkbox"> 尋寶與寶箱選卡</label><label><input data-setting="pickups" type="checkbox"> 安全拾取掉落物</label></div>
      <p id="owned" class="hint"></p>
      <div class="checkrow">技能欄位（不含普攻）：<label><input type="radio" name="skillSlots" data-setting="skillSlots" value="4"> 4 個</label><label><input type="radio" name="skillSlots" data-setting="skillSlots" value="5"> 5 個（二轉）</label></div>
      <label>第四個技能（空白＝任意技能）<input data-setting="fourth" list="skills-list" placeholder="例如 聖靈召喚 [soul_strike]"><datalist id="skills-list"></datalist></label>
      <label id="fifth-field" hidden>第五個技能（空白＝任意技能）<input data-setting="fifth" list="skills-list" placeholder="選擇 5 個技能時生效"></label>
      <label><input data-setting="rarityFirst" type="checkbox"> 技能升級先比稀有度，再比目標／急速／傷害</label>
      <small>適配 ro-survivors.com。固定三技：火箭術／冰箭術／雷擊術。寶箱固定先比使用者優先級，同級才比稀有度；本開關只影響技能升級。</small>
      <label><input data-setting="background" type="checkbox"> 背景掛機：切換分頁繼續運行</label><small id="background-status"></small>
      <details><summary>升級選牌前放逐已有技能</summary>
      <div class="buttons"><button id="banish-toggle">啟動放逐</button><button id="exclude-toggle">啟用排除放逐的技能</button></div>
      <label><input data-setting="banishBasic" type="checkbox"> 同時放逐普攻的升級牌（不佔 4／5 技名額）</label>
      <p class="hint">啟動後，先對牌面中「已擁有」的技能／普攻使用遊戲放逐按鈕，再選技能。未擁有的新技能不放逐。排除名單啟用後，勾選的技能會保留；勾選「普攻（所有武器）」可統一保護普攻。</p>
      <small id="exclude-count"></small><input id="banish-filter" placeholder="搜尋排除技能：中文名稱或 ID"><div id="banish-list"></div>
      </details>
      <details><summary>指定副本重複遠征</summary>
      <label><input data-setting="repeat" type="checkbox"> 啟用自動重複遠征</label>
      <label>要重複的副本<select data-setting="expedition"></select></label><button id="read-stages">讀取遊戲副本清單</button>
      <div class="row"><label>自動開局上限（0＝不限）<input data-setting="repeatLimit" type="number" min="0" max="9999"></label><label>局間等待毫秒<input data-setting="repeatDelay" type="number" min="1500" max="60000"></label></div>
      <p id="repeat-status" class="hint"></p><small>單人遠征結算後返回隊長，選定副本並沿用目前難度出發。首次請在隊長附近或開啟遠征清單；未解鎖、副本條件不符或組隊確認時等待手動操作。</small>
      </details>
      <details open><summary>五欄位寶箱優先級</summary>
      <p class="hint">每行一級，第一行為第一優先級；同級用 | 分隔。選入後顯示「中文名稱 [ID]」，舊版純 ID 自動補中文。空白＝無指定。可保留名稱與 ID 一起排序，或只填名稱／ID。包含匹配須寫 *傷害*。</p>
      ${Object.entries(SLOT_NAMES).map(([id, name]) => `<h4>${name}</h4><select data-catalog="${id}"><option>等待物品表…</option></select><textarea data-priority="${id}" placeholder="第一優先級\n第二優先級 | 同級另一項"></textarea>`).join('')}
      <label>三張都不在第一優先級時<select data-setting="rerollMode"><option value="card-deck">先重抽單張，再重抽整組</option><option value="deck-card">先重抽整組，再重抽單張</option><option value="card">僅重抽單張</option><option value="deck">僅重抽整組</option><option value="off">不重抽</option></select></label>
      <small>單張只會刷新同一欄位；有任一張命中第一級即停止重抽，選已配置的較高優先級，同級再比較稀有度。所有欄位都留空時不重抽，只比較稀有度。</small>
      <div class="row"><label>每箱重抽上限<input data-setting="maxRerolls" type="number" min="0" max="50"></label><label>保留單張次數<input data-setting="reserveCard" type="number" min="0" max="99"></label><label>保留整組次數<input data-setting="reserveDeck" type="number" min="0" max="99"></label></div>
      <label>重抽用盡／達上限後<select data-setting="exhausted"><option value="best">從現有卡片選最優項</option><option value="wait">等待手動選擇</option></select></label>
      <small>使用遊戲原有重抽次數；不購買、不補充。每局剩餘次數以遊戲按鈕為準。</small></details>
      <details><summary>走位、操作與診斷</summary>
      <label>避怪安全距離<input data-setting="safety" type="number" min="25" max="200"></label>
      <label>尋找寶箱最大距離<input data-setting="chestRange" type="number" min="100" max="12000"></label>
      <label>尋找掉落物最大距離<input data-setting="lootRange" type="number" min="100" max="12000"></label>
      <label>組隊掉落分配<select data-setting="partyRoll"><option value="greed">貪婪</option><option value="need">需求</option><option value="pass">放棄</option><option value="manual">等待手動</option></select></label>
      <label>每次選卡等待毫秒<input data-setting="delay" type="number" min="850" max="5000"></label>
      <label><input data-setting="skillReroll" type="checkbox"> 無合規技能牌時有限重抽整組</label>
      <p class="hint">安全目標中優先寶箱與磁鐵，再拾取其他掉落。方向鍵／WASD 或畫面點擊後讓出操作 3 秒。背景模式會暫時關閉遊戲「離開自動暫停」，並用背景時鐘繼續運行；保留手動暫停。瀏覽器凍結／卸載分頁或電腦休眠仍會中斷。</p>
      <div class="buttons"><button id="rescan">重新識別</button><button id="diagnose">顯示診斷</button></div><pre id="log"></pre>
      </details>
      <details><summary>匯入／匯出設定</summary><textarea id="config" spellcheck="false" placeholder="在這裡貼上設定 JSON"></textarea><div class="buttons"><button id="export">匯出到上框</button><button id="import">匯入上框設定</button></div><small>匯入後保持暫停，按啟動即可使用。</small></details>
    </section>`;
    document.body.appendChild(root); panel = ui.querySelector('#panel');
    ui.querySelector('#mini').onclick = () => { if (performance.now() >= state.suppressMiniClickUntil) togglePanel(); };
    ui.querySelector('#close').onclick = togglePanel;
    ui.querySelector('#reset-position').onclick = resetPanelPosition;
    installPanelDrag();
    ui.querySelector('#toggle').onclick = toggle;
    ui.addEventListener('keydown', e => { if (e.key !== 'F8' && e.key !== 'F9') e.stopPropagation(); });
    ui.addEventListener('keyup', e => e.stopPropagation());
    ui.addEventListener('input', e => {
      const el = e.target;
      if (el.dataset.priority) { cfg.priorities[el.dataset.priority] = el.value.slice(0, 5000); save(); }
      if (el.id === 'banish-filter') renderExclusions();
    });
    ui.addEventListener('change', e => {
      const el = e.target;
      if (el.dataset.setting) {
        const key = el.dataset.setting, wasRepeat = cfg.repeat;
        cfg = validateConfig({ ...cfg, [key]: el.type === 'checkbox' ? el.checked : el.value }); stopMove();
        if (key === 'repeat' && !wasRepeat && cfg.repeat) state.runsStarted = 0;
        if (key === 'repeat' || key === 'expedition') { state.flow = null; state.launchStage = ''; state.gameoverAt = null; }
      }
      if (el.dataset.exclude) {
        cfg.banishExclude = el.checked ? [...new Set([...cfg.banishExclude, el.dataset.exclude])] : cfg.banishExclude.filter(id => id !== el.dataset.exclude);
      }
      if (el.dataset.priority) cfg.priorities[el.dataset.priority] = el.value.slice(0, 5000);
      if (el.dataset.catalog && el.value) {
        const slot = el.dataset.catalog, area = ui.querySelector(`[data-priority="${slot}"]`);
        area.value = [area.value.trim(), displayPriority(el.value, slot, state.catalog)].filter(Boolean).join('\n'); cfg.priorities[slot] = area.value; el.value = '';
      }
      save(); syncBackground(); renderStatus();
    });
    ui.querySelector('#banish-toggle').onclick = () => { cfg.banish = !cfg.banish; save(); renderStatus(); };
    ui.querySelector('#exclude-toggle').onclick = () => { cfg.banishExcludeEnabled = !cfg.banishExcludeEnabled; save(); renderStatus(); };
    ui.querySelector('#read-stages').onclick = () => {
      if (visible($('#stages'))) { readStages(); log('副本清單已更新'); return; }
      const prompt = $('#lobby-prompt');
      if (visible(prompt) && /隊長|captain|capitán|capitão/i.test(prompt.textContent)) { prompt.click(); readStages(); log('已打開隊長的副本清單'); }
      else log('請先到遠征隊長附近，或手動打開遠征清單後再讀取');
    };
    ui.querySelector('#rescan').onclick = () => { resetPicker(); state.flow = null; state.errorCount = 0; if (!state.hooks) attach(); readStages(); log('已重新識別；本組重抽計數重新開始'); };
    ui.querySelector('#diagnose').onclick = () => {
      const g = state.game, picker = $('#picker'), kind = picker && pickerKind(picker);
      const report = { version: VERSION, site: location.origin, language: state.settings?.lang, bridge: state.bridge, state: g?.state, background: cfg.background, backgroundClock: state.backgroundStatus, hidden: document.hidden, autoPause: state.settings?.autoPause, enemies: g?.enemies?.length, chests: g?.pickups?.filter(p => p.kind === 'chest' && !p.dead).length, drops: g?.pickups?.filter(p => !p.dead).length, skillSlots: cfg.skillSlots, owned: ownedSkills(), basicAttack: basicAttackId(), usedRerolls: state.used, repeatStage: cfg.expedition, autoRuns: state.runsStarted, banish: cfg.banish, banishBasic: cfg.banishBasic, banishExcludeEnabled: cfg.banishExcludeEnabled, banishExclude: cfg.banishExclude,
        cards: visible(picker) && kind ? [...picker.querySelectorAll('.pk-card')].map((b, i) => { const c = readCard(b, i, kind); return { name: c.name, id: c.id, slot: c.slot, rarity: c.rarity, lines: c.lines }; }) : [] };
      ui.querySelector('#config').value = JSON.stringify(report, null, 2); ui.querySelector('#config').closest('details').open = true;
    };
    ui.querySelector('#export').onclick = () => { ui.querySelector('#config').value = JSON.stringify(cfg, null, 2); };
    ui.querySelector('#import').onclick = () => {
      try { cfg = validateConfig(JSON.parse(ui.querySelector('#config').value)); cfg.enabled = false; stopMove(); syncBackground(); save(); populate(); log('設定已匯入，保持暫停'); } catch (error) { log(`匯入失敗：${error.message}`); }
    };
    populate(); refreshCatalog();
    interval = setInterval(tick, 100); setInterval(renderStatus, 500);
    attach(); attachTimer = setInterval(attach, 5000);
  }
  window.addEventListener('keydown', e => {
    const editing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName) || e.target?.isContentEditable || !!ui?.activeElement;
    if (e.key === 'F8') { e.preventDefault(); e.stopImmediatePropagation(); toggle(); return; }
    if (e.key === 'F9' && panel) { e.preventDefault(); e.stopImmediatePropagation(); togglePanel(); return; }
    if (e.key === 'Escape') state.resumeAfterVisibility = false;
    if (editing) { stopMove(); return; }
    if (e.isTrusted && /^(w|a|s|d|arrowup|arrowdown|arrowleft|arrowright)$/i.test(e.key)) { state.manualUntil = performance.now() + 3000; stopMove(); }
  }, true);
  window.addEventListener('pointerdown', e => {
    if (!e.composedPath().includes(root) && e.target instanceof HTMLCanvasElement && e.isTrusted) { state.manualUntil = performance.now() + 3000; stopMove(); }
  }, true);
  window.addEventListener('blur', () => { if (!cfg.enabled || !cfg.background) stopMove(); });
  window.addEventListener('ro-lang', () => setTimeout(refreshCatalog, 0));
  window.addEventListener('ro-pause', () => { state.resumeAfterVisibility = false; }, true);
  document.addEventListener('visibilitychange', () => {
    state.resumeAfterVisibility = needsBackgroundClock(cfg, document.hidden) && state.game?.state === 'playing';
    syncBackground();
    if (state.resumeAfterVisibility) setTimeout(resumeVisibilityPause, 0);
    if (document.hidden && !cfg.background) stopMove();
  }, true);
  window.addEventListener('pagehide', () => {
    stopBackgroundClock();
    if (state.settings && state.autoPauseOriginal !== null) state.settings.autoPause = state.autoPauseOriginal;
  });
  window.__RO_SURVIVORS_HELPER__ = Object.freeze({ version: VERSION });
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount, { once: true });
})();

