/* Page panier MOBILE (prototype « platinumshop-cart-mobile ») — snippets/cart-mobile.liquid, assets/cart-mobile.css.
   Quantités et suppression (avec « Annulla ») via l'API panier de Shopify ; après chaque changement, la section
   panier est re-rendue par Shopify (Section Rendering API) : prix, remises, livraison gratuite et totaux restent
   ceux du serveur. Code de réduction et note : /cart/update.js. Textes : window.mobileT (snippets/mobile-i18n.liquid). */
(function () {
  'use strict';

  if (!window.matchMedia('(max-width: 760px)').matches) return;
  var first = document.querySelector('[data-cart-mobile]');
  if (!first) return;

  var T = window.mobileT || function (key) { return key; };
  var sectionId = first.getAttribute('data-section-id');
  var shopRoot = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
  var creditRatio = null;
  var toastTimer = null;
  var noteTimer = null;
  var summaryObserver = null;
  var koinObserver = null;

  var root = function () { return document.querySelector('[data-cart-mobile]'); };
  var sectionElement = function () { return document.getElementById('shopify-section-' + sectionId); };

  var money = function (cents) {
    // Même format que les prix du thème (format monétaire de la boutique), sinon format du navigateur.
    if (window.Shopify && typeof window.Shopify.formatMoney === 'function') return String(window.Shopify.formatMoney(cents)).replace(/<[^>]*>/g, '');
    var currency = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'EUR';
    return new Intl.NumberFormat(document.documentElement.lang || 'it', { style: 'currency', currency: currency }).format(cents / 100);
  };

  /* ---------- Message (avec bouton « Annulla » pour une suppression) ---------- */
  var toast = function (text, undo) {
    var box = root() && root().querySelector('[data-cm-toast]');
    if (!box) return;
    var undoButton = box.querySelector('[data-cm-toast-undo]');
    box.querySelector('[data-cm-toast-text]').textContent = text;
    undoButton.hidden = !undo;
    undoButton.onclick = undo ? function () { box.classList.remove('is-shown'); undo(); } : null;
    box.classList.add('is-shown');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { box.classList.remove('is-shown'); }, undo ? 4500 : 2200);
  };

  /* ---------- Requêtes panier + nouveau rendu de la section ---------- */
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
    document.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
  };

  var renderSection = function (sections) {
    var html = sections && sections[sectionId];
    var current = sectionElement();
    var fresh = html && new DOMParser().parseFromString(html, 'text/html').getElementById('shopify-section-' + sectionId);
    if (!current || !fresh) {
      window.location.reload();
      return;
    }
    current.innerHTML = fresh.innerHTML;
    setup();
  };

  var applyCart = function (data) {
    if (typeof data.item_count === 'number') updateCounts(data.item_count);
    renderSection(data.sections);
    // Le tiroir panier (assets/cart-drawer-mobile.js) se redessine à son tour.
    document.dispatchEvent(new CustomEvent('platinum:cart-changed', { detail: { source: 'page' } }));
    return data;
  };

  // Changement fait dans le tiroir panier : la page est redessinée pour rester juste.
  document.addEventListener('platinum:cart-changed', function (event) {
    if (event.detail && event.detail.source === 'page') return;
    fetch(window.location.pathname + '?sections=' + encodeURIComponent(sectionId), { credentials: 'same-origin' })
      .then(function (response) { return response.json(); })
      .then(renderSection)
      .catch(function (error) { console.error('[Cart mobile] refresh failed', error); });
  });

  var failed = function (error) {
    console.error('[Cart mobile]', error);
    toast(error && error.message ? error.message : T('cart_error'));
    var page = root();
    if (page) page.querySelectorAll('.is-busy').forEach(function (line) { line.classList.remove('is-busy'); });
  };

  /* ---------- Quantités et suppression ---------- */
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
    var title = line.getAttribute('data-title');
    line.classList.add('is-out');
    window.setTimeout(function () {
      changeLine(line, 0).then(function () {
        toast(T('cart_removed', { title: title }), function () {
          cartRequest('cart/add.js', { items: [restore] })
            .then(function (added) {
              renderSection(added.sections);
              document.dispatchEvent(new CustomEvent('platinum:cart-changed', { detail: { source: 'page' } }));
              toast(T('cart_restored'));
              return fetch(shopRoot + 'cart.js', { credentials: 'same-origin' }).then(function (response) { return response.json(); });
            })
            .then(function (cart) { updateCounts(cart.item_count); })
            .catch(failed);
        });
      }).catch(failed);
    }, 220);
  };

  document.addEventListener('click', function (event) {
    var page = root();
    if (!page || !page.contains(event.target)) return;

    var action = event.target.closest('[data-cm-action]');
    if (action) {
      var line = action.closest('[data-cm-line]');
      var quantity = Number(line.getAttribute('data-quantity'));
      var step = Number(line.getAttribute('data-step')) || 1;
      var min = Number(line.getAttribute('data-min')) || 1;
      var max = line.getAttribute('data-max') ? Number(line.getAttribute('data-max')) : Infinity;
      var kind = action.getAttribute('data-cm-action');
      if (kind === 'remove') removeLine(line);
      else if (kind === 'inc' && quantity + step <= max) changeLine(line, quantity + step).catch(failed);
      else if (kind === 'dec' && quantity - step >= min) changeLine(line, quantity - step).catch(failed);
      return;
    }

    var toggle = event.target.closest('[data-cm-toggle]');
    if (toggle) {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
      var body = toggle.nextElementSibling;
      if (body) body.hidden = open;
      if (!open && body) {
        var field = body.querySelector('input, textarea');
        if (field) window.setTimeout(function () { field.focus({ preventScroll: true }); }, 60);
      }
      return;
    }

    var removeCode = event.target.closest('[data-cm-remove-code]');
    if (removeCode) {
      var removed = removeCode.getAttribute('data-cm-remove-code');
      var remaining = currentCodes().filter(function (code) { return code.toUpperCase() !== removed.toUpperCase(); });
      cartRequest('cart/update.js', { discount: remaining.join(',') })
        .then(applyCart)
        .then(function () { toast(T('cart_code_removed')); })
        .catch(failed);
      return;
    }

    if (event.target.closest('[data-cm-bar-go]')) {
      var form = page.querySelector('[data-cm-checkout]');
      if (form && form.requestSubmit) form.requestSubmit(form.querySelector('[name="checkout"]'));
      else if (form) form.querySelector('[name="checkout"]').click();
    }
  });

  /* ---------- Code de réduction ---------- */
  var currentCodes = function () {
    var page = root();
    return page ? Array.prototype.map.call(page.querySelectorAll('[data-cm-remove-code]'), function (button) {
      return button.getAttribute('data-cm-remove-code');
    }) : [];
  };

  var codeMessage = function (text, isError) {
    var message = root() && root().querySelector('[data-cm-code-msg]');
    if (!message) return;
    message.hidden = !text;
    message.textContent = text || '';
    message.classList.toggle('is-error', Boolean(isError));
    // La section vient d'être re-rendue (accordéon refermé) : on le rouvre pour que le message se voie.
    var body = message.closest('.cm-acc__b');
    if (text && body) {
      body.hidden = false;
      var toggle = body.previousElementSibling;
      if (toggle) toggle.setAttribute('aria-expanded', 'true');
    }
  };

  document.addEventListener('submit', function (event) {
    var form = event.target.closest && event.target.closest('[data-cm-code-form]');
    if (!form) return;
    event.preventDefault();
    var code = form.querySelector('input').value.trim();
    if (!code) {
      codeMessage(T('cart_code_empty'), true);
      return;
    }
    var codes = currentCodes();
    if (codes.some(function (existing) { return existing.toUpperCase() === code.toUpperCase(); })) {
      codeMessage(T('cart_code_already'), true);
      return;
    }
    form.querySelector('button').disabled = true;
    cartRequest('cart/update.js', { discount: codes.concat(code).join(',') })
      .then(function (cart) {
        var found = (cart.discount_codes || []).find(function (entry) { return entry.code.toUpperCase() === code.toUpperCase(); });
        applyCart(cart);
        if (found && found.applicable) {
          codeMessage(T('cart_code_applied'), false);
          toast(T('cart_code_applied'));
          return;
        }
        // Code refusé : Shopify le garde sur le panier (« non applicable ») et il partait jusqu'au paiement.
        // On remet les seuls codes valides, puis on affiche le message.
        return cartRequest('cart/update.js', { discount: codes.join(',') })
          .then(applyCart)
          .catch(function (error) { console.error('[Cart mobile] Invalid code not removed', error); })
          .then(function () { codeMessage(T('cart_code_invalid'), true); });
      })
      .catch(function (error) {
        form.querySelector('button').disabled = false;
        failed(error);
      });
  });

  /* ---------- Note pour le vendeur : enregistrée pendant la saisie ---------- */
  document.addEventListener('input', function (event) {
    var note = event.target.closest && event.target.closest('[data-cm-note]');
    if (!note) return;
    var count = root().querySelector('[data-cm-note-count]');
    if (count) count.textContent = String(note.value.length);
    window.clearTimeout(noteTimer);
    noteTimer = window.setTimeout(function () {
      fetch(shopRoot + 'cart/update.js', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ note: note.value })
      }).catch(function (error) { console.error('[Cart mobile] Note not saved', error); });
    }, 500);
  });

  /* ---------- Livraison gratuite dans la devise du visiteur (seuil des réglages en devise de la boutique) ---------- */
  var convertFreeShipping = function (page) {
    var rate = Number(window.Shopify && window.Shopify.currency && window.Shopify.currency.rate) || 1;
    var threshold = Number(page.getAttribute('data-threshold')) || 0;
    if (rate === 1 || !threshold) return;
    var limit = Math.round(threshold * rate);
    var total = Number(page.getAttribute('data-total')) || 0;
    var free = total >= limit;
    var card = page.querySelector('[data-cm-ship]');
    if (card) {
      card.classList.toggle('is-ok', free);
      card.querySelector('[data-cm-ship-text]').innerHTML = free
        ? '<b>' + T('cart_ship_free') + '</b>'
        : T('cart_ship_left_html', { amount: money(limit - total) });
      var bar = card.querySelector('[data-cm-ship-bar]');
      if (bar) bar.style.width = (free ? 100 : Math.floor(total * 100 / limit)) + '%';
    }
    var row = page.querySelector('[data-cm-ship-row]');
    if (row) {
      row.classList.toggle('is-free', free);
      row.querySelector('b').textContent = free ? T('cart_shipping_free') : T('cart_shipping_checkout');
    }
  };

  /* ---------- Crédit boutique : montant de l'app de fidélité (Koin), une seule fois ---------- */
  var parseMoney = function (text) {
    var digits = String(text).replace(/[^\d]/g, '');
    return digits ? Number(digits) : NaN;
  };

  var showCredit = function () {
    var page = root();
    var banner = page && page.querySelector('[data-cm-credit]');
    if (!banner) return false;
    var total = Number(page.getAttribute('data-total')) || 0;
    var amountEl = document.querySelector('[id="shopify-section-' + sectionId + '"] .koin-promotion-widget__description .money');
    var amountText = amountEl ? amountEl.textContent.trim() : '';
    if (amountText && total) creditRatio = parseMoney(amountText) / total;
    if (!amountText && creditRatio && total) amountText = money(Math.round(total * creditRatio));
    if (!amountText) return false;
    var html = T('cart_credit_html', { amount: amountText });
    var target = banner.querySelector('[data-cm-credit-text]');
    // Écrit seulement si le texte change : sinon la surveillance de l'app (MutationObserver) se relancerait sans fin.
    if (target.innerHTML !== html) target.innerHTML = html;
    banner.hidden = false;
    return Boolean(amountEl);
  };

  // Vrai seulement quand l'app ajoute son propre bloc (pas pour nos changements dans le panier).
  var koinAdded = function (mutations) {
    return mutations.some(function (mutation) {
      return Array.prototype.some.call(mutation.addedNodes, function (node) {
        return node.nodeType === 1 && !node.closest('[data-cart-mobile] [data-cm-credit]')
          && (node.matches('[class*="koin-promotion"]') || node.querySelector('[class*="koin-promotion"]'));
      });
    });
  };

  /* ---------- Boutons de paiement express : déplacés depuis le panier Xtra (caché en mobile) ---------- */
  var moveExpressButtons = function (page) {
    var slot = page.querySelector('[data-cm-express]');
    var buttons = sectionElement() && sectionElement().querySelector('[data-accelerated-checkout-cart]');
    if (slot && buttons && !slot.contains(buttons)) slot.appendChild(buttons);
  };

  /* ---------- Barre de paiement collante : visible quand le grand bouton de paiement n'est pas à l'écran ---------- */
  var watchSummary = function (page) {
    if (summaryObserver) summaryObserver.disconnect();
    var button = page.querySelector('[data-cm-checkout] [name="checkout"]');
    var bar = page.querySelector('[data-cm-bar]');
    if (!button || !bar || !('IntersectionObserver' in window)) return;
    summaryObserver = new IntersectionObserver(function (entries) {
      bar.classList.toggle('is-shown', !entries[0].isIntersecting);
    }, { rootMargin: '0px 0px -140px 0px' });
    summaryObserver.observe(button);
  };

  var setup = function () {
    var page = root();
    if (!page) return;
    convertFreeShipping(page);
    moveExpressButtons(page);
    watchSummary(page);
    if (koinObserver) koinObserver.disconnect();
    if (!showCredit() && sectionElement() && 'MutationObserver' in window) {
      // L'app ajoute son bloc après le chargement : on attend son montant.
      koinObserver = new MutationObserver(function (mutations) {
        if (koinAdded(mutations) && showCredit()) koinObserver.disconnect();
      });
      koinObserver.observe(sectionElement(), { childList: true, subtree: true });
      window.setTimeout(function () { if (koinObserver) koinObserver.disconnect(); }, 15000);
    }
  };

  setup();
})();
