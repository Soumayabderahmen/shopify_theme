/* Lien vers une page marque (?view=brand) touché n'importe où sur le site (tuiles « Acheter par marque » de l'accueil,
   menu, panneau Categoria, « Venduto da » de la fiche produit…) : réponse tout de suite, comme les onglets des rayons
   (layout/theme.liquid). Le contenu de la page est remplacé par la page marque en attente (nom de la marque, pastilles,
   mosaïque et cartes grises animées) sous l'en-tête qui reste en place, puis le navigateur ouvre la vraie page (déjà
   téléchargée au survol ou au premier contact du doigt : règles « speculationrules » de layout/theme.liquid).
   Sur la page marque elle-même, ses liens ([data-br]) sont gérés par assets/desktop-brand.js (sans rechargement). */
(function () {
  'use strict';
  if (window.__brandInstant) return;
  window.__brandInstant = true;

  var CSS = ''
    + 'html.bri-on #content > :not(.bri){display:none!important}'
    + '.bri{min-height:100vh;background:#fff;color:#16123f}'
    + '.bri__hero{display:grid;justify-items:center;gap:18px;padding:96px 20px 40px;background:linear-gradient(180deg,#14110d,#2a241d)}'
    + '.bri__name{max-width:92vw;overflow:hidden;color:rgb(255 255 255/24%);font:900 112px/0.95 Anton,Figtree,sans-serif;letter-spacing:-1px;white-space:nowrap;text-overflow:ellipsis;text-transform:uppercase;transform:skewX(-10deg);animation:bri-pulse 1.2s ease-in-out infinite}'
    + '.bri__meta{width:min(360px,72vw);height:16px;background:rgb(255 255 255/14%);border-radius:8px;animation:bri-pulse 1.2s ease-in-out infinite}'
    + '.bri__pills{display:flex;gap:8px;justify-content:center;max-width:100%;overflow:hidden}'
    + '.bri__pills i{flex:none;width:118px;height:48px;background:rgb(255 255 255/12%);border-radius:999px;animation:bri-pulse 1.2s ease-in-out infinite}'
    + '.bri__wrap{max-width:1280px;margin:0 auto;padding:34px 24px 60px}'
    + '.bri__eyebrow{width:90px;height:11px;margin-bottom:12px;border-radius:6px}'
    + '.bri__title{width:min(340px,70%);height:34px;margin-bottom:22px;border-radius:10px}'
    + '.bri__bento{display:grid;grid-template-columns:1.25fr 1fr 1fr;grid-template-rows:200px 200px;gap:16px;margin-bottom:42px}'
    + '.bri__bento i:first-child{grid-row:span 2}.bri__bento i:last-child{grid-column:span 2}'
    + '.bri__grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:34px 22px}'
    + '.bri__card i{display:block}.bri__img{aspect-ratio:4/5;margin-bottom:12px;border-radius:22px}'
    + '.bri__l{height:12px;margin-bottom:8px;border-radius:6px}.bri__l--s{width:60%}'
    + '.bri__sk,.bri__bento i,.bri__card i{background:linear-gradient(100deg,#f0f0f4 30%,#f8f8fb 50%,#f0f0f4 70%) 0 0/300% 100%;animation:bri-shine 1.3s linear infinite}'
    + '@keyframes bri-pulse{50%{opacity:.5}}@keyframes bri-shine{to{background-position:-150% 0}}'
    + '@media (max-width:760px){.bri__hero{padding:64px 16px 26px;gap:14px}.bri__name{font-size:60px}.bri__pills{justify-content:flex-start;padding:0 2px}.bri__pills i{width:96px;height:42px}'
    + '.bri__wrap{padding:24px 12px 40px}.bri__title{height:26px}.bri__bento{grid-template-columns:1fr 1fr;grid-template-rows:none;grid-auto-rows:150px;gap:10px}'
    + '.bri__bento i:first-child{grid-row:auto;grid-column:span 2;height:190px}.bri__grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 10px}}'
    + '@media (prefers-reduced-motion:reduce){.bri *{animation:none!important}}';

  var esc = function (text) {
    return String(text).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; });
  };
  // Nom de la marque : texte du lien (tuile « Nike »), sinon title:"Misako" de l'adresse, sinon la collection (/collections/nike)
  var brandName = function (link) {
    var text = (link.textContent || '').replace(/\s+/g, ' ').trim();
    if (text && text.length <= 28) return text;
    var url = new URL(link.href, location.href);
    var q = (url.searchParams.get('q') || '').match(/title:"([^"]+)"/);
    if (q) return q[1];
    var handle = url.pathname.match(/\/collections\/([^/?#]+)/);
    return handle ? decodeURIComponent(handle[1]).replace(/-/g, ' ') : '';
  };
  var brandLink = function (target) {
    var link = target && target.closest && target.closest('a[href]');
    if (!link || link.target === '_blank' || link.hasAttribute('download') || link.closest('[data-br]')) return null;
    var url;
    try { url = new URL(link.href, location.href); } catch (error) { return null; }
    if (url.origin !== location.origin || url.searchParams.get('view') !== 'brand') return null;
    return link;
  };

  var ghost = null;
  var show = function (link) {
    var content = document.getElementById('content');
    if (!content) return;
    if (!document.getElementById('bri-style')) {
      var style = document.createElement('style');
      style.id = 'bri-style';
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    if (window.msheinPanels && typeof window.msheinPanels.closeAll === 'function') window.msheinPanels.closeAll();
    var repeat = function (html, n) { var out = ''; for (var i = 0; i < n; i += 1) out += html; return out; };
    var card = '<div class="bri__card"><i class="bri__img"></i><i class="bri__l"></i><i class="bri__l bri__l--s"></i></div>';
    if (ghost) ghost.remove();
    ghost = document.createElement('div');
    ghost.className = 'bri';
    ghost.setAttribute('aria-busy', 'true');
    ghost.innerHTML = '<div class="bri__hero"><div class="bri__name">' + esc(brandName(link)) + '</div><div class="bri__meta"></div>'
      + '<div class="bri__pills">' + repeat('<i></i>', 6) + '</div></div>'
      + '<div class="bri__wrap"><div class="bri__sk bri__eyebrow"></div><div class="bri__sk bri__title"></div>'
      + '<div class="bri__bento">' + repeat('<i></i>', 4) + '</div>'
      + '<div class="bri__grid">' + repeat(card, 8) + '</div></div>';
    content.insertBefore(ghost, content.firstChild);
    document.documentElement.classList.add('bri-on');
    // Haut de la page tout de suite (le défilement doux du thème serait coupé par l'ouverture de la page)
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    // En-tête fixe au-dessus du contenu (accueil mobile) : la page en attente commence sous lui
    var bottom = 0;
    document.elementsFromPoint(window.innerWidth / 2, 2).forEach(function (el) {
      if (ghost.contains(el)) return;
      var position = getComputedStyle(el).position;
      if (position === 'fixed' || position === 'sticky') bottom = Math.max(bottom, el.getBoundingClientRect().bottom);
    });
    var under = bottom - ghost.getBoundingClientRect().top;
    if (under > 0) ghost.style.paddingTop = Math.round(under) + 'px';
  };
  var go = function (link) {
    show(link);
    // Laisse le navigateur afficher la page en attente avant de partir
    requestAnimationFrame(function () { setTimeout(function () { window.location.href = link.href; }, 0); });
  };
  // Retour arrière vers cette page (mémoire du navigateur) : la page comme avant
  window.addEventListener('pageshow', function () {
    document.documentElement.classList.remove('bri-on');
    if (ghost) { ghost.remove(); ghost = null; }
  });

  // Doigt : départ dès qu'il se lève (le clic qui suit peut arriver bien plus tard pendant le chargement de la page) ;
  // le doigt qui fait défiler ne change pas de page.
  var touch = null;
  document.addEventListener('touchstart', function (event) {
    var link = event.touches.length === 1 && brandLink(event.target);
    touch = link ? { link: link, x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true, capture: true });
  document.addEventListener('touchmove', function (event) {
    if (touch && (Math.abs(event.touches[0].clientX - touch.x) > 10 || Math.abs(event.touches[0].clientY - touch.y) > 10)) touch = null;
  }, { passive: true, capture: true });
  document.addEventListener('touchend', function (event) {
    var touched = touch;
    touch = null;
    if (!touched || !event.cancelable) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    go(touched.link);
  }, { passive: false, capture: true });
  window.addEventListener('click', function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = brandLink(event.target);
    if (!link) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    go(link);
  }, true);
})();
