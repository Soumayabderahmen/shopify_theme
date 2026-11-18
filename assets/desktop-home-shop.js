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
  // Bloc visible à l'écran ? (IntersectionObserver, sans mesure) — les minuteries ne touchent plus au DOM des blocs hors
  // de l'écran : chaque modification relançait un recalcul de style de la page entière pour rien.
  var onScreen = (function () {
    if (!('IntersectionObserver' in window)) return function () { return true; };
    var seen = new WeakMap();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { seen.set(entry.target, entry.isIntersecting); });
    });
    return function (el) {
      if (!el) return false;
      if (!seen.has(el)) { seen.set(el, true); io.observe(el); }
      return seen.get(el);
    };
  })();

  // Pleine largeur : décalage du conteneur du thème et largeur sans la barre de défilement
  var setFullWidth = function () {
    root.style.setProperty('--dhp-x', root.parentElement.getBoundingClientRect().left + 'px');
    root.style.setProperty('--dhp-w', document.documentElement.clientWidth + 'px');
  };
  window.addEventListener('resize', setFullWidth);
  setFullWidth();

  // Données de la grande carte (rayons et leurs produits) : dans la réponse de la partie « more-b » (window.dhpMore.b,
  // demandée par la section à l'arrivée de la page) ; tout le reste du script démarre à leur arrivée (boot), sans
  // elles si la demande échoue
  var depts = [];
  var boot = function () {

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
      root.querySelectorAll('[data-bf-cd]').forEach(function (el) {
        if (!first && !onScreen(el)) return;
        el.innerHTML = el.getAttribute('data-bf-cd') === 'boxes' ? boxes : line;
      });
    };
    var first = true;
    tick();
    first = false;
    setInterval(function () { if (!document.hidden) tick(); }, 1000);
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
      var run = function () { clearInterval(timer); if (!still) timer = setInterval(function () { if (!document.hidden && onScreen(art)) show((cur + 1) % scenes.length); }, STEP); };
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
  // Détourage d'une photo produit dans le navigateur (mot géant des rayons, titre des nouveaux arrivages) : fond blanc
  // ou uni retiré depuis les bords, contour adouci, recadrée ; null si la photo n'a pas de fond uni
  // Calcul pur (sans fermeture : recopié tel quel dans le Web Worker ci-dessous) : fond retiré dans px (RGBA) en place,
  // renvoie le cadre de l'objet [minX, minY, maxX, maxY] ou null si la photo n'a pas de fond uni
  var cutPixels = function (px, w, h) {
    // Couleur du fond : moyenne des 4 coins ; refus si les coins diffèrent (photo mise en scène)
    var corner = function (x0, y0) {
      var r = 0, g = 0, b = 0, n = 0;
      for (var y = y0; y < y0 + 6; y += 1) for (var x = x0; x < x0 + 6; x += 1) { var o = (y * w + x) * 4; r += px[o]; g += px[o + 1]; b += px[o + 2]; n += 1; }
      return [r / n, g / n, b / n];
    };
    var cs = [corner(0, 0), corner(w - 6, 0), corner(0, h - 6), corner(w - 6, h - 6)];
    var bg = [0, 1, 2].map(function (k) { return (cs[0][k] + cs[1][k] + cs[2][k] + cs[3][k]) / 4; });
    var far = function (c) { return Math.abs(c[0] - bg[0]) + Math.abs(c[1] - bg[1]) + Math.abs(c[2] - bg[2]); };
    if (cs.some(function (c) { return far(c) > 30; }) || bg[0] + bg[1] + bg[2] < 600) return null;
    // Remplissage depuis tous les bords : les pixels proches du fond deviennent transparents
    var TOL = 46;
    var seen = new Uint8Array(w * h);
    var stack = [];
    var near = function (i) { var o = i * 4; return Math.abs(px[o] - bg[0]) + Math.abs(px[o + 1] - bg[1]) + Math.abs(px[o + 2] - bg[2]) < TOL; };
    for (var x = 0; x < w; x += 1) { stack.push(x, (h - 1) * w + x); }
    for (var y = 0; y < h; y += 1) { stack.push(y * w, y * w + w - 1); }
    var cleared = 0;
    while (stack.length) {
      var i = stack.pop();
      if (seen[i] || !near(i)) continue;
      seen[i] = 1; px[i * 4 + 3] = 0; cleared += 1;
      var cx = i % w;
      if (cx > 0) stack.push(i - 1);
      if (cx < w - 1) stack.push(i + 1);
      if (i >= w) stack.push(i - w);
      if (i < w * (h - 1)) stack.push(i + w);
    }
    // Trop peu de fond retiré (objet collé aux bords) ou presque tout (objet clair perdu) : photo écartée
    var ratio = cleared / (w * h);
    if (ratio < 0.18 || ratio > 0.92) return null;
    // Contour adouci : pixels gardés qui touchent le fond retiré, à moitié transparents ; cadre de l'objet
    var minX = w, minY = h, maxX = 0, maxY = 0;
    for (var j = 0; j < w * h; j += 1) {
      if (seen[j]) continue;
      var jx = j % w, jy = (j - jx) / w;
      if ((jx > 0 && seen[j - 1]) || (jx < w - 1 && seen[j + 1]) || (j >= w && seen[j - w]) || (j < w * (h - 1) && seen[j + w])) px[j * 4 + 3] = 120;
      if (jx < minX) minX = jx; if (jx > maxX) maxX = jx; if (jy < minY) minY = jy; if (jy > maxY) maxY = jy;
    }
    return [minX, minY, maxX, maxY];
  };
  // Le détourage se fait dans un Web Worker (fil séparé) : sur le fil principal, chaque photo bloquait la page 30 à 40 ms
  // (une vingtaine de photos au chargement de l'accueil, ~600 ms). Sans Worker / OffscreenCanvas : ancien calcul ci-dessous.
  var cutWorker = null, cutJobs = {}, cutSeq = 0;
  try {
    if (window.Worker && window.OffscreenCanvas && window.createImageBitmap) {
      var workerCode = 'var cutPixels = ' + cutPixels.toString() + ';\n' +
        'self.onmessage = function (e) {\n' +
        '  var id = e.data.id;\n' +
        '  var fail = function () { self.postMessage({ id: id, blob: null }); };\n' +
        '  fetch(e.data.src, { credentials: "omit" }).then(function (r) { if (!r.ok) throw 0; return r.blob(); })\n' +
        '    .then(function (b) { return createImageBitmap(b); })\n' +
        '    .then(function (bmp) {\n' +
        '      var w = bmp.width, h = bmp.height;\n' +
        '      if (!w || !h) return fail();\n' +
        '      var canvas = new OffscreenCanvas(w, h);\n' +
        '      var ctx = canvas.getContext("2d", { willReadFrequently: true });\n' +
        '      ctx.drawImage(bmp, 0, 0);\n' +
        '      var data = ctx.getImageData(0, 0, w, h);\n' +
        '      var box = cutPixels(data.data, w, h);\n' +
        '      if (!box) return fail();\n' +
        '      ctx.putImageData(data, 0, 0);\n' +
        '      var cw = box[2] - box[0] + 1, ch = box[3] - box[1] + 1;\n' +
        '      var out = new OffscreenCanvas(cw, ch);\n' +
        '      out.getContext("2d").drawImage(canvas, box[0], box[1], cw, ch, 0, 0, cw, ch);\n' +
        '      return out.convertToBlob({ type: "image/png" }).then(function (blob) { self.postMessage({ id: id, blob: blob }); });\n' +
        '    })\n' +
        '    .catch(fail);\n' +
        '};\n';
      cutWorker = new Worker(URL.createObjectURL(new Blob([workerCode], { type: 'text/javascript' })));
      cutWorker.onmessage = function (e) {
        var job = cutJobs[e.data.id];
        if (!job) return;
        delete cutJobs[e.data.id];
        job(e.data.blob ? URL.createObjectURL(e.data.blob) : null);
      };
      cutWorker.onerror = function () { cutWorker = null; };
    }
  } catch (error) { cutWorker = null; }
  var cutoutMain = function (src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () {
        try {
          var w = img.naturalWidth, h = img.naturalHeight;
          if (!w || !h) return resolve(null);
          var canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          var ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0);
          var data = ctx.getImageData(0, 0, w, h);
          var box = cutPixels(data.data, w, h);
          if (!box) return resolve(null);
          ctx.putImageData(data, 0, 0);
          var cw = box[2] - box[0] + 1, ch = box[3] - box[1] + 1;
          var out = document.createElement('canvas');
          out.width = cw; out.height = ch;
          out.getContext('2d').drawImage(canvas, box[0], box[1], cw, ch, 0, 0, cw, ch);
          out.toBlob(function (blob) { resolve(blob ? URL.createObjectURL(blob) : null); }, 'image/png');
        } catch (error) { resolve(null); }
      };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  };
  var cutout = function (src) {
    if (!cutWorker) return cutoutMain(src);
    return new Promise(function (resolve) {
      var id = (cutSeq += 1);
      cutJobs[id] = resolve;
      // Adresse complète : le Worker (adresse blob:) ne sait pas résoudre « //platinumshop.it/… » ni « /cdn/… »
      try { cutWorker.postMessage({ id: id, src: new URL(src, location.href).href }); } catch (error) { delete cutJobs[id]; cutoutMain(src).then(resolve); }
    });
  };
  var initMore = function () {
  // ---------- Mot géant : le rayon choisi (clic ou toutes les 5,3 s, comme shop.com) et ses 20 produits (2 lignes) ----------
  var marq = root.querySelector('[data-dhp-marq]');
  var prods = root.querySelector('[data-dhp-prods]');
  if (marq && prods && once(marq)) {
    var list = [].slice.call(marq.querySelector('[data-dhp-marq-depts]').content.querySelectorAll('i')).map(function (i) {
      return { title: i.getAttribute('data-title'), src: i.getAttribute('data-src'), imgs: (i.getAttribute('data-imgs') || '').split('|').filter(Boolean), webm: i.getAttribute('data-webm') || '', hevc: i.getAttribute('data-hevc') || '', cards: '' };
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
          d.cards = [].slice.call(page.querySelectorAll('.mshein-card')).slice(0, 20).map(function (c) { return c.outerHTML; }).join('');
        })
        .catch(function () { d.cards = ''; });
      return d.loading;
    };
    // Rangée des mots : 2 voisins de chaque côté, le rayon affiché au centre de l'écran (décalage calculé sur le mot)
    var at = function (k) { return list[((k % list.length) + list.length) % list.length]; };
    var drawRow = function () {
      var html = '';
      for (var k = current - 2; k <= current + 2; k += 1) html += '<span class="dhp-marq__w' + (k === current ? ' is-on' : '') + '" data-i="' + k + '">' + esc(at(k).title) + '</span>';
      row.classList.remove('is-sliding');
      row.innerHTML = html;
      row.style.transform = 'translateX(' + offsetOf(row.querySelector('.is-on')) + 'px)';
    };
    var offsetOf = function (word) { return marq.clientWidth / 2 - (word.offsetLeft + word.offsetWidth / 2); };
    var sliding = null;
    // ---------- Objet posé sur le mot (comme les objets 3D de shop.com) : une photo produit du rayon détourée dans le
    // navigateur (fond blanc ou uni retiré depuis les bords, contour adouci, recadrée), qui tourne en perspective.
    // Les photos sans fond uni (mises en scène) sont écartées ; si aucune ne convient, la 1re photo en médaillon.
    // (détourage : fonction cutout, partagée avec les nouveaux arrivages, plus haut)
    var objectOf = function (d) {
      if (d.object) return d.object;
      // Toutes les photos candidates en même temps ; la première (dans l'ordre du rayon) qui se détoure est gardée, dès
      // que les précédentes ont échoué (sans attendre les suivantes)
      d.object = new Promise(function (resolve) {
        var urls = new Array(d.imgs.length), done = new Array(d.imgs.length), settled = false;
        var check = function () {
          if (settled) return;
          for (var k = 0; k < urls.length; k += 1) {
            if (!done[k]) return;
            if (urls[k]) { settled = true; return resolve({ url: urls[k], cut: true }); }
          }
          settled = true;
          resolve(d.imgs[0] ? { url: d.imgs[0], cut: false } : null);
        };
        if (!d.imgs.length) return resolve(null);
        d.imgs.forEach(function (src, k) {
          cutout(src).then(function (url) {
            if (settled && url) URL.revokeObjectURL(url);
            else { urls[k] = url; done[k] = true; check(); }
          });
        });
      });
      return d.object;
    };
    // Vidéo 3D transparente du rayon (réglages du thème), comme shop.com : WebM avec transparence (Chrome, Edge, Firefox),
    // HEVC avec transparence pour Safari (qui ne lit pas la transparence des WebM). Sans vidéo lisible : photo détourée.
    var isSafari = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);
    var videoOf = function (d) {
      if (isSafari) return d.hevc ? { src: d.hevc, type: 'video/mp4; codecs="hvc1"' } : null;
      return d.webm ? { src: d.webm, type: 'video/webm' } : null;
    };
    var showPic = function (d) {
      var video = videoOf(d);
      if (video) {
        pic.classList.add('is-out');
        setTimeout(function () {
          if (list[current] !== d) return;
          pic.innerHTML = '<span class="dhp-marq__obj is-video"><video autoplay muted loop playsinline preload="auto" aria-hidden="true"><source src="' + esc(video.src) + '" type="' + esc(video.type) + '"></video></span>';
          var el = pic.querySelector('video');
          // Vidéo illisible (adresse fausse, format) : photo détourée à la place
          el.addEventListener('error', function () { if (list[current] === d) { d.webm = ''; d.hevc = ''; showPic(d); } }, true);
          var play = el.play();
          if (play && play.catch) play.catch(function () {});
          pic.classList.remove('is-out');
        }, first0 ? 0 : 280);
        return;
      }
      pic.classList.add('is-out');
      Promise.all([objectOf(d), new Promise(function (resolve) { setTimeout(resolve, first0 ? 0 : 280); })]).then(function (out) {
        if (list[current] !== d) return;
        var obj = out[0];
        pic.innerHTML = obj ? '<span class="dhp-marq__obj' + (obj.cut ? ' is-cut' : ' is-photo') + '"><img src="' + esc(obj.url) + '" alt=""></span>' : '';
        pic.classList.remove('is-out');
      });
    };
    var first0 = true;
    var showDept = function (i, first) {
      var step = i - current;
      current = ((i % list.length) + list.length) % list.length;
      var d = list[current];
      // Glissement : la rangée actuelle se déplace jusqu'au nouveau mot (comme shop.com), puis elle est redessinée
      // autour de lui sans que rien ne bouge à l'écran
      var target = !first && Math.abs(step) <= 2 && row.querySelector('[data-i="' + (Number(row.querySelector('.is-on').getAttribute('data-i')) + step) + '"]');
      clearTimeout(sliding);
      if (target && !still) {
        row.classList.add('is-sliding');
        row.style.transform = 'translateX(' + offsetOf(target) + 'px)';
        sliding = setTimeout(drawRow, 320);
      } else drawRow();
      showPic(d);
      first0 = false;
      if (!first) {
        prods.classList.add('is-swap');
        load(d).then(function () {
          if (list[current] !== d || !d.cards) { prods.classList.remove('is-swap'); return; }
          prods.innerHTML = d.cards;
          prods.scrollLeft = 0;
          decorate(prods);
          prods.dispatchEvent(new Event('scroll'));
          prods.classList.remove('is-swap');
        });
      }
      load(at(current + 1));
      // Objet du rayon suivant préparé pendant que celui-ci est affiché (vidéo : préchargée par le navigateur)
      (window.requestIdleCallback || setTimeout)(function () {
        var next = at(current + 1), nextVideo = videoOf(next);
        if (nextVideo) { if (!next.preload) { next.preload = document.createElement('link'); next.preload.rel = 'preload'; next.preload.as = 'video'; next.preload.href = nextVideo.src; document.head.appendChild(next.preload); } }
        else objectOf(next);
      });
    };
    window.addEventListener('resize', function () { if (!row.classList.contains('is-sliding')) drawRow(); });
    var runMarq = function () {
      clearInterval(marqTimer);
      if (!still) marqTimer = setInterval(function () { if (!document.hidden && !marqHover && onScreen(marq)) showDept(current + 1); }, 5300);
    };
    // Souris sur le mot géant ou sur ses produits : le rayon ne change pas (reprise 5,3 s après la sortie)
    var marqHover = false;
    [marq, prods.closest('.dhp-marq__rail') || prods].forEach(function (zone) {
      zone.addEventListener('mouseenter', function () { marqHover = true; });
      zone.addEventListener('mouseleave', function () { marqHover = false; runMarq(); });
    });
    row.addEventListener('click', function (event) {
      var word = event.target.closest('[data-i]');
      if (!word || word.classList.contains('is-on')) return;
      var onIndex = Number(row.querySelector('.is-on').getAttribute('data-i'));
      showDept(current + Number(word.getAttribute('data-i')) - onIndex);
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
          // Marques ajoutées depuis le fournisseur des produits (snippets/brand-vendors-json.liquid) : en premier.
          var vendors = [];
          try { vendors = JSON.parse((brandsBox.querySelector('[data-vendor-brands]') || {}).textContent || '[]'); } catch (error) { vendors = []; }
          // (une marque déjà dans la liste du catalogue n'y reste pas en double : elle passe en tête, vers sa page fournisseur)
          var isVendor = {};
          vendors.forEach(function (v) { isVendor[String(v[0]).toLowerCase()] = true; });
          data.brands = vendors.map(function (v) { return [v[0], v[0], '', '', v]; })
            .concat(data.brands.filter(function (brand) { return !isVendor[String(brand[0]).toLowerCase()]; }));
          brandsGrid.innerHTML = data.brands.map(function (brand, i) {
            if (brand[4]) {
              var row = shown[String(brand[0]).toLowerCase()];
              return '<a class="dhp-brand" href="' + esc(brand[4][1]) + '" data-brand-name="' + esc(normalize(brand[0])) + '" data-brand-photo="' + esc(brand[4][2]) + '" style="background:' + colors[i % colors.length] + ';--i:' + (Math.min(i, 30) * 0.015).toFixed(3) + 's">' +
                (row && row.image ? '<img src="' + esc(row.image) + '" alt="" loading="lazy" width="150" height="150">' : '') +
                '<strong>' + esc(brand[0]) + '</strong></a>';
            }
            var known = shown[String(brand[0]).toLowerCase()];
            var href = known ? known.href : base + 'search?q=' + encodeURIComponent('title:"' + brand[1] + '"') + '&type=product&view=brand';
            var image = known ? known.image : (brand[3] ? (/^https?:/.test(brand[3]) ? brand[3] : data.cdn + brand[3]) + '&width=300' : '');
            return '<a class="dhp-brand" href="' + esc(href) + '" data-brand-name="' + esc(normalize(brand[0])) + '" style="background:' + colors[i % colors.length] + ';--i:' + (Math.min(i, 30) * 0.015).toFixed(3) + 's">' +
              (image ? '<img src="' + esc(image) + '" alt="" loading="lazy" width="150" height="150" onerror="this.remove()">' : '') +
              '<strong>' + esc(brand[0]) + '</strong></a>';
          }).join('');
          brandsBox.querySelector('[data-dhp-brands-count]').textContent = data.brands.length;
          filterBrands();
          // Photo du premier produit (si la rangée ne l'avait pas encore) ; fournisseur sans produit visible : retiré.
          brandsGrid.querySelectorAll('[data-brand-photo]').forEach(function (tile) {
            fetch(tile.getAttribute('data-brand-photo'), { credentials: 'same-origin' })
              .then(function (response) { return response.json(); })
              .then(function (info) {
                if (!info.count) {
                  tile.remove();
                  brandsBox.querySelector('[data-dhp-brands-count]').textContent = brandsGrid.querySelectorAll('.dhp-brand').length;
                  return;
                }
                if (info.img && !tile.querySelector('img')) tile.insertAdjacentHTML('afterbegin', '<img src="' + esc(info.img.replace(/width=\d+/, 'width=300')) + '" alt="" width="150" height="150">');
              })
              .catch(function () {});
          });
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
        setInterval(function () { if (!over && !document.hidden && onScreen(coll)) go(page + 1); }, 3500);
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
          if (document.hidden || !onScreen(chip)) return;
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
        if (document.hidden || busy || Date.now() - lastAction < 4400 || !onScreen(grid)) return;
        if (grid.matches(':hover') || edArrows.matches(':hover') || edDotsBox.matches(':hover')) return;
        lastAction = Date.now();
        showPage(edPage + 1);
      }, 500);
    }
  }

  // ---------- Nuovi arrivi (style shop.com) : cartes remplies à l'approche (dernier arrivé du rayon en grande photo,
  // nombre d'arrivées sur 30 jours, 3 miniatures en éventail), rangée doublée qui défile en continu (12 px/s comme
  // shop.com, pause au survol), objet détouré des derniers arrivés qui change dans le titre ----------
  var novita = root.querySelector('[data-dhp-new]');
  if (novita && once(novita)) {
    var newTrack = novita.querySelector('[data-dhp-new-track]');
    var newObj = novita.querySelector('[data-dhp-new-obj]');
    var tr = function (key) { return novita.getAttribute('data-i18n-' + key) || ''; };
    var subText = function (data) {
      if (data.more) return tr('many').replace('__N__', data.count);
      if (data.count === 1) return tr('one');
      if (data.count > 1) return tr('count').replace('__N__', data.count);
      return tr('latest');
    };
    var objSources = [];
    var fillCard = function (card) {
      return fetch(card.getAttribute('data-src'), { credentials: 'same-origin' })
        .then(function (response) { return response.ok ? response.json() : null; })
        .then(function (data) {
          card.classList.remove('is-loading');
          if (!data || !data.items || !data.items.length) { card.remove(); return; }
          // Photos ramenées au domaine de la boutique (/cdn/shop/…) : sinon le détourage est refusé par le navigateur
          var local = function (src) { return String(src || '').replace(/^(https?:)?\/\/[^/]+(?=\/cdn\/)/, ''); };
          data.items.forEach(function (item) { item.b = local(item.b); item.s = local(item.s); item.c = local(item.c); });
          var first = data.items[0];
          card.insertAdjacentHTML('afterbegin', '<img class="dhp-new__bg" src="' + esc(first.b) + '" alt="" loading="lazy" width="352" height="446">');
          card.setAttribute('aria-label', card.querySelector('.dhp-new__txt b').textContent + ' – ' + first.t);
          card.querySelector('[data-dhp-new-sub]').textContent = subText(data);
          card.querySelector('[data-dhp-new-thumbs]').innerHTML = data.items.slice(1, 4).map(function (item) {
            return '<span><img src="' + esc(item.s) + '" alt="" loading="lazy" width="45" height="45"></span>';
          }).join('');
          // Pour le tri des cartes (keepRecent) : date du produit le plus récent, heure du serveur, premier produit
          card.dhpNew = { d: Number(first.d) || 0, now: Number(data.now) || 0, first: first.u, items: data.items };
        })
        .catch(function () { card.classList.remove('is-loading'); });
    };
    // Cartes en plus : les collections publiées le plus récemment (marques importées, templates/collection.dhp-new-all.liquid),
    // à côté des rayons déjà dans la page. Titre « Novità in … » avec le nom court de la collection (avant « | » ou « : »).
    var addRecentCollections = function () {
      var url = novita.getAttribute('data-dhp-new-all');
      if (!url) return Promise.resolve();
      return fetch(url, { credentials: 'same-origin' })
        .then(function (response) { return response.ok ? response.json() : null; })
        .then(function (data) {
          var known = {};
          newTrack.querySelectorAll('[data-k]').forEach(function (card) { known[card.getAttribute('data-k')] = true; });
          ((data && data.c) || []).forEach(function (c) {
            if (!c || !c.k || !c.l || known[c.k]) return;
            known[c.k] = true;
            var name = String(c.n || '').split(/\s+[|–—]\s+|:\s/)[0].trim() || String(c.n || '');
            var card = document.createElement('a');
            card.className = 'dhp-new__card is-loading';
            card.href = c.l + '?view=novita&sort_by=created-descending';
            card.setAttribute('data-src', c.l + '?view=dhp-new&sort_by=created-descending');
            card.setAttribute('data-k', c.k);
            card.innerHTML = '<span class="dhp-new__txt"><b>' + esc(tr('title').replace('__D__', name)) + '</b><small data-dhp-new-sub>' +
              esc(tr('latest')) + '</small></span><span class="dhp-new__thumbs" data-dhp-new-thumbs aria-hidden="true"></span>';
            newTrack.appendChild(card);
          });
        })
        .catch(function () {});
    };
    // Cartes gardées : celles qui ont reçu des produits ces 45 derniers jours, la plus récente d'abord, 10 au plus, sans deux
    // cartes avec le même premier produit (un produit peut être dans un rayon et dans la collection de sa marque). Au moins
    // 4 cartes restent même sans nouveauté récente.
    var keepRecent = function () {
      var MAX_AGE = 45 * 86400;
      var cards = [].slice.call(newTrack.children);
      cards.filter(function (card) { return !card.dhpNew; }).forEach(function (card) { card.remove(); });
      var filled = cards.filter(function (card) { return card.dhpNew; });
      filled.sort(function (a, b) { return b.dhpNew.d - a.dhpNew.d; });
      var used = {};
      var kept = [];
      filled.forEach(function (card) {
        var info = card.dhpNew;
        var old = info.now && info.d && info.now - info.d > MAX_AGE;
        if (kept.length >= 10 || used[info.first] || (old && kept.length >= 4)) { card.remove(); return; }
        used[info.first] = true;
        kept.push(card);
      });
      kept.forEach(function (card) {
        newTrack.appendChild(card);
        card.dhpNew.items.forEach(function (item) { if (item.c) objSources.push(item.c); });
      });
    };
    // Défilement continu : la rangée est doublée (copie cachée aux lecteurs d'écran), durée selon sa largeur
    var startDrift = function () {
      var cards = [].slice.call(newTrack.children);
      if (!cards.length) { novita.hidden = true; return; }
      cards.forEach(function (card) {
        var copy = card.cloneNode(true);
        copy.setAttribute('aria-hidden', 'true');
        copy.setAttribute('tabindex', '-1');
        newTrack.appendChild(copy);
      });
      // Défilement continu à 12 px/s (comme shop.com) par le moteur d'animation du navigateur (Web Animations, sur la
      // carte graphique) : aucune modification de style pendant le mouvement. Important sur l'accueil : chaque changement de
      // style y recalcule toute la page (~55 ms, nombreuses règles :has()) ; un défilement image par image en JS la faisait
      // tomber à 7–15 images/s (impression de gel au clic des flèches). Rangée doublée : le mouvement boucle sur une moitié.
      // Pause au survol de la rangée et des flèches ; flèches : une carte de plus ou de moins en 0,45 s, puis reprise.
      var half = newTrack.scrollWidth / 2 + 5;
      var SPEED = 0.012; // px par ms
      var at = function (px) { return { transform: 'translate3d(' + (-px).toFixed(1) + 'px, 0, 0)' }; };
      var drift = newTrack.animate([at(0), at(half)], { duration: half / SPEED, iterations: Infinity, easing: 'linear' });
      var jumpAnim = null;
      var hovering = false;
      var holdDrift = function () { if (still || hovering || jumpAnim) drift.pause(); else drift.play(); };
      holdDrift();
      var rail = novita.querySelector('.dhp-new__rail') || newTrack.parentElement;
      rail.addEventListener('mouseenter', function () { hovering = true; holdDrift(); });
      rail.addEventListener('mouseleave', function () { hovering = false; holdDrift(); });
      rail.addEventListener('focusin', function () { hovering = true; holdDrift(); });
      rail.addEventListener('focusout', function () { hovering = false; holdDrift(); });
      // Décalage actuel de la rangée (0 … half), d'après l'animation en cours
      var currentOffset = function () {
        if (jumpAnim) return jumpAnim.to;
        return (((Number(drift.currentTime) || 0) * SPEED) % half + half) % half;
      };
      var cardStep = function () {
        var card = newTrack.children[0];
        return card ? card.getBoundingClientRect().width + 10 : 362;
      };
      novita.querySelectorAll('[data-dhp-new-step]').forEach(function (button) {
        button.addEventListener('click', function () {
          var unit = cardStep();
          var dir = Number(button.getAttribute('data-dhp-new-step'));
          var from = currentOffset();
          // Carte suivante (ou précédente) calée sur le bord gauche de la rangée
          var to = dir > 0 ? (Math.floor(from / unit + 1e-3) + 1) * unit : (Math.ceil(from / unit - 1e-3) - 1) * unit;
          // Toujours un vrai pas : si la carte à caler était déjà presque en place, on va à la suivante
          if (Math.abs(to - from) < unit * 0.5) to += dir * unit;
          // Avant le début : même position dans la 2e moitié (identique), pour ne jamais montrer de vide à gauche
          if (to < 0) { from += half; to += half; }
          if (jumpAnim) jumpAnim.anim.cancel();
          drift.pause();
          var anim = newTrack.animate([at(from), at(to)], { duration: 450, easing: 'cubic-bezier(.65, 0, .35, 1)', fill: 'forwards' });
          jumpAnim = { anim: anim, to: to };
          anim.onfinish = function () {
            if (!jumpAnim || jumpAnim.anim !== anim) return;
            drift.currentTime = ((to % half) + half) % half / SPEED;
            jumpAnim = null;
            anim.cancel();
            holdDrift();
          };
        });
      });
    };
    // ---------- Titre animé comme shop.com (relevé sur le site) : chaque mot est séparé ; l'objet (un dernier arrivé
    // détouré) se glisse dans un espace entre deux mots, les mots qui suivent s'écartent pour lui faire de la place, il
    // grandit ; ~7 s plus tard il rétrécit, les mots se resserrent, et il réapparaît ailleurs dans le titre avec un autre
    // produit. Lignes du titre : séparées par <br> dans la traduction. ----------
    var heading = novita.querySelector('.dhp-new__hd');
    var lines = [];
    (function splitTitle() {
      var parts = heading.innerHTML.replace(newObj.outerHTML, '').split(/<br\s*\/?>/i);
      var holder = document.createElement('div');
      heading.textContent = '';
      parts.forEach(function (part) {
        holder.innerHTML = part;
        var words = holder.textContent.trim().split(/\s+/).filter(Boolean);
        if (!words.length) return;
        var line = document.createElement('span');
        line.className = 'dhp-new__line';
        words.forEach(function (word) {
          var span = document.createElement('span');
          span.className = 'dhp-new__w';
          span.textContent = word;
          line.appendChild(span);
          line.appendChild(document.createTextNode(' '));
        });
        heading.appendChild(line);
        lines.push([].slice.call(line.querySelectorAll('.dhp-new__w')));
      });
      heading.appendChild(newObj);
    })();
    // Espaces possibles : avant chaque mot (sauf le 1er de la ligne) et en fin de ligne
    var gaps = [];
    lines.forEach(function (words, li) { for (var k = 1; k <= words.length; k += 1) gaps.push({ line: li, at: k }); });
    var gapAt = -1;
    var closeGap = function () { lines.forEach(function (words) { words.forEach(function (w) { w.style.transform = ''; }); }); };
    var openGap = function (gap) {
      var size = newObj.offsetWidth;
      var room = size * 0.82;
      var words = lines[gap.line];
      var box = heading.getBoundingClientRect();
      var space = parseFloat(getComputedStyle(heading).fontSize) * 0.26;
      // Toutes les mesures avant les écritures : sinon le navigateur recalcule la page entière entre les deux
      var lineBox = words[0].getBoundingClientRect();
      var y = lineBox.top - box.top + lineBox.height / 2;
      var x;
      if (gap.at < words.length) {
        x = words[gap.at].getBoundingClientRect().left - box.left - space / 2 + room / 2;
        words.slice(gap.at).forEach(function (w) { w.style.transform = 'translateX(' + Math.round(room) + 'px)'; });
      } else {
        var last = words[words.length - 1].getBoundingClientRect();
        x = last.right - box.left + space / 2 + room / 2;
      }
      newObj.style.transform = 'translate(' + Math.round(x - size / 2) + 'px, ' + Math.round(y - size / 2) + 'px)';
    };
    var objs = [];
    var objAt = 0;
    var showObj = function () {
      if (!objs.length) return;
      var url = objs[objAt % objs.length];
      objAt += 1;
      var wasIn = newObj.classList.contains('is-in');
      newObj.classList.remove('is-in');
      if (wasIn) closeGap();
      setTimeout(function () {
        // Autre espace que le précédent, au hasard
        var next = gapAt;
        if (gaps.length > 1) while (next === gapAt) next = Math.floor(Math.random() * gaps.length);
        else next = 0;
        gapAt = next;
        openGap(gaps[gapAt]);
        newObj.innerHTML = '<img src="' + esc(url) + '" alt="">';
        setTimeout(function () { newObj.classList.add('is-in'); }, 260);
      }, wasIn ? 420 : 0);
    };
    window.addEventListener('resize', function () { if (gapAt > -1 && newObj.classList.contains('is-in')) { closeGap(); openGap(gaps[gapAt]); } });
    var prepareObjects = function () {
      var tries = objSources.slice(0, 12);
      var next = function () {
        if (!tries.length || objs.length >= 4) return;
        cutout(tries.shift()).then(function (url) {
          if (url) { objs.push(url); if (objs.length === 1) showObj(); }
          next();
        });
      };
      next();
      if (!still) setInterval(function () { if (!document.hidden && objs.length && onScreen(heading)) showObj(); }, 7000);
    };
    var started = false;
    var start = function () {
      if (started) return;
      started = true;
      addRecentCollections()
        .then(function () { return Promise.all([].slice.call(newTrack.children).map(fillCard)); })
        .then(function () { keepRecent(); startDrift(); prepareObjects(); });
    };
    if ('IntersectionObserver' in window) {
      var newSeen = new IntersectionObserver(function (entries) {
        if (entries.some(function (entry) { return entry.isIntersecting; })) { newSeen.disconnect(); start(); }
      }, { rootMargin: '600px 0px' });
      newSeen.observe(novita);
    } else start();
  }
  };

  // Chargement : la suite est rendue par Shopify dans une 2e requête (sans en-tête ni pied de page), insérée ici, puis
  // ses rangées, animations et cartes sont lancées comme avant
  // 3 morceaux demandés en même temps par le petit script de la section (window.dhpMore, dès l'arrivée de la page) :
  // chacun est inséré dès qu'il arrive, puis ses rangées, animations et cartes sont lancées
  // « Shop per brand » : marques ajoutées toutes seules depuis le fournisseur des produits (snippets/brand-list.liquid,
  // tuiles [data-brand-photo]) : photo de leur premier produit (JSON de templates/collection.brand-count.liquid),
  // demandée quand la bande approche ; fournisseur sans produit visible : tuile retirée.
  var brandPhotos = function (scope) {
    var tiles = scope.querySelectorAll('[data-brand-photo]');
    if (!tiles.length) return;
    var rail = tiles[0].parentNode;
    var load = function () {
      tiles.forEach(function (tile) {
        fetch(tile.getAttribute('data-brand-photo'), { credentials: 'same-origin' })
          .then(function (response) { return response.json(); })
          .then(function (data) {
            if (!data.count) { tile.remove(); return; }
            if (!data.img) return;
            var img = document.createElement('img');
            img.src = data.img.replace(/width=\d+/, 'width=300');
            img.alt = '';
            img.width = 150;
            img.height = 150;
            img.decoding = 'async';
            tile.insertBefore(img, tile.firstChild);
          })
          .catch(function () {});
      });
    };
    if (!('IntersectionObserver' in window)) { load(); return; }
    var io = new IntersectionObserver(function (entries) {
      if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
      io.disconnect();
      load();
    }, { rootMargin: '900px 0px' });
    io.observe(rail);
  };
  brandPhotos(root);
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
        brandPhotos(box);
      })
      .catch(function (error) {
        box.removeAttribute('aria-busy');
        console.error(error);
      });
  });
  };
  var readData = function (html) {
    var found = /<script[^>]*data-dhp-data[^>]*>([\s\S]*?)<\/script>/.exec(html);
    var list = JSON.parse(found[1]);
    if (Array.isArray(list)) depts = list;
  };
  ((window.dhpMore && window.dhpMore.b) || Promise.reject(new Error('dhp-more-b absent')))
    .then(readData)
    .catch(function (error) { depts = []; console.error(error); })
    .then(boot);
})();
