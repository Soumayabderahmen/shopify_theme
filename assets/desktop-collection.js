/* Page collection ORDINATEUR (sections/desktop-collection.liquid), d'après le prototype validé « Collezione-desktop ».
   - Bannière « appendiabiti » : produits de la collection sur une barre courbe (défilement, survol, glisser, clic = vue produit).
   - Filtres, tri, « Sotto 20 », pages : sans recharger la page (template collection.desktop-coll), vraie adresse dans la barre.
   - « In offerta » : produits avec prix barré de la collection (template collection.desktop-coll-sale).
   - Navigation instantanée : un lien vers une autre collection (onglets et méga-menu de l'en-tête, arbre « Raccolte », fil
     d'Ariane) remplace la page sans la recharger ; la page est préparée dès le survol du lien. Retour / Avanti fonctionnent.
   - Vue produit (clic sur une carte) : ajout au vrai panier (/cart/add.js) puis tiroir panier du site (le même qu'en mobile).
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

  // ---------- Bannière « appendiabiti » ----------
  var startRail = function (state) {
    var section = root.querySelector('[data-rh]');
    var rack = section && section.querySelector('[data-rh-rack]');
    var dataNode = section && section.querySelector('[data-rh-data]');
    if (!rack || !dataNode) return;
    var products = [];
    try { products = JSON.parse(dataNode.textContent); } catch (error) { products = []; }
    state.railProducts = products;
    if (!products.length) return;
    var pathNode = rack.querySelector('[data-rh-path]');
    var shadowNode = rack.querySelector('[data-rh-shadow]');
    var nameNode = section.querySelector('[data-rh-name]');
    var priceNode = section.querySelector('[data-rh-price]');
    var progNode = section.querySelector('[data-rh-prog]');
    var els = [];
    var count = 0;
    var W, H2, gap, LOOP, iw, ih, sag;
    var railY = function (x) { var u = (x - W / 2) / (W * 0.62); return 10 + sag * (1 - u * u); };
    var layout = function () {
      W = rack.clientWidth; H2 = rack.clientHeight;
      gap = Math.max(96, W / 10.5); LOOP = count * gap; iw = gap * 2.1; ih = H2 * 0.9; sag = H2 * 0.1;
      var d = '';
      for (var k = 0; k <= 48; k++) { var x = -40 + (W + 80) * k / 48; d += (k ? 'L' : 'M') + x.toFixed(1) + ' ' + railY(x).toFixed(1); }
      pathNode.setAttribute('d', d); shadowNode.setAttribute('d', d);
      els.forEach(function (item) { item.el.style.width = iw + 'px'; item.el.style.height = ih + 'px'; });
    };
    // Photos à fond blanc uni (objet au centre) posées sur la barre ; les autres en cartes suspendues
    var canvas = document.createElement('canvas'); canvas.width = 40; canvas.height = 40;
    var context = canvas.getContext('2d', { willReadFrequently: true });
    var isClean = function (src) {
      return new Promise(function (resolve) {
        var image = new Image(); image.crossOrigin = 'anonymous';
        image.onload = function () {
          try {
            context.clearRect(0, 0, 40, 40); context.drawImage(image, 0, 0, 40, 40);
            var data = context.getImageData(0, 0, 40, 40).data, edge = [], sat = 0, obj = 0;
            for (var y = 0; y < 40; y++) for (var x = 0; x < 40; x++) {
              var i = (y * 40 + x) * 4, r = data[i], g = data[i + 1], b = data[i + 2], v = (r + g + b) / 3;
              if (x < 3 || y < 3 || x > 36 || y > 36) { edge.push(v); sat = Math.max(sat, Math.max(r, g, b) - Math.min(r, g, b)); } else if (v < 215) obj++;
            }
            var mean = edge.reduce(function (a, b) { return a + b; }, 0) / edge.length;
            var sd = Math.sqrt(edge.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / edge.length);
            var cover = obj / 1156;
            resolve(mean > 232 && sd < 8 && sat < 18 && cover > 0.12 && cover < 0.8);
          } catch (error) { resolve(false); }
        };
        image.onerror = function () { resolve(false); };
        setTimeout(function () { resolve(false); }, 5000);
        image.src = sized(src, 80) + '&height=80&crop=center';
      });
    };
    var render = function (rail) {
      var list = rail.slice();
      while (list.length && list.length < 14) list = list.concat(rail);
      rack.querySelectorAll('.rh-pc').forEach(function (node) { node.remove(); });
      els = list.map(function (entry) {
        var product = products[entry.i], el = document.createElement('div');
        el.className = 'rh-pc' + (entry.clean ? '' : ' rh-pc--card');
        el.innerHTML = '<svg class="rh-pc__hook" viewBox="0 0 22 30" aria-hidden="true"><path d="M11 26V12a4 4 0 1 0-4-4"/></svg><span class="rh-pc__tag">' + escapeHtml(product.p) + '</span><img src="' + escapeHtml(sized(product.i[entry.n] || product.i[0], 700)) + '" alt="" draggable="false">';
        rack.appendChild(el);
        return { el: el, img: el.querySelector('img'), p: entry.i, ry: -68, sc: 1, x: 0 };
      });
      count = els.length; front = -1; layout();
    };
    var build = function () {
      var candidates = products.slice(0, 40), rail = [], found = [];
      render(candidates.slice(0, 14).map(function (_, i) { return { i: i, n: 0, clean: 0 }; }));
      var tests = [];
      candidates.forEach(function (product, i) {
        product.i.forEach(function (src, n) {
          tests.push(isClean(src).then(function (ok) {
            if (ok && !found.some(function (f) { return f.i === i; })) found.push({ i: i, n: n, clean: 1 });
          }));
        });
      });
      var timeout = new Promise(function (resolve) { setTimeout(resolve, 2600); });
      Promise.race([Promise.all(tests), timeout]).then(function () {
        if (!rack.isConnected) return;
        found.sort(function (a, b) { return a.i - b.i; }).forEach(function (entry) { if (rail.length < 16) rail.push(entry); });
        for (var i = 0; rail.length < 12 && i < candidates.length; i++) if (!rail.some(function (entry) { return entry.i === i; })) rail.push({ i: i, n: 0, clean: 0 });
        if (found.length) render(rail);
      });
    };
    var off = 0, mouse = null, over = false, drag = null, moved = 0, front = -1, last = performance.now(), visible = true;
    rack.addEventListener('mousemove', function (event) { var box = rack.getBoundingClientRect(); mouse = { x: event.clientX - box.left, y: event.clientY - box.top }; });
    rack.addEventListener('mouseenter', function () { over = true; });
    rack.addEventListener('mouseleave', function () { over = false; mouse = null; });
    rack.addEventListener('wheel', function (event) { if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) { event.preventDefault(); off += event.deltaX * 0.8; } }, { passive: false });
    rack.addEventListener('pointerdown', function (event) { drag = { x: event.clientX, off: off }; moved = 0; rack.setPointerCapture(event.pointerId); });
    rack.addEventListener('pointermove', function (event) { if (!drag) return; moved = Math.max(moved, Math.abs(event.clientX - drag.x)); off = drag.off - (event.clientX - drag.x); if (moved > 4) rack.classList.add('is-drag'); });
    rack.addEventListener('pointerup', function () { drag = null; rack.classList.remove('is-drag'); });
    rack.addEventListener('click', function () {
      if (moved > 4 || front < 0 || !mouse || !els[front]) return;
      var product = products[els[front].p];
      openProduct({ handle: product.h, image: els[front].img, title: product.t });
    });
    new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }).observe(section);
    var frame = function (now) {
      if (!rack.isConnected) return;
      var dt = Math.min(64, now - last) / 1000; last = now;
      if (visible && count) {
        if (!over && !drag && !state.productOpen) off += 24 * dt;
        var best = -1, bestD = 1e9, cx = mouse ? mouse.x : W * 0.56;
        els.forEach(function (item, i) {
          item.x = (((i * gap - off) % LOOP) + LOOP) % LOOP - gap * 1.2;
          var d = Math.abs(item.x - cx);
          if (mouse && (mouse.y < 0 || mouse.y > ih + 30)) d = 1e9;
          if (d < bestD) { bestD = d; best = i; }
        });
        if (mouse && bestD > gap * 0.6) best = front;
        if (best !== front && best >= 0) {
          front = best;
          var shown = products[els[front].p];
          nameNode.textContent = shortTitle(shown.t);
          priceNode.textContent = shown.p;
        }
        var t = now / 1000;
        els.forEach(function (item, i) {
          var x = item.x, y = railY(x), slope = (railY(x + 1) - railY(x - 1)) / 2;
          item.ry += ((i === front ? 0 : -68) - item.ry) * Math.min(1, dt * 9);
          item.sc += ((i === front ? 1.14 : 1) - item.sc) * Math.min(1, dt * 9);
          item.el.style.left = (x - iw / 2).toFixed(1) + 'px';
          item.el.style.top = (y - 2).toFixed(1) + 'px';
          item.img.style.transform = 'perspective(1200px) rotateY(' + item.ry.toFixed(2) + 'deg) scale(' + item.sc.toFixed(3) + ')';
          item.img.style.rotate = (Math.atan(slope) * 57.3 + Math.sin(t * 1.6 + i * 1.3) * (i === front ? 0.6 : 1.4)).toFixed(2) + 'deg';
        });
        progNode.style.left = ((((off % LOOP) + LOOP) % LOOP) / LOOP * 66) + '%';
      }
      requestAnimationFrame(frame);
    };
    var onResize = function () { if (!rack.isConnected) { window.removeEventListener('resize', onResize); return; } if (count) layout(); };
    window.addEventListener('resize', onResize);
    build();
    requestAnimationFrame(frame);
  };

  // ---------- Arbre « Raccolte » : sous-collections des panneaux Categoria (comme le méga-menu) ----------
  var fillTree = function () {
    var tree = root.querySelector('[data-dcl-tree]');
    if (!tree || typeof window.dhLoadPanels !== 'function') return;
    var handle = root.getAttribute('data-handle');
    window.dhLoadPanels().then(function (panels) {
      if (!tree.isConnected || !panels) return;
      tree.querySelectorAll('li[data-tree-kid]').forEach(function (kid) {
        var panel = panels[kid.getAttribute('data-tree-kid')];
        if (!panel) return;
        var cards = [].slice.call(panel.querySelectorAll('a.mobile-category-card:not(.mobile-category-card--view-all):not(.mobile-category-card--product)'));
        var placeholder = kid.querySelector(':scope > .tree__row i.ph');
        var firstImage = cards.length && cards[0].querySelector('img');
        if (placeholder && firstImage) {
          var image = document.createElement('img');
          image.src = firstImage.getAttribute('data-src') || firstImage.getAttribute('src');
          image.alt = ''; image.width = 28; image.height = 28; image.loading = 'lazy';
          placeholder.replaceWith(image);
        }
        if (kid.querySelector('.tree__grand') || !cards.length) return;
        var seen = {};
        var links = cards.filter(function (card) {
          var key = card.getAttribute('href');
          if (seen[key]) return false;
          seen[key] = true;
          return true;
        }).map(function (card) {
          var title = card.querySelector('.mobile-category-card__title');
          var href = card.getAttribute('href');
          var on = handleOf(href) === handle;
          if (on) {
            kid.classList.add('is-open', 'is-path');
            var top = kid.closest('.tree__top');
            if (top) top.classList.add('is-open', 'is-path');
          }
          return '<li><a href="' + escapeHtml(href) + '"' + (on ? ' class="is-current"' : '') + '>' + escapeHtml(title ? title.textContent.trim() : card.textContent.trim()) + '</a></li>';
        });
        var row = kid.querySelector(':scope > .tree__row');
        var label = kid.querySelector(':scope > .tree__row > a span');
        row.insertAdjacentHTML('beforeend', '<button type="button" class="tree__tg" aria-label="' + escapeHtml(label ? label.textContent : '') + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg></button>');
        kid.insertAdjacentHTML('beforeend', '<ul class="tree__grand">' + links.join('') + '</ul>');
      });
    });
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
    var sameCollection = handleOf(target.pathname) === root.getAttribute('data-handle');
    var token = ++navToken;
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

  // ---------- Vue produit ----------
  var overlay = function () { return document.querySelector('[data-dcl-ov]'); };
  var ov = function (selector) { return overlay().querySelector(selector); };
  var productCache = {};
  var getProduct = function (handle) {
    var base = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
    if (!productCache[handle]) {
      productCache[handle] = fetch(base + 'products/' + encodeURIComponent(handle) + '.js', { credentials: 'same-origin' }).then(function (response) {
        if (!response.ok) throw new Error('Product request failed: ' + response.status);
        return response.json();
      });
      productCache[handle].catch(function () { delete productCache[handle]; });
    }
    return productCache[handle];
  };
  var sizeIndex = function (product) {
    var names = (product.options || []).map(function (option) { return typeof option === 'string' ? option : option.name; });
    for (var i = 0; i < names.length; i++) if (/size|taglia|gr(ö|o)(ß|ss)e|taille|talla|maat|m(ă|a)rime|misura|numero|scarpa|pointure|shoe/i.test(names[i])) return i;
    return -1;
  };
  // Options à choisir (plus d'une valeur) : { index, name, values }
  var choiceGroups = function (product) {
    return (product.options || []).map(function (option, index) {
      return typeof option === 'string' ? { index: index, name: option, values: [] } : { index: index, name: option.name, values: option.values || [] };
    }).map(function (group) {
      if (!group.values.length) product.variants.forEach(function (v) { if (group.values.indexOf(v.options[group.index]) < 0) group.values.push(v.options[group.index]); });
      return group;
    }).filter(function (group) { return group.values.length > 1; });
  };
  var matchVariant = function (product, picked, skip) {
    return product.variants.filter(function (v) {
      return v.available && Object.keys(picked).every(function (k) { return Number(k) === skip || v.options[k] === picked[k]; });
    });
  };
  var paintChoices = function (pv) {
    var wrap = ov('[data-xpv-size-wrap]');
    wrap.querySelectorAll('[data-g]').forEach(function (list) {
      if (!list.classList.contains('xpv__sizes')) return;
      var index = Number(list.getAttribute('data-g'));
      [].forEach.call(list.children, function (button) {
        var trial = Object.assign({}, pv.picked); trial[index] = button.textContent;
        button.disabled = !matchVariant(pv.product, trial).length;
        button.classList.toggle('is-on', pv.picked[index] === button.textContent);
      });
    });
  };
  var productHandleOf = function (url) { var match = String(url || '').match(/\/products\/([^/?#]+)/); return match ? decodeURIComponent(match[1]) : ''; };
  var openProduct = function (from) {
    var state = current;
    var box = overlay();
    if (!box) return;
    state.pv = { handle: from.handle, picked: {}, product: null, index: from.index };
    state.productOpen = true;
    var image = ov('[data-xpv-img]');
    var host = box;
    ov('[data-xpv-name]').textContent = from.title ? shortTitle(from.title) : '';
    ov('[data-xpv-price]').innerHTML = '';
    ov('[data-xpv-views]').innerHTML = '';
    ov('[data-xpv-size-wrap]').innerHTML = '';
    var cards = [].slice.call(root.querySelectorAll('[data-dcl-grid] > .mshein-card'));
    ov('[data-xpv-count]').textContent = from.index != null && cards.length ? (from.index + 1) + ' / ' + cards.length : '';
    var startSrc = from.image ? (from.image.currentSrc || from.image.src) : '';
    image.style.transition = 'none'; image.style.transform = 'none';
    if (startSrc) image.src = sized(startSrc, 1100);
    var xpv = ov('[data-xpv]');
    xpv.classList.add('is-on');
    xpv.setAttribute('aria-hidden', 'false');
    if (from.image) {
      var source = from.image.getBoundingClientRect();
      requestAnimationFrame(function () {
        var box2 = image.getBoundingClientRect(), scale = source.height / (box2.height || 1);
        image.style.transform = 'translate(' + (source.left + source.width / 2 - (box2.left + box2.width * scale / 2)) + 'px,' + (source.top - box2.top) + 'px) scale(' + scale + ')';
        image.getBoundingClientRect();
        image.style.transition = 'transform .65s cubic-bezier(.2,.75,.2,1)';
        image.style.transform = 'none';
      });
    }
    getProduct(from.handle).then(function (product) {
      if (!state.pv || state.pv.handle !== from.handle) return;
      state.pv.product = product;
      var base = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
      ov('[data-xpv-link]').href = product.url || base + 'products/' + product.handle;
      ov('[data-xpv-name]').textContent = shortTitle(product.title);
      var variant = product.variants.filter(function (v) { return v.available; })[0] || product.variants[0];
      var off = variant.compare_at_price > variant.price ? Math.round((variant.compare_at_price - variant.price) * 100 / variant.compare_at_price) : 0;
      ov('[data-xpv-price]').innerHTML = escapeHtml(money(variant.price)) + (off ? '<s>' + escapeHtml(money(variant.compare_at_price)) + '</s><i>-' + off + '%</i>' : '');
      var images = (product.images || []).slice(0, 4);
      ov('[data-xpv-views]').innerHTML = images.map(function (src, k) {
        return '<button type="button" class="' + (k ? '' : 'is-on') + '" data-k="' + k + '">' + escapeHtml(k ? host.getAttribute('data-view').replace('__N__', k + 1) : host.getAttribute('data-front')) + '</button>';
      }).join('');
      if (!startSrc && images[0]) image.src = sized(images[0], 1100);
      // Une rangée par option (Taglia, Colore…), comme la rangée « Taglia » du prototype ; seule valeur possible : déjà choisie
      var groups = choiceGroups(product);
      var wrap = ov('[data-xpv-size-wrap]');
      wrap.hidden = !groups.length;
      wrap.innerHTML = groups.map(function (group) {
        var isSize = group.index === sizeIndex(product);
        return '<div class="xpv__lbl" data-g="' + group.index + '">' + escapeHtml(group.name) + '<em>' + escapeHtml(isSize ? wrap.getAttribute('data-choose-size') : wrap.getAttribute('data-choose')) + '</em></div>' +
          '<div class="xpv__sizes" data-g="' + group.index + '">' + group.values.map(function (value) { return '<button type="button">' + escapeHtml(value) + '</button>'; }).join('') + '</div>';
      }).join('');
      paintChoices(state.pv);
      ov('[data-xpv-add]').disabled = !product.available;
      ov('[data-xpv-add]').textContent = product.available ? ov('[data-xpv-add]').getAttribute('data-label') || ov('[data-xpv-add]').textContent : host.getAttribute('data-sold-out');
    }).catch(function (error) { console.error(error); });
  };
  var closeProduct = function () {
    if (!current) return;
    current.productOpen = false;
    current.pv = null;
    var xpv = overlay() && ov('[data-xpv]');
    if (xpv) { xpv.classList.remove('is-on'); xpv.setAttribute('aria-hidden', 'true'); }
  };
  var stepProduct = function (step) {
    if (!current.pv) return;
    var cards = [].slice.call(root.querySelectorAll('[data-dcl-grid] > .mshein-card'));
    if (!cards.length) return;
    var index = current.pv.index != null ? current.pv.index : -1;
    index = (index + step + cards.length) % cards.length;
    var card = cards[index];
    var link = card.querySelector('.mshein-card__title a, a.mshein-card__link');
    openProduct({ handle: productHandleOf(link && link.getAttribute('href')), image: null, title: card.getAttribute('data-mshein-title') || (link ? link.textContent : ''), index: index });
  };

  // ---------- Panier : tiroir du site (snippets/cart-drawer-mobile.liquid, le même qu'en mobile) ----------
  var cartBase = function () { return (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/'; };
  var setCount = function (count) {
    document.querySelectorAll('#cart-count, .mobile-home-cart-count, [data-dh-cart]').forEach(function (node) { node.textContent = count; });
  };
  var drawerSection = function () { var drawer = document.getElementById('cart'); return drawer && drawer.getAttribute('data-section-id'); };
  var openSiteCart = function (sections) {
    // Nouveau rendu du tiroir (reçu avec l'ajout, comme assets/cart-drawer-mobile.js) affiché et ouvert par le thème
    // (assets/custom-async.js) ; sinon la page panier
    if (window.ajaxCart && typeof window.ajaxCart.load === 'function') window.ajaxCart.load(sections ? { sections: sections } : false, true);
    else location.href = cartBase() + 'cart';
    fetch(cartBase() + 'cart.js', { credentials: 'same-origin' }).then(function (response) { return response.json(); }).then(function (cart) { setCount(cart.item_count); }).catch(function () {});
  };
  var addToCart = function () {
    var pv = current.pv;
    if (!pv || !pv.product) return;
    var product = pv.product;
    var missing = choiceGroups(product).filter(function (group) { return pv.picked[group.index] == null; });
    ov('[data-xpv-size-wrap]').querySelectorAll('.xpv__lbl').forEach(function (label) {
      label.classList.toggle('is-warn', missing.some(function (group) { return String(group.index) === label.getAttribute('data-g'); }));
    });
    if (missing.length) return;
    var variant = matchVariant(product, pv.picked)[0];
    if (!variant) return;
    var button = ov('[data-xpv-add]');
    button.disabled = true;
    fetch(cartBase() + 'cart/add.js', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: [{ id: variant.id, quantity: 1 }], sections: drawerSection() ? [drawerSection()] : undefined, sections_url: location.pathname })
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok) throw new Error(data.description || data.message || 'add failed');
        closeProduct();
        openSiteCart(data.sections);
      });
    }).catch(function (error) {
      toast(error.message || overlay().getAttribute('data-error'));
    }).then(function () { button.disabled = false; });
  };
  var bindOverlay = function () {
    var fresh = root.querySelector('[data-dcl-ov]');
    if (fresh) {
      var old = document.body.querySelector(':scope > [data-dcl-ov]');
      if (old) old.remove();
      document.body.appendChild(fresh);
    }
    var host = overlay();
    if (!host || host.dataset.bound) return;
    host.dataset.bound = 'true';
    var add = host.querySelector('[data-xpv-add]');
    add.setAttribute('data-label', add.textContent);
    host.addEventListener('click', function (event) {
      var target = event.target;
      if (target.closest('[data-xpv-x]') || target.closest('[data-xpv-stage]')) { closeProduct(); return; }
      var nav = target.closest('.xpv__nav');
      if (nav) { stepProduct(Number(nav.getAttribute('data-step'))); return; }
      var view = target.closest('[data-xpv-views] button');
      if (view && current.pv && current.pv.product) {
        [].forEach.call(view.parentNode.children, function (node) { node.classList.toggle('is-on', node === view); });
        ov('[data-xpv-img]').style.transform = 'none';
        ov('[data-xpv-img]').src = sized(current.pv.product.images[Number(view.getAttribute('data-k'))], 1100);
        return;
      }
      var choice = target.closest('.xpv__sizes button');
      if (choice && !choice.disabled && current.pv && current.pv.product) {
        var group = choice.parentNode.getAttribute('data-g');
        if (current.pv.picked[group] === choice.textContent) delete current.pv.picked[group]; else current.pv.picked[group] = choice.textContent;
        paintChoices(current.pv);
        var label = ov('[data-xpv-size-wrap] .xpv__lbl[data-g="' + group + '"]');
        if (label) label.classList.remove('is-warn');
        // Photo de la variante choisie
        var match = matchVariant(current.pv.product, current.pv.picked)[0];
        if (match && match.featured_image && match.featured_image.src) { ov('[data-xpv-img]').style.transform = 'none'; ov('[data-xpv-img]').src = sized(match.featured_image.src, 1100); }
        return;
      }
      if (target.closest('[data-xpv-add]')) addToCart();
    });
  };

  // ---------- Événements de la page ----------
  var bindRoot = function () {
    root.addEventListener('click', function (event) {
      var target = event.target;
      var toggle = target.closest('.tree__tg');
      if (toggle) { event.preventDefault(); toggle.closest('li').classList.toggle('is-open'); return; }
      var section = target.closest('.flt__tg');
      if (section) { section.parentNode.classList.toggle('is-open'); return; }
      var option = target.closest('[data-dcl-filters] [data-q]');
      if (option) { navigate(urlWith(withPairs(option.getAttribute('data-q'), option.classList.contains('is-on')))); return; }
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
      // Cartes : cœur = wishlist ; ailleurs = vue produit (Ctrl / Cmd + clic : fiche produit dans un nouvel onglet)
      var card = target.closest('[data-dcl-grid] > .mshein-card');
      if (card) {
        var heart = target.closest('.mshein-card__fav');
        if (heart) { event.preventDefault(); event.stopPropagation(); toggleHeart(card, heart); return; }
        if (event.metaKey || event.ctrlKey || event.shiftKey) return;
        var link = card.querySelector('.mshein-card__title a, a.mshein-card__link');
        var productHandle = productHandleOf(link && link.getAttribute('href'));
        if (!productHandle) return;
        event.preventDefault();
        event.stopPropagation();
        var cards = [].slice.call(root.querySelectorAll('[data-dcl-grid] > .mshein-card'));
        openProduct({ handle: productHandle, image: card.querySelector('.mshein-card__link img'), title: card.getAttribute('data-mshein-title') || (link ? link.textContent : ''), index: cards.indexOf(card) });
      }
    });
    root.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && event.target.matches('[data-dcl-price] input')) { event.preventDefault(); root.querySelector('[data-dcl-price-ok]').click(); }
    });
  };

  var init = function (node) {
    root = node;
    current = { view: current ? current.view : 'grid', saleOn: false, productOpen: false, pv: null };
    setFullWidth();
    bindOverlay();
    bindRoot();
    afterContent();
    startRail(current);
    markHeader();
    if ('requestIdleCallback' in window) window.requestIdleCallback(fillTree, { timeout: 2500 }); else setTimeout(fillTree, 600);
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
    closeProduct();
    navigate(location.pathname + location.search, { push: false, full: handleOf(location.pathname) !== root.getAttribute('data-handle') });
  });
  document.addEventListener('click', function (event) {
    if (!root) return;
    var menu = root.querySelector('[data-dcl-sort-menu]');
    if (menu && !menu.hidden && !event.target.closest('.srt')) { menu.hidden = true; root.querySelector('[data-dcl-sort-btn]').setAttribute('aria-expanded', 'false'); }
  });
  document.addEventListener('keydown', function (event) {
    if (!current || !overlay()) return;
    if (event.key === 'Escape' && current.productOpen) closeProduct();
    if (current.productOpen && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) stepProduct(event.key === 'ArrowRight' ? 1 : -1);
  });
  history.replaceState({ dcl: true }, '', location.href);

  var start = function () { var node = document.querySelector('[data-dcl]'); if (node) init(node); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
