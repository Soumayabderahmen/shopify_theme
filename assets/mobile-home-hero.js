/* Accueil MOBILE, haut de page (sections/mobile-home-hero.liquid, assets/mobile-home-hero.css) :
   - bannière : 3 photos de produits qui entrent, flottent puis changent toutes les 5,2 s avec le texte ;
   - avantages sous la carte des paiements : un message toutes les 3,5 s ;
   - en-tête en défilant (classe mshein-solid posée par assets/mobile-home-shein.js) : recherche repliée, loupe à côté du
     cœur qui la rouvre ; barres collées sous l'en-tête (onglets « Per te ») placées sous sa hauteur réelle.
   Mobile uniquement (≤ 760px). */
(function () {
  'use strict';

  if (window.mhhInit || !window.matchMedia('(max-width: 760px)').matches) return;
  window.mhhInit = true;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var start = function () {
    var hero = document.querySelector('[data-mhh]');
    if (!hero) return;

    /* ---------- Bannière ---------- */
    var data = { slides: [], products: [] };
    try { data = JSON.parse(hero.querySelector('[data-mhh-data]').textContent); } catch (error) { console.error('Unable to read the home banner data.', error); }
    var floats = [].slice.call(hero.querySelectorAll('.mhh-fl'));
    var txt = hero.querySelector('[data-mhh-txt]');
    var dots = hero.querySelectorAll('.mhh__dots i');
    var products = data.products || [];
    var slides = data.slides || [];
    var set = 0;
    var show = function () {
      if (products.length) {
        floats.forEach(function (node, i) {
          var product = products[(set * floats.length + i) % products.length];
          node.querySelector('img').src = product.i;
          node.href = product.u;
          node.classList.remove('off');
          node.classList.add('on');
        });
      }
      var slide = slides[set % (slides.length || 1)];
      if (slide) {
        hero.querySelector('[data-mhh-eb]').textContent = slide.eb;
        hero.querySelector('[data-mhh-title]').innerHTML = slide.title;
        hero.querySelector('[data-mhh-text]').textContent = slide.text;
        hero.querySelector('[data-mhh-cta]').textContent = slide.cta;
        hero.querySelector('[data-mhh-btn]').href = slide.url;
      }
      txt.classList.remove('swap');
      [].forEach.call(dots, function (dot, i) { dot.classList.toggle('on', i === set % dots.length); });
    };
    requestAnimationFrame(function () { requestAnimationFrame(show); });
    if (!reduceMotion && (products.length > floats.length || slides.length > 1)) {
      setInterval(function () {
        // En pause : onglet caché, bannière masquée (onglet de rayon ouvert) ou hors de l'écran
        if (document.hidden || hero.closest('[hidden]') || hero.getBoundingClientRect().bottom < 0) return;
        floats.forEach(function (node) { node.classList.remove('on'); node.classList.add('off'); });
        txt.classList.add('swap');
        setTimeout(function () {
          set += 1;
          floats.forEach(function (node) { node.classList.remove('off'); });
          requestAnimationFrame(function () { requestAnimationFrame(show); });
        }, 900);
      }, 5200);
    }

    /* ---------- Avantages qui défilent ---------- */
    var items = document.querySelectorAll('[data-mhh-ann] .mhh-ann__item');
    var current = 0;
    if (!reduceMotion && items.length > 1) {
      setInterval(function () {
        if (document.hidden) return;
        var leaving = items[current];
        leaving.classList.remove('on');
        leaving.classList.add('out');
        setTimeout(function () { leaving.classList.remove('out'); }, 500);
        current = (current + 1) % items.length;
        items[current].classList.add('on');
      }, 3500);
    }

    /* ---------- En-tête en défilant : loupe à côté du cœur ---------- */
    var header = document.querySelector('[id$="__header"].shopify-section');
    var actions = header && header.querySelector('.mobile-home-header__actions');
    var input = header && header.querySelector('.mobile-temu-search input');
    if (header && actions && !actions.querySelector('.mhh-find')) {
      var find = document.createElement('button');
      find.type = 'button';
      find.className = 'mobile-home-header__icon mhh-find';
      find.setAttribute('aria-label', (input && (input.getAttribute('aria-label') || input.getAttribute('placeholder'))) || 'Search');
      find.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
      actions.insertBefore(find, actions.firstChild);
      var openedAt = 0;
      find.addEventListener('click', function () {
        openedAt = window.scrollY;
        header.classList.add('mhh-search-open');
        if (input) setTimeout(function () { input.focus({ preventScroll: true }); }, 250);
      });
      // Recherche rouverte : repliée de nouveau après 200px de défilement, ou en remontant sur la bannière
      window.addEventListener('scroll', function () {
        if (!header.classList.contains('mhh-search-open')) return;
        if (Math.abs(window.scrollY - openedAt) > 200 || !header.classList.contains('mshein-solid')) {
          if (document.activeElement === input) input.blur();
          header.classList.remove('mhh-search-open');
        }
      }, { passive: true });
    }

    // Onglets « Per te » collés juste sous l'en-tête, à sa hauteur réelle (repliée ou non)
    if (header && window.ResizeObserver) {
      new ResizeObserver(function () {
        var fixed = /fixed|sticky/.test(getComputedStyle(header).position);
        if (fixed) document.documentElement.style.setProperty('--mshein-tabs-top', Math.max(0, header.offsetHeight - 1) + 'px');
      }).observe(header);
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
