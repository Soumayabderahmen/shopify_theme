/* Prototype : fiche produit ORDINATEUR organisée comme Alibaba (?view=alibaba, assets/pdp-desktop-alibaba.css).
   Déplace les vrais blocs de la fiche dans 3 colonnes ; leurs scripts (assets/pdp-mobile.js) les suivent. Mobile : rien. */
(function () {
  'use strict';
  if (!window.matchMedia('(min-width: 761px)').matches) return;
  var run = function () {
    var root = document.querySelector('.pdp-m');
    var top = root && root.querySelector('.pdp-m__top');
    if (!top || root.classList.contains('pa-on')) return;
    var pick = function (selector) { return top.querySelector(':scope > ' + selector); };
    var col = function (name) { var div = document.createElement('div'); div.className = 'pa-col pa-col--' + name; return div; };
    var gal = col('gal'), info = col('info'), buy = col('buy');
    var add = function (target, node) { if (node) target.appendChild(node); };
    var cards = [].slice.call(top.querySelectorAll(':scope > .pdp-m__card'));
    var byTitle = function (word) { return cards.filter(function (card) { var t = card.querySelector('.pdp-m__ctitle'); return t && t.textContent.indexOf(word) !== -1; })[0]; };
    var buyCard = cards.filter(function (card) { return card.querySelector(':scope > .pdp-m__qrow'); })[0];
    var rewards = top.querySelector(':scope > .pdp-m__rw');
    var protections = byTitle('Protezioni');
    var shipping = top.querySelector(':scope > .pdp-m__gentry');

    // 1. Galerie, puis Protezioni et Premi côte à côte (place de la carte fournisseur d'Alibaba)
    add(gal, pick('.pdp-m__gal'));
    var more = document.createElement('div');
    more.className = 'pa-gal-more';
    add(more, protections);
    add(more, rewards);
    if (more.children.length) gal.appendChild(more);
    // 2. Vantaggi + prix, marque, options, puis Descrizione (Specifiche / Foto)
    add(info, pick('.pdp-m__vant'));
    add(info, pick('.pdp-m__price-card'));
    add(info, pick('.pdp-m__brand'));
    add(info, pick('#pdp-variants'));
    add(info, root.querySelector(':scope > .pdp-m__desc'));
    // 3. Spedizione e resi, achat, Klarna
    add(buy, shipping);
    add(buy, buyCard);
    add(buy, pick('.pdp-m__klo'));
    // Ce qui reste (feuilles, boîtes de dialogue…) reste dans le haut de fiche, après les colonnes
    top.insertBefore(buy, top.firstChild);
    top.insertBefore(info, buy);
    top.insertBefore(gal, info);
    root.classList.add('pa-on');
    fit();
    // Bloc Klarna : l'app le (re)crée après le chargement dans le haut de fiche — ramené dans la colonne d'achat
    var tries = 0;
    var klarna = function () {
      var klo = top.querySelector(':scope > .pdp-m__klo');
      if (klo) buy.appendChild(klo);
      if (++tries < 20) window.setTimeout(klarna, 500);
    };
    klarna();
  };
  // Pleine largeur malgré la marge du contenu du thème (comme assets/desktop-home-shop.js)
  var fit = function () {
    var root = document.querySelector('.pdp-m.pa-on');
    if (!root) return;
    var width = document.documentElement.clientWidth;
    root.style.setProperty('--pa-w', width + 'px');
    root.style.setProperty('--pa-x', '0px');
    root.style.setProperty('--pa-x', root.getBoundingClientRect().left + 'px');
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  window.addEventListener('resize', fit);
})();
