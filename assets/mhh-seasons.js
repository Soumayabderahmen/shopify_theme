/* Bannières mobiles (.mhh : accueil, collections, recherche, autres pages) et ordinateur (accueil, collections, contact,
   suivi, pages, politiques, recherche, wishlist, panier) aux couleurs de la saison, avec leurs décors :
   - Noël (1er déc. → 6 janv.) : rouge profond, horizon enneigé et forêt de sapins en silhouette avec guirlandes
     lumineuses, boules suspendues (ordinateur), flocons cristallins, neige et paillettes dorées ;
   - hiver : bleu glacé, même horizon enneigé (sans fêtes), flocons cristallins, neige et halos lumineux ;
   - printemps : rose, branche de cerisier en fleurs, pétales qui tourbillonnent, papillons ;
   - été : coucher de soleil, soleil et rayons, mer en vagues transparentes avec reflets, palmiers en silhouette ;
   - automne : orange, feuilles et pluie.
   Saison choisie selon la date du téléphone. Aperçu d'une autre saison : ?saison=printemps|ete|automne|noel|hiver
   (gardé pendant la visite, ?saison=auto pour revenir à la date). Styles : assets/mhh-seasons.css. */
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
  var rand = function (min, max) { return min + Math.random() * (max - min); };
  var r1 = function (n) { return Math.round(n * 10) / 10; };
  var uid = 0;

  // Particules de chaque saison : [classe, nombre]
  var PARTS = {
    spring: [['petal', 16], ['fly', 2], ['bokeh', 5]],
    summer: [['spark', 12]],
    autumn: [['leaf', 10], ['drop', 26]],
    xmas: [['flake', 26], ['crystal', 7], ['star', 9], ['bokeh', 5]],
    winter: [['flake', 28], ['crystal', 9], ['bokeh', 6]]
  };

  // ---------- Dessins ----------
  var svg = function (box, body, extra) {
    return '<svg viewBox="' + box + '"' + (extra || '') + ' aria-hidden="true" focusable="false">' + body + '</svg>';
  };

  // Flocon cristallin à 6 branches
  var CRYSTAL = (function () {
    var arm = '<path d="M0 0V-10M0-6.2l-3-2.6M0-6.2l3-2.6M0-3.2l-2-1.8M0-3.2l2-1.8"/>';
    var body = '';
    for (var a = 0; a < 360; a += 60) body += '<g transform="rotate(' + a + ')">' + arm + '</g>';
    return svg('-12 -12 24 24', '<g fill="none" stroke="#fff" stroke-width="1.15" stroke-linecap="round">' + body + '</g>');
  })();

  // Papillon fin (ailes nacrées qui battent)
  var butterfly = function () {
    var id = 'mhsbf' + (uid += 1);
    return svg('0 0 30 24', '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#ffc2da"/></linearGradient></defs>'
      + '<g class="mhs-wing" fill="url(#' + id + ')" stroke="#ff9cc2" stroke-width=".5"><path d="M15 12C9 1 1 2 2.5 9c1 4 7 4.5 12.5 3z"/><path d="M15 12c-5.5 2-10 7.5-6.5 9.5 3 1.2 5.6-3.6 6.5-9.5z" opacity=".85"/></g>'
      + '<g class="mhs-wing" fill="url(#' + id + ')" stroke="#ff9cc2" stroke-width=".5"><path d="M15 12c6-11 14-10 12.5-3-1 4-7 4.5-12.5 3z"/><path d="M15 12c5.5 2 10 7.5 6.5 9.5-3 1.2-5.6-3.6-6.5-9.5z" opacity=".85"/></g>'
      + '<path d="M15 6.5v11" stroke="#5a3a52" stroke-width="1.4" stroke-linecap="round"/><path d="M15 6.5c-1-2.5-2.2-4-3.6-4.6M15 6.5c1-2.5 2.2-4 3.6-4.6" stroke="#5a3a52" stroke-width=".6" fill="none"/>');
  };

  // Sapin en silhouette (forme à étages)
  var PINE = [[0, -1], [0.2, -0.74], [0.11, -0.74], [0.34, -0.46], [0.21, -0.46], [0.5, -0.13], [0.07, -0.13], [0.07, 0], [-0.07, 0], [-0.07, -0.13], [-0.5, -0.13], [-0.21, -0.46], [-0.34, -0.46], [-0.11, -0.74], [-0.2, -0.74]];
  var pine = function (x, base, h) {
    var w = h * 0.62;
    return 'M' + PINE.map(function (p) { return r1(x + p[0] * w) + ' ' + r1(base + p[1] * h); }).join('L') + 'Z';
  };

  // Horizon enneigé avec forêt (Noël : sapins verts et guirlandes ; hiver : sapins bleu nuit)
  // W = largeur du dessin (1200 par défaut) ; plus large sur une bannière très basse pour garder des sapins entiers
  var snowScene = function (festive, W) {
    W = W || 1200;
    var k = W / 1200;
    var back = '';
    for (var x = -10; x < W + 20; x += rand(20, 30)) back += pine(x, rand(96, 102), rand(24, 44));
    var front = '';
    var lights = '';
    [[0, 230], [300, 420], [470, 700], [780, 900], [970, 1210]].forEach(function (span) {
      for (var fx = span[0] * k; fx < span[1] * k; fx += rand(26, 40)) {
        var h = rand(44, 76);
        var base = rand(114, 118);
        front += pine(fx, base, h);
        if (!festive) continue;
        for (var n = 0; n < 4; n += 1) {
          var t = rand(0.18, 0.85);
          var lx = fx + rand(-0.38, 0.38) * h * 0.62 * t;
          lights += '<circle cx="' + r1(lx) + '" cy="' + r1(base - h + t * h * 0.87) + '" r="' + r1(rand(1.1, 1.7)) + '" fill="' + ['#ffd27a', '#ff7a7a', '#fff3c4', '#ffb347'][n] + '"/>';
        }
      }
    });
    return '<div class="mhs-scene mhs-scene--ground">' + svg('0 0 ' + W + ' 140',
      '<g transform="scale(' + k + ' 1)"><path d="M0 92C160 70 320 84 480 76s320-16 480 2 240-4 240-4v66H0z" fill="#fff" opacity=".14"/></g>'
      + '<path d="' + back + '" fill="#fff" opacity="' + (festive ? '.1' : '.16') + '"/>'
      + '<path transform="scale(' + k + ' 1)" d="M0 104C200 88 380 100 600 94s420-12 600 4v42H0z" fill="#fff" opacity=".22"/>'
      + '<path d="' + front + '" fill="' + (festive ? '#0b3d2a' : '#0e2d63') + '" opacity=".92"/>'
      + (lights ? '<g class="mhs-lt">' + lights + '</g>' : '')
      + '<g transform="scale(' + k + ' 1)"><path d="M0 118C200 104 420 116 640 110s360-10 560 2v28H0z" fill="#fff"/>'
      + '<path d="M0 127c260-10 520 2 800-6s280 0 400 2v17H0z" fill="#e4effd"/></g>',
      ' preserveAspectRatio="xMidYMax slice"') + '</div>';
  };

  // Boule de Noël brillante suspendue
  var ORN = { red: ['#ff9a9a', '#e3263b', '#6e0716'], gold: ['#fff2bf', '#e6b442', '#7d520d'], green: ['#a6e8c0', '#1e8a55', '#093a22'], silver: ['#fff', '#d6dfec', '#6f7d95'] };
  var bauble = function (len, r, color) {
    var c = ORN[color];
    var id = 'mhsor' + (uid += 1);
    var w = r * 2 + 8;
    var cx = r + 4;
    var cy = len + 7 + r;
    return svg('0 0 ' + w + ' ' + (cy + r + 2), '<defs><radialGradient id="' + id + '" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="' + c[0] + '"/><stop offset=".45" stop-color="' + c[1] + '"/><stop offset="1" stop-color="' + c[2] + '"/></radialGradient></defs>'
      + '<path d="M' + cx + ' 0V' + (len + 2) + '" stroke="#e8c76a" stroke-width=".9" opacity=".85"/>'
      + '<rect x="' + (cx - 4) + '" y="' + len + '" width="8" height="7" rx="1.5" fill="#d8b056"/><rect x="' + (cx - 4) + '" y="' + (len + 1.5) + '" width="8" height="1.2" fill="#fff1c2" opacity=".7"/>'
      + '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="url(#' + id + ')"/>'
      + '<ellipse cx="' + r1(cx - r * 0.34) + '" cy="' + r1(cy - r * 0.42) + '" rx="' + r1(r * 0.3) + '" ry="' + r1(r * 0.17) + '" fill="#fff" opacity=".6" transform="rotate(-32 ' + r1(cx - r * 0.34) + ' ' + r1(cy - r * 0.42) + ')"/>'
      + '<path d="M' + r1(cx - r * 0.96) + ' ' + r1(cy + r * 0.12) + 'Q' + cx + ' ' + r1(cy + r * 0.42) + ' ' + r1(cx + r * 0.96) + ' ' + r1(cy + r * 0.12) + '" stroke="#fff3c9" stroke-width="1" fill="none" opacity=".45"/>', ' width="' + w + '" height="' + (cy + r + 2) + '"');
  };
  var ornaments = function () {
    // Emplacements possibles ; ceux qui touchent un texte, un bouton ou une photo sont cachés (hideCovered)
    var list = [[30, 20, 13, 'gold'], [34, 46, 11, 'red'], [38, 26, 15, 'red'], [43.5, 64, 11, 'gold'], [48.5, 16, 19, 'silver'], [53.5, 48, 13, 'green'],
      [58, 30, 10, 'red'], [61.5, 70, 12, 'gold'], [66, 22, 16, 'silver'], [71, 52, 12, 'green'], [76, 18, 14, 'red'], [81, 40, 11, 'gold']];
    return '<div class="mhs-orns">' + list.map(function (o, i) {
      return '<span class="mhs-orn" style="left:' + o[0] + '%;--sw:' + r1(rand(3.5, 6)) + 's;--sd:-' + r1(rand(0, 4)) + 's">' + bauble(o[1], o[2], o[3]) + '</span>';
    }).join('') + '</div>';
  };

  // Branche de cerisier en fleurs (accrochée en haut à droite)
  var sakura = function (cx, cy, r, rot, id) {
    var petal = 'M0 0C' + r1(-0.62 * r) + ' ' + r1(-0.3 * r) + ' ' + r1(-0.64 * r) + ' ' + r1(-0.96 * r) + ' ' + r1(-0.2 * r) + ' ' + r1(-1.03 * r)
      + 'L0 ' + r1(-0.86 * r) + 'L' + r1(0.2 * r) + ' ' + r1(-1.03 * r) + 'C' + r1(0.64 * r) + ' ' + r1(-0.96 * r) + ' ' + r1(0.62 * r) + ' ' + r1(-0.3 * r) + ' 0 0Z';
    var out = '<g transform="translate(' + cx + ' ' + cy + ') rotate(' + rot + ')">';
    for (var a = 0; a < 360; a += 72) out += '<path d="' + petal + '" transform="rotate(' + a + ')" fill="url(#' + id + ')"/>';
    var stam = '';
    for (var s = 0; s < 360; s += 45) {
      var rad = s * Math.PI / 180;
      var ex = r1(Math.sin(rad) * r * 0.48);
      var ey = r1(-Math.cos(rad) * r * 0.48);
      stam += '<path d="M0 0L' + ex + ' ' + ey + '" stroke="#ff6f99" stroke-width=".7"/><circle cx="' + ex + '" cy="' + ey + '" r=".95" fill="#ffd34d"/>';
    }
    return out + '<circle r="' + r1(r * 0.2) + '" fill="#ff5c8a"/>' + stam + '</g>';
  };
  var branch = function (cls) {
    var id = 'mhssk' + (uid += 1);
    var flowers = [[296, 14, 13, 10], [262, 26, 11, 40], [234, 50, 14, -8], [216, 80, 12, 25], [204, 108, 10, 0], [182, 60, 12, 55], [148, 80, 13, -20], [120, 44, 11, 15], [128, 100, 9, 60], [84, 106, 12, 5], [50, 108, 10, 35], [92, 142, 9, -15], [22, 104, 8, 20]];
    var buds = [[172, 66, -30], [104, 32, 20], [62, 98, -10], [93, 157, 0], [196, 92, 40], [12, 110, 70]];
    return '<div class="mhs-branch' + (cls ? ' ' + cls : '') + '">' + svg('0 0 320 175', '<defs><radialGradient id="' + id + '" cx=".5" cy="1" r="1.1"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#ffe0ec"/><stop offset="1" stop-color="#ff9fc3"/></radialGradient></defs>'
      + '<g fill="none" stroke="#4a2c2a" stroke-linecap="round"><path d="M330 4c-34 6-66 18-100 30" stroke-width="7"/><path d="M230 34c-30 16-50 30-82 44-28 12-50 22-80 27-22 4-42 4-62 2" stroke-width="4.2"/>'
      + '<path d="M230 34c-8 24-16 50-26 74" stroke-width="2.8"/><path d="M150 77c-10-18-22-30-38-40" stroke-width="2.4"/><path d="M95 99c-6 18-8 34-4 58" stroke-width="2"/><path d="M198 58c8 8 12 18 14 28" stroke-width="1.8"/></g>'
      + buds.map(function (b) { return '<g transform="translate(' + b[0] + ' ' + b[1] + ') rotate(' + b[2] + ')"><ellipse rx="3.6" ry="5.6" fill="#ff8fb5"/><path d="M-3 3c2 3 4 3 6 0" fill="#6f8f3a"/></g>'; }).join('')
      + flowers.map(function (f) { return sakura(f[0], f[1], f[2], f[3], id); }).join('')) + '</div>';
  };

  // Palmier en silhouette (tronc courbé, palmes à folioles)
  var frond = function (cx, cy, len, ang, droop) {
    var a = ang * Math.PI / 180;
    var tx = cx + Math.cos(a) * len;
    var ty = cy + Math.sin(a) * len + droop;
    var mx = cx + Math.cos(a) * len * 0.5;
    var my = cy + Math.sin(a) * len * 0.5 - droop * 0.35;
    var point = function (t) {
      var u = 1 - t;
      return [u * u * cx + 2 * u * t * mx + t * t * tx, u * u * cy + 2 * u * t * my + t * t * ty];
    };
    var d = 'M' + r1(cx) + ' ' + r1(cy) + 'Q' + r1(mx) + ' ' + r1(my) + ' ' + r1(tx) + ' ' + r1(ty);
    var leaves = '';
    for (var t = 0.1; t < 0.97; t += 0.065) {
      var p = point(t);
      var q = point(t + 0.02);
      var dx = q[0] - p[0];
      var dy = q[1] - p[1];
      var n = Math.sqrt(dx * dx + dy * dy) || 1;
      dx /= n; dy /= n;
      var leafLen = len * 0.3 * Math.pow(Math.sin(Math.PI * t), 0.6);
      [-1, 1].forEach(function (side) {
        // Foliole tournée vers l'arrière et vers le bas
        var lx = dx * 0.55 + (-dy * side) * 0.83;
        var ly = dy * 0.55 + (dx * side) * 0.83 + 0.35;
        var ln = Math.sqrt(lx * lx + ly * ly);
        lx /= ln; ly /= ln;
        leaves += 'M' + r1(p[0] - dx * 2.2) + ' ' + r1(p[1] - dy * 2.2) + 'L' + r1(p[0] + lx * leafLen) + ' ' + r1(p[1] + ly * leafLen) + 'L' + r1(p[0] + dx * 2.2) + ' ' + r1(p[1] + dy * 2.2) + 'Z';
      });
    }
    return '<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="' + leaves + '"/>';
  };
  var palm = function (cls) {
    var crown = [100, 72];
    var fronds = [[78, 200, 34], [86, 228, 20], [72, 256, 6], [66, 290, 4], [80, 318, 16], [88, 346, 30], [70, 12, 40], [60, 160, 30]];
    return '<div class="mhs-palm ' + cls + '">' + svg('0 0 200 260', '<path d="M52 262C62 182 78 122 96 72l8 3C88 125 74 184 68 262z"/>'
      + '<g class="mhs-crown">' + fronds.map(function (f) { return frond(crown[0], crown[1], f[0], f[1], f[2]); }).join('')
      + '<circle cx="97" cy="78" r="5"/><circle cx="105" cy="79" r="4.5"/></g>', ' fill="currentColor"') + '</div>';
  };

  // Mer : trois couches de vagues transparentes, reflets et sable
  var waves = function (y, amp, step) {
    var d = 'M0 ' + y;
    for (var x = 0; x < 2400; x += step) d += 'q' + (step / 2) + ' ' + (-amp) + ' ' + step + ' 0';
    return d + 'V140H0z';
  };
  var seaScene = function () {
    var glints = '';
    for (var g = 0; g < 9; g += 1) glints += '<i style="left:' + r1(rand(4, 96)) + '%;bottom:' + r1(rand(34, 62)) + '%;--d:' + r1(rand(1.8, 3.6)) + 's;--delay:-' + r1(rand(0, 3)) + 's;width:' + r1(rand(8, 18)) + 'px"></i>';
    return '<div class="mhs-scene mhs-scene--ground mhs-scene--sea">'
      + '<div class="mhs-wave mhs-wave--1">' + svg('0 0 2400 140', '<path d="' + waves(78, 10, 120) + '" fill="#4fc3e0" opacity=".45"/>', ' preserveAspectRatio="none"') + '</div>'
      + '<div class="mhs-wave mhs-wave--2">' + svg('0 0 2400 140', '<path d="' + waves(92, 12, 160) + '" fill="#1aa6c9" opacity=".7"/>', ' preserveAspectRatio="none"') + '</div>'
      + '<div class="mhs-wave mhs-wave--3">' + svg('0 0 2400 140', '<path d="' + waves(104, 9, 100) + '" fill="#0b7fa6" opacity=".9"/><path d="' + waves(104, 9, 100).replace('V140H0z', '') + '" fill="none" stroke="#fff" stroke-width="2" opacity=".55"/>', ' preserveAspectRatio="none"') + '</div>'
      + '<div class="mhs-glints">' + glints + '</div>'
      + svg('0 0 1200 140', '<path d="M0 124c240-12 520 2 760-4s340-6 440 0v20H0z" fill="#f3cf92"/><path d="M0 132c300-6 600 4 900-2s220 0 300 2v8H0z" fill="#e7b977"/>', ' preserveAspectRatio="xMidYMax slice" class="mhs-sand"')
      + '</div>';
  };

  var SCENES = {
    xmas: function (desk, W) { return snowScene(true, W) + (desk ? ornaments() : ''); },
    winter: function (desk, W) { return snowScene(false, W); },
    spring: function (desk) { return branch() + (desk ? branch('mhs-branch--low') : ''); },
    summer: function () { return '<div class="mhs-sun"><b></b></div>' + seaScene() + palm('mhs-palm--l') + palm('mhs-palm--r'); }
  };

  // ---------- Ordinateur : vêtements de saison posés sur la carte de la bannière ----------
  // Motifs de tissu : [type, couleur de fond, couleur 2, couleur 3]
  var fabric = function (id, kind, c1, c2, c3) {
    var body = '<rect width="64" height="24" fill="' + c1 + '"/>';
    if (kind === 'stripes') body += '<rect y="0" width="64" height="7" fill="' + c2 + '"/><rect y="9" width="64" height="2" fill="' + c3 + '"/>';
    if (kind === 'plaid') body += '<rect width="9" height="24" fill="' + c2 + '" opacity=".55"/><rect width="64" height="8" fill="' + c2 + '" opacity=".55"/><path d="M15 0v24M0 14h64" stroke="' + c3 + '" stroke-width="1.2" opacity=".8"/>';
    if (kind === 'dots') body += '<circle cx="8" cy="6" r="2.6" fill="' + c2 + '"/><circle cx="30" cy="16" r="2.6" fill="' + c3 + '"/><circle cx="52" cy="6" r="2.6" fill="' + c2 + '"/>';
    if (kind === 'towel') body += '<rect y="0" width="64" height="9" fill="' + c2 + '"/><rect y="12" width="64" height="5" fill="' + c3 + '"/>';
    return '<pattern id="' + id + '" width="64" height="24" patternUnits="userSpaceOnUse">' + body + '</pattern>';
  };
  // Écharpe posée sur le bord gauche (un pli sur le bord, deux pans qui pendent, franges)
  var scarf = function (kind, c1, c2, c3) {
    var p = 'mhsfab' + (uid += 1);
    var s = 'mhssh' + uid;
    var fringe = '';
    for (var fx = 11; fx <= 33; fx += 3) fringe += 'M' + fx + ' 209v13';
    for (var gx = 34; gx <= 51; gx += 3) fringe += 'M' + gx + ' 170v11';
    return svg('0 0 64 230', '<defs>' + fabric(p, kind, c1, c2, c3) + '<linearGradient id="' + s + '" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient></defs>'
      + '<path d="M30 24l24-2q2 78-2 148l-20 2q2-74-2-148z" fill="url(#' + p + ')"/><path d="M30 24l24-2q2 78-2 148l-20 2q2-74-2-148z" fill="url(#' + s + ')"/>'
      + '<path d="' + fringe + '" stroke="' + c1 + '" stroke-width="1.6" stroke-linecap="round"/>'
      + '<path d="M8 20h26q2 90 0 190l-24-4q2-96-2-186z" fill="url(#' + p + ')"/><path d="M8 20h26q2 90 0 190l-24-4q2-96-2-186z" fill="url(#' + s + ')"/>'
      + '<path d="M2 6q30-10 60 0l-2 24q-28-8-56 0z" fill="url(#' + p + ')"/><path d="M2 6q30-10 60 0l-2 24q-28-8-56 0z" fill="#000" opacity=".12"/>');
  };
  var HATS = {
    santa: function () {
      var g = 'mhsht' + (uid += 1);
      return svg('0 0 120 100', '<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5a68"/><stop offset="1" stop-color="#a50f1d"/></linearGradient></defs>'
        + '<path d="M14 78C30 40 62 14 98 18c10 2 14 12 8 22-10 18-22 30-26 42z" fill="url(#' + g + ')"/>'
        + '<path d="M6 74q42-12 82 6 4 12-2 18-40-14-82-6-4-8 2-18z" fill="#fff"/><path d="M8 88q40-8 78 8" stroke="#dfe4ec" stroke-width="3" fill="none"/>'
        + '<circle cx="107" cy="45" r="12" fill="#fff"/><circle cx="103" cy="49" r="6" fill="#e9edf3"/>');
    },
    beanie: function (c1, c2, c3) {
      var ribs = '';
      for (var x = 18; x <= 92; x += 8) ribs += 'M' + x + ' 66C' + (x + (x - 55) * 0.15) + ' 44 ' + (55 + (x - 55) * 0.55) + ' 24 55 16';
      var cuff = '';
      for (var cx = 10; cx <= 100; cx += 6) cuff += 'M' + cx + ' 67v20';
      return svg('0 0 110 100', '<path d="M10 70C10 30 40 12 55 12s45 18 45 58z" fill="' + c1 + '"/><path d="' + ribs + '" stroke="#000" stroke-opacity=".14" stroke-width="2" fill="none"/>'
        + '<rect x="4" y="62" width="102" height="28" rx="8" fill="' + c2 + '"/><path d="' + cuff + '" stroke="#000" stroke-opacity=".16" stroke-width="2"/>'
        + '<g fill="' + c3 + '"><circle cx="55" cy="12" r="13"/><circle cx="46" cy="8" r="7"/><circle cx="64" cy="7" r="7"/><circle cx="55" cy="2" r="6"/></g><circle cx="51" cy="8" r="4" fill="#fff" opacity=".35"/>');
    },
    sun: function (ribbon) {
      var g = 'mhsst' + (uid += 1);
      return svg('0 0 140 82', '<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6e2b0"/><stop offset="1" stop-color="#d4a85a"/></linearGradient></defs>'
        + '<ellipse cx="70" cy="58" rx="67" ry="19" fill="url(#' + g + ')"/><path d="M8 58q62 18 124 0" stroke="#b9873c" stroke-opacity=".45" fill="none"/>'
        + '<path d="M18 56q52 14 104 0M28 52q42 10 84 0" stroke="#a87a33" stroke-opacity=".25" fill="none"/>'
        + '<path d="M38 54c0-32 64-32 64 0z" fill="url(#' + g + ')"/><path d="M44 40q26-8 52 0M42 30q28-8 56 0" stroke="#a87a33" stroke-opacity=".25" fill="none"/>'
        + '<path d="M38.5 47q31 8 63 0l.5 8q-32 8-64 0z" fill="' + ribbon + '"/><path d="M96 50l14 10-4 4-12-8z" fill="' + ribbon + '" opacity=".85"/>');
    }
  };
  var ACCS = {
    mittens: function (c1, c2) {
      var one = function (x, rot) {
        return '<g transform="translate(' + x + ' 6) rotate(' + rot + ' 24 40)"><path d="M8 66V30C8 14 20 6 30 8s14 12 14 22v36z" fill="' + c1 + '"/>'
          + '<path d="M9 42C-1 38-2 24 6 21c4-1 8 3 8 8" fill="' + c1 + '"/><path d="M16 30l6 6 6-6 6 6 6-6" stroke="' + c2 + '" stroke-width="2.4" fill="none" opacity=".9"/>'
          + '<rect x="5" y="62" width="42" height="14" rx="4" fill="' + c2 + '"/><path d="M11 63v12M17 63v12M23 63v12M29 63v12M35 63v12M41 63v12" stroke="#000" stroke-opacity=".14" stroke-width="2"/></g>';
      };
      return svg('0 0 110 90', one(0, -12) + one(52, 10));
    },
    sunglasses: function (frame) {
      var g = 'mhssg' + (uid += 1);
      return svg('0 0 130 54', '<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b2a52"/><stop offset=".6" stop-color="#1b1328"/><stop offset="1" stop-color="#ff9a5a"/></linearGradient></defs>'
        + '<path d="M4 16l-2-8M126 16l2-8" stroke="' + frame + '" stroke-width="4" stroke-linecap="round"/>'
        + '<rect x="4" y="12" width="52" height="34" rx="15" fill="url(#' + g + ')" stroke="' + frame + '" stroke-width="4"/><rect x="74" y="12" width="52" height="34" rx="15" fill="url(#' + g + ')" stroke="' + frame + '" stroke-width="4"/>'
        + '<path d="M56 24q9-8 18 0" stroke="' + frame + '" stroke-width="4" fill="none"/><path d="M14 20q8-4 16-2M84 20q8-4 16-2" stroke="#fff" stroke-opacity=".55" stroke-width="2.5" stroke-linecap="round"/>');
    },
    sneaker: function (c1, c2) {
      return svg('0 0 132 72', '<path d="M4 54q0 12 12 12h104q10 0 8-12z" fill="#fff"/><path d="M4 58h124" stroke="#d9dce6" stroke-width="2"/>'
        + '<path d="M8 56c0-20 12-30 32-30l22-4c14 8 30 12 46 18 12 4 18 10 18 16z" fill="' + c1 + '"/>'
        + '<path d="M40 27c4 10 14 16 30 18" stroke="' + c2 + '" stroke-width="5" fill="none" stroke-linecap="round"/>'
        + '<path d="M50 26l6 8M58 25l6 8M66 26l6 8" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><circle cx="20" cy="40" r="3" fill="#fff" opacity=".7"/>');
    },
    boot: function (c1, c2) {
      return svg('0 0 100 104', '<path d="M24 4h34l2 54c14 4 30 10 34 20 2 6 0 12-6 12H28l-4-8z" fill="' + c1 + '"/>'
        + '<path d="M24 82h66q4 0 4 4v4q0 4-6 4H30q-6 0-6-6z" fill="' + c2 + '"/><path d="M24 82v18h14V90" fill="' + c2 + '"/>'
        + '<path d="M28 12h28M58 30q-10 4-30 0" stroke="#fff" stroke-opacity=".22" stroke-width="2.5" fill="none"/><path d="M30 4v54" stroke="#000" stroke-opacity=".15" stroke-width="2"/>');
    }
  };
  // Haut de bikini suspendu au coin (été) : bretelle sur le bord, deux triangles à motif, liens qui pendent
  var bikini = function (c1, c2) {
    var p = 'mhsbk' + (uid += 1);
    var s = 'mhsbs' + uid;
    var cupL = 'M18 40C10 56 6 72 8 84q14 8 26 0C30 68 24 52 18 40z';
    var cupR = 'M52 40c8 16 12 32 10 44q-14 8-26 0c4-16 10-32 16-44z';
    return svg('0 0 70 130', '<defs><pattern id="' + p + '" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="' + c1 + '"/><circle cx="3" cy="3" r="1.7" fill="' + c2 + '"/><circle cx="9" cy="9" r="1.7" fill="' + c2 + '"/></pattern>'
      + '<linearGradient id="' + s + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient></defs>'
      + '<g fill="none" stroke="' + c1 + '" stroke-width="2.4" stroke-linecap="round"><path d="M8 6q27-12 54 0"/><path d="M12 6l6 34M58 6l-6 34"/><path d="M8 84c-6 12-6 26-2 40M62 84c6 12 6 26 2 40"/></g>'
      + '<path d="' + cupL + '" fill="url(#' + p + ')"/><path d="' + cupL + '" fill="url(#' + s + ')"/>'
      + '<path d="' + cupR + '" fill="url(#' + p + ')"/><path d="' + cupR + '" fill="url(#' + s + ')"/>'
      + '<circle cx="35" cy="84" r="3.4" fill="none" stroke="#f3d27a" stroke-width="2"/><circle cx="6" cy="124" r="2.6" fill="' + c1 + '"/><circle cx="64" cy="124" r="2.6" fill="' + c1 + '"/>');
  };
  var PROPS = {
    xmas: function () { return [HATS.santa(), scarf('stripes', '#c3132b', '#fff', '#ffd34d'), ACCS.mittens('#d61f30', '#fff')]; },
    winter: function () { return [HATS.beanie('#3c7be0', '#2a5fb8', '#fff'), scarf('stripes', '#e9f2ff', '#4d86e6', '#9cc3ff'), ACCS.mittens('#3c7be0', '#e9f2ff')]; },
    spring: function () { return [HATS.sun('#ff8fb8'), scarf('dots', '#ffe6f0', '#ff8fb8', '#9fd8ff'), ACCS.sneaker('#ffc9dc', '#b98cff')]; },
    summer: function () { return [HATS.sun('#ff5a5f'), bikini('#ff5a6e', '#fff'), ACCS.sunglasses('#e0a336')]; },
    autumn: function () { return [HATS.beanie('#d98a2b', '#b56d1c', '#f6e3c3'), scarf('plaid', '#a5482a', '#e8a04a', '#f6e3c3'), ACCS.boot('#7a4a2a', '#4a2c18')]; }
  };
  var addProps = function (hero) {
    if (!PROPS[current] || !hero.parentNode) return;
    var items = PROPS[current]();
    var box = document.createElement('div');
    box.className = 'mhs-props';
    box.setAttribute('data-season', current);
    box.setAttribute('aria-hidden', 'true');
    box.innerHTML = '<span class="mhs-prop mhs-prop--hat">' + items[0] + '</span><span class="mhs-prop mhs-prop--scarf">' + items[1] + '</span><span class="mhs-prop mhs-prop--acc">' + items[2] + '</span>';
    hero.parentNode.insertBefore(box, hero.nextSibling);
    // Même place que la carte (positionnée par rapport au même parent)
    var place = function () {
      box.style.top = hero.offsetTop + 'px';
      box.style.left = hero.offsetLeft + 'px';
      box.style.width = hero.offsetWidth + 'px';
      box.style.height = hero.offsetHeight + 'px';
      box.hidden = !hero.offsetWidth;
    };
    place();
    if (window.ResizeObserver) new ResizeObserver(place).observe(hero);
    window.addEventListener('resize', place);
    window.addEventListener('load', place);
  };

  // ---------- Bannières ----------
  // [sélecteur, classe ajoutée, ordinateur seulement, vêtements posés sur la carte]
  var HEROES = [
    ['.mhh[data-mhh]', '', false],
    ['.dhp-hero', 'mhs-light', true, true],
    ['.dcl .cph', 'mhs-dark', true, true],
    ['.dct-hero', 'mhs-dark', true, true],
    ['.dtr .trust-badges', 'mhs-dark', true],
    ['.wishlist-page__heading', 'mhs-dark', true, true],
    ['.cart-m', 'mhs-cart', true]
  ];
  var desktop = window.matchMedia('(min-width: 761px)');

  var particle = function (type, i) {
    var fly = type === 'fly';
    var size = { drop: rand(16, 28), flake: rand(3, 7), star: rand(7, 12), fly: rand(20, 26), crystal: rand(10, 20), bokeh: rand(24, 70), petal: rand(9, 15) }[type] || rand(12, 20);
    var duration = { drop: rand(0.7, 1.2), star: rand(1.6, 3), fly: rand(10, 15), crystal: rand(9, 15), bokeh: rand(5, 9), petal: rand(6, 11) }[type] || rand(5, 10);
    var top = type === 'star' || type === 'bokeh' ? rand(6, 80) : fly ? rand(30, 62) : null;
    return '<i class="mhh-sz__' + type + '" style="'
      + 'left:' + (fly ? 0 : r1(rand(-4, 100))) + '%;'
      + (top !== null ? 'top:' + r1(top) + '%;' : '')
      + '--s:' + r1(size) + 'px;'
      + '--d:' + r1(duration) + 's;'
      + '--delay:-' + r1(rand(0, duration)) + 's;'
      + '--dx:' + Math.round(rand(-40, 40)) + 'px;'
      + '--r:' + Math.round(rand(-260, 260)) + 'deg;'
      + '--r3:' + Math.round(rand(360, 900)) + 'deg;'
      + '--o:' + (fly ? 1 : r1(rand(0.55, 1))) + '">'
      + (fly ? butterfly(i) : type === 'crystal' ? CRYSTAL : '') + '</i>';
  };

  var decorate = function (hero, kind, withProps) {
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
      var count = Math.round(part[1] * (part[0] === 'fly' ? Math.min(scale, 1.5) : scale));
      for (var i = 0; i < count; i += 1) html += particle(part[0], i);
    });
    layer.innerHTML = (SCENES[current] ? SCENES[current](Boolean(kind), kind === 'mhs-light' ? Math.round(hero.offsetWidth * 140 / 44) : 0) : '') + html;
    hero.insertBefore(layer, hero.firstChild);
    if (withProps) addProps(hero);
    // Boules de Noël : cachées si elles passeraient derrière un texte, un bouton ou une photo
    var hideCovered = function () {
      var orns = layer.querySelectorAll('.mhs-orn');
      if (!orns.length) return;
      // Lignes de texte réelles (pas les blocs pleine largeur), puis photos, boutons et cartes
      var blocks = [];
      var walker = document.createTreeWalker(hero, NodeFilter.SHOW_TEXT);
      var range = document.createRange();
      for (var node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.nodeValue.trim() || layer.contains(node)) continue;
        range.selectNodeContents(node);
        [].push.apply(blocks, [].slice.call(range.getClientRects()));
      }
      [].forEach.call(hero.querySelectorAll('img,button,a[class*="way"],a[class*="btn"],a[class*="cta"],[class*="__usp"] > *'), function (el) {
        if (!layer.contains(el) && el.offsetWidth) blocks.push(el.getBoundingClientRect());
      });
      [].forEach.call(orns, function (orn) {
        orn.style.visibility = '';
        var box = orn.getBoundingClientRect();
        var hit = blocks.some(function (b) {
          return box.left < b.right + 8 && box.right > b.left - 8 && box.top < b.bottom + 6 && box.bottom > b.top - 6;
        });
        if (hit) orn.style.visibility = 'hidden';
      });
    };
    // Hauteur de chute = hauteur de la bannière ; traversée des papillons = largeur
    var syncFall = function () {
      layer.style.setProperty('--fall', (hero.offsetHeight + 30) + 'px');
      layer.style.setProperty('--wide', (hero.offsetWidth + 40) + 'px');
      hideCovered();
    };
    // Photos et polices chargées plus tard : nouvelle vérification
    setTimeout(hideCovered, 1200);
    setTimeout(hideCovered, 3500);
    syncFall();
    if (window.ResizeObserver) new ResizeObserver(syncFall).observe(hero);
  };

  var scan = function () {
    HEROES.forEach(function (hero) {
      if (hero[2] && !desktop.matches) return;
      document.querySelectorAll(hero[0]).forEach(function (el) {
        if (!el.hasAttribute('data-season')) decorate(el, hero[1], hero[3]);
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
