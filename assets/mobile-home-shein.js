/* Page d'accueil MOBILE au style SHEIN (sections/mobile-home-shein.liquid, snippets/mshein-card.liquid).
   - bannière sous l'en-tête transparent : hauteur de l'en-tête et image floutée de la diapositive affichée ;
   - apparition des cartes / modules / tuiles au défilement ;
   - fil « Per te » : 2 colonnes décalées, onglets, pages suivantes chargées au défilement (3 points du site) ;
   - cartes : cœur, nom de la marque et toucher sur toute la carte dans assets/mshein-card.js (commun au site).
   Mobile uniquement (≤ 760px). */
(function () {
  'use strict';

  if (window.msheinHomeInit) return;
  window.msheinHomeInit = true;
  var mobile = window.matchMedia('(max-width: 760px)');
  if (!mobile.matches) return;
  document.documentElement.classList.add('mshein-js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- En-tête posé sur la bannière ---------- */
  var headerSection = document.querySelector('[id$="__header"].shopify-section');
  var hero = document.querySelector('[data-mshein-hero]');
  var heroSection = hero && hero.closest('.shopify-section');

  var syncHeaderHeight = function () {
    if (!headerSection) return;
    var height = Math.round(headerSection.getBoundingClientRect().height);
    if (height > 0) document.documentElement.style.setProperty('--mshein-header-h', height + 'px');
  };
  syncHeaderHeight();
  window.addEventListener('resize', syncHeaderHeight);
  window.addEventListener('load', syncHeaderHeight);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncHeaderHeight);

  // Image floutée derrière l'en-tête : celle de la diapositive affichée (les diapositives vidéo gardent la précédente).
  if (heroSection) {
    var currentBackground = '';
    var syncHeroBackground = function () {
      var active = hero.querySelector('.swiper-slide-active') || hero.querySelector('article');
      // Image de la bannière elle-même (pas celles des 2 produits posés dessus).
      var image = active && (active.querySelector('figure > picture.mobile-only img') || active.querySelector('figure > picture img, figure > img'));
      var source = image && (image.currentSrc || image.src);
      if (!source || source === currentBackground) return;
      currentBackground = source;
      heroSection.style.setProperty('--mshein-hero-bg', 'url("' + source.replace(/"/g, '%22') + '")');
    };
    new MutationObserver(syncHeroBackground).observe(hero, { subtree: true, attributes: true, attributeFilter: ['class'] });
    hero.addEventListener('load', syncHeroBackground, true);
    syncHeroBackground();
  }

  // En-tête fixé : transparent sur la bannière, blanc dès que la bannière passe sous lui.
  if (headerSection) {
    var syncSolid = function () {
      var solid = !heroSection || heroSection.getBoundingClientRect().bottom < headerSection.offsetHeight + 10;
      headerSection.classList.toggle('mshein-solid', solid);
    };
    window.addEventListener('scroll', syncSolid, { passive: true });
    window.addEventListener('resize', syncSolid);
    syncSolid();
  }

  // Recherche : texte qui défile avec les vraies « Di tendenza » des réglages du header (même liste que la recherche).
  var searchBox = document.querySelector('.mobile-temu-header .mobile-temu-search');
  var trendsScript = document.querySelector('[data-mobile-search-trends]');
  var trendWords = [];
  try {
    trendWords = trendsScript ? JSON.parse(trendsScript.textContent) || [] : [];
  } catch (error) {
    console.error('Unable to read the search trends.', error);
  }
  trendWords = trendWords.map(function (word) {
    var text = String(word).trim();
    return text.charAt(0).toUpperCase() + text.slice(1);
  }).filter(Boolean);
  if (searchBox && trendWords.length) {
    // Première tendance déjà écrite par sections/header.liquid ; sinon créée ici.
    var placeholder = searchBox.querySelector('[data-mshein-search-ph]');
    if (!placeholder) {
      placeholder = document.createElement('span');
      placeholder.className = 'mshein-search-ph';
      placeholder.setAttribute('aria-hidden', 'true');
      placeholder.appendChild(document.createElement('span'));
      searchBox.appendChild(placeholder);
    }
    var placeholderText = placeholder.firstElementChild;
    placeholderText.textContent = trendWords[0];
    if (!reduceMotion && trendWords.length > 1) {
      var wordIndex = 0;
      window.setInterval(function () {
        if (document.hidden) return;
        placeholderText.style.transform = 'translateY(-20px)';
        window.setTimeout(function () {
          wordIndex = (wordIndex + 1) % trendWords.length;
          placeholderText.textContent = trendWords[wordIndex];
          placeholderText.style.transition = 'none';
          placeholderText.style.transform = 'translateY(20px)';
          void placeholderText.offsetWidth;
          placeholderText.style.transition = '';
          placeholderText.style.transform = '';
        }, 450);
      }, 2600);
    }
  }

  /* ---------- Apparition au défilement ---------- */
  var revealObserver = !reduceMotion && 'IntersectionObserver' in window
    ? new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var element = entry.target;
        // Colonne de droite du fil un peu après celle de gauche (cascade).
        if (element.parentNode && element.parentNode.getAttribute('data-mshein-col') === '1') {
          element.style.transitionDelay = '90ms';
        }
        element.classList.add('is-in');
        revealObserver.unobserve(element);
      });
    }, { rootMargin: '0px 0px -40px 0px', threshold: 0.08 })
    : null;
  var watchReveal = function (root) {
    root.querySelectorAll('.reveal:not(.is-in)').forEach(function (element) {
      if (revealObserver) revealObserver.observe(element);
      else element.classList.add('is-in');
    });
  };
  // Tuiles de catégories : apparition en CSS seul (assets/mobile-home-shein.css), prête dès le premier affichage.
  watchReveal(document);

  /* ---------- Fil « Per te » ---------- */
  var feed = document.querySelector('[data-mshein-feed]');
  if (!feed) return;
  var grid = feed.querySelector('[data-mshein-grid]');
  var tabs = feed.querySelector('[data-mshein-tabs]');
  var loader = feed.querySelector('[data-mshein-loader]');
  var sentinel = feed.querySelector('[data-mshein-sentinel]');

  // 2 colonnes décalées : chaque carte va dans la colonne la moins haute.
  var columnsWrap = document.createElement('div');
  columnsWrap.className = 'mshein-feed__grid';
  var columns = [0, 1].map(function (index) {
    var column = document.createElement('ul');
    column.className = 'mshein-feed__col';
    column.setAttribute('data-mshein-col', String(index));
    columnsWrap.appendChild(column);
    return column;
  });
  // Cœur, nom de la marque et toucher sur toute la carte : assets/mshein-card.js (commun à toutes les cartes).
  var addCards = function (cards) {
    Array.prototype.forEach.call(cards, function (card) {
      var target = columns[0].offsetHeight <= columns[1].offsetHeight ? columns[0] : columns[1];
      target.appendChild(card);
    });
    if (window.msheinCards) window.msheinCards.decorate(columnsWrap);
    watchReveal(columnsWrap);
  };

  // Cartes écrites dans la page (10 premiers « Più venduti ») vers les colonnes.
  var firstCards = Array.prototype.slice.call(grid.children);
  grid.replaceWith(columnsWrap);
  addCards(firstCards);

  // Pages suivantes : adresse de l'onglet, puis lien « page suivante » de chaque page ; plusieurs collections à la suite
  // (Brand ufficiali : Nike, puis Adidas…).
  var queue = [];
  var nextUrl = null;
  var busy = false;
  var token = 0;
  var startSource = function (source) {
    queue = String(source || '').split(/\s+/).filter(Boolean);
    nextUrl = queue.shift() || null;
  };
  var activeTab = tabs && tabs.querySelector('.is-on');
  startSource(activeTab && activeTab.getAttribute('data-src'));

  var showLoader = function (show) {
    if (loader) loader.hidden = !show;
  };
  var loadMore = function () {
    if (busy || !nextUrl) return;
    busy = true;
    showLoader(true);
    var requestToken = token;
    var url = nextUrl;
    fetch(url, { credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) throw new Error('Feed page request failed: ' + response.status);
        return response.text();
      })
      .then(function (html) {
        if (requestToken !== token) return;
        var page = new DOMParser().parseFromString(html, 'text/html').querySelector('[data-mshein-page]');
        if (!page) throw new Error('Feed page markup missing');
        var next = page.querySelector('[data-mshein-next]');
        nextUrl = next ? next.getAttribute('data-mshein-next') : (queue.shift() || null);
        addCards(page.querySelectorAll(':scope > li.mshein-card'));
        busy = false;
        showLoader(false);
        // Page sans carte (ex. « In offerta » : aucune promo sur ces produits) ou fin d'écran pas atteinte : suite tout de suite.
        if (nextUrl && sentinel && sentinel.getBoundingClientRect().top < window.innerHeight + 900) loadMore();
      })
      .catch(function (error) {
        console.error('Unable to load the next feed page.', error);
        if (requestToken !== token) return;
        busy = false;
        showLoader(false);
      });
  };

  if (sentinel && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) loadMore();
    }, { rootMargin: '900px 0px' }).observe(sentinel);
  }

  if (tabs) {
    tabs.addEventListener('click', function (event) {
      var tab = event.target.closest('button[data-src]');
      if (!tab || tab.classList.contains('is-on')) return;
      tabs.querySelectorAll('button[data-src]').forEach(function (button) {
        var selected = button === tab;
        button.classList.toggle('is-on', selected);
        button.setAttribute('aria-selected', String(selected));
      });
      token += 1;
      busy = false;
      columns.forEach(function (column) { column.replaceChildren(); });
      startSource(tab.getAttribute('data-src'));
      // Haut du fil sous les onglets (si on était plus bas).
      var top = feed.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(tabs).top) || 0);
      if (window.scrollY > top) window.scrollTo({ top: top });
      loadMore();
    });
  }

  /* ---------- Onglets collés sous l'en-tête fixé ---------- */
  var syncTabsTop = function () {
    var fixed = headerSection && getComputedStyle(headerSection).position === 'fixed';
    feed.style.setProperty('--mshein-tabs-top', (fixed ? headerSection.offsetHeight : 0) + 'px');
  };
  window.addEventListener('resize', syncTabsTop);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncTabsTop);
  syncTabsTop();
})();
