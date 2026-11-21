/* Popup « 3 regali gratis » (prototype) — réglages dans snippets/free-gift-popup.liquid.
   - Ouverture après 15 s cumulées sur le site (sessionStorage fg_t0) ; une fois fermée, elle reste rangée en bulle sur
     le côté (localStorage fg_state.docked) et ne se rouvre plus seule.
   - Au plus 3 choix : les autres cartes se désactivent. L'ajout au panier n'est permis qu'à partir de 50 € de produits
     (lignes regalo exclues). Regali ajoutés avec la propriété cachée _gift ; si le panier redescend sous 50 €, ils
     sont retirés (sécurité côté vitrine seulement : prototype). */
(function () {
  'use strict';
  var cfgEl = document.getElementById('free-gift-config');
  if (!cfgEl || window.__freeGift) return;
  window.__freeGift = true;
  var cfg;
  try { cfg = JSON.parse(cfgEl.textContent); } catch (e) { return; }
  var T = cfg.t;
  var KEY = 'fg_state';

  var store = {
    get: function () { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } },
    set: function (patch) {
      var s = store.get();
      for (var k in patch) s[k] = patch[k];
      try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
      return s;
    }
  };
  var state = store.get();
  var picks = Array.isArray(state.picks) ? state.picks.slice(0, cfg.max) : [];
  var products = null;   // [{id, title, img, price, compare, handle}]
  var cart = { subtotal: 0, gifts: 0 };
  var busy = false;

  var money = function (cents) {
    try { return new Intl.NumberFormat(cfg.locale, { style: 'currency', currency: cfg.currency }).format(cents / 100); }
    catch (e) { return (cents / 100).toFixed(2) + ' €'; }
  };
  var esc = function (s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; };
  var ICON_X = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>';
  var ICON_OK = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3L13 4.5"/></svg>';
  var ICON_LOCK = '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2h.5A1.5 1.5 0 0 1 13.5 8.5v5A1.5 1.5 0 0 1 12 15H4a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 4 7h.5zm1.6 0h3.8V5a1.9 1.9 0 0 0-3.8 0v2z"/></svg>';

  /* ---------- Construction ---------- */
  var root = document.createElement('div');
  root.className = 'fg-root';
  root.innerHTML =
    '<div class="fg-modal" role="dialog" aria-modal="true" aria-labelledby="fg-title">' +
      '<div class="fg-modal__shade" data-fg-close></div>' +
      '<div class="fg-box">' +
        '<div class="fg-head">' +
          '<h2 class="fg-head__title" id="fg-title"><span class="fg-head__ico" aria-hidden="true">🎁</span>' + esc(T.title) + '</h2>' +
          '<p class="fg-head__sub">' + esc(T.sub) + '</p>' +
          '<button type="button" class="fg-x" data-fg-close aria-label="' + esc(T.close) + '">' + ICON_X + '</button>' +
        '</div>' +
        '<div class="fg-goal"><p class="fg-goal__txt"></p><div class="fg-goal__bar"><div class="fg-goal__fill"></div></div></div>' +
        '<div class="fg-list"></div>' +
        '<div class="fg-foot">' +
          '<div class="fg-count"><span class="fg-dots"></span><span class="fg-count__n"></span></div>' +
          '<button type="button" class="fg-cta"></button>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<button type="button" class="fg-bubble" aria-label="' + esc(T.title) + '">' +
      '<span class="fg-bubble__ring"><span class="fg-bubble__in"><span class="fg-bubble__gift" aria-hidden="true">🎁</span></span><span class="fg-bubble__badge"></span></span>' +
      '<span class="fg-bubble__label">' + esc(T.bubble) + '</span>' +
    '</button>' +
    '<div class="fg-toast" role="status" aria-live="polite"></div>';
  document.body.appendChild(root);

  var modal = root.querySelector('.fg-modal');
  var box = root.querySelector('.fg-box');
  var list = root.querySelector('.fg-list');
  var goal = root.querySelector('.fg-goal');
  var goalTxt = root.querySelector('.fg-goal__txt');
  var goalFill = root.querySelector('.fg-goal__fill');
  var dots = root.querySelector('.fg-dots');
  var countN = root.querySelector('.fg-count__n');
  var cta = root.querySelector('.fg-cta');
  var bubble = root.querySelector('.fg-bubble');
  var bubbleIn = root.querySelector('.fg-bubble__in');
  var badge = root.querySelector('.fg-bubble__badge');
  var toast = root.querySelector('.fg-toast');

  var toastTimer;
  var say = function (text) {
    toast.textContent = text;
    toast.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-shown'); }, 2600);
  };

  /* ---------- Données ---------- */
  var loadProducts = function () {
    if (products) return Promise.resolve(products);
    return fetch(cfg.url, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        products = (data.products || []).map(function (p) {
          var v = (p.variants || []).filter(function (x) { return x.available; })[0] || (p.variants || [])[0];
          var img = (p.images && p.images[0] && p.images[0].src) || '';
          if (img) img = img.replace(/(\.[a-z]+)(\?|$)/i, '_360x$1$2');
          return v ? {
            id: v.id, title: p.title, img: img, handle: p.handle, available: !!v.available,
            price: Math.round(parseFloat(v.price) * 100), compare: Math.round(parseFloat(v.compare_at_price || v.price) * 100)
          } : null;
        }).filter(function (p) { return p && p.available; });
        picks = picks.filter(function (id) { return products.some(function (p) { return p.id === id; }); });
        return products;
      });
  };

  var readCart = function () {
    return fetch(cfg.root + 'cart.js', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (c) {
        var gifts = (c.items || []).filter(function (i) { return i.properties && i.properties._gift; });
        var giftTotal = gifts.reduce(function (s, i) { return s + i.final_line_price; }, 0);
        cart = { subtotal: (c.items_subtotal_price || c.total_price || 0) - giftTotal, gifts: gifts, count: gifts.reduce(function (s, i) { return s + i.quantity; }, 0) };
        return cart;
      });
  };

  /* Regali sans les 50 € : retirés du panier. */
  var enforce = function () {
    if (busy || !cart.gifts || !cart.gifts.length || cart.subtotal >= cfg.threshold) return Promise.resolve();
    var updates = {};
    cart.gifts.forEach(function (i) { updates[i.key] = 0; });
    busy = true;
    return fetch(cfg.root + 'cart/update.js', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ updates: updates })
    }).then(function () {
      busy = false;
      store.set({ added: false });
      refreshTheme();
      return readCart();
    }).catch(function () { busy = false; });
  };

  var refreshTheme = function () {
    document.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
    if (window.ajaxCart && typeof window.ajaxCart.refresh === 'function') window.ajaxCart.refresh();
    fetch(cfg.root + 'cart.js', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (c) {
      document.querySelectorAll('#cart-count, #cart-count--m, .mobile-home-cart-count, [data-mobile-mini-cart-count]').forEach(function (el) {
        el.textContent = String(c.item_count);
        if (el.id !== 'cart-count') el.hidden = c.item_count <= 0;
      });
    }).catch(function () {});
  };

  /* ---------- Rendu ---------- */
  var unlocked = function () { return cart.subtotal >= cfg.threshold; };
  var addedState = function () { return cart.count > 0; };

  var renderGoal = function () {
    var p = Math.max(0, Math.min(1, cart.subtotal / cfg.threshold));
    goalFill.style.setProperty('--fg-p', p.toFixed(3));
    goal.classList.toggle('is-ok', unlocked());
    goalTxt.innerHTML = unlocked() ? ICON_OK.replace('<svg', '<svg width="16" height="16"') + esc(T.unlocked)
      : esc(T.missing).replace('%s', '<b>' + esc(money(cfg.threshold - cart.subtotal)) + '</b>');
  };

  var renderList = function () {
    if (!products) {
      list.innerHTML = new Array(9).join('<div class="fg-sk"></div>');
      return;
    }
    var full = picks.length >= cfg.max;
    list.innerHTML = products.map(function (p) {
      var on = picks.indexOf(p.id) !== -1;
      var off = full && !on;
      return '<button type="button" class="fg-card' + (on ? ' is-on' : '') + '" data-id="' + p.id + '" aria-pressed="' + on + '"' + (off ? ' disabled' : '') + '>' +
        '<span class="fg-card__img">' + (p.img ? '<img src="' + esc(p.img) + '" alt="" loading="lazy" width="180" height="180">' : '') +
          '<span class="fg-card__free">' + esc(T.free) + '</span>' +
          '<span class="fg-card__check" aria-hidden="true">' + ICON_OK + '</span></span>' +
        '<span class="fg-card__body"><span class="fg-card__title">' + esc(p.title) + '</span>' +
          '<span class="fg-card__price">' + esc(money(0)) + (Math.max(p.price, p.compare) > 0 ? ' <s>' + esc(money(Math.max(p.price, p.compare))) + '</s>' : '') + '</span></span>' +
      '</button>';
    }).join('');
  };

  var renderFoot = function () {
    var d = '';
    for (var i = 0; i < cfg.max; i++) d += '<i' + (i < picks.length ? ' class="is-on"' : '') + '></i>';
    dots.innerHTML = d;
    countN.textContent = picks.length + '/' + cfg.max + ' ' + T.picked;
    cta.classList.remove('is-done');
    if (addedState()) {
      cta.disabled = true;
      cta.classList.add('is-done');
      cta.innerHTML = esc(T.added);
    } else if (!unlocked()) {
      cta.disabled = true;
      cta.innerHTML = ICON_LOCK + esc(T.locked);
    } else if (!picks.length) {
      cta.disabled = true;
      cta.innerHTML = esc(T.choose);
    } else {
      cta.disabled = false;
      cta.innerHTML = esc(T.add) + ' (' + picks.length + ')';
    }
  };

  var bubbleTimer;
  var renderBubble = function () {
    var n = addedState() ? cart.count : picks.length;
    badge.textContent = addedState() ? '✓' : n + '/' + cfg.max;
    badge.classList.toggle('is-ok', addedState() || unlocked());
    // Photos des produits choisis (ou des premiers produits) qui défilent dans la bulle, comme une story
    if (!products) return;
    var pool = (picks.length ? products.filter(function (p) { return picks.indexOf(p.id) !== -1; }) : products.slice(0, 4))
      .filter(function (p) { return p.img; });
    bubbleIn.querySelectorAll('img').forEach(function (img) { img.remove(); });
    if (!pool.length) return;
    pool.forEach(function (p, i) {
      var img = document.createElement('img');
      img.src = p.img; img.alt = ''; img.width = 72; img.height = 72;
      if (i === 0) img.className = 'is-on';
      bubbleIn.appendChild(img);
    });
    clearInterval(bubbleTimer);
    if (pool.length > 1) {
      var at = 0;
      bubbleTimer = setInterval(function () {
        if (document.hidden || !bubble.classList.contains('is-shown')) return;
        var imgs = bubbleIn.querySelectorAll('img');
        if (!imgs.length) return;
        imgs[at % imgs.length].classList.remove('is-on');
        at++;
        imgs[at % imgs.length].classList.add('is-on');
      }, 2600);
    }
  };

  var render = function () { renderGoal(); renderList(); renderFoot(); renderBubble(); };

  /* ---------- Ouvrir / ranger ---------- */
  var lastFocus;
  var open = function () {
    lastFocus = document.activeElement;
    box.style.setProperty('--fg-origin', bubble.classList.contains('is-shown') ? 'right center' : '50% 50%');
    bubble.classList.remove('is-shown');
    modal.classList.remove('is-closing');
    renderList(); renderFoot(); renderGoal();
    modal.classList.add('is-open');
    document.documentElement.style.overflow = 'hidden';
    setTimeout(function () { var x = root.querySelector('.fg-x'); if (x) x.focus({ preventScroll: true }); }, 50);
    Promise.all([loadProducts(), readCart()]).then(function () { return enforce(); }).then(render).catch(function () { render(); });
  };

  var dock = function () {
    if (!modal.classList.contains('is-open')) return;
    store.set({ docked: true, picks: picks });
    box.style.setProperty('--fg-origin', 'right center');
    modal.classList.add('is-closing');
    document.documentElement.style.overflow = '';
    setTimeout(function () {
      modal.classList.remove('is-open', 'is-closing');
      showBubble();
      if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (e) {}
    }, 320);
  };

  var showBubble = function () {
    renderBubble();
    bubble.classList.add('is-shown');
    bubble.classList.toggle('is-seen', addedState());
  };

  /* ---------- Actions ---------- */
  root.addEventListener('click', function (e) {
    if (e.target.closest('[data-fg-close]')) { dock(); return; }
    if (e.target.closest('.fg-bubble')) { open(); return; }
    var card = e.target.closest('.fg-card');
    if (card && !card.disabled) {
      var id = Number(card.getAttribute('data-id'));
      var at = picks.indexOf(id);
      if (at === -1) { if (picks.length < cfg.max) picks.push(id); } else picks.splice(at, 1);
      store.set({ picks: picks });
      renderList(); renderFoot();
      return;
    }
    if (e.target.closest('.fg-cta') && !cta.disabled) addGifts();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') dock(); });

  var addGifts = function () {
    if (busy || !unlocked() || !picks.length) return;
    busy = true;
    cta.disabled = true;
    cta.style.opacity = '.6';
    fetch(cfg.root + 'cart/add.js', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: picks.map(function (id) { return { id: id, quantity: 1, properties: { _gift: '1' } }; }) })
    }).then(function (r) {
      if (!r.ok) throw new Error('add');
      return r.json();
    }).then(function () {
      busy = false;
      cta.style.opacity = '';
      store.set({ added: true, picks: picks });
      say(T.added);
      refreshTheme();
      return readCart().then(render);
    }).catch(function () {
      busy = false;
      cta.style.opacity = '';
      say(T.error);
      renderFoot();
    });
  };

  /* Panier modifié ailleurs sur la page (ajout, suppression) : relire le total, retirer les regali sous 50 €. */
  var cartTimer;
  var onCartChange = function () {
    clearTimeout(cartTimer);
    cartTimer = setTimeout(function () {
      readCart().then(enforce).then(function () {
        renderGoal(); renderFoot(); renderBubble();
        bubble.classList.toggle('is-seen', addedState());
      }).catch(function () {});
    }, 400);
  };
  document.addEventListener('cart:refresh', function () { if (!busy) onCartChange(); });
  if (window.fetch) {
    var nativeFetch = window.fetch;
    window.fetch = function (input) {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      var p = nativeFetch.apply(this, arguments);
      if (!busy && /\/cart\/(add|change|update|clear)/.test(url)) p.then(onCartChange, function () {});
      return p;
    };
  }

  /* ---------- Démarrage ---------- */
  if (state.docked) {
    // Déjà vue et fermée : directement la bulle ; données chargées sans bloquer la page.
    var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 1200); };
    idle(function () {
      Promise.all([loadProducts(), readCart()]).then(enforce).then(function () { showBubble(); renderGoal(); renderFoot(); }).catch(function () { showBubble(); });
    });
    return;
  }
  var t0;
  try {
    t0 = Number(sessionStorage.getItem('fg_t0'));
    if (!t0) { t0 = Date.now(); sessionStorage.setItem('fg_t0', String(t0)); }
  } catch (e) { t0 = Date.now(); }
  var wait = Math.max(0, cfg.delay - (Date.now() - t0));
  // Produits préparés 3 s avant l'ouverture pour que la fenêtre arrive déjà remplie
  setTimeout(function () { loadProducts().catch(function () {}); readCart().catch(function () {}); }, Math.max(0, wait - 3000));
  setTimeout(function () {
    if (document.querySelector('.fg-modal.is-open')) return;
    open();
  }, wait);
})();
