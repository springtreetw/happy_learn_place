/* Shared Shiba rarity catalog. IDs use the one-based NAMES array index. */
(() => {
  const groups = Object.freeze({
    common: Object.freeze({ label: '普通', chance: 50, ids: Object.freeze([1, 2, 3, 6, 9, 10, 11, 12, 13, 15, 17, 22, 24, 26, 27, 31]) }),
    rare: Object.freeze({ label: '稀有', chance: 30, ids: Object.freeze([4, 5, 8, 14, 16, 18, 20, 21]) }),
    epic: Object.freeze({ label: '史詩', chance: 15, ids: Object.freeze([23, 25, 28, 29, 30, 32]) }),
    legendary: Object.freeze({ label: '傳說', chance: 5, ids: Object.freeze([7, 19]) })
  });
  const drawExcludedIds = Object.freeze([1]);

  const byId = Object.create(null);
  for (const [key, group] of Object.entries(groups)) {
    for (const id of group.ids) {
      if (byId[id]) throw new Error(`Shiba ${id} appears in more than one rarity group.`);
      byId[id] = key;
    }
  }

  function counts(collected) {
    const owned = new Set(collected);
    return Object.fromEntries(Object.entries(groups).map(([key, group]) => [
      key,
      group.ids.reduce((total, id) => total + Number(owned.has(id)), 0)
    ]));
  }

  function validate(total = 32) {
    const ids = Object.values(groups).flatMap(group => group.ids);
    const missing = Array.from({ length: total }, (_, index) => index + 1).filter(id => !byId[id]);
    if (ids.length !== total || missing.length) throw new Error(`Invalid Shiba rarity catalog: ${ids.length} entries; missing ${missing.join(', ')}`);
    if (drawExcludedIds.some(id => !byId[id])) throw new Error('Draw exclusions must refer to an assigned Shiba ID.');
    return true;
  }

  function drawPool() {
    const excluded = new Set(drawExcludedIds);
    return Object.values(groups).flatMap(group => group.ids).filter(id => !excluded.has(id));
  }

  function draw(random = Math.random) {
    let roll = random() * 100;
    const selected = Object.entries(groups).find(([, group]) => {
      roll -= group.chance;
      return roll < 0;
    });
    const [, group] = selected || Object.entries(groups)[0];
    const eligible = group.ids.filter(id => !drawExcludedIds.includes(id));
    return eligible[Math.min(eligible.length - 1, Math.floor(random() * eligible.length))];
  }

  if (Object.values(groups).reduce((sum, group) => sum + group.chance, 0) !== 100) throw new Error('Rarity chances must total 100%.');
  validate();
  window.SHIBA_RARITY = Object.freeze({ groups, byId: Object.freeze(byId), drawExcludedIds, counts, drawPool, draw, validate });
})();
