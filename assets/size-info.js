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

  window.sizeInfo = { LINE: LINE, list: entries, table: table, convert: convert };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { convert(); });
  else convert();
})();
