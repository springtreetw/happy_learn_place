(() => {
  'use strict';
  const activities = [
    { category: '數學練習', icon: '➕', title: '四位數加減法填空', description: '練習不超過 10,000 的加法與減法，挑戰 50 題。', href: 'four-digit-add-subtract.html' },
    { category: '數學練習', icon: '✖️', title: '三位數乘以一位數', description: '練習直式乘法填空，逐步完成 50 題挑戰。', href: 'three-digit-multiplication.html' }
  ];
  const list = document.getElementById('practiceList');
  if (!list) return;
  list.innerHTML = activities.map(item => `<a class="practice-card" href="${item.href}"><span class="practice-icon" aria-hidden="true">${item.icon}</span><span class="practice-copy"><span class="category">${item.category}</span><h3>${item.title}</h3><p>${item.description}</p></span><span class="arrow" aria-hidden="true">↗</span></a>`).join('');
})();
