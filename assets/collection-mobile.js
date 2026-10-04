/* Page collection MOBILE (prototypes « platinumshop-collection-mobile » et « Filtri v2 ») — snippets/collection-mobile-head.liquid,
   assets/collection-mobile.css. Feuilles Filtri / Ordina, raccourcis de la barre collante, double curseur de prix,
   recherche dans les longues listes, « Mostra N prodotti » recalculé par Shopify (Section Rendering API),
   bascule 2 colonnes / 1 colonne, « Mostrando N di T » (suit le chargement automatique, assets/mobile-auto-load.js).
   Valider les filtres ou choisir un tri charge la page Shopify correspondante. Textes : window.mobileT (snippets/mobile-i18n.liquid). */
(function () {
  'use strict';

  if (!window.matchMedia('(max-width: 760px)').matches) return;
  var head = document.querySelector('[data-collection-mobile]');
  if (!head) return;

  var T = window.mobileT || function (key) { return key; };
  var lang = document.documentElement.lang || 'it';
  var VIEW_KEY = 'clm_view';
  var VISIBLE_ROWS = 7;
  var total = Number(head.getAttribute('data-total')) || 0;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var X_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  var CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

  var escapeHtml = function (value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  };
  var money = function (amount) {
    var currency = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'EUR';
    return new Intl.NumberFormat(lang, { style: 'currency', currency: currency, maximumFractionDigits: amount % 1 ? 2 : 0 }).format(amount);
  };

  /* ---------- Feuilles : placées dans <body> pour passer au-dessus de la barre du bas ---------- */
  var layer = document.createElement('div');
  layer.className = 'clm clm-layer';
  head.querySelectorAll('[data-clm-sheet], [data-clm-scrim]').forEach(function (element) { layer.appendChild(element); });
  document.body.appendChild(layer);
  var scrim = layer.querySelector('[data-clm-scrim]');
  var form = layer.querySelector('[data-clm-filter-form]');
  var openSheet = null;
  var opener = null;

  var open = function (name, trigger) {
    var sheet = layer.querySelector('[data-clm-sheet="' + name + '"]');
    if (!sheet) return null;
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
    // Histogramme des prix calculé à la première ouverture (requêtes seulement si le client regarde les filtres).
    if (name === 'filters' && typeof loadHistogram === 'function') loadHistogram();
    return sheet;
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

  /* ---------- Accordéons ---------- */
  var setSection = function (section, expanded) {
    var header = section.querySelector('[data-clm-acc]');
    if (!header) return;
    header.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    header.nextElementSibling.firstElementChild.inert = !expanded;
  };

  // Raccourci : feuille ouverte directement sur le filtre choisi.
  var openOnSection = function (index, trigger) {
    var sheet = open('filters', trigger);
    if (!sheet || !index) return;
    var target = sheet.querySelector('[data-clm-sec="' + index + '"]');
    if (!target) return;
    sheet.querySelectorAll('.clm-fsec').forEach(function (section) { setSection(section, section === target); });
    window.setTimeout(function () {
      var body = sheet.querySelector('.clm-sb');
      body.scrollTo({ top: target.offsetTop - body.offsetTop - 4, behavior: reduceMotion ? 'auto' : 'smooth' });
      target.classList.remove('is-flash');
      void target.offsetWidth;
      target.classList.add('is-flash');
    }, reduceMotion ? 0 : 360);
  };

  /* ---------- Prix : double curseur à échelle non linéaire (beaucoup de petits prix, quelques très grands) ---------- */
  var range = form && form.querySelector('[data-clm-range]');
  var priceMax = range ? Number(range.getAttribute('data-max')) || 0 : 0;
  var minInput = form && form.querySelector('[data-clm-min]');
  var maxInput = form && form.querySelector('[data-clm-max]');
  // Même courbe que le prototype : exponentielle (K = 8), la plupart des produits ont un petit prix.
  var CURVE = 8;
  var toPrice = function (position) {
    var t = position / 1000;
    return t >= 1 ? priceMax : (Math.exp(CURVE * t) - 1) / (Math.exp(CURVE) - 1) * priceMax;
  };
  var toPosition = function (price) {
    if (!priceMax) return 0;
    return Math.round(Math.log(1 + Math.min(price, priceMax) / priceMax * (Math.exp(CURVE) - 1)) / CURVE * 1000);
  };
  var snap = function (price) {
    if (price < 20) return Math.round(price);
    if (price < 200) return Math.round(price / 5) * 5;
    if (price < 1000) return Math.round(price / 10) * 10;
    return Math.round(price / 100) * 100;
  };
  var priceValues = function () {
    var min = minInput && minInput.value !== '' ? Number(minInput.value) : null;
    var max = maxInput && maxInput.value !== '' ? Number(maxInput.value) : null;
    return { min: min, max: max };
  };
  var drawRange = function () {
    if (!range) return;
    var values = priceValues();
    var low = values.min == null ? 0 : toPosition(values.min);
    var high = values.max == null ? 1000 : toPosition(values.max);
    range.querySelector('[data-clm-rmin]').value = low;
    range.querySelector('[data-clm-rmax]').value = high;
    var fill = range.querySelector('[data-clm-fill]');
    fill.style.left = (low / 10) + '%';
    fill.style.right = (100 - high / 10) + '%';
    var bars = form.querySelectorAll('[data-clm-hist] i');
    Array.prototype.forEach.call(bars, function (bar, index) {
      var middle = (index + 0.5) / bars.length * 1000;
      bar.classList.toggle('is-in', middle >= low && middle <= high);
    });
    form.querySelectorAll('[data-clm-range-min]').forEach(function (button) {
      var buttonMin = button.getAttribute('data-clm-range-min');
      var buttonMax = button.getAttribute('data-clm-range-max');
      var same = String(values.min == null ? '' : values.min) === buttonMin && String(values.max == null ? '' : values.max) === buttonMax;
      button.setAttribute('aria-pressed', same ? 'true' : 'false');
    });
  };
  var priceLabel = function () {
    var values = priceValues();
    if (values.min == null && values.max == null) return '';
    if (values.min != null && values.max != null) return money(values.min) + ' – ' + money(values.max);
    return values.max != null ? T('collection_to', { amount: money(values.max) }) : T('collection_from', { amount: money(values.min) });
  };

  /* ---------- Listes longues : recherche + « Mostra altre (N) » ---------- */
  var drawList = function (section) {
    var list = section.querySelector('[data-clm-list]');
    if (!list) return;
    var search = section.querySelector('[data-clm-search]');
    var more = section.querySelector('[data-clm-more]');
    var query = search ? search.value.trim().toLowerCase() : '';
    var expanded = more ? more.getAttribute('aria-expanded') === 'true' : true;
    var shown = 0;
    var index = 0;
    list.querySelectorAll('[data-clm-row]').forEach(function (row) {
      var text = row.querySelector('[data-clm-text]');
      var label = text.getAttribute('data-label') || text.textContent;
      text.setAttribute('data-label', label);
      var match = !query || label.toLowerCase().indexOf(query) !== -1;
      var checked = row.querySelector('input').checked;
      var visible = match && (query || expanded || index < VISIBLE_ROWS || checked);
      row.hidden = !visible;
      if (visible) shown += 1;
      if (query && match) {
        var start = label.toLowerCase().indexOf(query);
        text.innerHTML = escapeHtml(label.slice(0, start)) + '<mark>' + escapeHtml(label.slice(start, start + query.length)) + '</mark>' + escapeHtml(label.slice(start + query.length));
      } else {
        text.textContent = label;
      }
      index += 1;
    });
    var none = list.querySelector('[data-clm-none]');
    if (none) {
      none.hidden = shown > 0;
      if (!shown) none.textContent = T('collection_no_match', { query: search.value.trim() });
    }
    if (more) {
      more.hidden = Boolean(query);
      more.innerHTML = (expanded ? escapeHtml(T('collection_less')) : escapeHtml(T('collection_more', { count: more.getAttribute('data-count') }))) + CHEVRON;
    }
  };

  /* ---------- État de la feuille : valeurs choisies, résumés, compteurs ---------- */
  var selections = function () {
    var chosen = [];
    if (!form) return chosen;
    form.querySelectorAll('input[type="checkbox"]:checked').forEach(function (input) {
      chosen.push({ key: input.name + '=' + input.value, label: input.getAttribute('data-clm-label') || input.value, input: input });
    });
    var price = priceLabel();
    if (price) chosen.push({ key: 'price', label: price });
    return chosen;
  };

  var drawState = function () {
    if (!form) return;
    var sheet = form.closest('[data-clm-sheet]');
    var chosen = selections();
    var count = sheet.querySelector('[data-clm-fcount]');
    count.hidden = !chosen.length;
    count.textContent = String(chosen.length);
    sheet.querySelectorAll('.clm-clrlink[data-clm-reset]').forEach(function (button) { button.disabled = !chosen.length; });
    var band = sheet.querySelector('[data-clm-fsel]');
    band.hidden = !chosen.length;
    band.innerHTML = chosen.map(function (item) {
      return '<span class="clm-fchip">' + escapeHtml(item.label)
        + '<button type="button" data-clm-unselect="' + escapeHtml(item.key) + '" aria-label="' + escapeHtml(T('collection_remove', { label: item.label })) + '">' + X_ICON + '</button></span>';
    }).join('');
    sheet.querySelectorAll('.clm-fsec').forEach(function (section) {
      var summary = section.querySelector('[data-clm-summary]');
      if (!summary) return;
      var text = '';
      if (section.getAttribute('data-clm-kind') === 'price') {
        text = priceLabel();
      } else {
        var labels = Array.prototype.map.call(section.querySelectorAll('input[type="checkbox"]:checked'), function (input) {
          return input.getAttribute('data-clm-label') || input.value;
        });
        if (labels.length) text = labels[0] + (labels.length > 1 ? ' +' + (labels.length - 1) : '');
      }
      summary.textContent = text || T('collection_any');
      summary.classList.toggle('is-on', Boolean(text));
      drawList(section);
    });
    drawRange();
  };

  /* ---------- « Mostra N prodotti » : nombre réel donné par Shopify pour la sélection en cours ---------- */
  var countTimer = null;
  var exactTimer = null;
  var countRequest = 0;
  var showButton = form && form.querySelector('[data-clm-show]');
  var lastCount = null;
  var formQuery = function () {
    var params = new URLSearchParams();
    new FormData(form).forEach(function (value, name) {
      if (value !== '') params.append(name, value);
    });
    return params;
  };
  var drawCount = function (count) {
    if (!showButton) return;
    showButton.disabled = count === 0;
    showButton.textContent = count === 0 ? T('collection_show_none')
      : T(count === 1 ? 'collection_show_one' : 'collection_show_n', { count: count.toLocaleString(lang) });
    if (lastCount !== null && lastCount !== count) {
      showButton.classList.remove('is-tick');
      void showButton.offsetWidth;
      showButton.classList.add('is-tick');
    }
    lastCount = count;
  };
  // Nombre de produits pour des filtres donnés : petite page Shopify (templates/collection.count.liquid), réponse rapide.
  var countCache = {};
  var countFor = function (params) {
    var query = params.toString();
    if (!countCache[query]) {
      var url = form.getAttribute('action') + '?' + (query ? query + '&' : '') + 'view=count';
      countCache[query] = fetch(url, { credentials: 'same-origin' }).then(function (response) {
        if (!response.ok) throw new Error('Filter count request failed with status ' + response.status);
        return response.text();
      }).then(function (text) {
        var value = parseInt(text.replace(/[^\d]/g, ''), 10);
        if (isNaN(value)) throw new Error('Filter count missing');
        return value;
      });
      countCache[query].catch(function () { delete countCache[query]; });
    }
    return countCache[query];
  };

  /* ---------- Histogramme des prix : nombre réel de produits par tranche (mêmes tranches que le curseur) ---------- */
  var HIST_BARS = 28;
  var histTimer = null;
  var histKey = null;
  var histogram = form && form.querySelector('[data-clm-hist]');
  var hint = form && form.querySelector('[data-clm-phint]');
  var otherParams = function () {
    var params = formQuery();
    params.delete('sort_by');
    if (minInput) params.delete(minInput.name);
    if (maxInput) params.delete(maxInput.name);
    return params;
  };
  // Requêtes par petits groupes pour ne pas encombrer le réseau du téléphone.
  var runLimited = function (tasks, limit) {
    var results = new Array(tasks.length);
    var next = 0;
    var worker = function () {
      if (next >= tasks.length) return Promise.resolve();
      var index = next++;
      return tasks[index]().then(function (value) { results[index] = value; }, function () { results[index] = 0; }).then(worker);
    };
    var workers = [];
    for (var i = 0; i < Math.min(limit, tasks.length); i++) workers.push(worker());
    return Promise.all(workers).then(function () { return results; });
  };
  var loadHistogram = function () {
    if (!histogram || !priceMax || !minInput) return;
    var base = otherParams();
    var key = base.toString();
    if (key === histKey) return;
    histKey = key;
    if (!histogram.children.length) {
      histogram.innerHTML = new Array(HIST_BARS + 1).join('<i></i>');
      drawRange();
    }
    var edges = [];
    for (var i = 0; i <= HIST_BARS; i++) edges.push(Math.round(toPrice(i / HIST_BARS * 1000) * 100) / 100);
    // Déjà calculé pendant cette visite : affichage immédiat.
    var storeKey = 'clm_hist:' + form.getAttribute('action') + '?' + key;
    var stored = null;
    try { stored = JSON.parse(window.sessionStorage.getItem(storeKey) || 'null'); } catch (error) { stored = null; }
    if (!stored || !stored.c || stored.c.length !== HIST_BARS) stored = null;
    var tasks = edges.slice(0, HIST_BARS).map(function (low, index) {
      if (stored) return function () { return Promise.resolve(stored.c[index]); };
      return function () {
        var params = new URLSearchParams(key);
        if (low > 0) params.set(minInput.name, String(low));
        if (index < HIST_BARS - 1) params.set(maxInput.name, String(Math.max(low, edges[index + 1] - 0.01).toFixed(2)));
        return countFor(params);
      };
    });
    Promise.all([runLimited(tasks, 10), stored && stored.b != null ? Promise.resolve(stored.b) : countFor(new URLSearchParams(key)).catch(function () { return null; })]).then(function (results) {
      var counts = results[0];
      if (key !== histKey) return;
      // base = nombre exact sans filtre de prix (un produit à plusieurs prix compte dans plusieurs tranches).
      histData = { key: key, edges: edges, counts: counts, base: results[1] };
      try { window.sessionStorage.setItem(storeKey, JSON.stringify({ c: counts, b: results[1] })); } catch (error) { /* stockage indisponible */ }
      var highest = Math.max.apply(null, counts) || 1;
      Array.prototype.forEach.call(histogram.children, function (bar, index) {
        bar.style.height = Math.max(4, counts[index] / highest * 100) + '%';
      });
      // « Il 90% dei prodotti costa meno di … » : tranche où l'on atteint 90 % des produits.
      var sum = counts.reduce(function (a, b) { return a + b; }, 0);
      if (!hint || !sum) return;
      var running = 0;
      var edge = HIST_BARS - 1;
      for (var j = 0; j < HIST_BARS; j++) {
        running += counts[j];
        if (running / sum >= 0.9) { edge = j; break; }
      }
      hint.innerHTML = T('collection_hint_html', { amount: escapeHtml(money(snap(edges[edge + 1]))) });
      hint.hidden = false;
    });
  };
  // Estimation immédiate du nombre de produits quand seul le prix change (tranches de l'histogramme déjà chargées).
  var histData = null;
  var estimateCount = function () {
    if (!histData || histData.base == null || histData.key !== otherParams().toString()) return null;
    var values = priceValues();
    if (values.min == null && values.max == null) return histData.base;
    var low = values.min == null ? 0 : values.min;
    var high = values.max == null ? Infinity : values.max;
    var sum = 0;
    histData.counts.forEach(function (count, index) {
      var from = histData.edges[index];
      var to = index === histData.counts.length - 1 ? priceMax : histData.edges[index + 1];
      var width = Math.max(to - from, 0.01);
      var overlap = Math.max(0, Math.min(to, high) - Math.max(from, low));
      sum += count * Math.min(1, overlap / width);
    });
    var all = histData.counts.reduce(function (a, b) { return a + b; }, 0) || 1;
    return Math.round(histData.base * Math.min(1, sum / all));
  };

  var scheduleHistogram = function () {
    window.clearTimeout(histTimer);
    histTimer = window.setTimeout(loadHistogram, 400);
  };

  var refreshCount = function () {
    if (!form) return;
    window.clearTimeout(countTimer);
    var requestId = ++countRequest;
    var params = formQuery();
    params.delete('sort_by');
    // Bouton : estimation tout de suite (prix seul), puis le nombre exact de Shopify (compteur léger).
    var estimate = estimateCount();
    if (estimate !== null) drawCount(estimate);
    window.clearTimeout(exactTimer);
    exactTimer = window.setTimeout(function () {
      countFor(params).then(function (count) {
        if (requestId === countRequest) drawCount(count);
      }).catch(function (error) { console.warn('[Collection mobile]', error); });
    }, 250);
    scheduleHistogram();
    // Compteurs de chaque valeur (plus lent : section complète), juste après.
    countTimer = window.setTimeout(function () {
      var sectionParams = formQuery();
      sectionParams.set('section_id', form.getAttribute('data-section-id'));
      fetch(form.getAttribute('action') + '?' + sectionParams.toString(), { credentials: 'same-origin' })
        .then(function (response) {
          if (!response.ok) throw new Error('Filter values request failed with status ' + response.status);
          return response.text();
        })
        .then(function (html) {
          if (requestId !== countRequest) return;
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var fresh = doc.querySelector('[data-collection-mobile]');
          if (!fresh) return;
          // Compteurs des valeurs mis à jour pour la sélection en cours (valeurs à 0 grisées).
          fresh.querySelectorAll('[data-clm-filter-form] input[type="checkbox"]').forEach(function (freshInput) {
            var current = form.querySelector('input[name="' + CSS.escape(freshInput.name) + '"][value="' + CSS.escape(freshInput.value) + '"]');
            if (!current) return;
            var holder = current.closest('label');
            var freshCount = freshInput.closest('label') && freshInput.closest('label').querySelector('[data-clm-count]');
            var currentCount = holder && holder.querySelector('[data-clm-count]');
            if (freshCount && currentCount) currentCount.textContent = freshCount.textContent;
            var empty = freshInput.disabled && !current.checked;
            current.disabled = empty;
            if (holder) holder.classList.toggle('is-empty', empty);
          });
        })
        .catch(function (error) { console.warn('[Collection mobile]', error); });
    }, 300);
  };

  var changed = function () {
    drawState();
    refreshCount();
  };

  var resetForm = function () {
    if (!form) return;
    form.querySelectorAll('input[type="checkbox"]').forEach(function (input) { input.checked = false; });
    form.querySelectorAll('input[type="number"], [data-clm-search]').forEach(function (input) { input.value = ''; });
    changed();
  };

  /* ---------- Événements ---------- */
  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('[data-clm-open]');
    if (trigger && head.contains(trigger)) {
      if (trigger.hasAttribute('data-clm-section')) openOnSection(trigger.getAttribute('data-clm-section'), trigger);
      else open(trigger.getAttribute('data-clm-open'), trigger);
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

    var accordion = event.target.closest('[data-clm-acc]');
    if (accordion) {
      setSection(accordion.closest('.clm-fsec'), accordion.getAttribute('aria-expanded') !== 'true');
      return;
    }

    var reset = event.target.closest('[data-clm-reset]');
    if (reset) {
      resetForm();
      // « Cancella » (pied) : si des filtres sont déjà appliqués à la page, ils sont retirés tout de suite.
      // « Azzera » (en-tête) : vide seulement la sélection de la feuille.
      if (reset.classList.contains('clm-c') && Number(form.getAttribute('data-applied')) > 0) {
        reset.disabled = true;
        window.location.href = form.getAttribute('data-clear-url');
      }
      return;
    }

    var more = event.target.closest('[data-clm-more]');
    if (more) {
      more.setAttribute('aria-expanded', more.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
      drawList(more.closest('.clm-fsec'));
      return;
    }

    // Retirer une valeur depuis la bande des valeurs choisies.
    var unselect = event.target.closest('[data-clm-unselect]');
    if (unselect) {
      var key = unselect.getAttribute('data-clm-unselect');
      if (key === 'price') {
        minInput.value = '';
        maxInput.value = '';
      } else {
        selections().forEach(function (item) { if (item.key === key && item.input) item.input.checked = false; });
      }
      changed();
      return;
    }

    // Puces de prix : remplissent les champs min / max (nouveau toucher : retirées).
    var quick = event.target.closest('[data-clm-range-min]');
    if (quick) {
      var pressed = quick.getAttribute('aria-pressed') === 'true';
      minInput.value = pressed ? '' : quick.getAttribute('data-clm-range-min');
      maxInput.value = pressed ? '' : quick.getAttribute('data-clm-range-max');
      changed();
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && openSheet) close();
  });

  if (form) {
    form.addEventListener('change', function (event) {
      if (event.target.matches('input[type="checkbox"], input[type="number"]')) changed();
    });
    form.addEventListener('input', function (event) {
      if (event.target.matches('[data-clm-search]')) {
        drawList(event.target.closest('.clm-fsec'));
        return;
      }
      if (event.target.matches('[data-clm-rmin], [data-clm-rmax]')) {
        var low = Number(range.querySelector('[data-clm-rmin]').value);
        var high = Number(range.querySelector('[data-clm-rmax]').value);
        if (low > high - 20) {
          if (event.target.matches('[data-clm-rmin]')) low = high - 20;
          else high = low + 20;
        }
        minInput.value = low <= 0 ? '' : String(snap(toPrice(low)));
        maxInput.value = high >= 1000 ? '' : String(snap(toPrice(high)));
        changed();
        return;
      }
      if (event.target.matches('input[type="number"]')) changed();
    });
    // Les champs vides ne partent pas dans l'adresse.
    form.addEventListener('submit', function () {
      form.querySelectorAll('input[type="number"], [data-clm-search]').forEach(function (input) {
        if (input.value === '' || input.matches('[data-clm-search]')) input.disabled = true;
      });
    });
    drawState();
    drawCount(total);
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
    var html = T('collection_results_html', { count: shown.toLocaleString(lang), total: total.toLocaleString(lang) });
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
