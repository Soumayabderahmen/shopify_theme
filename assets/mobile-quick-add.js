/* Quick add mobile — bouton panier des cartes produit + modale "Aggiungi al carrello".
   Données réelles : templates/product.quick-add.liquid (options, variantes, stock, guide des tailles)
   et Product Recommendations API (produits similaires). Ajout via /cart/add.js.
   Actif uniquement sous 760px : sur desktop le bouton n'est pas affiché (.mobile-only) et rien ne change. */
(function () {
  'use strict';

  var dialog = document.querySelector('[data-mobile-quick-add]');
  if (!dialog) return;

  var mobile = window.matchMedia('(max-width: 760px)');
  var shopRoot = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
  var toastElement = document.querySelector('[data-qa-toast]');
  var el = {
    back: dialog.querySelector('[data-qa-back]'),
    image: dialog.querySelector('[data-qa-image]'),
    title: dialog.querySelector('[data-qa-title]'),
    price: dialog.querySelector('[data-qa-price]'),
    stock: dialog.querySelector('[data-qa-stock]'),
    body: dialog.querySelector('[data-qa-body]'),
    options: dialog.querySelector('[data-qa-options]'),
    guidePanel: dialog.querySelector('[data-qa-guide-panel]'),
    qtyValue: dialog.querySelector('[data-qa-qty-value]'),
    qtyMinus: dialog.querySelector('[data-qa-qty="-1"]'),
    qtyPlus: dialog.querySelector('[data-qa-qty="1"]'),
    free: dialog.querySelector('[data-qa-free]'),
    klarna: dialog.querySelector('[data-qa-klarna]'),
    klarnaValue: dialog.querySelector('[data-qa-klarna-value]'),
    sim: dialog.querySelector('[data-qa-sim]'),
    simTitle: dialog.querySelector('[data-qa-sim-title]'),
    simAll: dialog.querySelector('[data-qa-sim-all]'),
    simRail: dialog.querySelector('[data-qa-sim-rail]'),
    more: dialog.querySelector('[data-qa-more]'),
    add: dialog.querySelector('[data-qa-add]')
  };

  var COLOR_OPTION = /colou?r|colore|colori|farbe|couleur|kleur/i;
  var SIZE_OPTION = /size|taglia|taglie|dimensione|misura|numero|talla|taille|gr(ö|oe)(ss|ß)e|maat/i;
  var DEFAULT_TITLE = 'Default Title';
  var MAX_QTY = 10;
  var LOW_STOCK = 5;

  /* Noms de couleurs courants (italien / anglais) -> pastille ; sinon image de la variante ou texte. */
  var COLOR_NAMES = {
    'light blue': '#8EC5FF', 'sky blue': '#8EC5FF', 'navy blue': '#1F2A44', 'dark blue': '#1F2A44',
    'royal blue': '#2748A8', 'army green': '#4B5320', 'dark green': '#2F4F3A', 'light gray': '#C9CDD3',
    'light grey': '#C9CDD3', 'dark gray': '#555A62', 'dark grey': '#555A62', 'rose gold': '#E0A899',
    'wine red': '#7A1F2B', 'hot pink': '#E0457B', 'off white': '#F2EFE6',
    nero: '#1A1A1A', black: '#1A1A1A', bianco: '#F4F4F4', white: '#F4F4F4', grigio: '#9AA0A8',
    gray: '#9AA0A8', grey: '#9AA0A8', blu: '#2C4A8C', blue: '#2C4A8C', navy: '#1F2A44',
    azzurro: '#8EC5FF', rosso: '#C8102E', red: '#C8102E', beige: '#D9C3A5', khaki: '#C3B091',
    cachi: '#C3B091', argento: '#C0C4CC', silver: '#C0C4CC', oro: '#D4AF37', gold: '#D4AF37',
    verde: '#3E6B48', green: '#3E6B48', rosa: '#F4A7B9', pink: '#F4A7B9', viola: '#7B4BA8',
    purple: '#7B4BA8', lilla: '#C8A2C8', lavender: '#C8A2C8', giallo: '#F2C94C', yellow: '#F2C94C',
    arancione: '#F2994A', orange: '#F2994A', marrone: '#6B4A2B', brown: '#6B4A2B', coffee: '#6F4E37',
    caffe: '#6F4E37', 'caffè': '#6F4E37', bordeaux: '#7A1F2B', burgundy: '#7A1F2B', wine: '#7A1F2B',
    camel: '#C19A6B', apricot: '#F6C7A0', albicocca: '#F6C7A0', cream: '#F3E9D2', crema: '#F3E9D2',
    ivory: '#F6F1E1', avorio: '#F6F1E1', turquoise: '#2EC4B6', turchese: '#2EC4B6', mint: '#A8E6CF',
    olive: '#708238', oliva: '#708238', champagne: '#F1DDBF', bronze: '#A97142', bronzo: '#A97142'
  };
  var COLOR_KEYS = Object.keys(COLOR_NAMES).sort(function (a, b) { return b.length - a.length; });

  var dataCache = new Map();
  var state = null;
  var history = [];
  var closeTimer = null;
  var toastTimer = null;
  var busy = false;

  /* ---------- Utilitaires ---------- */
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function formatNumber(cents, decimals, thousands, decimal) {
    var fixed = (Number(cents || 0) / 100).toFixed(decimals).split('.');
    return fixed[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands) + (fixed[1] ? decimal + fixed[1] : '');
  }

  function money(cents) {
    var format = (state && state.product.moneyFormat) || '€{{amount_with_comma_separator}}';
    return format.replace(/\{\{\s*(\w+)\s*\}\}/, function (match, key) {
      switch (key) {
        case 'amount_no_decimals': return formatNumber(cents, 0, ',', '.');
        case 'amount_with_comma_separator': return formatNumber(cents, 2, '.', ',');
        case 'amount_no_decimals_with_comma_separator': return formatNumber(cents, 0, '.', ',');
        case 'amount_with_apostrophe_separator': return formatNumber(cents, 2, "'", '.');
        case 'amount_with_space_separator': return formatNumber(cents, 2, ' ', ',');
        default: return formatNumber(cents, 2, ',', '.');
      }
    });
  }

  function sizedImage(url, width) {
    if (!url) return '';
    var clean = String(url).replace(/^\/\//, 'https://').replace(/([?&])width=\d+&?/, '$1').replace(/[?&]$/, '');
    return clean + (clean.indexOf('?') === -1 ? '?' : '&') + 'width=' + width;
  }

  function flagEmoji(countryCode) {
    if (!/^[A-Z]{2}$/i.test(countryCode || '')) return '';
    return String.fromCodePoint.apply(null, countryCode.toUpperCase().split('').map(function (letter) {
      return 127397 + letter.charCodeAt(0);
    }));
  }

  function colorFromName(name) {
    var lower = String(name || '').toLowerCase().trim();
    if (COLOR_NAMES[lower]) return COLOR_NAMES[lower];
    for (var i = 0; i < COLOR_KEYS.length; i += 1) {
      if (new RegExp('(^|[^a-zà-ù])' + COLOR_KEYS[i] + '([^a-zà-ù]|$)').test(lower)) return COLOR_NAMES[COLOR_KEYS[i]];
    }
    return null;
  }

  function showToast(message) {
    if (!toastElement) return;
    toastElement.textContent = message;
    toastElement.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toastElement.classList.remove('is-visible'); }, 1900);
  }

  /* ---------- Données ---------- */
  function loadProduct(handle) {
    if (!dataCache.has(handle)) {
      var request = fetch(shopRoot + 'products/' + encodeURIComponent(handle) + '?view=quick-add', { credentials: 'same-origin' })
        .then(function (response) {
          if (!response.ok) throw new Error('Quick add request failed with status ' + response.status + ' for ' + handle);
          return response.text();
        })
        .then(function (text) { return JSON.parse(text); });
      request.catch(function () { dataCache.delete(handle); });
      dataCache.set(handle, request);
    }
    return dataCache.get(handle);
  }

  function loadSimilar(product) {
    var base = dialog.dataset.recommendationsUrl || (shopRoot + 'recommendations/products');
    return fetch(base + '.json?product_id=' + encodeURIComponent(product.id) + '&limit=10&intent=related', { credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) throw new Error('Recommendations request failed with status ' + response.status);
        return response.json();
      })
      .then(function (data) { return data.products || []; });
  }

  /* ---------- Sélection ---------- */
  // Produit sans variantes : une seule option "Title" avec la valeur "Default Title".
  function hasOptions(product) {
    var options = product.options;
    return !(options.length === 1 && options[0].values.length === 1 && options[0].values[0].name === DEFAULT_TITLE);
  }

  function isColorOption(option) {
    return COLOR_OPTION.test(option.name);
  }

  function matches(variant, selected, skipIndex) {
    return variant.options.every(function (value, index) {
      return index === skipIndex || selected[index] == null || selected[index] === value;
    });
  }

  function selectedVariant() {
    var product = state.product;
    if (!hasOptions(product)) return product.variants[0];
    if (state.selected.some(function (value) { return value == null; })) return null;
    return product.variants.find(function (variant) { return matches(variant, state.selected, -1); }) || null;
  }

  function displayVariant() {
    var exact = selectedVariant();
    if (exact) return exact;
    var variants = state.product.variants;
    return variants.find(function (variant) { return variant.available && matches(variant, state.selected, -1); })
      || variants.find(function (variant) { return matches(variant, state.selected, -1); })
      || variants.find(function (variant) { return variant.available; })
      || variants[0];
  }

  function valueAvailable(optionIndex, value) {
    return state.product.variants.some(function (variant) {
      return variant.available && variant.options[optionIndex] === value && matches(variant, state.selected, optionIndex);
    });
  }

  function initialSelection(product, variantId) {
    var selected = product.options.map(function () { return null; });
    if (!hasOptions(product)) return product.options.map(function (option) { return option.values[0].name; });
    var start = product.variants.find(function (variant) { return String(variant.id) === String(variantId) && variant.available; })
      || product.variants.find(function (variant) { return variant.available; })
      || product.variants[0];
    product.options.forEach(function (option, index) {
      // Couleur : celle de la carte ; options à une seule valeur : sélectionnées d'office ; tailles : au choix du client.
      if (option.values.length === 1) selected[index] = option.values[0].name;
      else if (isColorOption(option) && start) selected[index] = start.options[index];
    });
    return selected;
  }

  function missingOption() {
    var product = state.product;
    for (var index = 0; index < product.options.length; index += 1) {
      if (state.selected[index] == null) return product.options[index];
    }
    return null;
  }

  function optionLabel(option) {
    if (isColorOption(option)) return 'Colore';
    if (SIZE_OPTION.test(option.name)) return 'Taglia';
    return option.name;
  }

  /* ---------- Rendu ---------- */
  function swatchFor(option, optionIndex, value) {
    if (value.color) return { style: '--sw:' + value.color };
    if (value.image) return { style: 'background-image:url("' + value.image + '")' };
    var named = colorFromName(value.name);
    if (named) return { style: '--sw:' + named };
    var withImage = state.product.variants.find(function (variant) {
      return variant.options[optionIndex] === value.name && variant.image;
    });
    if (withImage) return { style: 'background-image:url("' + sizedImage(withImage.image, 96) + '")' };
    return null;
  }

  function renderOptions() {
    var product = state.product;
    var html = '';
    var guideShown = false;
    if (hasOptions(product)) {
      product.options.forEach(function (option, index) {
        if (option.values.length === 1 && option.values[0].name === DEFAULT_TITLE) return;
        var color = isColorOption(option);
        var label = optionLabel(option);
        var guide = '';
        if (!color && !guideShown && product.sizeChart && SIZE_OPTION.test(option.name)) {
          guide = '<a href="#" class="qa-guide" data-qa-guide aria-expanded="false">Guida alle taglie</a>';
          guideShown = true;
        }
        html += '<div class="qa-grp" data-qa-group="' + index + '">'
          + '<div class="qa-lbl">' + escapeHtml(label) + ': <b data-qa-value="' + index + '"></b>' + guide + '</div>'
          + '<div class="' + (color ? 'qa-colors' : 'qa-sizes') + '" role="radiogroup" aria-label="' + escapeHtml(label) + '">';
        option.values.forEach(function (value) {
          if (color) {
            var swatch = swatchFor(option, index, value);
            html += '<button type="button" role="radio" aria-checked="false" aria-label="' + escapeHtml(value.name) + '"'
              + ' data-qa-option="' + index + '" data-qa-value-name="' + escapeHtml(value.name) + '"'
              + (swatch ? ' style="' + escapeHtml(swatch.style) + '"' : ' class="is-text"') + '>'
              + (swatch ? '' : escapeHtml(value.name)) + '</button>';
          } else {
            html += '<button type="button" role="radio" aria-checked="false"'
              + ' data-qa-option="' + index + '" data-qa-value-name="' + escapeHtml(value.name) + '">'
              + escapeHtml(value.name) + '</button>';
          }
        });
        html += '</div></div>';
      });
    }
    el.options.innerHTML = html;
    el.guidePanel.hidden = true;
    el.guidePanel.innerHTML = product.sizeChart || '';
  }

  function paint() {
    var product = state.product;
    var exact = selectedVariant();
    var variant = displayVariant();
    var missing = missingOption();

    // Valeurs sélectionnées, tailles épuisées barrées, couleurs sans stock atténuées.
    el.options.querySelectorAll('[data-qa-option]').forEach(function (button) {
      var index = Number(button.dataset.qaOption);
      var name = button.dataset.qaValueName;
      var checked = state.selected[index] === name;
      button.setAttribute('aria-checked', String(checked));
      var available = valueAvailable(index, name);
      if (isColorOption(product.options[index])) {
        button.classList.toggle('is-soldout', !available);
        button.title = available ? name : name + ' — Esaurito';
      } else {
        button.disabled = !available && !checked;
        button.title = available ? '' : 'Esaurito';
      }
    });
    el.options.querySelectorAll('[data-qa-value]').forEach(function (label) {
      var index = Number(label.dataset.qaValue);
      label.textContent = state.selected[index] || 'scegli';
    });

    // En-tête : image, prix (barré + -%), stock réel.
    el.image.src = sizedImage(variant.image || product.image, 240);
    el.image.alt = product.title;
    var onSale = variant.compareAtPrice > variant.price;
    var percent = onSale ? Math.round((variant.compareAtPrice - variant.price) / variant.compareAtPrice * 100) : 0;
    el.price.innerHTML = '<b class="' + (onSale ? 'sale' : '') + '">' + escapeHtml(money(variant.price)) + '</b>'
      + (onSale ? '<s>' + escapeHtml(money(variant.compareAtPrice)) + '</s><span class="pct">-' + percent + '%</span>' : '');

    var stockText = 'Disponibile';
    var stockClass = '';
    if (exact && !exact.available) {
      stockText = 'Esaurito';
      stockClass = 'out';
    } else if (exact && exact.quantity != null && exact.quantity > 0 && exact.quantity <= LOW_STOCK) {
      stockText = exact.quantity === 1 ? 'Solo 1 pezzo disponibile' : 'Solo ' + exact.quantity + ' pezzi disponibili';
      stockClass = 'low';
    } else if (!exact && !product.variants.some(function (item) { return item.available; })) {
      stockText = 'Esaurito';
      stockClass = 'out';
    }
    if (state.error) {
      stockText = state.error;
      stockClass = 'out';
    }
    el.stock.textContent = stockText;
    el.stock.className = 'qa-stock' + (stockClass ? ' ' + stockClass : '');

    // Quantité : limitée au stock réel quand il est suivi.
    var maxQty = exact && exact.quantity != null && exact.quantity > 0 ? Math.min(MAX_QTY, exact.quantity) : MAX_QTY;
    if (state.qty > maxQty) state.qty = maxQty;
    el.qtyValue.textContent = String(state.qty);
    el.qtyMinus.disabled = state.qty <= 1;
    el.qtyPlus.disabled = state.qty >= maxQty;

    // Avantages : même règle que la carte (livraison offerte au-delà du seuil), Klarna si activé.
    var freeShipping = variant.price > (product.freeShippingThreshold || 5000);
    el.free.hidden = !freeShipping;
    el.free.textContent = (flagEmoji(product.country) + ' Sped. gratuita').trim();
    el.klarna.hidden = !product.klarna;
    el.klarnaValue.textContent = money(Math.round(variant.price / 3));

    el.more.href = product.url;

    // Bouton principal.
    var unavailable = exact && !exact.available;
    el.add.classList.toggle('wait', Boolean(missing) || Boolean(unavailable));
    if (missing) el.add.textContent = SIZE_OPTION.test(missing.name) ? 'Scegli una taglia' : 'Scegli ' + optionLabel(missing).toLowerCase();
    else if (unavailable) el.add.textContent = 'Esaurito';
    else el.add.textContent = 'Aggiungi al carrello · ' + money(variant.price * state.qty);
  }

  function renderSimilar(product) {
    el.sim.hidden = true;
    el.simRail.innerHTML = '';
    el.simAll.href = product.collectionUrl || (shopRoot + 'collections/all');
    var token = state.token;
    loadSimilar(product).then(function (items) {
      if (!state || state.token !== token) return;
      var type = String(product.type || '').trim();
      var list = items
        .filter(function (item) { return item.id !== product.id && item.available !== false; })
        .map(function (item, order) {
          var sameType = type && String(item.type || '').trim().toLowerCase() === type.toLowerCase();
          return { item: item, score: (sameType ? 0 : 1) * 1e9 + order * 1e6 + Math.abs((item.price || 0) - (displayVariant().price || 0)) };
        })
        .sort(function (a, b) { return a.score - b.score; })
        .slice(0, 6)
        .map(function (entry) { return entry.item; });
      if (!list.length) return;
      var sameCount = list.filter(function (item) {
        return type && String(item.type || '').trim().toLowerCase() === type.toLowerCase();
      }).length;
      el.simTitle.textContent = sameCount >= 2 ? 'Altri ' + type.toLowerCase() : 'Potrebbe piacerti anche';
      el.simRail.innerHTML = list.map(function (item) {
        var onSale = item.compare_at_price > item.price;
        var percent = onSale ? Math.round((item.compare_at_price - item.price) / item.compare_at_price * 100) : 0;
        return '<button type="button" class="qs" data-qa-similar="' + escapeHtml(item.handle) + '" aria-label="Scegli opzioni: ' + escapeHtml(item.title) + '">'
          + '<span class="ph"><img src="' + escapeHtml(sizedImage(item.featured_image, 240)) + '" alt="" loading="lazy">'
          + (percent ? '<i>-' + percent + '%</i>' : '') + '</span>'
          + '<b class="' + (onSale ? 'sale' : '') + '">' + escapeHtml(money(item.price)) + '</b>'
          + '<small>' + escapeHtml(item.title) + '</small></button>';
      }).join('');
      el.sim.hidden = false;
    }).catch(function (error) {
      console.error(error);
    });
  }

  function fill(product, variantId) {
    state = {
      product: product,
      selected: initialSelection(product, variantId),
      qty: 1,
      error: '',
      token: Date.now() + Math.random()
    };
    el.title.textContent = product.title;
    renderOptions();
    paint();
    renderSimilar(product);
    el.back.hidden = history.length === 0;
    el.body.scrollTop = 0;
  }

  function swapTo(handle, variantId, pushCurrent) {
    if (busy) return;
    busy = true;
    dialog.classList.add('is-loading');
    loadProduct(handle).then(function (product) {
      if (pushCurrent && state) history.push({ handle: state.product.handle, variantId: (displayVariant() || {}).id });
      dialog.classList.add('is-swapping');
      window.setTimeout(function () {
        fill(product, variantId);
        dialog.classList.remove('is-swapping');
      }, 140);
    }).catch(function (error) {
      console.error(error);
      window.location.href = shopRoot + 'products/' + encodeURIComponent(handle);
    }).finally(function () {
      busy = false;
      dialog.classList.remove('is-loading');
    });
  }

  /* ---------- Ouverture / fermeture ---------- */
  function open(product, variantId) {
    window.clearTimeout(closeTimer);
    history = [];
    fill(product, variantId);
    if (!dialog.open) dialog.showModal();
    // Le défilement ne peut être remis à zéro qu'une fois la modale affichée.
    el.body.scrollTop = 0;
    document.documentElement.classList.add('mobile-quick-add-open');
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { dialog.classList.add('is-visible'); });
    });
  }

  function close() {
    if (!dialog.open) return;
    dialog.classList.remove('is-visible');
    document.documentElement.classList.remove('mobile-quick-add-open');
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(function () {
      if (dialog.open) dialog.close();
    }, 340);
  }

  /* ---------- Panier ---------- */
  function refreshCartCounts() {
    document.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
    if (typeof window.ajaxCart !== 'undefined' && typeof window.ajaxCart.refresh === 'function') window.ajaxCart.refresh();
    return fetch(shopRoot + 'cart.js', { credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) throw new Error('Cart request failed with status ' + response.status);
        return response.json();
      })
      .then(function (cart) {
        document.querySelectorAll('#cart-count, #cart-count--m, .mobile-home-cart-count').forEach(function (element) {
          element.textContent = String(cart.item_count);
          if (element.id === 'cart-count--m' || element.classList.contains('mobile-home-cart-count')) {
            element.hidden = cart.item_count <= 0;
          }
        });
      });
  }

  function addToCart() {
    var missing = missingOption();
    if (missing) {
      var group = el.options.querySelector('[data-qa-group="' + state.product.options.indexOf(missing) + '"] .qa-sizes, [data-qa-group="' + state.product.options.indexOf(missing) + '"] .qa-colors');
      if (group) {
        group.classList.remove('shake');
        void group.offsetWidth;
        group.classList.add('shake');
        group.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
      return;
    }
    var variant = selectedVariant();
    if (!variant || !variant.available || busy) return;
    busy = true;
    el.add.disabled = true;
    state.error = '';
    var quantity = state.qty;
    var summary = state.product.options
      .map(function (option, index) { return option.values.length > 1 ? state.selected[index] : null; })
      .filter(Boolean)
      .join(' · ');
    fetch(shopRoot + 'cart/add.js', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: [{ id: variant.id, quantity: quantity }] })
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok) throw new Error(data.description || data.message || 'Impossibile aggiungere al carrello');
        return data;
      });
    }).then(function () {
      close();
      showToast('Aggiunto: ' + (summary ? summary + ' × ' : '× ') + quantity);
      return refreshCartCounts().catch(function (error) { console.error(error); });
    }).catch(function (error) {
      console.error(error);
      state.error = error.message;
      paint();
    }).finally(function () {
      busy = false;
      el.add.disabled = false;
    });
  }

  /* ---------- Événements ---------- */
  function cardVariantId(button) {
    var card = button.closest('.alibaba-product-card, li');
    var wishlist = card && card.querySelector('.alibaba-card__wishlist[data-variant-id]');
    return wishlist ? wishlist.dataset.variantId : null;
  }

  // Préchargement dès le toucher, pour une ouverture instantanée.
  document.addEventListener('pointerdown', function (event) {
    var trigger = mobile.matches && event.target.closest && event.target.closest('[data-quick-add]');
    if (trigger) loadProduct(trigger.dataset.quickAdd).catch(function () {});
  }, { passive: true });

  // Phase de capture : le clic sur le bouton panier ne doit pas ouvrir la fiche produit de la carte.
  document.addEventListener('click', function (event) {
    var trigger = event.target.closest && event.target.closest('[data-quick-add]');
    if (!trigger || !mobile.matches) return;
    event.preventDefault();
    event.stopPropagation();
    if (trigger.classList.contains('is-loading')) return;
    trigger.classList.add('is-loading');
    loadProduct(trigger.dataset.quickAdd).then(function (product) {
      open(product, cardVariantId(trigger));
    }).catch(function (error) {
      console.error(error);
      var link = trigger.closest('li') && trigger.closest('li').querySelector('a[href*="/products/"]');
      if (link) window.location.href = link.href;
    }).finally(function () {
      trigger.classList.remove('is-loading');
    });
  }, true);

  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) {
      close();
      return;
    }
    if (event.target.closest('[data-qa-close]')) {
      close();
      return;
    }
    if (event.target.closest('[data-qa-back]')) {
      var previous = history.pop();
      if (previous) {
        swapTo(previous.handle, previous.variantId, false);
      }
      return;
    }
    var guide = event.target.closest('[data-qa-guide]');
    if (guide) {
      event.preventDefault();
      var expanded = el.guidePanel.hidden;
      el.guidePanel.hidden = !expanded;
      guide.setAttribute('aria-expanded', String(expanded));
      var group = guide.closest('.qa-grp');
      if (expanded && group) {
        group.after(el.guidePanel);
        el.guidePanel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
      return;
    }
    var optionButton = event.target.closest('[data-qa-option]');
    if (optionButton) {
      var index = Number(optionButton.dataset.qaOption);
      var name = optionButton.dataset.qaValueName;
      var option = state.product.options[index];
      state.error = '';
      if (!isColorOption(option) && state.selected[index] === name && option.values.length > 1) {
        state.selected[index] = null;
      } else {
        state.selected[index] = name;
      }
      // Changement de couleur : on retire les tailles devenues indisponibles.
      state.product.options.forEach(function (other, otherIndex) {
        if (otherIndex === index || state.selected[otherIndex] == null || other.values.length === 1) return;
        if (!isColorOption(other) && !valueAvailable(otherIndex, state.selected[otherIndex])) state.selected[otherIndex] = null;
      });
      paint();
      return;
    }
    var qtyButton = event.target.closest('[data-qa-qty]');
    if (qtyButton) {
      state.qty = Math.max(1, state.qty + Number(qtyButton.dataset.qaQty));
      paint();
      return;
    }
    var similar = event.target.closest('[data-qa-similar]');
    if (similar) {
      swapTo(similar.dataset.qaSimilar, null, true);
      return;
    }
    if (event.target.closest('[data-qa-add]')) addToCart();
  });

  // Une app d'étiquettes injecte ses badges ("New Arrivals"…) à côté des titres produit, avec un
  // style en ligne prioritaire : on les retire de la modale dès leur ajout.
  new MutationObserver(function () {
    dialog.querySelectorAll('[class*="dos-badge"]').forEach(function (badge) { badge.remove(); });
  }).observe(dialog, { childList: true, subtree: true });

  dialog.addEventListener('cancel', function (event) {
    event.preventDefault();
    close();
  });

  mobile.addEventListener('change', function () {
    if (!mobile.matches) close();
  });
})();
