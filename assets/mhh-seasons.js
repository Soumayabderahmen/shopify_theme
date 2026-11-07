/* Bannières mobiles (.mhh : accueil, collections, recherche, autres pages) et ordinateur (accueil, collections, contact,
   suivi, pages, politiques, recherche, wishlist, panier) aux couleurs de la saison, avec leurs effets :
   printemps = rose et pétales ; été = soleil et reflets ; automne = feuilles et pluie ; Noël (1er déc. → 6 janv.) = rouge,
   neige et étoiles ; hiver = bleu glacé et neige. Saison choisie selon la date du téléphone.
   Aperçu d'une autre saison : ajouter ?saison=printemps|ete|automne|noel|hiver à l'adresse (gardé pendant la visite,
   ?saison=auto pour revenir à la date). Styles : assets/mhh-seasons.css. */
(function () {
  'use strict';

  var NAMES = { printemps: 'spring', ete: 'summer', automne: 'autumn', noel: 'xmas', hiver: 'winter' };

  var bySeasonDate = function (date) {
    var m = date.getMonth() + 1;
    var d = date.getDate();
    if (m === 12 || (m === 1 && d <= 6)) return 'xmas';
    if (m <= 2) return 'winter';
    if (m <= 5) return 'spring';
    if (m <= 8) return 'summer';
    return 'autumn';
  };

  var season = function () {
    var forced = null;
    try {
      var query = new URLSearchParams(location.search).get('saison');
      if (query === 'auto') sessionStorage.removeItem('mhhSeason');
      else if (query && NAMES[query]) sessionStorage.setItem('mhhSeason', query);
      forced = sessionStorage.getItem('mhhSeason');
    } catch (error) { /* stockage bloqué : saison de la date */ }
    return (forced && NAMES[forced]) || bySeasonDate(new Date());
  };

  var current = season();

  // Particules de chaque saison : [classe, nombre]
  var PARTS = {
    spring: [['petal', 10], ['fly', 3]],
    summer: [['spark', 14]],
    autumn: [['leaf', 10], ['drop', 26]],
    xmas: [['flake', 34], ['star', 8]],
    winter: [['flake', 38]]
  };

  var rand = function (min, max) { return min + Math.random() * (max - min); };

  // ---------- Décors posés en bas de la bannière (dessins SVG) ----------
  var svg = function (box, body, extra) {
    return '<svg viewBox="' + box + '"' + (extra || '') + ' aria-hidden="true">' + body + '</svg>';
  };
  var GIFTS = [['#e8323f', '#c21f2c', '#ffd34d'], ['#2aa35c', '#1f7d46', '#ff5a6a'], ['#4d7cff', '#3a5fd6', '#fff'], ['#ffd34d', '#e0a91c', '#e8323f']];
  var PETALS = ['#ff8fc0', '#fff', '#ffd34d', '#c9a2ff', '#ff6b8b'];
  var DRAW = {
    // Sapin de Noël décoré (étoile et boules qui scintillent)
    tree: function () {
      return svg('0 0 40 60', '<rect x="17" y="49" width="6" height="11" rx="1" fill="#7a4a24"/>'
        + '<path d="M20 8 31 22h-6l10 13h-7l10 15H2l10-15H5l10-13H9z" fill="#1d8a4e"/>'
        + '<path d="M20 8 31 22h-6l10 13h-7l10 15H20z" fill="#17713f"/>'
        + '<path d="M10 31q10 5 21-1M7 44q13 5 27-1" stroke="#ffd34d" stroke-width="1" fill="none"/>'
        + '<g class="mhs-lt"><circle cx="17" cy="20" r="1.8" fill="#ff4d5e"/><circle cx="24" cy="28" r="1.8" fill="#ffd34d"/><circle cx="14" cy="33" r="1.8" fill="#4dc3ff"/><circle cx="27" cy="40" r="1.8" fill="#ff4d5e"/><circle cx="12" cy="45" r="1.8" fill="#ffd34d"/><circle cx="20" cy="37" r="1.8" fill="#fff"/><circle cx="31" cy="47" r="1.8" fill="#4dc3ff"/></g>'
        + '<polygon class="mhs-st" points="20,0 22.2,5 27.6,5.3 23.4,8.7 24.9,14 20,11 15.1,14 16.6,8.7 12.4,5.3 17.8,5" fill="#ffd34d"/>');
    },
    // Sapin enneigé (hiver après les fêtes)
    pine: function () {
      return svg('0 0 40 60', '<rect x="17" y="49" width="6" height="11" rx="1" fill="#6b4426"/>'
        + '<path d="M20 4 31 20h-6l10 14h-7l10 16H2l10-16H5l10-14H9z" fill="#2c7a5c"/>'
        + '<path d="M20 4l5 7-3-1-2 2-2-2-3 1zM13 21l2-1 3 2 2-2 2 2 3-2 2 1-2 3-5-1-5 1zM9 35l3-1 4 2 4-2 4 2 4-2 3 1-3 3-8-1-8 1z" fill="#fff"/>');
    },
    gift: function (v) {
      var c = GIFTS[v % GIFTS.length];
      return svg('0 0 32 30', '<rect x="2" y="11" width="28" height="19" rx="2" fill="' + c[0] + '"/>'
        + '<rect x="0" y="7" width="32" height="6" rx="1.5" fill="' + c[1] + '"/>'
        + '<rect x="14" y="7" width="4" height="23" fill="' + c[2] + '"/>'
        + '<path d="M16 7C10 0 4 3 9 7M16 7c6-7 12-4 7 0" stroke="' + c[2] + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>');
    },
    snowman: function () {
      return svg('0 0 30 46', '<circle cx="15" cy="34" r="11" fill="#fff"/><circle cx="15" cy="17" r="7.5" fill="#fff"/>'
        + '<rect x="8" y="2" width="14" height="9" rx="1" fill="#1d1a2e"/><rect x="5" y="10" width="20" height="2.5" rx="1" fill="#1d1a2e"/>'
        + '<circle cx="12.5" cy="16" r="1" fill="#1d1a2e"/><circle cx="17.5" cy="16" r="1" fill="#1d1a2e"/><path d="M15 18.5l6 1.5-6 1z" fill="#ff8a2a"/>'
        + '<path d="M8 23.5h14v3H8zM18 25l2 7h-3z" fill="#e8323f"/><circle cx="15" cy="31" r="1" fill="#1d1a2e"/><circle cx="15" cy="36" r="1" fill="#1d1a2e"/>');
    },
    flower: function (v) {
      var p = PETALS[v % PETALS.length];
      return svg('0 0 24 42', '<path d="M12 42V16" stroke="#3f9b54" stroke-width="2"/><ellipse cx="16" cy="30" rx="4.5" ry="2" fill="#4fb36a" transform="rotate(-30 16 30)"/>'
        + '<g class="mhs-sway"><circle cx="12" cy="6.5" r="4.4" fill="' + p + '"/><circle cx="17.2" cy="10.3" r="4.4" fill="' + p + '"/><circle cx="15.2" cy="16.4" r="4.4" fill="' + p + '"/><circle cx="8.8" cy="16.4" r="4.4" fill="' + p + '"/><circle cx="6.8" cy="10.3" r="4.4" fill="' + p + '"/>'
        + '<circle cx="12" cy="12" r="3.2" fill="' + (p === '#ffd34d' ? '#e8641e' : '#ffd34d') + '"/></g>');
    },
    tulip: function (v) {
      var p = ['#ff4d6d', '#c77dff', '#ffb703', '#ff7eb6'][v % 4];
      return svg('0 0 20 42', '<path d="M10 42V18" stroke="#3f9b54" stroke-width="2"/><path d="M10 34c-6-2-8-8-8-12 4 2 7 5 8 12z" fill="#4fb36a"/>'
        + '<path class="mhs-sway" d="M3 6q0 15 7 15t7-15l-3.5 4L10 3 6.5 10z" fill="' + p + '"/>');
    },
    palm: function () {
      return svg('0 -2 64 84', '<path d="M30 82c2-20 0-40 6-60" stroke="#8a5a2b" stroke-width="6" fill="none" stroke-linecap="round"/>'
        + '<path d="M29 70h6M29 58h6M30 46h6M32 34h5" stroke="#6b4220" stroke-width="1.5"/>'
        + '<g class="mhs-leaves"><path d="M36 22C24 10 10 14 4 24c12-6 22-4 32-2z" fill="#2e9e57"/><path d="M36 22c10-14 22-12 26-2-10-4-18-2-26 2z" fill="#3fb565"/>'
        + '<path d="M36 22c-6-16 0-24 8-20-6 4-8 10-8 20z" fill="#3fb565"/><path d="M36 22c-12 0-22 10-22 20 6-10 14-16 22-20z" fill="#27894b"/>'
        + '<path d="M36 22c12 0 20 8 22 18-8-8-14-14-22-18z" fill="#27894b"/><circle cx="34" cy="24" r="2.6" fill="#6b3f1d"/><circle cx="38.5" cy="25" r="2.6" fill="#6b3f1d"/></g>');
    },
    parasol: function () {
      return svg('0 0 50 58', '<path d="M25 8l5 50" stroke="#fff" stroke-width="2.2"/>'
        + '<path d="M2 22Q25-6 48 22q-4-3-7.7 0-3.8-3-7.6 0-3.9-3-7.7 0-3.8-3-7.7 0-3.8-3-7.6 0Q6 19 2 22z" fill="#ff4d5e"/>'
        + '<path d="M25 4.5 13.3 22q3.8-3 7.6 0zM25 4.5 28.7 22q3.9-3 7.7 0z" fill="#fff"/>');
    },
    ball: function () {
      return svg('0 0 20 20', '<circle cx="10" cy="10" r="9" fill="#fff"/><path d="M10 10V1a9 9 0 0 1 7.8 13.5z" fill="#ff4d5e"/>'
        + '<path d="M10 10l7.8 4.5a9 9 0 0 1-15.6 0z" fill="#ffd34d"/><path d="M10 10 2.2 14.5A9 9 0 0 1 10 1z" fill="#2f9bff"/>');
    },
    star5: function () {
      return svg('0 0 24 24', '<path d="M12 1l3 7.5 8 .6-6.1 5.2 1.9 7.8L12 18l-6.8 4.1 1.9-7.8L1 9.1l8-.6z" fill="#ff8a5c" stroke="#e8641e" stroke-width="1" stroke-linejoin="round"/>');
    }
  };
  // Papillon (ailes qui battent), utilisé comme particule volante
  var BUTTERFLY = ['#ff8fc0', '#ffd34d', '#8fd3ff', '#c9a2ff'];
  var butterfly = function (n) {
    var c = BUTTERFLY[n % BUTTERFLY.length];
    return svg('0 0 30 24', '<g class="mhs-wing"><path d="M15 12C8 0 0 2 2 9c1 4 7 4 13 3z" fill="' + c + '"/><path d="M15 12c-6 2-11 8-7 10 3 1 6-4 7-10z" fill="' + c + '" opacity=".8"/></g>'
      + '<g class="mhs-wing mhs-wing--r"><path d="M15 12c7-12 15-10 13-3-1 4-7 4-13 3z" fill="' + c + '"/><path d="M15 12c6 2 11 8 7 10-3 1-6-4-7-10z" fill="' + c + '" opacity=".8"/></g>'
      + '<ellipse cx="15" cy="12" rx="1.3" ry="6" fill="#3b2a4a"/><path d="M15 6l-3-5M15 6l3-5" stroke="#3b2a4a" stroke-width=".8" fill="none"/>');
  };
  // Sols (pleine largeur) et décors : [dessin, gauche %, largeur px, variante, retourné]
  var GROUND_SNOW = svg('0 0 400 60', '<path d="M0 34q60-16 120-4t120-4 120 6 40-4v32H0z" fill="#dcefff"/><path d="M0 44q80-14 160-2t160-4 80 4v18H0z" fill="#fff"/>', ' preserveAspectRatio="none" class="mhs-ground"');
  var SCENES = {
    xmas: {
      ground: GROUND_SNOW,
      items: [['tree', 0.5, 46], ['gift', 8, 22, 1], ['tree', 23, 34], ['gift', 29, 24, 0], ['gift', 33.5, 18, 2], ['tree', 39, 50], ['gift', 46, 26, 3], ['gift', 51, 20, 1], ['tree', 55.5, 30], ['gift', 90, 18, 2], ['tree', 93.5, 50]]
    },
    winter: {
      ground: GROUND_SNOW,
      items: [['pine', 0.5, 46], ['pine', 24, 30], ['snowman', 31, 32], ['pine', 40, 48], ['pine', 49, 30], ['pine', 55, 38], ['pine', 93.5, 50]]
    },
    spring: {
      ground: svg('0 0 400 60', '<path d="M0 36q70-14 140-2t140-4 120 4v26H0z" fill="#7fd68e"/><path d="M0 46q90-12 180 0t180-4 40 2v16H0z" fill="#4fb36a"/>', ' preserveAspectRatio="none" class="mhs-ground"'),
      items: [['flower', 0.5, 18, 0], ['tulip', 4, 15, 0], ['flower', 23, 21, 2], ['tulip', 27.5, 14, 1], ['flower', 31, 17, 4], ['tulip', 35.5, 16, 3], ['flower', 39.5, 22, 0], ['tulip', 44, 15, 2], ['flower', 48, 18, 1], ['tulip', 52, 14, 0], ['flower', 55.5, 20, 3], ['tulip', 92, 15, 1], ['flower', 95.5, 19, 4]]
    },
    summer: {
      ground: '<div class="mhs-sea">' + svg('0 0 800 60', '<path d="M0 22q25-8 50 0t50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0v38H0z" fill="#29b6d8"/><path d="M0 22q25-8 50 0t50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0" stroke="#fff" stroke-width="2.5" fill="none" opacity=".85"/>', ' preserveAspectRatio="none"') + '</div>'
        + svg('0 0 400 60', '<path d="M0 46q100-14 200-4t200-2v20H0z" fill="#f5d08a"/><path d="M0 52q120-8 240-2t160 0v10H0z" fill="#ecc06e"/>', ' preserveAspectRatio="none" class="mhs-ground"'),
      items: [['palm', 0, 70], ['star5', 24, 12], ['ball', 30, 16], ['parasol', 37, 52], ['star5', 47, 11], ['ball', 52, 14], ['palm', 91, 64, 0, true]]
    }
  };
  var scene = function () {
    var def = SCENES[current];
    if (!def) return '';
    var html = '<div class="mhs-scene">' + def.ground;
    def.items.forEach(function (it) {
      html += '<span class="mhs-it mhs-it--' + it[0] + '" style="left:' + it[1] + '%;--w:' + it[2] + 'px' + (it[4] ? ';--flip:-1' : '') + '">' + DRAW[it[0]](it[3] || 0) + '</span>';
    });
    return html + '</div>';
  };

  // Bannières : [sélecteur, classe ajoutée, ordinateur seulement]
  var HEROES = [
    ['.mhh[data-mhh]', '', false],
    ['.dhp-hero', 'mhs-light', true],
    ['.dcl .cph', 'mhs-dark', true],
    ['.dct-hero', 'mhs-dark', true],
    ['.dtr .trust-badges', 'mhs-dark', true],
    ['.wishlist-page__heading', 'mhs-dark', true],
    ['.cart-m', 'mhs-cart', true]
  ];
  var desktop = window.matchMedia('(min-width: 761px)');

  var decorate = function (hero, kind) {
    if (hero.hasAttribute('data-season')) return;
    hero.setAttribute('data-season', current);
    if (kind) hero.classList.add(kind);
    // Plus de particules sur les grandes bannières de l'ordinateur
    var scale = kind ? Math.min(2.4, Math.max(1, hero.offsetWidth / 420)) : 1;
    var layer = document.createElement('div');
    layer.className = 'mhh-sz';
    layer.setAttribute('aria-hidden', 'true');
    var html = '';
    PARTS[current].forEach(function (part) {
      for (var i = 0; i < Math.round(part[1] * scale); i += 1) {
        var fly = part[0] === 'fly';
        var size = part[0] === 'drop' ? rand(16, 28) : part[0] === 'flake' ? rand(3.5, 8) : part[0] === 'star' ? rand(7, 12) : fly ? rand(20, 28) : rand(12, 20);
        var duration = part[0] === 'drop' ? rand(0.7, 1.2) : part[0] === 'star' ? rand(1.6, 3) : fly ? rand(9, 14) : rand(5, 10);
        html += '<i class="mhh-sz__' + part[0] + '" style="'
          + 'left:' + (fly ? 0 : rand(-4, 100).toFixed(1)) + '%;'
          + (part[0] === 'star' || fly ? 'top:' + rand(fly ? 30 : 8, fly ? 70 : 80).toFixed(1) + '%;' : '')
          + '--s:' + size.toFixed(1) + 'px;'
          + '--d:' + duration.toFixed(2) + 's;'
          + '--delay:-' + rand(0, duration).toFixed(2) + 's;'
          + '--dx:' + rand(-40, 40).toFixed(0) + 'px;'
          + '--r:' + rand(-260, 260).toFixed(0) + 'deg;'
          + '--o:' + (fly ? 1 : rand(0.55, 1).toFixed(2)) + '">' + (fly ? butterfly(i) : '') + '</i>';
      }
    });
    if (current === 'summer') html = '<b class="mhh-sz__sun"></b>' + html;
    layer.innerHTML = html + scene();
    hero.insertBefore(layer, hero.firstChild);
    // Hauteur de chute = hauteur de la bannière ; traversée des papillons = largeur
    var syncFall = function () {
      layer.style.setProperty('--fall', (hero.offsetHeight + 30) + 'px');
      layer.style.setProperty('--wide', (hero.offsetWidth + 40) + 'px');
    };
    syncFall();
    if (window.ResizeObserver) new ResizeObserver(syncFall).observe(hero);
  };

  var scan = function () {
    HEROES.forEach(function (hero) {
      if (hero[2] && !desktop.matches) return;
      document.querySelectorAll(hero[0]).forEach(function (el) {
        if (!el.hasAttribute('data-season')) decorate(el, hero[1]);
      });
    });
  };

  document.documentElement.setAttribute('data-mhh-season', current);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan);
  else scan();
  // Bannières ajoutées plus tard (onglets de l'accueil, pages ouvertes sans recharger)
  if (window.MutationObserver) {
    var pending = false;
    new MutationObserver(function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () { pending = false; scan(); });
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
})();
