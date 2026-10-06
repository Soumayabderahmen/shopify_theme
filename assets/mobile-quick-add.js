/* Quick add mobile — bouton panier des cartes produit + modale "Aggiungi al carrello" v2 (prototype "Modale quick add v2").
   Données réelles : templates/product.quick-add.liquid (options, variantes, stock, guide des tailles)
   et Product Recommendations API (produits similaires, "Completa il look"). Ajout via /cart/add.js, total via /cart.js.
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
  var scrim = document.querySelector('[data-qa-scrim]');
  function $(selector) { return dialog.querySelector(selector); }
  var el = {
    drag: $('[data-qa-drag]'),
    back: $('[data-qa-back]'),
    mini: $('[data-qa-mini]'),
    miniImage: $('[data-qa-mini-image]'),
    miniPrice: $('[data-qa-mini-price]'),
    miniSelection: $('[data-qa-mini-selection]'),
    scroll: $('[data-qa-scroll]'),
    pick: $('[data-qa-pick]'),
    hero: $('[data-qa-hero]'),
    image: $('[data-qa-image]'),
    tag: $('[data-qa-tag]'),
    fav: $('[data-qa-fav]'),
    price: $('[data-qa-price]'),
    save: $('[data-qa-save]'),
    title: $('[data-qa-title]'),
    stock: $('[data-qa-stock]'),
    more: $('[data-qa-more]'),
    options: $('[data-qa-options]'),
    free: $('[data-qa-free]'),
    klarna: $('[data-qa-klarna]'),
    klarnaValue: $('[data-qa-klarna-value]'),
    sim: $('[data-qa-sim]'),
    simTitle: $('[data-qa-sim-title]'),
    simAll: $('[data-qa-sim-all]'),
    simRail: $('[data-qa-sim-rail]'),
    done: $('[data-qa-done]'),
    doneSummary: $('[data-qa-done-summary]'),
    doneImage: $('[data-qa-done-image]'),
    doneTitle: $('[data-qa-done-title]'),
    doneOptions: $('[data-qa-done-options]'),
    donePrice: $('[data-qa-done-price]'),
    goal: $('[data-qa-goal]'),
    goalText: $('[data-qa-goal-text]'),
    goalProgress: $('[data-qa-goal-progress]'),
    goalBar: $('[data-qa-goal-bar]'),
    goCart: $('[data-qa-go-cart]'),
    look: $('[data-qa-look]'),
    lookRail: $('[data-qa-look-rail]'),
    foot: $('[data-qa-foot]'),
    qtyValue: $('[data-qa-qty-value]'),
    qtyMinus: $('[data-qa-qty="-1"]'),
    qtyPlus: $('[data-qa-qty="1"]'),
    add: $('[data-qa-add]')
  };

  var COLOR_OPTION = /colou?r|colore|colori|farbe|couleur|kleur/i;
  var SIZE_OPTION = /size|taglia|taglie|dimensione|misura|numero|talla|taille|gr(ö|oe)(ss|ß)e|maat/i;
  var DEFAULT_TITLE = 'Default Title';
  var MAX_QTY = 10;
  var LOW_STOCK = 5;
  var COLORS_VISIBLE = 5;
  // Ordre des tailles de vêtements (XXL = 2XL, XXXL = 3XL…).
  var SIZE_RANK = {
    XXXS: -1, XXS: 0, XS: 1, S: 2, M: 3, L: 4, XL: 5, XXL: 6, '2XL': 6, XXXL: 7, '3XL': 7,
    XXXXL: 8, '4XL': 8, XXXXXL: 9, '5XL': 9, '6XL': 10, '7XL': 11
  };
  var ERROR_ICON = '<svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="9"></circle><path d="M12 7.5v5.5M12 16.5v.01"></path></svg>';
  var CHEVRON_ICON = '<svg class="cv" aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="m6 9 6 6 6-6"></path></svg>';
  var RULER_ICON = '<svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M3 8h18v8H3z"></path><path d="M7 8v3M11 8v4M15 8v3M19 8v4"></path></svg>';
  var PLUS_ICON = '<svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M12 5v14M5 12h14"></path></svg>';

  /* Noms de couleurs courants (italien / anglais) -> pastille unie quand la variante n'a pas de photo. */
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
  // Produits déjà arrivés, lisibles sans attendre une promesse (ouverture en une seule passe d'affichage).
  var readyProducts = new Map();
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
    freeShipping: Number(dialog.dataset.freeShipping) || 0,
    allUrl: dialog.dataset.allUrl || (shopRoot + 'collections/all')
  };

  function money(cents) {
    return shop.moneyFormat.replace(/\{\{\s*(\w+)\s*\}\}/, function (match, key) {
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

  function colorFromName(name) {
    var lower = String(name || '').toLowerCase().trim();
    if (COLOR_NAMES[lower]) return COLOR_NAMES[lower];
    for (var i = 0; i < COLOR_KEYS.length; i += 1) {
      if (new RegExp('(^|[^a-zà-ù])' + COLOR_KEYS[i] + '([^a-zà-ù]|$)').test(lower)) return COLOR_NAMES[COLOR_KEYS[i]];
    }
    return null;
  }

  /* Performance : sur les pages de collection (≈ 13 000 éléments et les nombreux :has() du thème), chaque calcul
     de mise en page de la page coûte ≈ 0,1 s. Donc :
     - fond, feuille et toast en popover (couche supérieure : quelques ms) au lieu de showModal() / blocage de <html> ;
     - animations par element.animate() (pas de offsetWidth) ;
     - défilement remis à zéro seulement s'il a bougé (lire ou écrire scrollTop force la mise en page). */
  var hasPopover = typeof dialog.showPopover === 'function';
  function setLayer(element, show) {
    if (!hasPopover || !element) return;
    var open = element.matches(':popover-open');
    if (show && !open) element.showPopover();
    else if (!show && open) element.hidePopover();
  }

  function showToast(message) {
    if (!toastElement) return;
    toastElement.textContent = message;
    // Ré-affiché à chaque fois : passe au-dessus de la feuille dans la couche supérieure.
    setLayer(toastElement, false);
    setLayer(toastElement, true);
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { toastElement.classList.add('is-visible'); });
    });
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastElement.classList.remove('is-visible');
      toastTimer = window.setTimeout(function () { setLayer(toastElement, false); }, 260);
    }, 2400);
  }

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function play(element, keyframes, duration) {
    if (reducedMotion.matches || typeof element.animate !== 'function') return;
    element.animate(keyframes, { duration: duration, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
  }

  // Écritures seulement si la valeur change : chaque modification du DOM relance le calcul de style de la page.
  function setText(node, value) {
    if (node.textContent !== value) node.textContent = value;
  }
  function setHTML(node, html) {
    if (node.qaHtml !== html) {
      node.qaHtml = html;
      node.innerHTML = html;
    }
  }

  var scrolled = false;
  function resetScroll() {
    if (!scrolled) return;
    el.scroll.scrollTop = 0;
    scrolled = false;
    el.mini.classList.remove('is-shown');
  }

  /* Libellés bruts des tailles : "XL fit 174-183CM" -> { code: "XL", lo: 174, hi: 183 } (hauteur, sert à « Trova la tua
     taglia ») ; "XL 65KG-75KG", "L 55-65kg" -> { code: "XL", kg: "65–75" } (poids : affiché et trié, pas de calcul). */
  // "Asian L 61-70KG", "2XL-75-82KG", "175-L(45-55KG", "M (160cm 50-60kg)" : les mots autour de la taille ne sont pas
  // la taille ; une hauteur à 3 chiffres est gardée (« 160 cm ») ; sans taille unique, libellé d'origine.
  // Aucune donnée perdue : tous les nombres du libellé restent affichés, et le bouton garde la valeur complète.
  function parseSize(raw) {
    var text = String(raw).trim();
    var match = text.match(/\(?\s*(\d{2,3}(?:[.,]\d)?)\s*(kg|cm)?\s*[-–]\s*(\d{2,3}(?:[.,]\d)?)\s*(kg|cm)\s*\)?$/i);
    if (!match) return { raw: raw, code: raw };
    var height = '';
    var words = text.slice(0, match.index).replace(/\b(?:fit|asian|asia|chn|china|size|taglia|height|weight)\b/gi, ' ')
      .split(/[\s\-–(),:]+/).filter(function (word) {
        var cm = !height && word.match(/^(\d{3})(?:cm)?$/i);
        if (cm) height = cm[1] + ' cm';
        return word && !cm;
      });
    if (words.length !== 1) return { raw: raw, code: raw };
    var size = { raw: raw, code: words[0].toUpperCase() };
    if ((match[4] || match[2]).toLowerCase() === 'cm') {
      if (height) return { raw: raw, code: raw };
      size.lo = Number(match[1].replace(',', '.'));
      size.hi = Number(match[3].replace(',', '.'));
    } else {
      size.kg = match[1] + '–' + match[3] + ' kg' + (height ? ' · ' + height : '');
    }
    return size;
  }

  // XXL = 2XL… ; au-delà de 7XL (8XL, 10XL, 14XL) : même suite.
  function sizeRank(code) {
    var upper = String(code).toUpperCase();
    var rank = SIZE_RANK[upper];
    if (rank !== undefined) return rank;
    var many = upper.match(/^(\d{1,2})XL$/);
    return many ? 4 + Number(many[1]) : null;
  }

  // Tri S → M → L → XL → XXL, ou numérique (pointures « 38. », « EU:38 », longueurs) ; sinon l'ordre de la boutique.
  function sortSizes(values) {
    return values.map(function (value) { return parseSize(value.name); }).sort(function (a, b) {
      var rankA = sizeRank(a.code);
      var rankB = sizeRank(b.code);
      if (rankA !== null && rankB !== null) return rankA - rankB;
      var numberA = String(a.code).match(/\d+(?:[.,]\d+)?/);
      var numberB = String(b.code).match(/\d+(?:[.,]\d+)?/);
      if (numberA && numberB && String(a.code).replace(numberA[0], '#').toUpperCase() === String(b.code).replace(numberB[0], '#').toUpperCase()) {
        return parseFloat(numberA[0].replace(',', '.')) - parseFloat(numberB[0].replace(',', '.'));
      }
      return 0;
    });
  }

  /* ---------- Données ----------
     1) /products/<handle>.js (rapide, mis en cache par Shopify) : options, variantes, prix, disponibilité, photos ;
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
      base.then(function (product) { readyProducts.set(handle, product); }, function () { dataCache.delete(handle); });
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
          renderOptions(true);
          paint();
          el.simAll.href = results[0].collectionUrl || shop.allUrl;
        }
      }).catch(function (error) {
        detailsCache.delete(handle);
        console.error(error);
      });
    }
    return base;
  }

  // Préchargement des cartes proches de l'écran (600px avant), trois requêtes à la fois, quand le navigateur est libre :
  // un produit pas encore en cache chez Shopify met jusqu'à 3 s à répondre, il doit être prêt avant le tap.
  var prefetchQueue = [];
  var prefetchRunning = 0;
  function runPrefetch() {
    while (prefetchRunning < 3 && prefetchQueue.length) {
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
  }, { rootMargin: '600px 0px' }) : null;
  function observeCards(root) {
    if (!visibleObserver || !mobile.matches) return;
    (root || document).querySelectorAll('[data-quick-add]:not([data-qa-observed])').forEach(function (button) {
      button.setAttribute('data-qa-observed', '');
      visibleObserver.observe(button);
    });
  }

  function loadRecommendations(product, intent) {
    var base = dialog.dataset.recommendationsUrl || (shopRoot + 'recommendations/products');
    return fetch(base + '.json?product_id=' + encodeURIComponent(product.id) + '&limit=10&intent=' + intent, { credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) throw new Error('Recommendations request failed with status ' + response.status);
        return response.json();
      })
      .then(function (data) {
        return (data.products || []).filter(function (item) { return item.id !== product.id && item.available !== false; });
      });
  }

  /* ---------- Sélection ---------- */
  // Produit sans variantes : une seule option "Title" avec la valeur "Default Title".
  function hasOptions(product) {
    var options = product.options;
    return !(options.length === 1 && options[0].values.length === 1 && options[0].values[0].name === DEFAULT_TITLE);
  }

  // Option affichée en vignettes : la première option couleur du produit.
  function colorIndexOf(product) {
    if (!hasOptions(product)) return -1;
    for (var index = 0; index < product.options.length; index += 1) {
      if (COLOR_OPTION.test(product.options[index].name)) return index;
    }
    return -1;
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

  // Prix affiché tant que la taille n'est pas choisie : le moins cher des choix possibles (comme la carte).
  function priceVariant() {
    var exact = selectedVariant();
    if (exact) return exact;
    var candidates = state.product.variants.filter(function (variant) { return variant.available && matches(variant, state.selected, -1); });
    if (!candidates.length) return displayVariant();
    return candidates.reduce(function (cheapest, variant) { return variant.price < cheapest.price ? variant : cheapest; });
  }

  function valueAvailable(optionIndex, value) {
    return state.product.variants.some(function (variant) {
      return variant.available && variant.options[optionIndex] === value && matches(variant, state.selected, optionIndex);
    });
  }

  // Couleur grisée seulement si plus aucune variante de cette couleur n'est en stock.
  function colorAvailable(value) {
    return state.product.variants.some(function (variant) {
      return variant.available && variant.options[state.colorIndex] === value;
    });
  }

  function initialSelection(product, variantId, colorIndex) {
    if (!hasOptions(product)) return product.options.map(function (option) { return option.values[0].name; });
    var selected = product.options.map(function () { return null; });
    var start = product.variants.find(function (variant) { return String(variant.id) === String(variantId) && variant.available; })
      || product.variants.find(function (variant) { return variant.available; })
      || product.variants[0];
    product.options.forEach(function (option, index) {
      // Couleur : celle de la carte ; options à une seule valeur : sélectionnées d'office ; tailles : au choix du client.
      if (option.values.length === 1) selected[index] = option.values[0].name;
      else if (index === colorIndex && start) selected[index] = start.options[index];
    });
    return selected;
  }

  function missingIndex() {
    for (var index = 0; index < state.selected.length; index += 1) {
      if (state.selected[index] == null) return index;
    }
    return -1;
  }

  function optionLabel(option) {
    if (COLOR_OPTION.test(option.name)) return T('color');
    if (SIZE_OPTION.test(option.name)) return T('size');
    return option.name;
  }

  function isSizeOption(index) {
    return index !== state.colorIndex && SIZE_OPTION.test(state.product.options[index].name);
  }

  function sizeInfo(index, raw) {
    var list = state.sizes[index];
    return (list && list.find(function (size) { return size.raw === raw; })) || parseSize(raw);
  }

  // Valeurs choisies, dans l'ordre d'affichage (couleur, taille…).
  function selectionParts(withSizeWord) {
    var product = state.product;
    if (!hasOptions(product)) return [];
    return state.order.map(function (index) {
      var value = state.selected[index];
      if (value == null || product.options[index].values.length === 1) return null;
      if (index === state.colorIndex) return value;
      var code = sizeInfo(index, value).code;
      return withSizeWord && isSizeOption(index) ? T('qa_size_value', { size: code }) : code;
    }).filter(Boolean);
  }

  /* ---------- Rendu ---------- */
  function swatchMarkup(index, value) {
    var withImage = state.product.variants.find(function (variant) {
      return variant.options[index] === value.name && variant.image;
    });
    var image = withImage ? sizedImage(withImage.image, 120) : (value.image || '');
    if (image) return '<span class="im"><img src="' + escapeHtml(image) + '" alt="" loading="lazy" width="56" height="56"></span>';
    var color = value.color || colorFromName(value.name);
    return '<span class="im flat"' + (color ? ' style="--sw:' + escapeHtml(color) + '"' : '') + '></span>';
  }

  function colorGroup(index) {
    var option = state.product.options[index];
    var count = option.values.length;
    var html = '<div class="qa-grp" data-qa-group="' + index + '">'
      + '<div class="qa-lbl"><span>' + escapeHtml(optionLabel(option)) + '</span><b data-qa-value="' + index + '"></b>'
      + (count > 1 ? '<span class="qa-cnt">' + escapeHtml(T('qa_colors_count', { count: count })) + '</span>' : '')
      + (count > COLORS_VISIBLE ? '<button type="button" class="qa-link" data-qa-cols aria-expanded="false"><span>' + escapeHtml(T('qa_see_all')) + '</span>' + CHEVRON_ICON + '</button>' : '')
      + '</div><div class="qa-cols" data-qa-cols-list role="radiogroup" aria-label="' + escapeHtml(optionLabel(option)) + '">';
    option.values.forEach(function (value) {
      html += '<button type="button" class="qa-sw" role="radio" aria-checked="false" aria-label="' + escapeHtml(value.name) + '"'
        + ' data-qa-option="' + index + '" data-qa-value-name="' + escapeHtml(value.name) + '">'
        + swatchMarkup(index, value) + '<small aria-hidden="true">' + escapeHtml(value.name) + '</small></button>';
    });
    return html + '</div>' + errorMarkup(index) + '</div>';
  }

  function sizeGroup(index, withFit, withGuide) {
    var option = state.product.options[index];
    var sizes = sortSizes(option.values);
    state.sizes[index] = sizes;
    var numeric = sizes.every(function (size) { return !size.lo && /^\d+([.,]\d+)?$/.test(size.code); });
    var wide = sizes.some(function (size) { return String(size.code).length > 6; });
    var layout = sizes.length === 1 ? ' one' : wide ? ' wide' : numeric ? ' num' : '';
    var label = optionLabel(option);
    var link = '';
    var extra = '';
    if (withFit) {
      link = '<button type="button" class="qa-link" data-qa-fit-toggle aria-expanded="false">' + RULER_ICON + '<span>' + escapeHtml(T('qa_find_size')) + '</span></button>';
      extra = '<div class="qa-fit" data-qa-fit><div inert><div class="box">'
        + '<label>' + escapeHtml(T('qa_your_height'))
        + '<input type="number" inputmode="numeric" min="100" max="230" placeholder="170" data-qa-height>cm</label>'
        + '<p data-qa-fit-result>' + escapeHtml(T('qa_fit_hint')) + '</p></div></div></div>';
    } else if (withGuide) {
      link = '<button type="button" class="qa-link" data-qa-guide aria-expanded="false"><span>' + escapeHtml(T('size_guide')) + '</span>' + CHEVRON_ICON + '</button>';
      extra = '<div class="qa-guide-panel" data-qa-guide-panel hidden>' + state.product.sizeChart + '</div>';
    }
    var html = '<div class="qa-grp" data-qa-group="' + index + '">'
      + '<div class="qa-lbl"><span>' + escapeHtml(label) + '</span><b data-qa-value="' + index + '"></b>' + link + '</div>'
      + extra
      + '<div class="qa-sizes' + layout + '" data-qa-sizes role="radiogroup" aria-label="' + escapeHtml(label) + '">';
    sizes.forEach(function (size) {
      html += '<button type="button" class="qa-sz" role="radio" aria-checked="false"'
        + ' data-qa-option="' + index + '" data-qa-value-name="' + escapeHtml(size.raw) + '">'
        + '<b>' + escapeHtml(size.code) + '</b><small data-qa-sub></small></button>';
    });
    return html + '</div>' + errorMarkup(index) + '</div>';
  }

  function errorMarkup(index) {
    return '<p class="qa-err" data-qa-err="' + index + '" hidden>' + ERROR_ICON + '<span></span></p>';
  }

  // keepUi : redessin à l'arrivée des détails (stock, pastilles) sans refermer ce que le client a ouvert.
  function renderOptions(keepUi) {
    var product = state.product;
    var html = '';
    var fitShown = false;
    var guideShown = false;
    var previous = null;
    if (keepUi) {
      var oldFit = el.options.querySelector('[data-qa-fit]');
      var oldPanel = el.options.querySelector('[data-qa-guide-panel]');
      var oldList = el.options.querySelector('[data-qa-cols-list]');
      var oldError = el.options.querySelector('[data-qa-err]:not([hidden])');
      previous = {
        fitOpen: Boolean(oldFit && oldFit.classList.contains('is-open')),
        height: (el.options.querySelector('[data-qa-height]') || {}).value || '',
        fitResult: (el.options.querySelector('[data-qa-fit-result]') || {}).innerHTML || '',
        guideOpen: Boolean(oldPanel && !oldPanel.hidden),
        colsAll: state.colsAll,
        colsLeft: oldList ? oldList.scrollLeft : 0,
        rec: state.rec,
        error: oldError ? { index: oldError.dataset.qaErr, text: oldError.textContent } : null
      };
    }
    state.sizes = {};
    state.fitIndex = -1;
    state.rec = null;
    state.colsAll = false;
    if (hasOptions(product)) {
      state.order.forEach(function (index) {
        var option = product.options[index];
        if (index === state.colorIndex) {
          html += colorGroup(index);
          return;
        }
        // Options à une seule valeur ("Ships From"…) : choisies d'office, pas affichées.
        if (option.values.length === 1) return;
        var size = SIZE_OPTION.test(option.name);
        var ranged = size && !fitShown && option.values.some(function (value) { return parseSize(value.name).lo; });
        var guide = size && !ranged && !guideShown && Boolean(product.sizeChart);
        if (ranged) {
          fitShown = true;
          state.fitIndex = index;
        }
        if (guide) guideShown = true;
        html += sizeGroup(index, ranged, guide);
      });
    }
    el.options.innerHTML = html;
    if (previous) restoreOptionsUi(previous);
  }

  function restoreOptionsUi(previous) {
    var list = el.options.querySelector('[data-qa-cols-list]');
    var colsToggle = el.options.querySelector('[data-qa-cols]');
    if (list && previous.colsAll && colsToggle) {
      state.colsAll = true;
      list.classList.add('is-all');
      colsToggle.setAttribute('aria-expanded', 'true');
      colsToggle.querySelector('span').textContent = T('show_less');
    } else if (list && previous.colsLeft) {
      list.scrollLeft = previous.colsLeft;
    }
    var fit = el.options.querySelector('[data-qa-fit]');
    if (fit && previous.fitOpen) {
      fit.classList.add('is-open');
      fit.firstElementChild.inert = false;
      el.options.querySelector('[data-qa-fit-toggle]').setAttribute('aria-expanded', 'true');
      el.options.querySelector('[data-qa-height]').value = previous.height;
      el.options.querySelector('[data-qa-fit-result]').innerHTML = previous.fitResult;
      state.rec = previous.rec;
    }
    var panel = el.options.querySelector('[data-qa-guide-panel]');
    if (panel && previous.guideOpen) {
      panel.hidden = false;
      el.options.querySelector('[data-qa-guide]').setAttribute('aria-expanded', 'true');
    }
    var error = previous.error && el.options.querySelector('[data-qa-err="' + previous.error.index + '"]');
    if (error) {
      error.querySelector('span').textContent = previous.error.text;
      error.hidden = false;
    }
  }

  function sizeBadge(index, raw) {
    if (index === state.fitIndex && state.rec === raw) return { text: T('qa_for_you'), className: 'bdg rec' };
    var selected = state.selected.slice();
    selected[index] = raw;
    var variant = state.product.variants.find(function (item) { return item.available && matches(item, selected, -1); });
    if (variant && variant.quantity != null && variant.quantity > 0 && variant.quantity <= LOW_STOCK) {
      return { text: T('qa_last_n', { count: variant.quantity }), className: 'bdg' };
    }
    return null;
  }

  // Photo de la couleur choisie (variant.featured_image), sinon photo principale + étiquette couleur.
  function currentImage(variant) {
    if (variant.image) return variant.image;
    if (state.colorIndex !== -1 && state.selected[state.colorIndex] != null) {
      var sameColor = state.product.variants.find(function (item) {
        return item.options[state.colorIndex] === state.selected[state.colorIndex] && item.image;
      });
      if (sameColor) return sameColor.image;
    }
    return null;
  }

  function paint() {
    var product = state.product;
    var exact = selectedVariant();
    var variant = displayVariant();
    var missing = missingIndex();

    // Couleurs et tailles : sélection, épuisées, badges "Ultimi N" / "Per te".
    el.options.querySelectorAll('[data-qa-option]').forEach(function (button) {
      var index = Number(button.dataset.qaOption);
      var name = button.dataset.qaValueName;
      var checked = state.selected[index] === name;
      button.setAttribute('aria-checked', String(checked));
      if (index === state.colorIndex) {
        var inStock = colorAvailable(name);
        button.disabled = !inStock && !checked;
        button.setAttribute('aria-label', inStock ? name : name + ' — ' + T('sold_out'));
        return;
      }
      var available = valueAvailable(index, name);
      var size = sizeInfo(index, name);
      button.disabled = !available && !checked;
      var sub = button.querySelector('[data-qa-sub]');
      setText(sub, size.lo ? size.lo + '–' + size.hi + ' cm' : size.kg ? size.kg : (!available ? T('qa_size_sold_out') : ''));
      sub.hidden = !sub.textContent;
      var old = button.querySelector('.bdg');
      var badge = available ? sizeBadge(index, name) : null;
      var badgeHtml = badge ? '<span class="' + badge.className + '">' + escapeHtml(badge.text) + '</span>' : '';
      if ((old ? old.outerHTML : '') !== badgeHtml) {
        if (old) old.remove();
        if (badgeHtml) button.insertAdjacentHTML('afterbegin', badgeHtml);
      }
    });
    el.options.querySelectorAll('[data-qa-value]').forEach(function (label) {
      var index = Number(label.dataset.qaValue);
      var value = state.selected[index];
      if (value == null) {
        setText(label, T('choose'));
        label.className = 'need';
      } else if (index === state.colorIndex) {
        setText(label, value);
        label.className = '';
      } else {
        var size = sizeInfo(index, value);
        setText(label, size.code + (size.lo ? ' · ' + size.lo + '–' + size.hi + ' cm' : size.kg ? ' · ' + size.kg : ''));
        label.className = 'pick';
      }
    });
    el.options.querySelectorAll('[data-qa-err]').forEach(function (error) {
      if (state.selected[Number(error.dataset.qaErr)] != null) error.hidden = true;
    });

    // Image : change avec la couleur.
    var image = currentImage(variant);
    var source = sizedImage(image || product.image, 400);
    if (el.image.getAttribute('src') !== source) {
      if (el.image.getAttribute('src')) play(el.image, [{ opacity: 0, transform: 'scale(1.05)' }, { opacity: 1, transform: 'none' }], 300);
      el.image.src = source;
    }
    el.image.alt = product.title;
    var miniSource = sizedImage(image || product.image, 120);
    if (el.miniImage.getAttribute('src') !== miniSource) el.miniImage.src = miniSource;
    var colorName = state.colorIndex !== -1 ? state.selected[state.colorIndex] : null;
    var showTag = !image && colorName != null && product.options[state.colorIndex].values.length > 1;
    el.tag.hidden = !showTag;
    if (showTag) {
      var colorValue = product.options[state.colorIndex].values.find(function (value) { return value.name === colorName; });
      el.tag.querySelector('i').style.setProperty('--sw', (colorValue && colorValue.color) || colorFromName(colorName) || '#ccc');
      setText(el.tag.querySelector('span'), colorName);
    }

    // Prix d'abord (rouge si soldé) + "Risparmi €x".
    variant = priceVariant();
    var onSale = variant.compareAtPrice > variant.price;
    var percent = onSale ? Math.round((variant.compareAtPrice - variant.price) / variant.compareAtPrice * 100) : 0;
    setHTML(el.price, '<b class="' + (onSale ? 'sale' : '') + '">' + escapeHtml(money(variant.price)) + '</b>'
      + (onSale ? '<s>' + escapeHtml(money(variant.compareAtPrice)) + '</s><span class="pct">-' + percent + '%</span>' : ''));
    el.save.hidden = !onSale;
    setText(el.save, onSale ? T('drawer_save', { amount: money(variant.compareAtPrice - variant.price) }) : '');
    setText(el.miniPrice, money(variant.price));
    el.miniPrice.className = onSale ? 'sale' : '';

    // Stock réel de la variante choisie.
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
    setText(el.stock, stockText);
    el.stock.className = 'qa-stock' + (stockClass ? ' ' + stockClass : '');

    // Quantité : limitée au stock réel quand il est suivi.
    var maxQty = exact && exact.quantity != null && exact.quantity > 0 ? Math.min(MAX_QTY, exact.quantity) : MAX_QTY;
    if (state.qty > maxQty) state.qty = maxQty;
    setText(el.qtyValue, String(state.qty));
    el.qtyMinus.disabled = state.qty <= 1;
    el.qtyPlus.disabled = state.qty >= maxQty;
    var total = variant.price * state.qty;

    // Avantages : livraison gratuite au-delà du seuil du thème, Klarna si activé.
    el.free.hidden = !shop.freeShipping;
    el.free.classList.toggle('off', total < shop.freeShipping);
    el.klarna.hidden = !shop.klarna;
    setText(el.klarnaValue, T('klarna_installments', { amount: money(Math.round(total / 3)) }));

    setText(el.miniSelection, selectionParts(false).join(' · ') + (state.qty > 1 ? ' · ×' + state.qty : ''));
    if (el.more.getAttribute('href') !== product.url) el.more.href = product.url;

    // Bouton principal.
    var unavailable = exact && !exact.available;
    el.add.classList.toggle('wait', missing !== -1 || Boolean(unavailable));
    if (missing !== -1) {
      setHTML(el.add, escapeHtml(isSizeOption(missing) ? T('choose_size') : T('choose_option', { option: optionLabel(product.options[missing]).toLowerCase() })));
    } else if (unavailable) {
      setHTML(el.add, escapeHtml(T('sold_out')));
    } else {
      setHTML(el.add, escapeHtml(T('drawer_add')) + '<small>' + escapeHtml(money(total))
        + (state.qty > 1 ? ' · ' + escapeHtml(T('qa_pieces', { count: state.qty })) : '') + '</small>');
    }
  }

  function recCard(item) {
    var onSale = item.compare_at_price > item.price;
    var percent = onSale ? Math.round((item.compare_at_price - item.price) / item.compare_at_price * 100) : 0;
    return '<button type="button" class="qa-rc" data-qa-similar="' + escapeHtml(item.handle) + '" aria-label="' + escapeHtml(T('choose_options_for', { title: item.title })) + '">'
      + '<span class="ph"><img src="' + escapeHtml(sizedImage(item.featured_image, 240)) + '" alt="" loading="lazy" width="118" height="118">'
      + (percent ? '<i class="off">-' + percent + '%</i>' : '') + '<span class="pl">' + PLUS_ICON + '</span></span>'
      + '<b class="' + (onSale ? 'sale' : '') + '">' + escapeHtml(money(item.price)) + '</b>'
      + '<small>' + escapeHtml(item.title) + '</small></button>';
  }

  function renderSimilar(product) {
    el.sim.hidden = true;
    el.simRail.innerHTML = '';
    el.simAll.href = product.collectionUrl || shop.allUrl;
    var token = state.token;
    state.similar = loadRecommendations(product, 'related').then(function (items) {
      var type = String(product.type || '').trim().toLowerCase();
      var price = displayVariant().price || 0;
      return items
        .map(function (item, order) {
          var sameType = type && String(item.type || '').trim().toLowerCase() === type;
          return { item: item, score: (sameType ? 0 : 1) * 1e9 + order * 1e6 + Math.abs((item.price || 0) - price) };
        })
        .sort(function (a, b) { return a.score - b.score; })
        .slice(0, 8)
        .map(function (entry) { return entry.item; });
    });
    state.similar.then(function (list) {
      if (!state || state.token !== token || !list.length) return;
      var type = String(product.type || '').trim();
      var sameCount = list.filter(function (item) {
        return type && String(item.type || '').trim().toLowerCase() === type.toLowerCase();
      }).length;
      el.simTitle.textContent = sameCount >= 2 ? T('more_of_type', { type: type.toLowerCase() }) : T('you_may_like');
      el.simRail.innerHTML = list.map(recCard).join('');
      el.sim.hidden = false;
    }).catch(function (error) {
      console.error(error);
    });
  }

  // "Completa il look" : produits complémentaires de Search & Discovery, sinon les similaires dans l'autre ordre.
  function renderLook(product) {
    el.look.hidden = true;
    el.lookRail.innerHTML = '';
    var token = state.token;
    var similar = state.similar || Promise.resolve([]);
    loadRecommendations(product, 'complementary').catch(function (error) {
      console.error(error);
      return [];
    }).then(function (items) {
      if (items.length >= 2) return items.slice(0, 8);
      return similar.then(function (list) { return list.slice().reverse(); });
    }).then(function (list) {
      if (!state || state.token !== token || !list.length) return;
      el.lookRail.innerHTML = list.map(recCard).join('');
      el.look.hidden = false;
    }).catch(function (error) {
      console.error(error);
    });
  }

  /* Cœur : wishlist du thème (window.mobileWishlist, assets/mobile-temu-header.js), pour tous les produits. */
  function paintFavorite() {
    var wishlist = window.mobileWishlist;
    el.fav.hidden = !wishlist || !state;
    if (el.fav.hidden) return;
    var saved = wishlist.has(state.product.id);
    el.fav.setAttribute('aria-pressed', String(saved));
    el.fav.setAttribute('aria-label', saved ? T('remove_from_wishlist') : T('add_to_wishlist'));
  }

  function toggleFavorite() {
    var product = state.product;
    var variant = displayVariant();
    window.mobileWishlist.toggle({
      id: product.id,
      variantId: variant.id,
      variantTitle: variant.title,
      title: product.title,
      url: product.url,
      image: sizedImage(product.image, 600),
      price: money(variant.price),
      priceCents: variant.price,
      compareAtPrice: variant.compareAtPrice > variant.price ? money(variant.compareAtPrice) : '',
      compareAtPriceCents: variant.compareAtPrice
    });
    paintFavorite();
    play(el.fav, [{ transform: 'scale(1)' }, { transform: 'scale(1.25)', offset: 0.4 }, { transform: 'scale(1)' }], 350);
  }

  function showView(done) {
    el.pick.hidden = done;
    el.done.hidden = !done;
    el.foot.hidden = done;
    el.mini.classList.remove('is-shown');
    // À l'ouverture la feuille glisse déjà : la vue n'est animée qu'en changeant de vue ou de produit.
    if (dialog.classList.contains('is-visible')) {
      play(done ? el.done : el.pick, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], 300);
    }
    resetScroll();
  }

  function fill(product, variantId) {
    var colorIndex = colorIndexOf(product);
    var order = product.options.map(function (option, index) { return index; });
    if (colorIndex > 0) order = [colorIndex].concat(order.filter(function (index) { return index !== colorIndex; }));
    state = {
      product: product,
      colorIndex: colorIndex,
      order: order,
      selected: initialSelection(product, variantId, colorIndex),
      qty: 1,
      error: '',
      sizes: {},
      token: Date.now() + Math.random()
    };
    dialog.classList.remove('is-pending');
    el.title.textContent = product.title;
    renderOptions();
    paint();
    paintFavorite();
    renderSimilar(product);
    el.back.hidden = history.length === 0;
    showView(false);
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
  var isOpen = false;
  function showDialog() {
    window.clearTimeout(closeTimer);
    dialog.style.transform = '';
    scrim.style.opacity = '';
    if (!isOpen) {
      isOpen = true;
      setLayer(scrim, true);
      setLayer(dialog, true);
      dialog.classList.add('is-open');
    }
    // Réouverture pendant l'animation de fermeture : on revient en haut.
    resetScroll();
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        dialog.classList.add('is-visible');
        scrim.classList.add('is-visible');
      });
    });
  }

  // Ouverture instantanée : photo, titre et prix déjà présents sur la carte, options en chargement.
  function cardPreview(trigger) {
    var card = trigger.closest('li') || trigger.parentElement;
    var image = card.querySelector('.alibaba-card__picture img, img');
    var titleLink = card.querySelector('.alibaba-card__title a, a[href*="/products/"]');
    var wishlist = card.querySelector('.alibaba-card__wishlist[data-price-cents]');
    return {
      title: titleLink ? titleLink.textContent.trim() : '',
      image: image ? image.currentSrc || image.src : '',
      url: titleLink ? titleLink.href : '',
      price: wishlist ? Number(wishlist.dataset.priceCents) : 0,
      compare: wishlist ? Number(wishlist.dataset.compareAtPriceCents) : 0,
      productId: wishlist && wishlist.dataset.productId
    };
  }

  function showPreview(preview) {
    var price = preview.price || 0;
    var compare = preview.compare || 0;
    var onSale = compare > price;
    state = null;
    dialog.classList.add('is-pending');
    el.pick.hidden = false;
    el.done.hidden = true;
    el.foot.hidden = false;
    el.mini.classList.remove('is-shown');
    el.title.textContent = preview.title || '';
    el.image.src = preview.image || '';
    el.miniImage.src = el.image.src;
    el.tag.hidden = true;
    // Cœur visible dès l'ouverture, avec l'état réel de la wishlist.
    var productId = preview.productId;
    el.fav.hidden = !window.mobileWishlist || !productId;
    if (!el.fav.hidden) el.fav.setAttribute('aria-pressed', String(window.mobileWishlist.has(productId)));
    setHTML(el.price, price
      ? '<b class="' + (onSale ? 'sale' : '') + '">' + escapeHtml(money(price)) + '</b>'
        + (onSale ? '<s>' + escapeHtml(money(compare)) + '</s><span class="pct">-' + Math.round((compare - price) / compare * 100) + '%</span>' : '')
      : '');
    el.save.hidden = !onSale;
    el.save.textContent = onSale ? T('drawer_save', { amount: money(compare - price) }) : '';
    el.stock.textContent = '';
    el.stock.className = 'qa-stock';
    el.options.innerHTML = '<div class="qa-skel" aria-hidden="true"><i></i><i></i><i></i><i></i></div>';
    el.qtyValue.textContent = '1';
    el.free.hidden = true;
    el.klarna.hidden = true;
    el.sim.hidden = true;
    el.back.hidden = true;
    el.more.href = preview.url || '#';
    setHTML(el.add, escapeHtml(T('loading_short')));
    el.add.classList.add('wait');
  }

  function openFromCard(trigger) {
    openProduct(trigger.dataset.quickAdd, cardVariantId(trigger), cardPreview(trigger));
  }

  // Ouverture pour un produit (handle) : depuis une carte, ou depuis la wishlist (window.mobileQuickAdd.open).
  // variantId : variante dont la couleur est pré-cochée ; la taille reste au choix du client.
  function openProduct(handle, variantId, preview) {
    var token = {};
    openRequest = token;
    history = [];
    // Produit déjà chargé (préchargement des cartes) : rempli directement, sans passer par l'aperçu.
    var ready = readyProducts.get(handle);
    if (ready) {
      openRequest = null;
      loadProduct(handle);
      fill(ready, variantId);
      showDialog();
      return;
    }
    showPreview(preview || { url: shopRoot + 'products/' + encodeURIComponent(handle) });
    showDialog();
    loadProduct(handle).then(function (product) {
      if (openRequest !== token || !isOpen) return;
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
    if (!isOpen) return;
    isOpen = false;
    dialog.classList.remove('is-visible', 'is-dragging');
    scrim.classList.remove('is-visible');
    dialog.style.transform = '';
    scrim.style.opacity = '';
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(function () {
      dialog.classList.remove('is-open');
      setLayer(dialog, false);
      setLayer(scrim, false);
      // Fermée (display: none), la zone défilante repart d'en haut.
      scrolled = false;
      el.mini.classList.remove('is-shown');
    }, 380);
  }

  /* ---------- Panier ---------- */
  function setCartCounts(count) {
    document.querySelectorAll('#cart-count, #cart-count--m, .mobile-home-cart-count').forEach(function (element) {
      element.textContent = String(count);
      if (element.id === 'cart-count--m' || element.classList.contains('mobile-home-cart-count')) element.hidden = count <= 0;
    });
  }

  function currentCartCount() {
    var badge = document.querySelector('#cart-count--m, #cart-count, .mobile-home-cart-count');
    return badge ? parseInt(badge.textContent, 10) || 0 : 0;
  }

  // Notre /cart.js part d'abord : le rafraîchissement du thème (tiroir panier) et les apps qui relisent le panier
  // après un ajout passent ensuite, sinon notre requête attendait derrière elles (jusqu'à 17 s mesurées).
  function refreshCart() {
    var request = fetchJson(shopRoot + 'cart.js', 'Cart');
    request.catch(function () {}).then(function () {
      document.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
      if (typeof window.ajaxCart !== 'undefined' && typeof window.ajaxCart.refresh === 'function') window.ajaxCart.refresh();
    });
    return request;
  }

  // Taille manquante : défile jusqu'au groupe, le secoue et affiche le message rouge.
  function showMissing(index) {
    var group = el.options.querySelector('[data-qa-group="' + index + '"]');
    if (!group) return;
    var error = group.querySelector('[data-qa-err]');
    error.querySelector('span').textContent = isSizeOption(index)
      ? T('qa_pick_size_error')
      : T('qa_pick_option_error', { option: optionLabel(state.product.options[index]).toLowerCase() });
    error.hidden = false;
    el.scroll.scrollTo({ top: Math.max(0, group.offsetTop - 60), behavior: 'smooth' });
    var choices = group.querySelector('[data-qa-sizes], [data-qa-cols-list]');
    window.setTimeout(function () {
      if (choices) play(choices, [0, -6, 6, -6, 6, 0].map(function (x) { return { transform: 'translateX(' + x + 'px)' }; }), 380);
    }, 250);
  }

  function addToCart() {
    var missing = missingIndex();
    if (missing !== -1) {
      showMissing(missing);
      return;
    }
    var variant = selectedVariant();
    if (!variant || !variant.available || busy) return;
    busy = true;
    el.add.classList.add('is-busy');
    state.error = '';
    var quantity = state.qty;
    var token = state.token;
    var handle = state.product.handle;
    fetch(shopRoot + 'cart/add.js', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: [{ id: variant.id, quantity: quantity }] })
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok) throw new Error(data.description || data.message || T('cart_add_error'));
        return data;
      });
    }).then(function () {
      // Confirmation dès que Shopify a ajouté l'article ; total et progression arrivent avec /cart.js.
      var count = currentCartCount() + quantity;
      setCartCounts(count);
      markAdded(handle);
      bumpCart();
      var visible = state && state.token === token && isOpen;
      if (visible) showDone(variant, quantity, count);
      refreshCart().then(function (cart) {
        setCartCounts(cart.item_count);
        if (visible && state && state.token === token && isOpen) showDoneCart(cart);
      }).catch(function (error) {
        console.error(error);
      });
    }).catch(function (error) {
      console.error(error);
      if (state && state.token === token) {
        state.error = error.message || T('cart_add_error');
        paint();
      }
      showToast(error.message || T('cart_add_error'));
    }).finally(function () {
      busy = false;
      el.add.classList.remove('is-busy');
    });
  }

  // Écran de confirmation dans la feuille : ligne ajoutée, total du panier, progression vers la livraison gratuite.
  function showDone(variant, quantity, count) {
    var product = state.product;
    showView(true);
    el.doneImage.src = el.image.currentSrc || el.image.src;
    el.doneTitle.textContent = product.title;
    el.doneOptions.textContent = selectionParts(true).concat('×' + quantity).join(' · ');
    el.donePrice.textContent = money(variant.price * quantity);
    el.goCart.textContent = T('qa_go_cart', { count: count });
    el.doneSummary.hidden = true;
    el.goal.hidden = true;
    renderLook(product);
    window.setTimeout(function () { el.goCart.focus({ preventScroll: true }); }, 350);
  }

  // Total réel du panier : résumé, bouton "Vai al carrello (N)" et barre de livraison gratuite.
  function showDoneCart(cart) {
    el.doneSummary.textContent = T(cart.item_count === 1 ? 'qa_cart_summary_one' : 'qa_cart_summary_other', {
      count: cart.item_count,
      total: money(cart.total_price)
    });
    el.doneSummary.hidden = false;
    el.goCart.textContent = T('qa_go_cart', { count: cart.item_count });
    var showGoal = Boolean(shop.freeShipping);
    el.goal.hidden = !showGoal;
    play(el.doneSummary, [{ opacity: 0 }, { opacity: 1 }], 250);
    if (showGoal) {
      play(el.goal, [{ opacity: 0 }, { opacity: 1 }], 250);
      var left = shop.freeShipping - cart.total_price;
      var percent = Math.max(0, Math.min(100, Math.round(cart.total_price / shop.freeShipping * 100)));
      el.goal.classList.toggle('is-ok', left <= 0);
      el.goalText.innerHTML = left > 0 ? T('cart_ship_left_html', { amount: escapeHtml(money(left)) }) : escapeHtml(T('cart_ship_free'));
      el.goalProgress.setAttribute('aria-valuenow', String(percent));
      el.goalBar.style.width = '0';
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () { el.goalBar.style.width = percent + '%'; });
      });
    }
  }

  // Petit rebond du panier et de sa pastille.
  function cartTarget() {
    var candidates = [document.querySelector('#cart-count--m'), document.querySelector('.mobile-home-cart-count')];
    for (var i = 0; i < candidates.length; i += 1) {
      var badge = candidates[i];
      var icon = badge && badge.parentElement && badge.parentElement.querySelector('svg');
      if (icon && icon.getBoundingClientRect().width > 0) return icon;
    }
    return null;
  }

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

  /* ---------- "Trova la tua taglia" ---------- */
  function updateFit(input) {
    var result = el.options.querySelector('[data-qa-fit-result]');
    var height = Number(input.value);
    state.rec = null;
    if (!height || height < 100) {
      result.textContent = T('qa_fit_hint');
      paint();
      return;
    }
    var ranged = (state.sizes[state.fitIndex] || []).filter(function (size) {
      return size.lo && valueAvailable(state.fitIndex, size.raw);
    });
    var best = ranged.find(function (size) { return height >= size.lo && height <= size.hi; })
      || ranged.slice().sort(function (a, b) {
        return Math.min(Math.abs(height - a.lo), Math.abs(height - a.hi)) - Math.min(Math.abs(height - b.lo), Math.abs(height - b.hi));
      })[0];
    if (!best) {
      result.textContent = T('qa_fit_none');
      paint();
      return;
    }
    state.rec = best.raw;
    var exact = height >= best.lo && height <= best.hi;
    result.innerHTML = T(exact ? 'qa_fit_result_html' : 'qa_fit_closest_html', { height: height, size: escapeHtml(best.code) })
      + (state.selected[state.fitIndex] === best.raw ? '' : '<button type="button" data-qa-fit-pick="' + escapeHtml(best.raw) + '">' + escapeHtml(T('qa_fit_select', { size: best.code })) + '</button>');
    paint();
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
    if (event.target === dialog || event.target.closest('[data-qa-close]')) {
      close();
      return;
    }
    // Options encore en chargement : rien d'autre n'est actif.
    if (!state) return;
    if (event.target.closest('[data-qa-back]')) {
      var previous = history.pop();
      if (previous) swapTo(previous.handle, previous.variantId, false);
      return;
    }
    if (event.target.closest('[data-qa-fav]')) {
      toggleFavorite();
      return;
    }
    if (event.target.closest('[data-qa-cols]')) {
      var toggle = event.target.closest('[data-qa-cols]');
      var list = el.options.querySelector('[data-qa-cols-list]');
      state.colsAll = !state.colsAll;
      list.classList.toggle('is-all', state.colsAll);
      toggle.setAttribute('aria-expanded', String(state.colsAll));
      toggle.querySelector('span').textContent = state.colsAll ? T('show_less') : T('qa_see_all');
      if (!state.colsAll) {
        var checked = list.querySelector('[aria-checked="true"]');
        if (checked) list.scrollLeft = Math.max(0, checked.offsetLeft - list.offsetLeft - (list.clientWidth - checked.offsetWidth) / 2);
      }
      return;
    }
    var fitToggle = event.target.closest('[data-qa-fit-toggle]');
    if (fitToggle) {
      var fit = el.options.querySelector('[data-qa-fit]');
      var open = !fit.classList.contains('is-open');
      fit.classList.toggle('is-open', open);
      fit.firstElementChild.inert = !open;
      fitToggle.setAttribute('aria-expanded', String(open));
      if (open) {
        window.setTimeout(function () {
          var height = el.options.querySelector('[data-qa-height]');
          if (height) height.focus({ preventScroll: true });
        }, 250);
      }
      return;
    }
    var guide = event.target.closest('[data-qa-guide]');
    if (guide) {
      var panel = el.options.querySelector('[data-qa-guide-panel]');
      panel.hidden = !panel.hidden;
      guide.setAttribute('aria-expanded', String(!panel.hidden));
      return;
    }
    var fitPick = event.target.closest('[data-qa-fit-pick]');
    if (fitPick) {
      state.selected[state.fitIndex] = fitPick.dataset.qaFitPick;
      fitPick.remove();
      paint();
      return;
    }
    var optionButton = event.target.closest('[data-qa-option]');
    if (optionButton) {
      var index = Number(optionButton.dataset.qaOption);
      var name = optionButton.dataset.qaValueName;
      var option = state.product.options[index];
      state.error = '';
      if (index !== state.colorIndex && state.selected[index] === name && option.values.length > 1) {
        state.selected[index] = null;
      } else {
        state.selected[index] = name;
      }
      // Changement de couleur : on retire les tailles devenues indisponibles.
      state.product.options.forEach(function (other, otherIndex) {
        if (otherIndex === index || state.selected[otherIndex] == null || other.values.length === 1) return;
        if (otherIndex !== state.colorIndex && !valueAvailable(otherIndex, state.selected[otherIndex])) state.selected[otherIndex] = null;
      });
      if (index === state.fitIndex) {
        var pick = el.options.querySelector('[data-qa-fit-pick]');
        if (pick && pick.dataset.qaFitPick === state.selected[index]) pick.remove();
      }
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
      // Depuis la confirmation, le produit ajouté n'a pas besoin d'un retour.
      swapTo(similar.dataset.qaSimilar, null, el.done.hidden);
      return;
    }
    if (event.target.closest('[data-qa-add]')) addToCart();
  });

  dialog.addEventListener('input', function (event) {
    if (state && event.target.matches('[data-qa-height]')) updateFit(event.target);
  });

  // Barre compacte (vignette + prix + sélection) quand le haut de la fiche sort de l'écran.
  el.scroll.addEventListener('scroll', function () {
    var top = el.scroll.scrollTop;
    scrolled = top > 0;
    var shown = !el.pick.hidden && top > el.hero.offsetTop + el.hero.offsetHeight - 40;
    el.mini.classList.toggle('is-shown', shown);
  }, { passive: true });

  // Glisser la poignée vers le bas ferme la feuille.
  (function () {
    var startY = null;
    var distance = 0;
    el.drag.addEventListener('pointerdown', function (event) {
      startY = event.clientY;
      distance = 0;
      dialog.classList.add('is-dragging');
      el.drag.setPointerCapture(event.pointerId);
    });
    el.drag.addEventListener('pointermove', function (event) {
      if (startY === null) return;
      distance = Math.max(0, event.clientY - startY);
      dialog.style.transform = 'translateY(' + distance + 'px)';
      scrim.style.opacity = String(Math.max(0, 1 - distance / 400));
    });
    function end() {
      if (startY === null) return;
      startY = null;
      dialog.classList.remove('is-dragging');
      if (distance > 110) {
        close();
      } else {
        dialog.style.transform = '';
        scrim.style.opacity = '';
      }
    }
    el.drag.addEventListener('pointerup', end);
    el.drag.addEventListener('pointercancel', end);
  })();

  // Une app d'étiquettes injecte ses badges ("New Arrivals"…) à côté des titres produit, avec un
  // style en ligne prioritaire : on les retire de la modale dès leur ajout.
  new MutationObserver(function () {
    dialog.querySelectorAll('[class*="dos-badge"]').forEach(function (badge) { badge.remove(); });
  }).observe(dialog, { childList: true, subtree: true });

  scrim.addEventListener('click', close);

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && isOpen) close();
  });

  // La page derrière ne défile pas : seul le contenu de la feuille (et ses carrousels) suit le doigt.
  function blockPageScroll(event) {
    if (!event.target.closest || !event.target.closest('[data-qa-scroll]')) event.preventDefault();
  }
  scrim.addEventListener('touchmove', blockPageScroll, { passive: false });
  dialog.addEventListener('touchmove', blockPageScroll, { passive: false });
  scrim.addEventListener('wheel', blockPageScroll, { passive: false });

  mobile.addEventListener('change', function () {
    if (!mobile.matches) close();
    else observeCards();
  });

  // Ouverture par d'autres scripts mobiles : wishlist (assets/mobile-temu-header.js), pour choisir la taille avant l'ajout.
  // preview (facultatif) : { title, image, url, price, compare, productId } affichés pendant le chargement.
  window.mobileQuickAdd = {
    open: function (handle, variantId, preview) {
      if (!mobile.matches || !handle) return false;
      openProduct(handle, variantId, preview);
      return true;
    }
  };

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
