// /blog/js/mineria-vs-ia.js
// =====================================
// NAV: Hamburguesa + link activo
// =====================================
(function () {
  'use strict';
  if (window.__mineriaVsIaMenuInit) return;
  window.__mineriaVsIaMenuInit = true;

  const btn  = document.getElementById('hamburger');
  const menu = document.getElementById('nav-links');
  if (btn && menu) {
    btn.setAttribute('aria-controls', 'nav-links');
    btn.setAttribute('aria-expanded', 'false');

    const OPEN = 'open';
    const BODY_LOCK = 'menu-open';

    const open  = () => {
      if (!menu.classList.contains(OPEN)) {
        menu.classList.add(OPEN);
        document.body.classList.add(BODY_LOCK);
        btn.setAttribute('aria-expanded', 'true');
      }
    };
    const close = () => {
      if (menu.classList.contains(OPEN)) {
        menu.classList.remove(OPEN);
        document.body.classList.remove(BODY_LOCK);
        btn.setAttribute('aria-expanded', 'false');
      }
    };
    const toggle = () => (menu.classList.contains(OPEN) ? close() : open());

    // Toggle
    btn.addEventListener('click', toggle);

    // Cerrar al click fuera
    document.addEventListener('click', (e) => {
      if (!menu.classList.contains(OPEN)) return;
      const clickDentroMenu = menu.contains(e.target);
      const clickEnBoton = btn.contains(e.target);
      if (!clickDentroMenu && !clickEnBoton) close();
    });

    // Cerrar con Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });

    // Cerrar al navegar
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', close));

    // Reset en desktop (≥768px) con fallback a addListener
    const MQ = window.matchMedia ? window.matchMedia('(min-width: 768px)') : null;
    if (MQ) {
      const onChange = (ev) => { if (ev.matches) close(); };
      if (typeof MQ.addEventListener === 'function') MQ.addEventListener('change', onChange);
      else if (typeof MQ.addListener === 'function') MQ.addListener(onChange);
    }
  }

  // Marca link activo (normaliza /index.html y barras finales)
  (function markActive() {
    const norm = (p) => p.replace(/\/+$/,'').replace(/\/index\.html?$/i,'');
    const current = norm(location.pathname);
    document.querySelectorAll('nav .nav-links a').forEach((a) => {
      const href = a.getAttribute('href');
      if (!href) return;
      try {
        const abs = new URL(href, location.origin).pathname;
        if (norm(abs) === current) a.setAttribute('aria-current', 'page');
      } catch (_) {}
    });
  })();
})();


// =====================================
// ADS: Lazy push (IO + MO), idempotente
// =====================================
(function () {
  'use strict';
  if (window.__adsLazyInit) return;
  window.__adsLazyInit = true;

  // Empuja un slot solo una vez
  function push(el) {
    if (!el || el.__adsbygoogle_pushed) return;
    el.__adsbygoogle_pushed = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (_) {
      // Si falla por timing, reintenta una vez en el próximo frame
      el.__adsbygoogle_pushed = false;
      requestAnimationFrame(() => {
        if (!el.__adsbygoogle_pushed) {
          el.__adsbygoogle_pushed = true;
          try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
        }
      });
    }
  }

  // Observa los <ins class="adsbygoogle"> que ya existen en el DOM
  function observeExisting() {
    var slots = [].slice.call(document.querySelectorAll('ins.adsbygoogle'));
    if (!slots.length) return;

    // Fallback sin IO
    if (!('IntersectionObserver' in window)) {
      slots.forEach(push);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          push(en.target);
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '200px 0px' });

    slots.forEach(function (s) { io.observe(s); });
  }

  // Detecta anuncios agregados dinámicamente
  function watchNewSlots() {
    if (!('MutationObserver' in window)) return;
    var mo = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (!m.addedNodes) return;
        [].forEach.call(m.addedNodes, function (n) {
          if (n.nodeType !== 1) return;
          if (n.matches && n.matches('ins.adsbygoogle')) { push(n); return; }
          var found = n.querySelectorAll && n.querySelectorAll('ins.adsbygoogle');
          if (found && found.length) { [].forEach.call(found, push); }
        });
      });
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      observeExisting();
      watchNewSlots();
    });
  } else {
    observeExisting();
    watchNewSlots();
  }
})();
