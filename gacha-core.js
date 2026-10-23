(() => {
  'use strict';
  const R = window.SHIBA_RARITY;
  const pool = R.drawPool();
  function newChance(collected, streak = 0) {
    const owned = pool.filter(id => collected.includes(id)).length;
    const fresh = pool.length - owned;
    if (!fresh) return 0;
    if (!owned) return 100;
    const base = Math.min(95, 60 + 1.25 * owned);
    return Math.min(98, base + 2 * Math.max(0, streak));
  }
  function draw(collected, streak = 0, random = Math.random) {
    const owned = pool.filter(id => collected.includes(id));
    const unowned = pool.filter(id => !collected.includes(id));
    let isNew;
    if (!owned.length) isNew = true;
    else if (!unowned.length) isNew = false;
    else isNew = random() * 100 < newChance(collected, streak);
    const candidates = isNew ? unowned : owned;
    const tiers = Object.entries(R.groups).map(([tier, group]) => ({ tier, ids: group.ids.filter(id => candidates.includes(id)), chance: group.chance })).filter(group => group.ids.length);
    let chosen;
    if (tiers.length === 1) chosen = tiers[0];
    else {
      const total = tiers.reduce((sum, item) => sum + item.chance, 0);
      let roll = random() * total;
      chosen = tiers[tiers.length - 1];
      for (const tier of tiers) { roll -= tier.chance; if (roll < 0) { chosen = tier; break; } }
    }
    const id = chosen.ids.length === 1 ? chosen.ids[0] : chosen.ids[Math.floor(random() * chosen.ids.length)];
    return { id, tier: chosen.tier, duplicate: !isNew, isNew, newChance: newChance(collected, streak) };
  }
  window.SHIBA_GACHA_CORE = Object.freeze({ newChance, draw, pool: () => pool.slice() });
})();
