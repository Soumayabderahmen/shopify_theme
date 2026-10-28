/* Accueil ORDINATEUR au style shop.com (sections/desktop-home-shop.liquid) : Black Friday (entre les dates des réglages
   du thème, compte à rebours, onglets), grande carte animée (scènes de produits des rayons), flèches des rangées, mot
   géant des rayons, collections (produits 3 par 3), photos des occasions « recherche », photo du titre qui change,
   catégories phares qui se retournent, cartes (bouton « Anteprima », cœur, panier). Rien sur mobile (≤ 760px). */
(function () {
  'use strict';

  var root = document.querySelector('[data-dhp]');
  if (!root || window.matchMedia('(max-width: 760px)').matches) return;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var t = {};
  try { t = JSON.parse(root.getAttribute('data-i18n') || '{}'); } catch (error) { t = {}; }
  // Les textes traduits arrivent déjà échappés (« aujourd&#39;hui ») : décodés ici, ils sont échappés une seule fois à
  // l'affichage (sinon « Arrive aujourd&#39;hui » en français)
  var decoder = document.createElement('textarea');
  Object.keys(t).forEach(function (key) {
    if (typeof t[key] !== 'string' || t[key].indexOf('&') < 0) return;
    decoder.innerHTML = t[key];
    t[key] = decoder.value;
  });
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var sized = function (src, w) { return String(src).replace(/([?&])width=\d+/, '$1width=' + w); };

  // Pleine largeur : décalage du conteneur du thème et largeur sans la barre de défilement
  var setFullWidth = function () {
    root.style.setProperty('--dhp-x', root.parentElement.getBoundingClientRect().left + 'px');
    root.style.setProperty('--dhp-w', document.documentElement.clientWidth + 'px');
  };
  window.addEventListener('resize', setFullWidth);
  setFullWidth();

  var depts = [];
  try { depts = JSON.parse(root.querySelector('[data-dhp-data]').textContent); } catch (error) { depts = []; }

  // ---------- Black Friday : entre les dates des réglages (ou dans l'éditeur, ou avec ?bf-preview) ----------
  var bfStart = Number(root.getAttribute('data-bf-start')) * 1000;
  var bfEnd = Number(root.getAttribute('data-bf-end')) * 1000;
  var bfOn = false;
  if (root.hasAttribute('data-bf-end')) {
    var now = Date.now();
    bfOn = (now >= bfStart && now <= bfEnd) || root.getAttribute('data-bf-preview') === 'true' || /[?&]bf-preview/.test(location.search);
  }
  var bfDeals = [];
  // Tuile ajoutée au début d'une rangée (Occasioni) : l'accroche du défilement ramènerait sinon la rangée sur la tuile
  // d'avant (la nouvelle serait cachée à gauche) ; remise au début sans accroche
  var toStart = function () {
    root.querySelectorAll('.dhp-track').forEach(function (track) {
      track.style.scrollSnapType = 'none';
      track.scrollLeft = 0;
      requestAnimationFrame(function () { track.style.scrollSnapType = ''; });
    });
  };
  if (bfOn) {
    root.classList.add('bf-on');
    root.querySelectorAll('[data-bf-only]').forEach(function (el) { el.hidden = false; });
    toStart();
    if (document.readyState === 'complete') setTimeout(toStart, 50); else window.addEventListener('load', toStart);
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var tick = function () {
      var left = Math.max(0, bfEnd - Date.now()) / 1000 | 0;
      var p = { d: left / 86400 | 0, h: left % 86400 / 3600 | 0, m: left % 3600 / 60 | 0, s: left % 60 };
      var boxes = '<span><b>' + p.d + '</b>' + esc(t.days) + '</span><span><b>' + pad(p.h) + '</b>' + esc(t.hours) + '</span><span><b>' + pad(p.m) + '</b>' + esc(t.minutes) + '</span><span><b>' + pad(p.s) + '</b>' + esc(t.seconds) + '</span>';
      var line = p.d + esc(t.dayShort) + ' ' + pad(p.h) + ':' + pad(p.m) + ':' + pad(p.s);
      root.querySelectorAll('[data-bf-cd]').forEach(function (el) { el.innerHTML = el.getAttribute('data-bf-cd') === 'boxes' ? boxes : line; });
    };
    tick();
    setInterval(tick, 1000);
    // Barre du haut (snippets/desktop-header.liquid) : sur l'accueil, la remise et le nombre d'offres comme le prototype
    var tbar = document.querySelector('[data-dh-tbar]');
    if (tbar) {
      var tbarEnds = tbar.querySelector('[data-dh-bf-ends]');
      if (tbarEnds && t.bfUpToOffers) {
        tbarEnds.removeAttribute('data-dh-bf-ends');
        tbarEnds.textContent = t.bfUpToOffers;
      }
      var tbarPromo = tbar.querySelector('.dh-tbar__promo--bf span');
      if (tbarPromo && t.tbarBfPromo) tbarPromo.innerHTML = t.tbarBfPromo;
    }
    // Onglets par rayon : cartes filtrées (attribut data-di posé par la section)
    var tabs = root.querySelector('[data-dhp-bf-tabs]');
    var rail = root.querySelector('[data-dhp-bf-rail]');
    if (tabs && rail) {
      tabs.addEventListener('click', function (event) {
        var button = event.target.closest('button');
        if (!button) return;
        tabs.querySelectorAll('button').forEach(function (b) { b.classList.toggle('is-on', b === button); });
        var di = button.getAttribute('data-di');
        rail.style.opacity = 0;
        setTimeout(function () {
          rail.querySelectorAll('.mshein-card').forEach(function (card) { card.hidden = di !== '-1' && card.getAttribute('data-di') !== di; });
          rail.scrollLeft = 0;
          rail.dispatchEvent(new Event('scroll'));
          rail.style.opacity = 1;
        }, 200);
      });
    }
    // Offres de la grande carte : les mêmes produits que les cartes (plus forte remise d'abord)
    var seen = {};
    depts.forEach(function (d) { d.p.forEach(function (c) { if (c.c && !seen[c.u]) { seen[c.u] = 1; bfDeals.push(c); } }); });
    bfDeals.sort(function (a, b) { return Math.abs(parseInt(b.c, 10)) - Math.abs(parseInt(a.c, 10)); });
  }

  // ---------- Grande carte animée : une scène par groupe de 3 produits d'un rayon (et Black Friday) ----------
  var hero = root.querySelector('[data-dhp-hero]');
  var art = root.querySelector('[data-dhp-art]');
  if (hero && art && depts.length) {
    var STEP = 5500;
    var slots = [[t.arriveToday, '15–16'], [t.arriveTomorrow, '10–14'], [t.arriveTomorrow, '9–12'], [t.arriveToday, '18–20'], [t.arriveTomorrow, '14–17']];
    var seenHero = {};
    var rays = depts.map(function (d, di) {
      var cards = d.p.filter(function (c) { if (seenHero[c.u]) return false; seenHero[c.u] = 1; return true; });
      var groups = [];
      for (var k = 0; k < cards.length; k += 3) {
        var g = cards.slice(k, k + 3);
        if (g.length < 3) { if (cards.length < 3) break; g = g.concat(cards.slice(0, 3 - g.length)); }
        g.sort(function (a, b) { return Math.abs(parseInt(b.c, 10) || 0) - Math.abs(parseInt(a.c, 10) || 0); });
        groups.push({ d: d, di: di, p: g[0], a: g[1], b: g[2], e: cards[(k + 3) % cards.length] });
      }
      return groups;
    }).filter(function (g) { return g.length; });
    var scenes = [];
    for (var r = 0, more = true; more; r++) {
      more = false;
      rays.forEach(function (g) { if (g[r]) { scenes.push(g[r]); more = true; } });
    }
    if (bfOn && bfDeals.length > 3) {
      var bfScenes = [];
      for (var q = 0; q + 2 < bfDeals.length; q += 3) bfScenes.push({ bf: true, di: -1, p: bfDeals[q], a: bfDeals[q + 1], b: bfDeals[q + 2], e: bfDeals[(q + 3) % bfDeals.length], list: bfDeals.slice(q, q + 6) });
      var mixed = [];
      scenes.forEach(function (s, k) { if (k % 5 === 0) mixed.push(bfScenes[(k / 5) % bfScenes.length]); mixed.push(s); });
      scenes = mixed;
    }
    if (scenes.length) {
      var fl = function (k, c, w, pct) {
        return '<a class="dhp-fl dhp-fl--' + k + '" href="' + esc(c.u) + '" tabindex="-1"><span class="dhp-fl__in"><img src="' + esc(sized(c.i, w)) + '" alt="">' + (pct && c.c ? '<b class="dhp-fl__pct">' + esc(c.c) + '</b>' : '') + '</span></a>';
      };
      var trk = function (s, i) {
        if (s.bf) return '<div class="dhp-trk dhp-trk--bf"><small>' + esc(t.bfName) + ' · ' + esc(t.bfEndsIn) + '</small><b data-bf-cd="line"></b><em>' + esc(t.bfUpToProducts) + '</em></div>';
        var slot = slots[i % slots.length];
        return '<div class="dhp-trk"><small>' + esc(t.shop) + ' · ' + esc(s.d.t) + '</small><b>' + esc(String(slot[0] || '').replace('__H__', slot[1])) + '</b>' +
          '<span class="dhp-trk__bar"><i class="ok"></i><i class="ok"></i><i class="ok"></i><i></i></span><em>' + esc(t.inDelivery) + '</em></div>';
      };
      var map = '<svg viewBox="0 0 214 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><path d="M150 0c-10 40 10 70-6 110s14 40 20 40h50V0z" fill="#cfe0ee"/>' +
        '<g fill="none" stroke="#fff" stroke-width="5"><path d="M0 40h214M0 104h214M40 0v150M110 0v150M0 150 214 10"/></g>' +
        '<g fill="none" stroke="#fff" stroke-width="2"><path d="M0 70h214M0 128h214M75 0v150M180 0v150M0 20 120 150"/></g>' +
        '<path d="M108 66 214 0" stroke="#16123f" stroke-width="2.5"/><circle cx="108" cy="66" r="6" fill="#16123f" stroke="#fff" stroke-width="2.5"/></svg>';
      var screen = function (s, i) {
        var p = s.p;
        var bar = '<div class="dhp-scr__bar"><b>9:41</b><span>▂▄▆ ▮</span></div>';
        if (s.bf) {
          return '<div class="dhp-scr__in">' + bar +
            '<div class="dhp-scrbf__hd"><small>' + esc(t.bfName) + '</small><b>' + esc(t.bfUpTo) + '</b><span>' + esc(String(t.bfEndsIn || '').charAt(0).toUpperCase() + String(t.bfEndsIn || '').slice(1)) + ' <span data-bf-cd="line"></span></span></div>' +
            s.list.map(function (c) {
              return '<div class="dhp-scrbf__row"><img src="' + esc(sized(c.i, 120)) + '" alt=""><span><p>' + esc(c.t) + '</p><b>' + esc(c.p) + '</b><s>' + esc(c.o) + '</s></span><em>' + esc(c.c) + '</em></div>';
            }).join('') + '</div>';
        }
        return '<div class="dhp-scr__in">' + bar +
          '<div class="dhp-scr__map">' + map + '<span class="dhp-scr__pin"><img src="' + esc(sized(p.i, 100)) + '" alt=""></span></div>' +
          trk(s, i) +
          '<div class="dhp-scr__ship"><b>📦 ' + esc(t.express) + '</b><span>' + esc(t.tracking) + ' PS' + (260411873 + i * 7919) + '</span></div>' +
          '<div class="dhp-scr__prod"><img src="' + esc(sized(p.i, 400)) + '" alt=""><p>' + esc(p.t) + '</p>' +
          '<div class="dhp-scr__row"><span><b>' + esc(p.p) + '</b>' + (p.o ? '<s>' + esc(p.o) + '</s>' : '') + '</span>' + (p.r ? '<span class="dhp-scr__rate"><i>★</i>' + esc(p.r) + '</span>' : '') + '</div>' +
          '<span class="dhp-scr__go">' + esc(t.addToCart) + '</span></div></div>';
      };
      // Deux calques qui alternent : l'un sort pendant que l'autre, rempli avec la scène suivante, entre.
      art.innerHTML = '<div class="dhp-hs"></div><div class="dhp-hs"></div>' +
        '<div class="dhp-phone"><a class="dhp-scr" tabindex="-1"></a><a class="dhp-scr" tabindex="-1"></a></div>' +
        '<div class="dhp-hn"></div><div class="dhp-hn"></div>' +
        '<div class="dhp-hdots">' + (scenes[0].bf ? '<button type="button" class="is-bf" aria-label="' + esc(t.bfName) + '" data-di="-1"></button>' : '') +
        rays.map(function (g) { return '<button type="button" aria-label="' + esc(g[0].d.t) + '" data-di="' + g[0].di + '"></button>'; }).join('') + '</div>';
      var layers = art.querySelectorAll('.dhp-hs'), screens = art.querySelectorAll('.dhp-scr'), notes = art.querySelectorAll('.dhp-hn'), dots = art.querySelectorAll('.dhp-hdots button');
      var cur = -1, layer = 1, timer = null;
      var preload = function (s) { [s.p, s.a, s.b, s.e].forEach(function (c) { if (c) new Image().src = sized(c.i, 400); }); };
      var show = function (i) {
        if (i === cur) return;
        var prev = layer;
        layer = 1 - layer;
        if (cur > -1) {
          layers[prev].querySelectorAll('.dhp-fl').forEach(function (f) { f.classList.remove('on'); f.classList.add('off'); });
          screens[prev].classList.remove('on');
          notes[prev].classList.remove('on');
        }
        cur = i;
        var s = scenes[i];
        layers[layer].innerHTML = fl('a', s.a, 360, s.bf) + fl('b', s.b, 300, s.bf) + fl('c', s.p, 400, s.bf) + (s.e ? fl('d', s.e, 300, s.bf) : '');
        screens[layer].href = s.p.u;
        screens[layer].innerHTML = screen(s, i);
        notes[layer].innerHTML = trk(s, i);
        hero.classList.toggle('is-bf', Boolean(s.bf));
        void art.offsetWidth;
        layers[layer].querySelectorAll('.dhp-fl').forEach(function (f) { f.classList.add('on'); });
        screens[layer].classList.add('on');
        notes[layer].classList.add('on');
        dots.forEach(function (b) { b.classList.toggle('on', Number(b.getAttribute('data-di')) === s.di); });
        preload(scenes[(i + 1) % scenes.length]);
      };
      var run = function () { clearInterval(timer); if (!still) timer = setInterval(function () { if (!document.hidden) show((cur + 1) % scenes.length); }, STEP); };
      dots.forEach(function (b) {
        b.addEventListener('click', function () {
          for (var k = 1; k <= scenes.length; k++) { var j = (cur + k) % scenes.length; if (scenes[j].di === Number(b.getAttribute('data-di'))) { show(j); break; } }
          run();
        });
      });
      show(0);
      run();
    }
  }

  // ---------- Flèches des rangées qui défilent (une fois par rangée : aussi pour la suite de la page chargée après) ----------
  var initArrows = function () {
  root.querySelectorAll('.dhp-arws[data-for]:not([data-ready])').forEach(function (box) {
    var track = document.getElementById(box.getAttribute('data-for'));
    if (!track) return;
    box.setAttribute('data-ready', '');
    var buttons = box.querySelectorAll('.dhp-arw');
    var paint = function () {
      buttons[0].disabled = track.scrollLeft < 4;
      buttons[1].disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 4;
    };
    buttons.forEach(function (b) { b.addEventListener('click', function () { track.scrollBy({ left: Number(b.getAttribute('data-step')) * track.clientWidth * 0.8 }); }); });
    track.addEventListener('scroll', paint, { passive: true });
    window.addEventListener('resize', paint);
    setTimeout(paint, 300);
  });
  };
  initArrows();

  // ---------- Cartes : cœur (wishlist du site), panier (fenêtre « Aggiungi al carrello »), bouton « Anteprima » ----------
  var syncHearts = function (scope) {
    if (!window.mobileWishlist || typeof window.mobileWishlist.has !== 'function') return;
    scope.querySelectorAll('.mshein-card__fav[data-product-id]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(Boolean(window.mobileWishlist.has(button.getAttribute('data-product-id')))));
    });
  };
  var decorate = function (scope) {
    syncHearts(scope);
    if (window.msheinCards && typeof window.msheinCards.decorate === 'function') window.msheinCards.decorate(scope);
  };
  var toastBox = null;
  var toastTimer = null;
  var toast = function (text) {
    if (!text) return;
    if (!toastBox) {
      toastBox = document.createElement('div');
      toastBox.className = 'dhp-toast';
      toastBox.setAttribute('role', 'status');
      root.appendChild(toastBox);
    }
    toastBox.textContent = text;
    toastBox.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastBox.classList.remove('is-on'); }, 1800);
  };
  root.addEventListener('click', function (event) {
    var card = event.target.closest('.mshein-card');
    if (!card) return;
    var link = card.querySelector('.mshein-card__title a, a.mshein-card__link');
    var heart = event.target.closest('.mshein-card__fav');
    if (heart) {
      event.preventDefault();
      event.stopPropagation();
      if (!window.mobileWishlist || typeof window.mobileWishlist.toggle !== 'function') return;
      var image = card.querySelector('.mshein-card__link img');
      var price = card.querySelector('.mshein-card__now');
      var saved = window.mobileWishlist.toggle({
        id: heart.getAttribute('data-product-id'),
        variantId: heart.getAttribute('data-variant-id'),
        variantTitle: heart.getAttribute('data-variant-title') || '',
        title: card.getAttribute('data-mshein-title') || (link ? link.textContent.trim() : ''),
        url: link ? link.getAttribute('href') : '',
        image: image ? (image.currentSrc || image.src) : '',
        price: price ? price.textContent.replace(/\s+/g, ' ').trim() : '',
        priceCents: heart.getAttribute('data-price-cents'),
        compareAtPriceCents: heart.getAttribute('data-compare-at-price-cents')
      });
      syncHearts(root);
      if (typeof saved === 'boolean') toast(root.getAttribute(saved ? 'data-added' : 'data-removed'));
      return;
    }
    var add = event.target.closest('.mshein-card__add');
    if (add && link) {
      // Fenêtre « Aggiungi al carrello » du site, la même qu'en mobile (assets/mobile-quick-add.js) ; sinon la fiche produit
      event.preventDefault();
      var api = window.mobileQuickAdd;
      if (!api || typeof api.openCard !== 'function' || !api.openCard(add, { desktop: true })) window.location.href = link.getAttribute('href');
    }
  });
  var eye = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  root.addEventListener('mouseover', function (event) {
    var card = event.target.closest && event.target.closest('.mshein-card');
    if (!card || card.querySelector('.dhp-qv')) return;
    var media = card.querySelector('.mshein-card__img');
    var link = card.querySelector('.mshein-card__link');
    if (media && link) media.insertAdjacentHTML('beforeend', '<a class="dhp-qv" href="' + esc(link.getAttribute('href')) + '">' + eye + esc(t.preview) + '</a>');
  });
  syncHearts(root);

  // ---------- Suite de la page (parties « more-a / -b / -c » de la section) : lancée après l'arrivée de chaque partie,
  // chaque élément une seule fois (attribut data-ready) ----------
  var once = function (el) {
    if (!el || el.hasAttribute('data-ready')) return false;
    el.setAttribute('data-ready', '');
    return true;
  };
  var initMore = function () {
  // ---------- Mot géant : le rayon choisi (clic ou toutes les 4,5 s) et ses 10 produits ----------
  var marq = root.querySelector('[data-dhp-marq]');
  var prods = root.querySelector('[data-dhp-prods]');
  if (marq && prods && once(marq)) {
    var list = [].slice.call(marq.querySelector('[data-dhp-marq-depts]').content.querySelectorAll('i')).map(function (i) {
      return { title: i.getAttribute('data-title'), src: i.getAttribute('data-src'), img: i.getAttribute('data-img'), cards: '' };
    });
    var row = marq.querySelector('[data-dhp-marq-row]');
    var pic = marq.querySelector('[data-dhp-marq-img]');
    var current = Number(marq.getAttribute('data-start')) || 0;
    var marqTimer = null;
    if (list[current]) list[current].cards = prods.innerHTML;
    var load = function (d) {
      if (d.cards || d.loading) return d.loading || Promise.resolve();
      d.loading = fetch(d.src, { credentials: 'same-origin' })
        .then(function (response) { return response.ok ? response.text() : ''; })
        .then(function (html) {
          var page = new DOMParser().parseFromString(html, 'text/html');
          d.cards = [].slice.call(page.querySelectorAll('.mshein-card')).slice(0, 10).map(function (c) { return c.outerHTML; }).join('');
        })
        .catch(function () { d.cards = ''; });
      return d.loading;
    };
    var showDept = function (i, first) {
      current = (i + list.length) % list.length;
      var d = list[current];
      var before = list[(current - 1 + list.length) % list.length], after = list[(current + 1) % list.length];
      row.innerHTML = '<span class="dhp-marq__w" data-i="' + (current - 1) + '">' + esc(before.title) + '</span><span class="dhp-marq__w is-on">' + esc(d.title) + '</span><span class="dhp-marq__w" data-i="' + (current + 1) + '">' + esc(after.title) + '</span>';
      pic.innerHTML = d.img ? '<img src="' + esc(d.img) + '" alt="">' : '';
      if (!first) {
        prods.classList.add('is-swap');
        load(d).then(function () {
          if (list[current] !== d || !d.cards) { prods.classList.remove('is-swap'); return; }
          prods.innerHTML = d.cards;
          decorate(prods);
          prods.classList.remove('is-swap');
        });
      }
      load(list[(current + 1) % list.length]);
    };
    var runMarq = function () {
      clearInterval(marqTimer);
      if (!still) marqTimer = setInterval(function () { if (!document.hidden) showDept(current + 1); }, 4500);
    };
    row.addEventListener('click', function (event) {
      var word = event.target.closest('[data-i]');
      if (!word) return;
      showDept(Number(word.getAttribute('data-i')));
      runMarq();
    });
    if (list.length) { showDept(current, true); runMarq(); }
  }

  // ---------- « Vedi altri » des marques : fenêtre de toutes les marques (assets/mobile-brands.json, la même liste que
  // « Tutti i brand » du mobile), remplie à la 1re ouverture ; recherche, fermeture (×, Échap, clic à côté) ----------
  var brandsBox = root.querySelector('[data-dhp-brands]');
  if (brandsBox && once(brandsBox)) {
    var brandsGrid = brandsBox.querySelector('[data-dhp-brands-grid]');
    var brandsFilter = brandsBox.querySelector('[data-dhp-brands-filter]');
    var brandsEmpty = brandsBox.querySelector('[data-dhp-brands-empty]');
    var brandsLoaded = false;
    var colors = ['#e8547a', '#c8102e', '#2f2a6b', '#0e7c66', '#f08c2e', '#e2506b', '#b23a48', '#7a4e2d', '#3a74c4', '#5b5799'];
    var normalize = function (value) { return String(value).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); };
    var filterBrands = function () {
      var query = normalize(brandsFilter.value);
      var visible = 0;
      brandsGrid.querySelectorAll('.dhp-brand').forEach(function (tile) {
        var match = !query || tile.getAttribute('data-brand-name').indexOf(query) !== -1;
        tile.hidden = !match;
        if (match) visible += 1;
      });
      brandsEmpty.hidden = visible > 0 || !brandsLoaded;
    };
    var fillBrands = function () {
      if (brandsLoaded) return;
      brandsLoaded = true;
      // Les marques de la rangée gardent leur lien et leur photo (Nike, Adidas… vont vers leur collection)
      var shown = {};
      root.querySelectorAll('#dhp-brands a.dhp-brand').forEach(function (tile) {
        var label = tile.querySelector('strong');
        var image = tile.querySelector('img');
        if (label) shown[label.textContent.trim().toLowerCase()] = { href: tile.getAttribute('href'), image: image ? image.getAttribute('src') : '' };
      });
      var base = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
      fetch(brandsBox.getAttribute('data-brands-url'), { credentials: 'same-origin' })
        .then(function (response) {
          if (!response.ok) throw new Error('Brand list request failed: ' + response.status);
          return response.json();
        })
        .then(function (data) {
          brandsGrid.innerHTML = data.brands.map(function (brand, i) {
            var known = shown[String(brand[0]).toLowerCase()];
            var href = known ? known.href : base + 'search?q=' + encodeURIComponent(brand[1]) + '&type=product&options%5Bfields%5D=title%2Cvendor%2Cproduct_type';
            var image = known ? known.image : (brand[3] ? (/^https?:/.test(brand[3]) ? brand[3] : data.cdn + brand[3]) + '&width=300' : '');
            return '<a class="dhp-brand" href="' + esc(href) + '" data-brand-name="' + esc(normalize(brand[0])) + '" style="background:' + colors[i % colors.length] + ';--i:' + (Math.min(i, 30) * 0.015).toFixed(3) + 's">' +
              (image ? '<img src="' + esc(image) + '" alt="" loading="lazy" width="150" height="150" onerror="this.remove()">' : '') +
              '<strong>' + esc(brand[0]) + '</strong></a>';
          }).join('');
          brandsBox.querySelector('[data-dhp-brands-count]').textContent = data.brands.length;
          filterBrands();
        })
        .catch(function (error) {
          brandsLoaded = false;
          console.error(error);
        });
    };
    var closeBrands = function () {
      if (!brandsBox.open || brandsBox.classList.contains('is-closing')) return;
      brandsBox.classList.add('is-closing');
      setTimeout(function () {
        brandsBox.classList.remove('is-closing');
        brandsBox.close();
        document.documentElement.classList.remove('dhp-modal-open');
      }, still ? 0 : 190);
    };
    root.querySelectorAll('[data-dhp-brands-open]').forEach(function (button) {
      button.addEventListener('click', function () {
        fillBrands();
        if (!brandsBox.open) brandsBox.showModal();
        document.documentElement.classList.add('dhp-modal-open');
        brandsFilter.focus();
      });
    });
    brandsBox.querySelector('[data-dhp-brands-close]').addEventListener('click', closeBrands);
    // Clic sur le fond assombri (en dehors de la fenêtre)
    brandsBox.addEventListener('click', function (event) { if (event.target === brandsBox) closeBrands(); });
    brandsBox.addEventListener('cancel', function (event) { event.preventDefault(); closeBrands(); });
    brandsFilter.addEventListener('input', filterBrands);
  }

  // ---------- Collezioni da scoprire : produits 3 par 3 (flèches, automatique toutes les 3,5 s, pause au survol) ----------
  root.querySelectorAll('.dhp-coll:not([data-ready])').forEach(function (coll, index) {
    once(coll);
    var rail = coll.querySelector('.dhp-coll__rail');
    var dotsBox = coll.querySelector('.dhp-coll__dots');
    var pages = Math.max(1, Math.ceil(rail.children.length / 3));
    dotsBox.innerHTML = new Array(pages + 1).join('<i></i>');
    var dots = dotsBox.querySelectorAll('i');
    var page = 0;
    var paintDots = function () { dots.forEach(function (dot, k) { dot.classList.toggle('is-on', k === page); }); };
    var go = function (next) {
      page = (next + pages) % pages;
      rail.scrollTo({ left: page * rail.clientWidth + page * 8 });
      paintDots();
    };
    paintDots();
    coll.addEventListener('click', function (event) {
      var arrow = event.target.closest('[data-coll-step]');
      var thumb = event.target.closest('.dhp-thumb[data-href]');
      if (arrow) {
        event.preventDefault();
        go(page + Number(arrow.getAttribute('data-coll-step')));
      } else if (thumb) {
        event.preventDefault();
        window.location.href = thumb.getAttribute('data-href');
      }
    });
    rail.addEventListener('scroll', function () {
      var near = Math.round(rail.scrollLeft / (rail.clientWidth + 8));
      if (near !== page) { page = near; paintDots(); }
    }, { passive: true });
    var over = false;
    coll.addEventListener('mouseenter', function () { over = true; });
    coll.addEventListener('mouseleave', function () { over = false; });
    if (!still && pages > 1) {
      setTimeout(function () {
        setInterval(function () { if (!over && !document.hidden) go(page + 1); }, 3500);
      }, index * 600);
    }
  });

  // ---------- Occasioni « recherche » : 2 photos des produits trouvés (recherche prédictive de Shopify) ----------
  root.querySelectorAll('.dhp-occ[data-occ-q]:not([data-ready])').forEach(function (tile) {
    once(tile);
    var box = tile.querySelector('.dhp-occ__img');
    var base = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
    fetch(base + 'search/suggest.json?q=' + encodeURIComponent(tile.getAttribute('data-occ-q')) + '&resources[type]=product&resources[limit]=4', { credentials: 'same-origin' })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) {
        var products = (data && data.resources && data.resources.results && data.resources.results.products) || [];
        box.innerHTML = products.slice(0, 2).map(function (p) {
          var src = (p.featured_image && p.featured_image.url) || p.image;
          return src ? '<img src="' + esc(src) + (src.indexOf('?') > -1 ? '&' : '?') + 'width=700" alt="" loading="lazy">' : '';
        }).join('');
      })
      .catch(function () {});
  });

  // ---------- Photo du titre « colpo di fulmine » : un produit différent toutes les 2,4 s, qui se retourne ----------
  var chip = root.querySelector('[data-dhp-chip]');
  var chipPics = root.querySelector('[data-dhp-chip-pics]');
  if (chip && chipPics && once(chip)) {
    var pics = [].slice.call(chipPics.content.querySelectorAll('i')).map(function (i) { return i.getAttribute('data-src'); });
    if (pics.length) {
      var n = 0;
      chip.innerHTML = '<img src="' + esc(pics[0]) + '" alt="">';
      var chipImg = chip.firstChild;
      if (!still && pics.length > 1) {
        new Image().src = pics[1];
        setInterval(function () {
          if (document.hidden) return;
          n = (n + 1) % pics.length;
          chip.classList.add('is-out');
          setTimeout(function () {
            chipImg.src = pics[n];
            chip.classList.remove('is-out');
            new Image().src = pics[(n + 1) % pics.length];
          }, 260);
        }, 2400);
      }
    }
  }

  // ---------- Catégories phares : pages de 4, chaque carte se retourne l'une après l'autre (4,5 s, flèches, points) ----------
  var ed = root.querySelector('[data-dhp-ed]');
  if (ed && once(ed)) {
    var grid = ed.querySelector('[data-dhp-ed-grid]');
    var edDotsBox = ed.querySelector('[data-dhp-ed-dots]');
    var edArrows = ed.querySelector('[data-dhp-ed-arws]');
    var cards = [].slice.call(ed.querySelector('[data-dhp-ed-cards]').content.children).map(function (el) { return el.outerHTML; });
    var per = 4;
    var edPages = Math.max(1, Math.ceil(cards.length / per));
    var edPage = 0;
    var busy = false;
    var pending = null;
    var lastAction = Date.now();
    grid.innerHTML = cards.slice(0, per).map(function (c) { return '<div class="dhp-fc-slot">' + c + '</div>'; }).join('');
    var edSlots = [].slice.call(grid.children);
    edDotsBox.innerHTML = edPages > 1 ? new Array(edPages + 1).join('<button type="button"></button>') : '';
    var edDots = [].slice.call(edDotsBox.children);
    edDots.forEach(function (dot, k) { dot.setAttribute('aria-label', (k + 1) + ' / ' + edPages); dot.classList.toggle('is-on', k === 0); });
    edArrows.hidden = edPages < 2;
    var preloadPage = function (p) {
      cards.slice(p * per, p * per + per).forEach(function (html) {
        (html.match(/src="[^"]+"/g) || []).forEach(function (m) { new Image().src = m.slice(5, -1).replace(/&amp;/g, '&'); });
      });
    };
    preloadPage(1 % edPages);
    var showPage = function (next) {
      if (edPages < 2) return;
      if (busy) { pending = next; return; }
      busy = true;
      edPage = (next + edPages) % edPages;
      edDots.forEach(function (dot, k) { dot.classList.toggle('is-on', k === edPage); });
      edSlots.forEach(function (slot, i) {
        var html = cards[edPage * per + i] || cards[i];
        setTimeout(function () {
          slot.classList.remove('is-in');
          slot.classList.add('is-out');
          setTimeout(function () {
            slot.innerHTML = html;
            slot.classList.remove('is-out');
            void slot.offsetWidth;
            slot.classList.add('is-in');
            if (i === edSlots.length - 1) {
              setTimeout(function () {
                busy = false;
                preloadPage((edPage + 1) % edPages);
                if (pending !== null) { var queued = pending; pending = null; if (queued !== edPage) showPage(queued); }
              }, 500);
            }
          }, 380);
        }, i * 140);
      });
    };
    edArrows.addEventListener('click', function (event) {
      var button = event.target.closest('[data-step]');
      if (!button) return;
      lastAction = Date.now();
      showPage((pending !== null ? pending : edPage) + Number(button.getAttribute('data-step')));
    });
    edDotsBox.addEventListener('click', function (event) {
      var dot = event.target.closest('button');
      if (!dot) return;
      lastAction = Date.now();
      showPage(edDots.indexOf(dot));
    });
    if (!still) {
      setInterval(function () {
        if (document.hidden || busy || Date.now() - lastAction < 4400) return;
        if (grid.matches(':hover') || edArrows.matches(':hover') || edDotsBox.matches(':hover')) return;
        lastAction = Date.now();
        showPage(edPage + 1);
      }, 500);
    }
  }
  };

  // Chargement : la suite est rendue par Shopify dans une 2e requête (sans en-tête ni pied de page), insérée ici, puis
  // ses rangées, animations et cartes sont lancées comme avant
  // 3 morceaux demandés en même temps par le petit script de la section (window.dhpMore, dès l'arrivée de la page) :
  // chacun est inséré dès qu'il arrive, puis ses rangées, animations et cartes sont lancées
  root.querySelectorAll('[data-dhp-more-part]').forEach(function (box) {
    var key = box.getAttribute('data-dhp-more-part');
    var request = window.dhpMore && window.dhpMore[key];
    if (!request) return;
    request
      .then(function (html) {
        var part = new DOMParser().parseFromString(html, 'text/html').querySelector('[data-dhp-more-in]');
        if (!part) throw new Error('dhp-more-' + key + ' vide');
        box.innerHTML = part.innerHTML;
        box.removeAttribute('aria-busy');
        if (bfOn) {
          box.querySelectorAll('[data-bf-only]').forEach(function (el) { el.hidden = false; });
          toStart();
        }
        decorate(box);
        initArrows();
        initMore();
      })
      .catch(function (error) {
        box.removeAttribute('aria-busy');
        console.error(error);
      });
  });
})();
