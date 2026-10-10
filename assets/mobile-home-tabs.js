/* Onglets de rayon de l'accueil mobile (prototype validé « étape 2 ») — MOBILE uniquement, page d'accueil.
   - Les liens du header vers une collection (Tutti i Prodotti, Donna, Uomo…, menu réel) deviennent des onglets : un toucher
     ouvre la page du rayon SANS recharger la page (/collections/<rayon>?view=mshein-dept, snippets/mshein-dept.liquid),
     placée à la place de la bannière, des tuiles, des cartes 2×2 et du fil (la bande avantages et le coupon restent).
   - Comme SHEIN : glisser le doigt à gauche / à droite passe au rayon voisin (la page suit le doigt puis glisse) ;
     la page arrive tout de suite (forme grise en attendant), les rayons voisins sont préparés à l'avance ; en-tête et
     bannière tout de suite, puis les autres blocs l'un après l'autre, vite (avantages, catégories, coupon, cartes, produits).
   - Chaque onglet affiche la vraie adresse de son rayon (/collections/abbigliamento-donna-tutti…) : lien partagé ou page
     rechargée = la vraie page collection, au même design ; Retour / Avanti du navigateur reviennent à l'onglet précédent,
     à la même position. Retour à l'accueil : logo ou « Home » de la barre du bas.
   - Bloc de recherche du rayon : puces des sous-catégories, Filtri (vrais filtres Shopify), tri, 2 colonnes / 1 colonna,
     filtres rapides ; produits en 2 colonnes décalées (window.msheinMasonry, assets/mobile-home-shein.js).
   Les autres liens du header (Contatti, Traccia ordine…) restent des liens normaux.
   Pages collection (templates/collection.json, [data-mshein-coll]) : même principe, la page de base est la collection
   elle-même (au design des rayons) ; ses blocs sont remplacés par ceux de l'onglet touché, Retour la remet. */
(function () {
  'use strict';

  /* ---------- Bloc de recherche et produits (rayons, pages collection, recherche) ---------- */
  // query : tri / filtres déjà dans l'adresse (page collection ouverte avec ?sort_by=…, ?filter…, recherche ?q=…).
  // view : modèle sans layout qui renvoie le bloc (mshein-dept pour les collections, mshein-search pour la recherche).
  var createProducts = function (slot, basePath, query, view) {
    view = view || 'mshein-dept';
    var results = slot.querySelector('[data-dept-results]');
    var params = new URLSearchParams(query || '');
    params.delete('page');
    params.delete('view');
    var oneColumn = false;
    var masonry = null;
    var token = 0;
    var sheetHome = null;

    var updateCount = function () {
      var count = results && results.querySelector('[data-dept-count]');
      if (!count || !masonry) return;
      count.innerHTML = String(count.getAttribute('data-template'))
        .replace('{count}', masonry.cardCount())
        .replace('{total}', count.getAttribute('data-total'));
    };
    var bind = function () {
      if (masonry) masonry.destroy();
      var grid = results.querySelector('[data-mshein-grid]');
      var sentinel = results.querySelector('[data-mshein-sentinel]');
      masonry = window.msheinMasonry.create({
        grid: grid,
        sentinel: sentinel,
        loader: results.querySelector('[data-mshein-loader]'),
        onCards: updateCount
      });
      masonry.setSource(sentinel && sentinel.getAttribute('data-next'), true);
      if (oneColumn) masonry.setOneColumn(true);
      results.querySelectorAll('[data-dept-view]').forEach(function (button) {
        button.classList.toggle('is-on', button.getAttribute('data-dept-view') === (oneColumn ? '1' : '2'));
      });
      updateCount();
    };
    var scrollToBlock = function () {
      var block = slot.querySelector('[data-dept-block]');
      var rootStyle = getComputedStyle(document.documentElement);
      var top = block.getBoundingClientRect().top + window.scrollY - (parseFloat(rootStyle.getPropertyValue('--mshein-tabs-top')) || parseFloat(rootStyle.getPropertyValue('--mshein-header-h')) || 0);
      if (window.scrollY > top) window.scrollTo({ top: top });
    };
    // Tri, filtres ou puce : seulement la partie résultats est redemandée (mêmes vrais filtres que la page collection).
    var reload = function () {
      var myToken = ++token;
      results.classList.add('is-loading');
      var query = params.toString();
      fetch(basePath + '?view=' + view + (query ? '&' + query : ''), { credentials: 'same-origin' })
        .then(function (response) {
          if (!response.ok) throw new Error('Department results request failed: ' + response.status);
          return response.text();
        })
        .then(function (html) {
          if (myToken !== token) return;
          var fresh = new DOMParser().parseFromString(html, 'text/html').querySelector('[data-dept-results]');
          if (!fresh) throw new Error('Department results markup missing');
          var imported = document.importNode(fresh, true);
          results.replaceWith(imported);
          results = imported;
          bind();
          scrollToBlock();
        })
        .catch(function (error) {
          console.error('Unable to update the department products.', error);
          if (myToken === token) results.classList.remove('is-loading');
        });
    };

    // Fenêtre Filtri de CE bloc (la page collection et un onglet ouvert ont chacun la leur).
    var movedPanel = null;
    var sheet = function () { return movedPanel || results.querySelector('[data-dept-sheet]'); };
    var openSheet = function (section) {
      var panel = results.querySelector('[data-dept-sheet]');
      if (!panel) return;
      // Fenêtre posée sur la page (au-dessus de l'en-tête et de la barre du bas).
      sheetHome = panel.parentNode;
      movedPanel = panel;
      panel.classList.add('is-mshein-moved');
      document.body.appendChild(panel);
      panel.hidden = false;
      window.requestAnimationFrame(function () { panel.classList.add('is-open'); });
      document.documentElement.style.overflow = 'hidden';
      var body = panel.querySelector('[data-dept-sheet-body]');
      var target = section && body.querySelector('[data-dept-section="' + section + '"]');
      body.scrollTop = target ? target.offsetTop - 8 : 0;
    };
    var closeSheet = function () {
      var panel = sheet();
      if (!panel) return;
      panel.classList.remove('is-open');
      document.documentElement.style.overflow = '';
      movedPanel = null;
      window.setTimeout(function () {
        panel.hidden = true;
        panel.classList.remove('is-mshein-moved');
        if (sheetHome && sheetHome.isConnected) sheetHome.insertBefore(panel, sheetHome.querySelector('[data-mshein-grid], .mshein-feed__grid'));
        else panel.remove();
      }, 250);
    };

    // Tout sauf les filtres : le tri, et pour la recherche ses mots (q) et son type (type=product).
    var withoutFilters = function () {
      var kept = new URLSearchParams();
      params.forEach(function (value, name) {
        if (name.indexOf('filter.') !== 0) kept.append(name, value);
      });
      return kept;
    };

    var onClick = function (event) {
      var chip = event.target.closest('[data-dept-chip]');
      if (chip) {
        slot.querySelectorAll('[data-dept-chip]').forEach(function (button) { button.classList.toggle('is-on', button === chip); });
        chip.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
        basePath = new URL(chip.getAttribute('data-dept-chip'), window.location.href).pathname;
        // Autre collection : ses propres filtres (le tri est gardé).
        params = withoutFilters();
        reload();
        return;
      }
      var view = event.target.closest('[data-dept-view]');
      if (view) {
        oneColumn = view.getAttribute('data-dept-view') === '1';
        results.querySelectorAll('[data-dept-view]').forEach(function (button) { button.classList.toggle('is-on', button === view); });
        masonry.setOneColumn(oneColumn);
        return;
      }
      var quick = event.target.closest('[data-dept-quick]');
      if (quick) {
        var name = quick.getAttribute('data-dept-quick');
        var value = quick.getAttribute('data-dept-quick-value');
        var values = params.getAll(name);
        params.delete(name);
        if (values.indexOf(value) < 0) params.append(name, value);
        else values.filter(function (item) { return item !== value; }).forEach(function (item) { params.append(name, item); });
        reload();
        return;
      }
      var open = event.target.closest('[data-dept-open]');
      if (open) openSheet(open.getAttribute('data-dept-open'));
    };
    var onChange = function (event) {
      if (!event.target.matches('[data-dept-sort]')) return;
      params.set('sort_by', event.target.value);
      reload();
    };
    // La fenêtre Filtri est déplacée sur la page : ses actions sont écoutées sur le document.
    var onSheet = function (event) {
      var panel = sheet();
      if (!panel || !panel.contains(event.target)) return;
      if (event.target === panel || event.target.closest('[data-dept-close]')) { closeSheet(); return; }
      if (event.target.closest('[data-dept-reset]')) {
        panel.querySelectorAll('input[type="checkbox"]').forEach(function (input) { input.checked = false; });
        panel.querySelectorAll('input[type="number"]').forEach(function (input) { input.value = ''; });
      }
    };
    var onSubmit = function (event) {
      var panel = sheet();
      if (!event.target.matches('[data-dept-form]') || !panel || !panel.contains(event.target)) return;
      event.preventDefault();
      params = withoutFilters();
      new FormData(event.target).forEach(function (value, name) {
        if (String(value).trim() !== '') params.append(name, value);
      });
      closeSheet();
      reload();
    };
    slot.addEventListener('click', onClick);
    slot.addEventListener('change', onChange);
    document.addEventListener('click', onSheet);
    document.addEventListener('submit', onSubmit);
    bind();
    return {
      hasMore: function () { return masonry && masonry.hasMore(); },
      loadMore: function () { if (masonry) masonry.loadMore(); },
      destroy: function () {
        token += 1;
        if (masonry) masonry.destroy();
        slot.removeEventListener('click', onClick);
        slot.removeEventListener('change', onChange);
        document.removeEventListener('click', onSheet);
        document.removeEventListener('submit', onSubmit);
        if (movedPanel) {
          movedPanel.remove();
          movedPanel = null;
          document.documentElement.style.overflow = '';
        }
      }
    };
  };

  window.msheinResults = { create: createProducts };

  // Recherche mobile (sections/mobile-home-shein.liquid, partie « search ») : mêmes Filtri / tri / colonnes que les rayons,
  // pages suivantes au défilement ; la recherche garde ses mots (?q=…) à chaque tri ou filtre.
  var searchBlock = window.matchMedia('(max-width: 760px)').matches && window.msheinMasonry && document.querySelector('[data-mshein-search]');
  if (searchBlock) {
    createProducts(searchBlock, searchBlock.getAttribute('data-path') || '/search', window.location.search.slice(1), 'mshein-search');
    window.msheinMasonry.watchReveal(searchBlock);
  }

  if (window.msheinTabs) return;
  var mobile = window.matchMedia('(max-width: 760px)');
  if (!mobile.matches || !document.body.classList.contains('mshein-home') || !window.msheinMasonry) return;
  var nav = document.querySelector('.mobile-temu-header .mobile-temu-categories');
  if (!nav) return;
  var navList = nav.querySelector('ul') || nav;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Page de base : l'accueil (ses sections), ou la page collection (les blocs de son rayon).
  var coll = document.querySelector('[data-mshein-coll]');
  var sectionOf = function (element) { return element ? element.closest('.shopify-section') : null; };
  var collPart = function (name) { return coll.querySelector('[data-dept-part="' + name + '"]'); };
  var home = coll ? {
    hero: collPart('hero'),
    tiles: collPart('cats'),
    mods: collPart('mods'),
    feed: collPart('products')
  } : {
    hero: sectionOf(document.querySelector('[data-mshein-hero]')),
    tiles: sectionOf(document.querySelector('.category-tiles--scroll')),
    mods: sectionOf(document.querySelector('.mshein-mods[data-mshein-home]')),
    feed: sectionOf(document.querySelector('[data-mshein-feed]'))
  };
  if (!home.hero || !home.feed) return;

  var slug = function (text) {
    return String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  // Onglets : liens du header vers une collection de la boutique (sans paramètres).
  var tabs = Array.prototype.slice.call(nav.querySelectorAll('a[href]')).map(function (link) {
    var url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin || url.search || !/\/collections\/[^/]+\/?$/.test(url.pathname)) return null;
    return { link: link, path: url.pathname, slug: slug(link.textContent.trim()) };
  }).filter(Boolean);
  if (!tabs.length) return;
  var trimPath = function (path) { return String(path).replace(/\/+$/, ''); };
  // baseIndex : onglet qui EST la page de base (page collection d'un rayon), sinon -1 (accueil, sous-catégorie).
  // baseMark : onglet marqué sur la page de base (rayon de la collection, is-active de sections/header.liquid).
  var baseIndex = -1;
  var baseMark = -1;
  tabs.forEach(function (tab, index) {
    tab.link.setAttribute('role', 'tab');
    tab.link.setAttribute('aria-selected', 'false');
    tab.link.setAttribute('data-mshein-tab', String(index));
    if (coll && trimPath(tab.path) === trimPath(window.location.pathname)) baseIndex = index;
    if (coll && baseMark < 0 && tab.link.classList.contains('is-active')) baseMark = index;
    tab.link.classList.remove('is-active');
  });
  if (baseIndex >= 0) baseMark = baseIndex;
  // Adresse de la page chargée (l'adresse affichée change ensuite avec l'onglet ouvert).
  var basePathname = window.location.pathname;
  var baseUrl = basePathname + window.location.search;
  var minIndex = baseIndex >= 0 ? 0 : -1;
  var isBase = function (index) { return index === baseIndex; };
  // Bannières des rayons préparées dans la page (snippets/mshein-tab-heroes.liquid), par adresse de collection.
  var heroTemplates = {};
  document.querySelectorAll('template[data-mshein-hero-for]').forEach(function (template) {
    heroTemplates[trimPath(new URL(template.getAttribute('data-mshein-hero-for'), window.location.href).pathname)] = template;
  });

  // Emplacements des pages de rayon, à côté des sections de l'accueil qu'elles remplacent.
  var makeSlot = function (after, name) {
    var slot = document.createElement('div');
    slot.className = 'mshein-dept-slot';
    slot.hidden = true;
    slot.setAttribute('data-dept-slot', name);
    after.after(slot);
    return slot;
  };
  var slots = {
    hero: makeSlot(home.hero, 'hero'),
    cats: makeSlot(home.tiles || home.hero, 'cats'),
    mods: makeSlot(home.mods || home.feed, 'mods'),
    products: makeSlot(home.feed, 'products')
  };

  // Adresse (#donna…) et position gardée : fonctions d'origine du navigateur. Une app installée les remplace par une
  // version qui prévient d'autres scripts à chaque appel (~33 ms au lieu de ~1 ms, 2 à 3 fois par toucher d'onglet).
  var historyCall = function (method) {
    var original = History.prototype[method];
    var usable = typeof original === 'function' && /\[native code\]/.test(Function.prototype.toString.call(original));
    return function () { return (usable ? original : history[method]).apply(history, arguments); };
  };
  var pushState = historyCall('pushState');
  var replaceState = historyCall('replaceState');
  var page = document.getElementById('content') || home.feed.parentNode;
  var current = baseIndex;
  var startDone = false;
  var requestToken = 0;
  var cache = {};
  var ready = {};
  var products = null;

  var syncHeader = function () { if (window.msheinSyncHeader) window.msheinSyncHeader(); };
  var fetchDept = function (tab) {
    if (!cache[tab.path]) {
      cache[tab.path] = fetch(tab.path + '?view=mshein-dept', { credentials: 'same-origin' })
        .then(function (response) {
          if (!response.ok) throw new Error('Department request failed: ' + response.status);
          return response.text();
        })
        .then(function (html) {
          ready[tab.path] = true;
          return html;
        })
        .catch(function (error) {
          delete cache[tab.path];
          throw error;
        });
    }
    return cache[tab.path];
  };
  // Rayons voisins préparés quand le téléphone est libre : glisser vers eux les affiche aussitôt.
  var whenIdle = function (run, timeout) {
    if (window.requestIdleCallback) window.requestIdleCallback(run, { timeout: timeout });
    else window.setTimeout(run, 600);
  };
  // Puis tous les autres rayons, un par un, quand le téléphone est libre : chaque onglet s'ouvre ensuite tout de suite.
  // Pas en mode économie de données ni en connexion lente (seulement les voisins et le rayon touché).
  var connection = navigator.connection || {};
  var prefetchAllowed = !connection.saveData && !/(^|-)2g$/.test(connection.effectiveType || '');
  var prefetchAllStarted = false;
  // Photos des bannières préparées : chargées à l'avance (même taille que l'affichage), visibles dès le toucher.
  var warmHeroImages = function () {
    Object.keys(heroTemplates).forEach(function (path) {
      heroTemplates[path].content.querySelectorAll('img').forEach(function (source) {
        var image = new Image();
        if (source.getAttribute('sizes')) image.sizes = source.getAttribute('sizes');
        if (source.getAttribute('srcset')) image.srcset = source.getAttribute('srcset');
        image.src = source.getAttribute('src');
      });
    });
  };
  var prefetchAll = function () {
    if (prefetchAllStarted || !prefetchAllowed) return;
    prefetchAllStarted = true;
    var next = 0;
    var step = function () {
      while (next < tabs.length && cache[tabs[next].path]) next += 1;
      if (next >= tabs.length) return;
      var tab = tabs[next];
      next += 1;
      fetchDept(tab).catch(function () {}).then(function () { whenIdle(step, 4000); });
    };
    whenIdle(step, 4000);
  };
  var prefetchAround = function (index) {
    whenIdle(function () {
      var nearby = [index + 1, index - 1].filter(function (near) { return near >= 0 && near < tabs.length; })
        .map(function (near) { return fetchDept(tabs[near]).catch(function () {}); });
      Promise.all(nearby).then(prefetchAll);
    }, 2500);
  };
  // Blocs visibles de la page, du haut jusqu'aux produits (avantages et coupon compris) : ordre de la cascade.
  var pageBlocks = function (last) {
    var blocks = [];
    // Sans mesurer la page (une mesure ici = toute la page recalculée) : les blocs cachés en mobile ne s'animent pas.
    for (var node = slots.hero.parentNode.firstElementChild; node; node = node.nextElementSibling) {
      if (!node.hidden) blocks.push(node);
      if (node === last) break;
    }
    return blocks;
  };
  // En-tête et bannière (1er bloc) affichés tout de suite, puis les autres blocs l'un après l'autre, rapidement,
  // venant du côté de l'onglet choisi (dir 1 : droite). Animations du navigateur (element.animate) : aucune mesure de
  // la page (avant : une par bloc, ~0,2 s à chaque onglet).
  var running = [];
  var enter = function (elements, dir) {
    running.forEach(function (animation) { animation.cancel(); });
    running = [];
    if (reduceMotion || !Element.prototype.animate) return;
    var shown = 0;
    elements.forEach(function (element) {
      if (!element || element.hidden) return;
      if (shown) {
        running.push(element.animate([
          { opacity: 0, transform: 'translate3d(' + (dir || 0) * 32 + 'px, 10px, 0)' },
          { opacity: 1, transform: 'none' }
        ], { duration: 300, delay: 40 + (shown - 1) * 50, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' }));
      }
      shown += 1;
    });
  };
  // Onglet ouvert au milieu de la barre.
  var centerTab = function (index, smooth) {
    if (index < 0) {
      navList.scrollTo({ left: 0, behavior: smooth ? 'smooth' : 'auto' });
      return;
    }
    var link = tabs[index].link;
    var item = link.closest('li') || link;
    navList.scrollTo({ left: item.offsetLeft - (navList.clientWidth - item.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'auto' });
  };
  var markTabs = function (index, smooth) {
    if (isBase(index)) index = baseMark;
    tabs.forEach(function (tab, tabIndex) {
      var on = tabIndex === index;
      tab.link.classList.toggle('is-tab-on', on);
      tab.link.classList.remove('is-pending');
      tab.link.setAttribute('aria-selected', String(on));
    });
    centerTab(index, smooth);
  };
  var setHomeVisible = function (visible, keepTiles) {
    home.hero.hidden = !visible;
    // Page collection : sa bannière règle l'en-tête (transparent dessus) seulement quand elle est affichée.
    if (coll) home.hero.toggleAttribute('data-mshein-hero-active', visible);
    // Tuiles de l'accueil gardées pour « Tutti i Prodotti » (pas les sous-catégories d'une page collection).
    if (home.tiles) home.tiles.hidden = !visible && !(keepTiles && !coll);
    if (home.mods) home.mods.hidden = !visible;
    home.feed.hidden = !visible;
  };
  // keepHero : bannière déjà affichée pour ce rayon (préparée), gardée telle quelle (pas de saut d'image).
  var clearSlots = function (keepHero) {
    if (products) products.destroy();
    products = null;
    Object.keys(slots).forEach(function (name) {
      if (keepHero && name === 'hero') return;
      slots[name].replaceChildren();
      slots[name].hidden = true;
      slots[name].removeAttribute('data-mshein-hero-active');
      slots[name].removeAttribute('data-hero-for');
    });
  };
  // Retour sur un onglet déjà vu : même position (pages de produits ajoutées si besoin).
  var restoreScroll = function (y, more) {
    window.scrollTo({ top: y || 0 });
    syncHeader();
    if (!y || !more) return;
    var tries = 0;
    var step = function () {
      if (document.documentElement.scrollHeight >= y + window.innerHeight || tries++ > 6 || !more.hasMore()) {
        window.scrollTo({ top: y });
        syncHeader();
        return;
      }
      more.loadMore();
      window.setTimeout(step, 350);
    };
    step();
  };


  // Page collection : son propre bloc de recherche et ses produits (gardés pendant qu'un autre onglet est ouvert).
  var baseProducts = coll ? createProducts(home.feed, window.location.pathname, window.location.search) : null;
  if (coll) window.msheinMasonry.watchReveal(coll);

  /* ---------- Changement d'onglet (sans rechargement) ---------- */
  var renderDept = function (tab, html) {
    var dept = new DOMParser().parseFromString(html, 'text/html').querySelector('[data-mshein-dept]');
    if (!dept) throw new Error('Department markup missing');
    var part = function (name) {
      var element = dept.querySelector('[data-dept-part="' + name + '"]');
      return element ? element.innerHTML : '';
    };
    var keepHero = slots.hero.getAttribute('data-hero-for') === tab.path && Boolean(slots.hero.firstElementChild);
    clearSlots(keepHero);
    var isAll = dept.hasAttribute('data-all');
    // « Tutti i Prodotti » : les tuiles de l'accueil restent (ses icônes), comme le prototype.
    setHomeVisible(false, isAll);
    // Partie vide (ex. pas de sous-catégories) : emplacement caché (vérifié sur le texte reçu, sans relire la page).
    Object.keys(slots).forEach(function (name) {
      if (keepHero && name === 'hero') return;
      var html = part(name);
      slots[name].innerHTML = html;
      slots[name].hidden = !html.trim();
    });
    slots.hero.setAttribute('data-mshein-hero-active', '');
    window.msheinMasonry.watchReveal(slots.cats);
    window.msheinMasonry.watchReveal(slots.mods);
    products = createProducts(slots.products, tab.path);
  };
  // Rayon pas encore reçu : sa vraie bannière tout de suite (préparée dans la page, snippets/mshein-tab-heroes.liquid),
  // forme grise seulement pour les blocs dessous.
  var showLoading = function (tab) {
    clearSlots();
    setHomeVisible(false, false);
    var shape = function (kind, count) {
      return '<div class="mshein-dskel mshein-dskel--' + kind + '" aria-hidden="true">' + new Array(count + 1).join('<i></i>') + '</div>';
    };
    var heroTemplate = heroTemplates[trimPath(tab.path)];
    if (heroTemplate) {
      slots.hero.replaceChildren(heroTemplate.content.cloneNode(true));
      slots.hero.setAttribute('data-hero-for', tab.path);
    } else {
      slots.hero.innerHTML = shape('hero', 1);
    }
    slots.cats.innerHTML = shape('cats', 5);
    slots.products.innerHTML = shape('grid', 4);
    slots.hero.hidden = false;
    slots.cats.hidden = false;
    slots.products.hidden = false;
    slots.hero.setAttribute('data-mshein-hero-active', '');
  };

  // index : baseIndex = page de base (accueil -1, ou la page collection), sinon l'onglet.
  // fromHistory : lien direct, ou Retour / Avanti du navigateur.
  var showTab = function (index, fromHistory, y) {
    if (!fromHistory) replaceState(Object.assign({}, history.state, { mshTab: current, mshY: window.scrollY }), '', window.location.href);
    // Sens de l'arrivée : l'onglet de droite arrive par la droite (rien au premier affichage).
    var dir = startDone ? (index > current ? 1 : -1) : 0;
    current = index;
    var token = ++requestToken;
    markTabs(index, !fromHistory);
    if (!fromHistory) {
      // Vraie adresse du rayon (/collections/…) : lien partagé ou page rechargée = la vraie page collection, au même design.
      pushState({ mshTab: index, mshY: 0 }, '', isBase(index) ? baseUrl : tabs[index].path);
    }
    if (isBase(index)) {
      clearSlots();
      setHomeVisible(true);
      restoreScroll(y, baseProducts);
      if (dir) enter(pageBlocks(home.feed), dir);
      prefetchAround(index);
      return;
    }
    var tab = tabs[index];
    // Page pas encore reçue : sa forme s'affiche aussitôt, le contenu la remplace à l'arrivée.
    var waiting = !ready[tab.path];
    if (waiting) {
      showLoading(tab);
      window.scrollTo({ top: 0 });
      syncHeader();
      enter(pageBlocks(slots.products), dir);
    }
    fetchDept(tab).then(function (html) {
      if (token !== requestToken) return;
      renderDept(tab, html);
      restoreScroll(y, products);
      // Après la forme grise, seul le nouveau contenu des emplacements s'anime (le reste est déjà là).
      enter(waiting ? [slots.hero, slots.cats, slots.mods, slots.products] : pageBlocks(slots.products), waiting ? 0 : dir);
      prefetchAround(index);
    }).catch(function (error) {
      console.error('Unable to open the department tab.', error);
      if (token !== requestToken) return;
      // En cas d'erreur réseau : la vraie page de la collection.
      window.location.href = tab.link.href;
    });
  };

  // Onglet touché : son rayon, ou retour en haut si c'est déjà l'onglet ouvert.
  var openTab = function (index) {
    if (index === current) window.scrollTo({ top: 0, behavior: 'smooth' });
    else showTab(index);
  };
  // Clic sur un onglet, le logo ou « Home » : changement sans rechargement (souris, clavier ; au doigt : touchend plus bas).
  var handleClick = function (event) {
    if (!mobile.matches || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = event.target.closest && event.target.closest('a[data-mshein-tab]');
    if (link && nav.contains(link)) {
      event.preventDefault();
      openTab(Number(link.getAttribute('data-mshein-tab')));
      return;
    }
    // Accueil : logo ou « Home » de la barre du bas.
    var homeLink = event.target.closest && event.target.closest('.mobile-home-header__logo, .mobile-bottom-navigation a, .mobile-bottom-nav a');
    if (homeLink) {
      var target = new URL(homeLink.href, window.location.href);
      var trim = function (path) { return String(path).replace(/\/+$/, ''); };
      // Adresse de l'accueil (avec la langue : « / », « /de »…).
      if (target.origin === window.location.origin && trim(target.pathname) === trim(basePathname) && !target.hash) {
        event.preventDefault();
        if (!isBase(current)) showTab(baseIndex);
        else window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };
  window.addEventListener('click', handleClick, true);
  // Préchargement au premier contact du doigt : la page du rayon est souvent prête au relâchement.
  nav.addEventListener('pointerdown', function (event) {
    var link = event.target.closest('a[data-mshein-tab]');
    if (link) fetchDept(tabs[Number(link.getAttribute('data-mshein-tab'))]).catch(function () {});
  }, { passive: true });

  // Téléphone : l'onglet s'ouvre dès que le doigt se lève (comme une app), sans attendre le « clic » qui suit ; ce clic
  // est annulé, donc les scripts de statistiques ne l'analysent plus (0,2 à 1,2 s de blocage à chaque toucher).
  // Le doigt qui fait défiler la barre d'onglets (il bouge) ne change pas d'onglet.
  var tap = null;
  nav.addEventListener('touchstart', function (event) {
    var link = event.touches.length === 1 && event.target.closest('a[data-mshein-tab]');
    tap = link ? { link: link, x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true });
  nav.addEventListener('touchmove', function (event) {
    if (tap && (Math.abs(event.touches[0].clientX - tap.x) > 10 || Math.abs(event.touches[0].clientY - tap.y) > 10)) tap = null;
  }, { passive: true });
  nav.addEventListener('touchend', function (event) {
    var touched = tap;
    tap = null;
    if (!touched || !mobile.matches || !event.cancelable) return;
    event.preventDefault();
    // Toucher traité : il ne remonte pas jusqu'aux scripts de statistiques (qui l'analysent aussi, ~0,1 s).
    event.stopImmediatePropagation();
    openTab(Number(touched.link.getAttribute('data-mshein-tab')));
  }, { passive: false });
  nav.addEventListener('touchcancel', function () { tap = null; }, { passive: true });

  /* ---------- Glisser le doigt : rayon voisin (accueil ← Tutti i Prodotti → Donna → …) ---------- */
  // Pas de changement d'onglet depuis une bande qui défile déjà de côté (bannière, puces, vignettes…) ni un champ.
  var scrollsSideways = function (element) {
    for (var node = element; node && node !== page; node = node.parentElement) {
      if (node.matches('.swiper, input, select, textarea, [data-dept-sheet]')) return true;
      if (node.scrollWidth > node.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(node).overflowX)) return true;
    }
    return false;
  };
  var drag = null;
  var setDrag = function (shift) {
    page.style.transform = shift ? 'translate3d(' + shift + 'px, 0, 0)' : '';
    page.style.opacity = shift ? String(1 - Math.min(Math.abs(shift) / window.innerWidth, 1) * 0.5) : '';
  };
  var release = function (shift, to, done) {
    if (reduceMotion || !page.animate) { setDrag(0); done(); return; }
    var from = { transform: 'translate3d(' + shift + 'px, 0, 0)', opacity: page.style.opacity || 1 };
    setDrag(0);
    var animation = page.animate([from, { transform: 'translate3d(' + to + 'px, 0, 0)', opacity: to ? 0.35 : 1 }], { duration: to ? 170 : 220, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)' });
    animation.onfinish = done;
  };
  page.addEventListener('touchstart', function (event) {
    drag = null;
    if (!mobile.matches || event.touches.length !== 1 || document.documentElement.style.overflow === 'hidden' || scrollsSideways(event.target)) return;
    var touch = event.touches[0];
    drag = { x: touch.clientX, y: touch.clientY, time: Date.now(), axis: '', shift: 0 };
  }, { passive: true });
  page.addEventListener('touchmove', function (event) {
    if (!drag || event.touches.length !== 1) return;
    var touch = event.touches[0];
    var dx = touch.clientX - drag.x;
    var dy = touch.clientY - drag.y;
    if (!drag.axis) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      drag.axis = Math.abs(dx) > Math.abs(dy) * 1.3 ? 'x' : 'y';
    }
    if (drag.axis !== 'x') return;
    event.preventDefault();
    drag.target = current + (dx < 0 ? 1 : -1);
    drag.edge = drag.target < minIndex || drag.target >= tabs.length;
    if (!drag.edge && drag.target >= 0) fetchDept(tabs[drag.target]).catch(function () {});
    // Au bout de la liste : la page résiste.
    drag.shift = drag.edge ? dx * 0.2 : dx;
    setDrag(drag.shift);
  }, { passive: false });
  var endDrag = function () {
    var gesture = drag;
    drag = null;
    if (!gesture || gesture.axis !== 'x') return;
    var distance = Math.abs(gesture.shift);
    var fast = distance > 40 && distance / Math.max(Date.now() - gesture.time, 1) > 0.45;
    if (gesture.edge || !(distance > window.innerWidth * 0.22 || fast)) {
      release(gesture.shift, 0, function () {});
      return;
    }
    var out = gesture.shift < 0 ? -window.innerWidth * 0.45 : window.innerWidth * 0.45;
    release(gesture.shift, out, function () {
      showTab(gesture.target);
    });
  };
  page.addEventListener('touchend', endDrag, { passive: true });
  page.addEventListener('touchcancel', endDrag, { passive: true });

  // Retour / Avanti du navigateur : l'onglet de cette étape, sans rechargement (anciens liens #donna… : nom du rayon).
  var tabFromHash = function () {
    var hash = window.location.hash.replace(/^#/, '');
    for (var index = 0; index < tabs.length; index += 1) {
      if (tabs[index].slug === hash) return index;
    }
    return baseIndex;
  };
  window.addEventListener('popstate', function (event) {
    var state = event.state;
    var index = state && typeof state.mshTab === 'number' ? state.mshTab : tabFromHash();
    var y = state && state.mshY ? state.mshY : 0;
    if (index !== current) showTab(index, true, y);
    else restoreScroll(y, isBase(current) ? baseProducts : products);
  });
  // Départ vers une autre page : position gardée pour le retour.
  window.addEventListener('pagehide', function () {
    replaceState(Object.assign({}, history.state, { mshTab: current, mshY: window.scrollY }), '', window.location.href);
  });

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  // Retour sur la page depuis une fiche produit, ou ancien lien direct (#donna…) : l'onglet de l'adresse s'ouvre
  // directement ; un ancien lien #… prend la vraie adresse du rayon (/collections/…).
  var startState = history.state;
  var startIndex = startState && typeof startState.mshTab === 'number' ? startState.mshTab : tabFromHash();
  if (startIndex >= tabs.length || startIndex < minIndex) startIndex = baseIndex;
  if (!isBase(startIndex)) showTab(startIndex, true, startState && startState.mshY);
  else if (startState && startState.mshY) restoreScroll(startState.mshY, baseProducts);
  var startUrl = !startState && !isBase(current) && window.location.hash ? tabs[current].path : window.location.href;
  replaceState(Object.assign({}, history.state, { mshTab: current, mshY: startState && startState.mshY || 0 }), '', startUrl);
  markTabs(current, false);
  if (isBase(current)) prefetchAround(current);
  if (prefetchAllowed) whenIdle(warmHeroImages, 1500);
  startDone = true;

  window.msheinTabs = { show: showTab };
})();
