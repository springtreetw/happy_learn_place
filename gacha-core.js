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
    const chance = newChance(collected, streak);

    // Roll rarity from the complete table first, so collection progress never
    // renormalizes or inflates the advertised tier percentages.
    let roll = random() * 100;
    const tierNames = Object.keys(R.groups);
    let tier = tierNames[tierNames.length - 1];
    for (const [key, group] of Object.entries(R.groups)) {
      roll -= group.chance;
      if (roll < 0) { tier = key; break; }
    }
    const tierPool = R.groups[tier].ids.filter(id => pool.includes(id));
    const tierOwned = tierPool.filter(id => owned.includes(id));
    const tierUnowned = tierPool.filter(id => unowned.includes(id));
    let isNew;
    if (!tierOwned.length) isNew = true;
    else if (!tierUnowned.length) isNew = false;
    else isNew = random() * 100 < chance;
    const candidates = isNew ? tierUnowned : tierOwned;
    const id = candidates[Math.floor(random() * candidates.length)];
    return { id, tier, duplicate: !isNew, isNew, newChance: chance };
  }
  function drawPity(collected, random = Math.random) {
    const tier = random() < 0.8 ? 'epic' : 'legendary';
    const candidates = R.groups[tier].ids.filter(id => pool.includes(id));
    const id = candidates[Math.floor(random() * candidates.length)];
    const duplicate = collected.includes(id);
    return { id, tier, duplicate, isNew: !duplicate, newChance: 0, pity: true };
  }
  window.SHIBA_GACHA_CORE = Object.freeze({ newChance, draw, drawPity, pool: () => pool.slice() });
})();
