/* Fiches produit (fin du fichier) : même réponse immédiate, fiche en attente avec la photo, le titre et le prix de la
   carte touchée, sur ordinateur et là où la fiche ne s'ouvre pas déjà sur place (mobile : assets/mobile-pdp-layer.js).
   Lien vers une page marque (?view=brand) touché n'importe où sur le site (tuiles « Acheter par marque » de l'accueil,
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
    // Fiche produit en attente, rangée comme la vraie fiche ordinateur (assets/pdp-desktop-layout.css : galerie | infos |
    // panneau d'achat, 24 px de marge) : photo, nom et prix de la carte, et tout ce qui va arriver dessiné FLOU à sa
    // vraie place (livraison, vendeur, note, coupon, couleurs, tailles, Spedizione e resi, boutons d'achat). Les formes
    // respirent (opacité) : on voit que quelque chose s'affiche à cet endroit, pas une page bloquée.
    + '.bri--p{padding-bottom:60px}.bri__pw{padding:22px 24px 0}'
    + '.bri__b{display:block;border-radius:7px;background:#dde1ea;filter:blur(1.6px);animation:bri-breath 1.3s ease-in-out infinite}'
    + '.bri__b--g{background:#c9ead6}.bri__b--bl{background:#d9e9ff}.bri__b--in{background:#c9c6ee}.bri__b--pu{background:#e2dcff}'
    + '@keyframes bri-breath{0%,100%{opacity:.55}50%{opacity:1}}'
    + '.bri__crumb{width:min(420px,40%);height:13px;margin-bottom:24px}'
    + '.bri__pg{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr) 370px;column-gap:32px;align-items:start}'
    + '.bri__gal{position:relative;padding-left:82px}'
    + '.bri__thumbs{position:absolute;top:0;left:0;display:grid;gap:12px;width:70px}.bri__thumbs i{height:70px;border-radius:8px}'
    + '.bri__photo{position:relative;aspect-ratio:1;overflow:hidden;background:#fff;border-radius:8px}'
    + '.bri__photo img{position:absolute;inset:0;width:100%;height:100%;--height:100%;object-fit:contain}'
    + '.bri__tabs{width:120px;height:30px;margin:12px auto 0;border-radius:999px}'
    + '.bri__prot{height:120px;margin-top:18px;border-radius:14px}'
    + '.bri__vant{height:42px;border-radius:14px 14px 0 0;background:linear-gradient(90deg,#dcefff 0%,#e6ecff 50%,#eeeaff 100%)}'
    + '.bri__info .bri__b{margin-top:10px}'
    + '.bri__info .bri__sw .bri__b,.bri__info .bri__sz .bri__b{margin-top:0}'
    + '.bri__price{margin:16px 0 0;font:800 34px/34px Sora,Figtree,system-ui,sans-serif;color:#16123f}'
    + '.bri__ptitle{margin:14px 0 0;color:#16123f;font:600 20px/27px Figtree,system-ui,sans-serif;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}'
    + '.bri__sw{display:flex;gap:10px;margin-top:12px}.bri__sw i{width:64px;height:78px;border-radius:10px}'
    + '.bri__sz{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}.bri__sz i{width:58px;height:36px;border-radius:18px}'
    + '.bri__buy{display:grid;gap:16px}'
    + '.bri__box{padding:18px 20px;border:1px solid #e9ebf2;border-radius:14px}'
    + '.bri__row{display:grid;grid-template-columns:34px 1fr;gap:4px 12px;align-items:center;margin-top:18px}'
    + '.bri__row .bri__ic{grid-row:span 2;width:30px;height:30px;border-radius:50%}'
    + '.bri__pill{height:50px;margin-top:12px;border-radius:999px}'
    + '.bri__trust{display:flex;gap:12px;margin-top:14px}.bri__trust i{flex:1;height:46px;border-radius:10px}'
    + '@media (max-width:760px){.bri__pw{padding:0}.bri__crumb,.bri__thumbs,.bri__tabs,.bri__prot,.bri__buy{display:none}'
    + '.bri__pg{grid-template-columns:1fr;row-gap:0}.bri__gal{padding-left:0}.bri__photo{border-radius:0}.bri__info{padding:0 12px}'
    + '.bri__price{font-size:28px;line-height:30px}.bri__ptitle{font-size:16px;line-height:21.6px}}'
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

  // Lien vers une fiche produit (carte, recherche, menu…) : pas un bouton de la carte (panier, cœur), pas la fiche affichée
  var PRODUCT_PATH = /^(\/[a-z]{2}(?:-[a-z]{2})?)?\/(?:collections\/[^/]+\/)?products\/[^/?#]+\/?$/i;
  var productLink = function (target) {
    var link = target && target.closest && target.closest('a[href]');
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return null;
    var control = target.closest('button, input, select, textarea, label, [role="button"]');
    if (control && link.contains(control)) return null;
    var url;
    try { url = new URL(link.href, location.href); } catch (error) { return null; }
    if (url.origin !== location.origin || !PRODUCT_PATH.test(url.pathname)) return null;
    if (url.pathname.replace(/\/$/, '') === location.pathname.replace(/\/$/, '')) return null;
    return link;
  };
  // Photo, titre et prix de la carte touchée (affichés tout de suite dans la fiche en attente)
  var cardData = function (link) {
    var card = link.closest('.mshein-card, .alibaba-card, [class*="product-card"], .card, li, article') || link;
    var img = link.querySelector('img') || card.querySelector('img');
    var titleEl = card.querySelector('.mshein-card__title, [class*="title"], h2, h3, b, strong');
    var title = card.getAttribute('data-mshein-title') || (titleEl && titleEl.textContent) || link.getAttribute('title') || (img && img.alt) || '';
    // Prix affiché sans l'ancien prix barré (<s>) : « Dès €173,90 »
    var priceEl = card.querySelector('.mshein-card__now, [class*="price"]:not([class*="compare"]), [class*="__pr"]');
    var price = '';
    if (priceEl) {
      var copy = priceEl.cloneNode(true);
      copy.querySelectorAll('s, del, [class*="compare"], [class*="old"]').forEach(function (el) { el.remove(); });
      // Seulement « Dès €113,15 » (sans badge « -13% » collé derrière)
      var amount = copy.textContent.replace(/\s+/g, ' ').trim().match(/^[^\d€$£]{0,8}(?:[€$£]\s?\d(?:[\d\s.,]*\d)?|\d(?:[\d\s.,]*\d)?\s?(?:€|\$|£|CHF|kr|lei))/);
      price = amount ? amount[0].trim() : '';
    }
    return {
      img: img ? (img.currentSrc || img.src || '') : '',
      title: title.replace(/\s+/g, ' ').trim().slice(0, 160),
      price: price.length <= 24 ? price : ''
    };
  };

  var ghost = null;
  var show = function (link, kind) {
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
    if (kind === 'product') {
      var data = cardData(link);
      ghost.className = 'bri bri--p';
      // Forme floue : largeur, hauteur, couleur, décalage de la respiration
      var b = function (w, h, tone, delay, extra) {
        return '<i class="bri__b' + (tone ? ' bri__b--' + tone : '') + (extra ? ' ' + extra : '') + '" style="' + (w ? 'width:' + w + ';' : '') + (h ? 'height:' + h + 'px;' : '') + (delay ? 'animation-delay:' + delay + 's' : '') + '"></i>';
      };
      var row = '<div class="bri__row">' + b('', 0, '', 0, 'bri__ic') + b('62%', 13, '', 0.1) + b('84%', 11, '', 0.2) + '</div>';
      ghost.innerHTML = '<div class="bri__pw">' + b('', 0, '', 0, 'bri__crumb') + '<div class="bri__pg">'
        // Galerie : vignettes, photo de la carte, « Foto | Video », Protezioni
        + '<div class="bri__gal"><div class="bri__thumbs">' + repeat(b('', 0, '', 0.1), 5) + '</div>'
        + '<div class="bri__photo' + (data.img ? '' : ' bri__b') + '">' + (data.img ? '<img src="' + esc(data.img) + '" alt="">' : '') + '</div>'
        + b('', 0, '', 0.2, 'bri__tabs') + b('', 0, '', 0.3, 'bri__prot') + '</div>'
        // Infos : Vantaggi, prix et nom de la carte, livraison, date, vendeur, note, coupon, couleurs, tailles
        + '<div class="bri__info"><div class="bri__vant"></div>'
        + (data.price ? '<p class="bri__price">' + esc(data.price) + '</p>' : b('40%', 34, '', 0))
        + b('80px', 11, '', 0.1) + b('54%', 15, 'g', 0.15) + b('44%', 13, '', 0.2)
        + (data.title ? '<p class="bri__ptitle">' + esc(data.title) + '</p>' : b('90%', 22, '', 0) + b('60%', 22, '', 0.1))
        + b('32%', 12, '', 0.1) + b('62%', 14, '', 0.2) + b('', 73, 'bl', 0.3, 'bri__cpn')
        + '<div style="height:20px"></div>' + b('28%', 13, '', 0.1)
        + '<div class="bri__sw">' + b('', 0, '', 0.15) + b('', 0, '', 0.25) + b('', 0, '', 0.35) + b('', 0, '', 0.45) + b('', 0, '', 0.55) + '</div>'
        + '<div style="height:12px"></div>' + b('22%', 13, '', 0.1)
        + '<div class="bri__sz">' + b('', 0, '', 0.15) + b('', 0, '', 0.25) + b('', 0, '', 0.35) + b('', 0, '', 0.45) + b('', 0, '', 0.55) + '</div></div>'
        // Panneau d'achat : Spedizione e resi, quantité, Aggiungi al carrello, Shop Pay, garanties
        + '<div class="bri__buy"><div class="bri__box">' + b('46%', 16, '', 0) + row + row + row + '</div>'
        + '<div class="bri__box">' + b('70%', 13, '', 0.1) + b('', 0, 'in', 0.2, 'bri__pill') + b('', 0, 'pu', 0.3, 'bri__pill')
        + '<div class="bri__trust">' + b('', 0, '', 0.2) + b('', 0, '', 0.3) + b('', 0, '', 0.4) + '</div></div></div>'
        + '</div></div>';
    } else ghost.innerHTML = '<div class="bri__hero"><div class="bri__name">' + esc(brandName(link)) + '</div><div class="bri__meta"></div>'
      + '<div class="bri__pills">' + repeat('<i></i>', 6) + '</div></div>'
      + '<div class="bri__wrap"><div class="bri__sk bri__eyebrow"></div><div class="bri__sk bri__title"></div>'
      + '<div class="bri__bento">' + repeat('<i></i>', 4) + '</div>'
      + '<div class="bri__grid">' + repeat(card, 8) + '</div></div>';
    content.insertBefore(ghost, content.firstChild);
    document.documentElement.classList.add('bri-on');
    // Fiche ordinateur : pleine largeur malgré la marge du contenu du thème, comme la vraie fiche (--pl-x / --pl-w,
    // assets/pdp-desktop-layout.css) ; sinon toutes les formes étaient décalées de ~30 px.
    if (kind === 'product' && window.innerWidth > 760) {
      var left = ghost.getBoundingClientRect().left;
      ghost.style.marginLeft = -left + 'px';
      ghost.style.width = document.documentElement.clientWidth + 'px';
    }
    // Haut de la page tout de suite (le défilement doux du thème serait coupé par l'ouverture de la page)
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    clearHeader(ghost);
  };
  // En-tête fixe au-dessus du contenu (accueil mobile) : la page commence sous lui
  var clearHeader = function (el) {
    el.style.paddingTop = '';
    var bottom = 0;
    document.elementsFromPoint(window.innerWidth / 2, 2).forEach(function (node) {
      if (el.contains(node)) return;
      var position = getComputedStyle(node).position;
      if (position === 'fixed' || position === 'sticky') bottom = Math.max(bottom, node.getBoundingClientRect().bottom);
    });
    var under = bottom - el.getBoundingClientRect().top;
    if (under > 0) el.style.paddingTop = Math.round(under) + 'px';
  };
  var jump = function (y) {
    var html = document.documentElement;
    html.style.scrollBehavior = 'auto';
    try { window.scrollTo({ top: y, left: 0, behavior: 'instant' }); } catch (error) { window.scrollTo(0, y); }
  };

  // ---------- Page marque ouverte SUR PLACE, comme les rayons : seule la section de la marque est demandée
  // (section_id, ~230 Ko au lieu de 1,1 Mo pour la page entière), dès le survol ou le premier contact du doigt ;
  // au clic elle remplace le contenu de la page (en-tête et pied de page gardés), l'adresse change (history), et le
  // bouton Retour remet la page d'avant à la même position, sans rechargement. En cas de problème : page normale. ----------
  var sections = window.__brSections || (window.__brSections = {});
  var sectionUrl = function (href) {
    var url = new URL(href, location.href);
    url.hash = '';
    url.searchParams.set('view', 'brand');
    url.searchParams.set('section_id', 'desktop-brand');
    return url.toString();
  };
  var fetchBrand = function (href) {
    var key = sectionUrl(href);
    if (!sections[key]) {
      sections[key] = fetch(key, { credentials: 'same-origin' }).then(function (response) {
        if (!response.ok) throw new Error(response.status);
        return response.text();
      });
      sections[key].catch(function () { delete sections[key]; });
    }
    return sections[key];
  };
  var slowNet = function () {
    var net = navigator.connection;
    return Boolean(net && (net.saveData || /(^|-)2g$/.test(net.effectiveType || '')));
  };
  var bare = function (href) { return String(href).split('#')[0]; };
  var saved = null; // page d'origine : { nodes, href, title, y }
  var brandNodes = null; // page marque retirée par le bouton Retour (remise par le bouton Avancer)
  var token = 0;
  var adoptStyles = function (wrap) {
    var waits = [];
    wrap.querySelectorAll('link[rel="stylesheet"]').forEach(function (link) {
      var href = link.href;
      var have = [].some.call(document.querySelectorAll('link[rel="stylesheet"]'), function (other) { return other.href === href; });
      link.remove();
      if (have) return;
      var copy = document.createElement('link');
      copy.rel = 'stylesheet';
      copy.href = href;
      if (link.media) copy.media = link.media;
      waits.push(new Promise(function (resolve) { copy.onload = copy.onerror = resolve; setTimeout(resolve, 1500); }));
      document.head.appendChild(copy);
    });
    wrap.querySelectorAll('link').forEach(function (link) { link.remove(); });
    return Promise.all(waits);
  };
  var startBrand = function (root, scriptSrc) {
    if (window.__brandInit) { window.__brandInit(root); return; }
    if (!scriptSrc) return;
    var script = document.createElement('script');
    script.src = scriptSrc; // le script démarre seul sur la page marque qu'il trouve ([data-br])
    document.body.appendChild(script);
  };
  var openBrand = function (link) {
    var href = new URL(link.href, location.href).href;
    var y = window.scrollY;
    var id = token += 1;
    show(link, 'brand');
    var wrap = null;
    var scriptSrc = '';
    Promise.all([fetchBrand(href), new Promise(function (resolve) { requestAnimationFrame(function () { resolve(); }); })])
      .then(function (out) {
        if (id !== token) return null;
        var doc = new DOMParser().parseFromString(out[0], 'text/html');
        wrap = doc.querySelector('.shopify-section') || doc.body;
        if (!wrap.querySelector('[data-br]')) throw new Error('no brand page');
        var script = wrap.querySelector('script[src*="desktop-brand"]');
        scriptSrc = script ? script.src : '';
        wrap.querySelectorAll('script[src]').forEach(function (node) { node.remove(); });
        return adoptStyles(wrap);
      })
      .then(function () {
        if (id !== token || !wrap) return;
        var content = document.getElementById('content');
        var current = [].filter.call(content.childNodes, function (node) { return node !== ghost; });
        if (!saved) saved = { nodes: current, href: location.href, title: document.title, y: y };
        current.forEach(function (node) { content.removeChild(node); });
        brandNodes = null;
        var section = document.importNode(wrap, true);
        content.insertBefore(section, content.firstChild);
        if (ghost) { ghost.remove(); ghost = null; }
        document.documentElement.classList.remove('bri-on');
        history.pushState({ bri: 'brand' }, '', href);
        var root = section.querySelector('[data-br]');
        var name = root.getAttribute('data-br-name') || '';
        var parts = saved.title.split(' – ');
        if (name) document.title = name + ' – ' + parts[parts.length - 1];
        jump(0);
        clearHeader(section);
        startBrand(root, scriptSrc);
      })
      .catch(function (error) {
        if (id !== token) return;
        console.error('Brand page: in-place open failed.', error);
        window.location.href = href;
      });
  };
  // Retour vers la page d'origine : remise telle quelle (même position) ; Avancer : la page marque revient
  window.addEventListener('popstate', function () {
    if (!saved) return;
    var content = document.getElementById('content');
    if (bare(location.href) === bare(saved.href)) {
      token += 1;
      if (ghost) { ghost.remove(); ghost = null; }
      document.documentElement.classList.remove('bri-on');
      brandNodes = [].slice.call(content.childNodes);
      brandNodes.forEach(function (node) { content.removeChild(node); });
      saved.nodes.forEach(function (node) { content.appendChild(node); });
      document.title = saved.title;
      jump(saved.y);
      requestAnimationFrame(function () { jump(saved.y); });
    } else if (brandNodes && new URL(location.href).searchParams.get('view') === 'brand') {
      // La page marque revient ; son script (desktop-brand.js) charge ensuite l'état de cette adresse
      saved.nodes = [].slice.call(content.childNodes);
      saved.nodes.forEach(function (node) { content.removeChild(node); });
      brandNodes.forEach(function (node) { content.appendChild(node); });
      brandNodes = null;
      jump(0);
    }
  });

  var go = function (link, kind) {
    if (kind !== 'product' && document.getElementById('content')) { openBrand(link); return; }
    show(link, kind);
    // Laisse le navigateur afficher la page en attente avant de partir
    requestAnimationFrame(function () { setTimeout(function () { window.location.href = link.href; }, 0); });
  };
  // Retour arrière vers cette page (mémoire du navigateur) : la page comme avant
  window.addEventListener('pageshow', function () {
    document.documentElement.classList.remove('bri-on');
    if (ghost) { ghost.remove(); ghost = null; }
  });

  // Marque demandée à l'avance : survol de 60 ms (ordinateur), premier contact du doigt (téléphone)
  var hoverTimer = null;
  document.addEventListener('mouseover', function (event) {
    var link = brandLink(event.target);
    clearTimeout(hoverTimer);
    if (!link || slowNet()) return;
    hoverTimer = setTimeout(function () { fetchBrand(link.href).catch(function () {}); }, 60);
  }, { passive: true });
  document.addEventListener('pointerdown', function (event) {
    var link = brandLink(event.target);
    if (link) fetchBrand(link.href).catch(function () {});
  }, { passive: true, capture: true });

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

  // Fiches produit : écouté en dernier (window, sans capture). Un clic déjà pris par un autre script n'est pas touché :
  // fiche ouverte sur place sur mobile (assets/mobile-pdp-layer.js), panier, cœur, aperçu rapide, carrousel glissé…
  window.addEventListener('click', function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = productLink(event.target);
    if (!link) return;
    event.preventDefault();
    go(link, 'product');
  });
  // hide : la fiche en attente laisse la place à la vraie (fiche ouverte sur place, assets/mobile-pdp-layer.js) ;
  // true s'il y en avait une
  var hide = function () {
    document.documentElement.classList.remove('bri-on');
    if (!ghost) return false;
    ghost.remove();
    ghost = null;
    return true;
  };
  window.__brandInstant = { show: show, hide: hide };
})();
