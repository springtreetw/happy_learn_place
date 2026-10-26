/* 独立壞壞貓圖鑑。編號使用 1–32；轉蛋稀有度配重沿用柴柴設定。 */
(() => {
  'use strict';
  const groups = Object.freeze({
    common: Object.freeze({ label: '普通', chance: 50, ids: Object.freeze([1, 2, 3, 5, 6, 7, 8, 9, 10, 12, 13, 14, 16, 18, 20, 24]) }),
    rare: Object.freeze({ label: '稀有', chance: 30, ids: Object.freeze([19, 23, 25, 26, 28, 29, 31, 32]) }),
    epic: Object.freeze({ label: '史詩', chance: 15, ids: Object.freeze([4, 11, 15, 17, 21, 27]) }),
    legendary: Object.freeze({ label: '傳說', chance: 5, ids: Object.freeze([22, 30]) })
  });
  const drawExcludedIds = Object.freeze([1]);
  const byId = Object.create(null);
  for (const [tier, group] of Object.entries(groups)) for (const id of group.ids) {
    if (byId[id]) throw new Error(`Badcat ${id} appears in more than one rarity group.`);
    byId[id] = tier;
  }
  function validate(total = 32) {
    const ids = Object.values(groups).flatMap(group => group.ids);
    const missing = Array.from({ length: total }, (_, i) => i + 1).filter(id => !byId[id]);
    if (ids.length !== total || missing.length) throw new Error(`Invalid Badcat rarity catalog: ${ids.length} entries; missing ${missing.join(', ')}`);
    if (Object.values(groups).reduce((sum, group) => sum + group.chance, 0) !== 100) throw new Error('Rarity chances must total 100%.');
    return true;
  }
  function drawPool() { const excluded = new Set(drawExcludedIds); return Object.values(groups).flatMap(group => group.ids).filter(id => !excluded.has(id)); }
  function counts(collected) { const owned = new Set(collected); return Object.fromEntries(Object.entries(groups).map(([tier, group]) => [tier, group.ids.filter(id => owned.has(id)).length])); }
  validate();
  window.BADCAT_RARITY = Object.freeze({ groups, byId: Object.freeze(byId), drawExcludedIds, drawPool, counts, validate });
})();
