/* Page brand ORDINATEUR (sections/desktop-brand.liquid) : catégories de la marque (pastilles, panneau), photos des grandes
   cartes, recherche dans la marque avec suggestions (recherche prédictive Shopify), panneau de la marque, panneau
   « Filtri » (tri, disponibilité, prix : vrais filtres Shopify, page rechargée), menu de tri, « Mostra altri prodotti »
   (page suivante ajoutée à la grille), barre compacte au défilement. */
(function () {
  'use strict';
  if (window.__brandInit) return; // déjà chargé (page marque ouverte sur place puis script de la section)

  // Une marque à la fois : init(root) au chargement, puis à nouveau sur la page de l'autre marque quand on change de
  // marque sans recharger (« Autres marques », bouton Retour du navigateur)
  var isMobile = function () { return window.matchMedia('(max-width: 760px)').matches; };
  var init = function (root) {

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
    // Textes traduits (sections/desktop-brand.liquid) : le filtre t échappe déjà le HTML, on le décode avant esc()
    var i18n = {};
    try { i18n = JSON.parse((root.querySelector('[data-br-i18n]') || {}).textContent || '{}'); } catch (error) { /* textes par défaut */ }
    var decoder = document.createElement('textarea');
    var t = function (key, fallback) {
      if (i18n[key] == null) return fallback;
      decoder.innerHTML = i18n[key];
      return decoder.value;
    };
    var catLabel = function (label) { return (i18n.cats && i18n.cats[label]) || label; };
    var countText = function (n) { return n === 1 ? t('products_one', '1 prodotto') : t('products_count', '__N__ prodotti').replace('__N__', n); };
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

    // ---------- Catégories comme le prototype (« Air Max Plus TN, Running, Basket, Air Force 1, Donna, Uomo ») ----------
    // Liste de catégories connues (titres en italien ou en anglais), retenues si au moins 2 produits de la page en font
    // partie ; complétées par les expressions fréquentes des titres. Lien : recherche de la marque + la catégorie.
    var brandQuery = function (extra) {
      return searchUrl + '?q=' + encodeURIComponent('title:"' + brandTerm + '" ' + extra) + '&type=product&view=brand';
    };
    var CATALOG = [
      ['Air Max Plus TN', /air max plus|\btn\b/, 'title:"air max plus"'],
      ['Air Max', /air max/, 'title:"air max"', 'Air Max Plus TN'],
      ['Running', /running|\bcorsa\b/, '(title:running OR title:corsa)'],
      ['Basket', /basket/, '(title:basketball OR title:basket)'],
      ['Air Force 1', /air force|\baf1\b/, 'title:"air force"'],
      ['Jordan', /jordan/, 'title:jordan'],
      ['Sandali', /sandal/, '(title:sandali OR title:sandals)'],
      ['Ciabatte', /ciabatt|slide|slipper/, '(title:ciabatte OR title:slides OR title:slippers)'],
      ['Stivali', /stival|\bboots?\b/, '(title:stivali OR title:boots)'],
      ['Felpe', /felp|hoodie|sweatshirt/, '(title:felpa OR title:hoodie OR title:sweatshirt)'],
      ['T-shirt', /t-shirt|tshirt/, '(title:t-shirt OR title:tshirt)'],
      ['Giacche', /giacc|jacket/, '(title:giacca OR title:jacket)'],
      ['Pantaloni', /pantalon|\bpants\b/, '(title:pantaloni OR title:pants)'],
      ['Tute', /\btuta\b|tracksuit/, '(title:tuta OR title:tracksuit)'],
      ['Borse', /\bbors|\bbags?\b/, '(title:borsa OR title:bag)'],
      ['Automatici', /automatic/, '(title:automatico OR title:automatic)'],
      ['Al quarzo', /quarz/, '(title:quarzo OR title:quartz)'],
      ['Cronografi', /cronograf|chronograph/, '(title:cronografo OR title:chronograph)'],
      ['Subacquei', /subacque|\bdiver/, '(title:subacqueo OR title:diver)']
    ];
    var GENDER = [
      ['Donna', /\bwomen|\bdonna\b|\bwmns?\b/, '(title:women OR title:donna)'],
      ['Uomo', /\bmen\b|\bmen's|\bmens\b|\buomo\b/, '(title:men OR title:uomo)']
    ];
    var list = cards();
    var firstMatch = function (re) { return list.filter(function (item) { return re.test(item.title.toLowerCase()); })[0]; };
    var countOf = function (re) { return list.filter(function (item) { return re.test(item.title.toLowerCase()); }).length; };
    var brandLower = brand.toLowerCase();
    // Photo différente pour chaque catégorie (pastilles, grandes cartes) : premier produit de la catégorie pas encore utilisé
    var usedImg = {};
    if (list[0]) usedImg[list[0].img] = true;
    var pickImg = function (test) {
      var hits = list.filter(test);
      var m = hits.filter(function (item) { return !usedImg[item.img]; })[0] || hits[0];
      if (m) usedImg[m.img] = true;
      return m ? m.img : '';
    };
    var reTest = function (re) { return function (item) { return re.test(item.title.toLowerCase()); }; };
    var picked = CATALOG.filter(function (c) { return c[0].toLowerCase() !== brandLower && countOf(c[1]) >= 2; })
      .sort(function (a, b) { return countOf(b[1]) - countOf(a[1]); });
    picked = picked.filter(function (c) { return !c[3] || !picked.some(function (o) { return o[0] === c[3]; }); }).slice(0, 4);
    var cats = picked.map(function (c) { return { label: catLabel(c[0]), url: brandQuery(c[2]), img: pickImg(reTest(c[1])), re: c[1] }; });
    if (cats.length < 4) {
      keywords(list, '', 6).forEach(function (key) {
        if (cats.length >= 4 || cats.some(function (c) { return c.label.toLowerCase().indexOf(key) > -1; })) return;
        cats.push({ label: titleCase(key), url: brandSearch(key), img: pickImg(function (item) { return item.title.toLowerCase().indexOf(key) > -1; }), re: new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
      });
    }
    GENDER.forEach(function (g) {
      if (countOf(g[1]) >= 2) { cats.push({ label: catLabel(g[0]), url: brandQuery(g[2]), img: pickImg(reTest(g[1])), re: g[1], gender: true }); }
    });
    var current = (new URLSearchParams(location.search).get('q') || '').toLowerCase();
    var allUrl = base;
    var pill = function (item, on) {
      return '<a class="br-pill' + (on ? ' on' : '') + '" href="' + esc(item.url) + '">' + (item.img ? '<img src="' + esc(item.img) + '" alt="" loading="lazy">' : '') + esc(item.label) + '</a>';
    };
    var seeAll = t('see_all', 'Vedi tutto');
    var pillsHtml = pill({ label: seeAll, url: allUrl, img: list[0] && list[0].img }, !current || current.indexOf('title:', current.indexOf('"', current.indexOf('"') + 1)) < 0)
      + cats.map(function (item) { return pill(item, decodeURIComponent(item.url.split('q=')[1].split('&')[0]).toLowerCase() === current); }).join('');
    root.querySelectorAll('[data-br-pills]').forEach(function (box) { box.innerHTML = pillsHtml; });
    var panelCats = root.querySelector('[data-br-panel-cats]');
    if (panelCats) {
      panelCats.innerHTML = [{ label: seeAll, url: allUrl, img: list[0] && list[0].img }].concat(cats).map(function (item) {
        return '<a href="' + esc(item.url) + '">' + (item.img ? '<img src="' + esc(item.img) + '" alt="" loading="lazy">' : '') + esc(item.label) + '</a>';
      }).join('');
    }

    // ---------- Nombre de produits et prix le plus bas (templates *.brand-count) ----------
    var countUrl = function (url, cheapest) {
      var u = new URL(url, location.origin);
      u.searchParams.set('view', 'brand-count');
      u.searchParams.delete('page');
      if (cheapest) u.searchParams.set('sort_by', 'price-ascending');
      return u.toString();
    };
    var getCount = function (url, cheapest) {
      return fetch(countUrl(url, cheapest), { credentials: 'same-origin' })
        .then(function (response) { return response.ok ? response.json() : null; })
        .catch(function () { return null; });
    };
    var money = function (cents) { return currency + (cents / 100).toFixed(2); };
    var fromBox = root.querySelector('[data-br-from]');
    if (fromBox) {
      getCount(location.href, true).then(function (data) { if (data && data.from > 0) fromBox.innerHTML = t('from_html', ' · da <b>__PRICE__</b>').replace('__PRICE__', esc(money(data.from))); });
    }

    // ---------- Grandes cartes comme le prototype : « Offerte » puis 3 catégories ----------
    var cardInfo = function (card) {
      var fav = card.querySelector('[data-price-cents]');
      var price = fav ? Number(fav.getAttribute('data-price-cents')) : 0;
      var compare = fav ? Number(fav.getAttribute('data-compare-at-price-cents')) : 0;
      return { price: price, compare: compare, off: compare > price && price > 0 ? Math.round((compare - price) / compare * 100) : 0 };
    };
    var feat = root.querySelector('[data-br-feat]');
    if (feat) {
      var gridCards = [].slice.call(grid.querySelectorAll('.mshein-card'));
      var best = gridCards.map(function (card, i) { return { i: i, off: cardInfo(card).off }; }).sort(function (a, b) { return b.off - a.off; });
      var items = [];
      var unusedImg = function (indexes) {
        for (var n = 0; n < indexes.length; n += 1) {
          var item = list[indexes[n]];
          if (item && item.img && !usedImg[item.img]) { usedImg[item.img] = true; return item.img; }
        }
        return '';
      };
      // « Promos » : photo d'un produit en promotion qui n'est pas déjà sur une autre carte
      if (best.length && best[0].off > 0) {
        var offers = t('offers', 'Offerte');
        items.push({ title: offers, label: offers + ' · ' + t('up_to', 'Fino a -__PCT__%').replace('__PCT__', best[0].off), img: unusedImg(best.filter(function (b) { return b.off > 0; }).map(function (b) { return b.i; })) || (list[best[0].i] || {}).img, sale: true });
      }
      // « Best Sellers » : la marque triée par meilleures ventes ; photo du produit le plus vendu (templates *.brand-count)
      var bestUrl = root.getAttribute('data-br-best');
      if (bestUrl) {
        var bestTitle = t('best_sellers', 'Più venduti');
        items.push({ title: bestTitle, label: bestTitle, img: unusedImg(list.map(function (item, i) { return i; }).reverse()), url: bestUrl, best: true });
      }
      cats.filter(function (c) { return !c.gender; }).slice(0, 4 - items.length).forEach(function (c) {
        items.push({ title: c.label, label: c.label, img: c.img, url: c.url });
      });
      // Mosaïque comme le prototype v3 : grande photo (1re catégorie), Promos, Meilleures ventes, photo large (2e catégorie)
    var catItems = items.filter(function (item) { return !item.sale && !item.best; });
    var tiles = [catItems[0], items.filter(function (item) { return item.sale; })[0], items.filter(function (item) { return item.best; })[0], catItems[1]].filter(Boolean);
    if (tiles.length < 4) tiles = items;
    var GO = '<span class="br-tile__go"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg></span>';
    feat.classList.toggle('br-feat--bento', tiles.length === 4);
    feat.removeAttribute('aria-busy');
    window.setTimeout(function () { if (typeof fadeImgs === 'function') fadeImgs(feat); }, 0);
    feat.innerHTML = tiles.map(function (item, k) {
      var kind = tiles.length === 4 ? (k === 0 ? ' br-tile--big' : k === 3 ? ' br-tile--wide' : '') : '';
      var tag = item.sale ? t('up_to', 'Fino a -__PCT__%').replace('__PCT__', best[0].off) : '';
      return '<a class="br-fcard br-tile' + kind + '" href="' + esc(item.url || '#prodotti') + '"' + (item.sale ? ' data-br-feat-sale' : '') + '>'
        + (item.img ? '<img src="' + esc(item.img) + '" alt="" loading="lazy" data-br-fimg="' + items.indexOf(item) + '">' : '')
        + '<span class="br-tile__tag" data-br-flabel="' + items.indexOf(item) + '"' + (tag ? '' : ' hidden') + '>' + esc(tag) + '</span><b>' + esc(item.title) + '</b>' + GO + '</a>';
    }).join('');
    // « 46 modèles » : nombre de produits de chaque catégorie ; Best Sellers : photo du n° 1 des ventes
      items.forEach(function (item, k) {
        if (!item.url) return;
        getCount(item.url).then(function (data) {
          if (!data) return;
          if (item.best) {
            var img = feat.querySelector('[data-br-fimg="' + k + '"]');
            var base = function (src) { return String(src).split('?')[0].replace(/^(https?:)?\/\/[^/]+/, ''); };
            var taken = Object.keys(usedImg).some(function (src) { return src && base(src) === base(data.img); });
            if (img && data.img && !taken) img.src = data.img;
            return;
          }
          var label = feat.querySelector('[data-br-flabel="' + k + '"]');
          if (label && data.count) { label.textContent = (data.count === 1 ? t('models_one', '__N__ modello') : t('models_other', '__N__ modelli')).replace('__N__', data.count); label.hidden = false; }
        });
      });
    }
    // ---------- Cartes comme le prototype v3 : remise « -15 % » sur la photo, étiquettes Sale / New Arrivals sous la photo ----------
    // ---------- Arrivée progressive (assets/desktop-brand.css, br-rise) : produits de l'écran l'un après l'autre, les
    // suivants en arrivant à l'écran ; photos en fondu à leur arrivée ----------
    var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fadeImgs = function (scope) {
      if (calm) return;
      scope.querySelectorAll('.mshein-card__img img:not([data-br-img]), .br-tile > img:not([data-br-img])').forEach(function (img) {
        img.setAttribute('data-br-img', '');
        if (img.complete && img.naturalWidth) return;
        img.classList.add('br-img-wait');
        var done = function () { img.classList.remove('br-img-wait'); img.classList.add('br-img-in'); };
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      });
    };
    var revealIo = !calm && 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
      var n = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        revealIo.unobserve(entry.target);
        entry.target.style.setProperty('--d', (n++ * 70) + 'ms');
        entry.target.classList.remove('br-wait');
        entry.target.classList.add('br-rise');
      });
    }, { rootMargin: '0px 0px -6% 0px' }) : null;
    var reveal = function (scope) {
      fadeImgs(scope);
      if (!revealIo) return;
      var bottom = window.innerHeight;
      var n = 0;
      scope.querySelectorAll('.mshein-card:not([data-br-rv])').forEach(function (card) {
        card.setAttribute('data-br-rv', '');
        if (card.hidden) return;
        if (card.getBoundingClientRect().top < bottom) {
          card.style.setProperty('--d', (300 + Math.min(n++, 10) * 60) + 'ms');
          card.classList.add('br-rise');
        } else {
          card.classList.add('br-wait');
          revealIo.observe(card);
        }
      });
    };
    var decorateCards = function (scope) {
      reveal(scope);
      scope.querySelectorAll('.mshein-card:not([data-br-deco])').forEach(function (card) {
        card.setAttribute('data-br-deco', '');
        var media = card.querySelector('.mshein-card__img');
        var body = card.querySelector('.mshein-card__body');
        // Même remise que la carte du site (arrondie vers le bas, snippets/mshein-card.liquid)
        var info = cardInfo(card);
        var off = info.compare > info.price ? Math.floor((info.compare - info.price) * 100 / info.compare) : 0;
        if (media && off > 0) media.insertAdjacentHTML('beforeend', '<span class="br-off">-' + off + '%</span>');
        var tags = media && media.querySelector('.mshein-tags');
        if (tags && body) body.insertBefore(tags, body.firstChild);
      });
    };
    decorateCards(grid);

    // ---------- Top 5 : les plus fortes remises parmi les produits de la marque de la page ----------
    var top5 = root.querySelector('[data-br-top5]');
    if (top5) {
      var ranked = [].slice.call(grid.querySelectorAll('.mshein-card')).map(function (card) { var info = cardInfo(card); return { card: card, info: info, off: info.off }; })
        .filter(function (x) { return x.off > 0; }).sort(function (a, b) { return b.off - a.off; }).slice(0, 5);
      if (ranked.length >= 3) {
        top5.querySelector('[data-br-top5-list]').innerHTML = ranked.map(function (x, i) {
          var card = x.card;
          var link = card.querySelector('.mshein-card__title a, a.mshein-card__link');
          var img = card.querySelector('.mshein-card__link img');
          var now = card.querySelector('.mshein-card__now');
          var chips = card.querySelector('.mshein-chips');
          var bar = card.querySelector('.mshein-brandbar');
          return '<a class="br-t5" href="' + esc(link ? link.getAttribute('href') : '#') + '"><span class="br-t5__n">0' + (i + 1) + '</span>'
            + '<span class="br-t5__img">' + (img ? '<img src="' + esc(img.currentSrc || img.src) + '" alt="" loading="lazy">' : '') + '</span>'
            + '<b class="br-t5__t">' + esc(card.getAttribute('data-mshein-title') || (link ? link.textContent.trim() : '')) + '</b>'
            + '<span class="br-t5__p"><b>' + esc(now ? now.textContent.replace(/\s+/g, ' ').trim() : '') + '</b><em>-' + Math.floor((x.info.compare - x.info.price) * 100 / x.info.compare) + '%</em></span>'
            + (chips ? chips.outerHTML : '') + (bar ? bar.outerHTML : '') + '</a>';
        }).join('');
        top5.hidden = false;
      }
    }

    // ---------- Barre compacte ----------
    var heroPills = root.querySelector('.br-pills');
    var sticky = root.querySelector('[data-br-sticky]');
    var syncBar = function () { if (sticky && heroPills) sticky.classList.toggle('on', heroPills.getBoundingClientRect().bottom < 0); };
    window.addEventListener('scroll', function () { if (root.isConnected) syncBar(); }, { passive: true });
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
      if (copy && navigator.clipboard) navigator.clipboard.writeText(copy.getAttribute('data-br-copy')).then(function () { toast(t('email_copied', 'Email copiata')); });
      if (target.closest('[data-br-share]')) {
        if (navigator.share) navigator.share({ title: brand, url: location.href }).catch(function () {});
        else if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(function () { toast(t('link_copied', 'Link copiato')); });
      }
      if (target.closest('[data-br-goto-search]')) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(function () { root.querySelector('[data-br-q]').focus(); }, 450);
      }
    });
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && root.isConnected) { close(); closeSugg(); } });

    // ---------- Filtres Shopify (tri, disponibilité, prix) : nouvelle adresse ----------
    // Comme le prototype : sans recharger la page. Cartes grises pendant le chargement, puis la grille, le nombre de
    // produits et l'état des pastilles de la nouvelle adresse (même page, filtres Shopify) ; adresse mise à jour.
    var go = function (change) {
      var url = new URL(location.href);
      url.searchParams.set('view', 'brand');
      url.searchParams.delete('page');
      change(url.searchParams);
      url.hash = '';
      load(url.toString(), true);
    };
    // Seulement la section de la page (section_id, ~4 fois plus léger que la page entière) ; gardée pendant la visite,
    // demandée dès le survol d'une catégorie
    var sectionCache = {};
    var fetchSection = function (href) {
      var url = new URL(href, location.origin);
      url.hash = '';
      url.searchParams.set('view', 'brand');
      url.searchParams.set('section_id', 'desktop-brand');
      var key = url.toString();
      if (!sectionCache[key]) {
        sectionCache[key] = fetch(key, { credentials: 'same-origin' }).then(function (response) { if (!response.ok) throw new Error(response.status); return response.text(); });
        sectionCache[key].then(function () { sectionReady[key] = true; }, function () { delete sectionCache[key]; });
      }
      return sectionCache[key];
    };
    // Page déjà reçue : affichée tout de suite, sans le court squelette
    var sectionReady = {};
    var isReady = function (href) {
      var url = new URL(href, location.origin);
      url.hash = '';
      url.searchParams.set('view', 'brand');
      url.searchParams.set('section_id', 'desktop-brand');
      return Boolean(sectionReady[url.toString()]);
    };
    var slowNet = function () {
      var net = navigator.connection;
      return Boolean(net && (net.saveData || /(^|-)2g$/.test(net.effectiveType || '')));
    };
    var loading = 0;
    var skeleton = function () {
      var one = '<li class="br-sk" aria-hidden="true"><div class="br-sk__img"></div><div class="br-sk__l"></div><div class="br-sk__l"></div></li>';
      grid.innerHTML = new Array(13).join(one);
      if (more) more.parentElement.hidden = true;
      if (noneBox) noneBox.hidden = true;
      var shopifyNone = root.querySelector('.br-prod .br-none:not([data-br-none])');
      if (shopifyNone) shopifyNone.remove();
    };
    var load = function (href, push) {
      shownHref = href;
      close();
      if (menu) menu.classList.remove('open');
      if (pchip) pchip.classList.remove('open');
      var id = loading += 1;
      if (push) history.pushState({ br: true }, '', href);
      skeleton();
      var section = document.getElementById('prodotti');
      if (section && section.getBoundingClientRect().top < 0) section.scrollIntoView({ behavior: 'smooth' });
      Promise.all([fetchSection(href), isReady(href) ? null : new Promise(function (resolve) { setTimeout(resolve, 200); })])
        .then(function (out) {
          if (id !== loading || !root.isConnected) return;
          var doc = new DOMParser().parseFromString(out[0], 'text/html');
          var other = doc.querySelector('[data-br]');
          // Adresse d'une autre marque (bouton Retour du navigateur) : toute la page change
          if (other && other.getAttribute('data-br-name') !== root.getAttribute('data-br-name')) switchBrand(other);
          else swap(doc, href);
        })
        .catch(function (error) { console.error('Brand page: filter failed.', error); location.href = href; });
    };
    var swap = function (doc, href) {
      params = new URLSearchParams(new URL(href, location.origin).search);
      askedSort = params.get('sort_by') || '';
      markPills();
      // « En promo », prix et tri locaux : propres à chaque catégorie, comme au chargement de la page
      KEY = 'brLocal:' + location.pathname + '|' + (params.get('q') || '');
      local = { sale: false, min: 0, max: null, sort: null };
      try { var saved = JSON.parse(sessionStorage.getItem(KEY)); if (saved) local = saved; } catch (error) { /* stockage bloqué */ }
      pending.sort = null;
      pending.avail = null;
      var incoming = doc.querySelector('[data-br-grid]');
      grid.innerHTML = '';
      if (incoming) [].slice.call(incoming.children).forEach(function (child) { grid.appendChild(document.importNode(child, true)); });
      var count = doc.querySelector('.br-prod .br-sec span');
      if (count) totalText = count.textContent;
      var shopifyNone = doc.querySelector('.br-prod .br-none:not([data-br-none])');
      if (shopifyNone && noneBox) noneBox.parentNode.insertBefore(document.importNode(shopifyNone, true), noneBox);
      // Pastille « En stock » (barre et panneau)
      root.querySelectorAll('[data-br-toggle]').forEach(function (button) {
        var twin = doc.querySelector('[data-br-toggle="' + button.getAttribute('data-br-toggle') + '"]');
        button.classList.toggle('on', Boolean(twin && twin.classList.contains('on')));
      });
      if (availButton) {
        var availTwin = doc.querySelector('[data-br-fd-avail]');
        var availOn = Boolean(availTwin && availTwin.classList.contains('on'));
        availButton.classList.toggle('on', availOn);
        availButton.toggleAttribute('data-was-on', availOn);
      }
      // Prix : libellé de la pastille et curseurs
      var chipTwin = doc.querySelector('[data-br-pchip]');
      if (pchip && chipTwin && pp && !pp.local) {
        pchip.classList.toggle('on', chipTwin.classList.contains('on'));
        pchip.querySelector('span').textContent = chipTwin.querySelector('span').textContent;
      }
      // Curseurs : limites et filtre de prix de la nouvelle page (une catégorie a son propre prix le plus haut)
      [[pp, '[data-br-pp]'], [fd, '[data-br-filters]']].forEach(function (pair) {
        var r = pair[0];
        var scope = doc.querySelector(pair[1]);
        var twinBox = scope && scope.querySelector('[data-br-range]');
        if (!r || !twinBox) return;
        ['data-max', 'data-min-param', 'data-max-param'].forEach(function (name) {
          if (twinBox.hasAttribute(name)) r.box.setAttribute(name, twinBox.getAttribute(name)); else r.box.removeAttribute(name);
        });
        r.box.toggleAttribute('data-local', twinBox.hasAttribute('data-local'));
        r.max = Number(twinBox.getAttribute('data-max')) || 1;
        r.local = twinBox.hasAttribute('data-local');
        ['rMin', 'rMax', 'pMin', 'pMax'].forEach(function (key) {
          var twin = scope.querySelector('[data-br-' + key.toLowerCase() + ']');
          if (!twin) return;
          if (twin.hasAttribute('max')) r[key].setAttribute('max', twin.getAttribute('max'));
          if (twin.hasAttribute('placeholder')) r[key].setAttribute('placeholder', twin.getAttribute('placeholder'));
          r[key].value = twin.value;
        });
        if (r.local) r.set(local.min, local.max);
        r.paint();
        r.start = r.values();
      });
      if (pchip && pp && pp.local) pchip.toggleAttribute('data-br-price-chip', true);
      priceChip = root.querySelector('[data-br-price-chip]');
      next = nextUrl();
      if (more) more.parentElement.hidden = !next;
      applyLocal();
      syncHearts(grid);
      decorateCards(grid);
      if (window.msheinCards && typeof window.msheinCards.decorate === 'function') window.msheinCards.decorate(grid);
    };
    // Retour vers l'adresse déjà affichée (fermeture d'une fiche ouverte sur place, assets/mobile-pdp-layer.js) : rien
    // à recharger, la page est restée telle quelle (avant : produits rechargés et page remontée aux produits)
    var shownHref = location.href;
    var sameUrl = function (a, b) { return String(a).split('#')[0] === String(b).split('#')[0]; };
    window.addEventListener('popstate', function () {
      if (!root.isConnected || sameUrl(new URL(shownHref, location.href).href, location.href)) return;
      load(location.href, false);
    });

    // ---------- Catégories sans recharger la page (comme les rayons des pages collection) : pastilles, grandes cartes,
    // catégories du panneau de la marque ----------
    var pageKey = function (href) {
      var url = new URL(href, location.origin);
      return url.pathname + '|' + (url.searchParams.get('q') || '').toLowerCase();
    };
    var markPills = function () {
      var currentKey = pageKey(location.href);
      root.querySelectorAll('.br-pill').forEach(function (pill) { pill.classList.toggle('on', pageKey(pill.href) === currentKey); });
    };
    var CAT_LINKS = '.br-pill[href], .br-fcard[href]:not([data-br-feat-sale]), [data-br-panel-cats] a[href]';
    var PREFETCH = CAT_LINKS + ', .br-bcard[href], .br-acc__go[href]';
    root.addEventListener('click', function (event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      var link = event.target.closest(CAT_LINKS);
      if (!link) return;
      var url = new URL(link.getAttribute('href'), location.href);
      if (url.pathname === location.pathname && !url.search && url.hash) return;
      event.preventDefault();
      url.searchParams.set('view', 'brand');
      url.hash = '';
      load(url.toString(), true);
      // Barre compacte, grandes cartes, panneau : on descend aux produits (les pastilles du bandeau restent en place)
      if (!link.closest('.br-pills:not(.br-pills--sticky)')) document.getElementById('prodotti').scrollIntoView({ behavior: 'smooth' });
    });
    // ---------- Autre marque (« Autres marques », « Toutes les marques ») sans recharger, tout de suite : la page de la
    // marque est préparée à l'avance (marque ouverte du panneau quand il est à l'écran, survol, premier contact du doigt),
    // analysée une seule fois et gardée ; au clic elle remplace la page actuelle sans attente ----------
    var switchBrand = function (other, current) {
      loading += 1;
      var fresh = document.importNode(other, true);
      fresh.setAttribute('data-br-enter', '');
      (current || root).replaceWith(fresh);
      window.scrollTo(0, 0);
      var name = fresh.getAttribute('data-br-name') || '';
      var parts = document.title.split(' – ');
      if (name) document.title = name + (parts.length > 1 ? ' – ' + parts[parts.length - 1] : '');
      init(fresh);
      setTimeout(function () { fresh.removeAttribute('data-br-enter'); }, 450);
    };
    // Adresse de la marque d'une tuile : sa collection si elle existe et a des produits (data-br-handle, comme
    // snippets/brand-url.liquid), sinon la recherche de la marque (lien de la tuile). Les deux sont demandées en même
    // temps (avant : la recherche attendait l'échec de la collection, 2,8 s) ; la réponse est retenue pour la session.
    var resolved = window.__brResolved || (window.__brResolved = {});
    var RES_KEY = 'brResolve1';
    var remember = function (handle, kind) {
      try { var map = JSON.parse(sessionStorage.getItem(RES_KEY) || '{}'); map[handle] = kind; sessionStorage.setItem(RES_KEY, JSON.stringify(map)); } catch (error) { /* stockage bloqué */ }
    };
    var known = function (handle) {
      try { return (JSON.parse(sessionStorage.getItem(RES_KEY) || '{}'))[handle] || ''; } catch (error) { return ''; }
    };
    var resolveBrand = function (tile) {
      var search = new URL(tile.getAttribute('href'), location.href);
      search.searchParams.set('view', 'brand');
      search.hash = '';
      var handle = tile.getAttribute('data-br-handle');
      var key = handle || search.toString();
      if (resolved[key]) return resolved[key];
      var parse = function (href) {
        return function (text) {
          var other = new DOMParser().parseFromString(text, 'text/html').querySelector('[data-br]');
          if (!other) throw new Error('no brand page');
          return { href: href, other: other, full: Boolean(other.querySelector('[data-br-grid] .mshein-card')) };
        };
      };
      var bySearch = function () { return fetchSection(search.toString()).then(parse(search.toString())); };
      var kind = handle ? known(handle) : 's';
      var promise;
      if (kind === 's') promise = bySearch();
      else {
        var collection = new URL((root.getAttribute('data-br-root') || '/').replace(/\/?$/, '/') + 'collections/' + handle, location.origin);
        collection.searchParams.set('view', 'brand');
        var searchEarly = kind === 'c' ? null : bySearch();
        if (searchEarly) searchEarly.catch(function () {});
        promise = fetchSection(collection.toString())
          .then(parse(collection.toString()))
          .then(function (page) { if (!page.full) throw new Error('empty collection'); remember(handle, 'c'); return page; })
          .catch(function () { remember(handle, 's'); return searchEarly || bySearch(); });
      }
      resolved[key] = promise;
      promise.catch(function () { delete resolved[key]; });
      return promise;
    };
    // Page d'attente de la marque choisie (comme les rayons des collections) : nom de la marque, pastilles et cartes grises,
    // affichée tout de suite en haut si la page de la marque n'est pas encore arrivée
    var ghostPage = function (tile) {
      var nameEl = (tile.closest('.br-acc__p') || tile).querySelector('h3, span:last-child b, b');
      var name = nameEl ? nameEl.textContent.trim() : '';
      var ghost = document.createElement('div');
      ghost.className = 'br br-ghost';
      ghost.setAttribute('aria-busy', 'true');
      var color = tile.style.getPropertyValue('--c');
      if (color) ghost.style.setProperty('--brand', color);
      var pills = new Array(7).join('<span></span>');
      var cards = new Array(9).join('<li class="br-sk" aria-hidden="true"><div class="br-sk__img"></div><div class="br-sk__l"></div><div class="br-sk__l"></div></li>');
      ghost.innerHTML = '<div class="br-ghost__hero"><div class="br-ghost__name">' + esc(name) + '</div><div class="br-ghost__meta"></div><div class="br-ghost__pills">' + pills + '</div></div>'
        + '<div class="br-wrap"><ul class="br-ghost__grid">' + cards + '</ul></div>';
      return ghost;
    };
    var goBrand = function (tile) {
      var id = loading += 1;
      var ghost = null;
      // Réaction immédiate : la page s'efface ; si la marque n'est pas prête en 120 ms, la page d'attente prend sa place
      root.classList.add('is-switching');
      var ghostTimer = setTimeout(function () {
        if (id !== loading || !root.isConnected) return;
        ghost = ghostPage(tile);
        root.replaceWith(ghost);
        window.scrollTo(0, 0);
      }, 120);
      resolveBrand(tile)
        .then(function (page) {
          if (id !== loading) return;
          clearTimeout(ghostTimer);
          history.pushState({ br: true }, '', page.href);
          switchBrand(page.other, ghost && ghost.isConnected ? ghost : root);
        })
        .catch(function (error) { console.error('Brand page: brand switch failed.', error); location.href = tile.href; });
    };
    var BRAND_TILES = '.br-bcard[href], .br-acc__go[href]';
    root.addEventListener('click', function (event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      var tile = event.target.closest(BRAND_TILES);
      if (!tile) return;
      event.preventDefault();
      goBrand(tile);
    });

    var prefetchLink = function (link) {
      if (link.matches(BRAND_TILES)) resolveBrand(link).catch(function () {});
      else fetchSection(new URL(link.getAttribute('href'), location.href).toString()).catch(function () {});
    };
    var hoverTimer = null;
    root.addEventListener('mouseover', function (event) {
      var link = event.target.closest && event.target.closest(PREFETCH);
      if (!link) return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(function () { prefetchLink(link); }, 60);
    });
    root.addEventListener('mouseout', function (event) { if (event.target.closest && event.target.closest(PREFETCH)) clearTimeout(hoverTimer); });
    // Téléphone (pas de survol) : dès que le doigt touche la tuile, ~150 ms avant le clic
    root.addEventListener('pointerdown', function (event) {
      var link = event.target.closest && event.target.closest(PREFETCH);
      if (link) prefetchLink(link);
    }, { passive: true });
    // Panneau des marques : la marque ouverte est préparée pendant qu'on la regarde (panneau à l'écran seulement)
    var accSeen = false;
    var prefetchOpen = function () {
      if (!accSeen || slowNet() || !root.isConnected) return;
      var go = root.querySelector('.br-acc__p.on .br-acc__go[href]');
      if (go) (window.requestIdleCallback || setTimeout)(function () { resolveBrand(go).catch(function () {}); });
    };
    var accBox = root.querySelector('[data-br-marquee]');
    if (accBox && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { accSeen = entries[entries.length - 1].isIntersecting; prefetchOpen(); }, { rootMargin: '300px 0px' }).observe(accBox);
      root.addEventListener('animationstart', function (event) { if (event.animationName === 'braccbar') prefetchOpen(); });
    }

    // ---------- Cartes : cœur (wishlist du site) et panier (fenêtre « Aggiungi al carrello », comme les autres pages) ----------
    var syncHearts = function (scope) {
      if (!window.mobileWishlist || typeof window.mobileWishlist.has !== 'function') return;
      scope.querySelectorAll('.mshein-card__fav[data-product-id]').forEach(function (button) {
        button.setAttribute('aria-pressed', String(Boolean(window.mobileWishlist.has(button.getAttribute('data-product-id')))));
      });
    };
    var openCardAt = function (index) {
      var list = [].slice.call(grid.querySelectorAll('.mshein-card:not([hidden])'));
      var api = window.mobileQuickAdd;
      if (!list.length || !api || typeof api.openCard !== 'function') return false;
      index = (index + list.length) % list.length;
      var trigger = list[index].querySelector('[data-quick-add]') || list[index].querySelector('.mshein-card__add');
      if (!trigger) return false;
      return api.openCard(trigger, { desktop: !isMobile(), count: (index + 1) + ' / ' + list.length, onStep: function (step) { openCardAt(index + step); } });
    };
    grid.addEventListener('click', function (event) {
      var card = event.target.closest('.mshein-card');
      if (!card) return;
      var heart = event.target.closest('.mshein-card__fav');
      if (heart) {
        event.preventDefault();
        event.stopPropagation();
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
        syncHearts(grid);
        if (typeof saved === 'boolean') toast(root.getAttribute(saved ? 'data-added' : 'data-removed'));
        return;
      }
      if (!event.target.closest('.mshein-card__add')) return;
      var shown = [].slice.call(grid.querySelectorAll('.mshein-card:not([hidden])'));
      if (!openCardAt(shown.indexOf(card))) return; // secours : fiche produit (lien de la carte)
      event.preventDefault();
      event.stopPropagation();
    });
    syncHearts(grid);
    // Script chargé en async : la wishlist du site (window.mobileWishlist) peut arriver après lui
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { syncHearts(grid); });
    window.addEventListener('load', function () { syncHearts(grid); });
    window.addEventListener('pageshow', function () { syncHearts(grid); });
    var menu = root.querySelector('[data-br-menu]');
    if (menu) {
      menu.addEventListener('click', function (event) {
        var option = event.target.closest('[data-br-sort]');
        if (option) { menu.classList.remove('open'); setSort(option.getAttribute('data-br-sort')); return; }
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

    // ---------- Filtres des produits affichés : « In offerta » et prix (quand la boutique n'a pas de filtre de prix
    // Shopify) — Shopify n'a pas de filtre « en promotion » ; gardés pendant la visite (même marque / catégorie) ----------
    var params = new URLSearchParams(location.search);
    var KEY = 'brLocal:' + location.pathname + '|' + (params.get('q') || '');
    var local = { sale: false, min: 0, max: null, sort: null };
    try { var saved = JSON.parse(sessionStorage.getItem(KEY)); if (saved) local = saved; } catch (error) { /* stockage bloqué */ }
    // Tri « Remise la plus forte » (local.sort = 'off') : Shopify n'a pas ce tri, les cartes affichées sont rangées par
    // remise ; ordre d'origine gardé dans data-br-i pour revenir au tri de la page
    var askedSort = params.get('sort_by') || '';
    var numberCards = function () {
      var n = 0;
      grid.querySelectorAll('.mshein-card').forEach(function (card) {
        if (card.hasAttribute('data-br-i')) n = Math.max(n, Number(card.getAttribute('data-br-i')) + 1);
      });
      grid.querySelectorAll('.mshein-card:not([data-br-i])').forEach(function (card) { card.setAttribute('data-br-i', n); n += 1; });
    };
    var sortCards = function () {
      numberCards();
      var all = [].slice.call(grid.querySelectorAll('.mshein-card'));
      all.sort(function (a, b) {
        if (local.sort === 'off') {
          var diff = cardInfo(b).off - cardInfo(a).off;
          if (diff) return diff;
        }
        return Number(a.getAttribute('data-br-i')) - Number(b.getAttribute('data-br-i'));
      });
      var marker = grid.querySelector('[data-br-next]');
      all.forEach(function (card) { grid.insertBefore(card, marker); });
    };
    var sortChip = root.querySelector('[data-br-menu]');
    var sortDefault = t('sort_by', 'Ordina per');
    var syncSort = function () {
      var value = local.sort === 'off' ? 'off' : askedSort;
      root.querySelectorAll('[data-br-sort]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-br-sort') === value); });
      root.querySelectorAll('[data-br-fd-sort]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-br-fd-sort') === value); });
      if (sortChip) {
        var picked = root.querySelector('[data-br-sort].on');
        sortChip.classList.toggle('on', value !== '');
        sortChip.querySelector('span').textContent = value === '' || !picked ? sortDefault : picked.textContent;
      }
    };
    // '' : tri par défaut de la page ; 'off' : remise la plus forte (local) ; autre : tri Shopify (page rechargée)
    var setSort = function (value) {
      if (value === 'off') { local.sort = 'off'; applyLocal(); close(); return; }
      local.sort = null;
      try { sessionStorage.setItem(KEY, JSON.stringify(local)); } catch (error) { /* stockage bloqué */ }
      if (value === askedSort) { applyLocal(); close(); return; }
      go(function (p) { if (value) p.set('sort_by', value); else p.delete('sort_by'); });
    };
    var countBox = root.querySelector('.br-prod .br-sec span');
    var totalText = countBox ? countBox.textContent : '';
    var noneBox = root.querySelector('[data-br-none]');
    var priceChip = root.querySelector('[data-br-price-chip]');
    var applyLocal = function () {
      sortCards();
      syncSort();
      var shown = 0;
      grid.querySelectorAll('.mshein-card').forEach(function (card) {
        var info = cardInfo(card);
        var price = info.price / 100;
        var ok = (!local.sale || info.off > 0) && price >= (local.min || 0) && (local.max === null || price <= local.max);
        card.hidden = !ok;
        if (ok) shown += 1;
      });
      var active = local.sale || local.min > 0 || local.max !== null;
      if (countBox) countBox.textContent = active ? countText(shown) : totalText;
      if (noneBox) noneBox.hidden = !(active && shown === 0);
      root.querySelectorAll('[data-br-sale]').forEach(function (b) { b.classList.toggle('on', local.sale); });
      if (priceChip) {
        var on = local.min > 0 || local.max !== null;
        priceChip.classList.toggle('on', on);
        priceChip.querySelector('span').textContent = on ? currency + local.min + ' – ' + (local.max === null ? (pp || fd ? (pp || fd).max : 600) + '+' : currency + local.max) : t('price', 'Prezzo');
      }
      try { sessionStorage.setItem(KEY, JSON.stringify(local)); } catch (error) { /* stockage bloqué */ }
    };
    root.querySelectorAll('[data-br-sale]').forEach(function (button) {
      button.addEventListener('click', function () { local.sale = !local.sale; applyLocal(); });
    });
    root.addEventListener('click', function (event) {
      var offer = event.target.closest('[data-br-feat-sale]');
      if (offer) {
        event.preventDefault();
        local.sale = true;
        applyLocal();
        document.getElementById('prodotti').scrollIntoView({ behavior: 'smooth' });
      }
      var reset = event.target.closest('[data-br-reset]');
      if (reset) {
        local = { sale: false, min: 0, max: null, sort: null };
        applyLocal();
        var shopifyActive = [].slice.call(params.keys()).some(function (k) { return k === 'sort_by' || k.indexOf('filter.') === 0; });
        // Filtres Shopify enlevés, catégorie gardée
        if (shopifyActive) go(function (p) { [].slice.call(p.keys()).forEach(function (k) { if (k === 'sort_by' || k.indexOf('filter.') === 0) p.delete(k); }); });
        else close();
      }
    });

    // Panneau « Filtri » : choix gardés jusqu'à « Fatto »
    var pending = { sort: null, avail: null, sale: null };
    var salePill = root.querySelector('[data-br-fd-sale]');
    if (salePill) {
      salePill.addEventListener('click', function () { salePill.classList.toggle('on'); pending.sale = salePill.classList.contains('on'); });
    }
    root.addEventListener('click', function (event) {
      if (!event.target.closest('[data-br-open-filters]')) return;
      if (salePill) { salePill.classList.toggle('on', local.sale); pending.sale = null; }
      pending.sort = null;
      syncSort();
    }, true);
    root.querySelectorAll('[data-br-fd-sort]').forEach(function (button) {
      button.addEventListener('click', function () {
        root.querySelectorAll('[data-br-fd-sort]').forEach(function (b) { b.classList.toggle('on', b === button); });
        pending.sort = button.getAttribute('data-br-fd-sort');
      });
    });
    var availButton = root.querySelector('[data-br-fd-avail]');
    if (availButton && availButton.classList.contains('on')) availButton.setAttribute('data-was-on', '');
    if (availButton) availButton.addEventListener('click', function () { availButton.classList.toggle('on'); pending.avail = availButton.classList.contains('on'); });
    // Curseurs de prix : panneau « Filtri » et petite fenêtre sous la pastille « Prix » (même fonctionnement).
    // Poignée tout à droite = pas de prix maximum (« 2000+ »).
    var makeRange = function (scope) {
      var box = scope && scope.querySelector('[data-br-range]');
      if (!box) return null;
      var r = {
        box: box,
        rMin: scope.querySelector('[data-br-rmin]'),
        rMax: scope.querySelector('[data-br-rmax]'),
        pMin: scope.querySelector('[data-br-pmin]'),
        pMax: scope.querySelector('[data-br-pmax]'),
        max: Number(box.getAttribute('data-max')) || 1,
        local: box.hasAttribute('data-local')
      };
      r.paint = function () {
        var low = Math.min(Number(r.rMin.value), Number(r.rMax.value));
        var high = Math.max(Number(r.rMin.value), Number(r.rMax.value));
        var fill = box.querySelector('.br-range__fill');
        fill.style.left = (low / r.max * 100) + '%';
        fill.style.right = (100 - high / r.max * 100) + '%';
      };
      r.set = function (min, max) {
        r.rMin.value = min || 0;
        r.rMax.value = max === null ? r.max : max;
        r.pMin.value = min || 0;
        r.pMax.value = max === null || max >= r.max ? '' : max;
        r.paint();
      };
      r.values = function () {
        var low = Math.min(Number(r.rMin.value), Number(r.rMax.value));
        var high = Math.max(Number(r.rMin.value), Number(r.rMax.value));
        return { min: low, max: high >= r.max ? null : high };
      };
      r.rMin.addEventListener('input', function () { if (+r.rMin.value > +r.rMax.value) r.rMin.value = r.rMax.value; r.pMin.value = r.rMin.value; r.paint(); });
      r.rMax.addEventListener('input', function () { if (+r.rMax.value < +r.rMin.value) r.rMax.value = r.rMin.value; r.pMax.value = +r.rMax.value >= r.max ? '' : r.rMax.value; r.paint(); });
      r.pMin.addEventListener('change', function () { r.rMin.value = Math.max(0, Math.min(+r.pMin.value || 0, r.max)); r.paint(); });
      r.pMax.addEventListener('change', function () { r.rMax.value = r.pMax.value === '' ? r.max : Math.max(0, Math.min(+r.pMax.value, r.max)); r.paint(); });
      r.paint();
      r.start = r.values();
      if (r.local) r.set(local.min, local.max);
      return r;
    };
    var samePrice = function (a, b) { return a.min === b.min && a.max === b.max; };
    var setPriceParams = function (p, r, v) {
      var minParam = r.box.getAttribute('data-min-param');
      var maxParam = r.box.getAttribute('data-max-param');
      if (v.min > 0) p.set(minParam, v.min); else p.delete(minParam);
      if (v.max !== null) p.set(maxParam, v.max); else p.delete(maxParam);
    };
    var fd = makeRange(root.querySelector('[data-br-filters]'));
    root.addEventListener('click', function (event) {
      if (event.target.closest('[data-br-open-filters]') && fd && fd.local) fd.set(local.min, local.max);
    }, true);
    var apply = root.querySelector('[data-br-apply]');
    if (apply) {
      apply.addEventListener('click', function () {
        if (pending.sale !== null) local.sale = pending.sale;
        // Tri : « Remise la plus forte » sur la page ; tri déjà affiché : rien à recharger
        if (pending.sort === 'off') { local.sort = 'off'; pending.sort = null; }
        else if (pending.sort !== null) { local.sort = null; if (pending.sort === askedSort) pending.sort = null; }
        var price = fd ? fd.values() : null;
        if (fd && fd.local) { local.min = price.min; local.max = price.max; }
        applyLocal();
        var availChanged = availButton && pending.avail !== null && pending.avail !== availButton.hasAttribute('data-was-on');
        // Page rechargée seulement si un filtre Shopify change (tri Shopify, disponibilité, prix)
        var priceChanged = fd && !fd.local && !samePrice(price, fd.start);
        if (pending.sort === null && !availChanged && !priceChanged) { close(); return; }
        go(function (p) {
          if (pending.sort) p.set('sort_by', pending.sort);
          else if (pending.sort === '') p.delete('sort_by');
          if (availButton && pending.avail !== null) {
            var parts = availButton.getAttribute('data-br-fd-avail').split('=');
            if (pending.avail) p.set(parts[0], parts[1]); else p.delete(parts[0]);
          }
          if (priceChanged) setPriceParams(p, fd, price);
        });
      });
    }

    // Pastille « Prix » : petite fenêtre avec le curseur, « Réinitialiser » et « Terminé »
    var pchip = root.querySelector('[data-br-pchip]');
    var pp = makeRange(root.querySelector('[data-br-pp]'));
    if (pchip && pp) {
      var closePp = function () { pchip.classList.remove('open'); };
      var applyPp = function () {
        var price = pp.values();
        if (pp.local) { local.min = price.min; local.max = price.max; applyLocal(); closePp(); return; }
        if (samePrice(price, pp.start)) { closePp(); return; }
        go(function (p) { setPriceParams(p, pp, price); });
      };
      pchip.addEventListener('click', function (event) {
        if (event.target.closest('[data-br-pp-done]')) { applyPp(); return; }
        if (event.target.closest('[data-br-pp-reset]')) { pp.set(0, null); applyPp(); return; }
        if (event.target.closest('[data-br-pp]')) return;
        var open = !pchip.classList.contains('open');
        if (open && pp.local) pp.set(local.min, local.max);
        if (menu) menu.classList.remove('open');
        pchip.classList.toggle('open', open);
      });
      document.addEventListener('click', function (event) { if (!event.target.closest('[data-br-pchip]')) closePp(); });
      document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closePp(); });
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
        url.searchParams.set('section_id', 'desktop-brand');
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
            applyLocal();
            decorateCards(grid);
            if (window.msheinCards && typeof window.msheinCards.decorate === 'function') window.msheinCards.decorate(grid);
          })
          .catch(function (error) { console.error('Brand page: next page failed.', error); toast(t('retry', 'Riprova tra un attimo')); })
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
        sugg.innerHTML = '<p class="br-sugg__h">' + esc(t('popular_in', 'Popolari in __BRAND__').replace('__BRAND__', brand)) + '</p>' + cards().slice(0, 10).map(function (c) {
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

    // ---------- « Altri brand » : nombre de produits de chaque marque (assets/mobile-brands.json, comme l'accueil) ----------
    // Deux rangées qui défilent en sens inverse (pause au survol) : les 6 marques avec logo du serveur puis les marques
    // les plus présentes du catalogue (photo d'un de leurs produits), sans la marque affichée
    var handleize = function (text) { return String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); };
    // Panneaux qui s'ouvrent (prototype v3) : 24 marques les plus présentes du catalogue, 8 par page ; la marque ouverte
    // s'élargit (photo, logo, nombre de produits, « Voir la marque »), la suivante s'ouvre quand sa barre est pleine, puis la
    // page suivante ; survol = ouverture et pause. Logos : ceux des tuiles du serveur (snippets/brand-theme.liquid).
    var brandUrl = function (b) { return searchUrl + '?q=' + encodeURIComponent('title:"' + b[1] + '"') + '&type=product&view=brand'; };
    var brandImg = function (data, b, width) { return b[3] ? (data.cdn || '') + b[3] + (String(b[3]).indexOf('?') > -1 ? '&' : '?') + 'width=' + width : ''; };
    var countHtml = function (n) { return esc(countText(n)).replace(String(n), '<b>' + n + '</b>'); };
    var buildMarquee = function (data) {
      var box = root.querySelector('[data-br-marquee]');
      if (!box || box.hasAttribute('data-ready')) return;
      var logos = {};
      box.querySelectorAll('.br-bcard').forEach(function (tile) {
        var name = tile.querySelector('span:last-child b');
        var logo = tile.querySelector('.br-blogo');
        if (name && logo) logos[name.textContent.trim().toLowerCase()] = logo.innerHTML;
      });
      var current = [brand.toLowerCase(), brandTerm.toLowerCase()];
      var brands = data.brands.filter(function (b) { return current.indexOf(String(b[0]).toLowerCase()) < 0 && current.indexOf(String(b[1]).toLowerCase()) < 0 && Number(b[2]) > 0; }).slice(0, 24);
      if (brands.length < 4) return;
      // Mobile : toutes les marques dans une rangée qui défile (pas de pages)
    var PER = isMobile() ? brands.length : 8;
      var pages = Math.ceil(brands.length / PER);
      var page = 0;
      var panel = function (b, i) {
        var logo = logos[String(b[0]).toLowerCase()] || '<b>' + esc(String(b[0]).toUpperCase()) + '</b>';
        return '<div class="br-acc__p' + (i ? '' : ' on') + '" data-acc="' + i + '"><img src="' + esc(brandImg(data, b, 900)) + '" alt="" loading="lazy"><span class="br-acc__v">' + esc(b[0]) + '</span>'
          + '<div class="br-acc__c"><span class="br-acc__logo">' + logo + '</span><h3>' + esc(b[0]) + '</h3><p>' + esc(t('original', '✓')) + ' · ' + countHtml(Number(b[2])) + '</p>'
          + '<a class="br-acc__go" href="' + esc(brandUrl(b)) + '" data-br-handle="' + esc(handleize(b[0])) + '">' + esc(t('see_brand', 'Vedi il brand')) + ' <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></div>'
          + '<span class="br-acc__bar"><i></i></span></div>';
      };
      box.innerHTML = '<div class="br-acc" data-br-acc></div>';
      box.setAttribute('data-ready', '');
      var acc = box.querySelector('[data-br-acc]');
      var nav = root.querySelector('[data-br-accnav]');
      var dots = root.querySelector('[data-br-acc-dots]');
      var draw = function () {
        acc.innerHTML = brands.slice(page * PER, page * PER + PER).map(panel).join('');
        if (nav) { nav.hidden = false; nav.querySelector('[data-br-acc-n]').textContent = (page + 1) + ' / ' + pages; }
        if (dots) {
          var html = '';
          for (var k = 0; k < pages; k += 1) html += '<button type="button" class="' + (k === page ? 'on' : '') + '" data-br-acc-page="' + k + '" aria-label="' + esc(t('page_n', '__N__').replace('__N__', k + 1)) + '"></button>';
          dots.innerHTML = pages > 1 ? html : '';
        }
      };
      var goPage = function (p) {
        page = (p + pages) % pages;
        acc.classList.add('swap');
        setTimeout(function () {
          draw();
          acc.classList.remove('swap'); acc.classList.add('swap-in');
          requestAnimationFrame(function () { requestAnimationFrame(function () { acc.classList.remove('swap-in'); }); });
        }, 350);
      };
      var openPanel = function (i) { acc.querySelectorAll('.br-acc__p').forEach(function (p) { p.classList.toggle('on', +p.getAttribute('data-acc') === i); }); };
      acc.addEventListener('animationend', function (event) {
        if (event.animationName !== 'braccbar') return;
        var next = +acc.querySelector('.br-acc__p.on').getAttribute('data-acc') + 1;
        if (next >= acc.querySelectorAll('.br-acc__p').length) goPage(page + 1); else openPanel(next);
      });
      acc.addEventListener('click', function (event) {
        var p = event.target.closest('.br-acc__p');
        if (p && !p.classList.contains('on')) { event.preventDefault(); openPanel(+p.getAttribute('data-acc')); }
      });
      var hover = null;
      acc.addEventListener('mouseover', function (event) {
        var p = event.target.closest('.br-acc__p');
        if (p && !p.classList.contains('on')) { clearTimeout(hover); hover = setTimeout(function () { openPanel(+p.getAttribute('data-acc')); }, 160); }
      });
      acc.addEventListener('mouseleave', function () { clearTimeout(hover); });
      root.addEventListener('click', function (event) {
        if (event.target.closest('[data-br-acc-next]')) goPage(page + 1);
        if (event.target.closest('[data-br-acc-prev]')) goPage(page - 1);
        var d = event.target.closest('[data-br-acc-page]');
        if (d) goPage(+d.getAttribute('data-br-acc-page'));
      });
      draw();
      buildAllBrands(data);
    };
    // Fenêtre « Toutes les marques » : toutes les marques du catalogue (photo, nom, nombre de produits), recherche ; un clic
    // ouvre la marque sans recharger (goBrand)
    var buildAllBrands = function (data) {
      var modal = root.querySelector('[data-br-bm]');
      var openBtn = root.querySelector('[data-br-all-brands]');
      if (!modal || !openBtn) return;
      var current = [brand.toLowerCase(), brandTerm.toLowerCase()];
      var all = data.brands.filter(function (b) { return current.indexOf(String(b[0]).toLowerCase()) < 0 && Number(b[2]) > 0; });
      var n = root.querySelector('[data-br-all-n]');
      if (n) n.textContent = all.length;
      var gridBox = modal.querySelector('[data-br-bm-grid]');
      var filled = false;
      var fill = function () {
        if (filled) return;
        filled = true;
        gridBox.innerHTML = all.map(function (b) {
          var img = brandImg(data, b, 160);
          return '<a class="br-bcard br-bm__t" href="' + esc(brandUrl(b)) + '" data-br-handle="' + esc(handleize(b[0])) + '" data-name="' + esc(String(b[0]).toLowerCase()) + '">'
            + '<span class="br-blogo br-blogo--photo">' + (img ? '<img src="' + esc(img) + '" alt="" loading="lazy" width="58" height="58">' : '<b>' + esc(String(b[0]).slice(0, 2).toUpperCase()) + '</b>') + '</span>'
            + '<span><b>' + esc(b[0]) + '</b><small>' + esc(countText(Number(b[2]))) + '</small></span></a>';
        }).join('');
        modal.querySelector('[data-br-bm-n]').textContent = t('brands_count', '__N__').replace('__N__', all.length);
      };
      var q = modal.querySelector('[data-br-bm-q]');
      var closeBm = function () { modal.hidden = true; document.documentElement.classList.remove('br-modal-open'); };
      openBtn.addEventListener('click', function () {
        fill();
        modal.hidden = false;
        document.documentElement.classList.add('br-modal-open');
        setTimeout(function () { q.focus(); }, 60);
      });
      q.addEventListener('input', function () {
        var term = q.value.trim().toLowerCase();
        var shown = 0;
        gridBox.querySelectorAll('.br-bm__t').forEach(function (tile) { var ok = !term || tile.getAttribute('data-name').indexOf(term) > -1; tile.hidden = !ok; if (ok) shown += 1; });
        modal.querySelector('[data-br-bm-none]').hidden = shown > 0;
      });
      modal.addEventListener('click', function (event) {
        if (event.target === modal || event.target.closest('[data-br-bm-close]') || event.target.closest('.br-bm__t')) closeBm();
      });
      document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && !modal.hidden && root.isConnected) closeBm(); });
    };
    var brandsUrl = root.getAttribute('data-br-brands');
    if (brandsUrl && root.querySelector('[data-br-count]')) {
      fetch(brandsUrl, { credentials: 'same-origin' })
        .then(function (response) { return response.ok ? response.json() : null; })
        .then(function (data) {
          if (!data || !data.brands) return;
          root.querySelectorAll('[data-br-count]').forEach(function (box) {
            var name = box.getAttribute('data-br-count');
            var found = data.brands.filter(function (b) { return String(b[0]).toLowerCase() === name; })[0];
            if (found && found[2]) box.textContent = countText(found[2]);
          });
          buildMarquee(data);
        })
        .catch(function () {});
    }

    applyLocal();
  };

  // Page marque ouverte sur place depuis une autre page (assets/brand-instant.js) : il appelle init sur la section reçue
  window.__brandInit = init;
  var first = document.querySelector('[data-br]');
  if (!first) return;
  init(first);
})();
