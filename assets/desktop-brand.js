/* Page brand ORDINATEUR (sections/desktop-brand.liquid) : catégories de la marque (pastilles, panneau), photos des grandes
   cartes, recherche dans la marque avec suggestions (recherche prédictive Shopify), panneau de la marque, panneau
   « Filtri » (tri, disponibilité, prix : vrais filtres Shopify, page rechargée), menu de tri, « Mostra altri prodotti »
   (page suivante ajoutée à la grille), barre compacte au défilement. */
(function () {
  'use strict';

  var root = document.querySelector('[data-br]');
  if (!root || window.matchMedia('(max-width: 760px)').matches) return;

  var brand = root.getAttribute('data-br-name') || '';
  var base = root.getAttribute('data-br-base') || location.pathname;
  var searchUrl = root.getAttribute('data-br-search') || '/search';
  var currency = root.getAttribute('data-br-currency') || '';
  var grid = root.querySelector('[data-br-grid]');
  document.body.style.setProperty('--br-page', getComputedStyle(root).getPropertyValue('--brand'));
  // La recherche de l'en-tête reprend la requête de la page (title:"Marque" …) : on ne l'affiche pas
  document.querySelectorAll('input[name="q"]').forEach(function (field) {
    if (!root.contains(field) && /title:/.test(field.value)) field.value = '';
  });

  var esc = function (text) {
    return String(text).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; });
  };
  // Recherche dans la marque limitée aux titres : title:"Marque" title:mot … (sinon la recherche ramène d'autres produits)
  var brandTerm = root.getAttribute('data-br-term') || brand;
  var brandSearch = function (term) {
    var words = String(term || '').trim().split(/\s+/).filter(Boolean).map(function (w) { return 'title:' + w; });
    return searchUrl + '?q=' + encodeURIComponent(['title:"' + brandTerm + '"'].concat(words).join(' ')) + '&type=product&view=brand';
  };
  var cards = function () {
    return [].slice.call(grid.querySelectorAll('.mshein-card')).map(function (card) {
      var img = card.querySelector('.mshein-card__link img');
      var link = card.querySelector('.mshein-card__title a');
      return { title: card.getAttribute('data-mshein-title') || (link && link.textContent.trim()) || '', img: img ? (img.currentSrc || img.src) : '', url: link ? link.href : '' };
    });
  };
  var stop = /^(official|genuine|authentic|originals?|men|mens|women|womens|unisex|new|the|and|with|for|da|di|per|con|uomo|donna|scarpe|shoes|sneakers)$/;
  var short = function (title) { return title.replace(/\b(official|genuine|authentic|originals?)\b/gi, '').replace(/\s+/g, ' ').trim(); };

  // ---------- Catégories : mots-clés les plus fréquents des titres (après le nom de la marque) ----------
  var keywords = function (list, filterTerm, limit) {
    // Expressions de 1 à 3 mots les plus fréquentes ; on garde les plus longues et on écarte celles qui partagent un
    // mot avec une expression déjà retenue (« air max plus » plutôt que « max plus », « plus running »…)
    var count = {};
    var brandWords = brand.toLowerCase().split(/\s+/);
    list.forEach(function (item) {
      var words = short(item.title).toLowerCase().replace(/[^a-z0-9àèéìòù\s-]/g, ' ').split(/\s+/).filter(function (w) {
        return w.length > 1 && brandWords.indexOf(w) < 0 && !/\d/.test(w);
      });
      var seen = {};
      for (var size = 1; size <= 3; size += 1) {
        for (var i = 0; i + size <= words.length; i += 1) {
          var part = words.slice(i, i + size);
          if (stop.test(part[0]) || stop.test(part[part.length - 1])) continue;
          if (size === 1 && part[0].length < 5) continue;
          var key = part.join(' ');
          if (seen[key] || (filterTerm && key.indexOf(filterTerm) < 0)) continue;
          seen[key] = true;
          count[key] = (count[key] || 0) + 1;
        }
      }
    });
    var minCount = filterTerm ? 2 : 3;
    var score = function (k) { var n = k.split(' ').length; return count[k] * (n === 1 ? 0.6 : 1 + (n - 2) * 0.35); };
    var picked = [];
    var used = {};
    Object.keys(count).filter(function (k) { return count[k] >= minCount; })
      .sort(function (a, b) { return score(b) - score(a); })
      .forEach(function (k) {
        if (picked.length >= limit) return;
        var parts = k.split(' ');
        if (parts.some(function (w) { return used[w]; })) return;
        picked.push(k);
        parts.forEach(function (w) { used[w] = true; });
      });
    return picked;
  };
  var titleCase = function (text) { return text.replace(/\b\w/g, function (ch) { return ch.toUpperCase(); }); };

  var list = cards();
  var cats = keywords(list, '', 6).map(function (key) {
    var match = list.filter(function (item) { return item.title.toLowerCase().indexOf(key) > -1; })[0] || list[0];
    return { label: titleCase(key), url: brandSearch(key), img: match ? match.img : '' };
  });
  var current = (new URLSearchParams(location.search).get('q') || '').toLowerCase();
  var allUrl = base;
  var pill = function (item, on) {
    return '<a class="br-pill' + (on ? ' on' : '') + '" href="' + esc(item.url) + '">' + (item.img ? '<img src="' + esc(item.img) + '" alt="" loading="lazy">' : '') + esc(item.label) + '</a>';
  };
  var pillsHtml = pill({ label: 'Vedi tutto', url: allUrl, img: list[0] && list[0].img }, !current || current.indexOf('title:', current.indexOf('"', current.indexOf('"') + 1)) < 0)
    + cats.map(function (item) { return pill(item, decodeURIComponent(item.url.split('q=')[1].split('&')[0]).toLowerCase() === current); }).join('');
  root.querySelectorAll('[data-br-pills]').forEach(function (box) { box.innerHTML = pillsHtml; });
  var panelCats = root.querySelector('[data-br-panel-cats]');
  if (panelCats) {
    panelCats.innerHTML = [{ label: 'Vedi tutto', url: allUrl, img: list[0] && list[0].img }].concat(cats).map(function (item) {
      return '<a href="' + esc(item.url) + '">' + (item.img ? '<img src="' + esc(item.img) + '" alt="" loading="lazy">' : '') + esc(item.label) + '</a>';
    }).join('');
  }

  // ---------- Grandes cartes : photos des produits de la page ----------
  root.querySelectorAll('[data-br-feat-card]').forEach(function (card, index) {
    var item = list[index * 3] || list[index];
    if (item && item.img) card.insertAdjacentHTML('afterbegin', '<img src="' + esc(item.img) + '" alt="" loading="lazy">');
  });

  // ---------- Barre compacte ----------
  var heroPills = root.querySelector('.br-pills');
  var sticky = root.querySelector('[data-br-sticky]');
  var syncBar = function () { if (sticky && heroPills) sticky.classList.toggle('on', heroPills.getBoundingClientRect().bottom < 0); };
  window.addEventListener('scroll', syncBar, { passive: true });
  syncBar();

  // ---------- Panneaux ----------
  var toastBox = root.querySelector('[data-br-toast]');
  var toast = function (text) {
    if (!toastBox) return;
    toastBox.textContent = text; toastBox.classList.add('on');
    clearTimeout(toast.timer); toast.timer = setTimeout(function () { toastBox.classList.remove('on'); }, 1600);
  };
  var close = function () { root.classList.remove('menu-open', 'fd-open'); };
  root.addEventListener('click', function (event) {
    var target = event.target;
    if (target.closest('[data-br-open-menu]')) { close(); root.classList.add('menu-open'); }
    if (target.closest('[data-br-open-filters]')) { close(); root.classList.add('fd-open'); }
    if (target.closest('[data-br-close]')) close();
    var copy = target.closest('[data-br-copy]');
    if (copy && navigator.clipboard) navigator.clipboard.writeText(copy.getAttribute('data-br-copy')).then(function () { toast('Email copiata'); });
    if (target.closest('[data-br-share]')) {
      if (navigator.share) navigator.share({ title: brand, url: location.href }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(function () { toast('Link copiato'); });
    }
    if (target.closest('[data-br-goto-search]')) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(function () { root.querySelector('[data-br-q]').focus(); }, 450);
    }
  });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape') { close(); closeSugg(); } });

  // ---------- Filtres Shopify (tri, disponibilité, prix) : nouvelle adresse ----------
  var go = function (change) {
    var url = new URL(location.href);
    url.searchParams.set('view', 'brand');
    url.searchParams.delete('page');
    change(url.searchParams);
    url.hash = 'prodotti';
    location.href = url.toString();
  };
  var menu = root.querySelector('[data-br-menu]');
  if (menu) {
    menu.addEventListener('click', function (event) {
      var option = event.target.closest('[data-br-sort]');
      if (option) { go(function (p) { p.set('sort_by', option.getAttribute('data-br-sort')); }); return; }
      menu.classList.toggle('open');
    });
    document.addEventListener('click', function (event) { if (!event.target.closest('[data-br-menu]')) menu.classList.remove('open'); });
  }
  var toggleParam = function (pair, on) {
    var parts = pair.split('=');
    go(function (p) { if (on) p.set(parts[0], parts[1]); else p.delete(parts[0]); });
  };
  root.querySelectorAll('[data-br-toggle]').forEach(function (button) {
    button.addEventListener('click', function () { toggleParam(button.getAttribute('data-br-toggle'), !button.classList.contains('on')); });
  });

  // Panneau « Filtri » : choix gardés jusqu'à « Fatto »
  var pending = { sort: null, avail: null };
  root.querySelectorAll('[data-br-fd-sort]').forEach(function (button) {
    button.addEventListener('click', function () {
      root.querySelectorAll('[data-br-fd-sort]').forEach(function (b) { b.classList.toggle('on', b === button); });
      pending.sort = button.getAttribute('data-br-fd-sort');
    });
  });
  var availButton = root.querySelector('[data-br-fd-avail]');
  if (availButton) availButton.addEventListener('click', function () { availButton.classList.toggle('on'); pending.avail = availButton.classList.contains('on'); });
  var range = root.querySelector('[data-br-range]');
  var rMin = root.querySelector('[data-br-rmin]');
  var rMax = root.querySelector('[data-br-rmax]');
  var pMin = root.querySelector('[data-br-pmin]');
  var pMax = root.querySelector('[data-br-pmax]');
  var max = range ? Number(range.getAttribute('data-max')) || 1 : 1;
  var paint = function () {
    if (!range) return;
    var low = Math.min(Number(rMin.value), Number(rMax.value));
    var high = Math.max(Number(rMin.value), Number(rMax.value));
    var fill = range.querySelector('.br-range__fill');
    fill.style.left = (low / max * 100) + '%';
    fill.style.right = (100 - high / max * 100) + '%';
  };
  if (range) {
    rMin.addEventListener('input', function () { if (+rMin.value > +rMax.value) rMin.value = rMax.value; pMin.value = rMin.value; paint(); });
    rMax.addEventListener('input', function () { if (+rMax.value < +rMin.value) rMax.value = rMin.value; pMax.value = +rMax.value >= max ? '' : rMax.value; paint(); });
    pMin.addEventListener('change', function () { rMin.value = Math.max(0, Math.min(+pMin.value || 0, max)); paint(); });
    pMax.addEventListener('change', function () { rMax.value = pMax.value === '' ? max : Math.max(0, Math.min(+pMax.value, max)); paint(); });
    paint();
  }
  var apply = root.querySelector('[data-br-apply]');
  if (apply) {
    apply.addEventListener('click', function () {
      go(function (p) {
        if (pending.sort) p.set('sort_by', pending.sort);
        if (availButton && pending.avail !== null) {
          var parts = availButton.getAttribute('data-br-fd-avail').split('=');
          if (pending.avail) p.set(parts[0], parts[1]); else p.delete(parts[0]);
        }
        if (range) {
          var minParam = range.getAttribute('data-min-param');
          var maxParam = range.getAttribute('data-max-param');
          var low = Number(rMin.value);
          var high = Number(rMax.value);
          if (low > 0) p.set(minParam, low); else p.delete(minParam);
          if (high < max) p.set(maxParam, high); else p.delete(maxParam);
        }
      });
    });
  }

  // ---------- « Mostra altri prodotti » ----------
  var more = root.querySelector('[data-br-more]');
  var nextUrl = function (doc) {
    var marker = (doc || document).querySelector('[data-br-next]');
    return marker ? marker.getAttribute('data-br-next') : '';
  };
  var next = nextUrl();
  if (more) {
    more.parentElement.hidden = !next;
    more.addEventListener('click', function () {
      if (!next || more.getAttribute('aria-busy') === 'true') return;
      more.setAttribute('aria-busy', 'true');
      var url = new URL(next, location.origin);
      url.searchParams.set('view', 'brand');
      fetch(url.toString(), { credentials: 'same-origin' })
        .then(function (response) { if (!response.ok) throw new Error(response.status); return response.text(); })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var marker = grid.querySelector('[data-br-next]');
          if (marker) marker.remove();
          var incoming = doc.querySelector('[data-br-grid]');
          if (incoming) [].slice.call(incoming.children).forEach(function (child) { grid.appendChild(document.importNode(child, true)); });
          next = nextUrl();
          more.parentElement.hidden = !next;
          if (window.msheinCards && typeof window.msheinCards.decorate === 'function') window.msheinCards.decorate(grid);
        })
        .catch(function (error) { console.error('Brand page: next page failed.', error); toast('Riprova tra un attimo'); })
        .then(function () { more.removeAttribute('aria-busy'); });
    });
  }

  // ---------- Recherche dans la marque avec suggestions ----------
  var sw = root.querySelector('[data-br-sw]');
  var form = root.querySelector('[data-br-form]');
  var input = root.querySelector('[data-br-q]');
  var sugg = root.querySelector('[data-br-sugg]');
  var SEARCH_IC = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
  var item = function (inner, attr) { return '<button class="br-sugg__i" type="button" ' + attr + '>' + inner + '</button>'; };
  var highlight = function (text, q) {
    var i = text.toLowerCase().indexOf(q);
    return i < 0 ? '<span class="dim">' + esc(text) + '</span>' : '<mark>' + esc(text.slice(0, i + q.length)) + '</mark><span class="dim">' + esc(text.slice(i + q.length)) + '</span>';
  };
  var closeSugg = function () { if (sw) sw.classList.remove('open'); };
  var request = 0;
  var paintSugg = function () {
    var q = input.value.trim().toLowerCase();
    sw.classList.toggle('typed', Boolean(q));
    if (!q) {
      sugg.innerHTML = '<p class="br-sugg__h">Popolari in ' + esc(brand) + '</p>' + cards().slice(0, 10).map(function (c) {
        return item(SEARCH_IC + '<span><b>' + esc(short(c.title)) + '</b></span>', 'data-go="' + esc(c.url) + '"');
      }).join('');
      return;
    }
    var words = keywords(cards(), q, 6);
    var html = item(SEARCH_IC + '<span><b>' + esc(q) + '</b></span>', 'data-q="' + esc(q) + '"');
    sugg.innerHTML = html + '<div data-br-sugg-products></div>' + words.map(function (k) {
      return item(SEARCH_IC + '<span><b>' + highlight(k, q) + '</b></span>', 'data-q="' + esc(k) + '"');
    }).join('');
    // Produits de la marque : recherche prédictive Shopify
    var id = request += 1;
    var root_ = root.getAttribute('data-br-root') || '/';
    fetch(root_ + 'search/suggest.json?q=' + encodeURIComponent(brand + ' ' + q) + '&resources[type]=product&resources[limit]=4', { credentials: 'same-origin' })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) {
        if (id !== request || !data) return;
        var products = (((data.resources || {}).results || {}).products || []).slice(0, 3);
        var box = sugg.querySelector('[data-br-sugg-products]');
        if (!box) return;
        box.innerHTML = products.map(function (p) {
          return item((p.image ? '<img src="' + esc(p.image) + '" alt="">' : SEARCH_IC) + '<span><b>' + esc(short(p.title)) + '</b><small>' + esc(p.price ? currency + p.price : '') + '</small></span>', 'data-go="' + esc(p.url) + '"');
        }).join('');
      })
      .catch(function () {});
  };
  if (input) {
    input.addEventListener('focus', function () { paintSugg(); sw.classList.add('open'); });
    input.addEventListener('input', paintSugg);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (input.value.trim()) location.href = brandSearch(input.value.trim());
    });
    sugg.addEventListener('mousedown', function (event) { event.preventDefault(); });
    sugg.addEventListener('click', function (event) {
      var button = event.target.closest('.br-sugg__i');
      if (!button) return;
      if (button.getAttribute('data-go')) location.href = button.getAttribute('data-go');
      else location.href = brandSearch(button.getAttribute('data-q'));
    });
    root.querySelector('[data-br-clear]').addEventListener('click', function () { input.value = ''; input.focus(); paintSugg(); });
    document.addEventListener('click', function (event) { if (!event.target.closest('[data-br-sw]')) closeSugg(); });
  }
})();
