/* Accueil et pages collection MOBILES : bannière au design du prototype « Home-mobile-B »
   (sections/mobile-home-hero.liquid, snippets/mshein-dept-hero.liquid, snippets/mhh-pay-ann.liquid ; styles
   assets/mobile-home-hero.css) :
   - chaque bannière [data-mhh] : 3 photos de produits qui entrent, flottent puis changent toutes les 5,2 s avec le texte ;
     aussi celles des onglets de rayon, ajoutées dans la page sans recharger (assets/mobile-home-tabs.js) ;
   - avantages sous la carte des paiements : un message toutes les 3,5 s ;
   - Offerte lampo (accueil) : compte à rebours jusqu'à minuit ;
   - en-tête en défilant (classe mshein-solid posée par assets/mobile-home-shein.js) : recherche repliée, loupe à côté du
     cœur qui la rouvre ; barres collées sous l'en-tête placées sous sa hauteur réelle.
   Mobile uniquement (≤ 760px). */
(function () {
  'use strict';

  if (window.mhhInit || !window.matchMedia('(max-width: 760px)').matches) return;
  window.mhhInit = true;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Bannière ---------- */
  var initHero = function (hero) {
    if (hero.mhhReady) return;
    hero.mhhReady = true;
    var data = { slides: [], products: [] };
    var dataNode = hero.querySelector('[data-mhh-data]');
    try { if (dataNode) data = JSON.parse(dataNode.textContent); } catch (error) { console.error('Unable to read the banner data.', error); }
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
          var image = node.querySelector('img');
          if (!image) {
            image = document.createElement('img');
            image.alt = '';
            node.querySelector('.mhh-fl__in').appendChild(image);
          }
          image.src = product.i;
          node.href = product.u;
        });
      }
      floats.forEach(function (node) { node.classList.remove('off'); node.classList.add('on'); });
      var slide = slides.length ? slides[set % slides.length] : null;
      if (slide && slides.length > 1) {
        hero.querySelector('[data-mhh-eb]').textContent = slide.eb;
        hero.querySelector('[data-mhh-title]').innerHTML = slide.title;
        hero.querySelector('[data-mhh-text]').textContent = slide.text;
        hero.querySelector('[data-mhh-cta]').textContent = slide.cta;
        hero.querySelector('[data-mhh-btn]').href = slide.url;
      }
      if (txt) txt.classList.remove('swap');
      [].forEach.call(dots, function (dot, i) { dot.classList.toggle('on', i === set % dots.length); });
    };
    requestAnimationFrame(function () { requestAnimationFrame(show); });
    // Bouton vers les résultats de la même page (recherche) : défilement doux
    var button = hero.querySelector('[data-mhh-btn]');
    if (button) {
      button.addEventListener('click', function (event) {
        var target = /^#./.test(button.getAttribute('href') || '') && document.querySelector(button.getAttribute('href'));
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      });
    }
    var sets = Math.ceil(products.length / (floats.length || 1));
    if (reduceMotion || (sets < 2 && slides.length < 2)) return;
    // Points : un par jeu de photos (au plus 3)
    [].forEach.call(dots, function (dot, i) { if (i >= Math.max(sets, slides.length)) dot.hidden = true; });
    var timer = setInterval(function () {
      if (!hero.isConnected) { clearInterval(timer); return; }
      // En pause : onglet caché, bannière masquée (onglet de rayon ouvert) ou hors de l'écran
      if (document.hidden || hero.closest('[hidden]') || hero.getBoundingClientRect().bottom < 0) return;
      floats.forEach(function (node) { node.classList.remove('on'); node.classList.add('off'); });
      if (txt && slides.length > 1) txt.classList.add('swap');
      setTimeout(function () {
        set += 1;
        floats.forEach(function (node) { node.classList.remove('off'); });
        requestAnimationFrame(function () { requestAnimationFrame(show); });
      }, 900);
    }, 5200);
  };

  /* ---------- Avantages qui défilent ---------- */
  var initAnn = function (list) {
    if (list.mhhReady) return;
    list.mhhReady = true;
    var items = list.querySelectorAll('.mhh-ann__item');
    var current = 0;
    if (reduceMotion || items.length < 2) return;
    var timer = setInterval(function () {
      if (!list.isConnected) { clearInterval(timer); return; }
      if (document.hidden || list.closest('[hidden]')) return;
      var leaving = items[current];
      leaving.classList.remove('on');
      leaving.classList.add('out');
      setTimeout(function () { leaving.classList.remove('out'); }, 500);
      current = (current + 1) % items.length;
      items[current].classList.add('on');
    }, 3500);
  };

  var scan = function (root) {
    if (!root || !root.querySelectorAll) return;
    if (root.matches && root.matches('[data-mhh]')) initHero(root);
    root.querySelectorAll('[data-mhh]').forEach(initHero);
    if (root.matches && root.matches('[data-mhh-ann]')) initAnn(root);
    root.querySelectorAll('[data-mhh-ann]').forEach(initAnn);
  };

  var start = function () {
    scan(document);
    // Bannières des onglets de rayon ajoutées sans recharger la page
    new MutationObserver(function (records) {
      records.forEach(function (record) {
        record.addedNodes.forEach(function (node) { if (node.nodeType === 1) scan(node); });
      });
    }).observe(document.body, { childList: true, subtree: true });

    /* ---------- Offerte lampo : compte à rebours jusqu'à minuit (heure du visiteur) ---------- */
    var clock = document.querySelectorAll('[data-mhf-timer] span');
    if (clock.length === 3) {
      var tick = function () {
        var now = new Date();
        var end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        var left = Math.max(0, Math.floor((end - now) / 1000));
        [Math.floor(left / 3600), Math.floor(left / 60) % 60, left % 60].forEach(function (value, i) {
          clock[i].textContent = String(value).padStart(2, '0');
        });
      };
      tick();
      setInterval(tick, 1000);
    }

    /* ---------- En-tête en défilant : loupe à côté du cœur ---------- */
    if (!document.body.classList.contains('mshein-home')) return;
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

    // Barres collées sous l'en-tête (onglets « Per te », Filtri / tri des rayons) : sous sa hauteur réelle
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
