/* Bannières mobiles (.mhh : accueil, collections, recherche, autres pages) aux couleurs de la saison, avec leurs effets :
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
    spring: [['petal', 14]],
    summer: [['spark', 14]],
    autumn: [['leaf', 10], ['drop', 26]],
    xmas: [['flake', 34], ['star', 8]],
    winter: [['flake', 38]]
  };

  var rand = function (min, max) { return min + Math.random() * (max - min); };

  var decorate = function (hero) {
    if (hero.hasAttribute('data-season')) return;
    hero.setAttribute('data-season', current);
    var layer = document.createElement('div');
    layer.className = 'mhh-sz';
    layer.setAttribute('aria-hidden', 'true');
    var html = '';
    PARTS[current].forEach(function (part) {
      for (var i = 0; i < part[1]; i += 1) {
        var size = part[0] === 'drop' ? rand(16, 28) : part[0] === 'flake' ? rand(3.5, 8) : part[0] === 'star' ? rand(7, 12) : rand(12, 20);
        var duration = part[0] === 'drop' ? rand(0.7, 1.2) : part[0] === 'star' ? rand(1.6, 3) : rand(5, 10);
        html += '<i class="mhh-sz__' + part[0] + '" style="'
          + 'left:' + rand(-4, 100).toFixed(1) + '%;'
          + (part[0] === 'star' ? 'top:' + rand(8, 80).toFixed(1) + '%;' : '')
          + '--s:' + size.toFixed(1) + 'px;'
          + '--d:' + duration.toFixed(2) + 's;'
          + '--delay:-' + rand(0, duration).toFixed(2) + 's;'
          + '--dx:' + rand(-40, 40).toFixed(0) + 'px;'
          + '--r:' + rand(-260, 260).toFixed(0) + 'deg;'
          + '--o:' + rand(0.55, 1).toFixed(2) + '"></i>';
      }
    });
    if (current === 'summer') html = '<b class="mhh-sz__sun"></b>' + html;
    layer.innerHTML = html;
    hero.insertBefore(layer, hero.firstChild);
    // Hauteur de chute = hauteur de la bannière
    var syncFall = function () { layer.style.setProperty('--fall', (hero.offsetHeight + 30) + 'px'); };
    syncFall();
    if (window.ResizeObserver) new ResizeObserver(syncFall).observe(hero);
  };

  var scan = function () {
    document.querySelectorAll('.mhh[data-mhh]:not([data-season])').forEach(decorate);
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
