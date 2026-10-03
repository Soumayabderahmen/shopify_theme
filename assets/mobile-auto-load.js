/* Pages catégorie et recherche, mobile uniquement : les produits suivants arrivent tout seuls pendant le défilement.
   - Vers ~1500 px du bas de la liste, la page suivante est préparée en fond (Section Rendering API :
     seule la section des produits est demandée, pas toute la page avec header et footer).
   - Vers ~500 px du bas, les produits sont ajoutés à la grille (#collection), comme le bouton
     « Mostra altri » du thème (assets/page-collection.js), puis les mêmes scripts du thème sont relancés.
   - Déclencheurs : bouton « Mostra altri » (#load-more-button[data-next], catégories) et lien « Next »
     de la pagination numérotée (.n6pg li.next a, recherche).
   Desktop inchangé : le script s'arrête au-delà de 760 px. */
(function () {
  'use strict';

  if (!window.matchMedia('(max-width: 760px)').matches || !('IntersectionObserver' in window)) return;

  var TRIGGERS = '#load-more-button[data-next], .n6pg li.next a[href]';
  var requests = {};

  function sectionOf(trigger) {
    return trigger.closest('[id^="shopify-section-"]');
  }

  // Une seule requête par page suivante : préparée en fond, réutilisée à l'ajout.
  function request(href, section) {
    if (!requests[href]) {
      var url = new URL(href, window.location.href);
      url.searchParams.set('section_id', section.id.replace('shopify-section-', ''));
      requests[href] = fetch(url.toString(), { credentials: 'same-origin' }).then(function (response) {
        if (!response.ok) throw new Error('Mobile auto load: ' + response.status);
        return response.text();
      });
      requests[href].catch(function () { delete requests[href]; });
    }
    return requests[href];
  }

  // Mêmes relances que le bouton du thème après l'ajout de produits.
  function refreshTheme() {
    ['semanticInput', 'collectionLoadMore', 'listScrollable', 'productVariants', 'semanticSelect', 'check-limit-event'].forEach(function (name) {
      window.dispatchEvent(new CustomEvent(name));
    });
    if (window.ajaxCart && typeof window.ajaxCart.init === 'function') window.ajaxCart.init();
    if (window.quickShop && typeof window.quickShop.init === 'function') window.quickShop.init();
    window.setTimeout(function () {
      ['ratings', 'schemeTooltip', 'popups', 'formZindex'].forEach(function (name) {
        window.dispatchEvent(new CustomEvent(name));
      });
    }, 0);
  }

  function append(trigger) {
    var section = sectionOf(trigger);
    var grid = section && section.querySelector('#collection');
    if (!grid || trigger.dataset.autoLoading === 'true') return;
    var href = trigger.getAttribute('href');
    var button = trigger.id === 'load-more-button' ? trigger : null;
    trigger.dataset.autoLoading = 'true';
    if (button) button.classList.add('loading');

    request(href, section).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var newGrid = doc.querySelector('#collection');
      if (!newGrid) throw new Error('Mobile auto load: product grid missing');
      var fragment = document.createDocumentFragment();
      while (newGrid.firstElementChild) fragment.appendChild(newGrid.firstElementChild);
      grid.appendChild(fragment);

      if (button) {
        var info = document.getElementById('load-more-info');
        var newInfo = doc.getElementById('load-more-info');
        if (info && newInfo) info.replaceWith(newInfo);
        var newButton = doc.querySelector('#load-more-button[data-next], #load-more-button[data-top]');
        if (newButton) button.replaceWith(newButton); else button.remove();
      } else {
        var nav = trigger.closest('.n6pg');
        var newNav = doc.querySelector('.n6pg');
        if (nav && newNav) nav.replaceWith(newNav); else if (nav) nav.remove();
      }

      window.history.replaceState(window.history.state, '', href);
      if (typeof window.saveLoadMoreAnchor === 'function') window.saveLoadMoreAnchor();
      refreshTheme();
      scan();
    }).catch(function (error) {
      console.warn(error);
      trigger.dataset.autoLoading = 'false';
      if (button) button.classList.remove('loading');
    });
  }

  var prepareObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      prepareObserver.unobserve(entry.target);
      var section = sectionOf(entry.target);
      if (section) request(entry.target.getAttribute('href'), section).catch(function () {});
    });
  }, { rootMargin: '0px 0px 1500px 0px' });

  var appendObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      appendObserver.unobserve(entry.target);
      append(entry.target);
    });
  }, { rootMargin: '0px 0px 500px 0px' });

  function scan() {
    Array.prototype.forEach.call(document.querySelectorAll(TRIGGERS), function (trigger) {
      if (trigger.dataset.autoLoadBound === 'true') return;
      var section = sectionOf(trigger);
      if (!section || !section.querySelector('#collection')) return;
      trigger.dataset.autoLoadBound = 'true';
      prepareObserver.observe(trigger);
      appendObserver.observe(trigger);
    });
  }

  // Toucher le bouton ou « Next » : même chemin (page déjà préparée), sans recharger la page
  // ni lancer en double la requête du thème.
  document.addEventListener('click', function (event) {
    var trigger = event.target.closest && event.target.closest(TRIGGERS);
    if (!trigger || trigger.dataset.autoLoadBound !== 'true') return;
    event.preventDefault();
    event.stopPropagation();
    append(trigger);
  }, true);

  // Filtres et tri : le thème remplace la grille et la pagination, on relie les nouveaux déclencheurs.
  var rescanTimer = null;
  new MutationObserver(function () {
    window.clearTimeout(rescanTimer);
    rescanTimer = window.setTimeout(scan, 200);
  }).observe(document.body, { childList: true, subtree: true });

  scan();
})();
