'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const vm = require('node:vm');
const C = require('../src/ro-survivors-helper.user.js');
const { buildRelease } = require('../scripts/build-release.cjs');
const cfg = C.validateConfig({ ...C.DEFAULTS, skillSlots: 5, banish: true });
for (const labels of [['藥水','秘藥','祝福','料理','神祇'], ['Potion','Elixir','Blessing','Dish','Deity'], ['Poción','Elixir','Bendición','Plato','Deity'], ['Poção','Elixir','Bênção','Prato','Divindade']])
  assert.deepEqual(labels.map(label => C.slotId(label)), ['potion','elixir','blessing','dish','deity']);
for (const title of ['寶箱','Treasure chest','Cofre del tesoro','Baú do tesouro']) assert.equal(C.pickerKindOf(title), 'chest');
for (const title of ['升級！','Level Up!','¡Level Up!','Subiu de nível!']) assert.equal(C.pickerKindOf(title), 'skill');
assert.equal(C.slotId('未識別欄位'), '');
assert(C.matchToken('火箭術神祇', { name: '火箭術 Deity +3' }));
assert.deepEqual(['Lanças de Fogo', 'Lanças de Gelo', 'Relâmpago'].map(name => C.skillId(name)), C.FIXED);
assert.equal(C.STAGES[9][0], 'louyang');
const basic = { id: 'atk_test', isNew: false, canBanish: true };
assert.equal(C.banishCandidate([basic], C.FIXED, cfg, 'atk_test'), basic);
assert.equal(C.banishCandidate([basic], C.FIXED, { ...cfg, banishExcludeEnabled: true, banishExclude: [C.BASIC_ANY] }, 'atk_test'), null);
const drops = C.pickupTargets([{ kind: 'loot', x: 505, y: 480 }, { kind: 'chest', x: 1100, y: 480 }, { kind: 'magnet', x: 900, y: 480 }], { x: 500, y: 500 }, 100, 30, cfg);
assert.deepEqual(drops.map(t => t.pickup.kind), ['magnet', 'chest', 'loot']);
const extra = { id: 'napalm', isNew: true, rarity: 0, index: 0, lines: '' };
assert.equal(C.chooseSkill([extra], [...C.FIXED, 'soul_strike'], cfg).id, 'napalm');
assert.equal(C.chooseSkill([extra], [...C.FIXED, 'soul_strike'], { ...cfg, skillSlots: 4 }), null);
const gods = [
  { id: 'coldbolt', name: '冰箭術 Deity +3', slot: 'deity', rarity: 3, index: 0 },
  { id: 'g_wisdom', name: '智慧之神', slot: 'deity', rarity: 2, index: 1 },
  { id: 'g_avarice', name: '貪婪之神', slot: 'deity', rarity: 0, index: 2 }
];
const godCfg = C.validateConfig({ ...cfg, rarityFirst: true, priorities: { deity: '貪婪之神 [g_avarice]\n智慧之神 [g_wisdom]' } });
assert.equal(C.chestDecision(gods, godCfg, { used: 0, card: 9, deck: 9 }, true, []).card.id, 'g_avarice');
assert.equal(C.chestDecision(gods.slice(0, 2), godCfg, { used: 0, card: 0, deck: 0 }, true, []).card.id, 'g_wisdom');
assert.equal(C.rankChest(gods, C.DEFAULTS)[0].id, 'coldbolt');
assert.equal(C.rankChest(gods, { ...godCfg, priorities: { deity: 'g_avarice | g_wisdom' } })[0].id, 'g_wisdom');
assert.deepEqual(C.clampPanelPosition({ x: 999, y: -1 }, { width: 390, height: 600 }, { width: 1000, height: 800 }), { x: 602, y: 8 });
assert.deepEqual(C.clampPanelPosition({ x: 900, y: 900 }, { width: 390, height: 600 }, { width: 300, height: 200 }), { x: 8, y: 8 });
for (const enabled of [false, true]) for (const background of [false, true]) for (const hidden of [false, true])
  assert.equal(C.needsBackgroundClock({ enabled, background }, hidden), enabled && background && hidden);
const timers = new Map(), messages = [];
let timerId = 0;
const worker = vm.createContext({ self: { postMessage: m => messages.push(m) }, setInterval: (fn, ms) => { assert.equal(ms, 50); const id = ++timerId; timers.set(id, fn); return id; }, clearInterval: id => timers.delete(id) });
vm.runInContext(C.BACKGROUND_WORKER_SOURCE, worker);
worker.self.onmessage({ data: 'start' }); worker.self.onmessage({ data: 'start' }); assert.equal(timers.size, 1);
[...timers.values()][0](); assert.deepEqual(messages, ['pulse']);
worker.self.onmessage({ data: 'stop' }); assert.equal(timers.size, 0);
const source = fs.readFileSync(require.resolve('../src/ro-survivors-helper.user.js'), 'utf8');
assert(source.includes('@match        https://ro-survivors.com/*'));
assert(!source.includes('@match        https://ro.hans-webgametw.com/'));
const release = buildRelease(source, 'rzj0506/auto-ro-survivors');
assert.equal(release.version, C.VERSION);
assert(release.meta.includes('@updateURL    https://raw.githubusercontent.com/rzj0506/auto-ro-survivors/userscript-release/ro-survivors-helper.meta.js'));
assert.equal(release.script.match(/@updateURL/g).length, 1);
assert.equal(release.script.match(/@downloadURL/g).length, 1);
assert.equal(release.script.match(/@namespace\s+(.+)/)[1].trim(), source.match(/@namespace\s+(.+)/)[1].trim());
assert(!release.meta.includes('(() =>'));
assert.equal(release.manifest.sha256, crypto.createHash('sha256').update(release.script).digest('hex'));
assert.throws(() => buildRelease(source.replace('const VERSION =', 'const OTHER_VERSION ='), 'rzj0506/auto-ro-survivors'));
assert.throws(() => buildRelease(source, '../bad/repo'));
assert.throws(() => buildRelease(source, 'rzj0506/auto-ro-survivors', '../bad'));
assert.throws(() => buildRelease('not a userscript', 'rzj0506/auto-ro-survivors'));
console.log('Userscript and release metadata checks passed.');
