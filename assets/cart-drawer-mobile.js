/* Tiroir panier MOBILE (prototype « platinumshop-cart-drawer ») — snippets/cart-drawer-mobile.liquid, assets/cart-drawer-mobile.css.
   Le tiroir (#cart) reste celui du thème : ouverture, fermeture et nouveau rendu après chaque ajout (assets/custom-async.js).
   Ici : quantités et suppression (avec « Annulla ») via l'API panier, puis nouveau rendu par le thème (ajaxCart.load) ;
   après chaque rendu, les suggestions du thème, les points de fidélité et la livraison gratuite sont mis en place.
   Textes : window.mobileT (snippets/mobile-i18n.liquid). */
(function () {
  'use strict';

  if (!window.matchMedia('(max-width: 760px)').matches) return;
  var drawer = document.getElementById('cart');
  if (!drawer || !drawer.querySelector('[data-cart-drawer-mobile]')) return;

  var T = window.mobileT || function (key) { return key; };
  var shopRoot = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
  var sectionId = drawer.getAttribute('data-section-id');
  var pointsPerCent = null;
  var toastTimer = null;
  var observer = null;

  var panel = function () { return drawer.querySelector('[data-cart-drawer-mobile]'); };

  var money = function (cents) {
    // Même format que les prix du thème (format monétaire de la boutique), sinon format du navigateur.
    if (window.Shopify && typeof window.Shopify.formatMoney === 'function') return String(window.Shopify.formatMoney(cents)).replace(/<[^>]*>/g, '');
    var currency = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'EUR';
    return new Intl.NumberFormat(document.documentElement.lang || 'it', { style: 'currency', currency: currency }).format(cents / 100);
  };

  var toast = function (text, undo) {
    var box = panel() && panel().querySelector('[data-cd-toast]');
    if (!box) return;
    var undoButton = box.querySelector('[data-cd-toast-undo]');
    box.querySelector('[data-cd-toast-text]').textContent = text;
    undoButton.hidden = !undo;
    undoButton.onclick = undo ? function () { box.classList.remove('is-shown'); undo(); } : null;
    box.classList.add('is-shown');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { box.classList.remove('is-shown'); }, undo ? 4500 : 2200);
  };

  /* ---------- Requêtes panier, puis nouveau rendu du tiroir par le thème ---------- */
  var cartRequest = function (endpoint, body) {
    body.sections = [sectionId];
    body.sections_url = window.location.pathname;
    return fetch(shopRoot + endpoint, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok) throw new Error(data.description || data.message || ('Cart request failed with status ' + response.status));
        return data;
      });
    });
  };

  var updateCounts = function (count) {
    document.querySelectorAll('#cart-count, #cart-count--m, .mobile-home-cart-count, [data-mobile-mini-cart-count]').forEach(function (element) {
      element.textContent = String(count);
      if (element.id !== 'cart-count') element.hidden = count <= 0;
    });
  };

  var renderDrawer = function (sections) {
    var html = sections && sections[sectionId];
    if (!html) return;
    if (window.ajaxCart && typeof window.ajaxCart.load === 'function') {
      window.ajaxCart.load({ sections: sections }, false);
      return;
    }
    var fresh = new DOMParser().parseFromString(html, 'text/html').getElementById('cart');
    if (fresh) drawer.innerHTML = fresh.innerHTML;
  };

  // La page panier (assets/cart-mobile.js) et le tiroir se tiennent à jour l'un l'autre.
  var announce = function () {
    document.dispatchEvent(new CustomEvent('platinum:cart-changed', { detail: { source: 'drawer' } }));
  };

  var applyCart = function (data) {
    if (typeof data.item_count === 'number') updateCounts(data.item_count);
    renderDrawer(data.sections);
    announce();
    return data;
  };

  var failed = function (error) {
    console.error('[Cart drawer mobile]', error);
    toast(error && error.message ? error.message : T('cart_error'));
    var current = panel();
    if (current) current.querySelectorAll('.is-busy, .is-out').forEach(function (line) { line.classList.remove('is-busy', 'is-out'); });
  };

  var changeLine = function (line, quantity) {
    line.classList.add('is-busy');
    return cartRequest('cart/change.js', { id: line.getAttribute('data-key'), quantity: quantity }).then(applyCart);
  };

  var removeLine = function (line) {
    var restore = {
      id: Number(line.getAttribute('data-variant-id')),
      quantity: Number(line.getAttribute('data-quantity')),
      properties: {}
    };
    try { restore.properties = JSON.parse(line.getAttribute('data-properties') || '{}') || {}; } catch (error) { restore.properties = {}; }
    // Sans propriété, Shopify les écrit en liste vide ([]) : l'API d'ajout attend un objet.
    if (Array.isArray(restore.properties)) restore.properties = {};
    if (line.getAttribute('data-selling-plan')) restore.selling_plan = Number(line.getAttribute('data-selling-plan'));
    line.classList.add('is-out');
    window.setTimeout(function () {
      changeLine(line, 0).then(function () {
        toast(T('cart_removed'), function () {
          cartRequest('cart/add.js', { items: [restore] })
            .then(function (added) {
              renderDrawer(added.sections);
              announce();
              toast(T('cart_restored'));
              return fetch(shopRoot + 'cart.js', { credentials: 'same-origin' }).then(function (response) { return response.json(); });
            })
            .then(function (cart) { updateCounts(cart.item_count); })
            .catch(failed);
        });
      }).catch(failed);
    }, 220);
  };

  drawer.addEventListener('click', function (event) {
    var action = event.target.closest('[data-cd-action]');
    if (!action || !panel() || !panel().contains(action)) return;
    var line = action.closest('[data-cd-line]');
    var quantity = Number(line.getAttribute('data-quantity'));
    var step = Number(line.getAttribute('data-step')) || 1;
    var min = Number(line.getAttribute('data-min')) || 1;
    var max = line.getAttribute('data-max') ? Number(line.getAttribute('data-max')) : Infinity;
    var kind = action.getAttribute('data-cd-action');
    if (kind === 'remove') removeLine(line);
    else if (kind === 'inc' && quantity + step <= max) changeLine(line, quantity + step).catch(failed);
    else if (kind === 'dec' && quantity - step >= min) changeLine(line, quantity - step).catch(failed);
  });

  // Toucher la page assombrie à côté du tiroir le referme (la barre du bas reste utilisable).
  document.addEventListener('click', function (event) {
    if (!drawer.classList.contains('toggle') || !document.documentElement.classList.contains('m6pn-open')) return;
    if (drawer.contains(event.target) || event.target.closest('.mobile-bottom-navigation')) return;
    var close = drawer.querySelector('.cd-x');
    if (!close) return;
    event.preventDefault();
    event.stopPropagation();
    close.click();
  }, true);

  // Changement fait sur la page panier : le tiroir est redessiné pour rester juste.
  document.addEventListener('platinum:cart-changed', function (event) {
    if (event.detail && event.detail.source === 'drawer') return;
    fetch(window.location.pathname + '?sections=' + encodeURIComponent(sectionId), { credentials: 'same-origin' })
      .then(function (response) { return response.json(); })
      .then(renderDrawer)
      .catch(function (error) { console.error('[Cart drawer mobile] refresh failed', error); });
  });

  /* ---------- « Potrebbe piacerti anche » : recommandations Shopify en cartes (prototype) ---------- */
  var escapeHtml = function (value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  };
  var sizedImage = function (url, width) {
    if (!url) return '';
    var clean = String(url).replace(/^\/\//, 'https://');
    return clean + (clean.indexOf('?') === -1 ? '?' : '&') + 'width=' + width;
  };
  var CART_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6h15l-1.5 9h-12z"/><path d="M6 6 5 2H2"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/></svg>';
  var RETURN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg>';
  var relatedCache = {};

  var relatedCard = function (product) {
    var variants = (product.variants || []).filter(function (variant) { return variant.available; });
    if (!variants.length) return '';
    var first = variants[0];
    var sale = first.compare_at_price > first.price;
    var off = sale ? Math.floor((first.compare_at_price - first.price) * 100 / first.compare_at_price) : 0;
    var image = product.featured_image || (product.images && product.images[0]);
    var best = (product.tags || []).some(function (tag) { return /best ?sell|più vendut/i.test(tag); });
    var options = variants.length > 1 || first.title !== 'Default Title'
      ? '<select aria-label="' + escapeHtml(T('drawer_variant')) + '" data-cd-variant>' + variants.map(function (variant) {
          return '<option value="' + variant.id + '">' + escapeHtml(variant.title) + '</option>';
        }).join('') + '</select>'
      : '<input type="hidden" data-cd-variant value="' + first.id + '">';
    return '<article class="cd-rc">'
      + '<a class="cd-rc__ph" href="' + escapeHtml(product.url) + '">'
      + (image ? '<img src="' + escapeHtml(sizedImage(image, 400)) + '" alt="" loading="lazy">' : '')
      + (best ? '<span class="cd-rc__bd"><i>★</i> ' + escapeHtml(T('drawer_best')) + '</span>' : '')
      + '</a>'
      + '<div class="cd-rc__info">'
      + '<a class="cd-rc__nm" href="' + escapeHtml(product.url) + '">' + escapeHtml(product.title) + '</a>'
      + '<div class="cd-rc__chips"><span class="is-free">' + escapeHtml(T('drawer_free_shipping')) + '</span><span>' + RETURN_ICON + escapeHtml(T('drawer_easy_returns')) + '</span></div>'
      + (sale ? '<span class="cd-rc__sv">' + escapeHtml(T('drawer_save', { amount: money(first.compare_at_price - first.price) })) + '</span>' : '')
      + '<div class="cd-rc__pr' + (sale ? ' is-sale' : '') + '"><b>' + money(first.price) + '</b>'
      + (sale ? '<s>' + money(first.compare_at_price) + '</s><em>-' + off + '%</em>' : '') + '</div>'
      + '<div class="cd-rc__buy">' + options
      + '<button class="cd-add" type="button" aria-label="' + escapeHtml(T('drawer_add')) + '" data-cd-add>' + CART_ICON + '</button></div>'
      + '</div></article>';
  };

  var showRelated = function (current) {
    var section = current.querySelector('[data-cd-related]');
    if (!section) return;
    var url = section.getAttribute('data-url');
    var rail = section.querySelector('[data-cd-rail]');
    var inCart = (section.getAttribute('data-in-cart') || '').split(',');
    var limit = Number(section.getAttribute('data-limit')) || 4;
    var fill = function (products) {
      var html = products
        .filter(function (product) { return inCart.indexOf(String(product.id)) === -1; })
        .slice(0, limit)
        .map(relatedCard)
        .join('');
      if (rail.innerHTML !== html) rail.innerHTML = html;
      section.hidden = !html;
    };
    if (relatedCache[url]) {
      fill(relatedCache[url]);
      return;
    }
    relatedCache[url] = [];
    fetch(url, { credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) throw new Error('Recommendations request failed with status ' + response.status);
        return response.json();
      })
      .then(function (data) {
        relatedCache[url] = data.products || [];
        var latest = panel();
        if (latest) setup();
      })
      .catch(function (error) {
        console.error('[Cart drawer mobile] recommendations', error);
      });
  };

  // Ajout d'une suggestion au panier (variante choisie dans la carte).
  drawer.addEventListener('click', function (event) {
    var button = event.target.closest('[data-cd-add]');
    if (!button || !panel() || !panel().contains(button)) return;
    var field = button.closest('.cd-rc').querySelector('[data-cd-variant]');
    button.disabled = true;
    cartRequest('cart/add.js', { items: [{ id: Number(field.value), quantity: 1 }] })
      .then(function (added) {
        renderDrawer(added.sections);
        announce();
        toast(T('added_to_cart'));
        return fetch(shopRoot + 'cart.js', { credentials: 'same-origin' }).then(function (response) { return response.json(); });
      })
      .then(function (cart) { updateCounts(cart.item_count); })
      .catch(function (error) {
        button.disabled = false;
        failed(error);
      });
  });

  /* ---------- Après chaque rendu : suggestions, points, livraison gratuite ---------- */

  var showPoints = function (current) {
    var banner = current.querySelector('[data-cd-points]');
    if (!banner) return;
    var total = Number(current.getAttribute('data-total')) || 0;
    var source = drawer.querySelector('.honeypop-cp-headline');
    var points = source ? Number(source.textContent.replace(/[^\d]/g, '')) : NaN;
    if (!isNaN(points) && points > 0 && total) pointsPerCent = points / total;
    if ((isNaN(points) || !points) && pointsPerCent && total) points = Math.round(total * pointsPerCent);
    if (!points || isNaN(points)) return;
    var text = T('drawer_points', { points: points.toLocaleString(document.documentElement.lang || 'it') });
    var target = banner.querySelector('[data-cd-points-text]');
    if (target.textContent !== text) target.textContent = text;
    banner.hidden = false;
  };

  var convertFreeShipping = function (current) {
    var rate = Number(window.Shopify && window.Shopify.currency && window.Shopify.currency.rate) || 1;
    var threshold = Number(current.getAttribute('data-threshold')) || 0;
    var card = current.querySelector('[data-cd-ship]');
    if (rate === 1 || !threshold || !card) return;
    var limit = Math.round(threshold * rate);
    var total = Number(current.getAttribute('data-total')) || 0;
    var free = total >= limit;
    card.classList.toggle('is-ok', free);
    card.querySelector('[data-cd-ship-text]').innerHTML = free
      ? '<b>' + T('cart_ship_free') + '</b>'
      : T('cart_ship_left_html', { amount: money(limit - total) });
    var bar = card.querySelector('[data-cd-ship-bar]');
    if (bar) bar.style.width = (free ? 100 : Math.floor(total * 100 / limit)) + '%';
  };

  var setup = function () {
    var current = panel();
    if (!current) return;
    // Nos propres changements ne doivent pas relancer la surveillance (sinon boucle sans fin).
    if (observer) observer.disconnect();
    showRelated(current);
    showPoints(current);
    convertFreeShipping(current);
    if (observer) observer.observe(drawer, { childList: true, subtree: true });
  };

  // Le thème redessine le tiroir, puis les apps (points) et les suggestions arrivent après : on suit ces ajouts.
  var scheduled = false;
  observer = new MutationObserver(function () {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(function () {
      scheduled = false;
      setup();
    });
  });
  observer.observe(drawer, { childList: true, subtree: true });
  setup();
})();
