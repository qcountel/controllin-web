(() => {
  'use strict';
  const root = document.documentElement;
  const buttons = document.querySelectorAll('[data-set-lang]');
  const setLang = (l) => {
    root.setAttribute('data-lang', l);
    root.setAttribute('lang', l);
    buttons.forEach((b) => b.classList.toggle('active', b.dataset.setLang === l));
    try { localStorage.setItem('controllin.lang', l); } catch (e) { /* private mode */ }
  };
  buttons.forEach((b) => b.addEventListener('click', () => setLang(b.dataset.setLang)));
  setLang(root.getAttribute('data-lang') === 'en' ? 'en' : 'ru');
  const y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear());
})();
