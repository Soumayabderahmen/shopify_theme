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
  var ran = {};
  var added = [];
  var addedSheets = [];
  var saved = null;
  var current = null;
  var token = 0;

  // Saut de position sans animation (le thème a scroll-behavior: smooth : la fiche glissait depuis la position de la
  // page, et le retour n'arrivait pas tout à fait au même endroit).
  var jump = function (y) {
    var previous = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    try { window.scrollTo({ top: y, left: 0, behavior: 'instant' }); } catch (error) { window.scrollTo(0, y); }
    if (Math.abs(window.scrollY - y) > 1) window.scrollTo(0, y);
    // Lecture de la position avant de rendre le réglage du thème : sinon le saut part plus tard, en défilement doux.
    void window.scrollY;
    root.style.scrollBehavior = previous;
  };

  var isProduct = function (url) {
    return url.origin === window.location.origin && PRODUCT_PATH.test(url.pathname);
  };
  var bare = function (href) { return String(href).split('?')[0].split('#')[0]; };
  var abs = function (href) { return new URL(href, window.location.href).href; };
  // Même feuille de style quel que soit le numéro du thème (/cdn/shop/t/70/ ou /t/71/) : la liste retenue d'un autre
  // thème ajoutait une 2e copie de screen.css, theme-xtra.css… déjà chargées par la page.
  var sheetKey = function (href) { return bare(href).replace(/\/cdn\/shop\/t\/\d+\//, '/cdn/shop/t/'); };

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

  // Fiche demandée à Shopify. La première fois : la page entière (2 Mo), d'où l'on retient la liste de ses sections,
  // ses styles / scripts d'en-tête et ses classes. Ensuite : seulement ses sections (API « sections » de Shopify,
  // ~3 fois plus léger et 2 fois plus rapide), assemblées en une page équivalente. Une fiche d'un autre modèle
  // (sections différentes) repasse par la page entière.
  var CFG_KEY = 'pdpSwapCfg1';
  var cfg = null;
  try { cfg = JSON.parse(window.localStorage.getItem(CFG_KEY) || 'null'); } catch (error) { cfg = null; }
  // Liste retenue lors d'une visite précédente : les fichiers du thème qu'elle cite sont remis à leur version actuelle
  // (adresses données par layout/theme.liquid et celles de la page). Sans cela, après une mise à jour du thème, les
  // fiches ouvertes sur place prenaient l'ancien pdp-mobile.css / pdp-mobile.js (affichage d'avant les corrections).
  var THEME_ASSET = /\/cdn\/shop\/t\/\d+\/assets\/([^?"#\s]+)/;
  var currentAssets = {};
  var addAsset = function (url) {
    var match = THEME_ASSET.exec(url || '');
    if (match) currentAssets[match[1]] = url;
  };
  String((document.currentScript && document.currentScript.getAttribute('data-pdp-assets')) || '').split(/\s+/).forEach(addAsset);
  document.querySelectorAll('link[rel="stylesheet"][href*="/cdn/shop/t/"], script[src*="/cdn/shop/t/"]').forEach(function (node) {
    addAsset(node.getAttribute('href') || node.getAttribute('src'));
  });
  if (cfg && cfg.head) {
    cfg.head = cfg.head.replace(/(href|src)="([^"]+)"/g, function (whole, attr, url) {
      var match = THEME_ASSET.exec(url.replace(/&amp;/g, '&'));
      var fresh = match && currentAssets[match[1]];
      return fresh ? attr + '="' + fresh.replace(/&/g, '&amp;') + '"' : whole;
    });
  }
  var learn = function (doc) {
    var productMain = doc.getElementById('content');
    if (!productMain) return;
    var ids = Array.prototype.filter.call(productMain.children, function (node) {
      return node.id && node.id.indexOf('shopify-section-') === 0 && !FOOTER_GROUP.test(node.className || '');
    }).map(function (node) { return node.id.replace('shopify-section-', ''); });
    if (doc.getElementById('shopify-section-sticky-add-to-cart')) ids.push('sticky-add-to-cart');
    if (!ids.length || ids.length > 5) { cfg = null; return; }
    var head = Array.prototype.map.call(doc.head.querySelectorAll('link[rel="stylesheet"], script[src]'), function (node) { return node.outerHTML; }).join('');
    var suffix = (doc.title.match(/\s[–—-]\s[^–—-]+$/) || [''])[0];
    cfg = { ids: ids, head: head, bodyClass: doc.body.className, suffix: suffix };
    try { window.localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (error) { /* stockage plein ou refusé */ }
  };
  var parse = function (html) { return new DOMParser().parseFromString(html, 'text/html'); };
  var fetchFull = function (href) {
    return fetch(href, { credentials: 'same-origin' }).then(function (response) {
      if (!response.ok) throw new Error('Product page ' + response.status);
      return response.text();
    }).then(function (text) {
      var doc = parse(text);
      learn(doc);
      return doc;
    });
  };
  var fetchSections = function (href) {
    var known = cfg;
    var url = bare(href) + '?sections=' + known.ids.map(encodeURIComponent).join(',');
    return fetch(url, { credentials: 'same-origin' }).then(function (response) {
      if (!response.ok) throw new Error('Sections ' + response.status);
      return response.json();
    }).then(function (data) {
      var body = '';
      var sticky = '';
      for (var i = 0; i < known.ids.length; i++) {
        var html = data[known.ids[i]];
        if (!html) throw new Error('Section missing: ' + known.ids[i]);
        if (known.ids[i] === 'sticky-add-to-cart') sticky = html;
        else body += html;
      }
      var doc = parse('<!doctype html><html><head>' + known.head + '<title></title></head><body class="' +
        known.bodyClass.replace(/"/g, '&quot;') + '"><main id="content">' + body + '</main>' + sticky + '</body></html>');
      var title = doc.querySelector('[data-pdp-title]');
      if (!title || !doc.querySelector('[data-pdp-mobile]')) throw new Error('Mobile product section not found');
      doc.title = title.textContent.trim() + known.suffix;
      return doc;
    });
  };
  // Fiche demandée une fois (préchargement, toucher) et gardée 3 minutes.
  var fetchDoc = function (href) {
    var key = bare(href);
    var hit = cache[key];
    if (hit && Date.now() - hit.time < 180000) return hit.promise;
    var promise = (cfg ? fetchSections(href).catch(function () { return fetchFull(href); }) : fetchFull(href));
    cache[key] = { time: Date.now(), promise: promise };
    promise.then(warmStyles, function () { delete cache[key]; });
    return promise;
  };

  // Styles de la fiche absents de la page : téléchargés D'AVANCE, inactifs (media « not all » : le navigateur les
  // télécharge sans les appliquer), dès qu'une fiche est connue (préchargement des cartes, liste retenue des styles
  // d'en-tête). À l'ouverture ils sont activés ; la fiche n'apparaît qu'une fois ses styles arrivés (l'aperçu reste
  // affiché en attendant), sinon elle se montrait un instant sans mise en forme sur un téléphone lent.
  var watchReady = function (entry) {
    entry.ready = new Promise(function (resolve) {
      entry.link.onload = resolve;
      entry.link.onerror = resolve;
    });
  };
  // Feuilles d'une page lue par DOMParser : celles des <noscript> y deviennent de vraies balises (async-menu.css,
  // drawer1product-style.css… comptées deux fois) et sont ignorées.
  var sheetLinks = function (doc) {
    return Array.prototype.filter.call(doc.querySelectorAll('link[rel="stylesheet"]'), function (link) {
      return !link.closest('noscript');
    });
  };
  // Scripts de la fiche absents de la page (pdp-mobile.js, spec-i18n.js, drower-product.js…) : téléchargés d'avance
  // avec ses styles, ils s'exécutent dès l'ouverture au lieu d'attendre le réseau l'un après l'autre.
  var preloaded = {};
  // Scripts de mise en forme de la fiche (et ses textes traduits) : leur texte est gardé et exécuté directement à
  // l'insertion, sans attendre leur tour derrière les minuteries des apps (Clarity, pixels…) : ~0,5 s de gagné.
  var CORE = /\/(?:pdp-mobile|spec-i18n)\.js/;
  var coreText = {};
  var warmScripts = function (doc) {
    doc.querySelectorAll('script[src]').forEach(function (script) {
      var src = abs(script.getAttribute('src'));
      var key = bare(src);
      if (CORE.test(key) && !(src in coreText)) {
        coreText[src] = null;
        fetch(src, { credentials: 'same-origin' })
          .then(function (response) { return response.ok ? response.text() : null; })
          .then(function (text) { if (text) coreText[src] = text; else delete coreText[src]; })
          .catch(function () { delete coreText[src]; });
      }
      if (preloaded[key] || ran[key]) return;
      preloaded[key] = true;
      if (Array.prototype.some.call(document.scripts, function (mine) { return mine.src && bare(mine.src) === key; })) return;
      var hint = document.createElement('link');
      hint.rel = 'preload';
      hint.as = 'script';
      hint.href = src;
      document.head.appendChild(hint);
    });
  };
  var sheetFor = function (link) {
    var href = abs(link.getAttribute('href'));
    var mine = addedSheets.filter(function (entry) { return sheetKey(entry.link.href) === sheetKey(href); })[0];
    var inPage = Array.prototype.some.call(document.querySelectorAll('link[rel="stylesheet"]'), function (node) {
      return (!mine || node !== mine.link) && sheetKey(node.href) === sheetKey(href);
    });
    // Feuille chargée entre-temps par le thème lui-même (async-menu.css à l'ouverture du menu…) : notre copie part.
    if (mine && inPage) {
      if (mine.link.parentNode) mine.link.parentNode.removeChild(mine.link);
      addedSheets.splice(addedSheets.indexOf(mine), 1);
      return null;
    }
    if (mine) {
      // Liste retenue d'une version précédente du thème (?v= différent) : la version demandée par la fiche gagne.
      if (mine.link.href !== href) {
        mine.link.href = href;
        watchReady(mine);
      }
      return mine;
    }
    if (inPage) return null;
    var copy = document.createElement('link');
    copy.rel = 'stylesheet';
    copy.href = href;
    copy.media = 'not all';
    // Chargement différé du thème (media « print » remis à « all » par son onload, layout/theme.liquid) : actif partout.
    var media = link.getAttribute('media') || 'all';
    if (media === 'print' && /media/.test(link.getAttribute('onload') || '')) media = 'all';
    var entry = { link: copy, media: media };
    watchReady(entry);
    addedSheets.push(entry);
    document.head.appendChild(copy);
    return entry;
  };
  var warmStyles = function (doc) {
    sheetLinks(doc).forEach(sheetFor);
    warmScripts(doc);
  };
  var loadStyles = function (doc) {
    var waits = [];
    sheetLinks(doc).forEach(function (link) {
      var entry = sheetFor(link);
      if (!entry) return;
      entry.link.media = entry.media;
      // 8 s au plus : au-delà, la fiche s'affiche quand même (réseau très lent).
      waits.push(Promise.race([entry.ready, new Promise(function (resolve) { window.setTimeout(resolve, 8000); })]));
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
        // Déjà exécuté : par nous, ou présent dans la page hors de la fiche insérée (les copies encore inertes de la
        // fiche ne comptent pas : drower-product.js y figure deux fois et aurait été sauté deux fois).
        var key = bare(abs(src));
        var known = ran[key] || Array.prototype.some.call(document.scripts, function (script) {
          return script !== old && script.src && bare(script.src) === key
            && !added.some(function (node) { return node.contains(script); });
        });
        if (known) { resolve(); return; }
        ran[key] = true;
      }
      var script = document.createElement('script');
      var text = src ? coreText[abs(src)] : null;
      if (text) {
        // Texte déjà téléchargé (warmScripts) : exécuté tout de suite, à l'insertion.
        script.textContent = text + '\n//# sourceURL=' + abs(src);
        if (old.parentNode) old.parentNode.replaceChild(script, old);
        else document.body.appendChild(script);
        resolve();
        return;
      }
      Array.prototype.forEach.call(old.attributes, function (attribute) { script.setAttribute(attribute.name, attribute.value); });
      if (src) {
        // Pas de script.async = false : l'ordre est déjà tenu par la chaîne (chaque script attend la fin du précédent).
        // En mode « ordonné », le navigateur faisait attendre la fiche derrière tous les scripts ordonnés encore en
        // téléchargement (morceaux alr-*.min.js d'Ali Reviews de la fiche précédente) : pdp-mobile.js démarrait 5 à
        // 10 s après l'affichage de la fiche.
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

  // onCore : appelé dès que pdp-mobile.js a mis la fiche en forme (sans attendre les scripts des apps derrière lui).
  var runScripts = function (nodes, headScripts, onCore) {
    var list = [];
    nodes.forEach(function (node) {
      if (node.tagName === 'SCRIPT') list.push(node);
      node.querySelectorAll && node.querySelectorAll('script').forEach(function (script) { list.push(script); });
    });
    // Scripts de la plateforme Shopify (/cdn/shopifycloud/ : boutons de paiement portable-wallets, 406 Ko…) en fin de
    // chaîne : ils ne dépendent pas des scripts de la fiche, et pdp-mobile.js (tailles, prix, ajout au panier) attendait
    // derrière eux ~0,8 s avant de démarrer. Les autres gardent leur ordre (pdp-mobile.js a besoin de spec-i18n.js).
    var platform = function (script) { return /\/cdn\/shopifycloud\//.test(script.getAttribute('src') || ''); };
    list = list.filter(function (script) { return !platform(script); }).concat(list.filter(platform));
    // pdp-mobile.js (et spec-i18n.js avant lui) en tête : la fiche est mise en forme avant les scripts des apps de la
    // fiche (wishlist, guide des tailles, Klarna, Ali Reviews), dont il ne dépend pas.
    var coreEnd = -1;
    headScripts.forEach(function (script, i) { if (RERUN.test(script.getAttribute('src') || '')) coreEnd = i; });
    var ordered = headScripts.slice(0, coreEnd + 1).concat(list, headScripts.slice(coreEnd + 1));
    var restore = patchReady();
    var chain = Promise.resolve();
    ordered.forEach(function (script) {
      chain = chain.then(function () { return runScript(script); }).catch(function (error) { console.error(error); });
      if (onCore && RERUN.test(script.getAttribute('src') || '')) chain = chain.then(onCore);
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

  // Boutons de paiement rapide : quand leur module est déjà chargé (2e fiche ouverte), Shopify dessine le bouton deux
  // fois dans le même élément (deux « Paga con PayPal »). Seul le dernier rendu est gardé.
  var WALLETS = 'shopify-paypal-button, shopify-google-pay-button, shopify-apple-pay-button, shopify-shop-pay-button';
  var dedupeWallets = function () {
    added.forEach(function (node) {
      if (!node.querySelectorAll) return;
      node.querySelectorAll(WALLETS).forEach(function (button) {
        var trim = function () {
          var renders = Array.prototype.filter.call(button.children, function (child) { return child.tagName === 'DIV'; });
          renders.slice(0, -1).forEach(function (render) { render.remove(); });
        };
        trim();
        var watcher = new MutationObserver(trim);
        watcher.observe(button, { childList: true });
        window.setTimeout(function () { watcher.disconnect(); }, 10000);
      });
    });
  };

  // Klarna : son élément <klarna-placement> est déjà actif (klarna.js chargé par la page) et se dessine dès l'insertion,
  // avant que l'app lui donne montant et langue → « No content found ». Une fois ces réglages posés, le bloc est
  // remplacé par une copie, qui se dessine alors avec le bon message (« 3 pagamenti da … »).
  var refreshKlarna = function () {
    added.forEach(function (node) {
      if (!node.querySelectorAll) return;
      node.querySelectorAll('klarna-placement').forEach(function (placement) {
        var swap = function (target) {
          var copy = target.cloneNode(false);
          marked.push(copy);
          target.replaceWith(copy);
          // Pas de flou pendant son chargement (même style que assets/pdp-mobile.js), dès sa création.
          if (copy.shadowRoot && !copy.shadowRoot.querySelector('style[data-pdp-klarna]')) {
            var style = document.createElement('style');
            style.setAttribute('data-pdp-klarna', '');
            style.textContent = '.loading p{filter:none!important;transition:none!important}';
            copy.shadowRoot.appendChild(style);
          }
        };
        if (placement.hasAttribute('data-purchase-amount')) { swap(placement); return; }
        var watcher = new MutationObserver(function () {
          if (!placement.hasAttribute('data-purchase-amount') || !placement.isConnected) return;
          watcher.disconnect();
          swap(placement);
        });
        watcher.observe(placement, { attributes: true });
        window.setTimeout(function () { watcher.disconnect(); }, 15000);
      });
    });
  };

  var initTheme = function () {
    reviewsAfter();
    dedupeWallets();
    refreshKlarna();
    INIT_EVENTS.forEach(function (name) {
      try { window.dispatchEvent(new CustomEvent(name)); } catch (error) { console.error(error); }
    });
    // Boutons de paiement rapide (<shopify-accelerated-checkout>) : ils se dessinent seuls à l'insertion ;
    // Shopify.PaymentButton.init() les dessinait une deuxième fois (deux « Paga con PayPal »).
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
    // Panneaux « Categoria » et « Esplora » du header (assets/mobile-temu-header.js) : fermés tout de suite, sinon
    // la fiche s'ouvrait derrière le panneau resté ouvert. Leur fermeture remet aussi la page à sa position.
    try {
      if (window.msheinPanels && typeof window.msheinPanels.closeAll === 'function') window.msheinPanels.closeAll();
    } catch (error) { console.error(error); }
    document.querySelectorAll('[data-mobile-quick-add].is-open [data-qa-close]').forEach(function (button) { button.click(); });
    // Fenêtre de marque (assets/drower-product.js) : sa croix rend aussi le défilement.
    document.querySelectorAll('.js-drawer-modal.is-active .js-drawer-close').forEach(function (button) { button.click(); });
    try {
      if (root.classList.contains('m6pn-open') && typeof window.hidePanels === 'function') window.hidePanels();
    } catch (error) { console.error(error); }
  };

  // Éléments venus de la fiche : retenus, pour les retirer aussi quand ses scripts les ont déplacés ailleurs (fenêtres
  // du guide des tailles, de la marque… mises dans <body>) ; sinon ceux d'une fiche précédente restaient, avec les
  // mêmes identifiants (#scDrawer…) que ceux de la nouvelle. Liste en mémoire, pas d'attribut : Klarna lit tous les
  // data-… de son bloc comme réglages (un attribut de plus et il n'affiche plus rien).
  var marked = [];
  var mark = function (node) {
    if (node.nodeType !== 1) return;
    marked.push(node);
    node.querySelectorAll('*').forEach(function (child) { marked.push(child); });
  };

  var removeProduct = function () {
    added.forEach(function (node) { if (node.parentNode) node.parentNode.removeChild(node); });
    added = [];
    marked.forEach(function (node) { if (node.isConnected && node.parentNode) node.parentNode.removeChild(node); });
    marked = [];
  };

  // Sections de la page cachées pendant la fiche. content-visibility: hidden (hauteur 0) garde leur mise en page en
  // mémoire sans la dessiner : au retour la page réapparaît presque sans calcul (display: none la jetait, et toute la
  // page — 100+ cartes — était recalculée, ~1 s avant que le retour ne commence à glisser). Navigateurs sans
  // content-visibility (anciens iPhone) : display: none comme avant.
  var KEEP_LAYOUT = !!(window.CSS && CSS.supports && CSS.supports('content-visibility', 'hidden'));
  var hidePageSection = function (node) {
    if (!KEEP_LAYOUT) { node.style.display = 'none'; return; }
    ['content-visibility:hidden', 'height:0', 'min-height:0', 'margin:0', 'padding:0', 'border:0'].forEach(function (rule) {
      var parts = rule.split(':');
      node.style.setProperty(parts[0], parts[1], 'important');
    });
  };

  // Retour comme SHEIN : la fiche, figée en place (position fixe, plein écran, à sa position de défilement — sans la
  // déplacer dans la page, ce qui rechargeait ses éléments : 2 fois plus lent), glisse vers la droite et découvre la
  // page déjà remise en place dessous ; elle n'est retirée (avec ses styles) qu'à la fin du glissement.
  var motion = function () {
    return typeof Element.prototype.animate === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };
  // Après l'affichage de la prochaine image (deux requestAnimationFrame) : une animation de glissement démarre alors
  // sur des images légères et se voit en entier.
  var afterNextPaint = function (callback) {
    window.requestAnimationFrame(function () { window.requestAnimationFrame(callback); });
  };
  var slideOut = function () {
    if (!motion()) return false;
    var sheet = added.filter(function (node) { return node.querySelector && node.querySelector('[data-pdp-mobile]'); })[0];
    if (!sheet) return false;
    var y = window.scrollY;
    var nodes = added;
    var extras = marked;
    added = [];
    marked = [];
    nodes.forEach(function (node) { if (node !== sheet && node.style) node.style.display = 'none'; });
    sheet.style.cssText += ';position:fixed;inset:0;z-index:2147480000;overflow:hidden;background:#fff;' +
      'box-shadow:-8px 0 24px rgba(22,18,63,.12);pointer-events:none;will-change:transform';
    sheet.scrollTop = y;
    var dim = document.createElement('div');
    dim.setAttribute('aria-hidden', 'true');
    dim.style.cssText = 'position:fixed;inset:0;z-index:2147479999;background:rgba(22,18,63,.18);pointer-events:none';
    pageRoot.appendChild(dim);
    var finish = function () {
      nodes.forEach(function (node) { if (node.parentNode) node.parentNode.removeChild(node); });
      if (dim.parentNode) dim.parentNode.removeChild(dim);
      extras.forEach(function (node) { if (node.isConnected && node.parentNode) node.parentNode.removeChild(node); });
      // Styles de la fiche coupés, sauf si une autre fiche a été ouverte pendant le glissement.
      if (!saved) addedSheets.forEach(function (entry) { entry.link.media = 'not all'; });
    };
    // Départ à l'image suivante, celle qui redessine la page remise dessous (~300 ms sur téléphone) : le glissement
    // tourne sur le compositeur, son départ est compté à l'affichage de cette image (mesuré : départ 190 ms plus tôt
    // qu'en attendant une image de plus, où les minuteries des apps — Clarity, pixels — le retardaient encore). La
    // fiche reste en place au-dessus pendant ce travail et le cache.
    window.requestAnimationFrame(function () {
      var easing = { duration: 260, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' };
      var animation = sheet.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(100%)' }], easing);
      dim.animate([{ opacity: 1 }, { opacity: 0 }], easing);
      animation.finished.then(finish, finish);
    });
    return true;
  };

  var closedAt = 0;
  var close = function () {
    token += 1;
    closedAt = Date.now();
    progress(false);
    removeSkeleton(saved ? false : 'slide');
    openY = null;
    if (!saved) return;
    closeOverlays();
    var sliding = slideOut();
    if (!sliding) removeProduct();
    saved.hidden.forEach(function (entry) { entry.node.style.cssText = entry.css; });
    document.body.className = saved.bodyClass;
    // Styles posés par la fiche (blocage du défilement d'une fenêtre restée ouverte, hauteur de son en-tête…) : ceux
    // de la page reviennent, sinon l'accueil pouvait rester bloqué (body overflow: hidden).
    document.body.style.cssText = saved.bodyStyle;
    root.style.cssText = saved.htmlStyle;
    document.title = saved.title;
    if (!sliding) addedSheets.forEach(function (entry) { entry.link.media = 'not all'; });
    reviewsRestore();
    var y = saved.y;
    var restoration = saved.restoration;
    saved = null;
    current = null;
    // Ancrage de défilement du navigateur coupé ~1 s : en réaffichant la page il « corrigeait » la position et
    // décalait l'écran d'une rangée de cartes.
    root.style.overflowAnchor = 'none';
    document.body.style.overflowAnchor = 'none';
    window.setTimeout(function () {
      root.style.overflowAnchor = '';
      document.body.style.overflowAnchor = '';
    }, 1200);
    jump(y);
    window.requestAnimationFrame(function () {
      if (Math.abs(window.scrollY - y) > 2) jump(y);
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
        y: openY !== null ? openY : window.scrollY,
        bodyClass: document.body.className,
        bodyStyle: document.body.style.cssText,
        htmlStyle: root.style.cssText,
        title: document.title,
        restoration: 'scrollRestoration' in window.history ? window.history.scrollRestoration : 'auto',
        hidden: []
      };
      Array.prototype.forEach.call(main.children, function (node) {
        if (FOOTER_GROUP.test(node.className || '')) return;
        saved.hidden.push({ node: node, css: node.style.cssText });
        hidePageSection(node);
      });
      if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
      openY = null;
    } else {
      removeProduct();
    }

    var anchor = Array.prototype.filter.call(main.children, function (node) { return FOOTER_GROUP.test(node.className || ''); })[0] || null;
    // Photo de départ de la galerie : celle de la carte touchée quand la fiche l'a (photo de la première variante
    // disponible, ex. la couleur verte), comme SHEIN — sinon la première. Chargée en priorité, et la photo de la carte
    // (déjà téléchargée) affichée dessous en attendant, pour ne pas montrer une zone vide.
    var fileOf = function (url) { return String(url || '').split('?')[0].split('/').pop(); };
    var slideList = productMain.querySelectorAll('[data-pdp-slides] > *');
    var startIndex = 0;
    if (cardImage) {
      var cardFile = fileOf(cardImage);
      Array.prototype.some.call(slideList, function (slide, i) {
        var img = slide.querySelector('img');
        if (img && fileOf(img.getAttribute('src')) === cardFile) { startIndex = i; return true; }
        return false;
      });
    }
    var startSlide = slideList[startIndex];
    if (startSlide) {
      var startImg = startSlide.querySelector('img');
      if (startImg) {
        startImg.setAttribute('loading', 'eager');
        startImg.setAttribute('fetchpriority', 'high');
      }
      if (cardImage) startSlide.style.background = '#fff url("' + cardImage.replace(/"/g, '%22') + '") center / contain no-repeat';
    }
    cardImage = '';
    sections.forEach(function (node) {
      var copy = document.importNode(node, true);
      mark(copy);
      main.insertBefore(copy, anchor);
      added.push(copy);
    });
    if (sticky) {
      var stickyCopy = document.importNode(sticky, true);
      mark(stickyCopy);
      pageRoot.insertBefore(stickyCopy, document.getElementById('quickshop'));
      added.push(stickyCopy);
    }
    document.body.className = doc.body.className;
    document.title = doc.title;
    current = bare(href);
    jump(0);
    // Galerie posée sur la photo de départ avant le premier affichage (pas de photo 1 puis saut), compteur compris ;
    // assets/pdp-mobile.js la garde ensuite (même variante).
    if (startIndex > 0) {
      added.some(function (node) {
        var track = node.querySelector && node.querySelector('[data-pdp-slides]');
        if (!track) return false;
        // Galerie pleine largeur : largeur de l'écran, sans lire la mise en page (un recalcul complet de la fiche).
        track.scrollLeft = startIndex * window.innerWidth;
        var count = node.querySelector('[data-pdp-count]');
        if (count) count.textContent = (startIndex + 1) + ' / ' + track.children.length;
        return true;
      });
    }
    // L'aperçu reste par-dessus jusqu'à la mise en forme par assets/pdp-mobile.js (galerie, options, badges déplacés,
    // textes traduits…) : sur téléphone la fiche se montrait d'abord brute, une à plusieurs secondes. 2,5 s au plus.
    var cover = skeleton;
    var reveal = function () {
      var node = cover;
      cover = null;
      if (node && skeleton === node) window.requestAnimationFrame(function () { if (skeleton === node) removeSkeleton(true); });
    };
    window.setTimeout(reveal, 2500);
    var scripts = headScripts.map(function (script) { return document.importNode(script, true); });
    // Moment où la fiche apparaît : la feuille « Vantaggi esclusivi » de assets/pdp-mobile.js s'ouvre 5 s après.
    window.msheinPdpShownAt = Date.now();
    reviewsBefore();
    return runScripts(added, scripts, reveal).then(function () {
      reveal();
      initTheme();
    });
  };

  // Aperçu immédiat, dès le toucher : photo, titre et prix de la carte touchée sur une page blanche (en-tête avec
  // flèche retour, blocs gris), comme SHEIN ; la vraie fiche le remplace dès qu'elle est prête.
  var skeleton = null;
  // mode true : la vraie fiche est en place dessous, l'aperçu s'efface en fondu (sans saut visible).
  // mode 'slide' : retour pendant l'aperçu, il repart vers la droite comme une fiche.
  var removeSkeleton = function (mode) {
    var node = skeleton;
    skeleton = null;
    if (!node || !node.parentNode) return;
    var panel = node.querySelector('[data-skeleton-panel]');
    if (mode === 'slide' && panel && typeof panel.animate === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      var easing = { duration: 260, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' };
      var done = function () { if (node.parentNode) node.parentNode.removeChild(node); };
      node.style.pointerEvents = 'none';
      panel.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(100%)' }], easing).finished.then(done, done);
      node.querySelector('[data-skeleton-dim]').animate([{ opacity: 1 }, { opacity: 0 }], easing);
      return;
    }
    if (!mode) { node.parentNode.removeChild(node); return; }
    node.style.transition = 'opacity .18s ease-out';
    node.style.opacity = '0';
    window.setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 200);
  };
  var esc = function (text) {
    return String(text || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  };
  var cardImage = '';
  var openY = null;
  // Fin du glissement de l'aperçu : une fiche déjà prête attend jusque-là (sinon elle sautait en place pendant le
  // glissement).
  var skeletonUntil = 0;
  var afterSlide = function (value) {
    // Fin relue à chaque fois : le glissement peut partir un peu plus tard que prévu (afterNextPaint).
    return new Promise(function (resolve) {
      var check = function () {
        var wait = skeletonUntil - Date.now();
        if (wait > 0) window.setTimeout(check, wait);
        else resolve(value);
      };
      check();
    });
  };
  // started : appelé quand le glissement de l'aperçu est lancé (tout de suite sans animation).
  var showSkeleton = function (link, started) {
    removeSkeleton();
    // Carte entière (le lien de la photo a lui-même « card » dans sa classe : on remonte au-dessus).
    var card = link && (link.closest('li') || link.closest('article') ||
      (link.parentElement && link.parentElement.closest('[class*="card"]')) || link);
    var img = card && card.querySelector('img');
    var src = img ? (img.currentSrc || img.src || '') : '';
    cardImage = src;
    // Nom du produit seul (le titre des cartes commence parfois par l'étiquette de marque « 🏬 Pokemon › »).
    var titleEl = card && (card.querySelector('[class*="title"] a[href*="/products/"], h3 a[href*="/products/"]') ||
      card.querySelector('[class*="title"], h2, h3'));
    var priceEl = card && card.querySelector('[class*="price"]:not([class*="old"]):not([class*="compare"])');
    var title = titleEl ? titleEl.textContent.replace(/\s+/g, ' ').trim() : '';
    var priceMatch = priceEl ? priceEl.textContent.replace(/\s+/g, ' ').match(/[€$£]\s?\d[\d.,]*|\d[\d.,]*\s?[€$£]/) : null;
    var price = priceMatch ? priceMatch[0] : '';
    var T = window.mobileT || function (key) { return key; };
    var grey = function (w, h, m) { return '<i style="display:block;width:' + w + ';height:' + h + 'px;margin:' + (m || '10px 14px 0') + ';border-radius:8px;background:#f0f1f5"></i>'; };
    var dot = '<i style="flex:none;width:34px;height:34px;border-radius:50%;background:#f0f1f5"></i>';
    var icon = function (path) {
      return '<span style="display:grid;place-items:center;width:30px;height:32px"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#16123f" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg></span>';
    };
    // Aperçu au design de la fiche (comme SHEIN) : en-tête (retour, recherche, panier, partager, ⋯), grande photo de la
    // carte, prix, nom, blocs gris, barre « Aggiungi al carrello » en bas. Il glisse depuis la droite en 0,28 s sur la
    // page qui s'assombrit ; la vraie fiche le remplace en fondu (removeSkeleton).
    skeleton = document.createElement('div');
    skeleton.className = 'pdp-swap-skeleton';
    skeleton.setAttribute('aria-hidden', 'true');
    skeleton.style.cssText = 'position:fixed;inset:0;z-index:2147480000;overflow:hidden;font-family:inherit';
    skeleton.innerHTML =
      '<div data-skeleton-dim style="position:absolute;inset:0;background:rgba(22,18,63,.18)"></div>' +
      '<div data-skeleton-panel style="position:absolute;inset:0;background:#fff;overflow:hidden;box-shadow:-8px 0 24px rgba(22,18,63,.12);will-change:transform">' +
        '<div style="display:flex;align-items:center;gap:2px;height:52px;padding:0 6px 0 4px;background:#fff">' +
          '<button type="button" data-skeleton-back aria-label="Indietro" style="all:unset;display:grid;place-items:center;width:36px;height:36px;cursor:pointer">' +
            '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#16123f" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg></button>' +
          '<span style="flex:1;min-width:0;display:flex;align-items:center;height:36px;padding:0 12px;border-radius:10px;background:#f4f5f9;color:#9a9db0;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(T('search_placeholder')) + '</span>' +
          icon('<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>') +
          icon('<path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>') +
          icon('<circle cx="5" cy="12" r="1.2" fill="#16123f"/><circle cx="12" cy="12" r="1.2" fill="#16123f"/><circle cx="19" cy="12" r="1.2" fill="#16123f"/>') +
        '</div>' +
        '<div style="aspect-ratio:1/1;width:100%;background:#f5f5f7 center/cover no-repeat' + (src ? ' url(&quot;' + esc(src) + '&quot;)' : '') + '"></div>' +
        (price ? '<div style="margin:14px 14px 0;font-family:Sora,inherit;font-size:26px;font-weight:800;letter-spacing:-.5px;color:#16123f">' + esc(price) + '</div>' : grey('40%', 26, '14px 14px 0')) +
        (title ? '<div style="margin:10px 14px 0;font-size:15px;font-weight:600;line-height:1.35;color:#16123f;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + esc(title) + '</div>' : grey('90%', 16)) +
        grey('35%', 14, '14px 14px 0') +
        '<div style="display:flex;gap:10px;margin:14px 14px 0">' + dot + dot + dot + dot + dot + '</div>' +
        grey('100%', 64, '16px 14px 0') +
        '<div style="position:absolute;left:0;right:0;bottom:0;display:flex;gap:10px;align-items:center;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:#fff;border-top:1px solid #ecebf3">' +
          '<span style="flex:none;display:grid;place-items:center;width:46px;height:46px;border-radius:50%;border:1.5px solid #ecebf3"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#16123f" stroke-width="1.9" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg></span>' +
          '<span style="flex:1;display:grid;place-items:center;height:50px;border-radius:12px;background:#16123f;color:#fff;font-family:Sora,inherit;font-size:15px;font-weight:800;letter-spacing:.5px;text-transform:uppercase">' + esc(T('pdp_add_to_cart')) + '</span>' +
        '</div>' +
      '</div>';
    // Retour : l'adresse du produit est déjà posée (cas normal) ou pas encore (toucher dans les premières ms).
    skeleton.querySelector('[data-skeleton-back]').addEventListener('click', goBack);
    document.body.appendChild(skeleton);
    // Glissement depuis la droite par l'API d'animation du navigateur (pas de lecture de mise en page forcée, qui
    // recalculait toute la page au toucher) ; aucun mouvement si le visiteur a demandé moins d'animations.
    skeletonUntil = 0;
    var panel = skeleton.querySelector('[data-skeleton-panel]');
    var dim = skeleton.querySelector('[data-skeleton-dim]');
    if (!motion()) { if (started) started(); return; }
    // Hors écran à droite au premier affichage, puis glissement lancé une fois cette image affichée (sinon un travail
    // lourd juste après le toucher mangeait le début du glissement). La fiche prête attend la fin (afterSlide).
    panel.style.transform = 'translateX(100%)';
    dim.style.opacity = '0';
    skeletonUntil = Date.now() + 400;
    var node = skeleton;
    afterNextPaint(function () {
      // Toujours appelé (adresse du produit), même si l'aperçu a déjà été remplacé ; son travail part au tour suivant.
      if (started) started();
      if (skeleton !== node) return;
      skeletonUntil = Date.now() + 280;
      var easing = { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' };
      panel.animate([{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }], easing);
      dim.animate([{ opacity: 0 }, { opacity: 1 }], easing);
    });
  };

  // Nouvelle étape d'historique pour la fiche, posée dès le toucher (l'aperçu est déjà « la fiche »).
  var pushProduct = function (href) {
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
    // pdpFrom : étape précédente = une autre fiche (produit recommandé) ; sinon la page d'origine (retour anticipé).
    window.history.pushState(Object.assign(base, { pdpSwap: href, pdpFrom: !!saved }), '', href);
  };

  // Retour par la flèche (fiche ou aperçu). Étape précédente = la page d'origine : elle est remise et la fiche glisse
  // dès ce toucher, puis l'adresse revient (history.back) — sans attendre l'événement « popstate », qui n'arrive
  // qu'après le travail des apps (enregistreurs, pixels) sur un téléphone.
  var backPending = false;
  var goBack = function () {
    var state = window.history.state;
    if (!state || !state.pdpSwap) { close(); return; }
    if (!state.pdpFrom) {
      close();
      backPending = true;
    }
    window.history.back();
  };

  var open = function (href, push, link) {
    var mine = (token += 1);
    // Barre de chargement seulement sans aperçu (retour / avance du navigateur) : l'aperçu couvre déjà l'écran, et sa
    // classe sur <html> faisait recalculer toute la page au toucher (~130 ms avant que l'aperçu bouge).
    if (!push) progress(true);
    if (push) {
      // Avant d'enregistrer la position : un panneau du header ouvert la bloque (et la remet en se fermant).
      closeOverlays();
      // Position de la page au toucher (sous l'aperçu, la page peut encore bouger avant l'arrivée de la fiche).
      if (!saved) openY = window.scrollY;
      // Adresse du produit posée une fois le glissement de l'aperçu lancé (il tourne alors sur le compositeur) : une app
      // (enregistreur de sessions) intercepte history.pushState et travaille à chaque appel (~110 ms), ce qui
      // retardait le départ du glissement à ~340 ms.
      showSkeleton(link, function () {
        window.setTimeout(function () { if (mine === token) pushProduct(href); }, 0);
      });
    }
    var backY = !push && window.history.state && window.history.state.pdpY;
    return fetchDoc(href)
      .then(function (doc) {
        if (mine !== token) return null;
        return loadStyles(doc).then(function () { return afterSlide(doc); });
      })
      .then(function (doc) {
        if (!doc || mine !== token) return;
        return show(doc, href).then(function () {
          if (mine !== token) return;
          progress(false);
          if (backY) jump(backY);
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
    // Fiche ouverte, ou fermée à l'instant (même retour) : la page est remise en place ici, les onglets de l'accueil
    // (assets/mobile-home-tabs.js) n'ont pas à refaire leur défilement / mesure.
    handlesBack: function () { return !!saved || backPending || Date.now() - closedAt < 100; },
    back: function () { goBack(); }
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
    if (url) fetchDoc(url.href).catch(function () {});
  }, { passive: true });

  // Préchargement, comme les onglets du header : les fiches des cartes restées visibles ~0,6 s sont demandées en
  // avance, une à la fois, quand le navigateur est libre (24 au plus par page ; jamais en mode économie de données
  // ni en 2G). Au toucher, la fiche est souvent déjà là.
  (function () {
    if (!('IntersectionObserver' in window)) return;
    var connection = navigator.connection || {};
    if (connection.saveData || /2g/.test(connection.effectiveType || '')) return;
    // Styles des fiches (liste retenue à la première fiche) téléchargés dès que la page est au repos : la première
    // fiche ouverte est mise en forme dès son apparition.
    if (cfg && cfg.head && mobile.matches) {
      (window.requestIdleCallback || function (fn) { return window.setTimeout(fn, 1500); })(function () {
        warmStyles(parse('<!doctype html><html><head>' + cfg.head + '</head><body></body></html>'));
      });
    }
    var queue = [];
    var seen = {};
    var budget = 24;
    var busy = false;
    var timers = new WeakMap();
    // 1 s au plus d'attente : sur téléphone les apps occupent le navigateur sans pause, et les fiches n'étaient
    // presque jamais préchargées (le toucher attendait alors le réseau derrière l'aperçu).
    var idle = window.requestIdleCallback
      ? function (fn) { return window.requestIdleCallback(fn, { timeout: 1000 }); }
      : function (fn) { return window.setTimeout(fn, 200); };
    var pump = function () {
      if (busy || !queue.length || budget <= 0 || saved || !mobile.matches) return;
      busy = true;
      budget -= 1;
      var href = queue.shift();
      idle(function () {
        fetchDoc(href).catch(function () {}).then(function () { busy = false; pump(); });
      });
    };
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = entry.target;
        if (entry.isIntersecting) {
          timers.set(link, window.setTimeout(function () {
            var key = bare(link.href);
            if (seen[key]) return;
            seen[key] = true;
            queue.push(link.href);
            pump();
          }, 600));
        } else if (timers.has(link)) {
          window.clearTimeout(timers.get(link));
          timers.delete(link);
        }
      });
    }, { threshold: 0.6 });
    var watched = new WeakSet();
    var watch = function () {
      if (!mobile.matches) return;
      main.querySelectorAll('a[href*="/products/"]').forEach(function (link) {
        if (watched.has(link) || !link.querySelector('img')) return;
        if (!isProduct(new URL(link.href, window.location.href))) return;
        watched.add(link);
        observer.observe(link);
      });
    };
    watch();
    var pending = null;
    new MutationObserver(function () {
      if (pending) return;
      pending = window.setTimeout(function () { pending = null; watch(); }, 500);
    }).observe(main, { childList: true, subtree: true });
  })();

  // Flèche retour de la fiche (lien vers l'accueil, snippets/pdp-mobile-top.liquid) : prise ici, avant
  // assets/pdp-mobile.js. Touchée avant que ce script ne démarre (téléphone lent), elle rechargeait tout l'accueil
  // (plusieurs secondes) au lieu de faire glisser la fiche sur la page d'origine.
  document.addEventListener('click', function (event) {
    var back = event.target.closest ? event.target.closest('[data-pdp-back]') : null;
    if (!back || !saved) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    goBack();
  }, true);

  document.addEventListener('click', function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var url = productLink(event);
    if (!url) return;
    event.preventDefault();
    if (bare(url.href) === current) return;
    open(url.href, true, event.target.closest('a[href]'));
  });

  // Retour / avance : l'adresse décide (le thème remplace l'état de l'étape au changement de variante).
  window.addEventListener('popstate', function () {
    // Retour déjà fait au toucher de la flèche (goBack) : l'adresse rattrape seulement.
    if (backPending) {
      window.setTimeout(function () { backPending = false; }, 0);
      return;
    }
    var url = new URL(window.location.href);
    if (isProduct(url)) {
      if (bare(url.href) !== current) open(url.href, false);
    } else {
      close();
    }
  });
})();
