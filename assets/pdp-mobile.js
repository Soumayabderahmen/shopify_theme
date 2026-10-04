/* Fiche produit MOBILE au design du prototype (snippets/pdp-mobile-top.liquid, assets/pdp-mobile.css).
   Galerie (compteur, vignettes), « Mostra tutto » du titre, coupon (minuteur 2 jours et code copié, mêmes
   règles que snippets/copons.liquid), prix et photo mis à jour quand la variante change dans le formulaire
   du thème. Mobile uniquement. */
(function () {
  'use strict';

  var root = document.querySelector('[data-pdp-mobile]');
  if (!root || !window.matchMedia('(max-width: 760px)').matches) return;
  // Textes traduits (snippets/mobile-i18n.liquid, clés mobile.js.* des fichiers locales).
  var T = window.mobileT || function (key) { return key; };

  /* ---------- Pleine largeur : décalage = retrait réel de la page à gauche ---------- */
  var alignToScreen = function () {
    root.style.setProperty('--pm-shift-l', '0px');
    root.style.setProperty('--pm-shift-r', '0px');
    var rect = root.getBoundingClientRect();
    root.style.setProperty('--pm-shift-l', (-rect.left) + 'px');
    root.style.setProperty('--pm-shift-r', (-(document.documentElement.clientWidth - rect.right)) + 'px');
  };
  alignToScreen();
  window.addEventListener('resize', alignToScreen);

  /* ---------- Galerie ---------- */
  var slides = root.querySelector('[data-pdp-slides]');
  var counter = root.querySelector('[data-pdp-count]');
  var thumbsBox = root.querySelector('[data-pdp-thumbs]');
  var thumbs = thumbsBox ? Array.prototype.slice.call(thumbsBox.querySelectorAll('.pdp-m__th')) : [];
  var slideCount = slides ? slides.children.length : 0;
  var currentSlide = 0;

  var setCurrent = function (index) {
    if (index === currentSlide || index < 0 || index >= slideCount) return;
    currentSlide = index;
    if (counter) counter.textContent = (index + 1) + ' / ' + slideCount;
    thumbs.forEach(function (thumb, i) {
      if (i === index) {
        thumb.setAttribute('aria-current', 'true');
        thumbsBox.scrollTo({ left: thumb.offsetLeft - (thumbsBox.clientWidth - thumb.offsetWidth) / 2, behavior: 'smooth' });
      } else {
        thumb.removeAttribute('aria-current');
      }
    });
  };

  var goToSlide = function (index, smooth) {
    if (!slides || index < 0 || index >= slideCount) return;
    slides.scrollTo({ left: index * slides.clientWidth, behavior: smooth === false ? 'auto' : 'smooth' });
    setCurrent(index);
  };

  if (slides) {
    var scrollTimer = null;
    slides.addEventListener('scroll', function () {
      window.cancelAnimationFrame(scrollTimer);
      scrollTimer = window.requestAnimationFrame(function () {
        setCurrent(Math.round(slides.scrollLeft / Math.max(1, slides.clientWidth)));
      });
    }, { passive: true });
  }

  thumbs.forEach(function (thumb) {
    thumb.addEventListener('click', function () {
      goToSlide(Number(thumb.getAttribute('data-index')));
    });
  });

  /* ---------- Titre : « Mostra tutto » seulement si le titre est coupé ---------- */
  var title = root.querySelector('[data-pdp-title]');
  var titleMore = root.querySelector('[data-pdp-title-more]');
  if (title && titleMore) {
    window.requestAnimationFrame(function () {
      titleMore.hidden = title.scrollHeight <= title.clientHeight + 2;
    });
    titleMore.addEventListener('click', function () {
      var open = title.classList.toggle('is-open');
      titleMore.textContent = open ? T('show_less') : T('show_all');
    });
  }

  /* ---------- Coupon : minuteur partagé avec snippets/copons.liquid (localStorage ve_coupon_expiry) ---------- */
  var TIMER_KEY = 've_coupon_expiry';
  var TWO_DAYS = 2 * 24 * 60 * 60 * 1000;
  var timer = root.querySelector('[data-pdp-coupon-timer]');
  var expiry = function () {
    var now = Date.now();
    var saved = 0;
    try { saved = parseInt(window.localStorage.getItem(TIMER_KEY), 10) || 0; } catch (error) { saved = 0; }
    if (!saved || now >= saved) {
      saved = now + TWO_DAYS;
      try { window.localStorage.setItem(TIMER_KEY, String(saved)); } catch (error) { /* stockage indisponible */ }
    }
    return saved;
  };
  var pad = function (value) { return value < 10 ? '0' + value : String(value); };
  var tick = function () {
    if (!timer) return;
    var diff = Math.max(0, expiry() - Date.now());
    var days = Math.floor(diff / 86400000);
    var hours = Math.floor((diff % 86400000) / 3600000);
    var minutes = Math.floor((diff % 3600000) / 60000);
    var seconds = Math.floor((diff % 60000) / 1000);
    timer.textContent = pad(days) + T('days_short') + ' ' + pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
  };
  if (timer) {
    tick();
    window.setInterval(tick, 1000);
  }

  // « Riscuoti » : copie le code du coupon (comme le bouton du bloc « Vantaggi esclusivi » du site).
  var claim = root.querySelector('[data-pdp-claim]');
  var copyText = function (text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      document.body.appendChild(area);
      area.select();
      try { document.execCommand('copy'); resolve(); } catch (error) { reject(error); }
      document.body.removeChild(area);
    });
  };
  if (claim) {
    claim.addEventListener('click', function () {
      copyText(root.getAttribute('data-coupon-code')).then(function () {
        claim.textContent = T('copied');
        claim.classList.add('is-done');
      }).catch(function (error) {
        console.warn('[PDP mobile] Coupon copy failed', error);
      });
    });
  }

  /* ---------- Variante : prix et photo suivent le formulaire du thème ---------- */
  var variants = [];
  try {
    variants = JSON.parse(root.querySelector('[data-pdp-variants]').textContent);
  } catch (error) {
    variants = [];
  }
  var priceEl = root.querySelector('[data-pdp-price]');
  var oldEl = root.querySelector('[data-pdp-old]');
  var saveEl = root.querySelector('[data-pdp-save]');
  // Le thème reconstruit son formulaire après le chargement : on relit toujours le champ actuel.
  var currentIdInput = function () {
    return document.querySelector('#main-product form[action*="/cart/add"] [name="id"]');
  };
  var idInput = currentIdInput();
  var money = function (cents) {
    var currency = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'EUR';
    return new Intl.NumberFormat(document.documentElement.lang || 'it-IT', { style: 'currency', currency: currency }).format(cents / 100);
  };
  var lastVariantId = idInput ? String(idInput.value) : '';
  var showVariant = function () {
    idInput = currentIdInput();
    if (!idInput || String(idInput.value) === lastVariantId) return;
    lastVariantId = String(idInput.value);
    var variant = variants.find(function (item) { return String(item.id) === lastVariantId; });
    if (!variant) return;
    var sale = variant.compare > variant.price;
    if (priceEl) {
      priceEl.textContent = money(variant.price);
      priceEl.classList.toggle('is-sale', sale);
    }
    if (oldEl) {
      oldEl.hidden = !sale;
      if (sale) oldEl.textContent = money(variant.compare);
    }
    if (saveEl) {
      saveEl.hidden = !sale;
      if (sale) saveEl.textContent = '-' + Math.floor((variant.compare - variant.price) * 100 / variant.compare) + '%';
    }
    if (variant.media && slides) {
      var target = slides.querySelector('[data-media-id="' + variant.media + '"]');
      if (target) goToSlide(Array.prototype.indexOf.call(slides.children, target));
    }
    onVariantChange(variant);
  };
  if (idInput) {
    // Le thème met à jour l'identifiant de variante après coup, sans événement fiable : on le compare
    // régulièrement (simple lecture d'une valeur, coût négligeable), seulement quand la page est visible.
    window.setInterval(function () {
      if (!document.hidden) showVariant();
    }, 250);
  }

  /* =====================================================================
     Étapes 2 à 4 : cartes du milieu, description en onglets, avis, recommandations, barre d'achat.
     ===================================================================== */
  var currentVariant = function () {
    var input = currentIdInput();
    var id = input ? String(input.value) : '';
    return variants.find(function (item) { return String(item.id) === id; }) || variants[0];
  };

  /* ---------- Options : un choix ici coche l'option réelle du formulaire du thème ---------- */
  var optionsCard = root.querySelector('[data-pdp-options]');
  var themeOptionGroups = function () {
    var groups = [];
    var names = [];
    document.querySelectorAll('#main-product input[type="radio"][name^="options["]').forEach(function (radio) {
      var index = names.indexOf(radio.name);
      if (index === -1) {
        names.push(radio.name);
        groups.push([radio]);
      } else {
        groups[index].push(radio);
      }
    });
    return groups;
  };
  var selectedValues = function () {
    return themeOptionGroups().map(function (group) {
      var checked = group.find(function (radio) { return radio.checked; });
      return checked ? checked.value : null;
    });
  };
  var syncOptions = function () {
    if (!optionsCard) return;
    var selected = selectedValues();
    optionsCard.querySelectorAll('[data-option-index]').forEach(function (block) {
      var index = Number(block.getAttribute('data-option-index'));
      var value = selected[index];
      var name = block.querySelector('[data-pdp-option-name]');
      if (name && value) name.textContent = value;
      block.querySelectorAll('[data-value]').forEach(function (button) {
        button.setAttribute('aria-checked', button.getAttribute('data-value') === value ? 'true' : 'false');
        // Épuisé avec les autres options choisies : barré (comme le prototype).
        var combination = selected.slice();
        combination[index] = button.getAttribute('data-value');
        var match = variants.find(function (variant) {
          return variant.options && variant.options.every(function (optionValue, i) { return optionValue === combination[i]; });
        });
        button.classList.toggle('is-unavailable', !match || !match.available);
      });
    });
  };
  if (optionsCard) {
    optionsCard.addEventListener('click', function (event) {
      var button = event.target.closest('[data-value]');
      if (!button) return;
      var block = button.closest('[data-option-index]');
      var group = themeOptionGroups()[Number(block.getAttribute('data-option-index'))];
      var radio = group && group.find(function (item) { return item.value === button.getAttribute('data-value'); });
      if (!radio) return;
      radio.click();
      syncOptions();
      highlightSize();
      window.setTimeout(showVariant, 0);
    });
    syncOptions();
  }

  // « Guida alle taglie » : section « Tabella delle taglie » de la description, sinon le guide du site.
  var sizeGuide = root.querySelector('[data-pdp-size-guide]');
  if (sizeGuide) {
    sizeGuide.addEventListener('click', function () {
      if (openDescTab && openDescTab('size')) return;
      if (document.getElementById('scWrapper')) document.getElementById('scWrapper').click();
    });
  }

  /* ---------- Quantité, bouton et total : champ quantité et bouton du formulaire du thème ---------- */
  var qtyOutput = root.querySelector('[data-pdp-qty-value]');
  var ctaText = root.querySelector('[data-pdp-cta-text]');
  var quantityInput = function () { return document.querySelector('#main-product form[action*="/cart/add"] [name="quantity"]'); };
  var quantity = function () {
    var input = quantityInput();
    return Math.max(1, parseInt(input ? input.value : '1', 10) || 1);
  };
  var updateTotals = function () {
    var variant = currentVariant();
    if (qtyOutput) qtyOutput.textContent = String(quantity());
    if (variant && ctaText) ctaText.textContent = T('add_to_cart_total', { price: money(variant.price * quantity()) });
  };
  root.querySelectorAll('[data-pdp-qty]').forEach(function (button) {
    button.addEventListener('click', function () {
      var input = quantityInput();
      if (!input) return;
      input.value = String(Math.max(1, quantity() + Number(button.getAttribute('data-pdp-qty'))));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      updateTotals();
    });
  });
  root.querySelectorAll('[data-pdp-add]').forEach(function (button) {
    button.addEventListener('click', function () {
      var submit = document.querySelector('#main-product form[action*="/cart/add"] [type="submit"]');
      if (submit) submit.click();
    });
  });

  // « Spedito oggi ? Ordina entro » : temps restant avant la fin de la journée.
  var shipTimer = root.querySelector('[data-pdp-ship-timer]');
  var tickShip = function () {
    var now = new Date();
    var end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    var diff = Math.max(0, end - now);
    shipTimer.textContent = pad(Math.floor(diff / 3600000)) + ':' + pad(Math.floor((diff % 3600000) / 60000)) + ':' + pad(Math.floor((diff % 60000) / 1000));
  };
  if (shipTimer) {
    tickShip();
    window.setInterval(tickShip, 1000);
  }

  /* ---------- Fenêtres réelles du site : Termini, garantie sur le prix, Protezioni ---------- */
  root.querySelectorAll('[data-pdp-open-terms]').forEach(function (button) {
    button.addEventListener('click', function () {
      var terms = document.getElementById('ve-open-terms');
      if (terms) terms.click();
    });
  });
  root.querySelectorAll('[data-pdp-open-price]').forEach(function (button) {
    button.addEventListener('click', function () {
      var badge = document.querySelector('#main-product .price-match-badge');
      if (badge) badge.click();
    });
  });
  /* ---------- Livraison gratuite : seuil des réglages du thème dans la devise du client ----------
     EUR, USD, CAD, CHF, GBP : même nombre, déjà calculé par le Liquid (data-threshold). Autres devises
     (data-threshold = 0) : seuil en euros converti au taux de Shopify, arrondi à deux chiffres significatifs. */
  var ship = root.querySelector('[data-pdp-ship]');
  var shipText = ship && ship.querySelector('[data-pdp-ship-text]');
  var shipThreshold = ship ? Number(ship.getAttribute('data-threshold')) || 0 : 0;
  if (ship && !shipThreshold) {
    var rate = Number(window.Shopify && window.Shopify.currency && window.Shopify.currency.rate) || 1;
    var converted = Number(ship.getAttribute('data-base')) * rate;
    var magnitude = Math.pow(10, Math.max(0, Math.floor(Math.log10(converted)) - 1));
    shipThreshold = Math.ceil(converted / magnitude) * magnitude;
  }
  // Montant converti au format de prix de la boutique : modèle « 1 234 567 » rendu par Shopify
  // (data-money-sample, ex. « Lek 1,234,567 ») dont on garde symbole et séparateur de milliers.
  var shopMoney = function (cents) {
    var sample = ship.getAttribute('data-money-sample') || '';
    var match = sample.match(/^(.*?)1(\D?)234(?:\2)567(.*)$/);
    var whole = String(Math.round(cents / 100));
    if (!match) return money(cents).replace(/[.,]00(?=\D*$)/, '');
    return match[1] + whole.replace(/\B(?=(\d{3})+(?!\d))/g, match[2]) + match[3];
  };
  // Textes déjà formatés par Shopify pour EUR, USD, CAD, CHF, GBP ; devises converties : montant calculé ici.
  var updateShipping = function (price) {
    if (!shipText || !shipThreshold) return;
    var text = price >= shipThreshold
      ? (ship.getAttribute('data-text-free') || T('pdp_ship_free_order'))
      : (ship.getAttribute('data-text-from') || T('pdp_ship_from', { amount: shopMoney(shipThreshold) }));
    if (shipText.textContent !== text) shipText.textContent = text;
  };
  var firstVariant = variants.find(function (item) { return String(item.id) === lastVariantId; }) || variants[0];
  if (firstVariant) updateShipping(firstVariant.price);
  root.querySelectorAll('[data-pdp-protection]').forEach(function (button) {
    button.addEventListener('click', function () {
      var label = button.getAttribute('data-pdp-protection');
      var block = document.querySelector('#main-product .f8pr-variant-selection');
      var target = block && Array.prototype.find.call(block.querySelectorAll('*'), function (el) {
        return el.children.length === 0 && el.textContent.trim() === label;
      });
      var trigger = (target && target.closest('[onclick], button, [role="button"], [data-ps-key], .ps-chip, .ps-item')) || target
        || document.querySelector('#main-product .ps-header');
      if (trigger) trigger.click();
    });
  });

  /* ---------- Fidélité : textes des apps (points Honeypop, crédit boutique) ---------- */
  var rewards = root.querySelector('[data-pdp-rewards]');
  var readRewards = function () {
    if (!rewards) return true;
    var found = false;
    var pointsSource = document.querySelector('#main-product .honeypop-pp-text');
    var pointsMatch = pointsSource && pointsSource.textContent.match(/([\d.,]+)\s*points?[^~]*~?\s*([\d.,]+\s*€)?/i);
    if (pointsMatch) {
      root.querySelector('[data-pdp-points-text]').textContent = T('points_earn', { points: pointsMatch[1] });
      root.querySelector('[data-pdp-points-sub]').textContent = T('points_sub') + (pointsMatch[2] ? ' (≈ ' + pointsMatch[2].trim() + ')' : '');
      root.querySelector('[data-pdp-points]').hidden = false;
      found = true;
    }
    var form = document.querySelector('#main-product form[action*="/cart/add"]');
    var creditHost = form && Array.prototype.find.call(form.querySelectorAll('*'), function (el) {
      return /store credit/i.test(el.textContent) && el.querySelector('.money') && el.textContent.length < 120;
    });
    var creditMoney = creditHost && creditHost.querySelector('.money');
    if (creditMoney) {
      root.querySelector('[data-pdp-credit-text]').textContent = T('credit_receive', { amount: creditMoney.textContent.trim() });
      root.querySelector('[data-pdp-credit]').hidden = false;
      found = true;
    }
    rewards.hidden = !found;
    return Boolean(pointsMatch && creditMoney);
  };
  var rewardTries = 0;
  var rewardTimer = window.setInterval(function () {
    rewardTries += 1;
    if (readRewards() || rewardTries > 40) window.clearInterval(rewardTimer);
  }, 500);

  /* ---------- Description en sections + onglets collants (vrais titres de la description) ---------- */
  var descSource = root.querySelector('[data-pdp-desc-src]');
  var descBox = root.querySelector('[data-pdp-desc]');
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="m8 12.5 3 3 5-6"/></svg>';
  var WARN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 20h20z"/><path d="M12 10v4.5M12 17.5v.1"/></svg>';
  var photos = [];
  var keyFor = function (title) {
    var t = title.toLowerCase();
    if (/tagli|size/.test(t)) return 'size';
    if (/specific/.test(t)) return 'spec';
    if (/caratteristic|feature/.test(t)) return 'feat';
    if (/vantagg/.test(t)) return 'adv';
    if (/panoramic|overview|descri/.test(t)) return 'ov';
    return 'sec' + Math.random().toString(36).slice(2, 7);
  };
  // Ligne « size_info: {…} » des descriptions importées : tableau construit par assets/size-info.js (partagé avec le desktop).
  var sizeInfoTable = function (text) {
    return window.sizeInfo ? window.sizeInfo.table(text) : null;
  };

  var buildDescription = function () {
    if (!descSource || !descBox) return;
    var doc = descSource.content.cloneNode(true);
    var items = [];
    // Aplatit les blocs « conteneurs » de la description (div qui n'enveloppent que d'autres blocs).
    var collect = function (parent) {
      Array.prototype.forEach.call(parent.children, function (el) {
        var tag = el.tagName;
        if (/^(META|LINK|SCRIPT|STYLE|BR)$/.test(tag)) return;
        if (tag === 'IMG') { photos.push(el.getAttribute('src')); return; }
        if (tag === 'DIV' || tag === 'SECTION' || tag === 'ARTICLE') {
          var table = el.querySelector('table');
          var onlyImages = !el.textContent.trim() && el.querySelector('img');
          if (onlyImages) {
            el.querySelectorAll('img').forEach(function (img) { photos.push(img.getAttribute('src')); });
            return;
          }
          if (table && el.children.length === 1) { items.push(table); return; }
          collect(el);
          return;
        }
        items.push(el);
      });
    };
    collect(doc);

    // La ligne « size_info » brute est retirée du texte ; son tableau devient un onglet « Guida alle taglie ».
    var supplierSizeTable = null;
    items = items.filter(function (el) {
      var text = el.textContent.trim();
      if (!/^size_info\s*:/i.test(text)) return true; // même règle que window.sizeInfo.LINE
      if (!supplierSizeTable) supplierSizeTable = sizeInfoTable(text);
      return false;
    });

    var sections = [];
    var current = null;
    items.forEach(function (el) {
      if (/^H[1-4]$/.test(el.tagName)) {
        current = { title: el.textContent.trim(), nodes: [] };
        sections.push(current);
        return;
      }
      if (el.tagName === 'P' && !el.textContent.trim() && !el.querySelector('img')) return;
      if (el.tagName === 'P' && el.querySelector('img') && !el.textContent.trim()) {
        el.querySelectorAll('img').forEach(function (img) { photos.push(img.getAttribute('src')); });
        return;
      }
      if (!current) {
        current = { title: T('description'), nodes: [] };
        sections.push(current);
      }
      current.nodes.push(el);
    });
    // Tableau du fournisseur seulement si la description n'a pas déjà sa propre section de tailles.
    if (supplierSizeTable && !sections.some(function (section) { return keyFor(section.title) === 'size'; })) {
      sections.push({ title: T('size_guide'), key: 'size', nodes: [supplierSizeTable] });
    }
    if (!sections.length && !photos.length) return;

    var html = '';
    var tabs = [];
    sections.forEach(function (section) {
      var key = section.key || keyFor(section.title);
      var body = '';
      var paragraphs = '';
      var flushParagraphs = function () {
        if (paragraphs) body += '<div class="pdp-m__txt">' + paragraphs + '</div>';
        paragraphs = '';
      };
      section.nodes.forEach(function (node) {
        var text = node.textContent.trim();
        if (node.tagName === 'UL' || node.tagName === 'OL') {
          flushParagraphs();
          if (key === 'feat') {
            body += '<ul class="pdp-m__feat">' + Array.prototype.map.call(node.querySelectorAll(':scope > li'), function (li) {
              return '<li>' + CHECK + '<span>' + li.innerHTML + '</span></li>';
            }).join('') + '</ul>';
          } else {
            body += '<div class="pdp-m__txt">' + node.outerHTML + '</div>';
          }
          return;
        }
        if (node.tagName === 'TABLE') {
          flushParagraphs();
          var rows = Array.prototype.slice.call(node.rows);
          var twoCols = rows.every(function (row) { return row.cells.length === 2; });
          if (key === 'spec' || (twoCols && key !== 'size')) {
            body += '<dl class="pdp-m__spec">' + rows.map(function (row) {
              return '<dt>' + row.cells[0].innerHTML.replace(/:\s*$/, '') + '</dt><dd>' + row.cells[1].innerHTML + '</dd>';
            }).join('') + '</dl>';
          } else {
            var dual = /cm\s*\/\s*pollici|cm\s*\/\s*inch/i.test(rows[0] ? rows[0].textContent : '');
            if (dual) body += '<div class="pdp-m__unit" role="group" aria-label="' + T('unit') + '"><button type="button" aria-pressed="true" data-unit="cm">cm</button><button type="button" aria-pressed="false" data-unit="in">' + T('inches') + '</button></div>';
            node.removeAttribute('style');
            node.querySelectorAll('[style]').forEach(function (cell) { cell.removeAttribute('style'); });
            body += '<div class="pdp-m__tw">' + node.outerHTML + '</div>';
          }
          return;
        }
        if (/^⚠️?\s*IMPORTANTE/i.test(text) || /^IMPORTANTE/i.test(text)) {
          flushParagraphs();
          body += '<div class="pdp-m__warn">' + WARN + '<span>' + node.innerHTML.replace(/⚠️\s*/, '') + '</span></div>';
          return;
        }
        paragraphs += node.outerHTML;
      });
      flushParagraphs();
      tabs.push({ key: key, title: section.title });
      html += '<section class="pdp-m__sec" id="pdp-sec-' + key + '" data-pdp-section="' + key + '" role="tabpanel"' + (tabs.length > 1 ? ' hidden' : '') + '>' + body + '</section>';
    });

    // Dernier paragraphe d'information (après les photos) : petite note en italique.
    if (photos.length) {
      var shown = photos.slice(0, 6);
      html += '<section class="pdp-m__sec" id="pdp-sec-photo" data-pdp-section="photo" role="tabpanel"' + (tabs.length ? ' hidden' : '') + '><div class="pdp-m__media">' + shown.map(function (src, i) {
        var more = i === 5 && photos.length > 6 ? '<span class="pdp-m__more2">+' + (photos.length - 6) + '</span>' : '';
        return '<button type="button" data-pdp-photo="' + i + '" aria-label="' + T('photo_n', { number: i + 1 }) + '"><img src="' + src + '" alt="" loading="lazy">' + more + '</button>';
      }).join('') + '</div></section>';
      tabs.push({ key: 'photo', title: T('photos') });
    }

    var tabsHtml = '<nav class="pdp-m__tabs" aria-label="' + T('desc_sections') + '"><div class="pdp-m__tabs-in" role="tablist">' + tabs.map(function (tab, i) {
      return '<button type="button" class="pdp-m__tab" role="tab" aria-selected="' + (i === 0) + '" data-pdp-tab="' + tab.key + '">' + tab.title + '</button>';
    }).join('') + '<i class="pdp-m__ind" data-pdp-ind></i></div></nav>';
    descBox.innerHTML = tabsHtml + html;

    // Note finale (paragraphe après les photos dans la description) : en italique sous la dernière section de texte.
    descBox.querySelectorAll('.pdp-m__sec[data-pdp-section="spec"] .pdp-m__txt').forEach(function (txt) {
      txt.classList.add('pdp-m__note');
    });

    setupTabs();
    setupSizeTable();
    setupLightbox();
  };

  // Vrais onglets : seule la section de l'onglet choisi est affichée (page plus courte ; les sections cachées,
  // et leurs photos, ne sont dessinées / téléchargées qu'à l'ouverture de leur onglet).
  var openDescTab = null;
  var setupTabs = function () {
    var tabs = Array.prototype.slice.call(descBox.querySelectorAll('[data-pdp-tab]'));
    var sections = Array.prototype.slice.call(descBox.querySelectorAll('[data-pdp-section]'));
    var indicator = descBox.querySelector('[data-pdp-ind]');
    var tabsIn = descBox.querySelector('.pdp-m__tabs-in');
    var activate = function (key) {
      sections.forEach(function (section) {
        section.hidden = section.getAttribute('data-pdp-section') !== key;
      });
      tabs.forEach(function (tab) {
        var on = tab.getAttribute('data-pdp-tab') === key;
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on) {
          indicator.style.width = tab.offsetWidth + 'px';
          indicator.style.transform = 'translateX(' + tab.offsetLeft + 'px)';
          tabsIn.scrollTo({ left: tab.offsetLeft - (tabsIn.clientWidth - tab.offsetWidth) / 2, behavior: 'smooth' });
        }
      });
    };
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () { activate(tab.getAttribute('data-pdp-tab')); });
    });
    if (tabs[0]) activate(tabs[0].getAttribute('data-pdp-tab'));
    // Utilisé par « Guida alle taglie » : ouvre l'onglet et descend jusqu'aux onglets.
    openDescTab = function (key) {
      if (!descBox.querySelector('[data-pdp-section="' + key + '"]')) return false;
      activate(key);
      descBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return true;
    };
  };

  // Tableau des tailles : bascule cm / pollici et ligne de la taille choisie surlignée.
  var setupSizeTable = function () {
    var table = descBox.querySelector('[data-pdp-section="size"] .pdp-m__tw table');
    if (!table) return;
    var cells = [];
    Array.prototype.forEach.call(table.rows, function (row, r) {
      Array.prototype.forEach.call(row.cells, function (cell, c) {
        if (c === 0) return;
        var text = cell.textContent.trim();
        var parts = text.split(/\s*\/\s*/);
        if (r === 0) {
          cells.push({ cell: cell, cm: text.replace(/\(\s*cm\s*\/\s*(pollici|inch(es)?)\s*\)/i, '(cm)'), inch: text.replace(/\(\s*cm\s*\/\s*(pollici|inch(es)?)\s*\)/i, '(' + T('inches') + ')') });
        } else if (parts.length === 2 && /cm/i.test(parts[0])) {
          cells.push({ cell: cell, cm: parts[0], inch: parts[1] });
        }
      });
    });
    var unitButtons = descBox.querySelectorAll('[data-unit]');
    var setUnit = function (unit) {
      cells.forEach(function (item) { item.cell.textContent = unit === 'in' ? item.inch : item.cm; });
      unitButtons.forEach(function (button) { button.setAttribute('aria-pressed', button.getAttribute('data-unit') === unit ? 'true' : 'false'); });
    };
    if (unitButtons.length) {
      setUnit('cm');
      unitButtons.forEach(function (button) {
        button.addEventListener('click', function () { setUnit(button.getAttribute('data-unit')); });
      });
    }
    highlightSize();
  };
  var highlightSize = function () {
    if (!descBox) return;
    var table = descBox.querySelector('[data-pdp-section="size"] .pdp-m__tw table');
    if (!table) return;
    var values = selectedValues();
    Array.prototype.forEach.call(table.rows, function (row, r) {
      var label = row.cells[0] ? row.cells[0].textContent.trim() : '';
      row.classList.toggle('is-selected', r > 0 && values.indexOf(label) !== -1);
    });
  };

  // Visionneuse des photos de la description.
  var setupLightbox = function () {
    var box = root.querySelector('[data-pdp-lightbox]');
    var track = box && box.querySelector('[data-pdp-lb-slides]');
    var count = box && box.querySelector('[data-pdp-lb-count]');
    if (!box || !photos.length) return;
    document.body.appendChild(box);
    track.innerHTML = photos.map(function (src) { return '<div><img src="' + src + '" alt="" loading="lazy"></div>'; }).join('');
    var index = 0;
    var show = function (i, smooth) {
      index = Math.max(0, Math.min(photos.length - 1, i));
      track.scrollTo({ left: index * track.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
      count.textContent = (index + 1) + ' / ' + photos.length;
    };
    track.addEventListener('scroll', function () {
      var i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      if (i !== index) { index = i; count.textContent = (index + 1) + ' / ' + photos.length; }
    }, { passive: true });
    var close = function () { box.hidden = true; document.body.style.overflow = ''; };
    descBox.addEventListener('click', function (event) {
      var photo = event.target.closest('[data-pdp-photo]');
      if (!photo) return;
      box.hidden = false;
      document.body.style.overflow = 'hidden';
      show(Number(photo.getAttribute('data-pdp-photo')), false);
    });
    box.querySelector('[data-pdp-lb-close]').addEventListener('click', close);
    box.querySelectorAll('[data-pdp-lb-step]').forEach(function (button) {
      button.addEventListener('click', function () { show(index + Number(button.getAttribute('data-pdp-lb-step')), true); });
    });
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && !box.hidden) close(); });
  };

  buildDescription();

  /* ---------- Avis : le bloc de l'app d'avis (Ali Reviews) est placé dans la section « Recensioni » ---------- */
  var reviewsSlot = root.querySelector('[data-pdp-reviews-slot]');
  var reviewsBlock = document.querySelector('.shopify-app-block[id*="ali_reviews_widget_box"]');
  if (reviewsSlot && reviewsBlock) {
    reviewsSlot.appendChild(reviewsBlock);
    var fallback = root.querySelector('[data-pdp-reviews-fallback]');
    if (fallback) fallback.hidden = true;
    // Note et nombre d'avis de l'app, repris dans la carte prix (« ★ 4,6 · 111 recensioni »).
    // L'app remplit son bloc en différé (souvent quand on s'en approche) : on attend son contenu.
    var rateLink = root.querySelector('.pdp-m__rate');
    var readAppRating = function () {
      var average = reviewsBlock.querySelector('.alr-wh-rating-star-average');
      // Nombre d'avis lu dans son propre élément (dans le texte global il est collé à la note « 4.6 »).
      var countEl = Array.prototype.find.call(reviewsBlock.querySelectorAll('*'), function (el) {
        return el.children.length === 0 && /^\s*\d+\s+(recension|review)/i.test(el.textContent);
      });
      var countMatch = countEl && countEl.textContent.match(/(\d+)/);
      var value = average ? parseFloat(average.textContent.replace(',', '.')) : NaN;
      if (!rateLink || isNaN(value) || !countMatch || Number(countMatch[1]) === 0) return false;
      var shown = value.toLocaleString(document.documentElement.lang || 'it', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      rateLink.innerHTML = '<span class="pdp-m__rst" aria-label="' + T('rating_out_of', { rating: shown }) + '"><i style="width:' + (value * 20) + '%"></i></span>'
        + shown + ' · ' + T(Number(countMatch[1]) === 1 ? 'reviews_one' : 'reviews_other', { count: countMatch[1] });
      return true;
    };
    if (!readAppRating()) {
      var ratingObserver = new MutationObserver(function () {
        if (readAppRating()) ratingObserver.disconnect();
      });
      ratingObserver.observe(reviewsBlock, { childList: true, subtree: true, characterData: true });
    }
  }
  root.querySelectorAll('[data-pdp-goto-reviews]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      var section = document.getElementById('pdp-reviews');
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ---------- Potrebbe piacerti anche : recommandations Shopify ---------- */
  var related = root.querySelector('[data-pdp-related]');
  if (related) {
    var loadRelated = function () {
      fetch(related.getAttribute('data-url'), { credentials: 'same-origin' })
        .then(function (response) {
          if (!response.ok) throw new Error('Recommendations ' + response.status);
          return response.json();
        })
        .then(function (data) {
          var products = (data && data.products) || [];
          if (!products.length) return;
          related.querySelector('[data-pdp-rail]').innerHTML = products.map(function (product) {
            var sale = product.compare_at_price > product.price;
            var off = sale ? Math.round((product.compare_at_price - product.price) * 100 / product.compare_at_price) : 0;
            var image = product.featured_image ? product.featured_image + (product.featured_image.indexOf('?') === -1 ? '?' : '&') + 'width=360' : '';
            var title = String(product.title).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
            return '<a class="pdp-m__rc" href="' + product.url + '"><span class="pdp-m__pp">' + (image ? '<img src="' + image + '" alt="" loading="lazy">' : '') + (sale ? '<i>-' + off + '%</i>' : '') + '</span><p>' + title + '</p><div class="pdp-m__pr' + (sale ? ' is-sale' : '') + '">' + money(product.price) + (sale ? '<s>' + money(product.compare_at_price) + '</s>' : '') + '</div></a>';
          }).join('');
          related.hidden = false;
        })
        .catch(function (error) { console.warn('[PDP mobile]', error); });
    };
    if ('IntersectionObserver' in window) {
      var relatedObserver = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        relatedObserver.disconnect();
        loadRelated();
      }, { rootMargin: '600px 0px' });
      relatedObserver.observe(document.getElementById('pdp-reviews') || related);
    } else {
      loadRelated();
    }
  }

  /* ---------- Barre d'achat fixe : variante + prix ; cachée quand le gros bouton est visible ---------- */
  var buy = root.querySelector('[data-pdp-buy]');
  var mainCta = root.querySelector('.pdp-m__cta');
  if (buy) {
    if (mainCta && 'IntersectionObserver' in window) {
      // Comme le prototype : barre toujours visible, sauf quand le gros bouton « Aggiungi al carrello » est à l'écran.
      new IntersectionObserver(function (entries) {
        buy.classList.toggle('is-hidden', entries[0].isIntersecting);
      }).observe(mainCta);
    }
    buy.querySelector('[data-pdp-to-options]').addEventListener('click', function () {
      var target = document.getElementById('pdp-variants') || mainCta;
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    buy.querySelectorAll('[data-pdp-add]').forEach(function (button) {
      button.addEventListener('click', function () {
        var submit = document.querySelector('#main-product form[action*="/cart/add"] [type="submit"]');
        if (submit) submit.click();
      });
    });
  }

  /* ---------- Klarna : message officiel de l'app Klarna On-site Messaging (bloc « Klarna Placement » de la fiche)
     à la place de notre ligne calculée (prix ÷ 3), qui ne connaît pas les montants min / max de Klarna.
     Sans le bloc (app retirée), notre ligne reste affichée. ---------- */
  var klarnaPlacement = null;
  var klarnaRow = root.querySelector('.pdp-m__kl');
  var klarnaBlock = document.querySelector('#main-product .shopify-block[id*="klarna"]');
  if (klarnaRow && klarnaBlock && klarnaBlock.querySelector('klarna-placement')) {
    var klarnaHolder = document.createElement('div');
    klarnaHolder.className = 'pdp-m__klo';
    klarnaHolder.appendChild(klarnaBlock);
    klarnaRow.replaceWith(klarnaHolder);
    klarnaPlacement = klarnaBlock.querySelector('klarna-placement');
  }

  /* ---------- Bouton de paiement dynamique (Shop Pay, PayPal, Apple Pay… : réglage « bouton de paiement dynamique »
     du bloc « Buy button ») sous notre bouton « Aggiungi al carrello ». Il est rendu dans l'ancien formulaire du thème,
     plus bas dans la page, et lit la variante dans le formulaire qui l'entoure : on le place dans un formulaire jumeau
     (mêmes champs, y compris ceux ajoutés par les apps) dont la variante et la quantité suivent le vrai formulaire.
     Le bouton est déplacé, jamais masqué. ---------- */
  var dynamicSync = null;
  (function () {
    var realForm = document.querySelector('#main-product form[action*="/cart/add"]');
    var dynamic = realForm && realForm.querySelector('.overlay-dynamic_buy_button');
    var cta = root.querySelector('.pdp-m__cta');
    if (!dynamic || !cta) return;
    // Sans adresse /cart/add : le bouton Shopify lit seulement les champs du formulaire qui l'entoure
    // (closest('form')), et le thème, les apps et ce script continuent de trouver le vrai formulaire.
    var twin = document.createElement('form');
    twin.className = 'pdp-m__express';
    twin.addEventListener('submit', function (event) { event.preventDefault(); });
    var fields = {};
    function copyField(source) {
      if (!source.name || fields[source.name] || source.type === 'radio' || source.type === 'checkbox' || source.type === 'file') return;
      var input = document.createElement('input');
      input.type = 'hidden';
      input.name = source.name;
      input.value = source.value;
      fields[source.name] = { input: input, source: source };
      twin.appendChild(input);
    }
    realForm.querySelectorAll('input, select, textarea').forEach(copyField);
    twin.appendChild(dynamic);
    cta.insertAdjacentElement('afterend', twin);
    // Variante, quantité et champs des apps recopiés tant qu'ils changent (simple lecture de valeurs).
    // Le thème remplace le vrai formulaire quand la variante change : on le recherche à chaque fois.
    dynamicSync = function () {
      var live = document.querySelector('#main-product form[action*="/cart/add"]') || realForm;
      Object.keys(fields).forEach(function (name) {
        var field = fields[name];
        var source = live.querySelector('[name="' + name.replace(/"/g, '\\"') + '"]:not([type="radio"]):not([type="checkbox"])');
        if (source && field.input.value !== source.value) field.input.value = source.value;
      });
      live.querySelectorAll('input, select, textarea').forEach(copyField);
    };
    document.addEventListener('input', dynamicSync);
    document.addEventListener('change', dynamicSync);
    window.setInterval(function () {
      if (!document.hidden) dynamicSync();
    }, 500);
  })();

  /* ---------- Mise à jour quand la variante change ---------- */
  function onVariantChange(variant) {
    if (dynamicSync) dynamicSync();
    updateShipping(variant.price);
    syncOptions();
    highlightSize();
    updateTotals();
    if (buy) {
      buy.querySelector('[data-pdp-buy-variant]').textContent = variant.title || '';
      buy.querySelector('[data-pdp-buy-price]').textContent = money(variant.price);
    }
    // Message officiel : Klarna le recalcule quand le montant change.
    if (klarnaPlacement && klarnaPlacement.getAttribute('data-purchase-amount') !== String(variant.price)) {
      klarnaPlacement.setAttribute('data-purchase-amount', String(variant.price));
    }
    var klarna = root.querySelector('[data-pdp-klarna]');
    if (klarna) klarna.textContent = T('klarna_installments', { amount: money(Math.round(variant.price / 3)) });
  }
  updateTotals();
})();
