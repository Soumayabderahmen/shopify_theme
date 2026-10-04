/* Page collection MOBILE (prototype « platinumshop-collection-mobile ») — snippets/collection-mobile-head.liquid,
   assets/collection-mobile.css. Feuilles Filtri / Ordina, bascule 2 colonnes / 1 colonne, ligne « Mostrando N di T »
   (suit le chargement automatique des produits, assets/mobile-auto-load.js). Filtres et tri : nouvelle page Shopify.
   Textes : window.mobileT (snippets/mobile-i18n.liquid). */
(function () {
  'use strict';

  if (!window.matchMedia('(max-width: 760px)').matches) return;
  var head = document.querySelector('[data-collection-mobile]');
  if (!head) return;

  var T = window.mobileT || function (key) { return key; };
  var VIEW_KEY = 'clm_view';
  var total = Number(head.getAttribute('data-total')) || 0;

  /* ---------- Feuilles : placées dans <body> pour passer au-dessus de la barre du bas ---------- */
  var layer = document.createElement('div');
  layer.className = 'clm clm-layer';
  head.querySelectorAll('[data-clm-sheet], [data-clm-scrim]').forEach(function (element) { layer.appendChild(element); });
  document.body.appendChild(layer);
  var scrim = layer.querySelector('[data-clm-scrim]');
  var openSheet = null;
  var opener = null;

  var open = function (name, trigger) {
    var sheet = layer.querySelector('[data-clm-sheet="' + name + '"]');
    if (!sheet) return;
    if (openSheet) close(false);
    openSheet = sheet;
    opener = trigger || null;
    scrim.hidden = false;
    document.body.classList.add('clm-lock');
    window.requestAnimationFrame(function () {
      scrim.classList.add('is-on');
      sheet.classList.add('is-on');
    });
    sheet.setAttribute('aria-hidden', 'false');
    var first = sheet.querySelector('[data-clm-close]');
    if (first) window.setTimeout(function () { first.focus({ preventScroll: true }); }, 360);
  };

  var close = function (restoreFocus) {
    if (!openSheet) return;
    openSheet.classList.remove('is-on');
    openSheet.setAttribute('aria-hidden', 'true');
    scrim.classList.remove('is-on');
    document.body.classList.remove('clm-lock');
    openSheet = null;
    window.setTimeout(function () { if (!openSheet) scrim.hidden = true; }, 320);
    if (restoreFocus !== false && opener) opener.focus({ preventScroll: true });
  };

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('[data-clm-open]');
    if (trigger && head.contains(trigger)) {
      open(trigger.getAttribute('data-clm-open'), trigger);
      return;
    }
    if (!layer.contains(event.target)) return;
    if (event.target === scrim || event.target.closest('[data-clm-close]')) {
      close();
      return;
    }

    // Tri : nouvelle page avec sort_by (filtres gardés, retour à la page 1).
    var sort = event.target.closest('[data-clm-sort]');
    if (sort) {
      var url = new URL(window.location.href);
      url.searchParams.set('sort_by', sort.getAttribute('data-clm-sort'));
      url.searchParams.delete('page');
      layer.querySelectorAll('[data-clm-sort]').forEach(function (button) {
        button.setAttribute('aria-checked', button === sort ? 'true' : 'false');
      });
      window.location.href = url.pathname + url.search;
      return;
    }

    // Puces de prix : remplissent les champs min / max.
    var range = event.target.closest('[data-clm-range-min]');
    if (range) {
      var form = range.closest('form');
      var pressed = range.getAttribute('aria-pressed') === 'true';
      form.querySelectorAll('[data-clm-range-min]').forEach(function (button) { button.setAttribute('aria-pressed', 'false'); });
      form.querySelector('[data-clm-min]').value = pressed ? '' : range.getAttribute('data-clm-range-min');
      form.querySelector('[data-clm-max]').value = pressed ? '' : range.getAttribute('data-clm-range-max');
      range.setAttribute('aria-pressed', pressed ? 'false' : 'true');
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && openSheet) close();
  });

  // Filtres : les champs de prix vides ne partent pas dans l'adresse.
  var filterForm = layer.querySelector('[data-clm-filter-form]');
  if (filterForm) {
    filterForm.addEventListener('submit', function () {
      filterForm.querySelectorAll('input[type="number"]').forEach(function (input) {
        if (input.value === '') input.disabled = true;
      });
    });
  }

  /* ---------- Bascule 2 colonnes / 1 colonne (mémorisée sur cet appareil) ---------- */
  var grid = document.getElementById('collection');
  var setView = function (columns, save) {
    if (grid) grid.classList.toggle('clm-one', columns === 1);
    head.querySelectorAll('[data-clm-view]').forEach(function (button) {
      button.setAttribute('aria-pressed', Number(button.getAttribute('data-clm-view')) === columns ? 'true' : 'false');
    });
    if (save) {
      try { window.localStorage.setItem(VIEW_KEY, String(columns)); } catch (error) { /* stockage indisponible */ }
    }
  };
  head.addEventListener('click', function (event) {
    var button = event.target.closest('[data-clm-view]');
    if (button) setView(Number(button.getAttribute('data-clm-view')), true);
  });
  var savedView = 2;
  try { savedView = Number(window.localStorage.getItem(VIEW_KEY)) || 2; } catch (error) { savedView = 2; }
  setView(savedView, false);

  /* ---------- « Mostrando N di T prodotti » : suit les produits ajoutés pendant le défilement ---------- */
  var results = head.querySelector('[data-clm-results]');
  var updateResults = function () {
    var currentGrid = document.getElementById('collection');
    if (!results || !currentGrid || !total) return;
    var shown = currentGrid.querySelectorAll(':scope > li').length;
    var html = T('collection_results_html', { count: shown.toLocaleString(document.documentElement.lang || 'it'), total: total.toLocaleString(document.documentElement.lang || 'it') });
    if (results.innerHTML !== html) results.innerHTML = html;
    results.hidden = shown === 0;
    if (currentGrid !== grid) {
      grid = currentGrid;
      setView(savedView, false);
    }
  };
  updateResults();
  if (grid && 'MutationObserver' in window) {
    new MutationObserver(updateResults).observe(grid, { childList: true });
  }

  /* ---------- Barre d'outils collante : ombre quand elle est collée en haut ---------- */
  var toolbar = head.querySelector('[data-clm-toolbar]');
  var ticking = false;
  var checkStuck = function () {
    ticking = false;
    if (!toolbar) return;
    var top = parseFloat(window.getComputedStyle(toolbar).top) || 0;
    toolbar.classList.toggle('is-stuck', toolbar.getBoundingClientRect().top <= top + 1 && window.scrollY > 0);
  };
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(checkStuck);
  }, { passive: true });
})();
