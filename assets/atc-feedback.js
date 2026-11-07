/* Boutons « Aggiungi al carrello » (mobile et ordinateur, toutes les pages) : au toucher, cercle de chargement à la
   place du texte, puis coche ✓ quand Shopify confirme l'ajout (/cart/add), puis le bouton revient. Ajout refusé ou
   rien d'envoyé (ex. taille à choisir) : le bouton revient tout de suite. Styles : assets/atc-feedback.css.
   Boutons : fiche produit (snippets/pdp-mobile-top.liquid, aussi sur ordinateur), formulaires d'ajout du thème,
   wishlist (page et tiroir, assets/mobile-temu-header.js), suggestions du tiroir panier (assets/cart-drawer-mobile.js).
   La fenêtre d'ajout rapide (assets/mobile-quick-add.js) a déjà son chargement et son écran de confirmation. */
(function () {
  'use strict';

  if (window.atcFeedback) return;
  window.atcFeedback = true;

  var SELECTOR = [
    '[data-pdp-add]',
    '[data-wishlist-add]',
    '[data-wishlist-drawer-add]',
    '[data-wishlist-add-all]',
    '[data-wishlist-drawer-add-all]',
    '[data-cd-add]',
    'form[action*="/cart/add"] [type="submit"]'
  ].join(',');
  var CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  var active = [];
  var requestStarted = false;

  var visible = function (button) {
    return Boolean(button.offsetWidth || button.offsetHeight || button.getClientRects().length);
  };

  var clear = function (button) {
    button.classList.remove('atc-loading');
    button.removeAttribute('aria-busy');
    active = active.filter(function (item) { return item !== button; });
  };

  var start = function (button) {
    if (button.classList.contains('atc-loading')) return;
    // Couleur du texte du bouton pour le cercle et la coche (le texte est masqué pendant le chargement)
    button.style.setProperty('--atc-c', getComputedStyle(button).color);
    var icon = button.querySelector(':scope > .atc-ic');
    if (!icon) {
      icon = document.createElement('span');
      icon.className = 'atc-ic';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = '<i class="atc-spin"></i>' + CHECK;
      button.appendChild(icon);
    }
    button.classList.remove('atc-done');
    button.classList.add('atc-loading');
    button.setAttribute('aria-busy', 'true');
    active.push(button);
    // Rien d'envoyé juste après le toucher (taille à choisir, article épuisé…) : retour immédiat
    requestStarted = false;
    setTimeout(function () { if (!requestStarted) clear(button); }, 900);
    // Sécurité : jamais bloqué plus de 12 s
    setTimeout(function () { clear(button); }, 12000);
  };

  var finish = function (ok) {
    var buttons = active.slice();
    buttons.forEach(function (button) {
      clear(button);
      if (!ok) return;
      button.classList.add('atc-done');
      setTimeout(function () { button.classList.remove('atc-done'); }, 1500);
    });
  };

  document.addEventListener('click', function (event) {
    var button = event.target.closest && event.target.closest(SELECTOR);
    if (!button || button.disabled || button.matches('[data-qa-add]') || !visible(button)) return;
    start(button);
  }, true);

  // Réponse de Shopify à l'ajout : coche si accepté, retour sinon
  var nativeFetch = window.fetch;
  if (typeof nativeFetch === 'function') {
    window.fetch = function (input) {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      var request = nativeFetch.apply(this, arguments);
      if (/\/cart\/add/.test(url) && active.length) {
        requestStarted = true;
        request.then(function (response) { finish(response.ok); }, function () { finish(false); });
      }
      return request;
    };
  }
})();
