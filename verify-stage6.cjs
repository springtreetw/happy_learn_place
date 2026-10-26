const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = __dirname;

class Element {
  constructor(id = '') { this.id = id; this.listeners = {}; this.style = {}; this.value = ''; this.hidden = false; this.disabled = false; this.dataset = {}; this.className = ''; this.innerHTML = ''; this.textContent = ''; this.clientLeft = 1; this.clientTop = 1; this.scrollLeft = 0; this.scrollTop = 0; this.rect = { left: 0, top: 0, width: 0, height: 0 }; const classes = new Set(); this.classList = { add: (...names) => names.forEach(name => classes.add(name)), remove: (...names) => names.forEach(name => classes.delete(name)), contains: name => classes.has(name), toggle: (name, force) => { const add = force === undefined ? !classes.has(name) : force; if (add) classes.add(name); else classes.delete(name); return add; } }; }
  getBoundingClientRect() { return this.rect; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  fire(type, event = {}) { for (const fn of this.listeners[type] || []) fn(event); }
  focus() {}
  scrollIntoView() {}
}

function start(storage = new Map(), testMode = true, shop = true) {
  const elements = new Map();
  const get = id => { if (!elements.has(id)) { const el = new Element(id); if (id === 'badcatScene') el.rect = { left: 20, top: 30, width: 500, height: 500 }; if (id === 'badcatOutlet') el.rect = { left: 220, top: 400, width: 80, height: 40 }; if (id.includes('Result')) el.hidden = true; elements.set(id, el); } return elements.get(id); };
  const filters = [new Element('all'), new Element('collected')]; filters[0].dataset.filter = 'all'; filters[1].dataset.filter = 'collected';
  const math = Object.create(Math); math.random = () => 0;
  const timerCalls = [];
  const context = {
    window: { SHIBA_BUILD_CONFIG: { testMode }, confirm: () => true, addEventListener() {}, matchMedia: () => ({ matches: false }) },
    Math: math, Date, JSON, Number, String, Array, Object, Set, Map, console,
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => { if (storage.failWrites) throw new Error('quota'); storage.set(key, value); } },
    document: { getElementById: get, querySelectorAll: selector => selector === '.badcat-filter' ? filters : [], querySelector: selector => selector === '.badcat-filter.active' ? filters[0] : null, addEventListener() {} },
    setTimeout(fn, ms) { timerCalls.push({ fn, ms }); return timerCalls.length; }, clearTimeout() {}
  };
  if (!shop) context.window.addEventListener = () => {};
  vm.createContext(context);
  for (const file of ['app-config.js','rarity.js','gacha-core.js','app.js','badcat-rarity.js','badcat-gacha-core.js','badcat-app.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
    if (file === 'app-config.js') context.window.SHIBA_BUILD_CONFIG = { testMode };
  }
  return { context, elements, storage, timerCalls, game: context.window.SHIBA_GAME, badcatKey: testMode ? 'badcatGallery.test.v1' : 'badcatGallery.v1' };
}

// Catalog data matches the supplied names and rarity decisions.
const catalog = start(new Map(), true, false).context.window.BADCAT_RARITY;
assert.deepEqual(Object.values(catalog.groups).map(group => group.ids.length), [16, 8, 6, 2]);
assert.deepEqual(Array.from(catalog.groups.epic.ids), [4, 11, 15, 17, 21, 27]);
assert.deepEqual(Array.from(catalog.groups.legendary.ids), [22, 30]);
assert.equal(catalog.validate(), true);
assert.equal(catalog.drawPool().length, 31);
assert.equal(catalog.drawPool().includes(1), false);
assert.equal(new Set(Object.values(catalog.groups).flatMap(group => group.ids)).size, 32);

// Fixed-seed simulation exercises all tiers and the adaptive new/duplicate logic.
let seed = 0x5eed1234;
const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0x100000000; };
const core = start(new Map(), true, false).context.window.BADCAT_GACHA_CORE;
const outcomes = Array.from({ length: 50000 }, () => core.draw([1], 0, random));
assert.ok(outcomes.every(row => catalog.byId[row.id] === row.tier));
assert.deepEqual(new Set(outcomes.map(row => row.tier)), new Set(['common','rare','epic','legendary']));
assert.equal(core.newChance([1], 0), 100);
assert.equal(core.draw([1, ...core.pool()], 4, () => 0).duplicate, true);
assert.equal(core.drawPity([1], () => 0).tier, 'epic');
assert.equal(core.drawPity([1], () => .8).tier, 'legendary');
assert.equal(core.drawPity([1, 4], () => 0).duplicate, true);
// The advertised rarity rates stay fixed across collection progress.
for (const owned of [
  [1, ...catalog.groups.common.ids],
  [1, ...catalog.groups.common.ids, ...catalog.groups.rare.ids],
  [1, ...core.pool().filter(id => catalog.byId[id] !== 'legendary')],
  [1, ...core.pool()]
]) {
  let localSeed = 0x13579bdf;
  const localRandom = () => { localSeed = (localSeed * 1664525 + 1013904223) >>> 0; return localSeed / 0x100000000; };
  const counts = { common:0, rare:0, epic:0, legendary:0 };
  for (let i=0;i<40000;i++) counts[core.draw(owned, 0, localRandom).tier]++;
  for (const [tier, chance] of Object.entries({common:.5,rare:.3,epic:.15,legendary:.05})) assert.ok(Math.abs(counts[tier] / 40000 - chance) < .01);
}
const shibaCoreForIsolation = start(new Map(), true, false).context.window.SHIBA_GACHA_CORE;
let badcatSeed = 9; const sameBadcatRoll = () => { badcatSeed = (badcatSeed * 48271) % 2147483647; return badcatSeed / 2147483647; };
const badcatOwned = [1,2,3,4]; const beforeShibaComplete = core.draw(badcatOwned, 2, sameBadcatRoll);
shibaCoreForIsolation.draw([1, ...shibaCoreForIsolation.pool()], 12, () => .99);
badcatSeed = 9; const afterShibaComplete = core.draw(badcatOwned, 2, sameBadcatRoll);
assert.deepEqual({id:beforeShibaComplete.id,tier:beforeShibaComplete.tier,duplicate:beforeShibaComplete.duplicate},{id:afterShibaComplete.id,tier:afterShibaComplete.tier,duplicate:afterShibaComplete.duplicate});

// The Badcat shop charges and refunds through the exact shared Stage 5 coin ledger.
const storage = new Map();
const shop = start(storage, true, true);
assert.equal(shop.game.getState().coins, 100000);
assert.equal(shop.elements.get('coins').textContent, '100,000');
assert.equal(shop.elements.get('badcatCapsuleJourney').style.left, '239px');
assert.equal(shop.elements.get('badcatCapsuleJourney').style.top, '335px');
shop.game.awardCoins(100, 'test setup', 'badcat-setup');
shop.elements.get('badcatDrawButton').fire('click');
let badcat = JSON.parse(storage.get(shop.badcatKey));
assert.equal(shop.game.getState().coins, 100000);
assert.equal(badcat.collected.includes(2), true);
assert.equal(badcat.drawHistory.length, 1);
assert.equal(shop.game.getState().chargeTransactions.filter(tx => tx.id === badcat.drawHistory[0].transactionId).length, 1);
assert.equal(shop.elements.get('badcatScene').dataset.phase, 'start');
assert.equal(shop.elements.get('badcatHistory').innerHTML.includes('虎克船長'), false); // Active result stays out of history until reveal.
assert.deepEqual(shop.timerCalls.slice(-4).map(timer => timer.ms), [700, 1500, 2300, 4200]);
shop.timerCalls.at(-1).fn();
assert.equal(shop.elements.get('badcatResult').hidden, false);
assert.equal(shop.elements.get('badcatResultMessage').textContent, `${shop.elements.get('badcatResultName').textContent.split(' · ')[0]} 加入收藏！`);
assert.equal(shop.elements.get('badcatResultMessage').className, 'result-message');
assert.equal(shop.elements.get('badcatHistory').innerHTML.includes('虎克船長'), false);
shop.elements.get('badcatResultImage').onload();
assert.equal(shop.elements.get('badcatHistory').innerHTML.includes('虎克船長'), true);
assert.equal(shop.elements.get('badcatHistory').innerHTML.includes('普通 ·'), true);
shop.elements.get('badcatCloseResult').fire('click');
assert.equal(shop.elements.get('badcatResult').hidden, true, 'the Badcat result card close button hides the card');
shop.elements.get('badcatDrawButton').fire('click');
assert.equal(shop.elements.get('badcatResult').hidden, true); // Previous result disappears as soon as the next draw starts.

// A persisted in-flight duplicate draw resumes after reload with one charge and one refund.
const resumeStorage = new Map();
const first = start(resumeStorage, true, false);
first.game.awardCoins(100, 'setup', 'resume-setup');
first.game.chargeCoins(100, '壞壞貓轉蛋', 'pending-charge-1');
resumeStorage.set('badcatGallery.test.v1', JSON.stringify({ version: 1, collected: [1,2], display: 1, drawHistory: [], consecutiveDuplicates: 0, pendingDraw: { id: 2, tier: 'common', duplicate: true, isNew: false, at: 10, chargeId: 'pending-charge-1', refundId: 'pending-refund-1' } }));
const recovered = start(resumeStorage, true, false);
badcat = JSON.parse(resumeStorage.get('badcatGallery.test.v1'));
assert.equal(badcat.pendingDraw, null);
assert.equal(badcat.drawHistory.length, 1);
assert.equal(recovered.game.getState().coins, 100020);
assert.equal(recovered.game.getState().chargeTransactions.filter(tx => tx.id === 'pending-charge-1').length, 1);
assert.equal(recovered.game.getState().awardTransactions.filter(tx => tx.id === 'pending-refund-1').length, 1);
start(resumeStorage, true, false);
assert.equal(JSON.parse(resumeStorage.get('badcatGallery.test.v1')).drawHistory.length, 1);
assert.equal(JSON.parse(resumeStorage.get('shibaGallery.stage3.test.v1')).coins, 100020);

// Formal and test collections stay isolated; the test ledger alone receives 100,000.
const separated = new Map();
separated.set('shibaGallery.stage3.v1', JSON.stringify({ version: 3, initialized: true, coins: 77, collected: [1], display: 1 }));
separated.set('badcatGallery.v1', JSON.stringify({ version: 1, collected: [1,3], display: 3, drawHistory: [], consecutiveDuplicates: 0 }));
const testPage = start(separated, true, false);
assert.equal(testPage.game.getState().coins, 100000);
assert.equal(separated.has('badcatGallery.test.v1'), false); // Fresh test collection has not been mutated or copied from formal data.
assert.equal(JSON.parse(separated.get('badcatGallery.v1')).collected.includes(3), true);
const formalPage = start(separated, false, false);
assert.equal(formalPage.game.getState().coins, 77);
assert.deepEqual(Array.from(JSON.parse(separated.get('badcatGallery.v1')).collected), [1,3]);

// A formal Badcat pity draw is free, can award the normal duplicate refund, and persists independently.
const formalPityStorage = new Map();
formalPityStorage.set('shibaGallery.stage3.v1', JSON.stringify({ version:3, initialized:true, coins:0, collected:[1], display:1, drawHistory:[], awardTransactions:[], chargeTransactions:[] }));
formalPityStorage.set('badcatGallery.v1', JSON.stringify({ version:1, collected:[1,4], display:1, drawHistory:[], consecutiveDuplicates:0, consecutiveNoEpicPlus:10, pendingDraw:null }));
const formalPity = start(formalPityStorage, false, true);
assert.equal(formalPity.elements.get('badcatDrawButton').textContent, '保底 · 免費轉');
assert.equal(formalPity.elements.get('badcatDrawButton').disabled, false);
assert.equal(formalPity.elements.get('badcatDrawButton').classList.contains('is-pity'), true);
formalPity.elements.get('badcatDrawButton').fire('click');
badcat = JSON.parse(formalPityStorage.get('badcatGallery.v1'));
assert.equal(badcat.drawHistory.length, 1);
assert.equal(badcat.drawHistory[0].pity, true); assert.equal(badcat.drawHistory[0].cost, 0);
assert.equal(badcat.drawHistory[0].tier, 'epic'); assert.equal(badcat.drawHistory[0].duplicate, true);
assert.equal(badcat.consecutiveNoEpicPlus, 0);
assert.equal(formalPity.game.getState().coins, 20);
assert.equal(formalPity.game.getState().chargeTransactions.length, 0);
assert.equal(formalPity.game.getState().awardTransactions.length, 1);
assert.equal(start(formalPityStorage, false, false).game.getState().coins, 20);
assert.equal(JSON.parse(formalPityStorage.get('shibaGallery.stage3.v1')).consecutiveNoEpicPlus || 0, 0);

const testPityStorage = new Map();
testPityStorage.set('shibaGallery.stage3.v1', JSON.stringify({ version:3, initialized:true, coins:77, collected:[1], display:1, drawHistory:[], awardTransactions:[], chargeTransactions:[] }));
testPityStorage.set('badcatGallery.v1', JSON.stringify({ version:1, collected:[1], display:1, drawHistory:[], consecutiveNoEpicPlus:3 }));
testPityStorage.set('badcatGallery.test.v1', JSON.stringify({ version:1, collected:[1,4], display:1, drawHistory:[], consecutiveDuplicates:0, consecutiveNoEpicPlus:10, pendingDraw:null }));
const testPity = start(testPityStorage, true, true);
assert.equal(testPity.elements.get('badcatDrawButton').textContent, '保底 · 免費轉');
testPity.elements.get('badcatDrawButton').fire('click');
assert.equal(testPity.game.getState().coins, 100020);
assert.equal(JSON.parse(testPityStorage.get('shibaGallery.stage3.v1')).coins, 77);
assert.equal(JSON.parse(testPityStorage.get('badcatGallery.v1')).consecutiveNoEpicPlus, 3);
assert.equal(JSON.parse(testPityStorage.get('badcatGallery.test.v1')).drawHistory[0].pity, true);

// The two collection/gacha selectors lead to distinct product pages.
for (const [file, links] of [['collection-menu.html',['collection.html','badcat-collection.html']], ['gacha-menu.html',['shop.html','badcat-shop.html']]]) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  for (const link of links) assert.ok(html.includes(`href="${link}"`));
}
const shopHtml = fs.readFileSync(path.join(root, 'badcat-shop.html'), 'utf8');
assert.match(shopHtml, /我的金幣/); assert.match(shopHtml, /badcat-shop\.css/); assert.match(shopHtml, /壞壞貓暗夜轉蛋/);
assert.match(shopHtml, /RECENT DRAWS[\s\S]*抽獎紀錄[\s\S]*最新 8 筆/);
assert.doesNotMatch(shopHtml, /class="odds"|稀有度與抽獎紀錄/);
assert.match(shopHtml, /練習園地[\s\S]*轉蛋選擇[\s\S]*圖鑑選擇/);
assert.match(shopHtml, /id="badcatResultMessage"[\s\S]*id="badcatResultImage"/);
assert.match(shopHtml, /id="badcatDrawButton"/);
assert.match(fs.readFileSync(path.join(root, 'layout-alignment.css'), 'utf8'), /\.badcat-shop \.draw\.is-pity/);
assert.match(shopHtml, /class="outlet" id="badcatOutlet"/);
assert.match(shopHtml, /class="close-result" id="badcatCloseResult"/);
assert.doesNotMatch(shopHtml, /01「壞壞貓」是入門夥伴/);
const badcatGalleryHtml = fs.readFileSync(path.join(root, 'badcat-collection.html'), 'utf8');
assert.doesNotMatch(badcatGalleryHtml, /class="wallet"|id="coins"/);
assert.match(badcatGalleryHtml, /練習園地[\s\S]*轉蛋選擇[\s\S]*圖鑑選擇/);
assert.match(badcatGalleryHtml, /<div id="badcatTestTools" hidden><b>測試模式<\/b>/);
assert.match(fs.readFileSync(path.join(root, 'layout-alignment.css'), 'utf8'), /badcat-gallery #badcatTestTools\{font-size:inherit;color:var\(--ink\)/);
assert.match(fs.readFileSync(path.join(root, 'collection.html'), 'utf8'), /<h1>柴柴圖鑑<\/h1>/);
const shibaShopHtml = fs.readFileSync(path.join(root, 'shop.html'), 'utf8');
assert.match(shibaShopHtml, /id="resultMessage"[\s\S]*id="resultImage"/);
assert.match(fs.readFileSync(path.join(root, 'layout-alignment.css'), 'utf8'), /shop-page \.result-message,.badcat-shop \.result-message/);
assert.match(fs.readFileSync(path.join(root, 'layout-alignment.css'), 'utf8'), /\.shop-page \.result-close,\.badcat-shop \.close-result\{z-index:10\}/);
const selectorCss = fs.readFileSync(path.join(root, 'catalog-menu.css'), 'utf8');
assert.match(selectorCss, /\.catalog-menu a,\.catalog-menu a:visited\{color:var\(--ink\)\}/);
const selectorHtml = fs.readFileSync(path.join(root, 'gacha-menu.html'), 'utf8');
assert.match(selectorHtml, /<h1>選擇轉蛋商店<\/h1>/);
assert.match(selectorHtml, /柴柴轉蛋/); assert.match(selectorHtml, /壞壞貓轉蛋/);
const shibaAppSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'badcat-app.js'), 'utf8');
assert.doesNotMatch(shibaAppSource, /ownedByRarity\[tier\]/);
assert.doesNotMatch(shibaAppSource, /\$\{label\} · \$\{ownedByRarity/);
assert.doesNotMatch(appSource, /counts\[tier\]/);
const alignmentCss = fs.readFileSync(path.join(root, 'layout-alignment.css'), 'utf8');
assert.match(alignmentCss, /\.badcat-shop \.result\{left:50%;top:50%;right:auto;bottom:auto/);
assert.match(alignmentCss, /\.badcat-shop \.capsule-journey\{[^}]*left:50%;top:50%;[^}]*transform:translate\(-50%,-50%\)/);
assert.match(alignmentCss, /\.badcat-shop \.scene\.is-running\[data-phase=drop\] \.capsule-shell\{animation:badcat-capsule-drop-roll/);
assert.match(alignmentCss, /@keyframes badcat-glow-pulse\{from\{opacity:\.3;transform:translateX\(-50%\) scale\(/);
assert.match(alignmentCss, /\.shop-page \.result-message,\.badcat-shop \.result-message\{[^}]*display:flex!important;[^}]*text-align:center/);
assert.match(alignmentCss, /\.shop-page \.result-message,\.badcat-shop \.result-message\{[^}]*min-height:50px;[^}]*padding:12px 42px;[^}]*font-size:15px/);
assert.match(alignmentCss, /\.shop-page \.result-message,\.badcat-shop \.result-message\{[^}]*font-family:"Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif/);
assert.match(alignmentCss, /\.badcat-gallery \.display-panel/);
assert.match(fs.readFileSync(path.join(root, 'shop.css'), 'utf8'), /\.shop-page \.draw-button\.is-pity/);
const badcatImages = fs.readdirSync(path.join(root,'assets','badcat')).filter(file => /^cat_\d{2}\.png$/.test(file)).sort();
assert.deepEqual(badcatImages, Array.from({ length: 32 }, (_, i) => `cat_${String(i + 1).padStart(2, '0')}.png`));
const nameList = appSource.match(/const NAMES = \[([^\]]+)\]/)?.[1];
assert.ok(nameList); assert.equal((nameList.match(/'[^']*'/g) || []).length, 32);
console.log('PASS: 32-entry Badcat catalog; fixed 50/30/15/5 rarity odds across collection states; Shiba/Badcat independence; shared coin transactions; pending draw recovery; aligned shop elements and image reveal; test/formal separation; image package.');
