function initMobileTemuHeader() {
  var isMobile = window.matchMedia('(max-width: 760px)').matches;
  if (isMobile) document.documentElement.classList.add('mobile-temu-active');

  var wishlistStorageKey = 'platinumshop:wishlist:v1';
  var wishlistItems = readWishlist();
  var wishlistFilter = 'all';
  var wishlistSortOrder = 'recent';
  var wishlistPage = null;
  var wishlistPageList = null;
  var wishlistPageRequest = 0;
  var loadedWishlistCardStyles = new Set();
  var wishlistEditMode = false;
  var selectedWishlistIds = new Set();

  function readWishlist() {
    try {
      var storedItems = window.localStorage.getItem(wishlistStorageKey);
      if (!storedItems) return [];
      var parsedItems = JSON.parse(storedItems);
      if (!Array.isArray(parsedItems)) throw new TypeError('Stored wishlist is not an array.');
      return parsedItems.filter(function (item) {
        return item
          && typeof item.id === 'string'
          && typeof item.title === 'string'
          && typeof item.url === 'string';
      });
    } catch (error) {
      console.error('Unable to read the saved wishlist.', error);
      return [];
    }
  }

  function writeWishlist(items) {
    try {
      window.localStorage.setItem(wishlistStorageKey, JSON.stringify(items));
      wishlistItems = items;
      return true;
    } catch (error) {
      console.error('Unable to save the wishlist.', error);
      return false;
    }
  }

  function safeProductUrl(value) {
    try {
      var url = new URL(value, window.location.origin);
      return url.origin === window.location.origin ? url.href : '';
    } catch (error) {
      console.error('Unable to validate a wishlist product URL.', error);
      return '';
    }
  }

  function getFilteredWishlistItems() {
    var items = wishlistItems.slice();
    if (wishlistFilter === 'sale' || wishlistFilter === 'down') {
      items = items.filter(function (item) {
        return Number(item.compareAtPriceCents) > Number(item.priceCents);
      });
    } else if (wishlistFilter === 'available') {
      items = items.filter(function (item) {
        return item.available !== false;
      });
    }
    if (wishlistSortOrder === 'asc' || wishlistSortOrder === 'desc') {
      items.sort(function (first, second) {
        var difference = (Number(first.priceCents) || 0) - (Number(second.priceCents) || 0);
        return wishlistSortOrder === 'asc' ? difference : -difference;
      });
    } else {
      items.reverse();
    }
    return items;
  }

  function initializeWishlistPage() {
    wishlistPage = document.querySelector('[data-wishlist-page]');
    if (!wishlistPage) return;
    document.documentElement.classList.add('wishlist-page-active');
    wishlistPageList = wishlistPage.querySelector('[data-wishlist-list]');
    var sort = wishlistPage.querySelector('[data-wishlist-sort]');
    if (!wishlistPageList || !sort) {
      console.error('Wishlist page is missing its product list or sort control.', wishlistPage);
      return;
    }

    sort.addEventListener('change', function () {
      wishlistSortOrder = sort.value;
      renderWishlistPage();
    });
    renderWishlistPage();
  }

  function wishlistCardViewUrl(item) {
    var url = safeProductUrl(item.url);
    if (!url) return '';
    var viewUrl = new URL(url);
    viewUrl.searchParams.set('view', 'wishlist-card');
    if (item.variantId) viewUrl.searchParams.set('variant', item.variantId);
    return viewUrl.href;
  }

  async function loadWishlistCard(item) {
    var viewUrl = wishlistCardViewUrl(item);
    if (!viewUrl) throw new Error('Invalid product URL for wishlist item ' + item.id);

    var response = await fetch(viewUrl, { credentials: 'same-origin' });
    if (!response.ok) {
      throw new Error('Wishlist card request failed with status ' + response.status + ' for ' + item.url);
    }
    var markup = await response.text();
    var parsed = new DOMParser().parseFromString(markup, 'text/html');
    parsed.querySelectorAll('style').forEach(function (style) {
      var css = style.textContent || '';
      if (!css || loadedWishlistCardStyles.has(css)) return;
      loadedWishlistCardStyles.add(css);
      var themeStyle = document.createElement('style');
      themeStyle.dataset.wishlistCardStyle = '';
      themeStyle.textContent = css;
      document.head.appendChild(themeStyle);
    });
    var card = parsed.querySelector('li.alibaba-product-card');
    if (!card) throw new Error('Wishlist card response did not contain a product-item card for ' + item.url);
    var importedCard = document.importNode(card, true);
    var productButton = importedCard.querySelector('.alibaba-card__wishlist');
    importedCard.dataset.wishlistItemId = item.id;
    importedCard.dataset.wishlistPriceCents = productButton && productButton.dataset.priceCents
      ? productButton.dataset.priceCents
      : String(Number(item.priceCents) || 0);
    importedCard.dataset.wishlistVariantId = productButton && productButton.dataset.variantId
      ? productButton.dataset.variantId
      : (item.variantId || '');
    return importedCard;
  }

  function formatWishlistMoney(cents) {
    return new Intl.NumberFormat(document.documentElement.lang || 'it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format((Number(cents) || 0) / 100);
  }

  function parseWishlistMoney(value) {
    var normalized = String(value || '').replace(/\s/g, '').replace(/[^\d,.-]/g, '');
    if (!normalized) return 0;
    if (normalized.indexOf(',') !== -1) normalized = normalized.replace(/\./g, '').replace(',', '.');
    var amount = Number(normalized);
    return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
  }

  function readWishlistCardPrice(priceElement) {
    if (!priceElement) return 0;
    var cleanPrice = priceElement.cloneNode(true);
    cleanPrice.querySelectorAll('.old-price, .alibaba-card__discount-badge, .small, .price-varies').forEach(function (element) {
      element.remove();
    });
    var text = cleanPrice.textContent.replace(/\s+/g, ' ').trim();
    var moneyMatch = text.match(/(?:€\s*)?\d[\d.\s]*(?:,\d{1,2})|\d+(?:\.\d{1,2})?\s*€/);
    return moneyMatch ? parseWishlistMoney(moneyMatch[0]) : 0;
  }

  function updateWishlistSummaryFromCards(cards) {
    if (!wishlistPage) return;
    var summary = wishlistPage.querySelector('[data-wishlist-summary]');
    if (!summary) return;
    var totalCents = 0;
    var availableCount = 0;
    cards.forEach(function (card) {
      var productButton = card.querySelector('.alibaba-card__wishlist');
      var priceElement = card.querySelector('.alibaba-card__price-main');
      var priceCents = Number(card.dataset.wishlistPriceCents) || readWishlistCardPrice(priceElement);
      var variantId = card.dataset.wishlistVariantId || (productButton && productButton.dataset.variantId) || '';
      totalCents += priceCents;
      if (variantId) availableCount += 1;
    });
    summary.hidden = cards.length === 0;
    summary.querySelector('[data-wishlist-total]').textContent = formatWishlistMoney(totalCents);
    var addAll = summary.querySelector('[data-wishlist-add-all]');
    addAll.textContent = 'Aggiungi tutto al carrello (' + availableCount + ')';
    addAll.disabled = availableCount === 0;
  }

  function updateWishlistEditControls() {
    if (!wishlistPage) return;
    var edit = wishlistPage.querySelector('[data-wishlist-edit]');
    var editbar = wishlistPage.querySelector('[data-wishlist-editbar]');
    var selectAll = wishlistPage.querySelector('[data-wishlist-select-all]');
    var removeSelected = wishlistPage.querySelector('[data-wishlist-remove-selected]');
    if (!edit || !editbar || !selectAll || !removeSelected) return;
    edit.textContent = wishlistEditMode ? 'Fine' : 'Modifica';
    editbar.hidden = !wishlistEditMode;
    selectAll.checked = wishlistItems.length > 0 && selectedWishlistIds.size === wishlistItems.length;
    removeSelected.textContent = 'Rimuovi (' + selectedWishlistIds.size + ')';
    removeSelected.disabled = selectedWishlistIds.size === 0;
  }

  function decorateWishlistCardsForEdit(cards) {
    cards.forEach(function (card) {
      var itemId = card.dataset.wishlistItemId;
      var oldSelector = card.querySelector('[data-wishlist-select]');
      if (!wishlistEditMode) {
        if (oldSelector) oldSelector.remove();
        return;
      }
      var selector = oldSelector || document.createElement('button');
      selector.type = 'button';
      selector.className = 'wishlist-page__select';
      selector.dataset.wishlistSelect = itemId;
      selector.setAttribute('role', 'checkbox');
      selector.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"></path></svg>';
      selector.setAttribute('aria-checked', String(selectedWishlistIds.has(itemId)));
      selector.setAttribute('aria-label', 'Seleziona');
      if (!oldSelector) card.appendChild(selector);
    });
    updateWishlistEditControls();
  }

  function createWishlistMobileCard(item) {
    var article = document.createElement('li');
    var productUrl = safeProductUrl(item.url);
    var priceCents = Number(item.priceCents) || 0;
    var compareAtCents = Number(item.compareAtPriceCents) || 0;
    var discount = compareAtCents > priceCents
      ? Math.round((compareAtCents - priceCents) / compareAtCents * 100)
      : 0;
    article.className = 'wishlist-mobile-card';
    article.dataset.productId = item.id;

    var media = document.createElement('div');
    media.className = 'wishlist-mobile-card__media';
    var imageLink = document.createElement('a');
    imageLink.href = productUrl || '#';
    var image = document.createElement('img');
    image.src = item.image || '';
    image.alt = item.title;
    image.loading = 'lazy';
    imageLink.appendChild(image);
    media.appendChild(imageLink);

    var heart = document.createElement('button');
    heart.type = 'button';
    heart.className = 'wishlist-mobile-card__heart';
    heart.dataset.wishlistRemove = item.id;
    heart.setAttribute('aria-label', 'Rimuovi dalla wishlist');
    heart.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"></path></svg>';
    media.appendChild(heart);

    if (discount) {
      var badge = document.createElement('span');
      badge.className = 'wishlist-mobile-card__badge';
      badge.textContent = 'Prezzo sceso -' + formatWishlistMoney(compareAtCents - priceCents);
      media.appendChild(badge);
    }
    article.appendChild(media);

    var body = document.createElement('div');
    body.className = 'wishlist-mobile-card__body';
    var title = document.createElement('a');
    title.className = 'wishlist-mobile-card__title';
    title.href = productUrl || '#';
    title.textContent = item.title;
    body.appendChild(title);

    var variant = document.createElement('p');
    variant.className = 'wishlist-mobile-card__variant';
    variant.textContent = item.variantTitle || '';
    body.appendChild(variant);

    var price = document.createElement('p');
    price.className = 'wishlist-mobile-card__price' + (discount ? ' is-sale' : '');
    var currentPrice = document.createElement('strong');
    currentPrice.textContent = item.price || formatWishlistMoney(priceCents);
    price.appendChild(currentPrice);
    if (discount) {
      var oldPrice = document.createElement('s');
      oldPrice.textContent = item.compareAtPrice || formatWishlistMoney(compareAtCents);
      price.appendChild(oldPrice);
      var discountLabel = document.createElement('span');
      discountLabel.className = 'wishlist-mobile-card__discount';
      discountLabel.textContent = '-' + discount + '%';
      price.appendChild(discountLabel);
    }
    body.appendChild(price);

    var saved = document.createElement('p');
    saved.className = 'wishlist-mobile-card__saved';
    saved.textContent = discount ? 'Era ' + formatWishlistMoney(compareAtCents) + ' al salvataggio' : '';
    body.appendChild(saved);

    var add = document.createElement('button');
    add.type = 'button';
    add.className = 'wishlist-mobile-card__add';
    add.dataset.wishlistAdd = item.variantId || '';
    add.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 6h15l-1.5 9h-12z"></path><path d="M6 6 5 2H2"></path><path d="M13.5 8.5v4M11.5 10.5h4"></path></svg><span>Aggiungi</span>';
    add.disabled = !item.variantId;
    body.appendChild(add);
    article.appendChild(body);
    return article;
  }

  function renderWishlistPageFilters() {
    if (!wishlistPage) return;
    var container = wishlistPage.querySelector('[data-wishlist-filters]');
    if (!container) return;
    var saleCount = wishlistItems.filter(function (item) {
      return Number(item.compareAtPriceCents) > Number(item.priceCents);
    }).length;
    container.replaceChildren();
    [
      { id: 'all', label: 'Tutti', count: wishlistItems.length },
      { id: 'down', label: 'Prezzo sceso', count: saleCount },
      { id: 'sale', label: 'In offerta', count: saleCount },
      { id: 'available', label: 'Disponibili', count: wishlistItems.filter(function (item) { return item.available !== false; }).length }
    ].forEach(function (filter) {
      var button = document.createElement('button');
      button.type = 'button';
      button.dataset.wishlistFilter = filter.id;
      button.setAttribute('aria-pressed', String(wishlistFilter === filter.id));
      button.innerHTML = '<span>' + filter.label + '</span><small>' + filter.count + '</small>';
      container.appendChild(button);
    });
  }

  async function renderWishlistPage() {
    if (!wishlistPage || !wishlistPageList) return;
    var request = ++wishlistPageRequest;
    var filteredItems = getFilteredWishlistItems();
    var empty = wishlistPage.querySelector('[data-wishlist-empty]');
    var error = wishlistPage.querySelector('[data-wishlist-error]');
    var count = wishlistPage.querySelector('[data-wishlist-count]');
    var tools = wishlistPage.querySelector('[data-wishlist-tools]');
    var filters = wishlistPage.querySelector('[data-wishlist-filters]');
    var share = wishlistPage.querySelector('[data-wishlist-share]');
    var priceDrop = wishlistPage.querySelector('[data-wishlist-price-drop]');
    var summary = wishlistPage.querySelector('[data-wishlist-summary]');
    var saleCount = wishlistItems.filter(function (item) {
      return Number(item.compareAtPriceCents) > Number(item.priceCents);
    }).length;
    count.textContent = wishlistItems.length + (wishlistItems.length === 1 ? ' articolo salvato' : ' articoli salvati');
    empty.hidden = wishlistItems.length > 0;
    tools.hidden = wishlistItems.length === 0;
    filters.hidden = wishlistItems.length === 0;
    share.hidden = wishlistItems.length === 0;
    if (priceDrop) {
      priceDrop.hidden = saleCount === 0;
      var priceDropText = priceDrop.querySelector('[data-wishlist-price-drop-text]');
      if (priceDropText) priceDropText.innerHTML = '<strong>' + saleCount + (saleCount === 1 ? ' articolo è sceso' : ' articoli sono scesi') + ' di prezzo</strong> da quando li hai salvati';
    }
    if (summary) {
      summary.hidden = wishlistItems.length === 0;
      var total = wishlistItems.reduce(function (amount, item) { return amount + (Number(item.priceCents) || 0); }, 0);
      summary.querySelector('[data-wishlist-total]').textContent = formatWishlistMoney(total);
      summary.querySelector('[data-wishlist-add-all]').textContent = 'Aggiungi tutto al carrello (' + wishlistItems.length + ')';
    }
    error.hidden = true;
    wishlistPageList.hidden = filteredItems.length === 0;
    wishlistPageList.setAttribute('aria-busy', 'true');
    wishlistPage.querySelector('[data-wishlist-sort]').value = wishlistSortOrder;
    renderWishlistPageFilters();
    if (filteredItems.length) empty.hidden = true;

    var cards = await Promise.all(filteredItems.map(async function (item) {
      try {
        return await loadWishlistCard(item);
      } catch (loadError) {
        console.error('Unable to render a saved wishlist product.', loadError);
        return null;
      }
    }));
    if (request !== wishlistPageRequest) return;

    var validCards = cards.filter(Boolean);
    wishlistPageList.replaceChildren.apply(wishlistPageList, validCards);
    updateWishlistSummaryFromCards(validCards);
    decorateWishlistCardsForEdit(validCards);
    wishlistPageList.hidden = validCards.length === 0;
    wishlistPageList.setAttribute('aria-busy', 'false');
    error.hidden = validCards.length === filteredItems.length;
    if (filteredItems.length && !validCards.length) {
      empty.querySelector('h2').textContent = 'I prodotti salvati non sono disponibili';
      empty.hidden = false;
    } else if (wishlistItems.length && !filteredItems.length) {
      empty.querySelector('h2').textContent = 'Nessun prodotto in offerta';
      empty.hidden = false;
    } else if (!wishlistItems.length) {
      empty.querySelector('h2').textContent = 'La tua wishlist è vuota';
      empty.querySelector('p').textContent = 'Tocca il cuore sui prodotti che ti piacciono per ritrovarli qui.';
      empty.hidden = false;
    }
    syncWishlistButtons(wishlistPage);
  }

  function updateWishlistHeader() {
    if (!window.matchMedia('(max-width: 760px)').matches) return;
    var count = wishlistItems.length;
    document.querySelectorAll('a[href="/pages/wishlist"], a[href$="/pages/wishlist"]').forEach(function (link) {
      var badge = link.querySelector('.mobile-wishlist__count');
      if (count > 0 && !badge) {
        badge = document.createElement('span');
        badge.className = 'mobile-wishlist__count';
        badge.setAttribute('aria-hidden', 'true');
        link.appendChild(badge);
      }
      if (badge) {
        badge.textContent = String(count);
        badge.hidden = count === 0;
      }
      link.setAttribute('aria-label', count ? 'Wishlist (' + count + ')' : 'Wishlist');
    });
    document.querySelectorAll('.wishlist-header').forEach(function (headerLink) {
      headerLink.classList.remove('hidden');
    });
  }

  function syncWishlistButtons(root) {
    var buttons = [];
    if (root instanceof Element && root.matches('.alibaba-card__wishlist')) buttons.push(root);
    if (root && typeof root.querySelectorAll === 'function') {
      buttons = buttons.concat(Array.prototype.slice.call(root.querySelectorAll(
        '.alibaba-card__wishlist'
      )));
    }
    buttons.forEach(function (button) {
      var isSaved = wishlistItems.some(function (item) {
        return item.id === button.dataset.productId;
      });
      if (wishlistPage && wishlistPage.contains(button)) button.classList.remove('hidden');
      button.setAttribute('aria-pressed', String(isSaved));
    });
    if (wishlistPage) {
      wishlistPage.querySelectorAll('[data-wishlist-recommendations] .alibaba-product-card').forEach(function (card) {
        var recommendationButton = card.querySelector('.alibaba-card__wishlist');
        card.hidden = Boolean(recommendationButton && wishlistItems.some(function (item) {
          return item.id === recommendationButton.dataset.productId;
        }));
      });
    }
  }

  function addProductFromButton(button) {
    var productId = button.dataset.productId;
    var titleLink = button.closest('li') && button.closest('li').querySelector('.alibaba-card__title a');
    if (!productId || !titleLink) {
      console.error('Wishlist product is missing its ID or title link.', button);
      return;
    }
    var productUrl = safeProductUrl(titleLink.getAttribute('href'));
    if (!productUrl) {
      console.error('Wishlist product has an invalid product URL.', titleLink);
      return;
    }

    var isSaved = wishlistItems.some(function (item) {
      return item.id === productId;
    });
    var updatedItems = wishlistItems.filter(function (item) {
      return item.id !== productId;
    });
    if (!isSaved) {
      var image = button.closest('li').querySelector('.alibaba-card__picture img');
      var price = button.closest('li').querySelector('.alibaba-card__price-main');
      var compareAt = button.closest('li').querySelector('.old-price');
      var badge = button.closest('li').querySelector('.alibaba-top-selling-ribbon__text');
      updatedItems.push({
        id: productId,
        variantId: button.dataset.variantId || '',
        title: titleLink.textContent.trim(),
        url: productUrl,
        image: image ? image.currentSrc || image.src : '',
        price: price ? price.textContent.replace(/\s+/g, ' ').trim() : '',
        priceCents: Number(button.dataset.priceCents) || 0,
        compareAtPrice: compareAt ? compareAt.textContent.replace(/\s+/g, ' ').trim() : '',
        compareAtPriceCents: Number(button.dataset.compareAtPriceCents) || 0,
        discountPercent: Number(button.dataset.compareAtPriceCents) > Number(button.dataset.priceCents)
          ? Math.round((Number(button.dataset.compareAtPriceCents) - Number(button.dataset.priceCents))
            / Number(button.dataset.compareAtPriceCents) * 100)
          : 0,
        variantTitle: button.dataset.variantTitle && button.dataset.variantTitle !== 'Default Title'
          ? button.dataset.variantTitle
          : '',
        badge: badge ? badge.textContent.replace(/\s+/g, ' ').trim() : ''
      });
    }

    if (!writeWishlist(updatedItems)) return;
    syncWishlistButtons(document);
    updateWishlistHeader();
    renderWishlistPage();
  }

  async function addWishlistVariantsToCart(variantIds, trigger) {
    var items = variantIds.filter(Boolean).map(function (variantId) {
      return { id: Number(variantId), quantity: 1 };
    });
    if (!items.length) return;
    if (trigger) trigger.disabled = true;
    try {
      var shopRoot = window.Shopify && window.Shopify.routes ? window.Shopify.routes.root : '/';
      var response = await fetch(shopRoot + 'cart/add.js', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: items })
      });
      if (!response.ok) throw new Error('Cart request failed with status ' + response.status);
      if (trigger) {
        var label = trigger.querySelector('span');
        if (label) label.textContent = 'Aggiunto';
      }
      document.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
    } catch (error) {
      console.error('Unable to add wishlist products to the cart.', error);
      if (trigger) trigger.disabled = false;
    }
  }

  syncWishlistButtons(document);
  updateWishlistHeader();
  initializeWishlistPage();

  var wishlistObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node) {
        if (node instanceof Element) syncWishlistButtons(node);
      });
    });
  });
  wishlistObserver.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('storage', function (event) {
    if (event.key !== wishlistStorageKey) return;
    wishlistItems = readWishlist();
    syncWishlistButtons(document);
    updateWishlistHeader();
    renderWishlistPage();
  });

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
    var mobileViewport = window.matchMedia('(max-width: 760px)').matches;
    var wishlistButton = (mobileViewport || (wishlistPage && wishlistPage.contains(target)))
      && target.closest('.alibaba-card__wishlist');
    if (wishlistButton) {
      event.preventDefault();
      addProductFromButton(wishlistButton);
      return;
    }

    var filterButton = target.closest('[data-wishlist-filter]');
    if (filterButton) {
      wishlistFilter = filterButton.dataset.wishlistFilter;
      renderWishlistPage();
      return;
    }

    var priceDropButton = target.closest('[data-wishlist-price-drop]');
    if (priceDropButton) {
      wishlistFilter = 'down';
      renderWishlistPage();
      return;
    }

    var editButton = target.closest('[data-wishlist-edit]');
    if (editButton) {
      wishlistEditMode = !wishlistEditMode;
      selectedWishlistIds.clear();
      decorateWishlistCardsForEdit(Array.prototype.slice.call(wishlistPageList.children));
      return;
    }

    var selectButton = target.closest('[data-wishlist-select]');
    if (selectButton) {
      var selectedId = selectButton.dataset.wishlistSelect;
      if (selectedWishlistIds.has(selectedId)) selectedWishlistIds.delete(selectedId);
      else selectedWishlistIds.add(selectedId);
      selectButton.setAttribute('aria-checked', String(selectedWishlistIds.has(selectedId)));
      updateWishlistEditControls();
      return;
    }

    var selectAllInput = target.closest('[data-wishlist-select-all]');
    if (selectAllInput) {
      selectedWishlistIds.clear();
      if (selectAllInput.checked) {
        wishlistItems.forEach(function (item) { selectedWishlistIds.add(item.id); });
      }
      wishlistPage.querySelectorAll('[data-wishlist-select]').forEach(function (button) {
        button.setAttribute('aria-checked', String(selectedWishlistIds.has(button.dataset.wishlistSelect)));
      });
      updateWishlistEditControls();
      return;
    }

    var removeSelectedButton = target.closest('[data-wishlist-remove-selected]');
    if (removeSelectedButton && selectedWishlistIds.size) {
      if (writeWishlist(wishlistItems.filter(function (item) { return !selectedWishlistIds.has(item.id); }))) {
        selectedWishlistIds.clear();
        wishlistEditMode = false;
        syncWishlistButtons(document);
        updateWishlistHeader();
        renderWishlistPage();
      }
      return;
    }

    var removeButton = target.closest('[data-wishlist-remove]');
    if (removeButton) {
      var removeId = removeButton.dataset.wishlistRemove;
      if (writeWishlist(wishlistItems.filter(function (item) { return item.id !== removeId; }))) {
        syncWishlistButtons(document);
        updateWishlistHeader();
        renderWishlistPage();
      }
      return;
    }

    var addButton = target.closest('[data-wishlist-add]');
    if (addButton) {
      addWishlistVariantsToCart([addButton.dataset.wishlistAdd], addButton);
      return;
    }

    var addAllButton = target.closest('[data-wishlist-add-all]');
    if (addAllButton) {
      var loadedVariantIds = Array.prototype.map.call(
        wishlistPage.querySelectorAll('[data-wishlist-list] .alibaba-card__wishlist'),
        function (button) { return button.dataset.variantId || ''; }
      );
      addWishlistVariantsToCart(loadedVariantIds, addAllButton);
      return;
    }

    if (target.closest('[data-wishlist-share]')) {
      var shareText = wishlistItems.map(function (item) {
        return item.title + '\n' + item.url;
      }).join('\n\n');
      if (navigator.share) {
        navigator.share({ title: 'La mia Wishlist', text: shareText }).catch(function (error) {
          if (error.name !== 'AbortError') console.error('Unable to share the wishlist.', error);
        });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareText).catch(function (error) {
          console.error('Unable to copy the wishlist for sharing.', error);
        });
      } else {
        console.error('Sharing the wishlist is not supported by this browser.');
      }
      return;
    }
  }, true);

  var searchHost = document.querySelector('[data-mobile-search-host]');
  var nativeSearch = document.getElementById('search');
  var categoryBrowser = document.querySelector('[data-mobile-category-browser]');
  var exploreDrawer = document.querySelector('[data-mobile-explore-drawer]');
  var exploreTrigger = document.querySelector('[data-mobile-explore-trigger]');
  if (isMobile && exploreDrawer) document.body.appendChild(exploreDrawer);
  if (isMobile && searchHost && nativeSearch) {
    searchHost.appendChild(nativeSearch);
    nativeSearch.classList.add('mobile-temu-search__native');
  }
  if (isMobile && nativeSearch) {
    var searchInput = nativeSearch.querySelector('input[type="search"]');
    if (searchInput) {
      searchInput.addEventListener('focus', function () {
        document.body.classList.add('mobile-search-open');
      });
      searchInput.addEventListener('blur', function () {
        window.setTimeout(function () {
          var liveSearch = nativeSearch.querySelector('#livesearch');
          if (liveSearch && liveSearch.contains(document.activeElement)) return;
          document.body.classList.remove('mobile-search-open');
        }, 150);
      });
    }
  }

  var activeCategory = document.querySelector('.mobile-temu-categories .is-active');
  if (activeCategory) {
    var categoryScroller = activeCategory.closest('ul');
    if (categoryScroller) {
      var activeRect = activeCategory.getBoundingClientRect();
      var scrollerRect = categoryScroller.getBoundingClientRect();
      categoryScroller.scrollLeft += activeRect.left - scrollerRect.left
        - (categoryScroller.clientWidth - activeRect.width) / 2;
    }
  }

  var getCategoryTriggers = function () {
    return document.querySelectorAll('[data-mobile-categories-trigger]');
  };
  var syncCategoryTriggers = function (active) {
    getCategoryTriggers().forEach(function (trigger) {
      trigger.classList.toggle('is-active', active);
      trigger.setAttribute('aria-expanded', String(active));
      if (active) trigger.setAttribute('aria-current', 'page');
      else trigger.removeAttribute('aria-current');
    });
  };
  var exploreDrawerClosing = false;
  var finishCloseExploreDrawer = function (restoreFocus) {
    if (!exploreDrawer) return;
    if (exploreDrawer.open) exploreDrawer.close();
    exploreDrawer.classList.remove('is-closing');
    exploreDrawerClosing = false;
    document.body.classList.remove('mobile-explore-open');
    exploreDrawer.setAttribute('aria-hidden', 'true');
    exploreDrawer.inert = true;
    if (exploreTrigger) exploreTrigger.setAttribute('aria-expanded', 'false');
    if (restoreFocus && exploreTrigger) exploreTrigger.focus();
  };
  var closeExploreDrawer = function (restoreFocus) {
    if (!exploreDrawer || !exploreDrawer.open || exploreDrawerClosing) return;
    exploreDrawerClosing = true;
    exploreDrawer.inert = true;
    exploreDrawer.classList.add('is-closing');
    var settled = false;
    var settle = function () {
      if (settled) return;
      settled = true;
      exploreDrawer.removeEventListener('transitionend', onTransitionEnd);
      finishCloseExploreDrawer(restoreFocus);
    };
    var onTransitionEnd = function (event) {
      if (event.target !== exploreDrawer || event.propertyName !== 'transform') return;
      settle();
    };
    exploreDrawer.addEventListener('transitionend', onTransitionEnd);
    window.setTimeout(settle, 420);
  };
  var openExploreDrawer = function () {
    if (!exploreDrawer || exploreDrawer.open) return;
    if (exploreDrawerClosing) {
      exploreDrawer.classList.remove('is-closing');
      exploreDrawerClosing = false;
    }
    if (categoryBrowser && !categoryBrowser.hidden) {
      categoryBrowser.hidden = true;
      categoryBrowser.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('mobile-categories-open');
      syncCategoryTriggers(false);
    }
    exploreDrawer.inert = false;
    exploreDrawer.setAttribute('aria-hidden', 'false');
    exploreDrawer.showModal();
    document.body.classList.add('mobile-explore-open');
    if (exploreTrigger) exploreTrigger.setAttribute('aria-expanded', 'true');
    var closeButton = exploreDrawer.querySelector('.mobile-explore-drawer__close');
    if (closeButton) closeButton.focus();
    renderRecentExploreProducts();
  };
  var recentProductsSection = exploreDrawer && exploreDrawer.querySelector('[data-mobile-explore-recent]');
  var recentProductsRail = exploreDrawer && exploreDrawer.querySelector('[data-mobile-explore-recent-products]');
  var recentProductsLoaded = false;
  var formatExplorePrice = function (price) {
    var currency = exploreDrawer.getAttribute('data-currency');
    if (!currency) throw new Error('Missing Shopify currency for recently viewed products.');
    if (typeof price !== 'number' || !Number.isFinite(price)) {
      throw new Error('Invalid product price for recently viewed product.');
    }
    return new Intl.NumberFormat(document.documentElement.lang || 'it-IT', {
      style: 'currency',
      currency: currency
    }).format(price / 100);
  };
  // Mirrors the theme's `product.selected_or_first_available_variant` used everywhere
  // else on the site, instead of product.js top-level "price" which is the cheapest
  // variant in the range and can differ from the price actually shown for this product.
  var getExploreDisplayVariant = function (product) {
    if (!product || !Array.isArray(product.variants) || !product.variants.length) return null;
    var availableVariant = product.variants.find(function (variant) {
      return variant.available;
    });
    return availableVariant || product.variants[0];
  };
  var addCurrentProductToRecentList = function () {
    if (typeof general === 'undefined' || !general.viewed_product || !general.viewed_product_id) return;
    try {
      var recentProducts = JSON.parse(window.localStorage.getItem('recentlyViewedProduct') || '[]');
      if (!Array.isArray(recentProducts)) {
        throw new Error('The recently viewed product data is not a list.');
      }
      recentProducts = recentProducts.filter(function (item) {
        return item && String(item.productId) !== String(general.viewed_product_id);
      });
      recentProducts.push({
        productUrl: general.viewed_product,
        productId: general.viewed_product_id
      });
      window.localStorage.setItem('recentlyViewedProduct', JSON.stringify(recentProducts.slice(-12)));
    } catch (error) {
      console.error('Unable to update recently viewed products.', error);
    }
  };
  addCurrentProductToRecentList();
  var renderRecentExploreProducts = function () {
    if (!recentProductsSection || !recentProductsRail || recentProductsLoaded) return;
    var recentProducts;
    try {
      recentProducts = JSON.parse(window.localStorage.getItem('recentlyViewedProduct') || '[]');
      if (!Array.isArray(recentProducts)) {
        throw new Error('The recently viewed product data is not a list.');
      }
    } catch (error) {
      console.error('Unable to read recently viewed products.', error);
      recentProductsSection.hidden = true;
      recentProductsLoaded = true;
      return;
    }
    recentProductsRail.replaceChildren();
    recentProductsSection.hidden = true;
    var validProducts = recentProducts.slice().reverse().filter(function (item) {
      if (!item || typeof item.productUrl !== 'string' || !item.productId) return false;
      try {
        return new URL(item.productUrl, window.location.href).origin === window.location.origin;
      } catch (error) {
        console.error('Invalid recently viewed product URL.', error);
        return false;
      }
    }).slice(0, 8);
    if (!validProducts.length) {
      recentProductsLoaded = true;
      return;
    }

    Promise.allSettled(validProducts.map(function (item) {
      var productUrl = new URL(item.productUrl, window.location.href);
      productUrl.search = '';
      productUrl.hash = '';
      productUrl.pathname = productUrl.pathname.replace(/\/$/, '') + '.js';
      return fetch(productUrl.href, { credentials: 'same-origin' }).then(function (response) {
        if (!response.ok) throw new Error('Product request failed: ' + response.status);
        return response.json();
      });
    })).then(function (results) {
      results.forEach(function (result, index) {
        if (result.status === 'rejected') {
          console.error('Unable to load a recently viewed product.', result.reason);
          return;
        }
        var product = result.value;
        var variant = getExploreDisplayVariant(product);
        var onSale = !!variant
          && typeof variant.compare_at_price === 'number'
          && variant.compare_at_price > variant.price;
        var card = document.createElement('a');
        card.className = onSale ? 'mobile-explore-product mobile-explore-product--sale' : 'mobile-explore-product';
        card.href = validProducts[index].productUrl;
        var imageWrap = document.createElement('span');
        imageWrap.className = 'mobile-explore-product__image';
        if (product.featured_image) {
          var image = document.createElement('img');
          image.src = product.featured_image;
          image.alt = product.title || '';
          image.loading = 'lazy';
          imageWrap.appendChild(image);
        }
        if (onSale) {
          var discountAmount = Math.round(
            ((variant.compare_at_price - variant.price) / variant.compare_at_price) * 100
          );
          var badge = document.createElement('span');
          badge.textContent = '-' + discountAmount + '%';
          imageWrap.appendChild(badge);
        }
        card.appendChild(imageWrap);
        var title = document.createElement('span');
        title.textContent = product.title;
        card.appendChild(title);
        if (variant) {
          var price = document.createElement('strong');
          price.textContent = formatExplorePrice(variant.price);
          if (onSale) {
            var comparePrice = document.createElement('s');
            comparePrice.textContent = formatExplorePrice(variant.compare_at_price);
            price.appendChild(document.createTextNode(' '));
            price.appendChild(comparePrice);
          }
          card.appendChild(price);
        }
        recentProductsRail.appendChild(card);
      });
      recentProductsSection.hidden = recentProductsRail.childElementCount === 0;
      recentProductsLoaded = true;
    }).catch(function (error) {
      console.error('Unable to render recently viewed products.', error);
      recentProductsSection.hidden = true;
      recentProductsLoaded = true;
    });
  };
  var clearRecentExploreProducts = function () {
    try {
      window.localStorage.removeItem('recentlyViewedProduct');
      recentProductsRail.replaceChildren();
      recentProductsSection.hidden = true;
      recentProductsLoaded = true;
    } catch (error) {
      console.error('Unable to clear recently viewed products.', error);
    }
  };
  var navigationProgress = null;
  var navigationProgressTimeout = null;
  var stopNavigationProgress = function () {
    document.documentElement.classList.remove('mobile-page-loading');
    if (navigationProgressTimeout) {
      window.clearTimeout(navigationProgressTimeout);
      navigationProgressTimeout = null;
    }
  };

  var startNavigationProgress = function () {
    if (!navigationProgress) {
      navigationProgress = document.createElement('div');
      navigationProgress.className = 'mobile-navigation-progress';
      navigationProgress.setAttribute('aria-hidden', 'true');
      var progressBar = document.createElement('span');
      navigationProgress.appendChild(progressBar);
      document.body.appendChild(navigationProgress);
    }
    document.documentElement.classList.add('mobile-page-loading');
    if (navigationProgressTimeout) window.clearTimeout(navigationProgressTimeout);
    navigationProgressTimeout = window.setTimeout(stopNavigationProgress, 45000);
  };

  window.addEventListener('pageshow', stopNavigationProgress);

  window.addEventListener('pagehide', function () {
    if (categoryBrowser) {
      categoryBrowser.hidden = true;
      categoryBrowser.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('mobile-categories-open', 'mobile-search-open');
    syncCategoryTriggers(false);
    closeExploreDrawer(false);
  });

  document.addEventListener('keydown', function (event) {
    if (!document.body.classList.contains('mobile-explore-open') || !exploreDrawer) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeExploreDrawer(true);
      return;
    }
    if (event.key !== 'Tab') return;
    var focusableItems = exploreDrawer.querySelectorAll('a[href], button:not([disabled])');
    if (!focusableItems.length) return;
    var firstItem = focusableItems[0];
    var lastItem = focusableItems[focusableItems.length - 1];
    if (event.shiftKey && (document.activeElement === firstItem || !exploreDrawer.contains(document.activeElement))) {
      event.preventDefault();
      lastItem.focus();
    } else if (!event.shiftKey && (document.activeElement === lastItem || !exploreDrawer.contains(document.activeElement))) {
      event.preventDefault();
      firstItem.focus();
    }
  });

  document.addEventListener('click', function (event) {
    if (!window.matchMedia('(max-width: 760px)').matches) return;
    var target = event.target;
    if (!(target instanceof Element)) return;

    var clickedExploreTrigger = target.closest('[data-mobile-explore-trigger]');
    if (clickedExploreTrigger) {
      event.preventDefault();
      event.stopPropagation();
      if (document.body.classList.contains('mobile-explore-open')) closeExploreDrawer(true);
      else openExploreDrawer();
      return;
    }
    if (target === exploreDrawer) {
      event.preventDefault();
      closeExploreDrawer(true);
      return;
    }
    if (target.closest('[data-mobile-explore-close]')) {
      event.preventDefault();
      closeExploreDrawer(true);
      return;
    }
    if (target.closest('[data-mobile-explore-recent-clear]')) {
      event.preventDefault();
      clearRecentExploreProducts();
      return;
    }

    var clickedCategoryTrigger = target.closest('[data-mobile-categories-trigger]');
    if (clickedCategoryTrigger) {
      event.preventDefault();
      event.stopPropagation();
      closeExploreDrawer(false);
      if (!categoryBrowser) return;
      categoryBrowser.hidden = false;
      categoryBrowser.removeAttribute('aria-hidden');
      document.body.classList.add('mobile-categories-open');
      syncCategoryTriggers(true);
      window.scrollTo({ top: 0, behavior: 'auto' });
      loadPanelImages(categoryBrowser.querySelector('.mobile-category-browser__panel.is-active'));
      loadCategoryProducts(categoryBrowser.querySelector('.mobile-category-browser__panel.is-active'));
      window.requestAnimationFrame(sizeCategoryBrowser);
      return;
    }

    var link = target.closest('a[href]');
    if (!link
      || link.matches('[data-category-tab], [data-category-panel-trigger], [data-category-products-more]')
      || event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
      || link.hasAttribute('download')
      || (link.target && link.target !== '_self')
      || link.getAttribute('href').charAt(0) === '#') return;

    var destination = new URL(link.href, window.location.href);
    var categoryLink = link.closest('.mobile-temu-categories');
    if (categoryLink
      && (destination.protocol === 'http:' || destination.protocol === 'https:')
      && destination.origin === window.location.origin) {
      categoryLink.querySelectorAll('a.is-pending').forEach(function (pendingLink) {
        pendingLink.classList.remove('is-pending');
      });
      link.classList.add('is-pending');
    }

    if ((destination.protocol !== 'http:' && destination.protocol !== 'https:')
      || destination.origin !== window.location.origin
      || (destination.pathname === window.location.pathname
        && destination.search === window.location.search
        && destination.hash)) return;

    startNavigationProgress();
  }, true);

  if (!categoryBrowser) return;
  var featuredOnlyTab = categoryBrowser.querySelector('[data-featured-only-tab]');
  var syncCategoryBrowserState = function () {
    if (!getCategoryTriggers().length) return;
    if (categoryBrowser.hidden) {
      document.body.classList.remove('mobile-categories-open');
      syncCategoryTriggers(false);
      return;
    }
    document.body.classList.add('mobile-categories-open');
    syncCategoryTriggers(true);
    window.requestAnimationFrame(sizeCategoryBrowser);
  };

  window.addEventListener('pageshow', syncCategoryBrowserState);

  var updateFeaturedOnlyTab = function (selectedTab) {
    if (!featuredOnlyTab || !selectedTab) return;
    var isFeatured = selectedTab.getAttribute('data-category-tab') === 'mobile-category-panel-featured';
    featuredOnlyTab.hidden = !isFeatured;
  };

  var loadPanelImages = function (panel, limit, priority) {
    if (!panel) return;
    Array.prototype.slice.call(panel.querySelectorAll('img[data-src], img[loading="lazy"]'), 0, limit || 99).forEach(function (image, index) {
      if (image.dataset.src) {
        image.src = image.dataset.src;
        image.removeAttribute('data-src');
      }
      image.loading = 'eager';
      image.fetchPriority = index < 3 ? (priority || 'high') : 'auto';
    });
  };

  var categoryCacheDbPromise;
  var categoryCacheTtl = 5 * 60 * 1000;

  var openCategoryCache = function () {
    if (!window.indexedDB) return Promise.resolve(null);
    if (categoryCacheDbPromise) return categoryCacheDbPromise;

    categoryCacheDbPromise = new Promise(function (resolve, reject) {
      var request = window.indexedDB.open('PlatinumMobileCategoryCache', 1);
      request.onupgradeneeded = function () {
        var database = request.result;
        if (!database.objectStoreNames.contains('responses')) {
          database.createObjectStore('responses', { keyPath: 'key' });
        }
      };
      request.onsuccess = function () {
        var database = request.result;
        database.onversionchange = function () { database.close(); };
        resolve(database);
      };
      request.onerror = function () { reject(request.error || new Error('IndexedDB open failed')); };
      request.onblocked = function () { reject(new Error('IndexedDB upgrade blocked')); };
    }).catch(function (error) {
      categoryCacheDbPromise = null;
      console.warn('[Mobile category cache] IndexedDB unavailable; using network.', error);
      return null;
    });

    return categoryCacheDbPromise;
  };

  var categoryCacheKey = function (url) {
    return new URL(url, window.location.href).href;
  };

  var readCategoryCache = function (url) {
    return openCategoryCache().then(function (database) {
      if (!database) return null;
      return new Promise(function (resolve, reject) {
        var transaction = database.transaction('responses', 'readonly');
        var request = transaction.objectStore('responses').get(categoryCacheKey(url));
        request.onsuccess = function () {
          var entry = request.result;
          if (!entry || entry.expiresAt <= Date.now()
            || typeof entry.html !== 'string'
            || entry.html.indexOf('data-mobile-category-products') === -1) {
            if (entry) {
              var cleanup = database.transaction('responses', 'readwrite');
              cleanup.objectStore('responses').delete(categoryCacheKey(url));
            }
            resolve(null);
            return;
          }
          resolve(entry.html);
        };
        request.onerror = function () { reject(request.error || new Error('IndexedDB read failed')); };
        transaction.onabort = function () { reject(transaction.error || new Error('IndexedDB read transaction aborted')); };
      });
    }).catch(function (error) {
      console.warn('[Mobile category cache] Could not read cached products.', error);
      return null;
    });
  };

  var writeCategoryCache = function (url, html) {
    return openCategoryCache().then(function (database) {
      if (!database) return;
      return new Promise(function (resolve, reject) {
        var transaction = database.transaction('responses', 'readwrite');
        var store = transaction.objectStore('responses');
        store.put({
          key: categoryCacheKey(url),
          html: html,
          cachedAt: Date.now(),
          expiresAt: Date.now() + categoryCacheTtl
        });
        var entries = [];
        var cursorRequest = store.openCursor();
        cursorRequest.onsuccess = function () {
          var cursor = cursorRequest.result;
          if (!cursor) {
            entries.sort(function (first, second) { return first.cachedAt - second.cachedAt; });
            entries.slice(0, Math.max(0, entries.length - 60)).forEach(function (entry) {
              store.delete(entry.key);
            });
            return;
          }
          var entry = cursor.value;
          if (entry.expiresAt <= Date.now()) {
            cursor.delete();
          } else {
            entries.push({ key: entry.key, cachedAt: entry.cachedAt });
          }
          cursor.continue();
        };
        cursorRequest.onerror = function () {
          reject(cursorRequest.error || new Error('IndexedDB cleanup failed'));
        };
        transaction.oncomplete = function () { resolve(); };
        transaction.onerror = function () { reject(transaction.error || new Error('IndexedDB write failed')); };
        transaction.onabort = function () { reject(transaction.error || new Error('IndexedDB write transaction aborted')); };
      });
    }).catch(function (error) {
      console.warn('[Mobile category cache] Could not store products; keeping network result.', error);
    });
  };

  var fetchCategoryHtml = function (url, failureMessage) {
    return readCategoryCache(url).then(function (cachedHtml) {
      if (cachedHtml !== null) return cachedHtml;
      return fetch(url, { credentials: 'same-origin' }).then(function (response) {
        if (!response.ok) throw new Error(failureMessage);
        return response.text();
      }).then(function (html) {
        if (html.indexOf('data-mobile-category-products') === -1) {
          throw new Error('Category products markup missing');
        }
        writeCategoryCache(url, html);
        return html;
      });
    });
  };

  var createCategoryLoadingIndicator = function () {
    var indicator = document.createElement('div');
    indicator.className = 'mobile-category-loading';
    indicator.setAttribute('role', 'status');
    indicator.setAttribute('aria-live', 'polite');

    var message = document.createElement('span');
    message.className = 'mobile-category-loading__message';
    message.textContent = 'Caricamento...';
    indicator.appendChild(message);

    var skeletons = document.createElement('div');
    skeletons.className = 'mobile-category-loading__skeletons';
    skeletons.setAttribute('aria-hidden', 'true');
    for (var index = 0; index < 6; index += 1) {
      var card = document.createElement('span');
      card.className = 'mobile-category-loading__card';
      var image = document.createElement('span');
      image.className = 'mobile-category-loading__image';
      var title = document.createElement('span');
      title.className = 'mobile-category-loading__title';
      card.appendChild(image);
      card.appendChild(title);
      skeletons.appendChild(card);
    }
    indicator.appendChild(skeletons);
    return indicator;
  };

  var bindMoreProducts = function (panel) {
    var more = panel.querySelector('[data-category-products-more]');
    if (!more || more.dataset.bound === 'true') return;
    more.dataset.bound = 'true';
    more.addEventListener('click', function (event) {
      event.preventDefault();
      if (more.dataset.loading === 'true') return;
      more.dataset.loading = 'true';
      more.setAttribute('aria-busy', 'true');
      more.classList.add('is-loading');
      fetchCategoryHtml(more.href, 'More category products request failed')
        .then(function (html) {
          var parsed = new DOMParser().parseFromString(html, 'text/html');
          var products = parsed.querySelector('[data-mobile-category-products]');
          if (!products) throw new Error('More category products markup missing');
          var currentProducts = more.closest('[data-mobile-category-products]') || panel;
          var addedIndex = 0;
          Array.prototype.slice.call(products.children).forEach(function (item) {
            if (item.matches('[data-category-products-more]')) return;
            if (item.matches('.mobile-category-card')) {
              item.classList.add('is-load-more-item');
              item.style.setProperty('--load-more-index', addedIndex);
              addedIndex += 1;
            }
            currentProducts.appendChild(item);
          });
          more.remove();
          var nextMore = products.querySelector('[data-category-products-more]');
          if (nextMore) {
            currentProducts.appendChild(nextMore);
            bindMoreProducts(panel);
          }
          loadPanelImages(panel);
        })
        .catch(function (error) {
          console.error(error);
          more.classList.remove('is-loading');
          more.setAttribute('aria-busy', 'false');
        })
        .then(function () {
          more.dataset.loading = 'false';
        });
    });
  };

  var loadCategoryProducts = function (panel) {
    if (!panel || panel.dataset.productsLoaded === 'true' || panel.dataset.productsLoaded === 'loading') return;
    var endpoint = panel.getAttribute('data-category-products-endpoint');
    if (!endpoint) return;
    panel.dataset.productsLoaded = 'loading';
    panel.removeAttribute('data-products-error');
    if (panel.hasAttribute('data-deferred-products')) {
      panel.setAttribute('aria-busy', 'true');
    }
    var loadingIndicator = createCategoryLoadingIndicator();
    panel.appendChild(loadingIndicator);
    fetchCategoryHtml(endpoint, 'Category products request failed')
      .then(function (html) {
        var parsed = new DOMParser().parseFromString(html, 'text/html');
        var products = parsed.querySelector('[data-mobile-category-products]');
        if (!products) throw new Error('Category products markup missing');
        loadingIndicator.remove();
        panel.appendChild(products);
        panel.dataset.productsLoaded = 'true';
        if (panel.hasAttribute('data-deferred-products')) {
          panel.setAttribute('aria-busy', 'false');
        }
        bindMoreProducts(panel);
        loadPanelImages(panel);
      })
      .catch(function (error) {
        loadingIndicator.remove();
        panel.dataset.productsLoaded = '';
        panel.setAttribute('data-products-error', 'true');
        if (panel.hasAttribute('data-deferred-products')) {
          panel.setAttribute('aria-busy', 'false');
        }
        console.error(error);
      });
  };

  var sizeCategoryBrowser = function () {
    if (categoryBrowser.hidden) return;
    var viewport = window.visualViewport;
    var viewportHeight = viewport ? viewport.height : window.innerHeight;
    var bottomNavigation = document.querySelector('.mobile-bottom-navigation');
    var bottomNavigationHeight = bottomNavigation ? bottomNavigation.getBoundingClientRect().height : 0;
    var viewportTop = viewport ? viewport.offsetTop : 0;
    var browserTop = categoryBrowser.getBoundingClientRect().top - viewportTop;
    categoryBrowser.style.height = Math.max(280, viewportHeight
      - Math.max(0, browserTop) - bottomNavigationHeight) + 'px';
  };

  categoryBrowser.querySelectorAll('[data-category-tab]').forEach(function (tab) {
    tab.addEventListener('click', function (event) {
      event.preventDefault();
      var newPanelTrigger = categoryBrowser.querySelector('[data-category-panel-trigger="mobile-category-panel-new"]');
      var isFeatured = tab.getAttribute('data-category-tab') === 'mobile-category-panel-featured';
      updateFeaturedOnlyTab(tab);
      if (newPanelTrigger) newPanelTrigger.hidden = !isFeatured;
      categoryBrowser.querySelectorAll('[data-category-tab]').forEach(function (item) {
        var selected = item === tab;
        item.classList.toggle('is-active', selected);
        item.setAttribute('aria-selected', selected ? 'true' : 'false');
      });
      categoryBrowser.querySelectorAll('.mobile-category-browser__panel').forEach(function (panel) {
        var selected = panel.id === tab.getAttribute('data-category-tab');
        panel.classList.toggle('is-active', selected);
        panel.hidden = !selected;
        if (selected) {
          loadCategoryProducts(panel);
          loadPanelImages(panel);
        }
      });
      categoryBrowser.querySelector('.mobile-category-browser__main').scrollTop = 0;
    });
  });

  categoryBrowser.querySelectorAll('[data-category-panel-trigger]').forEach(function (trigger) {
    trigger.addEventListener('click', function (event) {
      var selectedPanel = document.getElementById(trigger.getAttribute('data-category-panel-trigger'));
      if (!selectedPanel) return;
      event.preventDefault();
      updateFeaturedOnlyTab(categoryBrowser.querySelector('[data-category-tab="' + selectedPanel.id + '"]'));
      categoryBrowser.querySelectorAll('.mobile-category-browser__panel').forEach(function (panel) {
        var selected = panel === selectedPanel;
        panel.classList.toggle('is-active', selected);
        panel.hidden = !selected;
      });

      loadPanelImages(selectedPanel);
      loadCategoryProducts(selectedPanel);
      categoryBrowser.querySelector('.mobile-category-browser__main').scrollTop = 0;
    });
  });

  updateFeaturedOnlyTab(categoryBrowser.querySelector('[data-category-tab].is-active'));

  window.addEventListener('resize', sizeCategoryBrowser);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', sizeCategoryBrowser);
    window.visualViewport.addEventListener('scroll', sizeCategoryBrowser);
  }
}

// Bannière hero (homepage) — remplace visuellement le compteur natif "1 / 6" par de vrais points
// de pagination façon prototype, en mobile uniquement. Ne touche ni au moteur Swiper partagé
// (assets/custom.js) ni à aucune autre section : lecture passive du texte déjà rendu par le
// carrousel natif, aucun contrôle de navigation ajouté.
function initHeroPaginationDots(attemptsLeft) {
  if (attemptsLeft === undefined) attemptsLeft = 20;

  var section = document.querySelector('[id$="section_slideshow_XNiKWa"]');
  if (!section) return;

  var wrap = section.querySelector('.m6fr.slider-fraction');
  var pagination = section.querySelector('.swiper-custom-pagination');
  var currentEl = pagination && pagination.querySelector('.swiper-pagination-current');
  var totalEl = pagination && pagination.querySelector('.swiper-pagination-total');

  // Le carrousel Swiper (assets/custom.js) construit ces éléments de façon asynchrone ;
  // on retente quelques fois si le DOM n'est pas encore prêt, sans jamais y toucher.
  if (!wrap || !pagination || !currentEl || !totalEl) {
    if (attemptsLeft > 0) {
      setTimeout(function () { initHeroPaginationDots(attemptsLeft - 1); }, 150);
    }
    return;
  }

  if (wrap.querySelector('.mobile-hero-dots')) return;

  var dots = document.createElement('div');
  dots.className = 'mobile-hero-dots';
  wrap.appendChild(dots);

  var renderedTotal = 0;

  function render() {
    var total = parseInt(totalEl.textContent, 10) || 0;
    if (total !== renderedTotal) {
      dots.innerHTML = '';
      for (var i = 0; i < total; i++) {
        dots.appendChild(document.createElement('span'));
      }
      renderedTotal = total;
    }
    var current = parseInt(currentEl.textContent, 10) || 1;
    Array.prototype.forEach.call(dots.children, function (dot, index) {
      dot.classList.toggle('is-active', index === current - 1);
    });
  }

  render();

  var observer = new MutationObserver(render);
  observer.observe(currentEl, { characterData: true, childList: true, subtree: true });
  observer.observe(totalEl, { characterData: true, childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMobileTemuHeader, { once: true });
  document.addEventListener('DOMContentLoaded', initHeroPaginationDots, { once: true });
} else {
  initMobileTemuHeader();
  initHeroPaginationDots();
}
