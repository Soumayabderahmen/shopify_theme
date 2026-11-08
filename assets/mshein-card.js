/* Carte produit au style SHEIN (snippets/mshein-card.liquid) — toutes les pages ; sur ordinateur aussi le bouton « Anteprima » au survol.
   - cœur : état réel des favoris (window.mobileWishlist) pour les cartes ajoutées après le chargement ;
   - nom de la marque devant le titre (« 🏬 Marque › »), relevé des titres du catalogue (assets/mobile-brands.json) ;
   - toucher n'importe où sur la carte (hors cœur / panier) : fiche produit, comme SHEIN.
   Les cartes ajoutées plus tard (filtres, « carica altri », fil de l'accueil) sont prises en compte automatiquement.
   Utilisé aussi par assets/mobile-home-shein.js (window.msheinCards.decorate). */
(function () {
  'use strict';

  if (window.msheinCards) return;
  var mobile = window.matchMedia('(max-width: 760px)');
  var script = document.currentScript;
  var brandsUrl = script && script.getAttribute('data-brands');

  var syncFavorites = function (root) {
    if (!window.mobileWishlist || typeof window.mobileWishlist.has !== 'function') return;
    root.querySelectorAll('.mshein-card__fav[data-product-id]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(Boolean(window.mobileWishlist.has(button.getAttribute('data-product-id')))));
    });
  };

  var brandRequest = null;
  var loadBrands = function () {
    if (brandRequest) return brandRequest;
    brandRequest = !brandsUrl ? Promise.resolve([]) : fetch(brandsUrl, { credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) throw new Error('Brand list request failed: ' + response.status);
        return response.json();
      })
      .then(function (data) {
        return (data.brands || []).map(function (brand) {
          var name = String(brand[0]);
          var escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return { name: name, test: new RegExp('(^|[^\\p{L}\\d])' + escaped + '(?=$|[^\\p{L}\\d])', 'iu') };
        });
      })
      .catch(function (error) {
        console.error('Unable to load the brand list.', error);
        return [];
      });
    return brandRequest;
  };

  // L'app d'étiquettes du site (badge .dos-badge « New Arrivals ») ajoute son badge en haut à droite de la photo sur
  // certaines pages, par-dessus le cœur (qui ne se touchait plus). Le badge de l'app est déplacé dans la rangée
  // d'étiquettes à gauche, à la place du nôtre (même règle, tag new-arrival) : il reste affiché, une seule fois.
  var dedupeNewTags = function (root) {
    root.querySelectorAll('.mshein-card__img .dos-badge').forEach(function (badge) {
      var frame = badge.closest('.mshein-card__img');
      if (badge.closest('.mshein-tags')) return;
      var tags = frame.querySelector('.mshein-tags');
      if (!tags) {
        tags = document.createElement('span');
        tags.className = 'mshein-tags';
        frame.appendChild(tags);
      }
      var ownTag = tags.querySelector('.mshein-tag-new');
      if (ownTag) ownTag.hidden = true;
      tags.appendChild(badge);
    });
  };

  // Ordinateur et mobile : les liens de marque (« Venduto da ») mènent à la page brand de la marque
  var brandLinks = function () {
    document.querySelectorAll('a[data-brand-url]').forEach(function (link) {
      var url = link.getAttribute('data-brand-url');
      if (url) link.href = url;
    });
  };

  // Fiche produit : « Venduto da » sans marque trouvée par le serveur (snippets/pdp-mobile-top.liquid) → marque citée
  // dans le titre, d'après la même liste que les cartes, avec le lien vers ses produits (recherche)
  var sellerBrand = function () {
    var seller = document.querySelector('[data-pdp-seller-auto]');
    if (!seller) return;
    var title = seller.getAttribute('data-title') || '';
    loadBrands().then(function (matchers) {
      for (var index = 0; index < matchers.length; index += 1) {
        if (!matchers[index].test.test(title)) continue;
        var link = seller.querySelector('a');
        if (!link) return;
        link.textContent = matchers[index].name;
        link.href = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root || '/') + 'search?q=' + encodeURIComponent(matchers[index].name);
        // Page brand de la marque (recherche de la marque, sections/desktop-brand.liquid)
        link.setAttribute('data-brand-url', (seller.getAttribute('data-brand-search') || '/search') + '?q=' + encodeURIComponent(matchers[index].name) + '&type=product&view=brand');
        brandLinks();
        seller.removeAttribute('data-pdp-seller-auto');
        return;
      }
    });
  };

  var decorate = function (root) {
    if (root && root.querySelector && (root.matches && root.matches('[data-pdp-seller-auto]') || root.querySelector('[data-pdp-seller-auto]'))) sellerBrand();
    if (!mobile.matches || !root || !root.querySelectorAll) return;
    dedupeNewTags(root);
    var cards = root.querySelectorAll('.mshein-card:not([data-mshein-brand-done])');
    if (!cards.length) return;
    syncFavorites(root);
    loadBrands().then(function (matchers) {
      cards.forEach(function (card) {
        if (card.hasAttribute('data-mshein-brand-done')) return;
        card.setAttribute('data-mshein-brand-done', '');
        // Marques officielles : déjà « Official Store » dans la bande, pas de doublon.
        if (card.querySelector('.mshein-brandbar')) return;
        var slot = card.querySelector('[data-mshein-store]');
        var title = card.getAttribute('data-mshein-title') || '';
        if (!slot) return;
        for (var index = 0; index < matchers.length; index += 1) {
          if (matchers[index].test.test(title)) {
            var label = document.createElement('span');
            label.className = 'mshein-lbl mshein-lbl--store';
            label.textContent = '🏬 ' + matchers[index].name + ' ›';
            slot.replaceWith(label);
            return;
          }
        }
      });
    });
  };

  window.msheinCards = { decorate: decorate, syncFavorites: syncFavorites };

  // Toucher n'importe où sur la carte (hors liens et boutons) : fiche produit.
  document.addEventListener('click', function (event) {
    if (!mobile.matches || event.defaultPrevented || event.target.closest('a, button, input, label, select')) return;
    var card = event.target.closest('.mshein-card');
    var link = card && card.querySelector('.mshein-card__title a[href]');
    if (link) link.click();
  });

  var start = function () {
    brandLinks();
    sellerBrand();
    decorate(document);
    // Cartes ajoutées plus tard (filtres, pages suivantes) : regroupées par image.
    var pending = false;
    new MutationObserver(function (records) {
      if (pending) return;
      var added = records.some(function (record) {
        return Array.prototype.some.call(record.addedNodes, function (node) {
          return node.nodeType === 1 && (
            node.matches('.mshein-card, .dos-badge') || Boolean(node.querySelector('.mshein-card, .dos-badge'))
          );
        });
      });
      if (!added) return;
      pending = true;
      window.requestAnimationFrame(function () {
        pending = false;
        decorate(document);
        dedupeNewTags(document);
      });
    }).observe(document.body, { childList: true, subtree: true });
  };

  // Ordinateur : bouton « Anteprima » (fiche produit) sur la photo au survol, comme les cartes de l'accueil — sauf si la
  // page l'ajoute déjà elle-même (accueil, collections, wishlist, panier : boutons « …-qv »).
  var preview = script && script.getAttribute('data-preview');
  var eye = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  if (preview) {
    document.addEventListener('mouseover', function (event) {
      if (mobile.matches) return;
      var card = event.target.closest && event.target.closest('.mshein-card');
      if (!card || card.closest('.is-list')) return;
      // Après les boutons des pages (leurs écouteurs passent dans le même survol)
      setTimeout(function () {
        var media = card.querySelector('.mshein-card__img');
        var link = card.querySelector('.mshein-card__link');
        if (!media || !link || media.querySelector('[class*="-qv"], .mshein-card__qv')) return;
        var button = document.createElement('a');
        button.className = 'mshein-card__qv';
        button.href = link.getAttribute('href');
        button.innerHTML = eye;
        button.appendChild(document.createTextNode(preview));
        media.appendChild(button);
      }, 0);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
