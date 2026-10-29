/* Page collection ORDINATEUR (sections/desktop-collection.liquid), d'après le prototype validé « Collezione-desktop-v3 ».
   - Bandeau : photos de la collection animées comme la bannière de l'accueil ; rails meilleures ventes / nouveautés.
   - Filtres en haut (comme shop.com) : chaque pastille ouvre sa fenêtre, ⇄ ouvre le panneau « Filtri » ; les choix
     s'appliquent avec « Fatto ».
   - Filtres, tri, « Sotto 20 », pages : sans recharger la page (template collection.desktop-coll), vraie adresse dans la barre.
   - « In offerta » : produits avec prix barré de la collection (template collection.desktop-coll-sale).
   - Navigation instantanée : un lien vers une autre collection (onglets et méga-menu de l'en-tête, arbre « Raccolte », fil
     d'Ariane) remplace la page sans la recharger ; la page est préparée dès le survol du lien. Retour / Avanti fonctionnent.
   - Icône panier d'une carte et produits de la bannière : fenêtre « Aggiungi al carrello » du site, la même qu'en mobile
     (snippets/mobile-quick-add.liquid, en grande fenêtre sur ordinateur), avec flèches produit précédent / suivant ;
     nom et photo d'une carte : fiche produit.
   Rien sur mobile (≤ 760px) : la section y est cachée. */
(function () {
  'use strict';

  if (window.matchMedia('(max-width: 760px)').matches || window.dclStarted) return;
  window.dclStarted = true;

  var VIEW = 'desktop-coll';
  var SALE_VIEW = 'desktop-coll-sale';
  var cache = {};
  var cacheOrder = [];
  var root = null;
  var current = null; // état de la page affichée (bannière, vue produit…)

  var escapeHtml = function (text) { return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var money = function (cents) {
    if (window.Shopify && typeof window.Shopify.formatMoney === 'function') return String(window.Shopify.formatMoney(cents)).replace(/<[^>]*>/g, '');
    return (cents / 100).toFixed(2).replace('.', ',') + ' €';
  };
  var sized = function (src, width) {
    if (!src) return '';
    src = String(src);
    if (/[?&]width=\d+/.test(src)) return src.replace(/([?&])width=\d+/, '$1width=' + width);
    return src + (src.indexOf('?') > -1 ? '&' : '?') + 'width=' + width;
  };
  var handleOf = function (url) { var match = String(url || '').match(/\/collections\/([^/?#]+)/); return match ? decodeURIComponent(match[1]) : ''; };
  var shortTitle = function (title) {
    var words = String(title).replace(/\s+/g, ' ').trim().split(' ').slice(0, 9).join(' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
  };

  // ---------- Pages demandées (template sans layout), gardées pour la navigation instantanée ----------
  var viewUrl = function (url, view) {
    var target = new URL(url, location.href);
    target.searchParams.delete('view');
    target.searchParams.set('view', view || VIEW);
    return target.pathname + target.search;
  };
  var fetchPage = function (url, view) {
    var key = viewUrl(url, view);
    if (!cache[key]) {
      cache[key] = fetch(key, { credentials: 'same-origin' }).then(function (response) {
        if (!response.ok) throw new Error('Collection page request failed: ' + response.status);
        return response.text();
      });
      cache[key].catch(function () { delete cache[key]; });
      cacheOrder.push(key);
      if (cacheOrder.length > 14) delete cache[cacheOrder.shift()];
    }
    return cache[key];
  };
  var parse = function (html) { return new DOMParser().parseFromString(html, 'text/html'); };

  // ---------- Petit message ----------
  var toastBox = null;
  var toastTimer = null;
  var toast = function (text) {
    if (!text) return;
    if (!toastBox) {
      toastBox = document.createElement('div');
      toastBox.className = 'dcl-toast';
      toastBox.setAttribute('role', 'status');
      document.body.appendChild(toastBox);
    }
    toastBox.textContent = text;
    toastBox.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastBox.classList.remove('is-on'); }, 1800);
  };

  // ---------- Pleine largeur ----------
  var setFullWidth = function () {
    if (!root) return;
    root.style.setProperty('--dcl-x', root.parentElement.getBoundingClientRect().left + 'px');
    root.style.setProperty('--dcl-w', document.documentElement.clientWidth + 'px');
  };
  window.addEventListener('resize', setFullWidth);

  // ---------- Bandeau : photos de la collection qui entrent en tournant, flottent puis laissent la place aux 4 suivantes
  // (comme la bannière de l'accueil, assets/desktop-home-shop.css .dhp-fl) ----------
  var startHero = function () {
    var art = root.querySelector('.cph__art');
    var dataNode = art && art.querySelector('[data-cph-pics]');
    if (!dataNode) return;
    var pics = [];
    try { pics = JSON.parse(dataNode.textContent); } catch (error) { pics = []; }
    var floats = [].slice.call(art.querySelectorAll('.cph-fl'));
    if (!pics.length || !floats.length) return;
    var set = 0;
    var visible = true;
    var timer = 0;
    var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var show = function () {
      floats.forEach(function (node, i) {
        var image = node.querySelector('img');
        image.src = sized(pics[(set * floats.length + i) % pics.length], 400);
        node.classList.remove('off');
        node.classList.add('on');
      });
    };
    var cycle = function () {
      if (!art.isConnected) { clearInterval(timer); return; }
      if (!visible || document.hidden || quickOpen()) return;
      floats.forEach(function (node) { node.classList.remove('on'); node.classList.add('off'); });
      setTimeout(function () {
        set += 1;
        floats.forEach(function (node) { node.classList.remove('off'); });
        requestAnimationFrame(function () { requestAnimationFrame(show); });
      }, 900);
    };
    new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }).observe(art);
    requestAnimationFrame(function () { requestAnimationFrame(show); });
    // Photos suivantes chargées d'avance (pas de trou à l'entrée)
    setTimeout(function () { pics.slice(floats.length).forEach(function (src) { new Image().src = sized(src, 400); }); }, 1500);
    if (!still && pics.length > floats.length) timer = setInterval(cycle, 5200);
  };

  // ---------- Rails « Preferiti per un motivo » / « Appena arrivati » : 14 produits de la même collection triée ----------
  var loadRails = function () {
    root.querySelectorAll('[data-cpr]').forEach(function (panel) {
      var rail = panel.querySelector('[data-cpr-rail]');
      fetchPage(panel.getAttribute('data-cpr')).then(function (html) {
        if (!rail.isConnected) return;
        var cards = [].slice.call(parse(html).querySelectorAll('[data-dcl-grid] > .mshein-card')).slice(0, 14);
        if (!cards.length) { panel.hidden = true; return; }
        var text = function (card, selector) { var node = card.querySelector(selector); return node ? node.textContent.replace(/\s+/g, ' ').trim() : ''; };
        rail.innerHTML = cards.map(function (card) {
          var link = card.querySelector('.mshein-card__link');
          var image = card.querySelector('.mshein-card__link img');
          var rate = text(card, '.mshein-card__stars b');
          var old = text(card, '.old-price');
          return '<a class="cpr__mini" href="' + escapeHtml(link ? link.getAttribute('href') : '#') + '">'
            + '<span class="cpr__img">' + (image ? '<img src="' + escapeHtml(sized(image.getAttribute('src'), 360)) + '" alt="" loading="lazy">' : '') + '</span>'
            + '<b>' + escapeHtml(card.getAttribute('data-mshein-title') || text(card, '.mshein-card__title')) + '</b>'
            + (rate ? '<span class="cpr__st">★★★★★<em>' + escapeHtml(rate) + ' ' + escapeHtml(text(card, '.mshein-card__stars em')) + '</em></span>' : '')
            + '<span class="cpr__pr">' + escapeHtml(text(card, '.mshein-card__now')) + (old ? ' <s>' + escapeHtml(old) + '</s>' : '') + '</span></a>';
        }).join('');
      }).catch(function () { panel.hidden = true; });
    });
  };

  // ---------- Fenêtre d'une pastille de filtre : copie de la section du panneau « Filtri » + « Reimposta » / « Fatto » ----------
  var closePops = function () {
    if (!root) return;
    root.querySelectorAll('.cpf__pop').forEach(function (pop) {
      var button = pop.parentNode.querySelector('[data-cpf-dd]');
      if (button) button.setAttribute('aria-expanded', 'false');
      pop.remove();
    });
    var menu = root.querySelector('[data-dcl-sort-menu]');
    if (menu && !menu.hidden) { menu.hidden = true; root.querySelector('[data-dcl-sort-btn]').setAttribute('aria-expanded', 'false'); }
  };
  var openPop = function (button) {
    var holder = button.parentNode;
    var wasOpen = Boolean(holder.querySelector('.cpf__pop'));
    closePops();
    if (wasOpen) return;
    var section = root.querySelector('[data-dcl-filters] [data-fi="' + button.getAttribute('data-cpf-dd') + '"] .flt__body');
    if (!section) return;
    var host = main();
    var pop = document.createElement('div');
    pop.className = 'cpf__pop';
    pop.setAttribute('data-cp-pop', '');
    var body = section.cloneNode(true);
    body.classList.add('is-all');
    pop.innerHTML = '<div class="cpf__body"></div><div class="cpf__ft"><button type="button" class="cp-reset" data-cp-reset>' + escapeHtml(host.getAttribute('data-reset')) + '</button><button type="button" class="cp-done" data-cp-apply>' + escapeHtml(host.getAttribute('data-done')) + '</button></div>';
    pop.firstChild.appendChild(body);
    holder.appendChild(pop);
    button.setAttribute('aria-expanded', 'true');
    // Fenêtre gardée dans l'écran (pastilles près des bords)
    var box = pop.getBoundingClientRect(), edge = document.documentElement.clientWidth - 16;
    if (box.right > edge) pop.style.marginLeft = (edge - box.right) + 'px';
    if (box.left < 16) pop.style.marginLeft = (16 - box.left) + 'px';
  };
  // Panneau « Filtri »
  var drawer = function (open) {
    var panel = root && root.querySelector('[data-dcl-filters]');
    if (!panel) return;
    panel.classList.toggle('is-open', open);
    document.documentElement.classList.toggle('cpd-lock', open);
  };
  // Choix d'une fenêtre ou du panneau appliqués d'un coup : options cochées ajoutées, décochées retirées, prix
  var applyScope = function (scope) {
    var params = paramsNow();
    var has = function (key, value) { var found = false; params.forEach(function (v, k) { if (k === key && v === value) found = true; }); return found; };
    scope.querySelectorAll('[data-q]').forEach(function (node) {
      var pairs = [];
      new URLSearchParams(node.getAttribute('data-q')).forEach(function (value, key) { pairs.push([key, value]); });
      if (node.classList.contains('is-on')) {
        pairs.forEach(function (pair) { if (!has(pair[0], pair[1])) params.append(pair[0], pair[1]); });
      } else {
        var kept = [];
        params.forEach(function (value, key) { if (!pairs.some(function (pair) { return pair[0] === key && pair[1] === value; })) kept.push([key, value]); });
        params = new URLSearchParams();
        kept.forEach(function (pair) { params.append(pair[0], pair[1]); });
      }
    });
    var price = scope.querySelector('[data-dcl-price]');
    if (price) {
      var min = price.querySelector('[data-dcl-price-min]').value, max = price.querySelector('[data-dcl-price-max]').value;
      params.delete(price.getAttribute('data-min')); params.delete(price.getAttribute('data-max'));
      if (min) params.set(price.getAttribute('data-min'), min);
      if (max) params.set(price.getAttribute('data-max'), max);
    }
    drawer(false);
    closePops();
    navigate(urlWith(params));
  };

  // ---------- Filtres : listes (ordre, « Mostra altre »), filtres actifs ----------
  var main = function () { return root.querySelector('[data-dcl-main]'); };
  var prepareFilters = function () {
    var filters = root.querySelector('[data-dcl-filters]');
    if (!filters) return;
    var host = main();
    filters.querySelectorAll('[data-dcl-numeric]').forEach(function (list) {
      [].slice.call(list.children).sort(function (a, b) { return parseFloat(a.textContent.replace(',', '.')) - parseFloat(b.textContent.replace(',', '.')); }).forEach(function (node) { list.appendChild(node); });
    });
    filters.querySelectorAll('[data-dcl-by-count]').forEach(function (list) {
      [].slice.call(list.children).sort(function (a, b) {
        var countA = Number((a.querySelector('em') || {}).textContent || 0), countB = Number((b.querySelector('em') || {}).textContent || 0);
        return (b.classList.contains('is-on') - a.classList.contains('is-on')) || countB - countA || a.textContent.localeCompare(b.textContent);
      }).forEach(function (node) { list.appendChild(node); });
    });
    filters.querySelectorAll('[data-dcl-more-list]').forEach(function (list) {
      var limit = Number(list.getAttribute('data-dcl-more-list')) || 7;
      var items = [].slice.call(list.querySelectorAll(':scope > [data-q]'));
      if (items.length <= limit) return;
      items.forEach(function (item, i) { if (i >= limit && !item.classList.contains('is-on')) item.classList.add('is-more'); });
      var hidden = list.querySelectorAll('.is-more').length;
      if (!hidden) return;
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'flt__more';
      button.textContent = host.getAttribute('data-more').replace('__N__', hidden);
      button.addEventListener('click', function () {
        var open = list.classList.toggle('is-all');
        button.textContent = open ? host.getAttribute('data-less') : host.getAttribute('data-more').replace('__N__', hidden);
      });
      list.parentNode.appendChild(button);
    });
    // Filtres actifs en pastilles au-dessus de la grille
    var chips = [];
    filters.querySelectorAll('[data-q].is-on').forEach(function (button) {
      chips.push('<button type="button" data-rm="' + escapeHtml(button.getAttribute('data-q')) + '">' + escapeHtml(button.getAttribute('data-label') || button.textContent) + '</button>');
    });
    var price = filters.querySelector('[data-dcl-price]');
    if (price) {
      var min = price.querySelector('[data-dcl-price-min]').value, max = price.querySelector('[data-dcl-price-max]').value;
      if (min || max) {
        var symbol = host.getAttribute('data-price-label');
        chips.push('<button type="button" data-rm-price>' + escapeHtml(symbol + (min || 0) + ' – ' + (max ? symbol + max : '∞')) + '</button>');
      }
    }
    var active = root.querySelector('[data-dcl-active]');
    var clearLabel = filters.querySelector('[data-dcl-clear]');
    active.innerHTML = chips.join('') + (chips.length && clearLabel ? '<button type="button" class="act-f__all" data-dcl-clear>' + escapeHtml(clearLabel.textContent) + '</button>' : '');
    // Pastilles : nombre de choix de chaque filtre (couleurs et tailles regroupées : un choix par bouton du panneau)
    var total = 0;
    root.querySelectorAll('[data-cpf-dd]').forEach(function (pill) {
      var section = filters.querySelector('[data-fi="' + pill.getAttribute('data-cpf-dd') + '"]');
      var count = section ? section.querySelectorAll('[data-q].is-on').length : 0;
      var range = section && section.querySelector('[data-dcl-price]');
      if (range && (range.querySelector('[data-dcl-price-min]').value || range.querySelector('[data-dcl-price-max]').value)) count = 1;
      total += count;
      var label = pill.querySelector('[data-cpf-n]');
      if (label) label.textContent = count ? ' · ' + count : '';
    });
    total += root.querySelectorAll('[data-cpf-q].is-on').length;
    var badge = root.querySelector('[data-cpf-total]');
    if (badge) { badge.textContent = total; badge.hidden = !total; }
  };

  // Adresse avec des filtres ajoutés / retirés (paires « filter.v.option.size=M » de data-q)
  var paramsNow = function () { var params = new URLSearchParams(location.search); params.delete('page'); params.delete('view'); return params; };
  var withPairs = function (query, remove) {
    var params = paramsNow();
    var pairs = [];
    new URLSearchParams(query).forEach(function (value, key) { pairs.push([key, value]); });
    if (remove) {
      var kept = [];
      params.forEach(function (value, key) { if (!pairs.some(function (pair) { return pair[0] === key && pair[1] === value; })) kept.push([key, value]); });
      params = new URLSearchParams();
      kept.forEach(function (pair) { params.append(pair[0], pair[1]); });
    } else {
      pairs.forEach(function (pair) { params.append(pair[0], pair[1]); });
    }
    return params;
  };
  var urlWith = function (params) { var query = params.toString(); return location.pathname + (query ? '?' + query : ''); };
  var clearedParams = function () {
    var params = new URLSearchParams();
    paramsNow().forEach(function (value, key) { if (key.indexOf('filter.') !== 0) params.append(key, value); });
    return params;
  };

  // ---------- « In offerta » : produits avec prix barré (lus 48 par 48) ----------
  var loadSale = function (state, append) {
    var grid = root.querySelector('[data-dcl-grid]');
    var moreBox = root.querySelector('[data-dcl-sale-more]');
    var found = root.querySelector('[data-dcl-found]');
    var pager = root.querySelector('[data-dcl-pager]');
    if (pager) pager.hidden = true;
    var none = root.querySelector('.cl__none');
    if (none) none.hidden = true;
    if (!append) { grid.innerHTML = ''; state.saleNext = viewUrl(urlWith(paramsNow()), SALE_VIEW); state.saleCount = 0; }
    grid.classList.add('is-loading');
    var tries = 0;
    var step = function () {
      if (!state.saleNext) return Promise.resolve();
      tries += 1;
      return fetch(state.saleNext, { credentials: 'same-origin' }).then(function (response) { return response.text(); }).then(function (html) {
        if (!grid.isConnected || !state.saleOn) return;
        var doc = parse(html);
        var cards = [].slice.call(doc.querySelectorAll('[data-dcl-sale] > .mshein-card'));
        var next = doc.querySelector('[data-dcl-next]');
        state.saleNext = next ? viewUrl(next.getAttribute('data-dcl-next'), SALE_VIEW) : '';
        grid.insertAdjacentHTML('beforeend', cards.map(function (card) { return card.outerHTML; }).join(''));
        state.saleCount += cards.length;
        // Pas assez de promotions dans ces 48 produits : on continue (6 lectures au plus d'un coup)
        if (state.saleCount < (append ? 1 : 12) && state.saleNext && tries < 6) return step();
      });
    };
    return step().catch(function (error) { console.error(error); }).then(function () {
      grid.classList.remove('is-loading');
      decorate();
      if (found) found.textContent = found.getAttribute('data-template') ? found.getAttribute('data-template').replace('__N__', state.saleCount) : found.textContent;
      moreBox.hidden = !state.saleNext;
    });
  };

  // ---------- Remplacement du contenu (filtres / tri / page : même collection ; autre collection : toute la page) ----------
  var navToken = 0;
  var navigate = function (url, options) {
    options = options || {};
    var target = new URL(url, location.href);
    // Liens de la page reçue (pager…) : « view=desktop-coll » retiré de l'adresse affichée (rechargée, la page
    // s'afficherait sans en-tête ni pied de page)
    target.searchParams.delete('view');
    var sameCollection = handleOf(target.pathname) === root.getAttribute('data-handle');
    var token = ++navToken;
    drawer(false);
    closePops();
    var grid = root.querySelector('[data-dcl-grid]');
    if (grid) grid.classList.add('is-loading');
    document.documentElement.classList.add('dcl-busy');
    return fetchPage(target.pathname + target.search).then(function (html) {
      if (token !== navToken) return;
      var fresh = parse(html).querySelector('[data-dcl]');
      if (!fresh) throw new Error('Desktop collection markup missing');
      if (options.push !== false) history.pushState({ dcl: true }, '', target.pathname + target.search);
      if (sameCollection && !options.full) {
        ['[data-dcl-filters]', '[data-dcl-main]'].forEach(function (selector) {
          var now = root.querySelector(selector), next = fresh.querySelector(selector);
          if (now && next) now.replaceWith(document.importNode(next, true));
        });
        current.saleOn = false;
        afterContent();
        var list = root.querySelector('.cl__layout');
        var top = list.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dh-h')) || 126) - 70;
        if (window.scrollY > top) window.scrollTo({ top: top, behavior: 'instant' });
      } else {
        var node = document.importNode(fresh, true);
        root.replaceWith(node);
        document.title = fresh.getAttribute('data-title') || document.title;
        window.scrollTo({ top: 0, behavior: 'instant' });
        init(node);
      }
    }).catch(function (error) {
      console.error(error);
      if (token === navToken) location.href = target.pathname + target.search; // secours : page normale
    }).then(function () {
      if (token === navToken) document.documentElement.classList.remove('dcl-busy');
    });
  };

  var decorate = function () {
    syncHearts(root);
    if (window.msheinCards && typeof window.msheinCards.decorate === 'function') window.msheinCards.decorate(root.querySelector('[data-dcl-grid]'));
  };
  var afterContent = function () {
    prepareFilters();
    decorate();
    var found = root.querySelector('[data-dcl-found]');
    if (found && !found.getAttribute('data-template')) found.setAttribute('data-template', found.textContent.replace(/\d[\d.,]*/, '__N__'));
    var grid = root.querySelector('[data-dcl-grid]');
    if (grid) grid.classList.toggle('is-list', current.view === 'list');
    root.querySelectorAll('.view [data-view]').forEach(function (button) { button.classList.toggle('is-on', button.getAttribute('data-view') === current.view); });
  };

  // Onglet du rayon dans l'en-tête (collection ouverte sans recharger)
  var markHeader = function () {
    var top = root.getAttribute('data-top'), url = root.getAttribute('data-url');
    document.querySelectorAll('.dh-tab').forEach(function (tab) {
      var path = new URL(tab.getAttribute('href'), location.href).pathname;
      tab.classList.toggle('is-here', path === top || path === url);
    });
  };

  // ---------- Cœur (wishlist du site) ----------
  var syncHearts = function (scope) {
    if (!window.mobileWishlist || typeof window.mobileWishlist.has !== 'function') return;
    scope.querySelectorAll('.mshein-card__fav[data-product-id]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(Boolean(window.mobileWishlist.has(button.getAttribute('data-product-id')))));
    });
  };
  var toggleHeart = function (card, heart) {
    if (!window.mobileWishlist || typeof window.mobileWishlist.toggle !== 'function') return;
    var link = card.querySelector('.mshein-card__title a, a.mshein-card__link');
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
  };

  // ---------- Fenêtre « Aggiungi al carrello » (la même qu'en mobile : assets/mobile-quick-add.js) ----------
  var quickAdd = function () { return window.mobileQuickAdd && typeof window.mobileQuickAdd.openCard === 'function' ? window.mobileQuickAdd : null; };
  var quickOpen = function () { var api = quickAdd(); return Boolean(api && api.isOpen && api.isOpen()); };
  // Carte n° index de la grille : fenêtre de son produit, flèches = cartes voisines, « 4 / 40 »
  var openCardAt = function (index) {
    var cards = [].slice.call(root.querySelectorAll('[data-dcl-grid] > .mshein-card'));
    if (!cards.length) return false;
    index = (index + cards.length) % cards.length;
    var trigger = cards[index].querySelector('[data-quick-add]');
    var api = quickAdd();
    if (!api || !trigger) return false;
    return api.openCard(trigger, { desktop: true, count: (index + 1) + ' / ' + cards.length, onStep: function (step) { openCardAt(index + step); } });
  };

  // ---------- Événements de la page ----------
  var bindRoot = function () {
    root.addEventListener('click', function (event) {
      var target = event.target;
      var toggle = target.closest('.tree__tg');
      if (toggle) { event.preventDefault(); toggle.closest('li').classList.toggle('is-open'); return; }
      var section = target.closest('.flt__tg');
      if (section) { section.parentNode.classList.toggle('is-open'); return; }
      // Panneau « Filtri » et fenêtres des pastilles : choix cochés / décochés, appliqués avec « Fatto »
      var option = target.closest('[data-dcl-filters] [data-q], [data-cp-pop] [data-q]');
      if (option) { option.classList.toggle('is-on'); return; }
      if (target.closest('[data-cp-apply]')) { applyScope(target.closest('[data-cp-pop]') || root.querySelector('[data-dcl-filters]')); return; }
      var resetScope = target.closest('[data-cp-reset]') && target.closest('[data-cp-pop]');
      if (resetScope) {
        resetScope.querySelectorAll('[data-q].is-on').forEach(function (node) { node.classList.remove('is-on'); });
        resetScope.querySelectorAll('[data-dcl-price] input').forEach(function (input) { input.value = ''; });
        applyScope(resetScope);
        return;
      }
      if (target.closest('[data-cpd-open]')) { closePops(); drawer(true); return; }
      if (target.closest('[data-cpd-close]')) { drawer(false); return; }
      var pill = target.closest('[data-cpf-dd]');
      if (pill) { event.stopPropagation(); openPop(pill); return; }
      var quickPill = target.closest('[data-cpf-q]');
      if (quickPill) { navigate(urlWith(withPairs(quickPill.getAttribute('data-cpf-q'), quickPill.classList.contains('is-on')))); return; }
      if (target.closest('[data-cpt-next]')) { var row = root.querySelector('[data-cpt-row]'); row.scrollBy({ left: row.clientWidth * 0.7, behavior: 'smooth' }); return; }
      var railNext = target.closest('[data-cpr-next]');
      if (railNext) { var rail = railNext.parentNode.querySelector('[data-cpr-rail]'); rail.scrollBy({ left: rail.clientWidth * 0.8, behavior: 'smooth' }); return; }
      if (target.closest('[data-dcl-price-ok]')) {
        var price = target.closest('[data-dcl-price]');
        var params = paramsNow();
        var min = price.querySelector('[data-dcl-price-min]').value, max = price.querySelector('[data-dcl-price-max]').value;
        params.delete(price.getAttribute('data-min')); params.delete(price.getAttribute('data-max'));
        if (min) params.set(price.getAttribute('data-min'), min);
        if (max) params.set(price.getAttribute('data-max'), max);
        navigate(urlWith(params));
        return;
      }
      if (target.closest('[data-dcl-clear]')) { navigate(urlWith(clearedParams())); return; }
      var chip = target.closest('[data-rm]');
      if (chip) { navigate(urlWith(withPairs(chip.getAttribute('data-rm'), true))); return; }
      if (target.closest('[data-rm-price]')) {
        var priceBox = root.querySelector('[data-dcl-price]');
        var cleared = paramsNow();
        cleared.delete(priceBox.getAttribute('data-min')); cleared.delete(priceBox.getAttribute('data-max'));
        navigate(urlWith(cleared));
        return;
      }
      var under = target.closest('[data-dcl-under]');
      if (under) {
        var pair = under.getAttribute('data-dcl-under').split('=');
        var underParams = paramsNow();
        underParams.delete(under.getAttribute('data-min'));
        if (under.classList.contains('is-on')) underParams.delete(pair[0]); else underParams.set(pair[0], pair[1]);
        navigate(urlWith(underParams));
        return;
      }
      var saleChip = target.closest('[data-dcl-sale-chip]');
      if (saleChip) {
        current.saleOn = !current.saleOn;
        saleChip.classList.toggle('is-on', current.saleOn);
        if (current.saleOn) loadSale(current, false);
        else navigate(location.pathname + location.search, { push: false });
        return;
      }
      if (target.closest('[data-dcl-sale-more] button')) { loadSale(current, true); return; }
      var viewButton = target.closest('.view [data-view]');
      if (viewButton) {
        current.view = viewButton.getAttribute('data-view');
        afterContent();
        return;
      }
      var sortButton = target.closest('[data-dcl-sort-btn]');
      if (sortButton) {
        event.stopPropagation();
        root.querySelectorAll('.cpf__pop').forEach(function (pop) { pop.remove(); });
        var menu = root.querySelector('[data-dcl-sort-menu]');
        menu.hidden = !menu.hidden;
        sortButton.setAttribute('aria-expanded', String(!menu.hidden));
        return;
      }
      var sort = target.closest('[data-dcl-sort-menu] [data-s]');
      if (sort) {
        var sortParams = paramsNow();
        sortParams.set('sort_by', sort.getAttribute('data-s'));
        navigate(urlWith(sortParams));
        return;
      }
      var pageLink = target.closest('[data-dcl-pager] a');
      if (pageLink) { event.preventDefault(); navigate(pageLink.getAttribute('href')); return; }
      if (target.closest('[data-rh-all]')) {
        event.preventDefault();
        var list = root.querySelector('.cl');
        window.scrollTo({ top: list.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dh-h')) || 126), behavior: 'smooth' });
        return;
      }
      // Cartes (comme l'accueil) : cœur = wishlist ; icône panier = fenêtre « Aggiungi al carrello » ; nom et photo = fiche produit
      var card = target.closest('[data-dcl-grid] > .mshein-card');
      if (card) {
        var heart = target.closest('.mshein-card__fav');
        if (heart) { event.preventDefault(); event.stopPropagation(); toggleHeart(card, heart); return; }
        if (!target.closest('.mshein-card__add')) return;
        var cards = [].slice.call(root.querySelectorAll('[data-dcl-grid] > .mshein-card'));
        if (!openCardAt(cards.indexOf(card))) return; // secours : fiche produit (lien de la carte)
        event.preventDefault();
        event.stopPropagation();
      }
    });
    // Cartes comme l'accueil : « Anteprima » (fiche produit) sur la photo au survol
    var eye = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
    root.addEventListener('mouseover', function (event) {
      var card = event.target.closest && event.target.closest('[data-dcl-grid] > .mshein-card');
      if (!card || card.querySelector('.dcl-qv')) return;
      var media = card.querySelector('.mshein-card__img'), link = card.querySelector('.mshein-card__link');
      if (media && link) media.insertAdjacentHTML('beforeend', '<a class="dcl-qv" href="' + escapeHtml(link.getAttribute('href')) + '">' + eye + escapeHtml(root.getAttribute('data-preview') || '') + '</a>');
    });
    root.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && event.target.matches('[data-dcl-price] input')) { event.preventDefault(); root.querySelector('[data-dcl-price-ok]').click(); }
    });
  };

  var init = function (node) {
    root = node;
    current = { view: current ? current.view : 'grid', saleOn: false };
    setFullWidth();
    bindRoot();
    afterContent();
    startHero();
    markHeader();
    if ('requestIdleCallback' in window) window.requestIdleCallback(loadRails, { timeout: 2500 }); else setTimeout(loadRails, 600);
  };

  // ---------- Navigation instantanée entre collections ----------
  // Méga-menu de l'en-tête fermé (assets/desktop-header.js), même si la souris reste sur l'onglet
  var closeMega = function () {
    if (typeof window.dhCloseMega === 'function') window.dhCloseMega();
    setTimeout(function () { if (typeof window.dhCloseMega === 'function') window.dhCloseMega(); }, 200);
  };
  var collectionLink = function (link, event) {
    if (!link || !root || !root.isConnected) return null;
    if (event && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button > 0)) return null;
    if (link.target && link.target !== '_self') return null;
    if (!link.closest('.dh-top, [data-dcl], .dft')) return null;
    if (link.closest('[data-dcl-pager]')) return null;
    var url;
    try { url = new URL(link.getAttribute('href'), location.href); } catch (error) { return null; }
    if (url.origin !== location.origin || !/\/collections\/[^/]+\/?$/.test(url.pathname) || url.searchParams.has('view')) return null;
    if (url.hash && url.pathname === location.pathname) return null;
    return url;
  };
  document.addEventListener('click', function (event) {
    var url = collectionLink(event.target.closest('a[href]'), event);
    if (!url) return;
    event.preventDefault();
    closeMega();
    navigate(url.pathname + url.search, { full: url.pathname !== location.pathname }).then(closeMega);
  }, true);
  // Préparée dès le survol (le clic affiche la page tout de suite)
  var hoverTimer = null;
  document.addEventListener('mouseover', function (event) {
    var url = collectionLink(event.target.closest && event.target.closest('a[href]'));
    if (!url) return;
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(function () { fetchPage(url.pathname + url.search).catch(function () {}); }, 70);
  });
  window.addEventListener('popstate', function () {
    if (!root || !document.querySelector('[data-dcl]')) return;
    // Retour vers une page qui n'est pas une collection (accueil, fiche… : collection ouverte sans recharger depuis
    // celle-ci, assets/desktop-header.js) : cette page est rechargée
    if (!handleOf(location.pathname)) { location.reload(); return; }
    navigate(location.pathname + location.search, { push: false, full: handleOf(location.pathname) !== root.getAttribute('data-handle') });
  });
  // Fenêtres des pastilles et menu de tri fermés par un clic ailleurs ; Échap ferme aussi le panneau « Filtri »
  document.addEventListener('click', function (event) {
    if (!root || event.target.closest('.cpf__dd')) return;
    closePops();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' || !root) return;
    closePops();
    drawer(false);
  });
  // Fenêtre ouverte : flèches du clavier = produit précédent / suivant
  document.addEventListener('keydown', function (event) {
    if (!quickOpen() || (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft')) return;
    var button = document.querySelector('#mobile-quick-add [data-qa-step="' + (event.key === 'ArrowRight' ? 1 : -1) + '"]:not([hidden])');
    if (button) button.click();
  });
  history.replaceState({ dcl: true }, '', location.href);

  var start = function () { var node = document.querySelector('[data-dcl]'); if (node) init(node); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
