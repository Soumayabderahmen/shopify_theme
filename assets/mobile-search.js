/* Recherche mobile + header intelligent (prototype "platinumshop-prototype-mobile-final (3)").
   - Panneau ouvert au tap sur la barre de recherche (header ou barre compacte) :
     "Ricerche recenti" (localStorage ps_recent_search, 6 max) et "Di tendenza" : top 3 (1, 2, 3)
     des recherches les plus fréquentes du client (localStorage ps_search_counts), complété par les
     tendances définies dans les réglages du header. Miniature et rayon : premier produit réel du terme.
   - Pendant la saisie : Predictive Search API (/search/suggest.json) — suggestions, produits, pages et blog.
   - Les recherches sont comptées sur la page de résultats (/search?q=…), quelle que soit leur origine.
   - Header non sticky ; barre compacte qui glisse depuis le haut dès que le header sort de l'écran.
   Actif uniquement sous 760px. */
(function () {
  'use strict';

  // Textes traduits (snippets/mobile-i18n.liquid, clés mobile.js.* des fichiers locales).
  var T = window.mobileT || function (key) { return key; };
  var root = document.querySelector('[data-mobile-search]');
  var panel = document.querySelector('[data-mobile-search-panel]');
  var scrim = document.querySelector('[data-mobile-search-scrim]');
  var mini = document.querySelector('[data-mobile-mini-header]');
  if (!root || !panel || !scrim || !mini) return;

  var mobile = window.matchMedia('(max-width: 760px)');
  var body = panel.querySelector('[data-mobile-search-body]');

  // #root du thème crée son propre empilement (z-index 13) : le voile et le panneau vont dans #root
  // (au-dessus de la page, sous le header), la barre compacte au niveau du body.
  var pageRoot = document.getElementById('root');
  if (pageRoot) {
    pageRoot.appendChild(scrim);
    pageRoot.appendChild(panel);
  }
  document.body.appendChild(mini);
  var searchUrl = root.dataset.searchUrl || '/search';
  var suggestUrl = root.dataset.suggestUrl || '/search/suggest';
  var moneyFormat = root.dataset.moneyFormat || '€{{amount_with_comma_separator}}';
  var RECENT_KEY = 'ps_recent_search';
  var COUNTS_KEY = 'ps_search_counts';
  var META_KEY = 'ps_trend_meta_v2';
  var MAX_RECENT = 6;
  var MAX_TRENDS = 3;

  var storeTrends = [];
  try {
    storeTrends = JSON.parse(root.querySelector('[data-mobile-search-trends]').textContent) || [];
  } catch (error) {
    console.error(error);
  }

  /* ---------- Utilitaires ---------- */
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function formatNumber(cents, decimals, thousands, decimal) {
    var fixed = (Number(cents || 0) / 100).toFixed(decimals).split('.');
    return fixed[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands) + (fixed[1] ? decimal + fixed[1] : '');
  }

  function money(cents) {
    if (window.mobileMoney) return window.mobileMoney(cents);
    return moneyFormat.replace(/\{\{\s*(\w+)\s*\}\}/, function (match, key) {
      switch (key) {
        case 'amount_no_decimals': return formatNumber(cents, 0, ',', '.');
        case 'amount_with_comma_separator': return formatNumber(cents, 2, '.', ',');
        case 'amount_no_decimals_with_comma_separator': return formatNumber(cents, 0, '.', ',');
        case 'amount_with_apostrophe_separator': return formatNumber(cents, 2, "'", '.');
        case 'amount_with_space_separator': return formatNumber(cents, 2, ' ', ',');
        default: return formatNumber(cents, 2, ',', '.');
      }
    });
  }

  // Prix de la Predictive Search API : chaîne décimale ("138.06") -> centimes.
  function toCents(value) {
    var number = parseFloat(value);
    return isNaN(number) ? 0 : Math.round(number * 100);
  }

  function sizedImage(url, width) {
    if (!url) return '';
    var clean = String(url).replace(/^\/\//, 'https://').replace(/([?&])width=\d+&?/, '$1').replace(/[?&]$/, '');
    return clean + (clean.indexOf('?') === -1 ? '?' : '&') + 'width=' + width;
  }

  function normalize(term) {
    return String(term || '').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  function readStore(key, fallback, storage) {
    try {
      var raw = (storage || window.localStorage).getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeStore(key, value, storage) {
    try {
      (storage || window.localStorage).setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(error);
    }
  }

  var ICONS = {
    clock: '<path d="M12 7v5l3 2"></path><circle cx="12" cy="12" r="9"></circle>',
    search: '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path>',
    x: '<path d="M6 6l12 12M18 6 6 18"></path>',
    arrow: '<path d="M7 17 17 7M9 7h8v8"></path>'
  };

  function icon(name, className) {
    return '<svg class="' + (className || '') + '" aria-hidden="true" viewBox="0 0 24 24" focusable="false">' + ICONS[name] + '</svg>';
  }

  /* ---------- Historique : récentes + compteur de recherches ---------- */
  function getRecent() {
    var list = readStore(RECENT_KEY, []);
    return Array.isArray(list) ? list.filter(function (item) { return typeof item === 'string' && item.trim(); }) : [];
  }

  function setRecent(list) {
    writeStore(RECENT_KEY, list.slice(0, MAX_RECENT));
  }

  function getCounts() {
    var counts = readStore(COUNTS_KEY, {});
    return counts && typeof counts === 'object' ? counts : {};
  }

  function recordSearch(term) {
    var clean = String(term || '').trim().replace(/\s+/g, ' ');
    if (!clean) return;
    var key = normalize(clean);
    setRecent([clean].concat(getRecent().filter(function (item) { return normalize(item) !== key; })));
    var counts = getCounts();
    var entry = counts[key] || { term: clean, count: 0, last: 0 };
    entry.term = clean;
    entry.count += 1;
    entry.last = Date.now();
    counts[key] = entry;
    // On garde les 50 termes les plus utilisés.
    var keys = Object.keys(counts);
    if (keys.length > 50) {
      keys.sort(function (a, b) { return counts[b].count - counts[a].count || counts[b].last - counts[a].last; });
      keys.slice(50).forEach(function (oldKey) { delete counts[oldKey]; });
    }
    writeStore(COUNTS_KEY, counts);
  }

  // "Di tendenza" : d'abord les recherches les plus fréquentes du client (1 = la plus cherchée),
  // puis les tendances des réglages du header pour compléter : top 3 seulement.
  function trendList() {
    var counts = getCounts();
    var personal = Object.keys(counts)
      .map(function (key) { return counts[key]; })
      .sort(function (a, b) { return b.count - a.count || b.last - a.last; })
      .map(function (entry) { return { term: entry.term, count: entry.count }; });
    var seen = {};
    var list = [];
    personal.concat(storeTrends.map(function (term) { return { term: term, count: 0 }; })).forEach(function (item) {
      var key = normalize(item.term);
      if (!key || seen[key] || list.length >= MAX_TRENDS) return;
      seen[key] = true;
      list.push(item);
    });
    return list;
  }

  /* ---------- Miniature + rayon des tendances (premier produit réel du terme) ---------- */
  var metaCache = readStore(META_KEY, {}, window.sessionStorage) || {};
  var metaRequests = {};

  function suggestRequest(query, types, limit, signal) {
    var url = suggestUrl + '.json?q=' + encodeURIComponent(query)
      + '&resources[type]=' + types
      + '&resources[limit]=' + limit
      + '&resources[options][unavailable_products]=last';
    return fetch(url, { credentials: 'same-origin', signal: signal, headers: { Accept: 'application/json' } })
      .then(function (response) {
        if (!response.ok) throw new Error('Predictive search failed with status ' + response.status + ' for ' + query);
        return response.json();
      })
      .then(function (data) { return (data.resources && data.resources.results) || {}; });
  }

  function productImage(product) {
    if (!product) return '';
    if (product.featured_image && product.featured_image.url) return product.featured_image.url;
    return product.image || '';
  }

  function loadTrendMeta(term) {
    var key = normalize(term);
    if (metaCache[key]) return Promise.resolve(metaCache[key]);
    if (!metaRequests[key]) {
      metaRequests[key] = suggestRequest(term, 'product', 1).then(function (results) {
        var product = (results.products || [])[0];
        // Rayon = type du produit (le fournisseur, souvent "platinumshop", n'apporte rien).
        var meta = { img: productImage(product), sub: product ? (product.type || '') : '' };
        metaCache[key] = meta;
        writeStore(META_KEY, metaCache, window.sessionStorage);
        return meta;
      }).catch(function (error) {
        delete metaRequests[key];
        throw error;
      });
    }
    return metaRequests[key];
  }

  /* ---------- Rendu : accueil du panneau ---------- */
  function trendSubtitle(item, meta) {
    if (meta && meta.sub) return meta.sub;
    if (item.count > 1) return T('searched_times', { count: item.count });
    if (item.count === 1) return T('searched_recently');
    return '';
  }

  function renderHome() {
    var recent = getRecent();
    var html = '';
    if (recent.length) {
      html += '<div class="sp-t"><span>' + T('recent_searches') + '</span><button type="button" data-sp-clear>' + T('clear') + '</button></div>';
      html += recent.map(function (term, index) {
        return '<div class="sp-row" style="animation-delay:' + index * 30 + 'ms" data-sp-query="' + escapeHtml(term) + '" role="button" tabindex="0">'
          + '<span class="sp-ic">' + icon('clock') + '</span>'
          + '<span class="sp-txt"><b>' + escapeHtml(term) + '</b></span>'
          + '<button type="button" class="sp-x" data-sp-delete="' + index + '" aria-label="' + escapeHtml(T('remove_term', { term: term })) + '">' + icon('x') + '</button>'
          + '</div>';
      }).join('');
    }
    var trends = trendList();
    if (trends.length) {
      html += '<div class="sp-t"><span>' + T('trending') + '</span></div>';
      html += trends.map(function (item, index) {
        var meta = metaCache[normalize(item.term)];
        var subtitle = trendSubtitle(item, meta);
        return '<div class="sp-row' + (index === 0 ? ' first' : '') + '" style="animation-delay:' + (index + 2) * 35 + 'ms" data-sp-query="' + escapeHtml(item.term) + '" data-sp-trend="' + escapeHtml(normalize(item.term)) + '" data-sp-count="' + item.count + '" role="button" tabindex="0">'
          + '<span class="sp-rank">' + (index + 1) + '</span>'
          + '<span class="sp-thumb">' + (meta && meta.img ? '<img alt="" loading="lazy" src="' + escapeHtml(sizedImage(meta.img, 120)) + '">' : '') + '</span>'
          + '<span class="sp-txt"><b>' + escapeHtml(item.term) + '</b><small' + (subtitle ? '' : ' hidden') + '>' + escapeHtml(subtitle) + '</small></span>'
          + icon('arrow', 'sp-go')
          + '</div>';
      }).join('');
    }
    body.innerHTML = html;
    // Miniatures manquantes : chargées puis insérées sans reconstruire la liste.
    trends.forEach(function (item) {
      var key = normalize(item.term);
      if (metaCache[key]) return;
      loadTrendMeta(item.term).then(function (meta) {
        var row = body.querySelector('[data-sp-trend="' + CSS.escape(key) + '"]');
        if (!row) return;
        if (meta.img) {
          var image = document.createElement('img');
          image.alt = '';
          image.src = sizedImage(meta.img, 120);
          row.querySelector('.sp-thumb').replaceChildren(image);
        }
        var small = row.querySelector('.sp-txt small');
        var subtitle = trendSubtitle({ count: Number(row.dataset.spCount) }, meta);
        small.textContent = subtitle;
        small.hidden = !subtitle;
      }).catch(function (error) { console.error(error); });
    });
  }

  /* ---------- Rendu : résultats pendant la saisie ---------- */
  var typingTimer = null;
  var typingController = null;

  function tokensOf(query) {
    return normalize(query).split(/\s+/).filter(Boolean);
  }

  // Surlignage par début de mot, comme la recherche Shopify.
  function highlight(text, tokens) {
    var html = escapeHtml(text);
    tokens.forEach(function (token) {
      var pattern = new RegExp('(^|[\\s/,\\-(])(' + escapeRegExp(escapeHtml(token)) + ')', 'ig');
      html = html.replace(pattern, '$1<mark>$2</mark>');
    });
    return html;
  }

  function searchRow(query) {
    return '<div class="sp-row sp-do" data-sp-query="' + escapeHtml(query) + '" role="button" tabindex="0">'
      + '<span class="sp-ic">' + icon('search') + '</span>'
      + '<span class="sp-txt"><b>' + escapeHtml(T('results_for', { query: query })) + '</b></span>'
      + icon('arrow', 'sp-go') + '</div>';
  }

  function renderTyped(query) {
    var tokens = tokensOf(query);
    body.innerHTML = searchRow(query) + '<div class="sp-loading" aria-hidden="true"><i></i><i></i><i></i></div>';
    window.clearTimeout(typingTimer);
    if (typingController) typingController.abort();
    typingTimer = window.setTimeout(function () {
      typingController = 'AbortController' in window ? new AbortController() : null;
      suggestRequest(query, 'product,query,page,article', 5, typingController && typingController.signal).then(function (results) {
        if (currentQuery() !== query) return;
        var html = searchRow(query);
        var queries = (results.queries || []).filter(function (item) { return normalize(item.text) !== normalize(query); }).slice(0, 5);
        var products = (results.products || []).slice(0, 5);
        var pages = (results.pages || []).concat(results.articles || []);
        if (queries.length) {
          html += '<div class="sp-t"><span>' + T('suggestions') + '</span></div>' + queries.map(function (item) {
            return '<div class="sp-row" data-sp-query="' + escapeHtml(item.text) + '" role="button" tabindex="0">'
              + '<span class="sp-ic">' + icon('search') + '</span>'
              + '<span class="sp-txt"><b>' + highlight(item.text, tokens) + '</b></span></div>';
          }).join('');
        }
        if (products.length) {
          html += '<div class="sp-t"><span>' + T('products') + '</span></div>' + products.map(function (product) {
            var price = toCents(product.price);
            var compare = toCents(product.compare_at_price_max);
            var onSale = compare > price;
            return '<a class="sp-row sp-prod" href="' + escapeHtml(product.url) + '">'
              + '<span class="sp-thumb"><img alt="" loading="lazy" src="' + escapeHtml(sizedImage(productImage(product), 120)) + '"></span>'
              + '<span class="sp-txt"><b class="sp-ttl">' + highlight(product.title, tokens) + '</b>'
              + '<span class="sp-pl">' + (onSale ? '<s>' + escapeHtml(money(compare)) + '</s>' : '')
              + '<strong class="' + (onSale ? 'sale' : '') + '">' + escapeHtml(money(price)) + '</strong></span></span></a>';
          }).join('');
          html += '<button type="button" class="sp-all" data-sp-query="' + escapeHtml(query) + '">' + T('view_all_results') + ' ' + icon('arrow') + '</button>';
        }
        if (pages.length) {
          html += '<div class="sp-t"><span>' + T('pages_posts') + '</span></div>' + pages.map(function (page) {
            return '<a class="sp-row sp-page" href="' + escapeHtml(page.url) + '">'
              + '<span class="sp-txt"><b>' + highlight(page.title, tokens) + '</b></span>' + icon('arrow', 'sp-go') + '</a>';
          }).join('');
        }
        if (!queries.length && !products.length && !pages.length) {
          html += '<div class="sp-empty"><b>' + escapeHtml(T('no_results', { query: query })) + '</b>' + T('no_results_hint') + '</div>';
        }
        body.innerHTML = html;
      }).catch(function (error) {
        if (error && error.name === 'AbortError') return;
        console.error(error);
        if (currentQuery() === query) body.innerHTML = searchRow(query);
      });
    }, 180);
  }

  /* ---------- Ouverture / fermeture ---------- */
  // Champ du header mobile (rendu dans le header) ; à défaut, l'ancien champ du thème.
  var nativeForm = document.querySelector('[data-mobile-search-form]') || document.getElementById('search');
  var nativeInput = nativeForm && nativeForm.querySelector('input[type="search"]');
  var miniForm = mini.querySelector('[data-mobile-mini-search]');
  var miniInput = miniForm.querySelector('input');
  var activeForm = null;
  var activeInput = null;
  var closeTimer = null;

  function currentQuery() {
    return activeInput ? activeInput.value.trim() : '';
  }

  function render() {
    if (isOpen()) place();
    var query = currentQuery();
    if (query) renderTyped(query);
    else renderHome();
  }

  // Hauteur réellement visible : sur iPhone, 100vh inclut la zone cachée par les barres du navigateur
  // et le clavier ; on s'arrête au bas de la zone visible (visualViewport) ou au-dessus de la barre du bas.
  function place() {
    var anchor = activeForm === miniForm ? mini : activeForm;
    if (!anchor) return;
    var rect = anchor.getBoundingClientRect();
    var top = Math.max(0, Math.round(rect.bottom + (activeForm === miniForm ? 0 : 10)));
    var viewport = window.visualViewport;
    var visibleBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
    var bottomNav = document.querySelector('.mobile-bottom-navigation');
    var navTop = bottomNav ? bottomNav.getBoundingClientRect().top : visibleBottom;
    var limit = Math.min(visibleBottom, navTop > top ? navTop : visibleBottom) - 8;
    var head = panel.querySelector('.sp-head');
    var headHeight = head ? head.offsetHeight : 0;
    panel.style.top = top + 'px';
    panel.style.maxHeight = Math.max(160, limit - top) + 'px';
    body.style.maxHeight = Math.max(120, limit - top - headHeight) + 'px';
  }

  // Clavier qui s'ouvre / barres du navigateur qui bougent : on recalcule.
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () { if (isOpen()) place(); });
    window.visualViewport.addEventListener('scroll', function () { if (isOpen()) place(); });
  }

  function isOpen() {
    return panel.classList.contains('is-on');
  }

  function open() {
    window.clearTimeout(closeTimer);
    // L'ancien comportement du thème (masquer le bandeau au focus) ferait sauter la page.
    document.body.classList.remove('mobile-search-open');
    document.documentElement.classList.add('mobile-search-lock');
    place();
    render();
    scrim.hidden = false;
    panel.inert = false;
    panel.setAttribute('aria-hidden', 'false');
    if (activeInput) activeInput.setAttribute('aria-expanded', 'true');
    window.requestAnimationFrame(function () {
      scrim.classList.add('is-on');
      panel.classList.add('is-on');
      place();
    });
  }

  function close(keepFocus) {
    if (!isOpen()) return;
    scrim.classList.remove('is-on');
    panel.classList.remove('is-on');
    panel.inert = true;
    panel.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('mobile-search-lock');
    document.body.classList.remove('mobile-search-open');
    [nativeInput, miniInput].forEach(function (input) { if (input) input.setAttribute('aria-expanded', 'false'); });
    closeTimer = window.setTimeout(function () { if (!isOpen()) scrim.hidden = true; }, 260);
    if (!keepFocus && activeInput) activeInput.blur();
    // Pendant la recherche la barre compacte ne bouge pas : on la remet dans le bon état.
    updateMini();
  }

  function setValue(value) {
    [nativeInput, miniInput].forEach(function (input) { if (input) input.value = value; });
  }

  // Lance la recherche réelle (/search?q=…) ; le terme est compté sur la page de résultats.
  function go(query) {
    var clean = String(query || '').trim();
    if (!clean) return;
    setValue(clean);
    close(true);
    var params = nativeForm ? new URLSearchParams(new FormData(nativeForm)) : new URLSearchParams();
    params.set('q', clean);
    window.location.href = (nativeForm ? nativeForm.getAttribute('action') || searchUrl : searchUrl) + '?' + params.toString();
  }

  function wire(form, input) {
    if (!form || !input) return;
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('aria-controls', 'mobile-search-panel');
    function activate() {
      if (!mobile.matches) return;
      activeForm = form;
      activeInput = input;
      if (!isOpen()) open();
    }
    input.addEventListener('focus', activate);
    input.addEventListener('click', activate);
    input.addEventListener('input', function () {
      if (!mobile.matches) return;
      activeForm = form;
      activeInput = input;
      setValue(input.value);
      if (!isOpen()) open();
      else render();
    });
    form.addEventListener('submit', function (event) {
      if (!mobile.matches) return;
      event.preventDefault();
      go(input.value);
    });
  }

  wire(nativeForm, nativeInput);
  wire(miniForm, miniInput);

  scrim.addEventListener('click', function () { close(); });
  panel.querySelector('[data-mobile-search-cancel]').addEventListener('click', function () {
    setValue('');
    close();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && isOpen()) close();
  });
  window.addEventListener('resize', function () {
    if (isOpen()) place();
    if (!mobile.matches) close();
  });

  body.addEventListener('click', function (event) {
    var remove = event.target.closest('[data-sp-delete]');
    if (remove) {
      event.stopPropagation();
      var recent = getRecent();
      recent.splice(Number(remove.dataset.spDelete), 1);
      setRecent(recent);
      renderHome();
      return;
    }
    if (event.target.closest('[data-sp-clear]')) {
      setRecent([]);
      renderHome();
      return;
    }
    var link = event.target.closest('a[href]');
    if (link) {
      close(true);
      return;
    }
    var row = event.target.closest('[data-sp-query]');
    if (row) go(row.dataset.spQuery);
  });

  body.addEventListener('keydown', function (event) {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.sp-row[role="button"]')) {
      event.preventDefault();
      event.target.click();
    }
  });

  /* ---------- Comptage des recherches (page de résultats) ---------- */
  (function countCurrentSearch() {
    if (!mobile.matches) return;
    var path = window.location.pathname.replace(/\/$/, '');
    if (path !== searchUrl.replace(/\/$/, '')) return;
    var query = new URLSearchParams(window.location.search).get('q');
    if (!query || !query.trim()) return;
    // Rechargement ou retour arrière : déjà compté.
    var navigation = window.performance && performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
    if (navigation && navigation.type !== 'navigate') return;
    recordSearch(query);
  })();

  /* ---------- Barre compacte : remplace le header dès qu'il sort de l'écran ---------- */
  var header = document.querySelector('.mobile-temu-header');

  function showMini(show) {
    if (mini.classList.contains('is-shown') === show) return;
    mini.classList.toggle('is-shown', show);
    mini.inert = !show;
    mini.setAttribute('aria-hidden', String(!show));
    if (!show && activeForm === miniForm && isOpen()) close();
  }

  // Aucune lecture de mise en page pendant le défilement (elle forçait le navigateur à tout
  // recalculer à chaque image : saccades sur iPhone) :
  // - apparition de la barre : le navigateur signale quand le header sort de l'écran (IntersectionObserver) ;
  // - ligne de lecture : animation CSS liée au défilement si disponible, sinon mise à jour
  //   espacée (150 ms) et seulement quand la barre est visible.
  var headerVisible = true;
  var scrollProgressInCss = window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()');
  var maxScroll = 0;
  var progressTimer = null;

  function updateMini() {
    if (!mobile.matches || !header) {
      showMini(false);
      return;
    }
    // Le grand header défile avec la page ; dès qu'il est sorti de l'écran, la barre compacte
    // le remplace (en descendant comme en remontant) et disparaît quand il redevient visible.
    if (!isOpen()) showMini(!headerVisible);
  }

  if (header && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      headerVisible = entries[entries.length - 1].isIntersecting;
      updateMini();
    }, { rootMargin: '-10px 0px 0px 0px' }).observe(header);
  }

  function measureMax() {
    maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  }

  function updateProgress() {
    progressTimer = null;
    if (!mini.classList.contains('is-shown')) return;
    if (!maxScroll) measureMax();
    mini.style.setProperty('--p', maxScroll > 0 ? Math.min(1, window.scrollY / maxScroll).toFixed(3) : '0');
  }

  if (!scrollProgressInCss) {
    window.addEventListener('scroll', function () {
      if (!progressTimer) progressTimer = window.setTimeout(updateProgress, 150);
    }, { passive: true });
    window.addEventListener('load', measureMax);
    window.addEventListener('resize', measureMax);
    if ('ResizeObserver' in window) {
      // Page qui s'allonge (produits ajoutés au défilement) : hauteur remesurée plus tard, hors défilement.
      var maxTimer = null;
      new ResizeObserver(function () {
        window.clearTimeout(maxTimer);
        maxTimer = window.setTimeout(function () { maxScroll = 0; }, 400);
      }).observe(document.body);
    }
  }

  window.addEventListener('resize', updateMini);

  // ☰ de la barre compacte : même menu "Esplora" que le header.
  mini.querySelector('[data-mobile-mini-menu]').addEventListener('click', function () {
    var trigger = document.querySelector('.mobile-temu-header [data-mobile-explore-trigger]');
    if (trigger) trigger.click();
  });

  // Pastille panier de la barre compacte : copie de celle du header.
  var headerCount = document.querySelector('.mobile-temu-header .mobile-home-cart-count');
  var miniCount = mini.querySelector('[data-mobile-mini-cart-count]');
  if (headerCount && miniCount) {
    var syncCount = function () {
      miniCount.textContent = headerCount.textContent;
      miniCount.hidden = headerCount.hidden;
    };
    new MutationObserver(syncCount).observe(headerCount, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
    syncCount();
  }
})();
