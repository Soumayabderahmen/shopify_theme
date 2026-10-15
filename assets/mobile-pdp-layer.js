/* Mobile : fiche produit ouverte SUR PLACE (accueil, collections, recherche), comme les onglets du header.
   Toucher une carte charge la vraie fiche (sa page HTML, demandée dès le toucher), met ses sections à la place de
   celles de la page (pied de page gardé), ajoute ses styles et lance ses scripts, puis met l'adresse du produit
   (history.pushState). Retour (flèche de la fiche, bouton du navigateur, geste) : la fiche est retirée et la page
   d'origine réapparaît instantanément, à la même position, sans rechargement.
   (Un cadre <iframe> est impossible : Shopify interdit d'afficher ses pages dans un cadre.)
   En cas de problème (fiche introuvable, erreur réseau), le lien s'ouvre normalement.
   Inactif sur ordinateur (> 760 px) et sur les fiches elles-mêmes (non chargé, layout/theme.liquid). */
(function () {
  'use strict';

  if (window.__pdpSwap) return;

  var mobile = window.matchMedia('(max-width: 760px)');
  var PRODUCT_PATH = /^(\/[a-z]{2}(?:-[a-z]{2})?)?\/(?:collections\/[^/]+\/)?products\/[^/]+\/?$/i;
  var FOOTER_GROUP = /shopify-section-group-footer/;
  // Initialisation du thème pour une fiche ajoutée après coup (même liste que le Quickshop, assets/custom-async.js).
  var INIT_EVENTS = ['modulePanel', 'semanticInput', 'ratings', 'productVariants', 'listProductSlider', 'listDrop',
    'semanticSelect', 'showHideDataElement', 'sellingplans', 'pickupAvailability', 'modulePanelAnchorEvt', 'formZindex',
    'fancybox', 'accordeon', 'dataChange', 'countdown', 'schemeTooltip', 'popups', 'moduleTabs', 'rangeSlider',
    'formProduct'];
  // Scripts de la fiche relancés à chaque ouverture (les autres ne sont chargés qu'une fois).
  var RERUN = /\/pdp-mobile\.js/;

  var root = document.documentElement;
  var main = document.getElementById('content');
  var pageRoot = document.getElementById('root');
  if (!main || !pageRoot) return;

  var cache = {};
  var added = [];
  var addedSheets = [];
  var saved = null;
  var current = null;
  var token = 0;

  var isProduct = function (url) {
    return url.origin === window.location.origin && PRODUCT_PATH.test(url.pathname);
  };
  var bare = function (href) { return String(href).split('?')[0].split('#')[0]; };
  var abs = function (href) { return new URL(href, window.location.href).href; };

  // Barre de chargement du thème (assets/mobile-temu-header.js) : même élément, même classe.
  var progress = function (on) {
    if (on && !document.querySelector('.mobile-navigation-progress')) {
      var bar = document.createElement('div');
      bar.className = 'mobile-navigation-progress';
      bar.setAttribute('aria-hidden', 'true');
      bar.appendChild(document.createElement('span'));
      document.body.appendChild(bar);
    }
    root.classList.toggle('mobile-page-loading', on);
  };

  // Page HTML de la fiche, demandée une fois (dès le toucher) et gardée une minute.
  var fetchPage = function (href) {
    var key = bare(href);
    var hit = cache[key];
    if (hit && Date.now() - hit.time < 60000) return hit.promise;
    var promise = fetch(href, { credentials: 'same-origin' }).then(function (response) {
      if (!response.ok) throw new Error('Product page ' + response.status);
      return response.text();
    });
    cache[key] = { time: Date.now(), promise: promise };
    promise.catch(function () { delete cache[key]; });
    return promise;
  };

  // Styles de la fiche absents de la page : ajoutés (puis coupés à la fermeture, réactivés à la suivante).
  var loadStyles = function (doc) {
    var have = {};
    document.querySelectorAll('link[rel="stylesheet"]').forEach(function (link) { have[bare(link.href)] = link; });
    var waits = [];
    doc.querySelectorAll('link[rel="stylesheet"]').forEach(function (link) {
      var href = abs(link.getAttribute('href'));
      var mine = addedSheets.filter(function (entry) { return bare(entry.link.href) === bare(href); })[0];
      if (mine) { mine.link.media = mine.media; return; }
      if (have[bare(href)]) return;
      var copy = document.createElement('link');
      copy.rel = 'stylesheet';
      copy.href = href;
      var media = link.getAttribute('media') || 'all';
      copy.media = media;
      addedSheets.push({ link: copy, media: media });
      waits.push(new Promise(function (resolve) {
        copy.onload = resolve;
        copy.onerror = resolve;
        window.setTimeout(resolve, 3000);
      }));
      document.head.appendChild(copy);
    });
    return Promise.all(waits);
  };

  // Les scripts de la fiche s'exécutent après le chargement de la page : DOMContentLoaded / load n'arriveront plus,
  // leurs fonctions sont donc appelées tout de suite pendant ce passage.
  var patchReady = function () {
    var docAdd = document.addEventListener;
    var winAdd = window.addEventListener;
    var late = function (original, target) {
      return function (type, listener, options) {
        if ((type === 'DOMContentLoaded' || type === 'load') && listener) {
          window.setTimeout(function () {
            try {
              if (typeof listener === 'function') listener.call(target, new Event(type));
              else if (listener.handleEvent) listener.handleEvent(new Event(type));
            } catch (error) { console.error(error); }
          }, 0);
          return undefined;
        }
        return original.call(this, type, listener, options);
      };
    };
    document.addEventListener = late(docAdd, document);
    window.addEventListener = late(winAdd, window);
    return function () {
      document.addEventListener = docAdd;
      window.addEventListener = winAdd;
    };
  };

  var runScript = function (old) {
    return new Promise(function (resolve) {
      var type = (old.getAttribute('type') || '').toLowerCase();
      if (type && type !== 'text/javascript' && type !== 'application/javascript' && type !== 'module') { resolve(); return; }
      var src = old.getAttribute('src');
      if (src && !RERUN.test(src)) {
        var known = Array.prototype.some.call(document.scripts, function (script) {
          return script !== old && script.src && bare(script.src) === bare(abs(src));
        });
        if (known) { resolve(); return; }
      }
      var script = document.createElement('script');
      Array.prototype.forEach.call(old.attributes, function (attribute) { script.setAttribute(attribute.name, attribute.value); });
      if (src) {
        script.async = false;
        script.onload = resolve;
        script.onerror = resolve;
      } else {
        script.textContent = old.textContent;
      }
      if (old.parentNode) old.parentNode.replaceChild(script, old);
      else document.body.appendChild(script);
      if (!src) resolve();
    });
  };

  var runScripts = function (nodes, headScripts) {
    var list = [];
    nodes.forEach(function (node) {
      if (node.tagName === 'SCRIPT') list.push(node);
      node.querySelectorAll && node.querySelectorAll('script').forEach(function (script) { list.push(script); });
    });
    var restore = patchReady();
    var chain = Promise.resolve();
    list.concat(headScripts).forEach(function (script) {
      chain = chain.then(function () { return runScript(script); }).catch(function (error) { console.error(error); });
    });
    return chain.then(function () {
      // Laisse partir les fonctions « prêt » différées avant de rendre les écouteurs d'origine.
      return new Promise(function (resolve) { window.setTimeout(resolve, 0); });
    }).then(restore, function (error) { restore(); throw error; });
  };

  // App d'avis (Ali Reviews) : ses réglages ne sont posés qu'une fois par page (__AR_VARIABLE_INJECT) et sa boîte
  // d'avis n'est chargée qu'au démarrage. On lui fait reprendre ceux de la fiche, puis on relance sa boîte ; ceux de
  // la page sont remis à la fermeture.
  var reviewsSaved = null;
  var reviewsBefore = function () {
    if (!('__AR_VARIABLE_INJECT' in window)) return;
    if (!reviewsSaved) {
      reviewsSaved = {
        inject: window.__AR_VARIABLE_INJECT,
        object: window.__AR_WIDGET_REVIEW_OBJECT,
        core: window.__AR_CORE_SNIPPET
      };
    }
    try { delete window.__AR_VARIABLE_INJECT; } catch (error) { window.__AR_VARIABLE_INJECT = undefined; }
  };
  var reviewsAfter = function () {
    if (!document.querySelector('.alireviews-review-box') || typeof window.__AR_loadJSWidget !== 'function') return;
    Array.prototype.forEach.call(document.querySelectorAll('script[src*="alireviews-box.min.js"]'), function (script) { script.remove(); });
    try { delete window.__AR_CORE_SNIPPET; } catch (error) { window.__AR_CORE_SNIPPET = undefined; }
    try { window.__AR_loadJSWidget('.alireviews-review-box', 'alireviews-box.min.js'); } catch (error) { console.error(error); }
    // Son chargeur attend un défilement : la note « ★ 4,8 (150) » de la fiche vient de la boîte, on la charge tout de suite.
    window.dispatchEvent(new Event('scroll'));
  };
  var reviewsRestore = function () {
    if (!reviewsSaved) return;
    window.__AR_VARIABLE_INJECT = reviewsSaved.inject;
    window.__AR_WIDGET_REVIEW_OBJECT = reviewsSaved.object;
    if (reviewsSaved.core !== undefined) window.__AR_CORE_SNIPPET = reviewsSaved.core;
    reviewsSaved = null;
  };

  var initTheme = function () {
    reviewsAfter();
    INIT_EVENTS.forEach(function (name) {
      try { window.dispatchEvent(new CustomEvent(name)); } catch (error) { console.error(error); }
    });
    try {
      if (window.Shopify && window.Shopify.PaymentButton && window.Shopify.PaymentButton.init) window.Shopify.PaymentButton.init();
    } catch (error) { console.error(error); }
    try { window.dispatchEvent(new CustomEvent('removeSDCcss')); } catch (error) { console.error(error); }
    // Formulaire d'achat : ajout au panier en arrière-plan et panier latéral, comme sur la fiche normale.
    try {
      if (window.ajaxCart && typeof window.ajaxCart.init === 'function') window.ajaxCart.init();
      if (typeof window.linkMoreClick === 'function') window.linkMoreClick();
    } catch (error) { console.error(error); }
  };

  // Compteurs du panier de la page : l'article a pu être ajouté depuis la fiche.
  var syncCart = function () {
    var shopRoot = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
    fetch(shopRoot + 'cart.js', { credentials: 'same-origin' })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (cart) {
        if (!cart) return;
        document.querySelectorAll('#cart-count, #cart-count--m, .mobile-home-cart-count').forEach(function (element) {
          element.textContent = String(cart.item_count);
          if (element.id === 'cart-count--m' || element.classList.contains('mobile-home-cart-count')) element.hidden = cart.item_count <= 0;
        });
      })
      .catch(function (error) { console.error(error); });
  };

  // Fenêtre d'ajout rapide (assets/mobile-quick-add.js) ou panneau du thème (panier latéral…) encore ouverts :
  // fermés, comme lors d'un changement de page.
  var closeOverlays = function () {
    document.querySelectorAll('[data-mobile-quick-add].is-open [data-qa-close]').forEach(function (button) { button.click(); });
    try {
      if (root.classList.contains('m6pn-open') && typeof window.hidePanels === 'function') window.hidePanels();
    } catch (error) { console.error(error); }
  };

  var removeProduct = function () {
    added.forEach(function (node) { if (node.parentNode) node.parentNode.removeChild(node); });
    added = [];
  };

  var close = function () {
    token += 1;
    progress(false);
    if (!saved) return;
    closeOverlays();
    removeProduct();
    saved.hidden.forEach(function (entry) { entry.node.style.display = entry.display; });
    document.body.className = saved.bodyClass;
    document.title = saved.title;
    addedSheets.forEach(function (entry) { entry.link.media = 'not all'; });
    reviewsRestore();
    var y = saved.y;
    var restoration = saved.restoration;
    saved = null;
    current = null;
    window.scrollTo(0, y);
    window.requestAnimationFrame(function () {
      if (Math.abs(window.scrollY - y) > 2) window.scrollTo(0, y);
      if ('scrollRestoration' in window.history) window.history.scrollRestoration = restoration;
    });
    syncCart();
  };

  var show = function (doc, href) {
    var productMain = doc.getElementById('content');
    if (!productMain || !productMain.querySelector('[data-pdp-mobile]')) throw new Error('Mobile product page not found');
    var sections = Array.prototype.filter.call(productMain.children, function (node) {
      return !FOOTER_GROUP.test(node.className || '');
    });
    var sticky = doc.getElementById('shopify-section-sticky-add-to-cart');
    closeOverlays();
    var headScripts = Array.prototype.filter.call(doc.head.querySelectorAll('script[src]'), function (script) {
      var src = bare(abs(script.getAttribute('src')));
      if (RERUN.test(src)) return true;
      return !Array.prototype.some.call(document.scripts, function (mine) { return mine.src && bare(mine.src) === src; });
    });

    if (!saved) {
      saved = {
        y: window.scrollY,
        bodyClass: document.body.className,
        title: document.title,
        restoration: 'scrollRestoration' in window.history ? window.history.scrollRestoration : 'auto',
        hidden: []
      };
      Array.prototype.forEach.call(main.children, function (node) {
        if (FOOTER_GROUP.test(node.className || '')) return;
        saved.hidden.push({ node: node, display: node.style.display });
        node.style.display = 'none';
      });
      if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    } else {
      removeProduct();
    }

    var anchor = Array.prototype.filter.call(main.children, function (node) { return FOOTER_GROUP.test(node.className || ''); })[0] || null;
    sections.forEach(function (node) {
      var copy = document.importNode(node, true);
      main.insertBefore(copy, anchor);
      added.push(copy);
    });
    if (sticky) {
      var stickyCopy = document.importNode(sticky, true);
      pageRoot.insertBefore(stickyCopy, document.getElementById('quickshop'));
      added.push(stickyCopy);
    }
    document.body.className = doc.body.className;
    document.title = doc.title;
    current = bare(href);
    window.scrollTo(0, 0);
    var scripts = headScripts.map(function (script) { return document.importNode(script, true); });
    reviewsBefore();
    return runScripts(added, scripts).then(initTheme);
  };

  var open = function (href, push) {
    var mine = (token += 1);
    progress(true);
    return fetchPage(href)
      .then(function (text) {
        if (mine !== token) return null;
        var doc = new DOMParser().parseFromString(text, 'text/html');
        return loadStyles(doc).then(function () { return doc; });
      })
      .then(function (doc) {
        if (!doc || mine !== token) return;
        if (push) {
          var state = window.history.state;
          // Onglets de l'accueil (assets/mobile-home-tabs.js) : au retour ils remettent la position enregistrée.
          if (!saved && state && typeof state.mshTab === 'number') {
            window.history.replaceState(Object.assign({}, state, { mshY: window.scrollY }), '', window.location.href);
            state = window.history.state;
          }
          // Fiche déjà affichée (produit recommandé) : sa position est gardée pour y revenir.
          if (saved) window.history.replaceState(Object.assign({}, state, { pdpY: window.scrollY }), '', window.location.href);
          state = window.history.state;
          var base = Object.assign({}, state);
          delete base.pdpSwap;
          delete base.pdpY;
          window.history.pushState(Object.assign(base, { pdpSwap: href }), '', href);
        }
        var backY = !push && window.history.state && window.history.state.pdpY;
        return show(doc, href).then(function () {
          if (mine !== token) return;
          progress(false);
          if (backY) window.scrollTo(0, backY);
        });
      })
      .catch(function (error) {
        console.error(error);
        if (mine !== token) return;
        // Fiche impossible à afficher sur place : ouverture normale.
        window.location.href = href;
      });
  };

  window.__pdpSwap = {
    active: function () { return !!saved; },
    back: function () { window.history.back(); }
  };

  var productLink = function (event) {
    if (!mobile.matches) return null;
    var link = event.target.closest ? event.target.closest('a[href]') : null;
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return null;
    var url = new URL(link.href, window.location.href);
    return isProduct(url) ? url : null;
  };

  // Page demandée dès le toucher : elle arrive souvent avant la fin du toucher.
  document.addEventListener('touchstart', function (event) {
    var url = productLink(event);
    if (url) fetchPage(url.href).catch(function () {});
  }, { passive: true });

  document.addEventListener('click', function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var url = productLink(event);
    if (!url) return;
    event.preventDefault();
    if (bare(url.href) === current) return;
    open(url.href, true);
  });

  // Retour / avance : l'adresse décide (le thème remplace l'état de l'étape au changement de variante).
  window.addEventListener('popstate', function () {
    var url = new URL(window.location.href);
    if (isProduct(url)) {
      if (bare(url.href) !== current) open(url.href, false);
    } else {
      close();
    }
  });
})();
