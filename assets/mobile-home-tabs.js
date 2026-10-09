/* Onglets de rayon de l'accueil mobile (prototype validé « étape 2 ») — MOBILE uniquement, page d'accueil.
   - Les liens du header vers une collection (Tutti i Prodotti, Donna, Uomo…, menu réel) deviennent des onglets : un toucher
     ouvre la page du rayon SANS recharger la page (/collections/<rayon>?view=mshein-dept, snippets/mshein-dept.liquid),
     placée à la place de la bannière, des tuiles, des cartes 2×2 et du fil (la bande avantages et le coupon restent).
   - Chaque onglet a son adresse (#donna, #uomo, #tutti-i-prodotti…) : lien direct, et Retour / Avanti du navigateur
     reviennent à l'onglet précédent, à la même position. Retour à l'accueil : logo ou « Home » de la barre du bas.
   - Bloc de recherche du rayon : puces des sous-catégories, Filtri (vrais filtres Shopify), tri, 2 colonnes / 1 colonna,
     filtres rapides ; produits en 2 colonnes décalées (window.msheinMasonry, assets/mobile-home-shein.js).
   Les autres liens du header (Contatti, Traccia ordine…) restent des liens normaux. */
(function () {
  'use strict';

  if (window.msheinTabs) return;
  var mobile = window.matchMedia('(max-width: 760px)');
  if (!mobile.matches || !document.body.classList.contains('mshein-home') || !window.msheinMasonry) return;
  var nav = document.querySelector('.mobile-temu-header .mobile-temu-categories');
  if (!nav) return;
  var navList = nav.querySelector('ul') || nav;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var sectionOf = function (element) { return element ? element.closest('.shopify-section') : null; };
  var home = {
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
  tabs.forEach(function (tab, index) {
    tab.link.setAttribute('role', 'tab');
    tab.link.setAttribute('aria-selected', 'false');
    tab.link.setAttribute('data-mshein-tab', String(index));
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

  var current = -1;
  var requestToken = 0;
  var cache = {};
  var products = null;

  var syncHeader = function () { if (window.msheinSyncHeader) window.msheinSyncHeader(); };
  var fetchDept = function (tab) {
    if (!cache[tab.path]) {
      cache[tab.path] = fetch(tab.path + '?view=mshein-dept', { credentials: 'same-origin' })
        .then(function (response) {
          if (!response.ok) throw new Error('Department request failed: ' + response.status);
          return response.text();
        })
        .catch(function (error) {
          delete cache[tab.path];
          throw error;
        });
    }
    return cache[tab.path];
  };
  var enter = function (elements) {
    if (reduceMotion) return;
    elements.forEach(function (element) {
      element.classList.remove('mshein-is-entering');
      void element.offsetWidth;
      element.classList.add('mshein-is-entering');
      element.addEventListener('animationend', function done() {
        element.classList.remove('mshein-is-entering');
        element.removeEventListener('animationend', done);
      });
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
    if (home.tiles) home.tiles.hidden = !visible && !keepTiles;
    if (home.mods) home.mods.hidden = !visible;
    home.feed.hidden = !visible;
  };
  var clearSlots = function () {
    if (products) products.destroy();
    products = null;
    Object.keys(slots).forEach(function (name) {
      slots[name].replaceChildren();
      slots[name].hidden = true;
      slots[name].removeAttribute('data-mshein-hero-active');
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

  /* ---------- Bloc de recherche et produits d'un rayon ---------- */
  var createProducts = function (slot, basePath) {
    var results = slot.querySelector('[data-dept-results]');
    var params = new URLSearchParams();
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
      var top = block.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mshein-tabs-top')) || 0);
      if (window.scrollY > top) window.scrollTo({ top: top });
    };
    // Tri, filtres ou puce : seulement la partie résultats est redemandée (mêmes vrais filtres que la page collection).
    var reload = function () {
      var myToken = ++token;
      results.classList.add('is-loading');
      var query = params.toString();
      fetch(basePath + '?view=mshein-dept' + (query ? '&' + query : ''), { credentials: 'same-origin' })
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

    var sheet = function () { return document.querySelector('[data-dept-sheet].is-mshein-moved') || results.querySelector('[data-dept-sheet]'); };
    var openSheet = function (section) {
      var panel = results.querySelector('[data-dept-sheet]');
      if (!panel) return;
      // Fenêtre posée sur la page (au-dessus de l'en-tête et de la barre du bas).
      sheetHome = panel.parentNode;
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
      window.setTimeout(function () {
        panel.hidden = true;
        panel.classList.remove('is-mshein-moved');
        if (sheetHome && sheetHome.isConnected) sheetHome.insertBefore(panel, sheetHome.querySelector('[data-mshein-grid], .mshein-feed__grid'));
        else panel.remove();
      }, 250);
    };

    var onClick = function (event) {
      var chip = event.target.closest('[data-dept-chip]');
      if (chip) {
        slot.querySelectorAll('[data-dept-chip]').forEach(function (button) { button.classList.toggle('is-on', button === chip); });
        chip.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
        basePath = new URL(chip.getAttribute('data-dept-chip'), window.location.href).pathname;
        // Autre collection : ses propres filtres (le tri est gardé).
        var sort = params.get('sort_by');
        params = new URLSearchParams();
        if (sort) params.set('sort_by', sort);
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
      if (!event.target.matches('[data-dept-form]')) return;
      event.preventDefault();
      var sort = params.get('sort_by');
      params = new URLSearchParams();
      if (sort) params.set('sort_by', sort);
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
        var moved = document.querySelector('[data-dept-sheet].is-mshein-moved');
        if (moved) moved.remove();
        document.documentElement.style.overflow = '';
      }
    };
  };

  /* ---------- Changement d'onglet (sans rechargement) ---------- */
  var renderDept = function (tab, html) {
    var dept = new DOMParser().parseFromString(html, 'text/html').querySelector('[data-mshein-dept]');
    if (!dept) throw new Error('Department markup missing');
    var part = function (name) {
      var element = dept.querySelector('[data-dept-part="' + name + '"]');
      return element ? element.innerHTML : '';
    };
    clearSlots();
    var isAll = dept.hasAttribute('data-all');
    // « Tutti i Prodotti » : les tuiles de l'accueil restent (ses icônes), comme le prototype.
    setHomeVisible(false, isAll);
    slots.hero.innerHTML = part('hero');
    slots.cats.innerHTML = part('cats');
    slots.mods.innerHTML = part('mods');
    slots.products.innerHTML = part('products');
    Object.keys(slots).forEach(function (name) { slots[name].hidden = !slots[name].innerHTML.trim(); });
    slots.hero.setAttribute('data-mshein-hero-active', '');
    window.msheinMasonry.watchReveal(slots.cats);
    window.msheinMasonry.watchReveal(slots.mods);
    products = createProducts(slots.products, tab.path);
    enter([slots.hero, slots.cats, slots.mods, slots.products]);
  };
  var showLoading = function () {
    clearSlots();
    setHomeVisible(false, false);
    slots.hero.innerHTML = '<div class="mshein-dept-loading" aria-hidden="true"><i></i><i></i><i></i></div>';
    slots.hero.hidden = false;
    slots.hero.setAttribute('data-mshein-hero-active', '');
  };

  // index : -1 = accueil, sinon l'onglet. fromHistory : lien direct, ou Retour / Avanti du navigateur.
  var showTab = function (index, fromHistory, y) {
    if (!fromHistory) history.replaceState(Object.assign({}, history.state, { mshTab: current, mshY: window.scrollY }), '', window.location.href);
    current = index;
    var token = ++requestToken;
    markTabs(index, !fromHistory);
    if (!fromHistory) {
      history.pushState({ mshTab: index, mshY: 0 }, '', index < 0 ? window.location.pathname + window.location.search : '#' + tabs[index].slug);
    }
    if (index < 0) {
      clearSlots();
      setHomeVisible(true);
      enter([home.hero]);
      restoreScroll(y);
      return;
    }
    var tab = tabs[index];
    var cached = cache[tab.path];
    if (!cached) {
      showLoading();
      window.scrollTo({ top: 0 });
      syncHeader();
    }
    fetchDept(tab).then(function (html) {
      if (token !== requestToken) return;
      renderDept(tab, html);
      restoreScroll(y, products);
    }).catch(function (error) {
      console.error('Unable to open the department tab.', error);
      if (token !== requestToken) return;
      // En cas d'erreur réseau : la vraie page de la collection.
      window.location.href = tab.link.href;
    });
  };

  // Toucher un onglet (avant le script du header, qui ajouterait sa barre de chargement de page).
  window.addEventListener('click', function (event) {
    if (!mobile.matches || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = event.target.closest && event.target.closest('a[data-mshein-tab]');
    if (link && nav.contains(link)) {
      event.preventDefault();
      var index = Number(link.getAttribute('data-mshein-tab'));
      if (index === current) window.scrollTo({ top: 0, behavior: 'smooth' });
      else showTab(index);
      return;
    }
    // Accueil : logo ou « Home » de la barre du bas.
    var homeLink = event.target.closest && event.target.closest('.mobile-home-header__logo, .mobile-bottom-navigation a, .mobile-bottom-nav a');
    if (homeLink) {
      var target = new URL(homeLink.href, window.location.href);
      var trim = function (path) { return String(path).replace(/\/+$/, ''); };
      // Adresse de l'accueil (avec la langue : « / », « /de »…).
      if (target.origin === window.location.origin && trim(target.pathname) === trim(window.location.pathname) && !target.hash) {
        event.preventDefault();
        if (current >= 0) showTab(-1);
        else window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, true);
  // Préchargement au premier contact du doigt : la page du rayon est souvent prête au relâchement.
  nav.addEventListener('pointerdown', function (event) {
    var link = event.target.closest('a[data-mshein-tab]');
    if (link) fetchDept(tabs[Number(link.getAttribute('data-mshein-tab'))]).catch(function () {});
  }, { passive: true });

  // Retour / Avanti du navigateur (et adresse #… changée à la main) : l'onglet de cette étape, sans rechargement.
  var tabFromHash = function () {
    var hash = window.location.hash.replace(/^#/, '');
    for (var index = 0; index < tabs.length; index += 1) {
      if (tabs[index].slug === hash) return index;
    }
    return -1;
  };
  window.addEventListener('popstate', function (event) {
    var state = event.state;
    var index = state && typeof state.mshTab === 'number' ? state.mshTab : tabFromHash();
    var y = state && state.mshY ? state.mshY : 0;
    if (index !== current) showTab(index, true, y);
    else restoreScroll(y, products);
  });
  // Départ vers une autre page : position gardée pour le retour.
  window.addEventListener('pagehide', function () {
    history.replaceState(Object.assign({}, history.state, { mshTab: current, mshY: window.scrollY }), '', window.location.href);
  });

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  // Lien direct (#donna…) ou retour sur la page depuis une fiche produit : l'onglet de l'adresse s'ouvre directement.
  var startState = history.state;
  var startIndex = startState && typeof startState.mshTab === 'number' ? startState.mshTab : tabFromHash();
  if (startIndex >= tabs.length) startIndex = -1;
  if (startIndex >= 0) showTab(startIndex, true, startState && startState.mshY);
  else if (startState && startState.mshY) restoreScroll(startState.mshY);
  history.replaceState(Object.assign({}, history.state, { mshTab: current, mshY: startState && startState.mshY || 0 }), '', window.location.href);
  markTabs(current, false);

  window.msheinTabs = { show: showTab };
})();
