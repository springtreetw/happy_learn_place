(() => {
  'use strict';
  const R = window.SHIBA_RARITY;
  function draw(collected, streak = 0, random = Math.random, includeHidden = false) {
    const pool = R.drawPool(includeHidden);
    let roll = random() * 100;
    let tier = 'legendary';
    for (const [key, group] of Object.entries(R.groups)) {
      roll -= group.chance;
      if (roll < 0) { tier = key; break; }
    }
    const candidates = R.groups[tier].ids.filter(id => pool.includes(id));
    const id = candidates[Math.floor(random() * candidates.length)];
    const duplicate = collected.includes(id);
    return { id, tier, duplicate, isNew: !duplicate };
  }
  function drawPity(collected, random = Math.random, includeHidden = false) {
    const tier = random() < 0.8 ? 'epic' : 'legendary';
    const candidates = R.groups[tier].ids.filter(id => R.drawPool(includeHidden).includes(id));
    const id = candidates[Math.floor(random() * candidates.length)];
    const duplicate = collected.includes(id);
    return { id, tier, duplicate, isNew: !duplicate, pity: true };
  }
  window.SHIBA_GACHA_CORE = Object.freeze({ draw, drawPity, pool: includeHidden => R.drawPool(Boolean(includeHidden)) });
})();
