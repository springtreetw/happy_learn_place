const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const nestedSource = path.join(__dirname, 'source', 'shiba-gallery');
const root = fs.existsSync(nestedSource) ? nestedSource : __dirname;

class Element {
  constructor(id = '') { this.id = id; this.listeners = {}; this.style = {}; this.value = ''; this.hidden = false; this.disabled = false; this.dataset = {}; this.className = ''; const classes = new Set(); this.classList = { add: (...names) => names.forEach(name => classes.add(name)), remove: (...names) => names.forEach(name => classes.delete(name)), contains: name => classes.has(name), toggle: (name, force) => { const add = force === undefined ? !classes.has(name) : force; if (add) classes.add(name); else classes.delete(name); return add; } }; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  fire(type, event = {}) { for (const fn of this.listeners[type] || []) fn(event); }
  focus() {}
  select() {}
  scrollIntoView() {}
}

function start(storage, randoms = [], mode = 'shop', testMode = false) {
  const absent = new Set(mode === 'shop' ? ['grid','search','count','filterCount','percent','progress','displayImage','displayName','chooseDisplay','displayButton','closeModal','overlay'] : mode === 'math' ? ['grid','search','count','filterCount','percent','progress','displayImage','displayName','chooseDisplay','displayButton','closeModal','overlay','gachaScene','capsuleShell','drawButton','skipButton','againButton','resultCard','resultImage','resultName','resultRarity','resultMessage','resultCoins','historyList','rateText','oddsList','insufficient','resetTestData'] : mode === 'home' ? ['grid','search','count','filterCount','percent','progress','displayImage','displayName','chooseDisplay','displayButton','closeModal','overlay','gachaScene','capsuleShell','drawButton','skipButton','againButton','resultCard','resultImage','resultName','resultRarity','resultMessage','resultCoins','historyList','rateText','oddsList','insufficient','resetTestData'] : ['gachaScene','capsuleShell','drawButton','skipButton','againButton','coins','resultCard','resultImage','resultName','resultRarity','resultMessage','resultCoins','historyList','rateText','oddsList','insufficient']);
  const elements = new Map(), timers = new Map(), timeoutCalls = []; let timerId = 0;
  const get = id => { if (absent.has(id)) return null; if (!elements.has(id)) { const el = new Element(id); if (id === 'resultCard') el.hidden = true; elements.set(id, el); } return elements.get(id); };
  if (mode === 'shop') get('resultCard');
  if (mode === 'home') ['coins','homeDisplayImage','homeDisplayName'].forEach(get);
  const filters = [new Element('filter-all'), new Element('filter-collected')]; filters[0].dataset.filter = 'all'; filters[1].dataset.filter = 'collected';
  const math = Object.create(Math); math.random = () => randoms.length ? randoms.shift() : 0;
  const context = {
    window: { SHIBA_BUILD_CONFIG: { testMode }, confirm: () => true, addEventListener() {} }, Math: math, Date, JSON, Number, String, Array, Object, Set,
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => { if (storage.failWrites) throw new Error('quota'); storage.set(key, value); } },
    document: { getElementById: get, querySelectorAll: selector => selector === '.filter' && mode === 'gallery' ? filters : [], querySelector: () => null, addEventListener() {} },
    setTimeout: (fn, delay) => { const id = ++timerId; timers.set(id, fn); timeoutCalls.push(delay); return id; }, clearTimeout: id => timers.delete(id), requestAnimationFrame: fn => fn()
  };
  context.window.matchMedia = () => ({ matches: false });
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'app-config.js'), 'utf8'), context);
  context.window.SHIBA_BUILD_CONFIG = { testMode };
  vm.runInContext(fs.readFileSync(path.join(root, 'rarity.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'gacha-core.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'app.js'), 'utf8'), context);
  return { api: context.window.SHIBA_GAME, elements, context, timers, timeoutCalls, randoms, runNextTimer: () => { const first = timers.entries().next().value; if (first) { timers.delete(first[0]); first[1](); } }, runTimers: () => { while (timers.size) { const first = timers.entries().next().value; timers.delete(first[0]); first[1](); } } };
}

const rarityApp = start(new Map());
const rarity = rarityApp.context.window.SHIBA_RARITY;
assert.deepEqual(Object.values(rarity.groups).map(group => group.chance), [50, 30, 15, 5]);
assert.equal(Object.values(rarity.groups).reduce((sum, group) => sum + group.chance, 0), 100);
assert.deepEqual(Object.values(rarity.groups).map(group => group.ids.length), [16, 8, 6, 2]);
assert.equal(rarity.draw((() => { const xs=[0.499,0]; return () => xs.shift(); })()), 2);
assert.equal(rarity.draw((() => { const xs=[0.50,0]; return () => xs.shift(); })()), 4);
assert.equal(rarity.draw((() => { const xs=[0.80,0]; return () => xs.shift(); })()), 23);
assert.equal(rarity.draw((() => { const xs=[0.95,0]; return () => xs.shift(); })()), 7);
const pool = rarity.drawPool();
assert.equal(pool.length, 31); assert.equal(new Set(pool).size, 31); assert.equal(pool.includes(1), false);
const core = rarityApp.context.window.SHIBA_GACHA_CORE;
const byCount = n => [1, ...pool.slice(0, n)];
assert.equal(core.newChance([1], 0), 100);
for (const [n, p] of [[1,61.25],[5,66.25],[10,72.5],[15,78.75],[20,85],[25,91.25],[28,95],[29,95],[30,95],[31,0]]) assert.equal(core.newChance(byCount(n), 0), p);
assert.equal(core.newChance(byCount(28), 1), 97); assert.equal(core.newChance(byCount(28), 2), 98);
assert.equal(core.draw([1], 0, () => 0).duplicate, false);
assert.equal(core.draw([1, ...pool], 5, () => 0).duplicate, true);
assert.equal(core.draw([1, ...pool.slice(0, 30)], 0, () => 0).duplicate, false);
assert.equal(core.pool().includes(1), false);
for (const target of pool) assert.equal(core.draw([1, ...pool.filter(id => id !== target)], 0, () => 0).id, target);
const onlyCommon = core.draw([1, 2, ...pool.filter(id => rarity.byId[id] !== 'common')], 5, () => 0);
assert.equal(onlyCommon.duplicate, false); assert.equal(onlyCommon.tier, 'common');
let seed = 0x12345678;
const seeded = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 0x100000000; };
const simState = [1, 2]; let freshCount = 0, tierCounts = { common:0, rare:0, epic:0, legendary:0 };
for (let i=0;i<50000;i++) { const d=core.draw(simState,0,seeded); if (!d.duplicate) { freshCount++; tierCounts[d.tier]++; } }
assert.ok(Math.abs(freshCount / 50000 - 0.6125) < 0.012);
for (const [tier, expected] of Object.entries({common:.5,rare:.3,epic:.15,legendary:.05})) assert.ok(Math.abs(tierCounts[tier] / freshCount - expected) < .012);

// Fresh profile and the legacy demo migration.
const legacyDemo = new Map([['shibaGallery.stage2.v2', JSON.stringify({ collected:[1,4,9,12,18,25], display:25 })]]);
const fresh = start(legacyDemo);
let state = fresh.api.getState();
assert.equal(fresh.elements.get('resultCard').hidden, true);
assert.equal(state.coins, 0); assert.deepEqual(Array.from(state.collected), [1]); assert.equal(state.display, 1);
assert.deepEqual(Array.from(state.drawHistory), []); assert.equal(state.initialized, true);
assert.equal(state.consecutiveDuplicates, 0);
assert.equal(JSON.parse(legacyDemo.get('shibaGallery.stage3.v1')).coins, 0);
const legacyOwned = new Map([['shibaGallery.stage2.v2', JSON.stringify({ collected:[1,2,4], display:4, coins:77 })]]);
const migrated = start(legacyOwned);
assert.deepEqual(Array.from(migrated.api.getState().collected), [1,2,4]); assert.equal(migrated.api.getState().display, 4); assert.equal(migrated.api.getState().coins, 77);
const oldStage3 = new Map([['shibaGallery.stage3.v1', JSON.stringify({ version:1, collected:[1,4], display:4, coins:250, lastDraw:{ id:4, duplicate:false, at:1234 } })]]);
const upgraded = start(oldStage3);
assert.equal(upgraded.api.getState().coins, 250); assert.equal(upgraded.api.getState().drawHistory[0].id, 4);
assert.equal(upgraded.api.getState().display, 4);

// No balance: disabled button and clear math-practice prompt, no transaction.
assert.equal(fresh.elements.get('drawButton').disabled, true);
assert.equal(fresh.elements.get('insufficient').hidden, false);
fresh.elements.get('drawButton').fire('click');
assert.equal(fresh.api.getState().drawHistory.length, 0); assert.equal(fresh.api.getState().coins, 0);
fresh.runTimers();

// Award API validates input and de-duplicates transaction IDs.
assert.equal(fresh.api.awardCoins(-1, 'lesson', 'q-1').ok, false);
assert.equal(fresh.api.awardCoins(100, '', 'q-1').ok, false);
assert.equal(fresh.api.awardCoins(100, 'lesson', '').ok, false);
assert.equal(fresh.api.awardCoins(100, 'lesson', 'q-1').coins, 100);
assert.equal(fresh.api.awardCoins(100, 'lesson', 'q-1').duplicate, true);
assert.equal(fresh.api.getState().coins, 100);

// Draw commits its result before animation. Its identity remains hidden until reveal.
fresh.elements.get('drawButton').fire('click');
state = fresh.api.getState();
assert.equal(state.coins, 0); assert.deepEqual(Array.from(state.collected), [1,2]); assert.equal(state.display, 1);
assert.equal(state.drawHistory.length, 1); assert.equal(state.drawHistory[0].id, 2); assert.equal(state.drawHistory[0].duplicate, false);
assert.equal(state.consecutiveDuplicates, 0);
assert.equal(JSON.parse(legacyDemo.get('shibaGallery.stage3.v1')).drawHistory.length, 1);
assert.equal(fresh.elements.get('resultCard').hidden, true);
assert.equal(fresh.elements.get('historyList').innerHTML.includes('休閒'), false);
assert.equal(fresh.elements.get('drawButton').disabled, true);
assert.equal(fresh.elements.get('gachaScene').dataset.phase, 'start');
fresh.runNextTimer(); assert.equal(fresh.elements.get('gachaScene').dataset.phase, 'operate');
fresh.runNextTimer(); assert.equal(fresh.elements.get('gachaScene').dataset.phase, 'drop');
fresh.runNextTimer(); assert.equal(fresh.elements.get('gachaScene').dataset.phase, 'open');
fresh.elements.get('drawButton').fire('click');
assert.equal(fresh.api.getState().drawHistory.length, 1);
// Reload mid-animation recovers the saved result and never redraws or charges again.
const recovered = start(legacyDemo);
assert.equal(recovered.api.getState().coins, 0); assert.equal(recovered.api.getState().drawHistory.length, 1);
assert.equal(recovered.elements.get('resultCard').hidden, true);
// Skip only finishes presentation.
fresh.elements.get('skipButton').fire('click');
assert.equal(fresh.elements.get('resultCard').hidden, false);
assert.equal(fresh.api.getState().drawHistory.length, 1); assert.equal(fresh.api.getState().coins, 0);
fresh.runTimers();

// Re-draw from the result overlay closes the card first; payment and result persist before animation starts.
const overlayFlow = start(new Map());
overlayFlow.api.awardCoins(200, 'overlay setup', 'overlay-setup');
overlayFlow.elements.get('drawButton').fire('click'); overlayFlow.runTimers();
assert.equal(overlayFlow.elements.get('resultCard').hidden, false);
overlayFlow.api.awardCoins(100, 'overlay setup', 'overlay-setup-2');
overlayFlow.randoms.push(0.999, 0, 0);
overlayFlow.elements.get('drawButton').fire('click');
assert.equal(overlayFlow.api.getState().drawHistory.length, 2);
assert.equal(overlayFlow.elements.get('gachaScene').classList.contains('is-running'), false);
assert.ok(overlayFlow.timeoutCalls.includes(190));
overlayFlow.runNextTimer();
assert.equal(overlayFlow.elements.get('resultCard').hidden, true);
assert.equal(overlayFlow.elements.get('gachaScene').classList.contains('is-running'), true);
overlayFlow.elements.get('skipButton').fire('click');

// A duplicate charges 100, refunds exactly 20, and only records once.
assert.equal(fresh.api.awardCoins(100, 'test setup', 'q-2').coins, 100);
fresh.randoms.push(0.999, 0, 0);
fresh.elements.get('drawButton').fire('click');
state = fresh.api.getState();
assert.equal(state.coins, 20); assert.deepEqual(Array.from(state.collected), [1,2]);
assert.equal(state.drawHistory.length, 2); assert.equal(state.drawHistory[0].duplicate, true); assert.equal(state.drawHistory[0].refund, 20);
assert.equal(state.consecutiveDuplicates, 1);
fresh.elements.get('skipButton').fire('click');
const reloaded = start(legacyDemo);
assert.equal(reloaded.api.getState().coins, 20); assert.equal(reloaded.api.getState().display, 1);
assert.equal(reloaded.api.getState().drawHistory.length, 2);
assert.equal(reloaded.api.getState().consecutiveDuplicates, 1);

// Test ledger is separate, persists its one-time grant, and resets without touching formal data.
const isolated = new Map([['shibaGallery.stage3.v1', JSON.stringify({ version:3, coins:321, collected:[1,2], display:2, drawHistory:[], awardTransactions:[] })]]);
const testLedger = start(isolated, [], 'shop', true);
assert.equal(testLedger.api.getState().coins, 100000); assert.equal(testLedger.api.testMode, true);
assert.equal(testLedger.elements.get('testModeTools').hidden, false);
testLedger.api.awardCoins(50, 'test', 'test-coin');
const testReload = start(isolated, [], 'shop', true);
assert.equal(testReload.api.getState().coins, 100050);
testReload.elements.get('resetTestData').fire('click');
assert.equal(testReload.api.getState().coins, 100000); assert.deepEqual(Array.from(testReload.api.getState().collected), [1]);
assert.equal(JSON.parse(isolated.get('shibaGallery.stage3.v1')).coins, 321);
assert.equal(JSON.parse(isolated.get('shibaGallery.stage3.test.v1')).coins, 100000);
const formalAgain = start(isolated);
assert.equal(formalAgain.api.getState().coins, 321); assert.equal(formalAgain.api.testMode, false);

// Activity-specific challenge progress survives reloads and remains isolated by practice ID and ledger.
const progressStorage = new Map(); const progressApp = start(progressStorage);
const savedChallenge = { version: 1, challengeId: 'test-session', current: 3, started: true, questions: [{ wrongEver: true, abandoned: false }] };
assert.equal(progressApp.api.savePracticeProgress('four-digit-add-subtract', savedChallenge).ok, true);
assert.equal(progressApp.api.getPracticeProgress('four-digit-add-subtract').challengeId, 'test-session');
assert.equal(progressApp.api.getPracticeProgress('three-digit-multiplication'), null);
const progressReload = start(progressStorage);
assert.equal(progressReload.api.getPracticeProgress('four-digit-add-subtract').current, 3);
assert.equal(progressReload.api.clearPracticeProgress('four-digit-add-subtract').ok, true);
assert.equal(progressReload.api.getPracticeProgress('four-digit-add-subtract'), null);
testLedger.api.savePracticeProgress('four-digit-add-subtract', savedChallenge);
const testProgressReload = start(isolated, [], 'shop', true);
assert.equal(testProgressReload.api.getPracticeProgress('four-digit-add-subtract').challengeId, 'test-session');
assert.deepEqual(JSON.parse(isolated.get('shibaGallery.stage3.v1')).practiceProgress, {});
assert.equal(start(isolated).api.getPracticeProgress('four-digit-add-subtract'), null);

// Store and gallery are separate pages but use the same saved profile.
const shop = start(legacyDemo, [], 'shop');
assert.equal(shop.api.getState().coins, 20);
assert.match(shop.elements.get('oddsList').innerHTML, /50%/);
const gallery = start(legacyDemo, [], 'gallery');
assert.equal(gallery.api.getState().coins, 20);
const home = start(legacyDemo, [], 'home');
assert.equal(home.elements.get('coins').textContent, '20');
assert.equal(home.elements.get('homeDisplayName').textContent, '原型 · 01');
assert.match(home.elements.get('homeDisplayImage').src, /shiba_01\.png$/);
const displayedCharacter = home.api.getDisplayCharacter();
assert.deepEqual({id:displayedCharacter.id,name:displayedCharacter.name,rarity:displayedCharacter.rarity,rarityLabel:displayedCharacter.rarityLabel},{id:1,name:'原型',rarity:'common',rarityLabel:'普通'});

// Exercise rewards stay provisional until completion, are persisted with the challenge, and settle once.
const exerciseLedger = new Map();
const exerciseGame = start(exerciseLedger, [], 'shop');
let attemptCoins = 0;
attemptCoins += 10; attemptCoins += 1;
attemptCoins = Math.max(0, attemptCoins - 5);
exerciseGame.api.savePracticeProgress('three-digit-multiplication', {version:2,challengeId:'session-a',pendingCoins:attemptCoins,current:3,questions:Array(50).fill({}),started:true,finished:false});
assert.equal(exerciseGame.api.getState().coins, 0, 'rewards and single-question penalties must not touch assets before completion');
const resumedExercise = start(exerciseLedger, [], 'shop');
assert.equal(resumedExercise.api.getPracticeProgress('three-digit-multiplication').pendingCoins, 6);
assert.equal(resumedExercise.api.awardCoins(6, '數學練習完成結算', 'session-a:completion').coins, 6);
assert.equal(resumedExercise.api.awardCoins(6, '數學練習完成結算', 'session-a:completion').duplicate, true);
assert.equal(start(exerciseLedger, [], 'shop').api.getState().coins, 6);
const abandonedRun = start(exerciseLedger, [], 'shop');
abandonedRun.api.savePracticeProgress('four-digit-add-subtract', {version:2,challengeId:'session-abandoned',pendingCoins:40,current:2,questions:Array(50).fill({}),started:true,finished:false});
abandonedRun.api.clearPracticeProgress('four-digit-add-subtract');
assert.equal(start(exerciseLedger, [], 'shop').api.getState().coins, 6, 'abandoning an attempt must discard provisional coins without changing assets');
const testExercise = start(new Map(), [], 'shop', true);
assert.equal(testExercise.api.getState().coins, 100000);
testExercise.api.savePracticeProgress('four-digit-add-subtract', savedChallenge);
assert.equal(testExercise.api.awardCoins(10, '數學練習完成結算', 'test-session:completion').coins, 100010);
assert.equal(testExercise.api.getState().coins, 100010);
assert.equal(JSON.parse(exerciseLedger.get('shibaGallery.stage3.v1')).coins, 6);
const shopHtml = fs.readFileSync(path.join(root, 'shop.html'), 'utf8');
const shopCss = fs.readFileSync(path.join(root, 'shop.css'), 'utf8');
const homeHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const galleryHtml = fs.readFileSync(path.join(root, 'collection.html'), 'utf8');
const mathHtml = fs.readFileSync(path.join(root, 'math.html'), 'utf8');
const practiceMenuHtml = fs.readFileSync(path.join(root, 'practice.html'), 'utf8');
const practiceCss = fs.readFileSync(path.join(root, 'practice-exercises.css'), 'utf8');
const exercisePages = ['four-digit-add-subtract.html','three-digit-multiplication.html'].map(file => fs.readFileSync(path.join(root, file), 'utf8'));
const buildConfig = fs.readFileSync(path.join(root, 'app-config.js'), 'utf8');
assert.match(shopHtml, /id="gachaScene"/); assert.match(shopHtml, /id="skipButton"/); assert.match(shopHtml, /id="historyList"/); assert.match(shopHtml, /id="closeResult"/);
assert.doesNotMatch(shopHtml, /今天會遇見|newChanceLabel|resultCoins|odds-card|oddsList|動畫中也不會重複扣款/);
assert.doesNotMatch(shopHtml, /扭蛋出口/);
assert.match(shopCss, /@keyframes overlay-arrive[\s\S]*?to\{[^}]*translate\(-50%,-50%\)/);
assert.match(shopCss, /\.capsule-shell\{[^}]*width:124px;height:124px/);
assert.match(buildConfig, /testMode:\s*true/);
assert.match(mathHtml, /practice.html/);
assert.match(practiceMenuHtml, /practiceList/); assert.match(practiceMenuHtml, /practice-menu.js/);
assert.match(practiceMenuHtml, /practiceDisplayImage/); assert.match(practiceMenuHtml, /id="coins"/);
assert.match(practiceCss, /\.site-header/);
assert.doesNotMatch(practiceCss, /timer-wiggle/);
assert.match(practiceCss, /\.timer-companion img\{[^}]*animation:companion-bob/);
for (const exerciseHtml of exercisePages) {
  assert.match(exerciseHtml, /practice-exercises\.css/);
  assert.match(exerciseHtml, /GAME\.awardCoins\(pendingCoins/);
  assert.match(exerciseHtml, /:completion/);
  assert.doesNotMatch(exerciseHtml, /GAME\.chargeCoins\(5/);
  assert.match(exerciseHtml, /id="abandonDialog"/);
  assert.match(exerciseHtml, /id="confirmAbandon"/);
  assert.match(exerciseHtml, /id="abandonQuestionDialog"/);
  assert.match(exerciseHtml, /abandonQuestionDialog"\)\.showModal\(\)/);
  assert.match(exerciseHtml, /id="confirmAbandonQuestion"/);
  assert.match(exerciseHtml, /Math\.max\(0,pendingCoins-5\)/);
  assert.match(exerciseHtml, /getDisplayCharacter\(\)/);
  assert.match(exerciseHtml, /rarity-label rarity-/);
  assert.match(exerciseHtml, /name\.textContent=companion\.name/);
  assert.match(exerciseHtml, /目前金幣 <strong id="pendingCoinDisplay"/);
  assert.match(exerciseHtml, /pendingCoinDisplay"\)\.textContent=pendingCoins\.toLocaleString/);
  assert.match(exerciseHtml, /pendingCoins\+=reward;correctCount\+\+\}\s*saveProgress\(\);renderPendingCoins\(\)/);
  assert.match(exerciseHtml, /savePracticeProgress/);
  assert.match(exerciseHtml, /放棄題數/);
  assert.match(exerciseHtml, /href="practice\.html"/);
  const inline = exerciseHtml.match(/<script>\s*"use strict";([\s\S]*?)<\/script>/);
  assert.ok(inline, 'inline exercise logic is present');
  new vm.Script(inline[1]);
}
assert.match(shopHtml, /href="practice.html"/); assert.match(galleryHtml, /href="practice.html"/);
assert.match(exercisePages[1], /abandoned===TOTAL\?'<div class="emptywrong neutral">本次 50 題皆已放棄/);
assert.match(homeHtml, /學習樂園/); assert.match(homeHtml, /homeDisplayImage/); assert.match(homeHtml, /id="coins"/);
assert.match(homeHtml, /收集夥伴/); assert.doesNotMatch(homeHtml, /收集柴柴/);
assert.match(galleryHtml, /collection-topbar \.brand[\s\S]*?text-decoration:none/);
assert.match(galleryHtml, /aria-label="回到學習樂園首頁"[\s\S]*?🎡[\s\S]*?學習樂園/);
for (const destination of ['practice.html','shop.html','collection.html']) assert.match(homeHtml, new RegExp(`href="${destination}"`));
assert.match(shopCss, /\.machine-body\{background:linear-gradient\(105deg,#ffe1c3/);
assert.match(shopHtml, /class="legendary-rainbow"/);
assert.match(shopCss, /\.gacha-scene\.is-running\[data-rarity=legendary\]\[data-phase=drop\] \.legendary-rainbow/);
assert.match(shopCss, /\.legendary-rainbow\{inset:-30%;filter:saturate\(1\.35\)/);
assert.match(shopCss, /legendary-rainbow\{opacity:\.64;animation:rainbow-turn 4\.6s/);
assert.equal((shopHtml.match(/<i>/g) || []).length >= 14, true);
assert.match(shopCss, /@media\(max-width:700px\)/); assert.match(shopCss, /prefers-reduced-motion/);
assert.match(shopCss, /handle-spin/); assert.match(shopCss, /capsule-drop-roll/);
assert.doesNotMatch(galleryHtml, /柴柴轉蛋池/);
for (const id of ['coins','gachaScene','capsuleShell','drawButton','skipButton','insufficient','resultCard','resultImage','resultName','resultRarity','resultMessage','closeResult','historyList']) assert.match(shopHtml, new RegExp(`id="${id}"`));
for (const id of ['grid','search','count','filterCount','percent','progress','displayImage','displayName','chooseDisplay','displayButton','closeModal','overlay']) assert.match(galleryHtml, new RegExp(`id="${id}"`));
assert.equal(fs.readdirSync(path.join(root, 'assets')).filter(file => /^shiba_\d{2}\.png$/.test(file)).length, 32);

// Storage errors must not report a successful draw or alter the saved state.
const failedStorage = new Map(); const storageApp = start(failedStorage);
storageApp.api.awardCoins(100, 'setup', 'setup-1');
failedStorage.failWrites = true;
storageApp.elements.get('drawButton').fire('click');
assert.equal(storageApp.api.getState().coins, 100); assert.equal(storageApp.api.getState().drawHistory.length, 0);

// Legendary outcomes select the gold capsule treatment and the longer reveal.
const legendaryApp = start(new Map(), [0.95, 0.3]);
legendaryApp.api.awardCoins(100, 'tier test', 'legend-test');
legendaryApp.elements.get('drawButton').fire('click');
assert.equal(legendaryApp.api.getState().drawHistory[0].id, 7);
assert.equal(legendaryApp.elements.get('gachaScene').dataset.rarity, 'common');
legendaryApp.runNextTimer(); assert.equal(legendaryApp.elements.get('gachaScene').dataset.phase, 'operate');
assert.equal(legendaryApp.elements.get('gachaScene').dataset.rarity, 'common');
legendaryApp.runNextTimer(); assert.equal(legendaryApp.elements.get('gachaScene').dataset.phase, 'drop');
assert.equal(legendaryApp.elements.get('gachaScene').dataset.rarity, 'legendary');
assert.equal(legendaryApp.timeoutCalls.at(-1), 4200);
legendaryApp.elements.get('skipButton').fire('click');

console.log('PASS: Stage 3 gacha and migration; provisional math rewards and capped penalties; settlement idempotency; both abandonment dialogs; all-abandoned results; rarity-colored display name; image-only motion; test/formal ledger isolation.');


