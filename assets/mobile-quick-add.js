/* Quick add mobile — bouton panier des cartes produit + modale "Aggiungi al carrello".
   Données réelles : templates/product.quick-add.liquid (options, variantes, stock, guide des tailles)
   et Product Recommendations API (produits similaires). Ajout via /cart/add.js.
   Actif uniquement sous 760px : sur desktop le bouton n'est pas affiché (.mobile-only) et rien ne change. */
(function () {
  'use strict';

  var dialog = document.querySelector('[data-mobile-quick-add]');
  if (!dialog) return;

  var mobile = window.matchMedia('(max-width: 760px)');
  // Textes traduits (snippets/mobile-i18n.liquid, clés mobile.js.* des fichiers locales).
  var T = window.mobileT || function (key) { return key; };
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
  var detailsCache = new Map();
  var state = null;
  var history = [];
  var closeTimer = null;
  var openRequest = null;
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

  // Données de la boutique, disponibles tout de suite (attributs de la modale).
  var shop = {
    moneyFormat: dialog.dataset.moneyFormat || '€{{amount_with_comma_separator}}',
    klarna: dialog.hasAttribute('data-klarna'),
    country: dialog.dataset.country || '',
    freeShippingThreshold: 5000
  };

  function money(cents) {
    var format = shop.moneyFormat;
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

  /* ---------- Données ----------
     1) /products/<handle>.js (rapide, mis en cache par Shopify) : options, variantes, prix, disponibilité ;
     2) en parallèle, /products/<handle>?view=quick-add (plus lent) : stock réel, guide des tailles,
        pastilles de couleur, collection — ajoutés à la modale dès qu'ils arrivent. */
  function fromProductJson(data) {
    return {
      id: data.id,
      handle: data.handle,
      title: data.title,
      url: data.url || shopRoot + 'products/' + data.handle,
      type: data.type || '',
      image: data.featured_image || null,
      collectionUrl: '',
      sizeChart: null,
      detailed: false,
      options: (data.options || []).map(function (option) {
        return {
          name: option.name,
          values: option.values.map(function (value) { return { name: value, color: null, image: null }; })
        };
      }),
      variants: data.variants.map(function (variant) {
        return {
          id: variant.id,
          title: variant.title,
          options: variant.options,
          available: variant.available,
          price: variant.price,
          compareAtPrice: variant.compare_at_price || 0,
          quantity: null,
          image: variant.featured_image ? variant.featured_image.src : null
        };
      })
    };
  }

  function addDetails(product, details) {
    product.options.forEach(function (option, index) {
      var detailed = details.options[index];
      if (!detailed) return;
      option.values.forEach(function (value) {
        var match = detailed.values.find(function (item) { return item.name === value.name; });
        if (match) {
          value.color = match.color;
          value.image = match.image;
        }
      });
    });
    product.variants.forEach(function (variant) {
      var match = details.variants.find(function (item) { return item.id === variant.id; });
      if (match) variant.quantity = match.quantity;
    });
    product.sizeChart = details.sizeChart;
    product.collectionUrl = details.collectionUrl;
    product.detailed = true;
  }

  function fetchJson(url, label) {
    return fetch(url, { credentials: 'same-origin' }).then(function (response) {
      if (!response.ok) throw new Error(label + ' request failed with status ' + response.status + ' for ' + url);
      return response.text();
    }).then(function (text) { return JSON.parse(text); });
  }

  // Données de base (rapides) : préchargées pour les cartes visibles.
  function loadBase(handle) {
    if (!dataCache.has(handle)) {
      var base = fetchJson(shopRoot + 'products/' + encodeURIComponent(handle) + '.js', 'Product').then(fromProductJson);
      base.catch(function () { dataCache.delete(handle); });
      dataCache.set(handle, base);
    }
    return dataCache.get(handle);
  }

  // Détails (plus lents) : chargés seulement à l'intention d'ouvrir (survol, toucher, clic).
  function loadProduct(handle) {
    var base = loadBase(handle);
    if (!detailsCache.has(handle)) {
      var details = fetchJson(shopRoot + 'products/' + encodeURIComponent(handle) + '?view=quick-add', 'Quick add details');
      detailsCache.set(handle, details);
      Promise.all([base, details]).then(function (results) {
        addDetails(results[0], results[1]);
        // Modale déjà ouverte sur ce produit : on complète sans perdre la sélection.
        if (state && state.product === results[0]) {
          renderOptions();
          paint();
          el.simAll.href = results[0].collectionUrl || (shopRoot + 'collections/all');
        }
      }).catch(function (error) {
        detailsCache.delete(handle);
        console.error(error);
      });
    }
    return base;
  }

  // Préchargement des cartes proches de l'écran, deux requêtes à la fois, quand le navigateur est libre.
  var prefetchQueue = [];
  var prefetchRunning = 0;
  function runPrefetch() {
    while (prefetchRunning < 2 && prefetchQueue.length) {
      var handle = prefetchQueue.shift();
      if (dataCache.has(handle)) continue;
      prefetchRunning += 1;
      loadBase(handle).catch(function () {}).then(function () {
        prefetchRunning -= 1;
        schedulePrefetch();
      });
    }
  }
  function schedulePrefetch() {
    if (!prefetchQueue.length) return;
    if ('requestIdleCallback' in window) window.requestIdleCallback(runPrefetch, { timeout: 1500 });
    else window.setTimeout(runPrefetch, 200);
  }
  var visibleObserver = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      visibleObserver.unobserve(entry.target);
      var handle = entry.target.dataset.quickAdd;
      if (mobile.matches && handle && !dataCache.has(handle) && prefetchQueue.indexOf(handle) === -1) prefetchQueue.push(handle);
    });
    schedulePrefetch();
  }, { rootMargin: '200px 0px' }) : null;
  function observeCards(root) {
    if (!visibleObserver || !mobile.matches) return;
    (root || document).querySelectorAll('[data-quick-add]:not([data-qa-observed])').forEach(function (button) {
      button.setAttribute('data-qa-observed', '');
      visibleObserver.observe(button);
    });
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
    if (isColorOption(option)) return T('color');
    if (SIZE_OPTION.test(option.name)) return T('size');
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
          guide = '<a href="#" class="qa-guide" data-qa-guide aria-expanded="false">' + T('size_guide') + '</a>';
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
        button.title = available ? name : name + ' — ' + T('sold_out');
      } else {
        button.disabled = !available && !checked;
        button.title = available ? '' : T('sold_out');
      }
    });
    el.options.querySelectorAll('[data-qa-value]').forEach(function (label) {
      var index = Number(label.dataset.qaValue);
      label.textContent = state.selected[index] || T('choose');
    });

    // En-tête : image, prix (barré + -%), stock réel.
    el.image.src = sizedImage(variant.image || product.image, 240);
    el.image.alt = product.title;
    var onSale = variant.compareAtPrice > variant.price;
    var percent = onSale ? Math.round((variant.compareAtPrice - variant.price) / variant.compareAtPrice * 100) : 0;
    el.price.innerHTML = '<b class="' + (onSale ? 'sale' : '') + '">' + escapeHtml(money(variant.price)) + '</b>'
      + (onSale ? '<s>' + escapeHtml(money(variant.compareAtPrice)) + '</s><span class="pct">-' + percent + '%</span>' : '');

    var stockText = T('in_stock');
    var stockClass = '';
    if (exact && !exact.available) {
      stockText = T('sold_out');
      stockClass = 'out';
    } else if (exact && exact.quantity != null && exact.quantity > 0 && exact.quantity <= LOW_STOCK) {
      stockText = exact.quantity === 1 ? T('only_one_left') : T('only_n_left', { count: exact.quantity });
      stockClass = 'low';
    } else if (!exact && !product.variants.some(function (item) { return item.available; })) {
      stockText = T('sold_out');
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
    var freeShipping = variant.price > shop.freeShippingThreshold;
    el.free.hidden = !freeShipping;
    el.free.textContent = (flagEmoji(shop.country) + ' ' + T('free_shipping_short')).trim();
    el.klarna.hidden = !shop.klarna;
    el.klarnaValue.textContent = money(Math.round(variant.price / 3));

    el.more.href = product.url;

    // Bouton principal.
    var unavailable = exact && !exact.available;
    el.add.classList.toggle('wait', Boolean(missing) || Boolean(unavailable));
    if (missing) el.add.textContent = SIZE_OPTION.test(missing.name) ? T('choose_size') : T('choose_option', { option: optionLabel(missing).toLowerCase() });
    else if (unavailable) el.add.textContent = T('sold_out');
    else el.add.textContent = T('add_to_cart_total', { price: money(variant.price * state.qty) });
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
      el.simTitle.textContent = sameCount >= 2 ? T('more_of_type', { type: type.toLowerCase() }) : T('you_may_like');
      el.simRail.innerHTML = list.map(function (item) {
        var onSale = item.compare_at_price > item.price;
        var percent = onSale ? Math.round((item.compare_at_price - item.price) / item.compare_at_price * 100) : 0;
        return '<button type="button" class="qs" data-qa-similar="' + escapeHtml(item.handle) + '" aria-label="' + escapeHtml(T('choose_options_for', { title: item.title })) + '">'
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
    dialog.classList.remove('is-pending');
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
  function showDialog() {
    window.clearTimeout(closeTimer);
    if (!dialog.open) dialog.showModal();
    // Le défilement ne peut être remis à zéro qu'une fois la modale affichée.
    el.body.scrollTop = 0;
    document.documentElement.classList.add('mobile-quick-add-open');
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { dialog.classList.add('is-visible'); });
    });
  }

  // Ouverture instantanée : photo, titre et prix déjà présents sur la carte, options en chargement.
  function showCardPreview(trigger) {
    var card = trigger.closest('li') || trigger.parentElement;
    var image = card.querySelector('.alibaba-card__picture img, img');
    var titleLink = card.querySelector('.alibaba-card__title a, a[href*="/products/"]');
    var wishlist = card.querySelector('.alibaba-card__wishlist[data-price-cents]');
    var price = wishlist ? Number(wishlist.dataset.priceCents) : 0;
    var compare = wishlist ? Number(wishlist.dataset.compareAtPriceCents) : 0;
    var onSale = compare > price;
    state = null;
    dialog.classList.add('is-pending');
    el.title.textContent = titleLink ? titleLink.textContent.trim() : '';
    el.image.src = image ? image.currentSrc || image.src : '';
    el.price.innerHTML = price
      ? '<b class="' + (onSale ? 'sale' : '') + '">' + escapeHtml(money(price)) + '</b>'
        + (onSale ? '<s>' + escapeHtml(money(compare)) + '</s><span class="pct">-' + Math.round((compare - price) / compare * 100) + '%</span>' : '')
      : '';
    el.stock.textContent = '';
    el.stock.className = 'qa-stock';
    el.options.innerHTML = '<div class="qa-skel" aria-hidden="true"><i></i><i></i><i></i><i></i></div>';
    el.guidePanel.hidden = true;
    el.qtyValue.textContent = '1';
    el.free.hidden = true;
    el.klarna.hidden = true;
    el.sim.hidden = true;
    el.back.hidden = true;
    el.more.href = titleLink ? titleLink.href : '#';
    el.add.textContent = T('loading_short');
    el.add.classList.add('wait');
  }

  function openFromCard(trigger) {
    var handle = trigger.dataset.quickAdd;
    var variantId = cardVariantId(trigger);
    var token = {};
    openRequest = token;
    history = [];
    showCardPreview(trigger);
    showDialog();
    // Si le produit est déjà en cache, la promesse est résolue avant l'affichage : pas d'aperçu visible.
    loadProduct(handle).then(function (product) {
      if (openRequest !== token || !dialog.open) return;
      openRequest = null;
      fill(product, variantId);
    }).catch(function (error) {
      console.error(error);
      if (openRequest !== token) return;
      openRequest = null;
      close();
      if (el.more.href && el.more.href.slice(-1) !== '#') window.location.href = el.more.href;
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
  function increaseCartCounts(quantity) {
    document.querySelectorAll('#cart-count, #cart-count--m, .mobile-home-cart-count').forEach(function (element) {
      var next = (parseInt(element.textContent, 10) || 0) + quantity;
      element.textContent = String(next);
      if (element.id === 'cart-count--m' || element.classList.contains('mobile-home-cart-count')) element.hidden = next <= 0;
    });
  }

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
    var handle = state.product.handle;
    // Ajout au panier dès le clic ; la modale se ferme pendant que la vignette s'envole vers le panier.
    var request = fetch(shopRoot + 'cart/add.js', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: [{ id: variant.id, quantity: quantity }] })
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok) throw new Error(data.description || data.message || T('cart_add_error'));
        return data;
      });
    });
    var flight = new Promise(function (resolve) { flyToCart(el.image, resolve); });
    close();
    // Le compteur n'augmente qu'à l'arrivée de la vignette (et une fois l'ajout confirmé) ;
    // le panier complet est ensuite resynchronisé en arrière-plan.
    Promise.all([request, flight]).then(function () {
      increaseCartCounts(quantity);
      refreshCartCounts().catch(function (error) { console.error(error); });
      bumpCart();
      markAdded(handle);
      showToast('Aggiunto: ' + (summary ? summary + ' × ' : '× ') + quantity);
    }).catch(function (error) {
      console.error(error);
      showToast(error.message || T('cart_add_error'));
    }).finally(function () {
      busy = false;
      el.add.disabled = false;
    });
  }

  /* ---------- Animation "fly to cart" (comme le prototype : arc, rotation, rebond du panier) ---------- */
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Courbe de Bézier cubique (équivalent de l'ease [.5, .02, .25, 1] du prototype).
  function cubicBezier(x1, y1, x2, y2) {
    function sample(a1, a2, t) { return ((1 - 3 * a2 + 3 * a1) * t + (3 * a2 - 6 * a1)) * t * t + 3 * a1 * t; }
    return function (x) {
      var low = 0;
      var high = 1;
      var t = x;
      for (var i = 0; i < 20; i += 1) {
        t = (low + high) / 2;
        if (sample(x1, x2, t) < x) low = t;
        else high = t;
      }
      return sample(y1, y2, t);
    };
  }
  var flyEase = cubicBezier(0.5, 0.02, 0.25, 1);

  // Icône Carrello de la barre du bas, sinon celle du header mobile.
  function cartTarget() {
    var candidates = [
      document.querySelector('#cart-count--m'),
      document.querySelector('.mobile-home-cart-count')
    ];
    for (var i = 0; i < candidates.length; i += 1) {
      var badge = candidates[i];
      var icon = badge && badge.parentElement && badge.parentElement.querySelector('svg');
      if (icon && icon.getBoundingClientRect().width > 0) return icon;
    }
    return null;
  }

  function flyToCart(sourceImage, done) {
    var target = cartTarget();
    var source = sourceImage && sourceImage.getBoundingClientRect();
    if (!target || !source || !source.width || reducedMotion.matches) {
      done();
      return;
    }
    var end = target.getBoundingClientRect();
    var fly = document.createElement('img');
    fly.src = sourceImage.currentSrc || sourceImage.src;
    fly.alt = '';
    fly.className = 'mobile-quick-add-fly';
    fly.style.left = source.left + 'px';
    fly.style.top = source.top + 'px';
    fly.style.width = source.width + 'px';
    fly.style.height = source.height + 'px';
    document.body.appendChild(fly);
    // En popover, la vignette passe au-dessus de la modale qui se ferme.
    if (typeof fly.showPopover === 'function') {
      fly.setAttribute('popover', 'manual');
      try { fly.showPopover(); } catch (error) { console.error(error); }
    }
    var sx = source.left + source.width / 2;
    var sy = source.top + source.height / 2;
    var ex = end.left + end.width / 2;
    var ey = end.top + end.height / 2;
    var cx = (sx + ex) / 2 + (ex < sx ? -30 : 30);
    var cy = Math.min(sy, ey) - 170;
    var endScale = 26 / source.width;
    var duration = 950;
    // Horloge réelle (performance.now) : l'horodatage de la première image peut dater d'avant le clic.
    var start = null;
    function frame() {
      var now = performance.now();
      if (start === null) start = now;
      var linear = Math.min(1, (now - start) / duration);
      var p = flyEase(linear);
      var u = 1 - p;
      var x = u * u * sx + 2 * u * p * cx + p * p * ex;
      var y = u * u * sy + 2 * u * p * cy + p * p * ey;
      var scale = 1 + (endScale - 1) * Math.pow(p, 0.7);
      fly.style.transform = 'translate(' + (x - sx) + 'px,' + (y - sy) + 'px) scale(' + scale + ') rotate(' + p * 260 + 'deg)';
      fly.style.borderRadius = (12 + (source.width / 2 - 12) * Math.min(1, p * 2.2)) + 'px';
      fly.style.opacity = p > 0.9 ? String(Math.max(0, 1 - (p - 0.9) * 6)) : '1';
      if (linear < 1) {
        window.requestAnimationFrame(frame);
      } else {
        fly.remove();
        done();
      }
    }
    window.requestAnimationFrame(frame);
  }

  // Petit rebond du panier et de sa pastille à l'arrivée.
  function bumpCart() {
    if (reducedMotion.matches) return;
    var icon = cartTarget();
    if (icon && typeof icon.animate === 'function') {
      icon.animate([
        { transform: 'scale(1) rotate(0deg)' },
        { transform: 'scale(1.45) rotate(-12deg)' },
        { transform: 'scale(0.9) rotate(8deg)' },
        { transform: 'scale(1) rotate(0deg)' }
      ], { duration: 550, easing: 'ease-out' });
    }
    document.querySelectorAll('#cart-count--m, .mobile-home-cart-count').forEach(function (badge) {
      if (!badge.hidden && typeof badge.animate === 'function') {
        badge.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.7)' }, { transform: 'scale(1)' }], { duration: 450, easing: 'ease-out' });
      }
    });
  }

  // Bouton panier de la carte : coche verte pendant 2,4 s.
  function markAdded(handle) {
    document.querySelectorAll('[data-quick-add]').forEach(function (button) {
      if (button.dataset.quickAdd !== handle) return;
      button.classList.add('is-added');
      window.clearTimeout(button._qaAddedTimer);
      button._qaAddedTimer = window.setTimeout(function () { button.classList.remove('is-added'); }, 2400);
    });
  }

  /* ---------- Événements ---------- */
  function cardVariantId(button) {
    var card = button.closest('.alibaba-product-card, li');
    var wishlist = card && card.querySelector('.alibaba-card__wishlist[data-variant-id]');
    return wishlist ? wishlist.dataset.variantId : null;
  }

  // Préchargement : au survol de la carte (souris) ou dès le toucher du bouton (tactile).
  function prefetch(event) {
    if (!mobile.matches || !event.target.closest) return;
    var trigger = event.target.closest('[data-quick-add]');
    if (!trigger && event.pointerType === 'mouse') {
      var card = event.target.closest('li.alibaba-product-card');
      trigger = card && card.querySelector('[data-quick-add]');
    }
    if (trigger) loadProduct(trigger.dataset.quickAdd).catch(function () {});
  }
  document.addEventListener('pointerover', prefetch, { passive: true });
  document.addEventListener('pointerdown', prefetch, { passive: true });

  // Phase de capture : le clic sur le bouton panier ne doit pas ouvrir la fiche produit de la carte.
  document.addEventListener('click', function (event) {
    var trigger = event.target.closest && event.target.closest('[data-quick-add]');
    if (!trigger || !mobile.matches) return;
    event.preventDefault();
    event.stopPropagation();
    openFromCard(trigger);
  }, true);

  // Photo de la carte : sur mobile elle ouvre la fiche produit, comme le titre (le cœur et le panier gardent leur action).
  document.addEventListener('click', function (event) {
    if (!mobile.matches || event.defaultPrevented || event.button !== 0 || !event.target.closest) return;
    var media = event.target.closest('li.alibaba-product-card .alibaba-card__media');
    if (!media || event.target.closest('a, button, label, input, [data-quick-add]')) return;
    var link = media.closest('li').querySelector('.alibaba-card__title a[href]');
    if (link) link.click();
  });

  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) {
      close();
      return;
    }
    if (event.target.closest('[data-qa-close]')) {
      close();
      return;
    }
    // Options encore en chargement : rien d'autre n'est actif.
    if (!state) return;
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
    else observeCards();
  });

  // Cartes visibles : préchargées ; nouvelles cartes (défilement infini, filtres) : observées à leur arrivée.
  observeCards();
  var observeTimer = null;
  new MutationObserver(function () {
    if (observeTimer) return;
    observeTimer = window.setTimeout(function () {
      observeTimer = null;
      observeCards();
    }, 300);
  }).observe(document.body, { childList: true, subtree: true });
})();
