/* Accueil ORDINATEUR au style SHEIN (sections/desktop-home-shein.liquid) : bannière (défilement, points, flèches),
   pages de catégories, fil à onglets (pages suivantes des modèles mshein-dept-page / mshein-sale, mêmes cartes que le
   mobile), cœur et panier des cartes. Rien sur mobile (≤ 760px) : la section y est cachée. */
(function () {
  'use strict';

  var root = document.querySelector('[data-dhs]');
  if (!root || window.matchMedia('(max-width: 760px)').matches) return;

  // Pleine largeur (assets/desktop-home-shein.css) : décalage du conteneur du thème et largeur sans la barre de défilement
  var setFullWidth = function () {
    root.style.setProperty('--dhs-x', root.parentElement.getBoundingClientRect().left + 'px');
    root.style.setProperty('--dhs-w', document.documentElement.clientWidth + 'px');
  };
  window.addEventListener('resize', setFullWidth);
  setFullWidth();

  // ---------- Bannière ----------
  var hero = root.querySelector('[data-dhs-hero]');
  if (hero) {
    var slides = [].slice.call(hero.querySelectorAll('.dhs-slide'));
    var dotsBox = hero.querySelector('[data-dhs-dots]');
    var current = 0;
    var timer = null;
    dotsBox.innerHTML = slides.map(function (slide, index) {
      return '<button type="button" aria-label="' + (index + 1) + ' / ' + slides.length + ' · ' + (slide.getAttribute('data-name') || '') + '"></button>';
    }).join('');
    var dots = [].slice.call(dotsBox.children);
    var go = function (index) {
      if (!slides.length) return;
      current = (index + slides.length) % slides.length;
      slides.forEach(function (slide, k) { slide.classList.toggle('is-on', k === current); slide.setAttribute('aria-hidden', String(k !== current)); slide.tabIndex = k === current ? 0 : -1; });
      dots.forEach(function (dot, k) { dot.classList.toggle('is-on', k === current); dot.setAttribute('aria-current', String(k === current)); });
      clearInterval(timer);
      timer = setInterval(function () { go(current + 1); }, 5000);
    };
    dots.forEach(function (dot, index) { dot.addEventListener('click', function () { go(index); }); });
    hero.querySelectorAll('.dhs-arw').forEach(function (button) {
      button.addEventListener('click', function () { go(current + Number(button.getAttribute('data-step'))); });
    });
    // Produits de la diapositive : leur fiche (pas la collection de la diapositive)
    hero.addEventListener('click', function (event) {
      var pick = event.target.closest('.dhs-slide__item');
      if (!pick) return;
      event.preventDefault();
      window.location.href = pick.getAttribute('data-href');
    });
    // Pause tant que la souris est sur la bannière
    hero.addEventListener('mouseenter', function () { clearInterval(timer); });
    hero.addEventListener('mouseleave', function () { go(current); });
    go(0);
  }

  // ---------- Catégories : une page de 24 par flèche ----------
  var track = root.querySelector('[data-dhs-sc]');
  if (track) {
    var arrows = root.querySelectorAll('.dhs-sc__arw');
    var paint = function () {
      arrows[0].disabled = track.scrollLeft < 4;
      arrows[1].disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 4;
    };
    arrows.forEach(function (button) {
      button.addEventListener('click', function () { track.scrollBy({ left: Number(button.getAttribute('data-step')) * track.clientWidth, behavior: 'smooth' }); });
    });
    track.addEventListener('scroll', paint, { passive: true });
    window.addEventListener('resize', paint);
    paint();
  }

  // ---------- Fil à onglets ----------
  var feed = root.querySelector('[data-dhs-feed]');
  if (feed) {
    var grid = feed.querySelector('[data-dhs-grid]');
    var tabs = [].slice.call(feed.querySelectorAll('[role="tab"]'));
    var moreText = feed.querySelector('[data-dhs-more-txt]');
    var moreBar = feed.querySelector('[data-dhs-more-bar]');
    var moreButton = feed.querySelector('[data-dhs-more-btn]');
    var seenTemplate = root.getAttribute('data-seen') || '__SHOWN__ / __TOTAL__'; // texte traduit (desktop_home.seen)
    // État de chaque onglet : cartes déjà chargées et adresse de la page suivante (gardés en changeant d'onglet).
    var state = tabs.map(function (tab, index) {
      return { cards: index === 0 ? grid.innerHTML : '', next: tab.getAttribute('data-src'), total: Number(tab.getAttribute('data-total')) || 0, loaded: index === 0, auto: 0 };
    });
    var active = 0;
    var loading = false;

    var paintMore = function () {
      var tabState = state[active];
      var shown = grid.querySelectorAll('.mshein-card').length;
      var total = Math.max(tabState.total, shown);
      // Total inconnu (« In offerta » sans collection : promotions lues dans tout le catalogue) : pas de « X di Y »
      var known = tabState.total > 0;
      moreText.textContent = known ? seenTemplate.replace('__SHOWN__', shown).replace('__TOTAL__', total) : '';
      moreBar.parentNode.hidden = !known;
      moreBar.style.width = known ? Math.min(100, shown / total * 100) + '%' : '0';
      moreButton.hidden = !tabState.next;
    };
    var decorate = function () {
      syncHearts(grid);
      if (window.msheinCards && typeof window.msheinCards.decorate === 'function') window.msheinCards.decorate(grid);
    };
    var load = function () {
      var tabState = state[active];
      if (loading || !tabState.next) return Promise.resolve();
      loading = true;
      moreButton.disabled = true;
      var forTab = active;
      return fetch(tabState.next, { credentials: 'same-origin' })
        .then(function (response) {
          if (!response.ok) throw new Error('Feed page request failed: ' + response.status);
          return response.text();
        })
        .then(function (html) {
          var page = new DOMParser().parseFromString(html, 'text/html');
          var next = page.querySelector('[data-mshein-next]');
          state[forTab].next = next ? next.getAttribute('data-mshein-next') : '';
          var cards = [].slice.call(page.querySelectorAll('.mshein-card')).map(function (card) { return card.outerHTML; }).join('');
          state[forTab].cards += cards;
          state[forTab].loaded = true;
          if (forTab === active) { grid.insertAdjacentHTML('beforeend', cards); decorate(); }
        })
        .catch(function (error) { console.error(error); })
        .then(function () { loading = false; moreButton.disabled = false; if (forTab === active) paintMore(); });
    };
    var showTab = function (index) {
      active = index;
      tabs.forEach(function (tab, k) { tab.classList.toggle('is-on', k === index); tab.setAttribute('aria-selected', String(k === index)); });
      grid.innerHTML = state[index].cards;
      decorate();
      paintMore();
      if (!state[index].loaded) {
        grid.classList.add('is-loading');
        load().then(function () { grid.classList.remove('is-loading'); });
      }
      var top = feed.getBoundingClientRect().top + window.scrollY - stickyTop() - 8;
      if (window.scrollY > top) window.scrollTo({ top: top });
    };
    tabs.forEach(function (tab, index) { tab.addEventListener('click', function () { if (index !== active) showTab(index); }); });
    moreButton.addEventListener('click', load);
    // Deux chargements automatiques en descendant, puis le bouton « Mostra altro » (comme le prototype)
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting && state[active].auto < 2 && state[active].next && !loading) {
          state[active].auto += 1;
          load();
        }
      }, { rootMargin: '500px' }).observe(feed.querySelector('[data-dhs-more]'));
    }
    // Onglets collés sous l'en-tête du site (hauteur réelle de l'en-tête collant)
    // Onglets collés sous l'en-tête ordinateur (snippets/desktop-header.liquid, collé en haut sans son bandeau d'annonces)
    var stickyTop = function () {
      var header = document.querySelector('[data-dh]');
      return header ? header.offsetHeight : 0;
    };
    var setSticky = function () { root.style.setProperty('--dhs-sticky', stickyTop() + 'px'); };
    window.addEventListener('resize', setSticky);
    setSticky();
    paintMore();
  }

  // ---------- Cartes : cœur (wishlist du site) et panier (fiche produit) ----------
  var syncHearts = function (scope) {
    if (!window.mobileWishlist || typeof window.mobileWishlist.has !== 'function') return;
    scope.querySelectorAll('.mshein-card__fav[data-product-id]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(Boolean(window.mobileWishlist.has(button.getAttribute('data-product-id')))));
    });
  };
  root.addEventListener('click', function (event) {
    var card = event.target.closest('.mshein-card');
    if (!card) return;
    var link = card.querySelector('.mshein-card__title a, a.mshein-card__link');
    var heart = event.target.closest('.mshein-card__fav');
    if (heart) {
      event.preventDefault();
      event.stopPropagation();
      if (!window.mobileWishlist || typeof window.mobileWishlist.toggle !== 'function') return;
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
      return;
    }
    var add = event.target.closest('.mshein-card__add');
    if (add && link) {
      // Fenêtre « Aggiungi al carrello » du site, la même qu'en mobile (assets/mobile-quick-add.js) ; sinon la fiche produit
      event.preventDefault();
      var api = window.mobileQuickAdd;
      if (!api || typeof api.openCard !== 'function' || !api.openCard(add, { desktop: true })) window.location.href = link.getAttribute('href');
    }
  });
  var toastBox = null;
  var toastTimer = null;
  var toast = function (text) {
    if (!text) return;
    if (!toastBox) {
      toastBox = document.createElement('div');
      toastBox.className = 'dhs-toast';
      toastBox.setAttribute('role', 'status');
      root.appendChild(toastBox);
    }
    toastBox.textContent = text;
    toastBox.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastBox.classList.remove('is-on'); }, 1800);
  };
  syncHearts(root);
})();
