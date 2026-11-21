/* Popup « 3 regali gratis » — réglages et textes dans snippets/free-gift-popup.liquid, styles dans assets/free-gift.css.
   - Ouverture automatique en entier 7 s après l'arrivée sur chaque page. Une fois fermée, elle vole jusqu'à une bulle
     story sur le côté pour le reste de la page. La bulle se déplace au doigt le long
     du bord et se colle au côté le plus proche (position retenue).
   - Plateau de 3 places en haut (un clic retire le produit), barre vers 50 €, filtres par type de produit.
   - Au plus 3 choix : les autres cartes se grisent, la carte touchée en trop tremble. L'ajout au panier n'est permis
     qu'à partir de 50 € de produits (lignes regalo exclues). Regali ajoutés avec la propriété cachée _gift ; si le
     panier redescend sous 50 €, ils sont retirés (sécurité côté vitrine seulement). */
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
  var lastCartGifts = Array.isArray(state.cartGifts) ? state.cartGifts : [];
  var side = state.side === 'left' ? 'left' : 'right';
  var yRatio = typeof state.y === 'number' ? state.y : null;
  var yPhone = typeof state.yPhone === 'number' ? state.yPhone : null;   // téléphone : position à part (en bas par défaut)
  var products = null;   // [{id, title, img, value, type}]
  var cart = { subtotal: 0, gifts: [], count: 0 };
  var filter = '';
  var busy = false;

  var money = function (cents) {
    try { return new Intl.NumberFormat(cfg.locale, { style: 'currency', currency: cfg.currency }).format(cents / 100); }
    catch (e) { return (cents / 100).toFixed(2) + ' €'; }
  };
  // Seuil affiché dans la monnaie du client (comme « Spedizione gratuita da 50 » du thème) : %t dans les textes
  var tMoney = money(cfg.threshold).replace(/[,.]00(?=\D|$)/, '');
  Object.keys(T).forEach(function (k) { if (typeof T[k] === 'string') T[k] = T[k].split('%t').join(tMoney); });
  var esc = function (s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; };
  var I_X = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>';
  var I_OK = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3L13 4.5"/></svg>';
  var I_LOCK = '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2h.5a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 12 15H4a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 4 7h.5zm1.6 0h3.8V5a1.9 1.9 0 0 0-3.8 0v2z"/></svg>';
  var I_PLUS = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>';
  var I_GIFT = '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M2 7h12v7H2zM1 4.5h14V7H1zM7 4.5h2V14H7zM8 4.5C6.5 1.5 3.5 1.5 3.8 3.2 4 4.4 6.4 4.5 8 4.5zm0 0c1.5-3 4.5-3 4.2-1.3C12 4.4 9.6 4.5 8 4.5z"/></svg>';
  var BOX = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="10" y="30" width="44" height="28" rx="4" fill="#3a34d2"/><rect x="29" y="30" width="6" height="28" fill="#e4323c"/><g class="fg-lid"><rect x="6" y="20" width="52" height="12" rx="4" fill="#16123f"/><rect x="29" y="20" width="6" height="12" fill="#e4323c"/><path d="M32 20c-4-9-15-11-15-4 0 4 9 4 15 4zm0 0c4-9 15-11 15-4 0 4-9 4-15 4z" fill="none" stroke="#e4323c" stroke-width="3.5" stroke-linejoin="round"/></g></svg>';

  /* ---------- Construction ---------- */
  var root = document.createElement('div');
  root.className = 'fg-root';
  root.innerHTML =
    '<div class="fg-modal" role="dialog" aria-modal="true" aria-labelledby="fg-title">' +
      '<div class="fg-shade" data-fg-close></div>' +
      '<div class="fg-box">' +
        '<div class="fg-head">' +
          '<span class="fg-giftbox">' + BOX + '</span>' +
          '<div><h2 class="fg-title" id="fg-title">' + T.title + '</h2><p class="fg-sub"></p></div>' +
          '<button type="button" class="fg-x" data-fg-close aria-label="' + esc(T.close) + '">' + I_X + '</button>' +
        '</div>' +
        '<div class="fg-tray">' +
          '<div class="fg-slots"></div>' +
          '<div class="fg-goal"><p class="fg-goal__txt"></p>' +
            '<div class="fg-goal__track"><div class="fg-goal__fill"></div><span class="fg-goal__end">' + I_GIFT + '</span></div>' +
            '<div class="fg-goal__scale"><span>' + esc(money(0)).replace(/[,.]00/, '') + '</span><span>' + esc(money(cfg.threshold / 2)).replace(/[,.]00/, '') + '</span><span>' + esc(money(cfg.threshold)).replace(/[,.]00/, '') + '</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="fg-chips" role="group"></div>' +
        '<div class="fg-list"></div>' +
        '<div class="fg-foot">' +
          '<button type="button" class="fg-later" data-fg-close>' + esc(T.later) + '</button>' +
          '<button type="button" class="fg-cta"></button>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<button type="button" class="fg-bubble" aria-label="' + esc(T.bubble) + '">' +
      '<span class="fg-bubble__ring"><span class="fg-bubble__in"></span><span class="fg-bubble__badge"></span></span>' +
      '<span class="fg-bubble__label">' + esc(T.bubble) + '</span>' +
      // Téléphone : petite pile de photos qui dépasse du bord de l'écran (comme les Instants d'Instagram)
      '<span class="fg-peek" aria-hidden="true"><span class="fg-peek__stack"></span><span class="fg-peek__badge"></span></span>' +
      '<span class="fg-bubble__tip">' + esc(T.tip) + '</span>' +
    '</button>' +
    // 2e fenêtre : l'e-mail du client avant l'ajout des regali au panier
    '<div class="fg-mail" role="dialog" aria-modal="true" aria-labelledby="fg-mail-title" hidden>' +
      '<div class="fg-mail__shade" data-fg-mail-close></div>' +
      '<form class="fg-mail__box" novalidate>' +
        '<button type="button" class="fg-x" data-fg-mail-close aria-label="' + esc(T.back) + '">' + I_X + '</button>' +
        '<span class="fg-mail__ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg></span>' +
        '<h2 class="fg-mail__title" id="fg-mail-title">' + esc(T.emailTitle) + '</h2>' +
        '<p class="fg-mail__sub">' + esc(T.emailSub) + '</p>' +
        '<div class="fg-mail__picks"></div>' +
        '<label class="fg-mail__field"><span>' + esc(T.emailLabel) + '</span><input type="email" name="email" id="fg-mail-input" autocomplete="email" inputmode="email" placeholder="' + esc(T.emailPh) + '" required></label>' +
        '<p class="fg-mail__err" role="alert" hidden>' + esc(T.emailErr) + '</p>' +
        '<label class="fg-mail__consent"><input type="checkbox" name="consent" id="fg-mail-consent"><span>' + esc(T.consent) + '</span></label>' +
        '<button type="submit" class="fg-cta is-ready fg-mail__cta">' + esc(T.emailCta) + '</button>' +
        '<p class="fg-mail__note">' + esc(T.emailNote) + (cfg.privacyUrl ? ' <a href="' + esc(cfg.privacyUrl) + '" target="_blank" rel="noopener">' + esc(T.privacy) + '</a>' : '') + '</p>' +
      '</form>' +
    '</div>' +
    '<div class="fg-toast" role="status" aria-live="polite"></div>';
  document.body.appendChild(root);

  var q = function (s) { return root.querySelector(s); };
  var modal = q('.fg-modal'), box = q('.fg-box'), sub = q('.fg-sub'), slots = q('.fg-slots'), chips = q('.fg-chips');
  var list = q('.fg-list'), goal = q('.fg-goal'), goalTxt = q('.fg-goal__txt'), goalFill = q('.fg-goal__fill');
  var cta = q('.fg-cta'), bubble = q('.fg-bubble'), bubbleIn = q('.fg-bubble__in'), badge = q('.fg-bubble__badge');
  var tip = q('.fg-bubble__tip'), toast = q('.fg-toast');
  var peekStack = q('.fg-peek__stack'), peekBadge = q('.fg-peek__badge');
  var mail = q('.fg-mail'), mailForm = q('.fg-mail__box'), mailInput = q('#fg-mail-input'), mailConsent = q('#fg-mail-consent'), mailErr = q('.fg-mail__err'), mailPicks = q('.fg-mail__picks');
  // Téléphone et tablette (jusqu'à 1024 px) : pile façon Instants d'Instagram au lieu de la bulle (même règle que free-gift.css)
  var isPhone = function () { return window.matchMedia('(max-width: 1024px)').matches; };

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
          var v = (p.variants || []).filter(function (x) { return x.available; })[0];
          if (!v) return null;
          var img = (p.images && p.images[0] && p.images[0].src) || '';
          if (img) img = img.replace(/(\.[a-z]+)(\?|$)/i, '_360x$1$2');
          var price = Math.round(parseFloat(v.price) * 100), compare = Math.round(parseFloat(v.compare_at_price || 0) * 100);
          return { id: v.id, title: p.title, img: img, value: Math.max(price, compare), type: String(p.product_type || '').trim() };
        }).filter(Boolean);
        picks = picks.filter(function (id) { return products.some(function (p) { return p.id === id; }); });
        return products;
      });
  };
  var byId = function (id) { return products && products.filter(function (p) { return p.id === id; })[0]; };

  var readCart = function () {
    return fetch(cfg.root + 'cart.js', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (c) {
        var gifts = (c.items || []).filter(function (i) { return i.properties && i.properties._gift; });
        var giftTotal = gifts.reduce(function (s, i) { return s + i.final_line_price; }, 0);
        cart = { subtotal: (c.items_subtotal_price || c.total_price || 0) - giftTotal, gifts: gifts, count: gifts.reduce(function (s, i) { return s + i.quantity; }, 0) };
        // Regali dans le panier (autre onglet, autre appareil) : ce sont eux qui remplissent les 3 places.
        // Un regalo qui était dans le panier et n'y est plus (retiré depuis le tiroir ou la page panier) quitte aussi
        // la popup ; les choix pas encore ajoutés restent. lastCartGifts retient ceux vus dans le panier la dernière fois.
        var giftIds = gifts.map(function (i) { return i.variant_id; }).filter(function (id, at, all) { return all.indexOf(id) === at; });
        var removed = lastCartGifts.filter(function (id) { return giftIds.indexOf(id) === -1; });
        picks = giftIds.concat(picks.filter(function (id) { return giftIds.indexOf(id) === -1 && removed.indexOf(id) === -1; })).slice(0, cfg.max);
        lastCartGifts = giftIds;
        store.set({ picks: picks, cartGifts: giftIds });
        return cart;
      });
  };

  /* Tiroir panier du thème : son script (custom-async.js, window.ajaxCart) se charge en différé ; sans lui le tiroir
     restait vide jusqu'au rechargement. On le charge si besoin (ensureCustomAsyncRuntime, assets/custom.js), puis on
     redessine le tiroir avec la réponse de l'ajout (et on l'ouvre, comme un ajout normal) ou on le relit. Le tiroir
     mobile et la page panier se mettent à jour sur platinum:cart-changed. */
  var sideCartId = function () {
    var el = document.getElementById('cart');
    if (!el) return '';
    var section = el.closest('[id^="shopify-section-"]');
    return el.getAttribute('data-section-id') || (section ? section.id.replace('shopify-section-', '') : '');
  };
  var withAjaxCart = function () {
    if (window.ajaxCart && typeof window.ajaxCart.refresh === 'function') return Promise.resolve(window.ajaxCart);
    if (typeof window.ensureCustomAsyncRuntime === 'function') return window.ensureCustomAsyncRuntime();
    return Promise.reject(new Error('no ajaxCart'));
  };
  var refreshTheme = function (response, openDrawer) {
    document.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
    document.dispatchEvent(new CustomEvent('platinum:cart-changed', { detail: { source: 'free-gift' } }));
    var desktop = window.innerWidth >= 1000 || !document.getElementById('cart-count--m');
    withAjaxCart().then(function (ac) {
      if (response && response.sections && response.sections[sideCartId()] && typeof ac.load === 'function') {
        return ac.load(response, !!openDrawer && desktop);
      }
      return ac.refresh();
    }).catch(function () {});
    fetch(cfg.root + 'cart.js', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (c) {
      document.querySelectorAll('#cart-count, #cart-count--m, .mobile-home-cart-count, [data-mobile-mini-cart-count]').forEach(function (el) {
        el.textContent = String(c.item_count);
        if (el.id !== 'cart-count') el.hidden = c.item_count <= 0;
      });
    }).catch(function () {});
  };

  /* Regali sans les 50 € : retirés du panier. */
  var enforce = function () {
    if (busy || !cart.gifts.length || cart.subtotal >= cfg.threshold) return Promise.resolve();
    var updates = {};
    cart.gifts.forEach(function (i) { updates[i.key] = 0; });
    busy = true;
    return fetch(cfg.root + 'cart/update.js', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ updates: updates })
    }).then(function () {
      busy = false;
      say(T.removed);
      refreshTheme();
      return readCart();
    }).catch(function () { busy = false; });
  };

  /* ---------- Rendu ---------- */
  var unlocked = function () { return cart.subtotal >= cfg.threshold; };
  var added = function () { return cart.count > 0; };
  var inCart = function (id) { return cart.gifts.some(function (i) { return i.variant_id === id; }); };
  var pending = function () { return picks.filter(function (id) { return !inCart(id); }); };
  // Nombre de regali à choisir : 3 (ou moins si la collection en a moins)
  var need = function () { return products ? Math.min(cfg.max, products.length) : cfg.max; };

  /* Regalo retiré dans la popup (× du plateau ou carte décochée) alors qu'il est déjà dans le panier : retiré du panier
     aussi, la place se libère et le client peut en choisir un autre. */
  var removeGift = function (id) {
    var line = cart.gifts.filter(function (i) { return i.variant_id === id; })[0];
    picks = picks.filter(function (x) { return x !== id; });
    store.set({ picks: picks });
    if (!line || busy) { render(); return; }
    busy = true;
    render();
    fetch(cfg.root + 'cart/change.js', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id: line.key, quantity: 0, sections: sideCartId() ? [sideCartId()] : undefined, sections_url: window.location.pathname })
    }).then(function (r) { if (!r.ok) throw new Error('change'); return r.json(); })
      .then(function (response) {
        busy = false;
        refreshTheme(response, false);
        return readCart().then(render);
      })
      .catch(function () { busy = false; say(T.error); readCart().then(render); });
  };

  var renderSub = function () {
    var text = esc(T.sub);
    if (products && products.length) {
      var top = products.map(function (p) { return p.value; }).sort(function (a, b) { return b - a; }).slice(0, cfg.max);
      var total = top.reduce(function (s, v) { return s + v; }, 0);
      if (total > 0) text += ' ' + esc(T.value).replace('%s', esc(money(total)));
    }
    sub.innerHTML = text;
  };

  var renderSlots = function () {
    var h = '';
    for (var i = 0; i < cfg.max; i++) {
      var p = byId(picks[i]);
      h += p
        ? '<button type="button" class="fg-slot is-full" data-fg-un="' + p.id + '" aria-label="' + esc(T.remove + ' ' + p.title) + '">' + (p.img ? '<img src="' + esc(p.img) + '" alt="" width="58" height="58">' : '') + '<span class="fg-slot__x" aria-hidden="true">×</span></button>'
        : '<span class="fg-slot" aria-label="' + esc(T.slot) + '">' + I_PLUS + '</span>';
    }
    slots.innerHTML = h;
  };

  var renderGoal = function () {
    var p = Math.max(0, Math.min(1, cart.subtotal / cfg.threshold));
    goalFill.style.setProperty('--fg-p', p.toFixed(3));
    goal.classList.toggle('is-ok', unlocked());
    goalTxt.innerHTML = unlocked() ? esc(T.unlocked) : T.missing.replace('%s', esc(money(cfg.threshold - cart.subtotal)));
  };

  var renderChips = function () {
    if (!products) { chips.innerHTML = ''; return; }
    var counts = {};
    products.forEach(function (p) { if (p.type) counts[p.type] = (counts[p.type] || 0) + 1; });
    var types = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 6);
    if (types.length < 2) { chips.innerHTML = ''; filter = ''; return; }
    if (filter && types.indexOf(filter) === -1) filter = '';
    chips.innerHTML = [''].concat(types).map(function (t) {
      return '<button type="button" class="fg-chip" data-fg-type="' + esc(t) + '" aria-pressed="' + (filter === t) + '">' + esc(t || T.all) + '</button>';
    }).join('');
  };

  var renderList = function () {
    if (!products) { list.innerHTML = new Array(9).join('<div class="fg-sk"></div>'); return; }
    var full = picks.length >= cfg.max;
    var shown = products.filter(function (p) { return !filter || p.type === filter; });
    list.innerHTML = (full && pending().length ? '<p class="fg-note">' + esc(T.full) + '</p>' : '') + shown.map(function (p) {
      var on = picks.indexOf(p.id) !== -1, off = full && !on;
      return '<button type="button" class="fg-card" data-id="' + p.id + '" aria-pressed="' + on + '" aria-disabled="' + off + '">' +
        '<span class="fg-card__img">' + (p.img ? '<img src="' + esc(p.img) + '" alt="" loading="lazy" width="180" height="180">' : '') +
          '<span class="fg-card__free">' + esc(T.free) + '</span><span class="fg-card__pick" aria-hidden="true">' + I_OK + '</span></span>' +
        '<span class="fg-card__body"><span class="fg-card__name">' + esc(p.title) + '</span>' +
          '<span class="fg-card__price">' + esc(money(0)) + (p.value > 0 ? ' <s>' + esc(money(p.value)) + '</s>' : '') + '</span></span>' +
      '</button>';
    }).join('');
  };

  var renderCta = function () {
    cta.className = 'fg-cta';
    // Activé seulement quand les 3 regali sont choisis ET que le panier atteint 50 €
    var todo = pending().length, missing = need() - picks.length;
    if (!unlocked()) { cta.disabled = true; cta.innerHTML = I_LOCK + esc(T.locked); }
    else if (todo && missing <= 0) { cta.disabled = false; cta.classList.add('is-ready'); cta.innerHTML = esc(T.add) + ' (' + todo + ')'; }
    else if (!todo && added() && missing <= 0) { cta.disabled = true; cta.classList.add('is-done'); cta.innerHTML = esc(T.done); }
    else if (missing > 0 && picks.length) { cta.disabled = true; cta.innerHTML = esc(missing === 1 ? T.need1 : T.need.replace('%n', missing)); }
    else { cta.disabled = true; cta.innerHTML = esc(T.choose); }
  };

  var bubbleTimer;
  var renderBubble = function () {
    bubble.classList.toggle('is-ok', unlocked());
    bubble.classList.toggle('is-done', added());
    badge.textContent = peekBadge.textContent = added() ? '✓' : picks.length + '/' + cfg.max;
    if (!products) return;
    var pool = (picks.length ? picks.map(byId) : products.slice(0, 4)).filter(function (p) { return p && p.img; });
    peekStack.innerHTML = pool.slice(0, 3).reverse().map(function (p) { return '<img src="' + esc(p.img) + '" alt="" width="50" height="64">'; }).join('');
    bubbleIn.innerHTML = pool.map(function (p, i) { return '<img src="' + esc(p.img) + '" alt="" width="74" height="74"' + (i === 0 ? ' class="is-on"' : '') + '>'; }).join('');
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
      }, 2400);
    }
  };

  var render = function () { renderSub(); renderSlots(); renderGoal(); renderChips(); renderList(); renderCta(); renderBubble(); };

  /* ---------- Position de la bulle ---------- */
  var BW = 80;
  var limits = function () {
    var h = window.innerHeight, mobile = isPhone();
    return { min: 80, max: h - (mobile ? 190 : 130) };   // téléphone : au-dessus de la barre du bas
  };
  var placeBubble = function () {
    var w = document.documentElement.clientWidth, h = window.innerHeight, lim = limits();
    var ratio = isPhone() ? (yPhone == null ? 1 : yPhone) : (yRatio == null ? .46 : yRatio);
    var y = Math.max(lim.min, Math.min(lim.max, Math.round(h * ratio)));
    var sd = isPhone() ? 'right' : side;   // téléphone : toujours au bord droit, comme Instagram
    bubble.style.setProperty('--fg-bx', (sd === 'right' ? w - BW - 10 : 10) + 'px');
    bubble.style.setProperty('--fg-by', y + 'px');
    bubble.classList.toggle('is-left', sd === 'left');
    return y;
  };

  /* ---------- Ouvrir / ranger ---------- */
  var lastFocus;
  var open = function () {
    lastFocus = document.activeElement;
    bubble.classList.remove('is-shown');
    tip.classList.remove('is-shown');
    modal.classList.remove('is-docking');
    render();
    modal.classList.add('is-open');
    document.documentElement.style.overflow = 'hidden';
    setTimeout(function () { var x = q('.fg-x'); if (x) x.focus({ preventScroll: true }); }, 60);
    Promise.all([loadProducts(), readCart()]).then(enforce).then(render).catch(render);
  };

  var dock = function () {
    if (!modal.classList.contains('is-open') || modal.classList.contains('is-docking')) return;
    var first = !store.get().docked;
    store.set({ docked: true, picks: picks });
    var y = placeBubble();
    var r = box.getBoundingClientRect();
    var bx = isPhone() ? document.documentElement.clientWidth - 30 : parseFloat(bubble.style.getPropertyValue('--fg-bx')) + BW / 2, by = y + 37;
    box.style.setProperty('--fg-dx', Math.round(bx - (r.left + r.width / 2)) + 'px');
    box.style.setProperty('--fg-dy', Math.round(by - (r.top + r.height / 2)) + 'px');
    modal.classList.add('is-docking');
    document.documentElement.style.overflow = '';
    setTimeout(function () {
      modal.classList.remove('is-open', 'is-docking');
      showBubble();
      if (first) {
        setTimeout(function () { tip.classList.add('is-shown'); }, 450);
        setTimeout(function () { tip.classList.remove('is-shown'); }, 3800);
      }
      if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (e) {}
    }, 440);
  };

  var showBubble = function () {
    placeBubble();
    renderBubble();
    bubble.classList.add('is-shown');
  };

  /* ---------- Actions ---------- */
  modal.addEventListener('click', function (e) {
    if (e.target.closest('[data-fg-close]')) { dock(); return; }
    var un = e.target.closest('[data-fg-un]');
    if (un) {
      var uid = Number(un.getAttribute('data-fg-un'));
      if (inCart(uid)) { removeGift(uid); return; }
      picks = picks.filter(function (id) { return id !== uid; });
      store.set({ picks: picks });
      render();
      return;
    }
    var chip = e.target.closest('.fg-chip');
    if (chip) { filter = chip.getAttribute('data-fg-type'); renderChips(); renderList(); list.scrollTop = 0; return; }
    var card = e.target.closest('.fg-card');
    if (card) {
      var id = Number(card.getAttribute('data-id')), at = picks.indexOf(id);
      if (at !== -1 && inCart(id)) { removeGift(id); return; }
      if (at !== -1) picks.splice(at, 1);
      else if (picks.length < cfg.max) picks.push(id);
      else { card.classList.remove('is-shake'); void card.offsetWidth; card.classList.add('is-shake'); return; }
      store.set({ picks: picks });
      renderSlots(); renderList(); renderCta(); renderBubble();
      return;
    }
    if (e.target.closest('.fg-cta') && !cta.disabled) openMail();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!mail.hidden) { closeMail(); return; }
    dock();
  });

  /* ---------- Fenêtre e-mail ---------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var openMail = function () {
    mailPicks.innerHTML = picks.map(byId).filter(Boolean).map(function (p) { return p.img ? '<img src="' + esc(p.img) + '" alt="" width="54" height="54">' : ''; }).join('');
    mailInput.value = mailInput.value || store.get().email || cfg.email || '';
    mailErr.hidden = true;
    mailInput.removeAttribute('aria-invalid');
    mail.hidden = false;
    requestAnimationFrame(function () { mail.classList.add('is-open'); });
    setTimeout(function () { try { mailInput.focus({ preventScroll: true }); } catch (e) {} }, 120);
  };
  var closeMail = function () {
    mail.classList.remove('is-open');
    setTimeout(function () { mail.hidden = true; }, 250);
  };
  mail.addEventListener('click', function (e) { if (e.target.closest('[data-fg-mail-close]')) closeMail(); });
  mailInput.addEventListener('input', function () { if (!mailErr.hidden && EMAIL_RE.test(mailInput.value.trim())) { mailErr.hidden = true; mailInput.removeAttribute('aria-invalid'); } });
  mailForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = mailInput.value.trim();
    if (!EMAIL_RE.test(email)) { mailErr.hidden = false; mailInput.setAttribute('aria-invalid', 'true'); mailInput.focus(); return; }
    store.set({ email: email });
    saveEmail(email, mailConsent.checked);
    closeMail();
    addGifts();
  });
  /* L'e-mail suit la commande (attribut du panier « Email regali ») ; avec la case cochée, le client est inscrit aux
     offres par le formulaire client standard de Shopify (étiquettes newsletter, regali-gratis). */
  var saveEmail = function (email, consent) {
    fetch(cfg.root + 'cart/update.js', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ attributes: { 'Email regali': email } })
    }).catch(function () {});
    if (!consent) return;
    var body = new URLSearchParams();
    body.set('form_type', 'customer');
    body.set('utf8', '\u2713');
    body.set('contact[email]', email);
    body.set('contact[tags]', 'newsletter,regali-gratis');
    body.set('contact[accepts_marketing]', 'true');
    fetch(cfg.root + 'contact', { method: 'POST', credentials: 'same-origin', body: body }).catch(function () {});
  };

  var addGifts = function () {
    var todo = pending();
    if (busy || !unlocked() || !todo.length || picks.length < need()) return;
    busy = true;
    cta.disabled = true;
    cta.style.opacity = '.6';
    var n = todo.length;
    fetch(cfg.root + 'cart/add.js', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        items: todo.map(function (id) { return { id: id, quantity: 1, properties: { _gift: '1' } }; }),
        sections: sideCartId() ? [sideCartId()] : undefined,
        sections_url: window.location.pathname
      })
    }).then(function (r) {
      if (!r.ok) throw new Error('add');
      return r.json();
    }).then(function (response) {
      busy = false;
      cta.style.opacity = '';
      store.set({ added: true, picks: picks });
      say(T.added.replace('%n', n));
      return readCart().then(function () {
        render();
        // La popup se range dans la bulle, puis le tiroir panier s'ouvre avec les regali dedans
        setTimeout(function () { dock(); setTimeout(function () { refreshTheme(response, true); }, 480); }, 700);
      });
    }).catch(function () {
      busy = false;
      cta.style.opacity = '';
      say(T.error);
      renderCta();
    });
  };

  /* Bulle : un appui ouvre la popup ; glisser la déplace, relâchée elle se colle au bord le plus proche. */
  var drag = null;
  bubble.addEventListener('pointerdown', function (e) {
    if (e.button > 0) return;
    drag = { x: e.clientX, y: e.clientY, by: parseFloat(bubble.style.getPropertyValue('--fg-by')) || 0, moved: false };
    try { bubble.setPointerCapture(e.pointerId); } catch (err) {}
  });
  bubble.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 8) return;
    drag.moved = true;
    tip.classList.remove('is-shown');
    // Téléphone : tirer la pile vers le centre de l'écran ouvre la popup ; glisser en hauteur la déplace le long du bord
    if (isPhone()) {
      var inward = -dx;
      if (inward > 30 && inward > Math.abs(dy)) { drag = null; bubble.__dragged = true; setTimeout(function () { bubble.__dragged = false; }, 50); open(); return; }
      bubble.classList.add('is-drag');
      bubble.style.setProperty('--fg-by', (drag.by + dy) + 'px');
      return;
    }
    bubble.classList.add('is-drag');
    bubble.style.setProperty('--fg-bx', (e.clientX - BW / 2) + 'px');
    bubble.style.setProperty('--fg-by', (drag.by + dy) + 'px');
  });
  var endDrag = function (e) {
    if (!drag) return;
    var d = drag;
    drag = null;
    bubble.classList.remove('is-drag');
    if (!d.moved) return;
    if (!isPhone()) side = e.clientX < window.innerWidth / 2 ? 'left' : 'right';
    var phone = isPhone(), r = (d.by + (e.clientY - d.y)) / window.innerHeight;
    if (phone) yPhone = r; else yRatio = r;
    placeBubble();
    r = (parseFloat(bubble.style.getPropertyValue('--fg-by')) || 0) / window.innerHeight;
    if (phone) { yPhone = r; store.set({ yPhone: r }); } else { yRatio = r; store.set({ side: side, y: r }); }
    bubble.__dragged = true;
    setTimeout(function () { bubble.__dragged = false; }, 50);
  };
  bubble.addEventListener('pointerup', endDrag);
  bubble.addEventListener('pointercancel', endDrag);
  bubble.addEventListener('click', function (e) {
    if (bubble.__dragged) { e.preventDefault(); return; }
    if (isPhone()) {
      bubble.classList.remove('is-tucked');
      bubble.classList.add('is-pop');
      setTimeout(function () { bubble.classList.remove('is-pop'); open(); }, 230);
      return;
    }
    open();
  });
  /* Téléphone : pendant le défilement la pile se range dans le bord, et ressort avec un rebond à l'arrêt
     (comme les Instants d'Instagram). */
  var tuckTimer;
  window.addEventListener('scroll', function () {
    if (!isPhone() || !bubble.classList.contains('is-shown') || drag) return;
    if (!bubble.classList.contains('is-tucked')) bubble.classList.add('is-tucked');
    clearTimeout(tuckTimer);
    tuckTimer = setTimeout(function () { bubble.classList.remove('is-tucked'); }, 260);
  }, { passive: true });
  window.addEventListener('resize', function () { if (bubble.classList.contains('is-shown')) placeBubble(); });

  /* Panier modifié ailleurs sur la page (ajout, suppression) : relire le total, retirer les regali sous 50 €. */
  var cartTimer;
  var onCartChange = function () {
    clearTimeout(cartTimer);
    cartTimer = setTimeout(function () {
      readCart().then(enforce).then(function () {
        renderSlots(); renderGoal(); renderCta(); renderBubble();
        if (modal.classList.contains('is-open')) { renderList(); }
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
  // Sur chaque page ouverte ou rechargée, la popup s'ouvre toute seule en entier après 7 s ; fermée, elle se range
  // dans la bulle pour le reste de la page. Déjà rangée une fois : la bulle est là dès l'arrivée en attendant.
  if (state.docked) {
    showBubble();
    setTimeout(function () {
      Promise.all([loadProducts(), readCart()]).then(enforce).then(function () { if (!modal.classList.contains('is-open')) showBubble(); }).catch(function () {});
    }, 800);
  }
  var wait = cfg.delay;
  // Produits préparés 3 s avant l'ouverture pour que la fenêtre arrive déjà remplie
  setTimeout(function () { loadProducts().catch(function () {}); readCart().catch(function () {}); }, Math.max(0, wait - 3000));
  setTimeout(function () { if (!modal.classList.contains('is-open')) open(); }, wait);
})();
