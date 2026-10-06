/* Tableau des tailles du fournisseur : les descriptions importées contiennent une ligne
   « size_info: {"sizeInfoList":[…]} » (données brutes). Ce script la remplace par un vrai tableau :
   taille, longueur (du pied pour les chaussures) en cm / pouces, équivalences EU / US / UK / JP / KR / BR / MX.
   - Desktop (et toute description affichée telle quelle) : le paragraphe est remplacé dans la page.
   - Mobile : assets/pdp-mobile.js utilise window.sizeInfo.table() pour son onglet « Guida alle taglie ».
   Textes : clés mobile.js.* (snippets/mobile-i18n.liquid). */
(function () {
  'use strict';

  if (window.sizeInfo) return;

  var T = function (key, vars) { return window.mobileT ? window.mobileT(key, vars) : key; };
  var COUNTRIES = ['EU', 'US', 'UK', 'JP', 'KR', 'BR', 'MX'];
  var LINE = /^size_info\s*:/i;

  // Premier objet JSON complet du texte (accolades équilibrées, en ignorant celles des chaînes).
  function readJsonObject(text) {
    var start = text.indexOf('{');
    if (start === -1) return null;
    var depth = 0;
    var inString = false;
    for (var i = start; i < text.length; i += 1) {
      var ch = text[i];
      if (inString) {
        if (ch === '\\') i += 1;
        else if (ch === '"') inString = false;
      } else if (ch === '"') {
        inString = true;
      } else if (ch === '{') {
        depth += 1;
      } else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          try { return JSON.parse(text.slice(start, i + 1)); } catch (error) { return null; }
        }
      }
    }
    return null;
  }

  // Tableau construit à partir du texte « size_info: {…} » ; null si les données sont illisibles.
  // L'en-tête « (cm / inch) » et les cellules « 20.5 cm / 8.07″ » permettent le bouton cm / pouces du mobile.
  // Lignes brutes (taille, longueur, équivalences par pays) : le sélecteur de pointure mobile y lit la longueur du pied.
  function entries(text) {
    var data = readJsonObject(text);
    return data && Array.isArray(data.sizeInfoList) ? data.sizeInfoList.filter(function (entry) { return entry && entry.size; }) : [];
  }

  function table(text) {
    var list = entries(text);
    if (!list.length) return null;
    var countries = COUNTRIES.filter(function (code) {
      return list.some(function (entry) { return entry.countrySizeMap && entry.countrySizeMap[code]; });
    });
    var hasLength = list.some(function (entry) { return entry.length && entry.length.cm; });
    var lengthTitle = T(countries.length ? 'pdp_size_foot_length' : 'pdp_size_length') + ' (cm / inch)';
    var element = document.createElement('table');
    var addRow = function (cells, head) {
      var row = element.insertRow();
      cells.forEach(function (value) {
        var cell = document.createElement(head ? 'th' : 'td');
        cell.textContent = value;
        row.appendChild(cell);
      });
    };
    addRow([T('size')].concat(hasLength ? [lengthTitle] : [], countries), true);
    list.forEach(function (entry) {
      var length = entry.length && entry.length.cm ? entry.length.cm + ' cm / ' + (entry.length.inch || '') + '″' : '';
      addRow([String(entry.size)].concat(hasLength ? [length] : [], countries.map(function (code) {
        return (entry.countrySizeMap && entry.countrySizeMap[code]) || '–';
      })), false);
    });
    return element;
  }

  /* Pointures avec la vraie longueur du pied (fiche produit et ajout rapide mobiles), jamais inventée. Sources, dans
     l'ordre : la valeur (« 39(Foot24.5cm) »), le tableau « Lunghezza piede (cm) » de la description, le size_info
     (colonne EU ou colonne size : le fournisseur y met deux numérotations, « size 39 » = « EU 38,5 »). Une source doit
     couvrir toutes les pointures ; deux colonnes en désaccord = ambigu. Renvoie [{ raw, code, foot }] trié, sinon null. */
  var FOOT_VALUE = /^\s*(\d{2}(?:[.,]5)?)\s*\(\s*foot\s*(\d{2}(?:[.,]\d+)?)\s*cm\s*\)\s*$/i;
  var PLAIN_SHOE = /^\s*(?:eur?\s*[:\-]?\s*)?(\d{2}(?:[.,]5)?)\.?\s*$/i;
  var FOOT_HEADER = /(lunghezza\s+(?:del\s+)?piede|foot\s*length|longueur\s+du\s+pied|fu(?:ß|ss)l(?:ä|a)nge|longitud\s+del\s+pie|voetlengte|lungimea\s+piciorului)/i;

  function shoeNumber(text) {
    var match = String(text == null ? '' : text).match(/^\s*(\d{2}(?:[.,]5)?)(?!\d)/);
    return match ? String(Number(match[1].replace(',', '.'))) : null;
  }

  function descriptionFeet(html) {
    var feet = { table: {}, eu: {}, size: {} };
    // Document inerte : les images de la description ne sont pas téléchargées.
    var doc = new DOMParser().parseFromString(html || '', 'text/html');
    var line = Array.prototype.find.call(doc.querySelectorAll('p, div, li'), function (el) { return LINE.test(el.textContent.trim()); });
    (line ? entries(line.textContent.trim()) : []).forEach(function (entry) {
      var cm = entry.length && parseFloat(String(entry.length.cm).replace(',', '.'));
      // Seulement un tableau de chaussures (avec équivalence EU) : ailleurs « length » est la longueur du vêtement.
      var eu = cm && entry.countrySizeMap && shoeNumber(entry.countrySizeMap.EU);
      if (!eu) return;
      feet.eu[eu] = cm;
      var size = shoeNumber(entry.size);
      if (size) feet.size[size] = cm;
    });
    doc.querySelectorAll('table').forEach(function (table) {
      var head = table.rows[0] ? Array.prototype.map.call(table.rows[0].cells, function (cell) { return cell.textContent; }) : [];
      var column = head.findIndex(function (text) { return FOOT_HEADER.test(text) && /cm/i.test(text); });
      if (column < 1) return;
      Array.prototype.slice.call(table.rows, 1).forEach(function (row) {
        var eu = row.cells[0] && shoeNumber(row.cells[0].textContent);
        var cm = row.cells[column] && parseFloat(row.cells[column].textContent.replace(',', '.'));
        if (eu && cm && !feet.table[eu]) feet.table[eu] = cm;
      });
    });
    return feet;
  }

  function shoes(values, html) {
    var list = values.map(function (raw) {
      var value = String(raw).match(FOOT_VALUE);
      if (value) return { raw: raw, code: shoeNumber(value[1]), foot: Number(value[2].replace(',', '.')) };
      var plain = String(raw).match(PLAIN_SHOE);
      return plain ? { raw: raw, code: shoeNumber(plain[1]), foot: null } : null;
    });
    if (list.length < 2 || !list.every(Boolean)) return null;
    if (list.some(function (item) { return !item.foot; })) {
      var feet = descriptionFeet(html);
      var covers = function (map) { return list.every(function (item) { return map[item.code]; }); };
      var same = list.every(function (item) { return feet.eu[item.code] === feet.size[item.code]; });
      var map = covers(feet.table) ? feet.table
        : covers(feet.eu) && covers(feet.size) ? (same ? feet.eu : null)
        : covers(feet.eu) ? feet.eu : covers(feet.size) ? feet.size : null;
      if (!map) return null;
      list.forEach(function (item) { item.foot = item.foot || map[item.code]; });
    }
    return list.sort(function (a, b) { return a.foot - b.foot || Number(a.code) - Number(b.code); });
  }

  /* Noms affichés des valeurs d'option (couleurs : fiche produit et ajout rapide mobiles). Un code fournisseur répété devant
     toutes les valeurs (« 1829-2 Champagne », « 1829-2 Silver ») est retiré de l'affichage seulement ; la valeur complète
     reste celle envoyée au panier. Rien n'est retiré si le code n'a pas de chiffre (« Light Blue ») ou si deux noms
     deviendraient identiques. Renvoie { valeur: nom affiché }. */
  function shortNames(values) {
    var names = {};
    var words = values.map(function (value) { return String(value).trim().split(/\s+/); });
    var code = words[0] && words[0][0];
    var common = values.length > 1 && /\d/.test(code || '') && words.every(function (parts) { return parts.length > 1 && parts[0] === code; });
    var short = values.map(function (value, i) { return common ? words[i].slice(1).join(' ') : String(value); });
    var unique = short.every(function (name, i) { return short.indexOf(name) === i; });
    values.forEach(function (value, i) { names[value] = unique ? short[i] : String(value); });
    return names;
  }

  var styled = false;
  function addStyles() {
    if (styled) return;
    styled = true;
    var style = document.createElement('style');
    style.textContent = '.size-info{margin:16px 0;max-width:100%;overflow-x:auto}'
      + '.size-info__title{display:block;margin:0 0 8px;font-weight:700}'
      + '.size-info table{width:auto;min-width:50%;margin:0;border-collapse:collapse;font-size:13px;line-height:1.3}'
      + '.size-info th,.size-info td{padding:7px 12px;border:1px solid #e3e5ec;text-align:center;white-space:nowrap}'
      + '.size-info th{background:#f5f6f8;font-weight:700}'
      + '.size-info td:first-child{font-weight:700}'
      + '.size-info tr:nth-child(even) td{background:#fafbfc}';
    document.head.appendChild(style);
  }

  // Descriptions affichées telles quelles (fiche desktop, section « Featured product »…).
  function convert(root) {
    (root || document).querySelectorAll('p').forEach(function (paragraph) {
      if (paragraph.closest('.pdp-m') || !LINE.test(paragraph.textContent.trim())) return;
      var element = table(paragraph.textContent.trim());
      if (!element) {
        paragraph.remove();
        return;
      }
      addStyles();
      var box = document.createElement('div');
      box.className = 'size-info';
      var title = document.createElement('strong');
      title.className = 'size-info__title';
      title.textContent = T('size_guide');
      element.querySelectorAll('td, th').forEach(function (cell) {
        cell.textContent = cell.textContent.replace(' (cm / inch)', ' (cm / ' + T('inches') + ')');
      });
      box.appendChild(title);
      box.appendChild(element);
      paragraph.replaceWith(box);
    });
  }

  window.sizeInfo = { LINE: LINE, list: entries, table: table, convert: convert, shoes: shoes, shoeNumber: shoeNumber, shortNames: shortNames };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { convert(); });
  else convert();
})();
