// /blog/js/analisis-tecnico-bitcoin.js
(function () {
  const btn  = document.getElementById('hamburger');
  const menu = document.getElementById('nav-links');
  if (btn && menu) {
    btn.setAttribute('aria-controls', 'nav-links');
    btn.setAttribute('aria-expanded', 'false');

    const OPEN = 'open';
    const BODY_LOCK = 'menu-open';

    const open  = () => { menu.classList.add(OPEN); document.body.classList.add(BODY_LOCK); btn.setAttribute('aria-expanded', 'true'); };
    const close = () => { menu.classList.remove(OPEN); document.body.classList.remove(BODY_LOCK); btn.setAttribute('aria-expanded', 'false'); };
    const toggle = () => (menu.classList.contains(OPEN) ? close() : open());

    btn.addEventListener('click', toggle);
    document.addEventListener('click', (e) => { if (menu.classList.contains(OPEN) && !menu.contains(e.target) && !btn.contains(e.target)) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', close));

    const MQ = window.matchMedia('(min-width: 768px)');
    MQ.addEventListener?.('change', (ev) => { if (ev.matches) close(); });
  }

  const current = window.location.pathname.replace(/\/+$/,'');
  document.querySelectorAll('nav .nav-links a').forEach(a=>{
    try { const href = new URL(a.getAttribute('href'), location.origin).pathname.replace(/\/+$/,''); if (href === current) a.setAttribute('aria-current','page'); } catch {}
  });
})();
