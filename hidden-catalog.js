(() => {
  'use strict';
  const freezeEntries = entries => Object.freeze(entries.map(entry => Object.freeze(entry)));
  window.HIDDEN_CATALOG = Object.freeze({
    shiba: freezeEntries([
      { name: '煉獄杏壽郎', file: 'shiba_01_Rengoku_Kyoujurou.png', tier: 'legendary' },
      { name: '富岡義勇', file: 'shiba_02_Tomioka Giyuu.png', tier: 'epic' },
      { name: '胡蝶忍', file: 'shiba_03_Kochou Shinobu.png', tier: 'rare' },
      { name: '宇髓天元', file: 'shiba_04_Uzui_Tengen.png', tier: 'epic' },
      { name: '甘露寺蜜璃', file: 'shiba_05_Kanroji_Mitsuri.png', tier: 'legendary' },
      { name: '時透無一郎', file: 'shiba_06_Tokitou_Muichirou.png', tier: 'epic' },
      { name: '伊黑小芭內', file: 'shiba_07_Iguro_Obanai.png', tier: 'rare' },
      { name: '不死川實彌', file: 'shiba_08_Shinazugawa_Sanemi.png', tier: 'rare' },
      { name: '悲鳴嶼行冥', file: 'shiba_09_Himejima_Gyoumei.png', tier: 'rare' },
      { name: '竈門炭治郎', file: 'shiba_10_Kamado_Tanjirou.png', tier: 'rare' },
      { name: '竈門禰豆子', file: 'shiba_11_Kamado_Nezuko.png', tier: 'rare' },
      { name: '我妻善逸', file: 'shiba_12_Agatsuma_Zenitsu.png', tier: 'rare' },
      { name: '嘴平伊之助', file: 'shiba_13_Hashibira_Inosuke.png', tier: 'rare' },
      { name: '產屋敷耀哉', file: 'shiba_14_Ubuyashiki_Kagaya.png', tier: 'epic' },
      { name: '鋼鐵塚螢', file: 'shiba_15_Haganezuka_Hotaru.png', tier: 'epic' }
    ]),
    badcat: freezeEntries([
      { name: '魘夢', file: 'badcat_01_Enmu.png', tier: 'rare' },
      { name: '累', file: 'badcat_02_Rui.png', tier: 'rare' },
      { name: '獪岳', file: 'badcat_03_Kaigaku.png', tier: 'rare' },
      { name: '鳴女', file: 'badcat_04_Nakime.png', tier: 'epic' },
      { name: '妓夫太郎', file: 'badcat_05_Gyuutarou.png', tier: 'rare' },
      { name: '墮姬', file: 'badcat_06_Daki.png', tier: 'rare' },
      { name: '玉壺', file: 'badcat_07_Gyokko.png', tier: 'rare' },
      { name: '半天狗', file: 'badcat_08_Hantengu.png', tier: 'rare' },
      { name: '憎珀天', file: 'badcat_09_Zouhakuten.png', tier: 'epic' },
      { name: '猗窩座', file: 'badcat_10_Akaza.png', tier: 'epic' },
      { name: '童磨', file: 'badcat_11_Douma.png', tier: 'epic' },
      { name: '黑死牟', file: 'badcat_12_Kokushibou.png', tier: 'legendary' },
      { name: '鬼舞辻無慘', file: 'badcat_13_Kibutsuji_Muzan.png', tier: 'legendary' },
      { name: '珠世', file: 'badcat_14_Tamayo.png', tier: 'epic' },
      { name: '愈史郎', file: 'badcat_15_Yushirou.png', tier: 'rare' }
    ])
  });
})();
