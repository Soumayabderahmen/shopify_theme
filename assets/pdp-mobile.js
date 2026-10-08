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

  /* Badges de marque des produits de marque (snippets/prodducts--brand-popap.liquid : « Negozio Ufficiale del Marchio »,
     snippets/badge--brand-products.liquid : « Official Store · Star seller · Brand Official ») : rendus dans l'ancien
     formulaire du thème, bas de page ; placés sous les vignettes. Déplacés, pas copiés : la flèche garde
     l'ouverture du tiroir des produits de la marque. */
  (function () {
    var thumbs = root.querySelector('.pdp-m__thumbs');
    var store = document.querySelector('#main-product .f8pr .brand-badges-container');
    var strip = document.querySelector('#main-product .f8pr .badge-scroll-wrapper');
    if (!thumbs || (!store && !strip)) return;
    var box = document.createElement('div');
    box.className = 'pdp-m__brand';
    if (store) box.appendChild(store);
    if (strip) box.appendChild(strip);
    thumbs.insertAdjacentElement('afterend', box);
  })();

  /* « Riscuoti » : ajoute le vrai code au panier (/cart/update.js, en gardant les codes déjà saisis) ; Shopify le reprend
     au checkout. « Appliqué ✓ » seulement si Shopify enregistre le code et le confirme (discount_codes[].applicable,
     ou panier encore vide). /discount/<code> n'est pas utilisé : en local, shopify theme dev ne le sert pas. La copie dans le
     presse-papiers est un bonus (elle peut être refusée ou rester bloquée selon le navigateur). */
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
      var code = root.getAttribute('data-coupon-code');
      if (!code || claim.classList.contains('is-done')) return;
      copyText(code).catch(function (error) {
        console.warn('[PDP mobile] Coupon copy failed', error);
      });
      var shopRoot = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
      var readJson = function (response) {
        if (!response.ok) throw new Error('Cart request failed with status ' + response.status);
        return response.json();
      };
      claim.disabled = true;
      fetch(shopRoot + 'cart.js', { credentials: 'same-origin' }).then(readJson).then(function (cart) {
        var codes = (cart.discount_codes || []).map(function (item) { return item.code; });
        if (codes.indexOf(code) === -1) codes.push(code);
        return fetch(shopRoot + 'cart/update.js', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ discount: codes.join(',') })
        }).then(readJson);
      }).then(function (cart) {
        // Panier vide : Shopify garde le code mais le dit « non applicable » tant qu'il n'y a rien à réduire.
        var applied = (cart.discount_codes || []).some(function (item) {
          return item.code === code && (item.applicable || cart.item_count === 0);
        });
        if (!applied) throw new Error('Discount code not applicable: ' + code);
        claim.textContent = T('coupon_applied');
        claim.classList.add('is-done');
      }).catch(function (error) {
        console.error('[PDP mobile] Coupon apply failed', error);
        claim.disabled = false;
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
    // Même format que les prix du Liquid (snippets/mobile-i18n.liquid) : pas de « €46,59 » qui devient « 46,59 € ».
    if (window.mobileMoney) return window.mobileMoney(cents);
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
  /* Variante choisie ici : écrite tout de suite dans le formulaire du thème. Après un choix, le thème recharge son
     formulaire depuis le serveur (~4 s sur mobile) ; pendant ce temps son champ « id » gardait l'ancienne variante
     et « Aggiungi al carrello » ajoutait l'ancienne taille. La variante vient des vraies variantes du produit
     (data-pdp-variants) ; elle est réécrite jusqu'à ce que le thème ait remplacé son formulaire avec la même. */
  var chosenVariant = null;
  var chosenForm = null;
  // Quantité choisie (définie plus bas, avec les boutons − / +) ; vide tant qu'elle n'est pas prête.
  var applyQuantity = function () {};
  // Champs cachés ajoutés au formulaire par les apps (ex. Ali Reviews : properties[_visitor_id], pour relier l'achat
  // au visiteur) : ajoutés une seule fois au chargement, ils disparaissaient quand le thème refait son formulaire.
  // On les retient et on les remet dans le nouveau formulaire.
  var appFields = {};
  var keepAppFields = function () {
    var form = currentForm();
    if (!form) return;
    form.querySelectorAll('input[type="hidden"][name^="properties["], input[type="hidden"][name^="attributes["]').forEach(function (input) {
      if (input.value) appFields[input.name] = input.value;
    });
    Object.keys(appFields).forEach(function (name) {
      if (form.querySelector('[name="' + name.replace(/"/g, '\\"') + '"]')) return;
      var input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = appFields[name];
      form.appendChild(input);
    });
  };
  var currentForm = function () {
    return document.querySelector('#main-product form[action*="/cart/add"]');
  };
  // Choix lu sur nos boutons, pas sur les boutons du thème : pendant qu'il recharge son formulaire, le thème
  // remet parfois l'ancienne valeur (couleur puis taille touchées vite : la couleur était perdue).
  var chooseVariant = function (index, value) {
    var wanted = chosenVariant ? chosenVariant.options.slice() : selectedValues();
    wanted[index] = value;
    var match = variants.find(function (variant) {
      return variant.options && variant.options.every(function (optionValue, i) { return optionValue === wanted[i]; });
    });
    if (!match) return;
    chosenVariant = match;
    chosenForm = currentForm();
    applyChosenVariant();
  };
  var applyChosenVariant = function () {
    if (!chosenVariant) return;
    var form = currentForm();
    if (!form) return;
    var inputs = form.querySelectorAll('[name="id"]');
    // Formulaire refait par le thème avec la variante choisie : il est à jour, on le laisse faire.
    if (form !== chosenForm && Array.prototype.every.call(inputs, function (input) { return String(input.value) === String(chosenVariant.id); })) {
      chosenVariant = null;
      return;
    }
    // Formulaire refait avec une autre variante (réponse d'un choix précédent) : on recoche le choix du client
    // dans ce nouveau formulaire, une seule fois par formulaire, pour que le thème le rattrape.
    if (form !== chosenForm) {
      chosenForm = form;
      themeOptionGroups().forEach(function (group, i) {
        var radio = group.find(function (item) { return radioValue(item) === chosenVariant.options[i]; });
        if (radio && !radio.checked) radio.click();
      });
      form = currentForm() || form;
      inputs = form.querySelectorAll('[name="id"]');
    }
    inputs.forEach(function (input) {
      if (String(input.value) !== String(chosenVariant.id)) input.value = String(chosenVariant.id);
    });
  };
  if (idInput) {
    // Le thème met à jour l'identifiant de variante après coup, sans événement fiable : on le compare
    // régulièrement (simple lecture d'une valeur, coût négligeable), seulement quand la page est visible.
    window.setInterval(function () {
      if (document.hidden) return;
      applyChosenVariant();
      applyQuantity();
      keepAppFields();
      showVariant();
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
  // Produit à une seule option avec photos : le thème affiche des vignettes « variant-id » (valeur = id de variante,
  // nom de l'option dans title) au lieu des boutons options[…].
  var radioValue = function (radio) {
    return radio.name === 'variant-id' ? radio.title : radio.value;
  };
  var themeOptionGroups = function () {
    var groups = [];
    var names = [];
    var radios = document.querySelectorAll('#main-product input[type="radio"][name^="options["]');
    if (!radios.length) radios = document.querySelectorAll('#main-product input[type="radio"][name="variant-id"]');
    radios.forEach(function (radio) {
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
      return checked ? radioValue(checked) : null;
    });
  };
  var syncOptions = function () {
    if (!optionsCard) return;
    // Choix en cours d'application par le thème : on affiche le choix du client.
    var selected = chosenVariant ? chosenVariant.options.slice() : selectedValues();
    optionsCard.querySelectorAll('[data-option-index]').forEach(function (block) {
      var index = Number(block.getAttribute('data-option-index'));
      var value = selected[index];
      var name = block.querySelector('[data-pdp-option-name]');
      // Couleurs : nom affiché sans le code fournisseur répété (setupColors) ; sinon la valeur telle quelle.
      if (name && value) name.textContent = (block.pdpNames && block.pdpNames[value]) || value;
      var buttons = Array.prototype.slice.call(block.querySelectorAll('[data-value]'));
      var matches = buttons.map(function (button) {
        var combination = selected.slice();
        combination[index] = button.getAttribute('data-value');
        return variants.find(function (variant) {
          return variant.options && variant.options.every(function (optionValue, i) { return optionValue === combination[i]; });
        });
      });
      // Prix de chaque valeur (avec les autres options choisies), seulement quand il change d'une valeur à l'autre :
      // le client voit avant de toucher que la taille 44 coûte plus que la 38. Le moins cher en vert.
      var prices = matches.filter(Boolean).map(function (match) { return match.price; });
      var varies = prices.some(function (price) { return price !== prices[0]; });
      var lowest = varies ? Math.min.apply(null, prices) : null;
      block.classList.toggle('has-prices', varies);
      buttons.forEach(function (button, i) {
        var match = matches[i];
        button.setAttribute('aria-checked', button.getAttribute('data-value') === value ? 'true' : 'false');
        // Épuisé avec les autres options choisies : barré (comme le prototype).
        button.classList.toggle('is-unavailable', !match || !match.available);
        var tag = button.querySelector('.pdp-m__vp');
        if (!varies || !match) {
          if (tag) tag.remove();
          return;
        }
        if (!tag) {
          tag = document.createElement('span');
          tag.className = 'pdp-m__vp';
          button.appendChild(tag);
        }
        tag.textContent = money(match.price);
        tag.classList.toggle('is-low', match.price === lowest);
      });
    });
    if (sizeUi) paintSize();
  };
  /* ---------- Taille (prototype « taille v2 ») : "36 weight 82-90kg" -> gros « 36 » + petit « 82–90 kg », tailles
     triées, grille de 4, conseil selon le poids (ou la hauteur) saisi, règle graduée, badges « Per te » / « Ultimi N ». ---------- */
  var SIZE_NOISE = /\b(asian|asia|chn|china|eu|size|taglia|weight|peso|fit|for|adult|height|altezza|tall)\b/gi;
  var FIT_KEY = 'platinumshop:fit:v1';
  var INFO_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.01"/></svg>';
  var sizeUi = null;
  var escapeText = function (text) {
    return String(text).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };
  var sizeRank = function (code) {
    var c = String(code).toUpperCase();
    var fixed = { XXXS: -1, XXS: 0, XS: 1, S: 2, M: 3, L: 4, XL: 5, XXL: 6, XXXL: 7, XXXXL: 8, XXXXXL: 9 };
    if (fixed[c] !== undefined) return fixed[c];
    var many = c.match(/^(\d{1,2})XL$/);
    return many ? 4 + Number(many[1]) : null;
  };
  // "Asian L 61-70KG", "XL(50-60KG)", "CHN 3XL (75-83kg)", "L fit 174-183CM"… -> { code, lo, hi, unit }.
  // Les dimensions d'objets ("20-20-10cm") ne sont pas des tailles.
  var parseSize = function (raw) {
    var text = String(raw).trim();
    var size = { raw: raw, code: text };
    if (/\d+(?:\.\d+)?\s*[-–x×*]\s*\d+(?:\.\d+)?\s*[-–x×*]\s*\d+/i.test(text)) return size;
    // Unité après le second nombre ("61-70KG") ou collée au premier ("65KG-75KG") ; décimales gardées ("75-82.5KG").
    var match = text.match(/(\d{2,3}(?:[.,]\d)?)\s*(kg|cm)?\s*[-–~]\s*(\d{2,3}(?:[.,]\d)?)\s*\)?\s*(kg|cm)?(?![a-z\d])/i);
    if (!match) {
      // "Asian M" sans plage : « M » sur le bouton, « taglie asiatiche » dit une seule fois au-dessus.
      // "Asian M", "CHN size XL", "4XL Asian size".
      var plain = text.match(/^(?:asian|asia|chn|china)(?:\s*size)?\s+(\S+)$/i) || text.match(/^(\S+)\s+(?:asian|asia|chn|china)(?:\s*size)?$/i);
      if (plain && sizeRank(plain[1]) !== null) return { raw: raw, code: plain[1].toUpperCase() };
      // Pointures "EU:42", "US 9.5" : « 42 » en gros, « EU » en petit.
      var shoe = text.match(/^(EU|US|UK|CN|JP|BR)\s*[:\-]?\s*(\d{1,2}(?:[.,]5)?)$/i);
      return shoe ? { raw: raw, code: shoe[2], note: shoe[1].toUpperCase() } : size;
    }
    var lo = Number(match[1].replace(',', '.'));
    var hi = Number(match[3].replace(',', '.'));
    if (!(hi > lo)) return size;
    var outside = text.slice(0, match.index) + ' ' + text.slice(match.index + match[0].length);
    // Plage de poids : hauteur ("M (160cm 50-60kg)", "175-L(45-55KG") et livres ("XXL 60-80Kg 175lbs") gardées sous la plage.
    // Plage en cm ("150 for 140-145cm") : le nombre à 3 chiffres est le nom de la taille, pas une hauteur.
    var weightRange = /kg/i.test(match[4] || match[2] || '') || (!(match[4] || match[2]) && hi <= 130);
    var height = weightRange ? outside.match(/(\d{3})\s*cm/i) || outside.match(/(?:^|[\s(\-–])(\d{3})(?=[\s)\-–]|$)/) : null;
    var pounds = outside.match(/(\d{2,3})\s*lbs?\b/i);
    var rest = outside
      .replace(/\d{2,3}\s*(?:cm|lbs?)\b/gi, ' ')
      .replace(SIZE_NOISE, ' ')
      .replace(/[()[\]{}:,]/g, ' ');
    var parts = rest.split(/[\s\-–]+/).filter(function (part) { return part && !(height && part === height[1]); });
    var letter = parts.filter(function (part) { return sizeRank(part) !== null; })[0];
    var code = letter ? letter.toUpperCase() : parts.join(' ');
    var unit = match[4] || match[2] ? (match[4] || match[2]).toLowerCase() : null;
    // Plage sans unité ("XXL 175-185") : seulement avec une vraie taille ; au-dessus de 130, c'est une hauteur.
    if (!unit) {
      if (!letter) return size;
      unit = hi > 130 ? 'cm' : 'kg';
    }
    return { raw: raw, code: code || lo + '–' + hi, lo: lo, hi: hi, unit: unit, bare: !code, extra: [height && unit === 'kg' ? height[1] + ' cm' : '', pounds ? pounds[1] + ' lbs' : ''].filter(Boolean).join(' · ') };
  };
  // Repère de tri : lettre de taille (« XS(26) », « XS（old） ») ou premier nombre (« 43(Foot26.5cm) », « 47 1/3 »,
  // « US30-IT46 », « 29 Waist 73cm », « Asian Sizes 38 »). Les lettres collées au nombre font partie du repère :
  // « 12M » (mois) et « 3T » (années) ne sont pas mélangés.
  var orderKey = function (size) {
    var rank = sizeRank(size.code);
    if (rank !== null) return { kind: 'rank', value: rank };
    var text = String(size.raw).trim().replace(/^(?:asian|asia|chn|china)\s+(?:sizes?\s+)?/i, '');
    var letter = text.match(/^(\d{0,2}X{0,6}[SL]|M)(?![a-z])/i);
    if (letter && sizeRank(letter[1]) !== null) return { kind: 'rank', value: sizeRank(letter[1]) };
    var number = String(/\d/.test(size.code) ? size.code : text).match(/(\d+(?:[.,]\d+)?)(?:\s+(\d)\/(\d))?([a-z]{0,4})/i);
    if (!number) return null;
    return { kind: 'n' + number[4].toLowerCase(), value: parseFloat(number[1].replace(',', '.')) + (number[2] ? number[2] / number[3] : 0) };
  };
  // Ordre logique : par plage quand toutes en ont une, sinon par repère quand toutes ont le même type ; sinon ordre de la boutique.
  var sortSizes = function (sizes) {
    if (sizes.every(function (size) { return size.lo; })) {
      return sizes.slice().sort(function (a, b) { return a.lo - b.lo || a.hi - b.hi; });
    }
    var keys = sizes.map(orderKey);
    var kind = keys[0] && keys[0].kind;
    if (!kind || !keys.every(function (key) { return key && key.kind === kind; })) return sizes.slice();
    return sizes.map(function (size, index) { return { size: size, key: keys[index].value, index: index }; })
      .sort(function (a, b) { return a.key - b.key || a.index - b.index; })
      .map(function (entry) { return entry.size; });
  };
  var rangeText = function (size) {
    return (size.bare ? size.unit : size.lo + '–' + size.hi + ' ' + size.unit) + (size.extra ? ' · ' + size.extra : '');
  };
  /* ---------- Pointures (prototype « pointures ») : vraie longueur du pied du produit, jamais inventée (lecture partagée
     avec l'ajout rapide : window.sizeInfo.shoes, assets/size-info.js). Sans longueur réelle pour chaque pointure, la grille
     reste celle des tailles. ---------- */
  var shoeNumber = function (text) {
    return window.sizeInfo ? window.sizeInfo.shoeNumber(text) : null;
  };
  var shoeSizes = function (sizes) {
    if (!window.sizeInfo || !window.sizeInfo.shoes) return null;
    var source = root.querySelector('[data-pdp-desc-src]');
    var list = window.sizeInfo.shoes(sizes.map(function (size) { return size.raw; }), source ? source.innerHTML : '');
    return list && list.map(function (item) { return { raw: item.raw, code: item.code, foot: item.foot, shoe: true }; });
  };
  var footText = function (cm) {
    return Number(cm).toLocaleString(document.documentElement.lang || 'it', { maximumFractionDigits: 1 }) + ' cm';
  };
  var readFit = function () {
    try { return JSON.parse(window.localStorage.getItem(FIT_KEY)) || {}; } catch (error) { return {}; }
  };
  var saveFit = function (unit, value) {
    var fit = readFit();
    fit[unit] = value;
    try { window.localStorage.setItem(FIT_KEY, JSON.stringify(fit)); } catch (error) { /* stockage indisponible */ }
  };
  // Stock bas (1 à 3) de la variante qu'on obtiendrait avec cette taille et les autres options déjà choisies.
  var stockLeft = function (index, raw) {
    var combination = selectedValues();
    combination[index] = raw;
    var match = variants.find(function (variant) {
      return variant.options && variant.options.every(function (optionValue, i) { return optionValue === combination[i]; });
    });
    return match && match.available && match.inv > 0 && match.inv <= 3 ? match.inv : 0;
  };
  var setupSize = function () {
    var block = optionsCard && optionsCard.querySelector('[data-pdp-size]');
    var grid = block && block.querySelector('.pdp-m__sz');
    if (!grid) return;
    var buttons = Array.prototype.slice.call(grid.querySelectorAll('[data-value]'));
    var sizes = sortSizes(buttons.map(function (button) { return parseSize(button.getAttribute('data-value')); }));
    var shoes = shoeSizes(sizes);
    if (shoes) {
      setupShoe(block, grid, buttons, shoes);
      return;
    }
    var ranged = sizes.filter(function (size) { return size.lo; });
    // Valeurs longues sans plage (« 43(Foot26.5cm) », « 29 Waist 73cm », dimensions d'un sac) : puces et libellés
    // d'origine gardés, seulement remis dans l'ordre logique (ordre de la boutique si aucun ordre sûr).
    if (!ranged.length && !sizes.every(function (size) { return String(size.code).length <= 5; })) {
      sizes.forEach(function (size) {
        var chip = buttons.find(function (item) { return item.getAttribute('data-value') === size.raw; });
        if (chip) grid.appendChild(chip);
      });
      return;
    }
    var ui = { block: block, grid: grid, sizes: sizes, byRaw: {}, index: Number(block.getAttribute('data-option-index')), rec: null };
    // Deux valeurs différentes affichées pareil (doublon « Asian 3XL 77-83KG » / « Asian 3XL 77-83KG 1 ») : libellé complet.
    var shown = function (size) { return size.code + '|' + (size.lo ? rangeText(size) : size.note || ''); };
    var shownCount = {};
    sizes.forEach(function (size) { shownCount[shown(size)] = (shownCount[shown(size)] || 0) + 1; });
    sizes.forEach(function (size) {
      ui.byRaw[size.raw] = size;
      var button = buttons.find(function (item) { return item.getAttribute('data-value') === size.raw; });
      button.setAttribute('aria-label', size.raw);
      var small = size.lo ? rangeText(size) : size.note;
      button.innerHTML = shownCount[shown(size)] > 1
        ? '<b>' + escapeText(size.raw) + '</b>'
        : '<b>' + escapeText(size.code) + '</b>' + (small ? '<small>' + escapeText(small) + '</small>' : '');
      grid.appendChild(button);
    });
    grid.classList.add('pdp-m__sz--grid');
    if (sizes.some(function (size) { return size.note; })) grid.classList.add('pdp-m__sz--noted');
    if (ranged.length) {
      grid.classList.add('pdp-m__sz--ranged');
      // « Dimensione » avec de vraies tailles : libellé « Taglia » et guide des tailles visibles.
      if (!ui.asian && optionLabel && block.getAttribute('data-size-label')) optionLabel.textContent = block.getAttribute('data-size-label');
      var guide = block.querySelector('[data-pdp-size-guide]');
      if (guide) guide.hidden = false;
    }
    var unit = ranged.length && ranged.every(function (size) { return size.unit === ranged[0].unit; }) ? ranged[0].unit : null;
    // Seulement quand les valeurs du produit le disent (« Asian L… », « CHN XL… ») : « Taglia (asiatica) ».
    ui.asian = sizes.some(function (size) { return /\b(asian|asia|chn|china)\b/i.test(size.raw); });
    var optionLabel = block.querySelector('[data-pdp-option-label]');
    if (ui.asian && optionLabel && block.getAttribute('data-size-label')) {
      optionLabel.textContent = T('pdp_sz_label_asian', { label: block.getAttribute('data-size-label') });
    }
    if (!unit && ui.asian) {
      var note = document.createElement('div');
      note.className = 'pdp-m__asn';
      note.innerHTML = '<div class="pdp-m__asn-h">' + INFO_ICON + '<span>' + T('pdp_sz_asian_html') + '</span></div>';
      block.insertBefore(note, grid);
    }
    if (unit) {
      ui.unit = unit;
      ui.min = Math.min.apply(null, ranged.map(function (size) { return size.lo; }));
      ui.max = Math.max.apply(null, ranged.map(function (size) { return size.hi; }));
      var asian = sizes.some(function (size) { return /\b(asian|asia|chn|china)\b/i.test(size.raw); });
      var box = document.createElement('div');
      box.className = 'pdp-m__asn';
      box.innerHTML = '<div class="pdp-m__asn-h">' + INFO_ICON + '<span>' + (asian ? T('pdp_sz_asian_' + unit + '_html') : escapeText(T('pdp_sz_hint_' + unit))) + '</span></div>'
        + '<div class="pdp-m__asn-w"><label for="pdp-fit">' + escapeText(T(unit === 'kg' ? 'pdp_sz_your_weight' : 'pdp_sz_your_height')) + '</label>'
        + '<span class="pdp-m__asn-in"><input id="pdp-fit" type="number" inputmode="numeric" min="' + (unit === 'kg' ? 30 : 80) + '" max="' + (unit === 'kg' ? 200 : 230) + '" placeholder="—" aria-describedby="pdp-fit-res"><span>' + unit + '</span></span>'
        + '<span class="pdp-m__asn-r" id="pdp-fit-res" aria-live="polite"></span></div>';
      block.insertBefore(box, grid);
      ui.input = box.querySelector('input');
      ui.result = box.querySelector('.pdp-m__asn-r');
      var saved = readFit()[unit];
      if (saved) ui.input.value = saved;
      ui.input.addEventListener('input', function () {
        saveFit(unit, ui.input.value);
        paintSize();
      });
      // « Scegli » du conseil : même chemin qu'un toucher sur la taille.
      box.addEventListener('click', function (event) {
        var pick = event.target.closest('[data-pdp-fit-pick]');
        if (!pick) return;
        var target = buttons.find(function (item) { return item.getAttribute('data-value') === pick.getAttribute('data-pdp-fit-pick'); });
        if (target) target.click();
      });
      // Règle graduée : un segment par taille (largeur = plage), repère du poids saisi.
      if (ranged.length === sizes.length) {
        var rail = document.createElement('div');
        rail.className = 'pdp-m__szr';
        rail.setAttribute('aria-hidden', 'true');
        var segment = function (tag, size, content) {
          return '<' + tag + ' data-s="' + escapeText(size.raw) + '" style="flex:' + (size.hi - size.lo + 1) + '">' + content + '</' + tag + '>';
        };
        rail.innerHTML = '<div class="pdp-m__szr-wrap"><span class="pdp-m__szr-m" hidden></span><div class="pdp-m__szr-t">'
          + sizes.map(function (size) { return segment('i', size, ''); }).join('') + '</div></div>'
          + '<div class="pdp-m__szr-l">' + sizes.map(function (size) { return segment('span', size, escapeText(size.bare ? '' : size.code)); }).join('') + '</div>'
          + '<div class="pdp-m__szr-e"><span>' + ui.min + ' ' + unit + '</span><span>' + ui.max + ' ' + unit + '</span></div>';
        grid.parentNode.insertBefore(rail, grid.nextSibling);
        ui.rail = rail;
        ui.marker = rail.querySelector('.pdp-m__szr-m');
      }
    }
    sizeUi = ui;
  };
  // Taille conseillée : celle dont la plage contient la valeur saisie ; en haut de plage, on propose aussi la suivante.
  var suggestSize = function () {
    var ui = sizeUi;
    ui.rec = null;
    if (!ui.input) return;
    if (ui.shoe) {
      suggestShoe(ui);
      return;
    }
    var value = parseFloat(ui.input.value);
    var available = ui.sizes.filter(function (size) {
      var button = ui.grid.querySelector('[data-value="' + CSS.escape(size.raw) + '"]');
      return size.lo && button && !button.classList.contains('is-unavailable');
    });
    if (!value || value < (ui.unit === 'kg' ? 30 : 80) || !available.length) {
      ui.result.innerHTML = '';
      if (ui.marker) ui.marker.hidden = true;
      return;
    }
    var best = available.find(function (size) { return value >= size.lo && value <= size.hi + 0.99; });
    var outside = value < ui.min || value > ui.max + 0.99;
    if (!best) {
      var distance = function (size) { return Math.min(Math.abs(value - size.lo), Math.abs(value - size.hi)); };
      best = available.slice().sort(function (a, b) { return distance(a) - distance(b); })[0];
    }
    ui.rec = best.raw;
    var html;
    if (outside) {
      html = T('pdp_sz_out_html', { min: ui.min, max: ui.max, unit: ui.unit, size: escapeText(best.code) });
    } else {
      var next = available[available.indexOf(best) + 1];
      var edge = value >= best.hi - 1 && next;
      html = T('pdp_sz_rec_html', { size: escapeText(best.code) }) + (edge ? ' · ' + escapeText(T('pdp_sz_edge', { size: next.code })) : '');
    }
    if (selectedValues()[ui.index] !== best.raw) {
      html += ' <button type="button" data-pdp-fit-pick="' + escapeText(best.raw) + '">' + escapeText(T('pdp_sz_pick')) + '</button>';
    }
    ui.result.innerHTML = html;
    if (ui.marker) {
      ui.marker.hidden = false;
      ui.marker.style.left = (Math.max(0, Math.min(1, (value - ui.min) / (ui.max + 1 - ui.min))) * 100) + '%';
    }
  };
  var paintSize = function () {
    var ui = sizeUi;
    suggestSize();
    var value = selectedValues()[ui.index];
    var current = ui.byRaw[value];
    var name = ui.block.querySelector('[data-pdp-option-name]');
    if (name && current) {
      name.textContent = current.shoe ? current.code + ' · ' + T('pdp_sz_foot', { foot: footText(current.foot) }) : current.lo && !current.bare ? current.code + ' · ' + rangeText(current) : current.note ? current.note + ' ' + current.code : current.code;
    }
    ui.grid.querySelectorAll('[data-value]').forEach(function (button) {
      var raw = button.getAttribute('data-value');
      var left = raw === ui.rec ? 0 : stockLeft(ui.index, raw);
      var text = raw === ui.rec ? T('pdp_sz_for_you') : left ? T('pdp_sz_last', { count: left }) : '';
      var badge = button.querySelector('.pdp-m__bdg');
      if (!text) {
        if (badge) badge.remove();
        return;
      }
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'pdp-m__bdg';
        button.insertBefore(badge, button.firstChild);
      }
      badge.textContent = text;
      badge.classList.toggle('is-rec', raw === ui.rec);
    });
    if (ui.rail) {
      ui.rail.querySelectorAll('[data-s]').forEach(function (item) {
        item.classList.toggle('is-on', item.getAttribute('data-s') === value);
        item.classList.toggle('is-rec', item.getAttribute('data-s') === ui.rec);
      });
    }
  };
  // Pointures : grille de 5 (pointure en gros, longueur du pied en petit), conseil selon la longueur du pied saisie,
  // règle à segments égaux de la plus petite à la plus grande longueur.
  var setupShoe = function (block, grid, buttons, sizes) {
    var ui = { shoe: true, unit: 'foot', block: block, grid: grid, sizes: sizes, byRaw: {}, index: Number(block.getAttribute('data-option-index')), rec: null };
    sizes.forEach(function (size) {
      ui.byRaw[size.raw] = size;
      var button = buttons.find(function (item) { return item.getAttribute('data-value') === size.raw; });
      button.setAttribute('aria-label', size.raw);
      button.innerHTML = '<b>' + escapeText(size.code) + '</b><small>' + escapeText(footText(size.foot)) + '</small>';
      grid.appendChild(button);
    });
    grid.classList.add('pdp-m__sz--grid', 'pdp-m__sz--shoe');
    var label = block.querySelector('[data-pdp-option-label]');
    if (label) label.textContent = T('pdp_sz_shoe_label');
    var guide = block.querySelector('[data-pdp-size-guide]');
    if (guide) guide.hidden = false;
    var steps = sizes.slice(1).map(function (size, i) { return size.foot - sizes[i].foot; }).filter(function (step) { return step > 0; });
    ui.min = sizes[0].foot - (steps.length ? Math.min.apply(null, steps) : 0.5);
    ui.max = sizes[sizes.length - 1].foot;

    var box = document.createElement('div');
    box.className = 'pdp-m__asn';
    box.innerHTML = '<div class="pdp-m__asn-h">' + INFO_ICON + '<span>' + T('pdp_sz_shoe_hint_html') + '</span></div>'
      + '<div class="pdp-m__asn-w"><label for="pdp-fit">' + escapeText(T('pdp_sz_your_foot')) + '</label>'
      + '<span class="pdp-m__asn-in"><input id="pdp-fit" type="number" inputmode="decimal" min="15" max="35" step="0.1" placeholder="'
      + escapeText((24).toLocaleString(document.documentElement.lang || 'it', { minimumFractionDigits: 1 })) + '" aria-describedby="pdp-fit-res"><span>cm</span></span>'
      + '<span class="pdp-m__asn-r" id="pdp-fit-res" aria-live="polite"></span></div>';
    block.insertBefore(box, grid);
    ui.input = box.querySelector('input');
    ui.result = box.querySelector('.pdp-m__asn-r');
    var saved = readFit().foot;
    if (saved) ui.input.value = saved;
    ui.input.addEventListener('input', function () {
      saveFit('foot', ui.input.value);
      paintSize();
    });
    box.addEventListener('click', function (event) {
      var pick = event.target.closest('[data-pdp-fit-pick]');
      if (!pick) return;
      var target = buttons.find(function (item) { return item.getAttribute('data-value') === pick.getAttribute('data-pdp-fit-pick'); });
      if (target) target.click();
    });

    var rail = document.createElement('div');
    rail.className = 'pdp-m__szr';
    rail.setAttribute('aria-hidden', 'true');
    rail.innerHTML = '<div class="pdp-m__szr-wrap"><span class="pdp-m__szr-m" hidden></span><div class="pdp-m__szr-t">'
      + sizes.map(function (size) { return '<i data-s="' + escapeText(size.raw) + '" style="flex:1"></i>'; }).join('') + '</div></div>'
      + '<div class="pdp-m__szr-l">' + sizes.map(function (size) { return '<span data-s="' + escapeText(size.raw) + '" style="flex:1">' + escapeText(size.code) + '</span>'; }).join('') + '</div>'
      + '<div class="pdp-m__szr-e"><span>' + escapeText(footText(ui.min)) + '</span><span class="pdp-m__szr-c">' + escapeText(T('pdp_sz_foot_length')) + '</span><span>' + escapeText(footText(ui.max)) + '</span></div>';
    grid.parentNode.insertBefore(rail, grid.nextSibling);
    ui.rail = rail;
    ui.marker = rail.querySelector('.pdp-m__szr-m');
    sizeUi = ui;
  };
  // Pointure conseillée : la 1re (disponible) dont la longueur couvre le pied ; à 1,5 mm près de la limite, la suivante aussi.
  var suggestShoe = function (ui) {
    var value = parseFloat(String(ui.input.value).replace(',', '.'));
    var available = ui.sizes.filter(function (size) {
      var button = ui.grid.querySelector('[data-value="' + CSS.escape(size.raw) + '"]');
      return button && !button.classList.contains('is-unavailable');
    });
    if (!value || value < 15 || !available.length) {
      ui.result.innerHTML = '';
      ui.marker.hidden = true;
      return;
    }
    var best = available.find(function (size) { return size.foot >= value - 0.05; });
    var html;
    if (!best) {
      best = available[available.length - 1];
      html = T('pdp_sz_foot_long_html', { max: escapeText(footText(ui.max)), size: escapeText(best.code) });
    } else if (value < ui.min) {
      html = T('pdp_sz_foot_short_html', { size: escapeText(best.code) });
    } else {
      var next = available[available.indexOf(best) + 1];
      var edge = best.foot - value <= 0.15 && next;
      html = T('pdp_sz_shoe_rec_html', { size: escapeText(best.code) }) + (edge ? ' · ' + escapeText(T('pdp_sz_shoe_edge', { size: next.code })) : '');
    }
    ui.rec = best.raw;
    if (selectedValues()[ui.index] !== best.raw) {
      html += ' <button type="button" data-pdp-fit-pick="' + escapeText(best.raw) + '">' + escapeText(T('pdp_sz_pick')) + '</button>';
    }
    ui.result.innerHTML = html;
    ui.marker.hidden = false;
    ui.marker.style.left = (Math.max(0, Math.min(1, (value - ui.min) / (ui.max - ui.min))) * 100) + '%';
  };
  setupSize();

  /* ---------- Couleurs (comme l'ajout rapide) : noms sans le code fournisseur répété, « Vedi tutti » en grille,
     couleur choisie visible dans la rangée, aperçu de sa vraie photo quand la galerie est hors de l'écran. ---------- */
  var colorRows = optionsCard ? Array.prototype.slice.call(optionsCard.querySelectorAll('.pdp-m__sw')) : [];
  var centerChecked = function (list) {
    var checked = list.querySelector('[aria-checked="true"]');
    if (checked && !list.classList.contains('is-all')) list.scrollLeft = checked.offsetLeft - (list.clientWidth - checked.offsetWidth) / 2;
  };
  colorRows.forEach(function (list) {
    var block = list.closest('[data-option-index]');
    var buttons = Array.prototype.slice.call(list.querySelectorAll('[data-value]'));
    var values = buttons.map(function (button) { return button.getAttribute('data-value'); });
    block.pdpNames = window.sizeInfo && window.sizeInfo.shortNames ? window.sizeInfo.shortNames(values) : {};
    buttons.forEach(function (button) {
      var value = button.getAttribute('data-value');
      var label = button.querySelector('.pdp-m__n');
      if (label) label.textContent = block.pdpNames[value] || value;
      button.setAttribute('aria-label', value);
    });
    var toggle = block.querySelector('[data-pdp-colors-all]');
    if (toggle) {
      var text = toggle.querySelector('span');
      var more = text.textContent;
      toggle.addEventListener('click', function () {
        var open = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        list.classList.toggle('is-all', open);
        text.textContent = open ? toggle.getAttribute('data-less') : more;
        centerChecked(list);
      });
    }
    centerChecked(list);
  });
  // Titre de variante de la barre d'achat : couleur sans le code fournisseur répété, comme dans la carte des options.
  var variantLabel = function (variant) {
    return variant.options ? variant.options.map(function (value, i) {
      var block = optionsCard && optionsCard.querySelector('[data-option-index="' + i + '"]');
      return (block && block.pdpNames && block.pdpNames[value]) || value;
    }).join(' / ') : (variant.title || '');
  };
  var buyVariant = root.querySelector('[data-pdp-buy-variant]');
  if (buyVariant && colorRows.length && currentVariant()) buyVariant.textContent = variantLabel(currentVariant());

  var gallery = root.querySelector('.pdp-m__gal');
  var preview = null;
  var previewTimer = null;
  var showColorPreview = function (button) {
    if (!gallery || gallery.getBoundingClientRect().bottom > 80) return;
    var variant = chosenVariant || currentVariant();
    var slide = variant && variant.media && slides && slides.querySelector('[data-media-id="' + variant.media + '"] img');
    var swatch = button.querySelector('img');
    var src = slide ? slide.currentSrc || slide.src : swatch ? swatch.currentSrc || swatch.src : '';
    if (!src) return;
    if (!preview) {
      // Affichage seul, jamais cliquable : la bulle peut passer sur « Aggiungi al carrello », le tap suivant doit l'atteindre.
      preview = document.createElement('div');
      preview.className = 'pdp-m__cprev';
      preview.setAttribute('aria-hidden', 'true');
      preview.innerHTML = '<img alt="" loading="eager" decoding="async"><span></span>';
      root.appendChild(preview);
    }
    var block = button.closest('[data-option-index]');
    var value = button.getAttribute('data-value');
    preview.querySelector('img').src = src;
    preview.querySelector('span').textContent = (block.pdpNames && block.pdpNames[value]) || value;
    preview.setAttribute('aria-label', preview.querySelector('span').textContent);
    preview.classList.add('is-shown');
    window.clearTimeout(previewTimer);
    previewTimer = window.setTimeout(function () { preview.classList.remove('is-shown'); }, 2200);
  };

  if (optionsCard) {
    optionsCard.addEventListener('click', function (event) {
      var button = event.target.closest('[data-value]');
      if (!button) return;
      var block = button.closest('[data-option-index]');
      var group = themeOptionGroups()[Number(block.getAttribute('data-option-index'))];
      var radio = group && group.find(function (item) { return radioValue(item) === button.getAttribute('data-value'); });
      if (!radio) return;
      radio.click();
      chooseVariant(Number(block.getAttribute('data-option-index')), button.getAttribute('data-value'));
      syncOptions();
      highlightSize();
      showVariant();
      if (button.classList.contains('pdp-m__swb')) showColorPreview(button);
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
    if (wantedQty) return wantedQty;
    var input = quantityInput();
    return Math.max(1, parseInt(input ? input.value : '1', 10) || 1);
  };
  // Quantité choisie ici : le thème remet son champ à 1 quand il recharge son formulaire après un choix de
  // variante (ajout de 1 article alors que l'écran en affichait 2). Elle est réécrite dans le formulaire.
  var wantedQty = 0;
  applyQuantity = function () {
    var input = quantityInput();
    if (!wantedQty || !input || String(input.value) === String(wantedQty)) return;
    input.value = String(wantedQty);
    if (dynamicSync) dynamicSync();
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
      wantedQty = Math.max(1, quantity() + Number(button.getAttribute('data-pdp-qty')));
      input.value = String(wantedQty);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      updateTotals();
    });
  });
  // Ajout au panier : le formulaire du thème reçoit d'abord la variante choisie (même si le thème ne l'a pas encore
  // rechargé). Variante choisie épuisée : rien n'est ajouté (son bouton est déjà barré), retour aux options.
  var addToCart = function () {
    applyChosenVariant();
    applyQuantity();
    keepAppFields();
    if (dynamicSync) dynamicSync();
    if (chosenVariant && !chosenVariant.available) {
      var options = document.getElementById('pdp-variants');
      if (options) options.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    var submit = document.querySelector('#main-product form[action*="/cart/add"] [type="submit"]');
    if (submit) submit.click();
  };
  // Tous les boutons « Aggiungi al carrello » de la fiche (carte et barre fixe).
  root.querySelectorAll('[data-pdp-add]').forEach(function (button) {
    button.addEventListener('click', addToCart);
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
  /* ---------- Feuilles « Protections » et « Garantie commande » (snippets/pdp-mobile-protect.liquid,
     snippets/pdp-mobile-order.liquid, design du prototype v4.2) ----------
     Une carte numérotée par engagement ; chaque bouton de la fiche (data-pdp-pt-open, feuille choisie par
     data-pdp-pt-sheet, « protect » par défaut) ouvre sa feuille en haut puis la fait défiler en douceur jusqu'à sa carte,
     mise en évidence 1,6 s ; les pastilles de l'en-tête (data-pdp-pt-go) font de même dans la feuille ouverte.
     Fermeture : croix, OK, tap sur le fond, touche Échap. */
  root.querySelectorAll('[data-pdp-pt]').forEach(function (sheet) {
    var sheetName = sheet.getAttribute('data-pdp-pt');
    var body = sheet.querySelector('[data-pdp-pt-body]');
    var timers = [];
    var clearTimers = function () {
      timers.forEach(function (timer) { window.clearTimeout(timer); });
      timers = [];
      sheet.querySelectorAll('.is-hl').forEach(function (card) { card.classList.remove('is-hl'); });
    };
    var showCard = function (key, delay) {
      clearTimers();
      var card = sheet.querySelector('[data-pdp-pt-card="' + key + '"]');
      if (!card) return;
      timers.push(window.setTimeout(function () {
        // Première carte : la feuille reste en haut, avec l'en-tête ; sinon la carte sous la barre (76 px).
        var first = !(card.previousElementSibling && card.previousElementSibling.hasAttribute('data-pdp-pt-card'));
        var top = first ? 0 : card.offsetTop - 76;
        if (typeof body.scrollTo === 'function') body.scrollTo({ top: top, behavior: 'smooth' });
        else body.scrollTop = top;
        card.classList.add('is-hl');
        timers.push(window.setTimeout(function () { card.classList.remove('is-hl'); }, 1600));
      }, delay));
    };
    var closeSheet = function () {
      clearTimers();
      sheet.classList.remove('is-open');
      window.setTimeout(function () { if (sheet.open) sheet.close(); }, 220);
    };
    sheet.querySelectorAll('[data-pdp-pt-go]').forEach(function (button) {
      button.addEventListener('click', function () { showCard(button.getAttribute('data-pdp-pt-go'), 0); });
    });
    // Barre de titre flottante : seulement quand le grand titre de l'en-tête est sorti de l'écran.
    var heroTitle = sheet.querySelector('.pdp-m__pt-hd h2');
    var syncBar = function () {
      var past = heroTitle && body.scrollTop > heroTitle.offsetTop + heroTitle.offsetHeight - 8;
      sheet.classList.toggle('is-scrolled', Boolean(past));
    };
    body.addEventListener('scroll', syncBar, { passive: true });
    sheet.querySelectorAll('[data-pdp-pt-close]').forEach(function (button) {
      button.addEventListener('click', closeSheet);
    });
    sheet.addEventListener('click', function (event) {
      if (event.target === sheet) closeSheet();
    });
    sheet.addEventListener('cancel', function (event) {
      event.preventDefault();
      closeSheet();
    });
    root.querySelectorAll('[data-pdp-pt-open]').forEach(function (button) {
      if ((button.getAttribute('data-pdp-pt-sheet') || 'protect') !== sheetName) return;
      button.addEventListener('click', function () {
        if (typeof sheet.showModal !== 'function') return;
        if (!sheet.open) sheet.showModal();
        body.scrollTop = 0;
        syncBar();
        showCard(button.getAttribute('data-pdp-pt-open'), 380);
        window.requestAnimationFrame(function () { sheet.classList.add('is-open'); });
      });
    });
  });
  /* ---------- Livraison gratuite : seuil des réglages du thème dans la devise du client ----------
     En euros (devise de la boutique) : seuil du Liquid (data-threshold). Autres devises (data-threshold = 0) : Shopify
     compare au seuil converti au taux (vérifié avec ses tarifs : 48 CHF gratuit, 46 CHF payant pour 50 €) ;
     comparaison sur le seuil exact, affichage arrondi au-dessus à deux chiffres significatifs (« dès CHF 48 »). */
  var ship = root.querySelector('[data-pdp-ship]');
  var shipText = ship && ship.querySelector('[data-pdp-ship-text]');
  var shipThreshold = ship ? Number(ship.getAttribute('data-threshold')) || 0 : 0;
  var shipLimit = shipThreshold;
  if (ship && !shipThreshold) {
    var rate = Number(window.Shopify && window.Shopify.currency && window.Shopify.currency.rate) || 1;
    var converted = Number(ship.getAttribute('data-base')) * rate;
    var magnitude = Math.pow(10, Math.max(0, Math.floor(Math.log10(converted)) - 1));
    shipLimit = Math.round(converted);
    shipThreshold = Math.ceil(converted / magnitude) * magnitude;
  }
  // Montant converti au format de prix de la boutique : modèle « 1 234 567 » rendu par Shopify
  // (data-money-sample, ex. « Lek 1,234,567 ») dont on garde symbole et séparateur de milliers.
  var shopMoney = function (cents) {
    var sample = ship.getAttribute('data-money-sample') || '';
    var match = sample.match(/^(.*?)1(\D?)234(?:\2)567(.*)$/);
    var whole = String(Math.round(cents / 100));
    // Espaces insécables : « CHF 48 » ne se coupe pas en « CHF » / « 48 » sur deux lignes.
    if (!match) return money(cents).replace(/[.,]00(?=\D*$)/, '').replace(/ /g, ' ');
    return (match[1] + whole.replace(/\B(?=(\d{3})+(?!\d))/g, match[2]) + match[3]).replace(/ /g, ' ');
  };
  // Textes déjà formatés par Shopify en euros ; devises converties : montant calculé ici.
  var updateShipping = function (price) {
    if (!shipText || !shipThreshold) return;
    var text = price >= shipLimit
      ? (ship.getAttribute('data-text-free') || T('pdp_ship_free_order'))
      : (ship.getAttribute('data-text-from') || T('pdp_ship_from', { amount: shopMoney(shipThreshold) }));
    if (shipText.textContent !== text) shipText.textContent = text;
  };
  var firstVariant = variants.find(function (item) { return String(item.id) === lastVariantId; }) || variants[0];
  if (firstVariant) updateShipping(firstVariant.price);

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
  var escapeHtml = function (value) {
    return String(value).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };
  var keyFor = function (title) {
    var t = title.toLowerCase();
    if (/tagli|size/.test(t)) return 'size';
    if (/specific/.test(t)) return 'spec';
    if (/caratteristic|feature/.test(t)) return 'feat';
    if (/vantagg/.test(t)) return 'adv';
    if (/panoramic|overview/.test(t)) return 'ov';
    if (/descri/.test(t)) return 'desc';
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
        current = { title: T('description'), key: 'desc', nodes: [] };
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
      // Lignes « Libellé : valeur » des fiches importées (Decorazione: NONE, Materiale: Cotone…) : tableau à deux
      // colonnes dès 3 lignes de suite ; moins de 3, elles restent du texte.
      var pairs = [];
      var flushPairs = function () {
        if (pairs.length >= 3) {
          flushParagraphs();
          body += '<dl class="pdp-m__spec">' + pairs.map(function (pair) {
            return '<dt>' + escapeHtml(pair.label) + '</dt><dd>' + escapeHtml(pair.value) + '</dd>';
          }).join('') + '</dl>';
        } else {
          pairs.forEach(function (pair) { paragraphs += pair.html; });
        }
        pairs = [];
      };
      section.nodes.forEach(function (node) {
        // Styles en ligne du fournisseur (tailles, gras italique, surlignage jaune) : retirés, la charte s'applique.
        if (node.tagName !== 'TABLE') {
          node.removeAttribute('style');
          node.querySelectorAll('[style]').forEach(function (el) { el.removeAttribute('style'); });
        }
        var text = node.textContent.trim();
        var pair = node.tagName === 'P' && text.length <= 120 && !node.querySelector('img') ? text.match(/^([^:：\n]{1,45}?)\s*[:：]\s*(\S[\s\S]*)$/) : null;
        if (pair) {
          pairs.push({ label: pair[1].trim(), value: pair[2].trim(), html: node.outerHTML });
          return;
        }
        flushPairs();
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
      flushPairs();
      flushParagraphs();
      // Sections reconnues : nom de l'onglet dans la langue du client (« SPECIFICATIONS » -> « Technische Daten ») ;
      // les autres gardent le titre de la description.
      var known = { spec: 'desc_tab_spec', feat: 'desc_tab_feat', adv: 'desc_tab_adv', ov: 'desc_tab_ov', desc: 'description', size: 'size_guide' }[key];
      tabs.push({ key: key, title: known && T(known) !== known ? T(known) : section.title });
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

    setupTabs();
    setupSizeTable();
    setupLightbox();
  };

  // Vrais onglets : seule la section de l'onglet choisi est affichée (page plus courte ; les sections cachées,
  // et leurs photos, ne sont dessinées / téléchargées qu'à l'ouverture de leur onglet).
  var openDescTab = null;
  // Texte long (section faite de paragraphes et de tableaux « libellé / valeur ») : coupé après quelques lignes avec un
  // fondu et un bouton « Lire la suite » / « Afficher moins ». Mesuré à l'ouverture de l'onglet (une section cachée
  // n'a pas de hauteur).
  var clampDescSection = function (section) {
    if (section.hasAttribute('data-pdp-clamp')) return;
    section.setAttribute('data-pdp-clamp', '');
    var blocks = Array.prototype.slice.call(section.children);
    if (!blocks.length || !blocks.every(function (block) { return block.classList.contains('pdp-m__txt') || block.classList.contains('pdp-m__spec'); })) return;
    var box = document.createElement('div');
    box.className = 'pdp-m__clamp';
    blocks.forEach(function (block) { box.appendChild(block); });
    section.appendChild(box);
    if (box.scrollHeight <= 230) return;
    box.classList.add('is-clamped');
    var more = T('read_more');
    var less = T('show_less');
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'pdp-m__more-txt';
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = '<span>' + more + '</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
    button.addEventListener('click', function () {
      var open = box.classList.toggle('is-clamped') === false;
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      button.querySelector('span').textContent = open ? less : more;
      if (!open) section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    section.appendChild(button);
  };
  var setupTabs = function () {
    var tabs = Array.prototype.slice.call(descBox.querySelectorAll('[data-pdp-tab]'));
    var sections = Array.prototype.slice.call(descBox.querySelectorAll('[data-pdp-section]'));
    var indicator = descBox.querySelector('[data-pdp-ind]');
    var tabsIn = descBox.querySelector('.pdp-m__tabs-in');
    var activate = function (key) {
      sections.forEach(function (section) {
        section.hidden = section.getAttribute('data-pdp-section') !== key;
        if (!section.hidden) clampDescSection(section);
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
    var current = sizeUi && sizeUi.byRaw[values[sizeUi.index]];
    Array.prototype.forEach.call(table.rows, function (row, r) {
      var label = row.cells[0] ? row.cells[0].textContent.trim() : '';
      // Pointures : « 39 (Foot24.5cm) » ou « 39 » dans le tableau = pointure 39 choisie.
      var same = values.indexOf(label) !== -1 || Boolean(current && (current.shoe ? shoeNumber(label) === current.code : parseSize(label).code === current.code));
      row.classList.toggle('is-selected', r > 0 && same);
    });
  };
  // Encadré des tailles : lien vers le vrai tableau des mesures du produit (fournisseur ou description),
  // seulement s'il existe, pour comparer avec les mesures d'un vêtement européen.
  var addMeasuresLink = function () {
    var box = sizeUi && sizeUi.block.querySelector('.pdp-m__asn');
    if (!box || !descBox || !descBox.querySelector('[data-pdp-section="size"] table')) return;
    var link = document.createElement('button');
    link.type = 'button';
    link.className = 'pdp-m__asn-link';
    link.innerHTML = escapeText(T('pdp_sz_compare')) + ' <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
    link.addEventListener('click', function () {
      highlightSize();
      if (openDescTab) openDescTab('size');
    });
    box.appendChild(link);
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
  addMeasuresLink();

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
      buy.querySelector('[data-pdp-buy-variant]').textContent = variantLabel(variant);
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
