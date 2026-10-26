(() => {
  'use strict';
  const TOTAL = 32, COST = 100, REFUND = 20, PITY_THRESHOLD = 10, CAPSULE_EXIT_RISE = 54;
  const NAMES = ['壞壞貓','虎克船長','吸血鬼','烏蘇拉','海盜王','鬼武士','機械博士','白面魅影','暗影女王','瘟疫醫師','庫伊拉','血色小丑','死靈法師','黑龍皇帝','小丑女','劫掠者','黑魔女','幻影怪盜','黑鐵騎士','海軍提督','破碎人偶','壞皇后','幽影槍手','角鬥士','深海魔王','毒沼女巫','蛇髮女妖','熔岩魔君','賞金獵人','艾莎','暗影忍者','戰爭領主'];
  const R = window.BADCAT_RARITY, CORE = window.BADCAT_GACHA_CORE, GAME = window.SHIBA_GAME;
  const TEST = Boolean(GAME && GAME.testMode), KEY = TEST ? 'badcatGallery.test.v1' : 'badcatGallery.v1';
  const $ = id => document.getElementById(id), pad = n => String(n).padStart(2, '0');
  const asset = id => `assets/badcat/cat_${pad(id)}.png`, name = id => NAMES[id - 1];
  const currentDisplay = () => GAME?.getDisplayCharacter() || { series: 'shiba', id: 1 };
  const fresh = () => ({ version: 1, collected: [1], display: 1, drawHistory: [], consecutiveDuplicates: 0, consecutiveNoEpicPlus: 0, pendingDraw: null });
  function normalize(raw) {
    const value = { ...fresh(), ...(raw || {}) };
    value.collected = [...new Set((Array.isArray(value.collected) ? value.collected : [1]).filter(id => Number.isInteger(id) && id >= 1 && id <= TOTAL))];
    if (!value.collected.includes(1)) value.collected.unshift(1);
    if (!value.collected.includes(value.display)) value.display = 1;
    value.drawHistory = Array.isArray(value.drawHistory) ? value.drawHistory.filter(row => row && Number.isInteger(row.id) && R.byId[row.id]).slice(0, 30) : [];
    value.consecutiveDuplicates = Number.isSafeInteger(value.consecutiveDuplicates) && value.consecutiveDuplicates >= 0 ? value.consecutiveDuplicates : 0;
    value.consecutiveNoEpicPlus = Number.isSafeInteger(value.consecutiveNoEpicPlus) && value.consecutiveNoEpicPlus >= 0 ? value.consecutiveNoEpicPlus : 0;
    if (!value.pendingDraw || !Number.isInteger(value.pendingDraw.id) || !R.byId[value.pendingDraw.id] || typeof value.pendingDraw.chargeId !== 'string') value.pendingDraw = null;
    return value;
  }
  function read() { try { return normalize(JSON.parse(localStorage.getItem(KEY))); } catch (_) { return fresh(); } }
  let state = read(), activeItem = 1, drawing = false, activeDrawPity = false, activeDrawRow = null, activeHistoryId = null, animationTimers = [];
  function save(next) {
    try { localStorage.setItem(KEY, JSON.stringify(next)); state = next; render(); return true; }
    catch (_) { toast('資料儲存失敗，請確認瀏覽器儲存空間。'); return false; }
  }
  function toast(message) { const node = $('badcatToast'); if (!node) return; node.textContent = message; node.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('show'), 2300); }
  function renderCollection() {
    if (!$('badcatGrid')) return;
    const current = currentDisplay();
    const lastIsCurrent = current.series === 'badcat' && current.id === state.display;
    const query = $('badcatSearch').value.trim().toLowerCase();
    const filter = document.querySelector('.badcat-filter.active')?.dataset.filter || 'all';
    $('badcatCount').textContent = `${state.collected.length} / ${TOTAL}`;
    $('badcatPercent').textContent = `完成 ${Math.round(state.collected.length / TOTAL * 100)}%`;
    $('badcatProgress').style.width = `${state.collected.length / TOTAL * 100}%`;
    $('badcatFilterCount').textContent = state.collected.length;
    $('badcatDisplayImage').src = asset(state.display); $('badcatDisplayImage').alt = `${lastIsCurrent ? '目前展示' : '上次展示'}的壞壞貓：${name(state.display)}`;
    $('badcatDisplayName').textContent = `${name(state.display)} · ${pad(state.display)}`;
    if ($('badcatDisplayStatus')) $('badcatDisplayStatus').textContent = lastIsCurrent ? '目前展示' : '上次展示';
    const ids = Array.from({ length: TOTAL }, (_, i) => i + 1).filter(id => (filter === 'all' || state.collected.includes(id)) && (!query || pad(id).includes(query) || name(id).toLowerCase().includes(query)));
    $('badcatGrid').innerHTML = ids.length ? ids.map(id => {
      const owned = state.collected.includes(id), tier = R.byId[id];
      const pin = current.series === 'badcat' && current.id === id ? '目前展示' : state.display === id ? '上次展示' : '';
      return `<article class="card ${owned ? '' : 'locked'}" data-id="${id}" ${owned ? 'tabindex="0" role="button"' : 'aria-disabled="true"'} aria-label="${owned ? name(id) : '未解鎖夥伴'}，${owned ? '已收藏' : '尚未收藏，隱藏中'}"><div class="card-image">${owned ? `<img loading="lazy" src="${asset(id)}" alt="${name(id)}">` : '<span class="locked-art" aria-hidden="true">?</span>'}${pin ? `<span class="display-pin">${pin}</span>` : ''}</div><div class="card-footer"><div><div class="card-title">${owned ? name(id) : '？？？'} · ${pad(id)}</div><div class="card-sub rarity-${tier}">${R.groups[tier].label}</div></div><span class="status ${owned ? '' : 'locked'}">${owned ? '✓ 已收藏' : '🔒 未解鎖'}</span></div></article>`;
    }).join('') : '<div class="empty">沒有符合的夥伴，試試名稱或編號。</div>';
  }
  function openModal(id) {
    if (!state.collected.includes(id)) return;
    activeItem = id; $('badcatModalImage').src = asset(id); $('badcatModalImage').alt = name(id);
    $('badcatModalTitle').textContent = `${name(id)} · ${pad(id)}`;
    $('badcatModalTitle').className = `rarity-${R.byId[id]}`;
    $('badcatModalRarity').textContent = R.groups[R.byId[id]].label;
    const current = currentDisplay(), isCurrent = current.series === 'badcat' && current.id === id;
    $('badcatDisplayButton').textContent = isCurrent ? '目前展示中 ✓' : '設為展示夥伴';
    $('badcatDisplayButton').disabled = isCurrent;
    $('badcatOverlay').classList.add('open'); $('badcatCloseModal').focus();
  }
  function renderHistory() {
    if (!$('badcatHistory')) return;
    const visibleRows = activeHistoryId ? state.drawHistory.filter(row => row.transactionId !== activeHistoryId) : state.drawHistory;
    $('badcatHistory').innerHTML = visibleRows.length ? visibleRows.slice(0, 8).map(row => {
      const when = new Date(row.at).toLocaleString('zh-Hant', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      return `<li class="history-item rarity-${row.tier}"><img src="${asset(row.id)}" alt=""><span class="history-name">${name(row.id)} · ${pad(row.id)}<small>${R.groups[row.tier].label} · ${when}</small></span><strong>${row.duplicate ? `+${REFUND} 🪙 重複` : '新收藏'}</strong></li>`;
    }).join('') : '<li class="history-empty">完成第一次轉蛋後，紀錄會顯示在這裡。</li>';
  }
  function showResult(row) {
    if (!$('badcatResult')) return;
    $('badcatResultImage').src = asset(row.id); $('badcatResultImage').alt = name(row.id);
    $('badcatResultName').textContent = `${name(row.id)} · ${pad(row.id)}`;
    $('badcatResultTier').textContent = `${R.groups[row.tier].label} · ${row.duplicate ? '已收藏' : '新收藏'}`;
    $('badcatResultMessage').className = `result-message${row.duplicate ? ' is-duplicate' : ''}`;
    $('badcatResultMessage').textContent = row.duplicate ? `重複夥伴已返還 ${REFUND} 金幣` : `${name(row.id)} 加入收藏！`;
    $('badcatResult').hidden = false;
  }
  function render() {
    if ($('badcatTestTools')) $('badcatTestTools').hidden = !TEST;
    renderCollection(); renderHistory();
    if ($('badcatDrawButton')) {
      const coins = GAME?.getState().coins ?? 0;
      const pityReady = state.consecutiveNoEpicPlus >= PITY_THRESHOLD;
      const pityActive = pityReady || Boolean(state.pendingDraw?.pity) || (drawing && activeDrawPity);
      $('badcatDrawButton').disabled = drawing || Boolean(state.pendingDraw) || (!pityReady && coins < COST);
      $('badcatDrawButton').classList.toggle('is-pity', pityActive);
      $('badcatInsufficient').hidden = coins >= COST || pityReady;
      $('badcatDrawButton').textContent = drawing ? (activeDrawPity ? '保底抽獎中…' : '轉蛋機運轉中…') : state.pendingDraw?.pity ? '保底抽獎中…' : pityReady ? '保底 · 免費轉' : '轉一次 · 100 金幣';
      if ($('badcatBalance')) $('badcatBalance').textContent = coins.toLocaleString('zh-Hant');
    }
    if ($('badcatSkipButton')) $('badcatSkipButton').hidden = !drawing;
  }
  function transactionId(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`; }
  function alignCapsuleToOutlet() {
    const scene = $('badcatScene'), outlet = $('badcatOutlet'), journey = $('badcatCapsuleJourney');
    if (!scene || !outlet || !journey || !scene.getBoundingClientRect || !outlet.getBoundingClientRect) return;
    const sceneRect = scene.getBoundingClientRect(), outletRect = outlet.getBoundingClientRect();
    journey.style.left = `${outletRect.left + outletRect.width / 2 - sceneRect.left - (scene.clientLeft || 0) + (scene.scrollLeft || 0)}px`;
    journey.style.top = `${outletRect.top + outletRect.height / 2 - sceneRect.top - (scene.clientTop || 0) + (scene.scrollTop || 0) - CAPSULE_EXIT_RISE}px`;
  }
  function finishAnimation() {
    if (!drawing || !activeDrawRow) return;
    animationTimers.forEach(clearTimeout); animationTimers = [];
    drawing = false; activeDrawPity = false;
    const row = activeDrawRow; activeDrawRow = null;
    const scene = $('badcatScene');
    if (scene) { scene.classList.remove('is-running'); scene.dataset.phase = 'idle'; }
    const revealHistory = () => { if (activeHistoryId !== row.transactionId) return; activeHistoryId = null; render(); };
    const image = $('badcatResultImage');
    image.onload = revealHistory; image.onerror = revealHistory;
    showResult(row);
    if (image.complete && image.naturalWidth > 0) revealHistory();
    render();
  }
  function finalizePending(animate) {
    const pending = state.pendingDraw;
    if (!pending || !GAME) return false;
    if (!pending.pity) {
      const charged = GAME.chargeCoins(COST, '壞壞貓轉蛋', pending.chargeId);
      if (!charged.ok) {
        if (charged.reason === 'insufficient') { save({ ...state, pendingDraw: null }); toast('金幣不足，這次沒有扣款。'); }
        else toast('金幣交易尚未完成，重新載入後會自動恢復。');
        return false;
      }
    }
    if (pending.duplicate) {
      const refunded = GAME.awardCoins(REFUND, '壞壞貓重複造型返還', pending.refundId);
      if (!refunded.ok) { toast('返還交易尚未完成，重新載入後會自動恢復。'); return false; }
    }
    const row = { id: pending.id, tier: pending.tier, duplicate: pending.duplicate, pity: Boolean(pending.pity), cost: pending.pity ? 0 : COST, at: pending.at, transactionId: pending.chargeId };
    const next = {
      ...state,
      collected: pending.duplicate ? state.collected : [...state.collected, pending.id],
      drawHistory: [row, ...state.drawHistory].slice(0, 30),
      consecutiveDuplicates: pending.duplicate ? state.consecutiveDuplicates + 1 : 0,
      consecutiveNoEpicPlus: pending.tier === 'epic' || pending.tier === 'legendary' ? 0 : state.consecutiveNoEpicPlus + 1,
      pendingDraw: null
    };
    if (!save(next)) return false;
    if (animate) {
      drawing = true; activeDrawPity = Boolean(pending.pity); activeDrawRow = row; activeHistoryId = row.transactionId;
      if ($('badcatResult')) $('badcatResult').hidden = true;
      render();
      alignCapsuleToOutlet();
      const scene = $('badcatScene'); scene.classList.add('is-running'); scene.dataset.rarity = 'common'; scene.dataset.phase = 'start';
      if ($('badcatCapsuleShell')) $('badcatCapsuleShell').className = `capsule-shell rarity-${pending.tier}`;
      const reduced = Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      const duration = reduced ? 500 : 4200;
      const phase = name => { scene.dataset.phase = name; if (name === 'drop') scene.dataset.rarity = pending.tier; };
      animationTimers.push(setTimeout(() => phase('operate'), Math.min(700, duration * .18)));
      animationTimers.push(setTimeout(() => phase('drop'), Math.min(1500, duration * .38)));
      animationTimers.push(setTimeout(() => phase('open'), Math.min(2300, duration * .60)));
      animationTimers.push(setTimeout(finishAnimation, duration));
    } else if ($('badcatResult')) showResult(row);
    return true;
  }
  function draw() {
    if (drawing || state.pendingDraw || !GAME) return;
    const pity = state.consecutiveNoEpicPlus >= PITY_THRESHOLD;
    const result = pity ? CORE.drawPity(state.collected) : CORE.draw(state.collected, state.consecutiveDuplicates);
    const pendingDraw = { ...result, pity, cost: pity ? 0 : COST, at: Date.now(), chargeId: transactionId('badcat-draw'), refundId: transactionId('badcat-refund') };
    if (!save({ ...state, pendingDraw })) return;
    if (!$('badcatScene')) finalizePending(false);
    else finalizePending(true);
  }
  function init() {
    if ($('badcatGrid')) {
      $('badcatGrid').addEventListener('click', event => { const card = event.target.closest('.card'); if (card && !card.classList.contains('locked')) openModal(Number(card.dataset.id)); });
      $('badcatGrid').addEventListener('keydown', event => { const card = event.target.closest('.card'); if (card && !card.classList.contains('locked') && ['Enter', ' '].includes(event.key)) { event.preventDefault(); openModal(Number(card.dataset.id)); } });
      document.querySelectorAll('.badcat-filter').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('.badcat-filter').forEach(item => item.classList.toggle('active', item === button)); renderCollection(); }));
      $('badcatSearch').addEventListener('input', renderCollection);
      $('badcatChooseDisplay').addEventListener('click', () => { document.querySelector('#badcatGrid .card:not(.locked)')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); $('badcatSearch').focus(); });
      $('badcatDisplayButton').addEventListener('click', () => {
        if (!state.collected.includes(activeItem)) return;
        if (!save({ ...state, display: activeItem })) return;
        const tier = R.byId[activeItem];
        const result = GAME?.setDisplayCharacter({ series: 'badcat', id: activeItem, name: name(activeItem), rarity: tier, rarityLabel: R.groups[tier].label });
        if (!result?.ok) { toast('目前展示夥伴更新失敗，請再試一次。'); return; }
        render();
        $('badcatDisplayButton').textContent = '目前展示中 ✓';
        $('badcatDisplayButton').disabled = true;
        toast(`${name(activeItem)} 已設為展示夥伴`);
      });
      $('badcatCloseModal').addEventListener('click', () => $('badcatOverlay').classList.remove('open'));
      $('badcatOverlay').addEventListener('click', event => { if (event.target === $('badcatOverlay')) $('badcatOverlay').classList.remove('open'); });
      document.addEventListener('keydown', event => { if (event.key === 'Escape') $('badcatOverlay').classList.remove('open'); });
    }
    if ($('badcatDrawButton')) $('badcatDrawButton').addEventListener('click', draw);
    if ($('badcatSkipButton')) $('badcatSkipButton').addEventListener('click', finishAnimation);
    alignCapsuleToOutlet();
    window.addEventListener('resize', alignCapsuleToOutlet);
    if ($('badcatCloseResult')) $('badcatCloseResult').addEventListener('click', () => { $('badcatResult').hidden = true; });
    if ($('badcatReset')) $('badcatReset').addEventListener('click', () => { if (TEST && confirm('重設壞壞貓測試收藏與抽獎紀錄？共享金幣不會變動。')) { save(fresh()); $('badcatResult').hidden = true; toast('壞壞貓測試資料已重設'); } });
    window.addEventListener('storage', event => { if (event.key === KEY) { state = read(); render(); } if (event.key?.includes('stage3')) render(); });
    if (state.pendingDraw) finalizePending(false);
    render();
  }
  init();
})();
