/* En-tête ORDINATEUR au style SHEIN (snippets/desktop-header.liquid) : bandeau d'annonces, suggestions de recherche,
   compteurs wishlist / panier, pays et langue, fenêtre du compte, méga-menu
   « Categorie » rempli avec le panneau Categoria mobile (/?section_id=mobile-category-panel, chargé une fois).
   Rien sur mobile (≤ 760px). */
(function () {
  'use strict';

  var top = document.querySelector('[data-dh-top]');
  var header = top && top.querySelector('[data-dh]');
  if (!header || window.matchMedia('(max-width: 760px)').matches) return;

  // ---------- Bandeau d'annonces : seconde copie pour une boucle sans saut ----------
  var annTrack = top.querySelector('[data-dh-ann]');
  if (annTrack && annTrack.firstElementChild) {
    var annCopy = annTrack.firstElementChild.cloneNode(true);
    annCopy.setAttribute('aria-hidden', 'true');
    annTrack.appendChild(annCopy);
  }

  // ---------- Recherche : « ricerche di tendenza » qui défilent dans le champ ----------
  var search = header.querySelector('[data-dh-search]');
  var placeholder = header.querySelector('[data-dh-ph]');
  if (search) {
    var input = search.querySelector('input[type="search"]');
    var paintText = function () { search.classList.toggle('has-text', Boolean(input.value)); };
    input.addEventListener('input', paintText);
    paintText();
    var trends = (search.getAttribute('data-trends') || '').split('|').map(function (text) { return text.trim(); }).filter(Boolean)
      .map(function (text) { return text.charAt(0).toUpperCase() + text.slice(1); });
    if (placeholder && trends.length > 1) {
      var trendIndex = 0;
      setInterval(function () {
        placeholder.style.transform = 'translateY(-22px)';
        placeholder.style.opacity = '0';
        setTimeout(function () {
          trendIndex = (trendIndex + 1) % trends.length;
          placeholder.textContent = trends[trendIndex];
          placeholder.style.transition = 'none';
          placeholder.style.transform = 'translateY(22px)';
          requestAnimationFrame(function () {
            placeholder.style.transition = '';
            placeholder.style.transform = '';
            placeholder.style.opacity = '1';
          });
        }, 450);
      }, 2600);
    }
  }

  // ---------- Hauteur de l'en-tête (barres collées dessous) et état au défilement ----------
  var mega = header.querySelector('[data-dh-mega]');
  var top = header.closest('[data-dh-top]');
  var setHeight = function () {
    document.documentElement.style.setProperty('--dh-h', header.offsetHeight + 'px');
    // Pleine largeur malgré les marges du conteneur du thème (assets/desktop-header.css)
    top.style.setProperty('--dh-x', top.parentElement.getBoundingClientRect().left + parseFloat(getComputedStyle(top.parentElement).paddingLeft) + 'px');
    document.documentElement.style.setProperty('--dh-vw', document.documentElement.clientWidth + 'px'); // aussi pour le footer (assets/desktop-footer.css)
  };
  var paint = function () {
    header.classList.toggle('is-stuck', window.scrollY > 40);
  };
  window.addEventListener('scroll', paint, { passive: true });
  window.addEventListener('resize', setHeight);
  setHeight();
  paint();

  // ---------- Compteurs : wishlist du site (platinumshop:wishlist:v1) et panier ----------
  var wishlistBadge = header.querySelector('[data-dh-wl]');
  var paintWishlist = function () {
    if (!wishlistBadge) return;
    var count = 0;
    try {
      var items = JSON.parse(window.localStorage.getItem('platinumshop:wishlist:v1') || '[]');
      count = Array.isArray(items) ? items.length : 0;
    } catch (error) { count = 0; }
    wishlistBadge.textContent = String(count);
    wishlistBadge.classList.toggle('is-on', count > 0);
  };
  paintWishlist();
  window.addEventListener('storage', paintWishlist);
  // Cœurs des cartes : la liste change au clic (même onglet, pas d'événement « storage »)
  document.addEventListener('click', function () { setTimeout(paintWishlist, 60); }, true);
  var cartBadge = header.querySelector('[data-dh-cart]');
  if (cartBadge) {
    // Le compteur est mis à jour par les scripts du panier (classe mobile-home-cart-count) : pastille visible si > 0
    var paintCart = function () { cartBadge.classList.toggle('is-on', (parseInt(cartBadge.textContent, 10) || 0) > 0); cartBadge.hidden = false; };
    new MutationObserver(paintCart).observe(cartBadge, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
    paintCart();
  }

  // ---------- « Accedi » : fenêtre du compte Shopify (<shopify-account>) ouverte au survol, comme au clic ----------
  var account = header.querySelector('[data-dh-account]');
  if (account) {
    var accountTimer = null;
    account.addEventListener('mouseenter', function () {
      clearTimeout(accountTimer);
      accountTimer = setTimeout(function () {
        if (typeof account.showModal === 'function') account.showModal();
      }, 150);
    });
    account.addEventListener('mouseleave', function () { clearTimeout(accountTimer); });
  }

  // ---------- Pays et langue ----------
  var loc = header.querySelector('[data-dh-loc]');
  if (loc) {
    var locButton = loc.querySelector('[data-dh-loc-btn]');
    var locPanel = loc.querySelector('.dh-loc__panel');
    var setLoc = function (open) { locPanel.hidden = !open; locButton.setAttribute('aria-expanded', String(open)); };
    locButton.addEventListener('click', function (event) { event.stopPropagation(); setLoc(locPanel.hidden); });
    locPanel.addEventListener('click', function (event) { event.stopPropagation(); });
    locPanel.querySelectorAll('[data-dh-autosubmit]').forEach(function (select) {
      select.addEventListener('change', function () { select.form.submit(); });
    });
    document.addEventListener('click', function () { setLoc(false); });
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape') setLoc(false); });
  }

  // ---------- Méga-menu « Categorie » ----------
  if (!mega) return;
  var mm = mega.querySelector('[data-dh-mm]');
  var main = mega.querySelector('[data-dh-main]');
  var megaButton = header.querySelector('[data-dh-mega-btn]');
  var tabs = [].slice.call(header.querySelectorAll('.dh-tab'));
  var tops = [].slice.call(mm.querySelectorAll('.mm__top'));
  var timer = null;
  var panels = null; // poignée de collection → panneau Categoria mobile
  var request = null;
  var productCache = {};
  var currentKey = '';
  var viewAllIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><circle cx="16.75" cy="16.75" r="3.25"/></svg>';
  var escapeHtml = function (text) { return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var handleOf = function (url) { var match = String(url || '').match(/\/collections\/([^/?#]+)/); return match ? match[1] : ''; };

  var loadPanels = function () {
    if (request) return request;
    request = fetch(mega.getAttribute('data-src'), { credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) throw new Error('Category panel request failed: ' + response.status);
        return response.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        panels = {};
        doc.querySelectorAll('.mobile-category-browser__panel[data-category-products-endpoint]').forEach(function (panel) {
          var handle = handleOf(panel.getAttribute('data-category-products-endpoint'));
          if (handle && !panels[handle]) panels[handle] = panel;
        });
        // « Tutti i Prodotti » : panneau « In evidenza » du mobile
        var featured = doc.getElementById('mobile-category-panel-featured');
        if (featured) panels.all = featured;
        return panels;
      })
      .catch(function (error) { console.error(error); panels = {}; return panels; });
    return request;
  };

  var cardOf = function (card) {
    var image = card.querySelector('img');
    var title = card.querySelector('.mobile-category-card__title');
    return {
      url: card.getAttribute('href') || '#',
      img: image ? (image.getAttribute('data-src') || image.getAttribute('src') || '') : '',
      title: title ? title.textContent.trim() : card.textContent.trim()
    };
  };
  var tileHtml = function (card, brand) {
    return '<a class="mm__tile' + (brand ? ' mm__tile--brand' : '') + '" href="' + escapeHtml(card.url) + '"><span class="mm__img">' +
      (card.img ? '<img src="' + escapeHtml(card.img) + '" alt="" loading="lazy">' : '') + '</span><span class="mm__t">' + escapeHtml(card.title) + '</span></a>';
  };
  var sectionHtml = function (title, allUrl, cards, brand) {
    if (!cards.length && !allUrl) return '';
    return '<section class="mm__sec"><h3><span>' + escapeHtml(title) + '</span>' +
      (allUrl ? '<a href="' + escapeHtml(allUrl) + '">' + escapeHtml(main.getAttribute('data-view-all')) + ' ›</a>' : '') + '</h3><div class="mm__grid">' +
      (allUrl && !brand ? '<a class="mm__tile mm__tile--all" href="' + escapeHtml(allUrl) + '"><span class="mm__img">' + viewAllIcon + '</span><span class="mm__t">' + escapeHtml(main.getAttribute('data-view-all')) + '</span></a>' : '') +
      cards.map(function (card) { return tileHtml(card, brand); }).join('') + '</div></section>';
  };
  // Contenu d'un rayon / sous-lien : catégories du panneau mobile, puis ses sections ; sinon ses produits
  var panelHtml = function (panel) {
    var html = '';
    var direct = [].slice.call(panel.children).filter(function (child) { return child.matches('a.mobile-category-card'); });
    var allCard = direct.filter(function (card) { return card.classList.contains('mobile-category-card--view-all'); })[0];
    var tiles = direct.filter(function (card) { return !card.classList.contains('mobile-category-card--view-all'); }).map(cardOf);
    if (tiles.length) html += sectionHtml(main.getAttribute('data-shop-by'), allCard ? allCard.getAttribute('href') : '', tiles, false);
    panel.querySelectorAll('.mobile-category-sec').forEach(function (sec) {
      var heading = sec.querySelector('h3');
      var titleNode = heading ? heading.cloneNode(true) : null;
      if (titleNode) titleNode.querySelectorAll('a').forEach(function (link) { link.remove(); });
      var secAll = sec.querySelector('a.mobile-category-card--view-all');
      var cards = [].slice.call(sec.querySelectorAll('a.mobile-category-card:not(.mobile-category-card--view-all):not(.mobile-category-card--product)')).map(cardOf);
      html += sectionHtml(titleNode ? titleNode.textContent.trim() : '', secAll ? secAll.getAttribute('href') : '', cards, sec.className.indexOf('brands') > -1);
    });
    return html;
  };
  var productsHtml = function (endpoint, allUrl) {
    if (productCache[endpoint]) return Promise.resolve(productCache[endpoint]);
    return fetch(endpoint, { credentials: 'same-origin' })
      .then(function (response) { return response.ok ? response.text() : ''; })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var items = [].slice.call(doc.querySelectorAll('.mobile-category-card--product')).slice(0, 12).map(function (card) {
          var image = card.querySelector('img');
          var title = card.querySelector('.mobile-category-card__title');
          var price = card.querySelector('.mobile-category-card__price');
          return '<a class="mm__prod" href="' + escapeHtml(card.getAttribute('href') || '#') + '"><span class="mm__pimg">' +
            (image ? '<img src="' + escapeHtml(image.getAttribute('data-src') || image.getAttribute('src') || '') + '" alt="" loading="lazy">' : '') +
            '</span><span class="mm__t">' + escapeHtml(title ? title.textContent.trim() : '') + '</span><span class="mm__price">' + (price ? price.innerHTML : '') + '</span></a>';
        }).join('');
        var heading = doc.querySelector('.mobile-category-products__title');
        productCache[endpoint] = items ? '<section class="mm__sec"><h3><span>' + escapeHtml(heading ? heading.textContent.trim() : main.getAttribute('data-reco')) + '</span>' +
          (allUrl ? '<a href="' + escapeHtml(allUrl) + '">' + escapeHtml(main.getAttribute('data-view-all')) + ' ›</a>' : '') + '</h3><div class="mm__prods">' + items + '</div></section>' : '';
        return productCache[endpoint];
      })
      .catch(function () { return ''; });
  };
  var showContent = function (handle, url, kids) {
    currentKey = handle;
    main.scrollTop = 0;
    if (!panels) main.innerHTML = '<div class="mm__loading">…</div>';
    loadPanels().then(function () {
      if (currentKey !== handle) return;
      var panel = panels[handle];
      var html = panel ? panelHtml(panel) : '';
      // Pas de panneau mobile : sous-liens du menu (template data-dh-kids)
      if (!html && kids) html = sectionHtml(main.getAttribute('data-shop-by'), url, [].slice.call(kids.content.querySelectorAll('a')).map(cardOf), false);
      main.innerHTML = html;
      // Rayon sans catégories (Abbigliamento Cinese, Bici…), sous-lien sans panneau mobile (Novità e Tendenze) ou « Tutti i Prodotti » : ses produits, comme le prototype
      var endpoint = panel ? panel.getAttribute('data-category-products-endpoint') : (handle && handle !== 'all' ? '/collections/' + handle + '?view=mobile-category' : '');
      if (endpoint && (!html || handle === 'all')) {
        productsHtml(endpoint, url).then(function (products) { if (currentKey === handle) main.insertAdjacentHTML('beforeend', products); });
      }
    });
  };
  var showSub = function (subs, link) {
    subs.querySelectorAll('.mm__sub').forEach(function (sub) { sub.classList.toggle('is-on', sub === link); });
    var kids = link.nextElementSibling;
    showContent(link.getAttribute('data-handle'), link.getAttribute('href'), kids && kids.matches('template[data-dh-kids]') ? kids : null);
  };
  var showTop = function (index) {
    index = String(index);
    var topLink = null;
    tops.forEach(function (link) { var on = link.getAttribute('data-top') === index; link.classList.toggle('is-on', on); if (on) topLink = link; });
    tabs.forEach(function (tab) { tab.classList.toggle('is-on', tab.getAttribute('data-top') === index); });
    var subs = null;
    mm.querySelectorAll('.mm__subs').forEach(function (group) { var on = group.getAttribute('data-subs') === index; group.hidden = !on; if (on) subs = group; });
    mm.classList.toggle('is-flat', !subs);
    if (subs) {
      showSub(subs, subs.querySelector('.mm__sub'));
      // Vignette du rayon : 1re catégorie du 1er sous-lien qui en a
      var head = subs.querySelector('[data-dh-head]');
      if (head && head.hidden) {
        loadPanels().then(function () {
          var image = null;
          [].slice.call(subs.querySelectorAll('.mm__sub')).some(function (sub) {
            var panel = panels[sub.getAttribute('data-handle')];
            image = panel && panel.querySelector('a.mobile-category-card:not(.mobile-category-card--view-all) img');
            return image;
          });
          if (image) { head.src = image.getAttribute('data-src') || image.getAttribute('src'); head.hidden = false; }
        });
      }
    } else if (topLink) {
      showContent(topLink.getAttribute('data-handle'), topLink.getAttribute('href'));
    }
  };
  var setMega = function (open) {
    mega.hidden = !open;
    if (megaButton) megaButton.setAttribute('aria-expanded', String(open));
    if (!open) tabs.forEach(function (tab) { tab.classList.remove('is-on'); });
    paint();
  };
  var megaEnter = function (index) {
    clearTimeout(timer);
    timer = setTimeout(function () { if (index != null) showTop(index); setMega(true); }, mega.hidden ? 140 : 60);
  };
  var megaLeave = function () { clearTimeout(timer); timer = setTimeout(function () { setMega(false); }, 250); };
  // « Categorie » : ouvre sur le 1er rayon qui a des sous-liens (Donna), comme le prototype
  var firstWithSubs = function () { var group = mm.querySelector('.mm__subs'); return group ? group.getAttribute('data-subs') : 0; };
  if (megaButton) {
    megaButton.addEventListener('mouseenter', function () { megaEnter(mega.hidden ? firstWithSubs() : null); });
    megaButton.addEventListener('click', function (event) { event.stopPropagation(); clearTimeout(timer); if (mega.hidden) showTop(firstWithSubs()); setMega(true); });
    megaButton.addEventListener('mouseleave', megaLeave);
  }
  tabs.forEach(function (tab) {
    tab.addEventListener('mouseenter', function () {
      if (tab.hasAttribute('data-top')) megaEnter(tab.getAttribute('data-top'));
      else { clearTimeout(timer); setMega(false); }
    });
    tab.addEventListener('mouseleave', megaLeave);
  });
  mega.addEventListener('mouseenter', function () { clearTimeout(timer); });
  mega.addEventListener('mouseleave', megaLeave);
  tops.forEach(function (link) { link.addEventListener('mouseenter', function () { showTop(link.getAttribute('data-top')); }); });
  mm.querySelectorAll('.mm__sub').forEach(function (link) { link.addEventListener('mouseenter', function () { showSub(link.closest('.mm__subs'), link); }); });
  document.addEventListener('click', function (event) { if (!mega.hidden && !mega.contains(event.target)) setMega(false); });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && !mega.hidden) setMega(false); });
  // Panneau préparé dès que la souris approche des onglets (ouverture sans attente)
  header.querySelector('.dh-tabs').addEventListener('mouseenter', loadPanels, { once: true });
  // Panneaux Categoria aussi pour l'arbre « Raccolte » de la page collection (assets/desktop-collection.js)
  window.dhLoadPanels = loadPanels;
  // Fermeture du méga-menu après une navigation instantanée (attente de survol annulée)
  window.dhCloseMega = function () { clearTimeout(timer); setMega(false); };
})();
