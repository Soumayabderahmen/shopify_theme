/* Barre du bas mobile (prototype "scura") : l'onglet touché devient actif, le faisceau lumineux glisse vers l'onglet touché avec un
   ressort (raideur 420, amortissement 30, masse 0,9) et pulse à l'arrivée ; l'icône touchée fait un "pop".
   À l'ouverture d'une page, le faisceau est placé directement sur l'onglet actif (classe is-active). */
(function () {
  'use strict';

  var nav = document.querySelector('[data-mobile-bottom-nav]');
  var spot = nav && nav.querySelector('.nb-spot');
  if (!nav || !spot) return;

  var items = Array.prototype.slice.call(nav.querySelectorAll(':scope > a, :scope > button'));
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var pageIndex = items.findIndex(function (item) { return item.classList.contains('is-active'); });
  var current = pageIndex;
  var position = 0;
  var velocity = 0;
  var target = 0;
  var frame = null;

  function offsetFor(index) {
    return index * spot.offsetWidth;
  }

  function paint() {
    spot.style.transform = 'translateX(' + position + 'px)';
  }

  // Ressort amorti, intégré en petits pas pour rester stable à toutes les cadences d'image.
  function step(previousTime) {
    frame = window.requestAnimationFrame(function () {
      // Horloge réelle : l'horodatage de l'image peut précéder le clic (pas de temps négatif).
      var now = performance.now();
      var elapsed = Math.min(0.05, Math.max(0, (now - previousTime) / 1000));
      var steps = Math.max(1, Math.ceil(elapsed / 0.004));
      var dt = elapsed / steps;
      for (var i = 0; i < steps; i += 1) {
        var force = -420 * (position - target) - 30 * velocity;
        velocity += (force / 0.9) * dt;
        position += velocity * dt;
      }
      paint();
      if (Math.abs(position - target) < 0.3 && Math.abs(velocity) < 5) {
        position = target;
        velocity = 0;
        paint();
        frame = null;
        return;
      }
      step(now);
    });
  }

  function moveTo(index, animated) {
    if (index < 0) {
      spot.classList.remove('is-ready');
      return;
    }
    target = offsetFor(index);
    spot.classList.add('is-ready');
    if (!animated || reducedMotion.matches) {
      if (frame) window.cancelAnimationFrame(frame);
      frame = null;
      position = target;
      velocity = 0;
      paint();
      return;
    }
    if (!frame) step(performance.now());
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

  // Capture sur window : d'autres scripts (menu Categoria) arrêtent la propagation du clic.
  window.addEventListener('click', function (event) {
    var item = event.target.closest && event.target.closest('[data-mobile-bottom-nav] > a, [data-mobile-bottom-nav] > button');
    if (!item) return;
    var index = items.indexOf(item);
    if (index === -1) return;
    pop(item);
    rushTruck(item);
    if (index !== current) {
      current = index;
      setActive(index);
      moveTo(index, true);
    }
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

  window.addEventListener('resize', function () { moveTo(current, false); });
  moveTo(current, false);
})();
