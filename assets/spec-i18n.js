/*
  Caractéristiques des fiches importées (lignes « Material: POLYESTER », « Gender: Men »…) dans la langue du client.
  Les fournisseurs écrivent en anglais (parfois déjà en italien) : libellés et valeurs fréquents traduits ici en
  it / fr / de / es / nl / ro (l'anglais est la clé). Ce qui n'est pas dans le dictionnaire reste tel quel.
  Utilisé par assets/pdp-mobile.js (onglet « Specifiche »). Libellés sans intérêt pour le client (« High-concerned
  chemical », « Choice », « CN »…) : masqués.
*/
(function () {
  'use strict';

  var LANGS = ['it', 'fr', 'de', 'es', 'nl', 'ro'];

  // Clé anglaise (minuscules) → [it, fr, de, es, nl, ro]
  var LABELS = {
    'brand name': ['Marca', 'Marque', 'Marke', 'Marca', 'Merk', 'Marcă'],
    'origin': ['Origine', 'Origine', 'Herkunft', 'Origen', 'Herkomst', 'Origine'],
    'place of origin': ['Luogo di origine', "Lieu d'origine", 'Herkunftsort', 'Lugar de origen', 'Plaats van herkomst', 'Locul de origine'],
    'gender': ['Genere', 'Genre', 'Geschlecht', 'Género', 'Geslacht', 'Gen'],
    'item type': ['Tipo di articolo', "Type d'article", 'Artikeltyp', 'Tipo de artículo', 'Artikeltype', 'Tip articol'],
    'style': ['Stile', 'Style', 'Stil', 'Estilo', 'Stijl', 'Stil'],
    'closure type': ['Tipo di chiusura', 'Type de fermeture', 'Verschlussart', 'Tipo de cierre', 'Sluiting', 'Tip închidere'],
    'model number': ['Numero di modello', 'Numéro de modèle', 'Modellnummer', 'Número de modelo', 'Modelnummer', 'Număr model'],
    'pattern type': ['Tipo di motivo', 'Motif', 'Muster', 'Estampado', 'Patroon', 'Model'],
    'lining material': ['Materiale della fodera', 'Matière de la doublure', 'Futtermaterial', 'Material del forro', 'Voeringmateriaal', 'Material căptușeală'],
    'material': ['Materiale', 'Matière', 'Material', 'Material', 'Materiaal', 'Material'],
    'main material': ['Materiale principale', 'Matière principale', 'Hauptmaterial', 'Material principal', 'Hoofdmateriaal', 'Material principal'],
    'thickness': ['Spessore', 'Épaisseur', 'Dicke', 'Grosor', 'Dikte', 'Grosime'],
    'applicable season': ['Stagione', 'Saison', 'Saison', 'Temporada', 'Seizoen', 'Sezon'],
    'season': ['Stagione', 'Saison', 'Saison', 'Temporada', 'Seizoen', 'Sezon'],
    'craft of weaving': ['Lavorazione', 'Tissage', 'Webart', 'Tejido', 'Weeftechniek', 'Țesătură'],
    'applicable scene': ['Occasione', 'Occasion', 'Anlass', 'Ocasión', 'Gelegenheid', 'Ocazie'],
    'occasion': ['Occasione', 'Occasion', 'Anlass', 'Ocasión', 'Gelegenheid', 'Ocazie'],
    'whether full opening': ['Apertura completa', 'Ouverture complète', 'Durchgehend offen', 'Apertura completa', 'Volledig te openen', 'Deschidere completă'],
    'hooded': ['Con cappuccio', 'À capuche', 'Mit Kapuze', 'Con capucha', 'Met capuchon', 'Cu glugă'],
    'decoration': ['Decorazione', 'Décoration', 'Verzierung', 'Decoración', 'Decoratie', 'Decorațiune'],
    'department name': ['Fascia di età', "Tranche d'âge", 'Altersgruppe', 'Grupo de edad', 'Leeftijdsgroep', 'Grupă de vârstă'],
    'collar': ['Colletto', 'Col', 'Kragen', 'Cuello', 'Kraag', 'Guler'],
    'upper material': ['Materiale tomaia', 'Matière de la tige', 'Obermaterial', 'Material exterior', 'Bovenmateriaal', 'Material exterior'],
    'outsole material': ['Materiale suola', 'Matière de la semelle', 'Laufsohle', 'Material de la suela', 'Zoolmateriaal', 'Material talpă'],
    'insole material': ['Materiale soletta', 'Matière de la semelle intérieure', 'Innensohle', 'Material de la plantilla', 'Binnenzool', 'Material branț'],
    'upper fixing method': ['Fissaggio tomaia', 'Fixation de la tige', 'Schaftbefestigung', 'Fijación del empeine', 'Bevestiging bovenwerk', 'Fixare față'],
    'upper coverage': ['Altezza tomaia', 'Hauteur de tige', 'Schafthöhe', 'Altura de caña', 'Schachthoogte', 'Înălțime gheată'],
    'whether waterproof': ['Impermeabile', 'Imperméable', 'Wasserdicht', 'Impermeable', 'Waterdicht', 'Impermeabil'],
    'sleeve length(cm)': ['Lunghezza manica', 'Longueur des manches', 'Ärmellänge', 'Largo de manga', 'Mouwlengte', 'Lungime mânecă'],
    'sleeve length': ['Lunghezza manica', 'Longueur des manches', 'Ärmellänge', 'Largo de manga', 'Mouwlengte', 'Lungime mânecă'],
    'sleeve style': ['Stile manica', 'Style de manches', 'Ärmelstil', 'Estilo de manga', 'Mouwstijl', 'Stil mânecă'],
    'fit': ['Vestibilità', 'Coupe', 'Passform', 'Ajuste', 'Pasvorm', 'Croială'],
    'fit type': ['Vestibilità', 'Coupe', 'Passform', 'Ajuste', 'Pasvorm', 'Croială'],
    'shoes type': ['Tipo di scarpa', 'Type de chaussure', 'Schuhtyp', 'Tipo de zapato', 'Schoentype', 'Tip pantof'],
    'type': ['Tipo', 'Type', 'Typ', 'Tipo', 'Type', 'Tip'],
    'case material': ['Materiale cassa', 'Matière du boîtier', 'Gehäusematerial', 'Material de la caja', 'Kastmateriaal', 'Material carcasă'],
    'clothing length': ['Lunghezza', 'Longueur', 'Länge', 'Largo', 'Lengte', 'Lungime'],
    'length': ['Lunghezza', 'Longueur', 'Länge', 'Largo', 'Lengte', 'Lungime'],
    'dial window material type': ['Vetro', 'Verre', 'Uhrglas', 'Cristal', 'Horlogeglas', 'Geam'],
    'clasp type': ['Tipo di chiusura', 'Type de fermoir', 'Verschluss', 'Tipo de cierre', 'Sluiting', 'Tip închizătoare'],
    'band length': ['Lunghezza cinturino', 'Longueur du bracelet', 'Armbandlänge', 'Largo de la correa', 'Bandlengte', 'Lungime curea'],
    'band material type': ['Materiale cinturino', 'Matière du bracelet', 'Armbandmaterial', 'Material de la correa', 'Bandmateriaal', 'Material curea'],
    'band width': ['Larghezza cinturino', 'Largeur du bracelet', 'Armbandbreite', 'Ancho de la correa', 'Bandbreedte', 'Lățime curea'],
    'display type': ['Tipo di display', "Type d'affichage", 'Anzeige', 'Tipo de pantalla', 'Weergave', 'Tip afișaj'],
    'water resistance depth': ['Impermeabilità', 'Étanchéité', 'Wasserdichtigkeit', 'Resistencia al agua', 'Waterdichtheid', 'Rezistență la apă'],
    'water resistance level': ['Impermeabilità', 'Étanchéité', 'Wasserdichtigkeit', 'Resistencia al agua', 'Waterdichtheid', 'Rezistență la apă'],
    'movement origin': ['Origine del movimento', 'Origine du mouvement', 'Uhrwerk-Herkunft', 'Origen del movimiento', 'Herkomst uurwerk', 'Origine mecanism'],
    'movement': ['Movimento', 'Mouvement', 'Uhrwerk', 'Movimiento', 'Uurwerk', 'Mecanism'],
    'movement type': ['Tipo di movimento', 'Type de mouvement', 'Uhrwerktyp', 'Tipo de movimiento', 'Type uurwerk', 'Tip mecanism'],
    'movement model': ['Calibro', 'Calibre', 'Kaliber', 'Calibre', 'Kaliber', 'Calibru'],
    'boxes & cases material': ['Materiale confezione', "Matière de l'écrin", 'Etui-Material', 'Material del estuche', 'Doosmateriaal', 'Material cutie'],
    'case shape': ['Forma della cassa', 'Forme du boîtier', 'Gehäuseform', 'Forma de la caja', 'Kastvorm', 'Formă carcasă'],
    'shape': ['Forma', 'Forme', 'Form', 'Forma', 'Vorm', 'Formă'],
    'case thickness': ['Spessore cassa', 'Épaisseur du boîtier', 'Gehäusehöhe', 'Grosor de la caja', 'Kastdikte', 'Grosime carcasă'],
    'case diameter': ['Diametro cassa', 'Diamètre du boîtier', 'Gehäusedurchmesser', 'Diámetro de la caja', 'Kastdiameter', 'Diametru carcasă'],
    'dial diameter': ['Diametro quadrante', 'Diamètre du cadran', 'Zifferblattdurchmesser', 'Diámetro de la esfera', 'Diameter wijzerplaat', 'Diametru cadran'],
    'case length': ['Lunghezza cassa', 'Longueur du boîtier', 'Gehäuselänge', 'Largo de la caja', 'Kastlengte', 'Lungime carcasă'],
    'watch weight': ['Peso orologio', 'Poids de la montre', 'Uhrgewicht', 'Peso del reloj', 'Gewicht horloge', 'Greutate ceas'],
    'watch length': ['Lunghezza orologio', 'Longueur de la montre', 'Uhrlänge', 'Largo del reloj', 'Lengte horloge', 'Lungime ceas'],
    'watch type': ["Tipo di orologio", 'Type de montre', 'Uhrentyp', 'Tipo de reloj', 'Type horloge', 'Tip ceas'],
    'crown type': ['Tipo di corona', 'Type de couronne', 'Kronentyp', 'Tipo de corona', 'Type kroon', 'Tip coroană'],
    'bottom cover type': ['Fondello', 'Fond du boîtier', 'Gehäuseboden', 'Tapa trasera', 'Kastbodem', 'Capac spate'],
    'bottom cover material': ['Materiale fondello', 'Matière du fond', 'Bodenmaterial', 'Material de la tapa', 'Materiaal kastbodem', 'Material capac'],
    'feature': ['Caratteristiche', 'Caractéristiques', 'Merkmale', 'Características', 'Kenmerken', 'Caracteristici'],
    'fabric type': ['Tipo di tessuto', 'Type de tissu', 'Stoffart', 'Tipo de tejido', 'Stofsoort', 'Tip țesătură'],
    'fashion element': ['Dettagli', 'Détails', 'Details', 'Detalles', 'Details', 'Detalii'],
    'battery included': ['Batteria inclusa', 'Pile incluse', 'Batterie enthalten', 'Batería incluida', 'Batterij inbegrepen', 'Baterie inclusă'],
    'wool': ['Lana', 'Laine', 'Wolle', 'Lana', 'Wol', 'Lână'],
    'handbags type': ['Tipo di borsa', 'Type de sac', 'Taschentyp', 'Tipo de bolso', 'Type tas', 'Tip geantă'],
    'types of bags': ['Tipo di borsa', 'Type de sac', 'Taschentyp', 'Tipo de bolso', 'Type tas', 'Tip geantă'],
    'detachable part': ['Parte staccabile', 'Partie amovible', 'Abnehmbares Teil', 'Parte desmontable', 'Afneembaar deel', 'Parte detașabilă'],
    'technics': ['Tecnica', 'Technique', 'Technik', 'Técnica', 'Techniek', 'Tehnică'],
    'shoulder strap type': ['Tracolla', 'Bandoulière', 'Schultergurt', 'Correa', 'Schouderband', 'Curea de umăr'],
    'age': ['Età', 'Âge', 'Alter', 'Edad', 'Leeftijd', 'Vârstă'],
    'filling': ['Imbottitura', 'Rembourrage', 'Füllung', 'Relleno', 'Vulling', 'Umplutură'],
    'outerwear type': ['Tipo di capospalla', 'Type de manteau', 'Jackentyp', 'Tipo de abrigo', 'Type jas', 'Tip haină'],
    'weight': ['Peso', 'Poids', 'Gewicht', 'Peso', 'Gewicht', 'Greutate'],
    'heel height': ['Altezza tacco', 'Hauteur du talon', 'Absatzhöhe', 'Altura del tacón', 'Hakhoogte', 'Înălțime toc'],
    'elasticity': ['Elasticità', 'Élasticité', 'Elastizität', 'Elasticidad', 'Elasticiteit', 'Elasticitate'],
    'color': ['Colore', 'Couleur', 'Farbe', 'Color', 'Kleur', 'Culoare'],
    'size': ['Taglia', 'Taille', 'Größe', 'Talla', 'Maat', 'Mărime'],
    'release date': ['Data di uscita', 'Date de sortie', 'Erscheinungsdatum', 'Fecha de lanzamiento', 'Releasedatum', 'Data lansării'],
    'fabric weight': ['Grammatura', 'Grammage', 'Stoffgewicht', 'Gramaje', 'Stofgewicht', 'Gramaj'],
    'pant style': ['Modello pantalone', 'Style de pantalon', 'Hosenschnitt', 'Estilo de pantalón', 'Broekmodel', 'Model pantaloni'],
    'waist type': ['Vita', 'Taille', 'Bund', 'Cintura', 'Taille', 'Talie'],
    'down content': ['Contenuto di piuma', 'Taux de duvet', 'Daunenanteil', 'Contenido de plumón', 'Dons gehalte', 'Conținut puf'],
    'down weight': ['Peso imbottitura', 'Poids du duvet', 'Daunengewicht', 'Peso del plumón', 'Gewicht dons', 'Greutate puf'],
    'interior': ['Interno', 'Intérieur', 'Innenausstattung', 'Interior', 'Binnenkant', 'Interior'],
    'toe shape': ['Punta', 'Bout', 'Schuhspitze', 'Puntera', 'Neus', 'Vârf'],
    'front style': ['Davanti', 'Devant', 'Vorderseite', 'Delantero', 'Voorkant', 'Față'],
    'material composition': ['Composizione', 'Composition', 'Zusammensetzung', 'Composición', 'Samenstelling', 'Compoziție'],
    'main ingredients of fabric percentage': ['Composizione', 'Composition', 'Zusammensetzung', 'Composición', 'Samenstelling', 'Compoziție'],
    'strap material': ['Materiale cinturino', 'Matière de la bride', 'Riemenmaterial', 'Material de la correa', 'Riemmateriaal', 'Material curea'],
    'hardness': ['Durezza', 'Dureté', 'Härte', 'Dureza', 'Hardheid', 'Duritate'],
    'mirror type': ['Vetro', 'Verre', 'Glas', 'Cristal', 'Glas', 'Geam'],
    'shell thickness': ['Spessore cassa', 'Épaisseur du boîtier', 'Gehäusehöhe', 'Grosor de la caja', 'Kastdikte', 'Grosime carcasă'],
    'case craftsmanship': ['Finitura cassa', 'Finition du boîtier', 'Gehäuseverarbeitung', 'Acabado de la caja', 'Afwerking kast', 'Finisaj carcasă'],
    'sweaters men': ['Maglioni uomo', 'Pulls homme', 'Herrenpullover', 'Jerséis hombre', 'Herentruien', 'Pulovere bărbați']
  };

  // Libellés déjà en italien (fiches traduites par le fournisseur) → clé anglaise.
  var ALIASES = {
    'marca': 'brand name', 'origine': 'origin', 'luogo di origine': 'place of origin', 'genere': 'gender',
    'stile': 'style', 'materiale': 'material', 'tipo di motivo': 'pattern type', 'tipo di articolo': 'item type',
    'numero di modello': 'model number', 'lunghezza': 'length', 'tipo di chiusura': 'closure type', 'stagione': 'season',
    'spessore': 'thickness', 'decorazione': 'decoration', 'lunghezza manica (cm)': 'sleeve length', 'stagione applicabile': 'season',
    'scena applicabile': 'occasion', 'tipo di vita': 'waist type', 'tipo di vestibilità': 'fit', 'elasticità': 'elasticity',
    'colletto': 'collar', 'lunghezza del vestito': 'clothing length', 'composizione dei materiali': 'material composition',
    'stile dei pantaloni': 'pant style', 'materiale del rivestimento': 'lining material', "l'arte della tessitura": 'craft of weaving'
  };

  // Libellés sans intérêt pour le client : ligne masquée.
  var HIDDEN = /^(high-concerned chemical|choice|semi_choice|cn|prodotti chimici ad alto impatto|immagine oscena|with or install professional accessories|whether with metal toe cap|packaging standard|size_info|is_customized|sizeinfo)$/i;

  // Valeur anglaise (minuscules) → [it, fr, de, es, nl, ro]
  var VALUES = {
    'none': ['Nessuno', 'Aucun', 'Keine', 'Ninguno', 'Geen', 'Niciunul'],
    'no': ['No', 'Non', 'Nein', 'No', 'Nee', 'Nu'],
    'yes': ['Sì', 'Oui', 'Ja', 'Sí', 'Ja', 'Da'],
    'mainland china': ['Cina', 'Chine', 'China', 'China', 'China', 'China'],
    'china (mainland)': ['Cina', 'Chine', 'China', 'China', 'China', 'China'],
    'china mainland': ['Cina', 'Chine', 'China', 'China', 'China', 'China'],
    'cn (origin)': ['Cina', 'Chine', 'China', 'China', 'China', 'China'],
    'men': ['Uomo', 'Homme', 'Herren', 'Hombre', 'Heren', 'Bărbați'],
    'women': ['Donna', 'Femme', 'Damen', 'Mujer', 'Dames', 'Femei'],
    'unisex': ['Unisex', 'Unisexe', 'Unisex', 'Unisex', 'Unisex', 'Unisex'],
    'adult': ['Adulto', 'Adulte', 'Erwachsene', 'Adulto', 'Volwassene', 'Adult'],
    'regular': ['Regolare', 'Normale', 'Normal', 'Normal', 'Normaal', 'Normal'],
    'standard': ['Standard', 'Standard', 'Standard', 'Estándar', 'Standaard', 'Standard'],
    'casual': ['Casual', 'Décontracté', 'Freizeit', 'Informal', 'Casual', 'Casual'],
    'polyester': ['Poliestere', 'Polyester', 'Polyester', 'Poliéster', 'Polyester', 'Poliester'],
    'cotton': ['Cotone', 'Coton', 'Baumwolle', 'Algodón', 'Katoen', 'Bumbac'],
    'acrylic': ['Acrilico', 'Acrylique', 'Acryl', 'Acrílico', 'Acryl', 'Acril'],
    'nylon': ['Nylon', 'Nylon', 'Nylon', 'Nailon', 'Nylon', 'Nailon'],
    'spandex': ['Elastan', 'Élasthanne', 'Elasthan', 'Elastano', 'Elastaan', 'Elastan'],
    'wool': ['Lana', 'Laine', 'Wolle', 'Lana', 'Wol', 'Lână'],
    'stainless steel': ['Acciaio inossidabile', 'Acier inoxydable', 'Edelstahl', 'Acero inoxidable', 'Roestvrij staal', 'Oțel inoxidabil'],
    '316l stainless steel': ['Acciaio inossidabile 316L', 'Acier inoxydable 316L', 'Edelstahl 316L', 'Acero inoxidable 316L', 'Roestvrij staal 316L', 'Oțel inoxidabil 316L'],
    'full': ['Lunga', 'Longues', 'Lang', 'Larga', 'Lang', 'Lungă'],
    'full length': ['Lunga', 'Longueur totale', 'Volle Länge', 'Largo completo', 'Volledige lengte', 'Lungime completă'],
    'true to size': ['Taglia regolare', 'Taille normalement', 'Fällt normal aus', 'Talla normal', 'Valt normaal', 'Mărime standard'],
    'rubber': ['Gomma', 'Caoutchouc', 'Gummi', 'Goma', 'Rubber', 'Cauciuc'],
    'pu': ['PU', 'PU', 'PU', 'PU', 'PU', 'PU'],
    'solid': ['Tinta unita', 'Uni', 'Einfarbig', 'Liso', 'Effen', 'Uni'],
    'spring/autumn': ['Primavera/Autunno', 'Printemps/Automne', 'Frühling/Herbst', 'Primavera/Otoño', 'Lente/Herfst', 'Primăvară/Toamnă'],
    'spring and autumn': ['Primavera e autunno', 'Printemps et automne', 'Frühling und Herbst', 'Primavera y otoño', 'Lente en herfst', 'Primăvară și toamnă'],
    'autumn and winter': ['Autunno e inverno', 'Automne et hiver', 'Herbst und Winter', 'Otoño e invierno', 'Herfst en winter', 'Toamnă și iarnă'],
    'autumn/winter': ['Autunno/Inverno', 'Automne/Hiver', 'Herbst/Winter', 'Otoño/Invierno', 'Herfst/Winter', 'Toamnă/Iarnă'],
    'spring autumn': ['Primavera, autunno', 'Printemps, automne', 'Frühling, Herbst', 'Primavera, otoño', 'Lente, herfst', 'Primăvară, toamnă'],
    'winter': ['Inverno', 'Hiver', 'Winter', 'Invierno', 'Winter', 'Iarnă'],
    'summer': ['Estate', 'Été', 'Sommer', 'Verano', 'Zomer', 'Vară'],
    'autumn': ['Autunno', 'Automne', 'Herbst', 'Otoño', 'Herfst', 'Toamnă'],
    'spring': ['Primavera', 'Printemps', 'Frühling', 'Primavera', 'Lente', 'Primăvară'],
    'four seasons': ['Quattro stagioni', 'Quatre saisons', 'Ganzjährig', 'Cuatro estaciones', 'Vier seizoenen', 'Patru anotimpuri'],
    'all season': ['Tutte le stagioni', 'Toutes saisons', 'Ganzjährig', 'Todas las estaciones', 'Alle seizoenen', 'Toate anotimpurile'],
    'not above ankle': ['Sotto la caviglia', 'Sous la cheville', 'Unter dem Knöchel', 'Bajo el tobillo', 'Onder de enkel', 'Sub gleznă'],
    'above the ankle but not to the knee': ['Sopra la caviglia', 'Au-dessus de la cheville', 'Über dem Knöchel', 'Sobre el tobillo', 'Boven de enkel', 'Peste gleznă'],
    'lace-up': ['Con lacci', 'À lacets', 'Schnürung', 'Con cordones', 'Veters', 'Cu șireturi'],
    'knit': ['Maglia', 'Tricot', 'Strick', 'Punto', 'Gebreid', 'Tricot'],
    'casual shoes': ['Scarpe casual', 'Chaussures décontractées', 'Freizeitschuhe', 'Zapatos casuales', 'Vrijetijdsschoenen', 'Pantofi casual'],
    'round': ['Rotonda', 'Rond', 'Rund', 'Redonda', 'Rond', 'Rotund'],
    'daily': ['Quotidiano', 'Quotidien', 'Alltag', 'Diario', 'Dagelijks', 'Zilnic'],
    'plastic': ['Plastica', 'Plastique', 'Kunststoff', 'Plástico', 'Kunststof', 'Plastic'],
    'zipper': ['Cerniera', 'Fermeture éclair', 'Reißverschluss', 'Cremallera', 'Rits', 'Fermoar'],
    'sticking': ['Incollato', 'Collé', 'Geklebt', 'Pegado', 'Gelijmd', 'Lipit'],
    'stitching': ['Cucito', 'Cousu', 'Genäht', 'Cosido', 'Gestikt', 'Cusut'],
    'pullovers': ['Maglioni', 'Pulls', 'Pullover', 'Jerséis', 'Truien', 'Pulovere'],
    'pullover': ['Maglione', 'Pull', 'Pullover', 'Jersey', 'Trui', 'Pulover'],
    'thick': ['Spesso', 'Épais', 'Dick', 'Grueso', 'Dik', 'Gros'],
    'thin': ['Sottile', 'Fin', 'Dünn', 'Fino', 'Dun', 'Subțire'],
    'midweight': ['Medio', 'Mi-épais', 'Mittel', 'Medio', 'Middel', 'Mediu'],
    'o-neck': ['Girocollo', 'Col rond', 'Rundhals', 'Cuello redondo', 'Ronde hals', 'Decolteu rotund'],
    'turtleneck': ['Collo alto', 'Col roulé', 'Rollkragen', 'Cuello alto', 'Col', 'Guler înalt'],
    'turn-down collar': ['Collo a risvolto', 'Col rabattu', 'Umlegekragen', 'Cuello vuelto', 'Omslagkraag', 'Guler răsfrânt'],
    'mandarin collar': ['Collo alla coreana', 'Col mao', 'Stehkragen', 'Cuello mao', 'Maokraag', 'Guler tunică'],
    'v-neck': ['Scollo a V', 'Col en V', 'V-Ausschnitt', 'Cuello en V', 'V-hals', 'Decolteu în V'],
    'quartz': ['Quarzo', 'Quartz', 'Quarz', 'Cuarzo', 'Kwarts', 'Quartz'],
    'quartz wristwatches': ['Orologi al quarzo', 'Montres à quartz', 'Quarzuhren', 'Relojes de cuarzo', 'Kwartshorloges', 'Ceasuri quartz'],
    'mechanical wristwatches': ['Orologi meccanici', 'Montres mécaniques', 'Mechanische Uhren', 'Relojes mecánicos', 'Mechanische horloges', 'Ceasuri mecanice'],
    'tatting': ['Pizzo chiacchierino', 'Frivolité', 'Occhi-Spitze', 'Frivolité', 'Frivolité', 'Frivolité'],
    'bracelet clasp': ['Chiusura a bracciale', 'Fermoir bracelet', 'Armbandschließe', 'Cierre de pulsera', 'Armbandsluiting', 'Închizătoare brățară'],
    'folding clasp with safety': ['Chiusura deployante con sicura', 'Boucle déployante sécurisée', 'Faltschließe mit Sicherung', 'Cierre desplegable con seguro', 'Vouwsluiting met beveiliging', 'Închizătoare pliabilă cu siguranță'],
    'genuine leather': ['Vera pelle', 'Cuir véritable', 'Echtleder', 'Piel genuina', 'Echt leer', 'Piele naturală'],
    'leather': ['Pelle', 'Cuir', 'Leder', 'Piel', 'Leer', 'Piele'],
    'cow leather': ['Pelle bovina', 'Cuir de vache', 'Rindsleder', 'Piel de vaca', 'Koeienleer', 'Piele de vită'],
    'split leather': ['Crosta', 'Croûte de cuir', 'Spaltleder', 'Serraje', 'Splitleer', 'Piele întoarsă'],
    'artificial leather': ['Similpelle', 'Cuir synthétique', 'Kunstleder', 'Piel sintética', 'Kunstleer', 'Piele sintetică'],
    'synthetic': ['Sintetico', 'Synthétique', 'Synthetik', 'Sintético', 'Synthetisch', 'Sintetic'],
    'hardlex': ['Vetro Hardlex', 'Verre Hardlex', 'Hardlex-Glas', 'Cristal Hardlex', 'Hardlex-glas', 'Geam Hardlex'],
    'sapphire crystal': ['Vetro zaffiro', 'Verre saphir', 'Saphirglas', 'Cristal de zafiro', 'Saffierglas', 'Geam safir'],
    'sapphire glass': ['Vetro zaffiro', 'Verre saphir', 'Saphirglas', 'Cristal de zafiro', 'Saffierglas', 'Geam safir'],
    'mineral glass': ['Vetro minerale', 'Verre minéral', 'Mineralglas', 'Cristal mineral', 'Mineraalglas', 'Geam mineral'],
    'basic': ['Basic', 'Basique', 'Basic', 'Básico', 'Basic', 'Basic'],
    'loose': ['Ampia', 'Ample', 'Weit', 'Holgado', 'Ruim', 'Larg'],
    'slim': ['Aderente', 'Ajusté', 'Schmal', 'Ajustado', 'Slim', 'Strâmt'],
    'regular fit': ['Vestibilità regolare', 'Coupe normale', 'Normale Passform', 'Ajuste regular', 'Normale pasvorm', 'Croială normală'],
    'standard wool': ['Lana standard', 'Laine standard', 'Standardwolle', 'Lana estándar', 'Standaard wol', 'Lână standard'],
    'thin wool': ['Lana leggera', 'Laine fine', 'Dünne Wolle', 'Lana fina', 'Dunne wol', 'Lână subțire'],
    'computer knitted': ['Lavorato a macchina', 'Tricoté machine', 'Maschinengestrickt', 'Tejido a máquina', 'Machinaal gebreid', 'Tricotat la mașină'],
    'flat knitted': ['Maglia piatta', 'Tricot plat', 'Flachgestrickt', 'Tejido plano', 'Vlakgebreid', 'Tricot plat'],
    'pockets': ['Tasche', 'Poches', 'Taschen', 'Bolsillos', 'Zakken', 'Buzunare'],
    'print': ['Stampa', 'Imprimé', 'Druck', 'Estampado', 'Print', 'Imprimeu'],
    'hooded': ['Con cappuccio', 'À capuche', 'Mit Kapuze', 'Con capucha', 'Met capuchon', 'Cu glugă'],
    'luxury': ['Lusso', 'Luxe', 'Luxus', 'Lujo', 'Luxe', 'Lux'],
    'other': ['Altro', 'Autre', 'Andere', 'Otro', 'Overig', 'Altele'],
    'others': ['Altro', 'Autre', 'Andere', 'Otro', 'Overig', 'Altele'],
    'fashion & casual': ['Moda e casual', 'Mode et décontracté', 'Mode & Freizeit', 'Moda e informal', 'Mode & casual', 'Modă & casual'],
    'outerwear & coats': ['Giacche e cappotti', 'Vestes et manteaux', 'Jacken & Mäntel', 'Chaquetas y abrigos', 'Jassen & mantels', 'Geci & paltoane'],
    'mechanical hand wind,automatic self-wind': ['Meccanico, carica automatica', 'Mécanique, remontage automatique', 'Mechanisch, Automatik', 'Mecánico, automático', 'Mechanisch, automatisch', 'Mecanic, automat'],
    'loafers': ['Mocassini', 'Mocassins', 'Loafer', 'Mocasines', 'Loafers', 'Mocasini'],
    'patchwork': ['Patchwork', 'Patchwork', 'Patchwork', 'Patchwork', 'Patchwork', 'Patchwork'],
    'slight strech': ['Leggermente elastico', 'Légèrement extensible', 'Leicht dehnbar', 'Ligeramente elástico', 'Licht rekbaar', 'Ușor elastic'],
    'slight stretch': ['Leggermente elastico', 'Légèrement extensible', 'Leicht dehnbar', 'Ligeramente elástico', 'Licht rekbaar', 'Ușor elastic'],
    'non-stretchable': ['Non elastico', 'Non extensible', 'Nicht dehnbar', 'No elástico', 'Niet rekbaar', 'Neelastic'],
    'fleece': ['Pile', 'Polaire', 'Fleece', 'Forro polar', 'Fleece', 'Fleece'],
    'breathable': ['Traspirante', 'Respirant', 'Atmungsaktiv', 'Transpirable', 'Ademend', 'Respirabil'],
    'waterproof': ['Impermeabile', 'Imperméable', 'Wasserdicht', 'Impermeable', 'Waterdicht', 'Impermeabil'],
    'synthetic fiber': ['Fibra sintetica', 'Fibre synthétique', 'Kunstfaser', 'Fibra sintética', 'Synthetische vezel', 'Fibră sintetică'],
    'sports shoes': ['Scarpe sportive', 'Chaussures de sport', 'Sportschuhe', 'Zapatillas deportivas', 'Sportschoenen', 'Pantofi sport'],
    'flat': ['Piatto', 'Plat', 'Flach', 'Plano', 'Plat', 'Plat'],
    'sexy': ['Sexy', 'Sexy', 'Sexy', 'Sexy', 'Sexy', 'Sexy'],
    'fabric': ['Tessuto', 'Tissu', 'Stoff', 'Tela', 'Stof', 'Material textil'],
    'mesh': ['Rete', 'Maille', 'Mesh', 'Malla', 'Mesh', 'Plasă'],
    'cargo pants': ['Pantaloni cargo', 'Pantalon cargo', 'Cargohose', 'Pantalones cargo', 'Cargobroek', 'Pantaloni cargo'],
    'vest': ['Gilet', 'Gilet', 'Weste', 'Chaleco', 'Vest', 'Vestă'],
    'sewing': ['Cuciture', 'Coutures', 'Nähte', 'Costuras', 'Naden', 'Cusături'],
    'white duck down': ["Piumino d'anatra bianca", 'Duvet de canard blanc', 'Weiße Entendaunen', 'Plumón de pato blanco', 'Wit eendendons', 'Puf de rață albă'],
    'sport': ['Sport', 'Sport', 'Sport', 'Deporte', 'Sport', 'Sport'],
    'sports': ['Sport', 'Sport', 'Sport', 'Deporte', 'Sport', 'Sport'],
    'hat detachable': ['Cappuccio staccabile', 'Capuche amovible', 'Abnehmbare Kapuze', 'Capucha desmontable', 'Afneembare capuchon', 'Glugă detașabilă'],
    'canvas': ['Tela', 'Toile', 'Canvas', 'Lona', 'Canvas', 'Pânză'],
    'round toe': ['Punta tonda', 'Bout rond', 'Runde Spitze', 'Puntera redonda', 'Ronde neus', 'Vârf rotund'],
    'shallow': ['Bassa', 'Basse', 'Flach', 'Baja', 'Laag', 'Joasă'],
    'cartoon': ['Cartone animato', 'Dessin animé', 'Cartoon', 'Dibujos animados', 'Cartoon', 'Desen animat'],
    'mixed colors': ['Colori misti', 'Couleurs mélangées', 'Gemischte Farben', 'Colores mixtos', 'Gemengde kleuren', 'Culori mixte'],
    'geometric': ['Geometrico', 'Géométrique', 'Geometrisch', 'Geométrico', 'Geometrisch', 'Geometric'],
    'microfiber': ['Microfibra', 'Microfibre', 'Mikrofaser', 'Microfibra', 'Microvezel', 'Microfibră'],
    'striped': ['A righe', 'Rayé', 'Gestreift', 'A rayas', 'Gestreept', 'În dungi'],
    'plaid': ['A quadri', 'À carreaux', 'Kariert', 'A cuadros', 'Geruit', 'În carouri'],
    'letter': ['Lettere', 'Lettres', 'Buchstaben', 'Letras', 'Letters', 'Litere'],
    'elastic waist': ['Vita elastica', 'Taille élastique', 'Gummibund', 'Cintura elástica', 'Elastische taille', 'Talie elastică'],
    'single breasted': ['Monopetto', 'Droit', 'Einreihig', 'Botonadura simple', 'Enkele rij knopen', 'La un rând'],
    'smart casual': ['Smart casual', 'Chic décontracté', 'Smart Casual', 'Smart casual', 'Smart casual', 'Smart casual'],
    'outdoor': ['Outdoor', 'Extérieur', 'Outdoor', 'Exterior', 'Buiten', 'Exterior'],
    'versatile': ['Versatile', 'Polyvalent', 'Vielseitig', 'Versátil', 'Veelzijdig', 'Versatil'],
    'high street': ['Streetwear', 'Streetwear', 'Streetwear', 'Streetwear', 'Streetwear', 'Streetwear'],
    'platform': ['Plateau', 'Plateforme', 'Plateau', 'Plataforma', 'Plateau', 'Platformă'],
    'buckle': ['Fibbia', 'Boucle', 'Schnalle', 'Hebilla', 'Gesp', 'Cataramă'],
    'ceramic': ['Ceramica', 'Céramique', 'Keramik', 'Cerámica', 'Keramiek', 'Ceramică'],
    'full grain leather': ['Pelle pieno fiore', 'Cuir pleine fleur', 'Vollnarbenleder', 'Piel plena flor', 'Volnerf leer', 'Piele cu fața naturală'],
    'jackets': ['Giacche', 'Vestes', 'Jacken', 'Chaquetas', 'Jassen', 'Geci'],
    'hoodies': ['Felpe con cappuccio', 'Sweats à capuche', 'Kapuzenpullover', 'Sudaderas con capucha', 'Hoodies', 'Hanorace'],
    'jeans': ['Jeans', 'Jeans', 'Jeans', 'Vaqueros', 'Jeans', 'Blugi'],
    'brushed + polished': ['Satinato + lucido', 'Brossé + poli', 'Gebürstet + poliert', 'Cepillado + pulido', 'Geborsteld + gepolijst', 'Periat + lustruit'],
    'screw-down crown': ['Corona a vite', 'Couronne vissée', 'Verschraubte Krone', 'Corona roscada', 'Schroefkroon', 'Coroană înșurubată'],
    'screw in screw crown': ['Corona a vite', 'Couronne vissée', 'Verschraubte Krone', 'Corona roscada', 'Schroefkroon', 'Coroană înșurubată'],
    'screw-in screw crown': ['Corona a vite', 'Couronne vissée', 'Verschraubte Krone', 'Corona roscada', 'Schroefkroon', 'Coroană înșurubată'],
    'screw in solid bottom cover': ['Fondello a vite', 'Fond vissé', 'Verschraubter Boden', 'Tapa roscada', 'Geschroefde bodem', 'Capac înșurubat'],
    'screw-in solid bottom cover': ['Fondello a vite', 'Fond vissé', 'Verschraubter Boden', 'Tapa roscada', 'Geschroefde bodem', 'Capac înșurubat'],
    'arabic numeral markers': ['Numeri arabi', 'Chiffres arabes', 'Arabische Ziffern', 'Números arábigos', 'Arabische cijfers', 'Cifre arabe'],
    'numberless': ['Senza numeri', 'Sans chiffres', 'Ohne Ziffern', 'Sin números', 'Zonder cijfers', 'Fără cifre'],
    'tool box': ['Scatola', 'Boîte', 'Box', 'Caja', 'Doos', 'Cutie'],
    'paper': ['Carta', 'Papier', 'Papier', 'Papel', 'Papier', 'Hârtie'],
    'covered button': ['Bottoni rivestiti', 'Boutons recouverts', 'Bezogene Knöpfe', 'Botones forrados', 'Beklede knopen', 'Nasturi îmbrăcați'],
    'skateboarding shoes': ['Scarpe da skate', 'Chaussures de skate', 'Skateschuhe', 'Zapatillas de skate', 'Skateschoenen', 'Pantofi de skate'],
    'natural color': ['Colore naturale', 'Couleur naturelle', 'Naturfarbe', 'Color natural', 'Natuurlijke kleur', 'Culoare naturală'],
    'cardigan': ['Cardigan', 'Cardigan', 'Strickjacke', 'Cárdigan', 'Vest', 'Cardigan'],
    'finished goods': ['Prodotto finito', 'Produit fini', 'Fertigware', 'Producto terminado', 'Eindproduct', 'Produs finit'],
    'middle age': ['Mezza età', "D'âge moyen", 'Mittleres Alter', 'Mediana edad', 'Middelbare leeftijd', 'Vârstă medie'],
    'flat (≤1cm)': ['Piatto (≤1 cm)', 'Plat (≤1 cm)', 'Flach (≤1 cm)', 'Plano (≤1 cm)', 'Plat (≤1 cm)', 'Plat (≤1 cm)'],
    'low (1cm - 3cm)': ['Basso (1–3 cm)', 'Bas (1–3 cm)', 'Niedrig (1–3 cm)', 'Bajo (1–3 cm)', 'Laag (1–3 cm)', 'Jos (1–3 cm)'],
    'height increasing': ['Rialzo interno', 'Rehausseur', 'Erhöhend', 'Aumento de altura', 'Verhogend', 'Înălțător'],
    'traveling': ['Viaggio', 'Voyage', 'Reisen', 'Viaje', 'Reizen', 'Călătorie'],
    'travel': ['Viaggio', 'Voyage', 'Reisen', 'Viaje', 'Reizen', 'Călătorie'],
    'party': ['Festa', 'Soirée', 'Party', 'Fiesta', 'Feest', 'Petrecere'],
    'wedding': ['Matrimonio', 'Mariage', 'Hochzeit', 'Boda', 'Bruiloft', 'Nuntă'],
    'business': ['Lavoro', 'Affaires', 'Business', 'Negocios', 'Zakelijk', 'Afaceri'],
    'office': ['Ufficio', 'Bureau', 'Büro', 'Oficina', 'Kantoor', 'Birou'],
    'beach': ['Spiaggia', 'Plage', 'Strand', 'Playa', 'Strand', 'Plajă'],
    'home': ['Casa', 'Maison', 'Zuhause', 'Casa', 'Thuis', 'Acasă'],
    'school': ['Scuola', 'École', 'Schule', 'Escuela', 'School', 'Școală'],
    'anti-slip': ['Antiscivolo', 'Antidérapant', 'Rutschfest', 'Antideslizante', 'Antislip', 'Antiderapant'],
    'lightweight': ['Leggero', 'Léger', 'Leicht', 'Ligero', 'Licht', 'Ușor'],
    'light': ['Leggero', 'Léger', 'Leicht', 'Ligero', 'Licht', 'Ușor'],
    'wear resistant': ['Resistente all\'usura', 'Résistant à l\'usure', 'Verschleißfest', 'Resistente al desgaste', 'Slijtvast', 'Rezistent la uzură'],
    'massage': ['Massaggiante', 'Massant', 'Massage', 'Masaje', 'Massage', 'Masaj'],
    'fur & faux fur': ['Pelliccia ed ecopelliccia', 'Fourrure et fausse fourrure', 'Pelz & Kunstpelz', 'Piel y piel sintética', 'Bont & imitatiebont', 'Blană & blană artificială']
  };
  var HIDDEN_VALUES = /^(noenname_null|others \(fill in by yourself\))$/i;

  var langIndex = function (lang) { return LANGS.indexOf(String(lang || '').slice(0, 2).toLowerCase()); };
  var clean = function (text) {
    return String(text).replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim().toLowerCase();
  };
  var cap = function (text) { return text.charAt(0).toUpperCase() + text.slice(1); };

  // Libellé traduit ; null si la ligne doit être masquée.
  var label = function (text, lang) {
    var key = clean(text).replace(/\s*:\s*$/, '');
    if (HIDDEN.test(key)) return null;
    key = ALIASES[key] || key;
    var i = langIndex(lang);
    // Anglais : texte du fournisseur gardé, seulement avec une majuscule (« whether full opening »).
    if (i === -1) return cap(String(text).trim());
    return LABELS[key] ? LABELS[key][i] : text;
  };
  // « POLYESTER » → « Polyester » en anglais ; le reste garde la casse du fournisseur.
  var english = function (text) {
    var t = String(text).trim();
    return t === t.toUpperCase() && /[A-Z]{3}/.test(t) ? cap(t.toLowerCase()) : cap(t);
  };
  // Valeur traduite ; « POLYESTER,COTTON » traduit partie par partie ; null si sans intérêt.
  var value = function (text, lang) {
    var raw = clean(text);
    if (HIDDEN_VALUES.test(raw)) return null;
    var i = langIndex(lang);
    if (i === -1) return english(text);
    var one = function (part) {
      var hit = VALUES[part.trim()];
      return hit ? hit[i] : null;
    };
    var whole = one(raw);
    if (whole) return whole;
    // « Breathable,Height Increasing,Waterproof » : chaque terme connu traduit, les autres gardés.
    if (raw.indexOf(',') !== -1) {
      var source = String(text).replace(/&amp;/g, '&').split(',');
      var parts = raw.split(',').map(function (part, k) { return one(part) || english(source[k] || part); });
      if (raw.split(',').some(function (part) { return one(part); })) return parts.join(', ');
    }
    return text;
  };

  window.specI18n = { label: label, value: value };
})();
