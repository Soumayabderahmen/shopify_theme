/* Barre du bas mobile (prototype "scura") : l'onglet touché devient actif, le faisceau lumineux glisse vers l'onglet touché avec un
   ressort et pulse à l'arrivée ; l'icône touchée fait un "pop".
   Le glissement est une transition CSS sur --nb-index (assets/mobile-bottom-nav.css) : elle reste fluide même quand
   la page est occupée à changer. À l'ouverture d'une page, Shopify place déjà le faisceau sur l'onglet actif. */
(function () {
  'use strict';

  var nav = document.querySelector('[data-mobile-bottom-nav]');
  var spot = nav && nav.querySelector('.nb-spot');
  if (!nav || !spot) return;

  var items = Array.prototype.slice.call(nav.querySelectorAll(':scope > a, :scope > button'));
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var pageIndex = items.findIndex(function (item) { return item.classList.contains('is-active'); });
  var current = pageIndex;

  function moveTo(index, animated) {
    if (index < 0) {
      spot.classList.remove('is-ready');
      return;
    }
    spot.classList.add('is-ready');
    if (!animated || reducedMotion.matches) {
      spot.classList.add('no-anim');
      nav.style.setProperty('--nb-index', index);
      void spot.offsetWidth;
      spot.classList.remove('no-anim');
      return;
    }
    nav.style.setProperty('--nb-index', index);
    if (typeof spot.animate === 'function') spot.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 350 });
  }

  // État actif (couleur bleue + icône pleine) sur l'onglet du faisceau.
  function setActive(index) {
    items.forEach(function (item, itemIndex) { item.classList.toggle('is-active', itemIndex === index); });
  }

  function pop(item) {
    if (reducedMotion.matches) return;
    var icon = item.querySelector('svg');
    if (icon && typeof icon.animate === 'function') {
      icon.animate([
        { transform: 'scale(1)' },
        { transform: 'scale(0.78)' },
        { transform: 'scale(1.14)' },
        { transform: 'scale(1)' }
      ], { duration: 420, easing: 'ease-out' });
    }
  }

  // Camion "Consegna" : passage éclair (sort à droite en fondu, revient par la gauche), roues et traits accélérés 1 s.
  function rushTruck(item) {
    var svg = item.querySelector('.ic-truck');
    var truck = svg && svg.querySelector('.truck');
    if (!truck || reducedMotion.matches) return;
    svg.classList.add('rush');
    window.setTimeout(function () { svg.classList.remove('rush'); }, 1000);
    if (typeof truck.animate === 'function') {
      truck.animate([
        { transform: 'translateX(0)', opacity: 1 },
        { transform: 'translateX(22px)', opacity: 0, offset: 0.42 },
        { transform: 'translateX(-22px)', opacity: 0, offset: 0.43 },
        { transform: 'translateX(0)', opacity: 1 }
      ], { duration: 950, easing: 'cubic-bezier(.55,0,.25,1)' });
    }
  }

  function itemFromEvent(event) {
    var item = event.target.closest && event.target.closest('[data-mobile-bottom-nav] > a, [data-mobile-bottom-nav] > button');
    return item && items.indexOf(item) !== -1 ? item : null;
  }

  function activate(item) {
    var index = items.indexOf(item);
    pop(item);
    rushTruck(item);
    if (index !== current) {
      current = index;
      setActive(index);
      moveTo(index, true);
    }
  }

  // Réaction immédiate : dès que le doigt touche l'onglet, avant le clic et les autres scripts
  // (sur iPhone l'écran se fige souvent au moment où la page commence à changer).
  // Si le geste est annulé (défilement, doigt qui glisse hors de l'onglet), on revient en arrière.
  var pressed = null;
  var pressedFrom = -1;
  var revertTimer = null;

  function revertPress() {
    window.clearTimeout(revertTimer);
    if (pressed && current !== pressedFrom) {
      current = pressedFrom;
      setActive(pressedFrom);
      moveTo(pressedFrom, true);
    }
    pressed = null;
  }

  window.addEventListener('pointerdown', function (event) {
    if (event.button !== 0) return;
    var item = itemFromEvent(event);
    if (!item) return;
    window.clearTimeout(revertTimer);
    pressed = item;
    pressedFrom = current;
    activate(item);
    // Pas de clic dans la seconde (geste annulé) : retour à l'onglet précédent.
    revertTimer = window.setTimeout(revertPress, 1000);
  }, { capture: true, passive: true });

  window.addEventListener('pointercancel', function () { if (pressed) revertPress(); }, true);

  // Capture sur window : d'autres scripts (menu Categoria) arrêtent la propagation du clic.
  window.addEventListener('click', function (event) {
    var item = itemFromEvent(event);
    if (!item) return;
    window.clearTimeout(revertTimer);
    // Déjà activé au toucher : rien à refaire (clavier ou clic sans pointerdown : on active ici).
    if (pressed === item) {
      pressed = null;
      return;
    }
    pressed = null;
    activate(item);
  }, true);

  // Menu "Categoria" refermé : le faisceau revient sur l'onglet de la page.
  new MutationObserver(function () {
    if (!document.body.classList.contains('mobile-categories-open') && current !== pageIndex && items[current] && items[current].matches('[data-mobile-categories-trigger]')) {
      current = pageIndex;
      setActive(pageIndex);
      moveTo(pageIndex, true);
    }
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  // Retour arrière (page restaurée depuis le cache) : faisceau sur l'onglet de la page.
  window.addEventListener('pageshow', function (event) {
    if (!event.persisted) return;
    current = pageIndex;
    setActive(pageIndex);
    moveTo(pageIndex, false);
  });

  // Position en pourcentage de la largeur d'un onglet : rien à recalculer au redimensionnement.
  moveTo(current, false);
})();
