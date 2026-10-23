(() => {
  'use strict';
  const TOTAL = 32, COST = 100, REFUND = 20, TEST_MODE = Boolean(window.SHIBA_BUILD_CONFIG && window.SHIBA_BUILD_CONFIG.testMode), FORMAL_KEY = 'shibaGallery.stage3.v1', TEST_KEY = 'shibaGallery.stage3.test.v1', KEY = TEST_MODE ? TEST_KEY : FORMAL_KEY, LEGACY_KEY = 'shibaGallery.stage2.v2';
  const DEMO = [1, 4, 9, 12, 18, 25];
  const NAMES = ['原型','休閒','水手','探險家','星星魔法師','工裝小夥伴','天使','野外探險家','花田攝影師','棒球選手','青蛙雨衣','小廚師','小醫生','消防員','警察','小偵探','冬日暖暖裝','馴鹿','聖誕老人','南瓜精靈','吸血鬼','浴衣女孩','魔術師','搖滾吉他手','黑衣忍者','海灘玩水','田園小農','太空人','恐龍連身衣','獨角獸','新年福氣裝','小國王'];
  const RARITY = window.SHIBA_RARITY;
  const GACHA_CORE = window.SHIBA_GACHA_CORE;
  const $ = id => document.getElementById(id), pad = n => String(n).padStart(2, '0');
  const asset = id => `assets/shiba_${pad(id)}.png`, name = id => NAMES[id - 1];
  const validIds = ids => [...new Set(ids.filter(id => Number.isInteger(id) && id >= 1 && id <= TOTAL))];
  const fresh = () => ({ version: 3, initialized: true, coins: TEST_MODE ? 100000 : 0, collected: [1], display: 1, drawHistory: [], awardTransactions: [], chargeTransactions: [], mathPractice: null, practiceProgress: {}, consecutiveDuplicates: 0 });
  let drawing = false, activeDraw = null, activeItem = 1, animationTimers = [], toastTimer;

  function readState() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (saved && Array.isArray(saved.collected)) {
        const result = { ...fresh(), ...saved, version: 3, initialized: true };
        result.collected = validIds(result.collected);
        if (!result.collected.includes(1)) result.collected.unshift(1);
        if (!Number.isSafeInteger(result.coins) || result.coins < 0) result.coins = 0;
        if (!result.collected.includes(result.display)) result.display = 1;
        if (!Array.isArray(result.drawHistory)) result.drawHistory = [];
        result.drawHistory = result.drawHistory.filter(entry => entry && Number.isInteger(entry.id) && entry.id >= 1 && entry.id <= TOTAL && RARITY.byId[entry.id]);
        if (!result.drawHistory.length && saved.lastDraw && Number.isInteger(saved.lastDraw.id) && RARITY.byId[saved.lastDraw.id]) {
          const at = Number.isFinite(saved.lastDraw.at) ? saved.lastDraw.at : Date.now();
          result.drawHistory = [{ id: saved.lastDraw.id, tier: RARITY.byId[saved.lastDraw.id], duplicate: Boolean(saved.lastDraw.duplicate), cost: COST, refund: saved.lastDraw.duplicate ? REFUND : 0, coinsAfter: result.coins, at, transactionId: `recovered-${at}-${saved.lastDraw.id}` }];
        }
        if (!Array.isArray(result.awardTransactions)) result.awardTransactions = [];
        result.awardTransactions = result.awardTransactions.filter(tx => tx && typeof tx.id === 'string' && tx.id.trim());
        if (!Array.isArray(result.chargeTransactions)) result.chargeTransactions = [];
        result.chargeTransactions = result.chargeTransactions.filter(tx => tx && typeof tx.id === 'string' && tx.id.trim());
        if (!result.mathPractice || typeof result.mathPractice !== 'object') result.mathPractice = null;
        if (!result.practiceProgress || typeof result.practiceProgress !== 'object' || Array.isArray(result.practiceProgress)) result.practiceProgress = {};
        result.consecutiveDuplicates = Number.isSafeInteger(result.consecutiveDuplicates) && result.consecutiveDuplicates >= 0 ? result.consecutiveDuplicates : 0;
        return result;
      }
    } catch (_) {}
    if (!TEST_MODE) try {
      const old = JSON.parse(localStorage.getItem(LEGACY_KEY));
      if (old && Array.isArray(old.collected)) {
        const legacyIds = validIds(old.collected);
        const isDemo = legacyIds.length === DEMO.length && DEMO.every(id => legacyIds.includes(id));
        const collected = isDemo ? [1] : validIds([...legacyIds, 1]);
        const display = Number.isInteger(old.display) && collected.includes(old.display) ? old.display : 1;
        return {
          ...fresh(), coins: Number.isSafeInteger(old.coins) && old.coins >= 0 ? old.coins : fresh().coins,
          collected, display,
          drawHistory: Array.isArray(old.drawHistory) ? old.drawHistory.filter(entry => entry && Number.isInteger(entry.id) && RARITY.byId[entry.id]).slice(0, 30) : [],
          awardTransactions: Array.isArray(old.awardTransactions) ? old.awardTransactions : [],
          consecutiveDuplicates: Number.isSafeInteger(old.consecutiveDuplicates) && old.consecutiveDuplicates >= 0 ? old.consecutiveDuplicates : 0
        };
      }
    } catch (_) {}
    return fresh();
  }

  let state = readState();
  function persist(next) {
    const normalized = {
      version: 3, initialized: true, coins: next.coins,
      collected: validIds(next.collected), display: next.display,
      drawHistory: Array.isArray(next.drawHistory) ? next.drawHistory.slice(0, 30) : [],
      awardTransactions: Array.isArray(next.awardTransactions) ? next.awardTransactions : [],
      chargeTransactions: Array.isArray(next.chargeTransactions) ? next.chargeTransactions : [],
      mathPractice: next.mathPractice && typeof next.mathPractice === 'object' ? next.mathPractice : null,
      practiceProgress: next.practiceProgress && typeof next.practiceProgress === 'object' && !Array.isArray(next.practiceProgress) ? next.practiceProgress : {},
      consecutiveDuplicates: Number.isSafeInteger(next.consecutiveDuplicates) && next.consecutiveDuplicates >= 0 ? next.consecutiveDuplicates : 0
    };
    if (!normalized.collected.includes(1)) normalized.collected.unshift(1);
    if (!normalized.collected.includes(normalized.display)) normalized.display = 1;
    try { localStorage.setItem(KEY, JSON.stringify(normalized)); } catch (_) { return false; }
    state = normalized;
    return true;
  }

  function toast(message) {
    if (!$('toast')) return;
    $('toast').textContent = message; $('toast').classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2000);
  }
  function updateBalance() {
    if ($('coins')) $('coins').textContent = state.coins.toLocaleString('zh-Hant');
    if ($('testModeTools')) $('testModeTools').hidden = !TEST_MODE;
    if ($('newChanceLabel')) $('newChanceLabel').textContent = `新收藏機率 ${GACHA_CORE.newChance(state.collected, state.consecutiveDuplicates).toLocaleString('zh-Hant', { maximumFractionDigits: 2 })}%`;
    if ($('drawButton')) {
      $('drawButton').disabled = drawing || state.coins < COST;
      $('drawButton').textContent = drawing ? '轉蛋機運轉中…' : '轉一次 · 100 金幣';
    }
    if ($('againButton')) $('againButton').disabled = drawing || state.coins < COST;
    if ($('skipButton')) $('skipButton').hidden = !drawing;
    if ($('insufficient')) $('insufficient').hidden = state.coins >= COST;
  }
  function renderHome() {
    if ($('homeDisplayImage')) { $('homeDisplayImage').src = asset(state.display); $('homeDisplayImage').alt = `目前展示的柴犬：${name(state.display)}`; }
    if ($('homeDisplayName')) $('homeDisplayName').textContent = `${name(state.display)} · ${pad(state.display)}`;
  }
  function renderPracticeMenu() {
    if ($('practiceDisplayImage')) { $('practiceDisplayImage').src = asset(state.display); $('practiceDisplayImage').alt = `目前展示的柴犬：${name(state.display)}`; }
    if ($('practiceDisplayName')) $('practiceDisplayName').textContent = `${name(state.display)} · ${pad(state.display)}`;
  }
  function renderGallery() {
    if (!$('grid')) return;
    const query = $('search').value.trim().toLowerCase();
    const filter = document.querySelector('.filter.active')?.dataset.filter || 'all';
    const ownedByRarity = RARITY.counts(state.collected);
    const ids = Array.from({ length: TOTAL }, (_, i) => i + 1).filter(id =>
      (filter === 'all' || state.collected.includes(id)) && (!query || pad(id).includes(query) || String(id).includes(query) || (state.collected.includes(id) && name(id).toLowerCase().includes(query)))
    );
    $('count').textContent = `${state.collected.length} / ${TOTAL}`;
    $('filterCount').textContent = state.collected.length;
    const percentage = Math.round(state.collected.length / TOTAL * 100);
    $('percent').textContent = `完成 ${percentage}%`; $('progress').style.width = `${percentage}%`;
    $('displayImage').src = asset(state.display); $('displayName').textContent = `${name(state.display)} · ${pad(state.display)}`;
    $('grid').innerHTML = ids.length ? ids.map(id => {
      const owned = state.collected.includes(id), tier = RARITY.byId[id], label = RARITY.groups[tier].label;
      return `<article class="card ${owned ? '' : 'locked'}" data-id="${id}" ${owned ? 'tabindex="0" role="button"' : 'aria-disabled="true"'} aria-label="${owned ? name(id) : '未解鎖造型'}，${owned ? '已收藏' : '尚未收藏，隱藏中'}"><div class="card-image">${owned ? `<img loading="lazy" src="${asset(id)}" alt="柴犬${name(id)}">` : '<span class="locked-art" aria-hidden="true"><span>?</span></span>'}${state.display === id ? '<span class="display-pin">目前展示</span>' : ''}</div><div class="card-footer"><div><div class="card-title">${owned ? name(id) : '？？？'} · ${pad(id)}</div><div class="card-sub rarity-${tier}">${label} · ${ownedByRarity[tier]}</div></div><span class="status ${owned ? '' : 'locked'}">${owned ? '✓ 已收藏' : '🔒 未解鎖'}</span></div></article>`;
    }).join('') : '<div class="empty">沒有符合的造型，試試名稱或編號吧。</div>';
  }
  function renderHistory() {
    if (!$('historyList')) return;
    const rows = state.drawHistory.filter(entry => !drawing || entry.transactionId !== activeDraw?.transactionId).slice(0, 8);
    $('historyList').innerHTML = rows.length ? rows.map(entry => {
      const tier = RARITY.byId[entry.id], time = new Date(entry.at).toLocaleString('zh-Hant', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      return `<li class="history-item rarity-${tier}"><img src="${asset(entry.id)}" alt=""><span class="history-name">${name(entry.id)} · ${pad(entry.id)}<small>${RARITY.groups[tier].label} · ${time}</small></span><strong>${entry.duplicate ? '+20 🪙 重複' : '新收藏'}</strong></li>`;
    }).join('') : '<li class="history-empty">完成第一次轉蛋後，紀錄會顯示在這裡。</li>';
  }
  function showResult(entry) {
    if (!$('resultCard') || !entry) return;
    const tier = RARITY.byId[entry.id];
    $('resultCard').className = `result-card result-overlay card rarity-${tier}`;
    $('resultImage').src = asset(entry.id); $('resultImage').alt = `柴柴${name(entry.id)}`;
    $('resultName').textContent = `${name(entry.id)} · ${pad(entry.id)}`;
    $('resultRarity').className = `card-sub rarity-${tier}`;
    $('resultRarity').textContent = `${RARITY.groups[tier].label} · ${tier === 'legendary' ? '傳說登場' : entry.duplicate ? '已收藏' : '新收藏'}`;
    $('resultMessage').className = `status${entry.duplicate ? ' locked' : ''}`;
    $('resultMessage').textContent = entry.duplicate ? '+20 🪙 重複' : '✓ 已收藏';
    $('resultCard').hidden = false;
  }
  function render() {
    updateBalance(); renderHome(); renderPracticeMenu(); renderGallery(); renderHistory();
    if ($('rateText')) $('rateText').textContent = Object.values(RARITY.groups).map(group => `${group.label} ${group.chance}%`).join('　·　');
    if ($('oddsList')) $('oddsList').innerHTML = Object.entries(RARITY.groups).map(([tier, group]) => {
      const available = group.ids.filter(id => !RARITY.drawExcludedIds.includes(id)).length;
      return `<li><span class="tier-dot ${tier}"></span><span>${group.label} <small>${available} 款</small></span><strong>${group.chance}%</strong></li>`;
    }).join('');
  }

  function awardCoins(amount, reason, transactionId) {
    if (!Number.isSafeInteger(amount) || amount <= 0 || typeof reason !== 'string' || !reason.trim() || typeof transactionId !== 'string' || !transactionId.trim()) return { ok: false, reason: 'invalid' };
    if (state.awardTransactions.some(tx => tx.id === transactionId)) return { ok: true, duplicate: true, coins: state.coins };
    if (!Number.isSafeInteger(state.coins + amount)) return { ok: false, reason: 'overflow' };
    const tx = { id: transactionId, amount, reason: reason.trim(), at: Date.now() };
    const next = { ...state, coins: state.coins + amount, awardTransactions: [tx, ...state.awardTransactions] };
    if (!persist(next)) return { ok: false, reason: 'storage' };
    render(); return { ok: true, duplicate: false, coins: state.coins };
  }

  function chargeCoins(amount, reason, transactionId) {
    if (!Number.isSafeInteger(amount) || amount <= 0 || typeof reason !== 'string' || !reason.trim() || typeof transactionId !== 'string' || !transactionId.trim()) return { ok: false, reason: 'invalid' };
    if (state.chargeTransactions.some(tx => tx.id === transactionId)) return { ok: true, duplicate: true, coins: state.coins };
    if (state.coins < amount) return { ok: false, reason: 'insufficient', coins: state.coins };
    const tx = { id: transactionId, amount: -amount, reason: reason.trim(), at: Date.now() };
    const next = { ...state, coins: state.coins - amount, chargeTransactions: [tx, ...state.chargeTransactions] };
    if (!persist(next)) return { ok: false, reason: 'storage' };
    render(); return { ok: true, duplicate: false, coins: state.coins };
  }

  function saveMathPractice(mathPractice) {
    if (!mathPractice || typeof mathPractice !== 'object' || typeof mathPractice.questionId !== 'string') return { ok: false, reason: 'invalid' };
    const next = { ...state, mathPractice: JSON.parse(JSON.stringify(mathPractice)) };
    if (!persist(next)) return { ok: false, reason: 'storage' };
    render(); return { ok: true };
  }

  function getPracticeProgress(practiceId) {
    if (typeof practiceId !== 'string' || !practiceId.trim()) return null;
    const progress = state.practiceProgress[practiceId];
    return progress ? JSON.parse(JSON.stringify(progress)) : null;
  }

  function savePracticeProgress(practiceId, progress) {
    if (typeof practiceId !== 'string' || !practiceId.trim() || !progress || typeof progress !== 'object') return { ok: false, reason: 'invalid' };
    const practiceProgress = { ...state.practiceProgress, [practiceId]: JSON.parse(JSON.stringify(progress)) };
    if (!persist({ ...state, practiceProgress })) return { ok: false, reason: 'storage' };
    render(); return { ok: true };
  }

  function clearPracticeProgress(practiceId) {
    if (typeof practiceId !== 'string' || !practiceId.trim()) return { ok: false, reason: 'invalid' };
    if (!Object.prototype.hasOwnProperty.call(state.practiceProgress, practiceId)) return { ok: true, duplicate: true };
    const practiceProgress = { ...state.practiceProgress }; delete practiceProgress[practiceId];
    if (!persist({ ...state, practiceProgress })) return { ok: false, reason: 'storage' };
    render(); return { ok: true, duplicate: false };
  }

  function createDraw(random = Math.random) {
    if (state.coins < COST) return { ok: false, reason: 'insufficient' };
    const outcome = GACHA_CORE.draw(state.collected, state.consecutiveDuplicates, random), { id, duplicate, tier } = outcome;
    const at = Date.now(), transactionId = `draw-${at}-${Math.random().toString(36).slice(2, 9)}`;
    const entry = { id, tier, duplicate, newChance: outcome.newChance, cost: COST, refund: duplicate ? REFUND : 0, coinsAfter: state.coins - COST + (duplicate ? REFUND : 0), at, transactionId };
    const next = {
      ...state, coins: entry.coinsAfter,
      collected: duplicate ? [...state.collected] : [...state.collected, id],
      drawHistory: [entry, ...state.drawHistory].slice(0, 30),
      consecutiveDuplicates: duplicate ? state.consecutiveDuplicates + 1 : 0
    };
    if (!persist(next)) return { ok: false, reason: 'storage' };
    return { ok: true, entry };
  }

  function clearAnimationTimers() { animationTimers.forEach(id => clearTimeout(id)); animationTimers = []; }
  function setPhase(phase) {
    if ($('gachaScene')) {
      $('gachaScene').dataset.phase = phase;
      if (phase === 'drop' && activeDraw) $('gachaScene').dataset.rarity = activeDraw.tier;
    }
  }
  function finishAnimation() {
    if (!drawing || !activeDraw) return;
    clearAnimationTimers(); drawing = false;
    if ($('gachaScene')) { $('gachaScene').classList.remove('is-running'); $('gachaScene').dataset.phase = 'idle'; }
    const entry = activeDraw; activeDraw = null;
    render(); showResult(entry);
    toast(entry.duplicate ? '重複造型返還 20 金幣' : `${name(entry.id)} 已加入收藏圖鑑`);
  }
  function startAnimation(entry) {
    if (!$('gachaScene')) { showResult(entry); return; }
    drawing = true; activeDraw = entry;
    const resultCard = $('resultCard');
    if (resultCard && !resultCard.hidden) resultCard.classList.add('is-closing');
    render();
    const begin = () => {
      if (resultCard) { resultCard.hidden = true; resultCard.classList.remove('is-closing'); }
      $('gachaScene').dataset.rarity = 'common'; $('gachaScene').dataset.phase = 'start'; $('gachaScene').classList.add('is-running');
      $('capsuleShell').className = `capsule-shell rarity-${entry.tier}`;
      const reduced = Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      const duration = reduced ? 500 : 4200;
      animationTimers.push(setTimeout(() => setPhase('operate'), Math.min(700, duration * 0.18)));
      animationTimers.push(setTimeout(() => setPhase('drop'), Math.min(1500, duration * 0.38)));
      animationTimers.push(setTimeout(() => setPhase('open'), Math.min(2300, duration * 0.60)));
      animationTimers.push(setTimeout(finishAnimation, duration));
    };
    if (resultCard && !resultCard.hidden) animationTimers.push(setTimeout(() => requestAnimationFrame(begin), 190));
    else begin();
  }
  function attemptDraw() {
    if (drawing) return;
    if (state.coins < COST) { render(); toast('金幣不足，完成數學練習即可獲得金幣'); return; }
    const result = createDraw();
    if (!result.ok) { toast(result.reason === 'storage' ? '資料儲存失敗，這次沒有扣款。' : '無法完成這次轉蛋。'); return; }
    startAnimation(result.entry);
  }

  window.SHIBA_GAME = Object.freeze({ awardCoins, chargeCoins, saveMathPractice, getPracticeProgress, savePracticeProgress, clearPracticeProgress, getState: () => JSON.parse(JSON.stringify(state)), getDisplayCharacter: () => { const id = state.display; const rarity = RARITY.byId[id]; return { id, name: name(id), rarity, rarityLabel: RARITY.groups[rarity].label }; }, drawPool: () => RARITY.drawPool().slice(), newChance: () => GACHA_CORE.newChance(state.collected, state.consecutiveDuplicates), testMode: TEST_MODE, COST, REFUND });
  window.SHIBA_GACHA = window.SHIBA_GAME;
  window.addShibaCoins = awardCoins;

  window.addEventListener('storage', event => { if (event.key === KEY) { state = readState(); render(); } });

  if ($('grid')) {
    $('grid').addEventListener('click', event => { const card = event.target.closest('.card'); if (card && !card.classList.contains('locked')) openModal(Number(card.dataset.id)); });
    $('grid').addEventListener('keydown', event => { const card = event.target.closest('.card'); if (card && !card.classList.contains('locked') && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openModal(Number(card.dataset.id)); } });
    $('displayButton').addEventListener('click', () => { if (persist({ ...state, display: activeItem })) { render(); syncModal(); toast(`${name(activeItem)} 已設為展示夥伴`); } });
    $('closeModal').addEventListener('click', () => $('overlay').classList.remove('open'));
    $('overlay').addEventListener('click', event => { if (event.target === $('overlay')) $('overlay').classList.remove('open'); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') $('overlay').classList.remove('open'); });
    document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('.filter').forEach(item => item.classList.toggle('active', item === button)); renderGallery(); }));
    $('search').addEventListener('input', renderGallery);
    $('chooseDisplay').addEventListener('click', () => { document.querySelector('#grid .card:not(.locked)')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); $('search').focus(); });
  }
  if ($('drawButton')) $('drawButton').addEventListener('click', attemptDraw);
  if ($('closeResult')) $('closeResult').addEventListener('click', () => { if (!drawing && $('resultCard')) $('resultCard').hidden = true; });
  if ($('skipButton')) $('skipButton').addEventListener('click', finishAnimation);
  if ($('viewGallery')) $('viewGallery').addEventListener('click', () => { window.location.href = 'collection.html'; });
  if ($('resetTestData')) $('resetTestData').addEventListener('click', () => {
    if (!TEST_MODE || !window.confirm('重設測試帳本的金幣、收藏與抽獎紀錄？正式資料不會改變。')) return;
    if (!persist(fresh())) { toast('重設失敗，資料未變更。'); return; }
    drawing = false; activeDraw = null; clearAnimationTimers();
    if ($('gachaScene')) { $('gachaScene').classList.remove('is-running'); $('gachaScene').dataset.phase = 'idle'; }
    render(); if ($('resultCard')) $('resultCard').hidden = true; toast('測試帳本已重設為 100,000 金幣');
  });

  persist(state);
  render();

  function openModal(id) {
    if (!state.collected.includes(id)) return;
    activeItem = id; $('modalImage').src = asset(id); $('modalImage').alt = `柴犬${name(id)}`;
    $('modalTitle').textContent = `${name(id)} · ${pad(id)}`; $('modalTitle').className = `rarity-${RARITY.byId[id]}`;
    syncModal(); $('overlay').classList.add('open'); $('closeModal').focus();
  }
  function syncModal() { const current = state.display === activeItem; $('displayButton').textContent = current ? '目前展示中 ✓' : '設為展示柴柴'; $('displayButton').disabled = current; }
})();
