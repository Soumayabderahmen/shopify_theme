(async function () {
  var xtraTheme = window.XtraTheme = window.XtraTheme || {};
  var standardEventsDomReady = xtraTheme.standardEventsDomReady || Promise.resolve();

  if (xtraTheme.standardEventsModuleStarted) return;
  xtraTheme.standardEventsModuleStarted = true;

  try {
    function hasStandardEventsModule(module) {
      return Boolean(
        module &&
        typeof module.PageViewEvent === 'function' &&
        typeof module.ProductViewEvent === 'function' &&
        typeof module.CollectionViewEvent === 'function' &&
        typeof module.CartViewEvent === 'function' &&
        typeof module.ProductSelectEvent === 'function' &&
        typeof module.ProductSelectEvent.createPromise === 'function' &&
        typeof module.CartLinesUpdateEvent === 'function' &&
        typeof module.CartLinesUpdateEvent.createPromise === 'function' &&
        typeof module.CartLinesUpdateEvent.createCartFromAjaxResponse === 'function' &&
        typeof module.CartAttributesUpdateEvent === 'function' &&
        typeof module.CartAttributesUpdateEvent.createPromise === 'function' &&
        typeof module.CartAttributesUpdateEvent.createCartFromAjaxResponse === 'function' &&
        typeof module.CartNoteUpdateEvent === 'function' &&
        typeof module.CartNoteUpdateEvent.createPromise === 'function' &&
        typeof module.CartDiscountUpdateEvent === 'function' &&
        typeof module.CartDiscountUpdateEvent.createPromise === 'function' &&
        typeof module.CartErrorEvent === 'function' &&
        typeof module.CollectionUpdateEvent === 'function' &&
        typeof module.CollectionUpdateEvent.createPromise === 'function' &&
        typeof module.CollectionUpdateEvent.parseProductFilters === 'function' &&
        typeof module.SearchUpdateEvent === 'function' &&
        typeof module.SearchUpdateEvent.createPromise === 'function' &&
        typeof module.SearchUpdateEvent.parseProductFilters === 'function'
      );
    }

    var StandardEvents = window.Shopify && window.Shopify.StandardEvents;

    if (!hasStandardEventsModule(StandardEvents)) {
      StandardEvents = await import('https://cdn.shopify.com/storefront/standard-events.js');
    }

    if (!hasStandardEventsModule(StandardEvents)) {
      throw new Error('Standard storefront events module is invalid');
    }

    var eventClassNames = {
      product: 'ProductViewEvent',
      collection: 'CollectionViewEvent',
      cart: 'CartViewEvent'
    };
    var selector = '[data-standard-view-event]';
    var manualSelector = selector + '[data-standard-view-event-trigger="manual"]';
    var payloadAttribute = 'data-standard-view-event-payload';
    var sourceAttribute = 'data-standard-view-event-source';
    var triggerAttribute = 'data-standard-view-event-trigger';
    var dispatchedAttribute = 'data-standard-view-event-dispatched';
    var scopeAttribute = 'data-standard-view-event-scope';
    var observedElements = new WeakMap();
    var pageScopedEvents = xtraTheme.standardPageScopedViewEvents =
      xtraTheme.standardPageScopedViewEvents || {};

    window.Shopify = window.Shopify || {};
    window.Shopify.StandardEvents = StandardEvents;

    function getPayloadSource(target, eventType) {
      if (target.hasAttribute(payloadAttribute)) return target;

      return target.querySelector(
        '[' + sourceAttribute + '="' + eventType + '"][' + payloadAttribute + ']'
      );
    }

    function dispatchViewEvent(target, expectedType) {
      if (!target || !target.isConnected) return false;

      var eventType = expectedType || target.getAttribute('data-standard-view-event');
      var eventClassName = eventClassNames[eventType];
      var EventClass = eventClassName ? StandardEvents[eventClassName] : null;
      var payloadSource = getPayloadSource(target, eventType);

      if (!EventClass || !payloadSource) return false;

      try {
        var payload = JSON.parse(payloadSource.getAttribute(payloadAttribute));
        target.dispatchEvent(new EventClass(payload));
        return true;
      } catch (error) {
        console.warn('Invalid standard storefront view event payload', {
          eventType: eventType,
          error: error
        });
        return false;
      }
    }

    function stopObserving(target) {
      var observer = observedElements.get(target);
      if (observer) observer.disconnect();
      observedElements.delete(target);
    }

    function getPageScopeKey(target) {
      if (!target || target.getAttribute(scopeAttribute) !== 'page') return null;

      return target.getAttribute('data-standard-view-event');
    }

    function skipPreviouslyDispatchedPageScope(target) {
      var scopeKey = getPageScopeKey(target);

      if (!scopeKey || !pageScopedEvents[scopeKey]) return false;

      target.setAttribute(dispatchedAttribute, 'true');
      stopObserving(target);
      return true;
    }

    function markPageScopeDispatched(target) {
      var scopeKey = getPageScopeKey(target);
      if (scopeKey) pageScopedEvents[scopeKey] = true;
    }

    function isManualTargetActive(target) {
      var panel = target.closest ? target.closest('.m6pn') : null;

      return Boolean(
        panel &&
        panel.classList.contains('toggle') &&
        panel.getAttribute('aria-hidden') !== 'true'
      );
    }

    function observeTarget(target, allowManual, restartManualObserver) {
      if (!target || target.hasAttribute(dispatchedAttribute)) return;
      if (skipPreviouslyDispatchedPageScope(target)) return;

      var isManual = target.getAttribute(triggerAttribute) === 'manual';

      if (isManual && !allowManual) return;

      if (observedElements.has(target)) {
        if (isManual && restartManualObserver) {
          stopObserving(target);
        } else {
          return;
        }
      }

      if (!('IntersectionObserver' in window)) {
        if (!isManual || isManualTargetActive(target)) {
          if (dispatchViewEvent(target)) {
            markPageScopeDispatched(target);
            target.setAttribute(dispatchedAttribute, 'true');
          }
        }
        return;
      }

      var observer = new IntersectionObserver(function (entries) {
        var becameVisible = entries.some(function (entry) {
          return entry.isIntersecting;
        });

        if (!becameVisible) return;
        if (isManual && !isManualTargetActive(target)) return;
        if (skipPreviouslyDispatchedPageScope(target)) return;

        if (dispatchViewEvent(target)) {
          markPageScopeDispatched(target);
          target.setAttribute(dispatchedAttribute, 'true');
        }

        stopObserving(target);
      });

      observedElements.set(target, observer);
      observer.observe(target);
    }

    function scanTarget(target) {
      if (!target || !target.matches || !target.matches(selector)) return;

      var isManual = target.getAttribute(triggerAttribute) === 'manual';

      if (isManual) {
        if (
          target.getAttribute('data-standard-view-event') !== 'cart' &&
          isManualTargetActive(target)
        ) {
          observeTarget(target, true, false);
        }
        return;
      }

      observeTarget(target, false, false);
    }

    function scan(root) {
      if (!root || root.nodeType !== Node.ELEMENT_NODE) return;

      scanTarget(root);
      root.querySelectorAll(selector).forEach(scanTarget);
    }

    function activate(container) {
      if (!container || !container.isConnected) return false;

      var activated = false;

      if (container.matches(manualSelector)) {
        if (container.getAttribute('data-standard-view-event') === 'cart') {
          activated = (isManualTargetActive(container) && dispatchViewEvent(container, 'cart')) || activated;
        } else {
          observeTarget(container, true, true);
          activated = true;
        }
      }

      container.querySelectorAll(manualSelector).forEach(function (target) {
        if (target.getAttribute('data-standard-view-event') === 'cart') return;

        observeTarget(target, true, true);
        activated = true;
      });

      return activated;
    }

    function parseStandardPayload(element, attributeName) {
      if (!element || !element.getAttribute) return null;

      var value = element.getAttribute(attributeName);
      if (!value) return null;

      try {
        return JSON.parse(value);
      } catch (error) {
        console.warn('Invalid standard storefront product select payload', {
          attribute: attributeName,
          error: error
        });
        return null;
      }
    }

    function getSelectedSource(source) {
      if (!source) return null;

      if (source.tagName === 'SELECT') {
        return source.options[source.selectedIndex] || source;
      }

      return source;
    }

    function getProductSelectContainer(source) {
      return source && source.closest ?
        source.closest('[data-standard-product-select-product]') :
        null;
    }

    function getProductSelectProduct(source) {
      var selectedSource = getSelectedSource(source);
      var container = getProductSelectContainer(source);

      return parseStandardPayload(selectedSource, 'data-standard-product-select-product') ||
        parseStandardPayload(source, 'data-standard-product-select-product') ||
        parseStandardPayload(container, 'data-standard-product-select-product');
    }

    function getExactVariantPayload(source) {
      var selectedSource = getSelectedSource(source);

      return parseStandardPayload(selectedSource, 'data-standard-product-select-variant') ||
        parseStandardPayload(source, 'data-standard-product-select-variant');
    }

    function getSelectedOptionsFromContainer(container) {
      if (!container || !container.querySelectorAll) return [];

      var selectedOptions = [];

      container.querySelectorAll('select[data-standard-option-name]').forEach(function (select) {
        selectedOptions.push({
          name: select.getAttribute('data-standard-option-name'),
          value: select.value
        });
      });

      container.querySelectorAll('input[data-standard-option-name]:checked').forEach(function (input) {
        selectedOptions.push({
          name: input.getAttribute('data-standard-option-name'),
          value: input.value
        });
      });

      return selectedOptions.filter(function (option) {
        return option.name && option.value !== null && option.value !== undefined;
      });
    }

    function getProductSelectOptions(source) {
      var exactVariant = getExactVariantPayload(source);
      if (exactVariant && Array.isArray(exactVariant.selectedOptions)) {
        return exactVariant.selectedOptions;
      }

      var selection = source && source.closest ? source.closest('.f8pr-variant-selection') : null;
      return getSelectedOptionsFromContainer(selection);
    }

    function getSelectedVariantControl(root) {
      if (!root || !root.querySelector) return null;

      var select = root.querySelector('select[name="variant-id"]');
      if (select && select.options && select.selectedIndex >= 0) {
        return select.options[select.selectedIndex];
      }

      return root.querySelector('input[name="variant-id"]:checked');
    }

    function getResolvedVariantPayload(root) {
      if (!root) return null;

      var rootVariant = getExactVariantPayload(root);
      if (rootVariant) return rootVariant;

      var selection = root.matches && root.matches('.f8pr-variant-selection') ?
        root :
        root.querySelector && root.querySelector('.f8pr-variant-selection');

      // The Section Rendering API response is authoritative. Its selected
      // variant remains available even when product.variants is capped at 250.
      // A present attribute containing `null` represents a valid unmatched
      // option combination and must not fall back to a stale selected control.
      if (selection && selection.hasAttribute('data-standard-product-select-variant')) {
        return parseStandardPayload(selection, 'data-standard-product-select-variant');
      }

      var exactControl = getSelectedVariantControl(root);
      return getExactVariantPayload(exactControl);
    }

    function getProductSelectTarget(source, targetSource) {
      var preferredSource = targetSource && targetSource.isConnected ? targetSource : source;
      if (!preferredSource || !preferredSource.closest) return null;

      return preferredSource.closest('form, .m6pr, #sticky-add-to-cart, .product-card') ||
        getProductSelectContainer(source);
    }

    function beginProductSelect(source, targetSource, overrides) {
      if (!source || !source.isConnected) return null;

      overrides = overrides || {};

      var product = overrides.product || getProductSelectProduct(source);
      var selectedOptions = overrides.selectedOptions || getProductSelectOptions(source);
      var target = overrides.target && overrides.target.isConnected ?
        overrides.target :
        getProductSelectTarget(source, targetSource);

      if (!product || !selectedOptions.length || !target || !target.isConnected) return null;

      var deferred;
      var settled = false;

      try {
        deferred = StandardEvents.ProductSelectEvent.createPromise();
        if (deferred.promise && typeof deferred.promise.catch === 'function') {
          deferred.promise.catch(function () {});
        }
        target.dispatchEvent(new StandardEvents.ProductSelectEvent({
          selectedOptions: selectedOptions,
          product: product,
          promise: deferred.promise
        }));
      } catch (error) {
        if (deferred && deferred.promise && typeof deferred.promise.catch === 'function') {
          deferred.promise.catch(function () {});
        }
        if (deferred && typeof deferred.reject === 'function') {
          deferred.reject(error);
        }
        console.warn('Standard storefront product select event dispatch failed', error);
        return null;
      }

      return {
        reject: function (error) {
          if (settled) return false;
          settled = true;
          deferred.reject(error instanceof Error ? error : new Error(String(error)));
          return true;
        },
        resolve: function (variant) {
          if (settled) return false;
          settled = true;
          deferred.resolve({ variant: variant || null });
          return true;
        },
        resolveFrom: function (root, fallbackRoot) {
          var variant = getResolvedVariantPayload(root);

          if (!variant && fallbackRoot) {
            variant = getResolvedVariantPayload(fallbackRoot);
          }

          return this.resolve(variant);
        }
      };
    }

    xtraTheme.beginStandardProductSelect = beginProductSelect;

    function beginCartMutation(type, target, payload) {
      var eventClassMap = {
        lines: StandardEvents.CartLinesUpdateEvent,
        attributes: StandardEvents.CartAttributesUpdateEvent,
        note: StandardEvents.CartNoteUpdateEvent,
        discount: StandardEvents.CartDiscountUpdateEvent
      };
      var EventClass = eventClassMap[type];
      var eventTarget = target && target.isConnected ? target : document;

      if (!EventClass || typeof EventClass.createPromise !== 'function') return null;

      var deferred;
      var settled = false;

      try {
        deferred = EventClass.createPromise();
        if (deferred.promise && typeof deferred.promise.catch === 'function') {
          deferred.promise.catch(function () {});
        }

        var eventPayload = Object.assign({}, payload || {}, {
          promise: deferred.promise
        });
        eventTarget.dispatchEvent(new EventClass(eventPayload));
      } catch (error) {
        if (deferred && typeof deferred.reject === 'function') deferred.reject(error);
        console.warn('Standard storefront cart event dispatch failed', error);
        return null;
      }

      return {
        reject: function (error, code, emitError) {
          if (settled) return false;
          settled = true;

          var normalizedError = error instanceof Error ? error : new Error(String(error));
          if (emitError !== false) {
            try {
              var cartErrorTarget = eventTarget && eventTarget.isConnected ?
                eventTarget :
                document.getElementById('cart') ||
                  document.querySelector('.form-cart') ||
                  document;
              cartErrorTarget.dispatchEvent(new StandardEvents.CartErrorEvent({
                error: normalizedError.message,
                code: code || 'INVALID'
              }));
            } catch (dispatchError) {
              console.warn('Standard storefront cart error event dispatch failed', dispatchError);
            }
          }

          deferred.reject(normalizedError);
          return true;
        },
        resolveFromAjaxCart: function (ajaxCart, result) {
          if (settled) return false;

          var converter = typeof EventClass.createCartFromAjaxResponse === 'function' ?
            EventClass.createCartFromAjaxResponse :
            StandardEvents.CartLinesUpdateEvent.createCartFromAjaxResponse;
          var convertedCart;
          var resolution = result && typeof result === 'object' ? Object.assign({}, result) : {};

          try {
            convertedCart = converter(ajaxCart);
          } catch (error) {
            return this.reject(error, 'INVALID', false);
          }

          resolution.cart = convertedCart;
          settled = true;
          deferred.resolve(resolution);
          return true;
        }
      };
    }

    xtraTheme.beginStandardCartMutation = beginCartMutation;

    function getStandardSortKey(type, rawSortKey) {
      if (!rawSortKey) return null;

      var normalized = String(rawSortKey).toLowerCase();
      if (normalized === 'price-ascending' || normalized === 'price-descending') return 'PRICE';
      if (normalized === 'relevance') return 'RELEVANCE';

      if (type === 'collection') {
        if (normalized === 'collection-default') return 'COLLECTION_DEFAULT';
        if (normalized === 'manual') return 'MANUAL';
        if (normalized === 'best-selling') return 'BEST_SELLING';
        if (normalized === 'title-ascending' || normalized === 'title-descending') return 'TITLE';
        if (normalized === 'created-ascending' || normalized === 'created-descending') return 'CREATED';
      }

      return null;
    }

    function beginResultsUpdate(target, urlSearchParams) {
      if (!target || !target.isConnected || !urlSearchParams) return null;

      var type = target.getAttribute('data-standard-update-type');
      var EventClass = type === 'collection' ?
        StandardEvents.CollectionUpdateEvent :
        type === 'search' ? StandardEvents.SearchUpdateEvent : null;

      if (!EventClass || typeof EventClass.createPromise !== 'function') return null;

      var deferred;
      var settled = false;

      try {
        deferred = EventClass.createPromise();
        if (deferred.promise && typeof deferred.promise.catch === 'function') {
          deferred.promise.catch(function () {});
        }

        var productFilters = EventClass.parseProductFilters(new URLSearchParams(urlSearchParams.toString()));
        var sortKey = getStandardSortKey(type, urlSearchParams.get('sort_by'));
        var payload = { promise: deferred.promise };

        if (type === 'collection') {
          var collectionId = target.getAttribute('data-standard-collection-id');
          var currentProductsCount = parseInt(target.getAttribute('data-standard-results-count'), 10);
          payload.collection = {
            id: collectionId || null,
            handle: target.getAttribute('data-standard-collection-handle') || '',
            productsCount: Number.isFinite(currentProductsCount) ? currentProductsCount : 0
          };
          if (productFilters && productFilters.length) payload.productFilters = productFilters;
          if (sortKey) payload.sortKey = sortKey;
        } else {
          payload.search = {
            query: urlSearchParams.get('q') || target.getAttribute('data-standard-search-query') || ''
          };
          if (productFilters && productFilters.length) payload.search.productFilters = productFilters;
          if (sortKey) payload.search.sortKey = sortKey;
        }

        target.dispatchEvent(new EventClass(payload));
      } catch (error) {
        if (deferred && typeof deferred.reject === 'function') deferred.reject(error);
        console.warn('Standard storefront results update event dispatch failed', error);
        return null;
      }

      return {
        reject: function (error) {
          if (settled) return false;
          settled = true;
          deferred.reject(error instanceof Error ? error : new Error(String(error)));
          return true;
        },
        resolve: function (count) {
          if (settled) return false;
          settled = true;
          var normalizedCount = Number.isFinite(Number(count)) ? Number(count) : 0;
          deferred.resolve(type === 'collection' ?
            { productsCount: normalizedCount } :
            { totalCount: normalizedCount });
          return true;
        }
      };
    }

    xtraTheme.beginStandardResultsUpdate = beginResultsUpdate;

    function dispatchInitialSearchUpdate() {
      if (xtraTheme.standardInitialSearchUpdateDispatched) return;

      var target = document.querySelector(
        '.collection-wrapper[data-standard-update-type="search"][data-standard-search-performed="true"]'
      );
      if (!target) return;

      var resultsCount = parseInt(target.getAttribute('data-standard-results-count'), 10);
      if (!Number.isFinite(resultsCount)) return;

      var standardSearchUpdate = beginResultsUpdate(
        target,
        new URLSearchParams(window.location.search)
      );
      if (!standardSearchUpdate) return;

      xtraTheme.standardInitialSearchUpdateDispatched = true;
      standardSearchUpdate.resolve(resultsCount);
    }

    standardEventsDomReady.then(dispatchInitialSearchUpdate);

    xtraTheme.standardViewEvents = {
      activate: activate,
      dispatch: dispatchViewEvent,
      scan: scan
    };

    scan(document.documentElement);

    var mutationObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          scan(node);
        });
      });
    });

    mutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    if (typeof xtraTheme.resolveStandardEvents === 'function') {
      xtraTheme.resolveStandardEvents(StandardEvents);
    }

    var dispatchPageView = function () {
      if (xtraTheme.standardPageViewDispatched || !StandardEvents.PageViewEvent) return;

      try {
        document.dispatchEvent(
          new StandardEvents.PageViewEvent({
            page: {
              template: xtraTheme.standardEventsTemplate || '',
              title: document.title,
              url: window.location.href
            }
          })
        );
        xtraTheme.standardPageViewDispatched = true;
      } catch (error) {
        console.warn('Standard storefront page view event dispatch failed', error);
      }
    };

    standardEventsDomReady.then(dispatchPageView);
  } catch (error) {
    if (typeof xtraTheme.rejectStandardEvents === 'function') {
      xtraTheme.rejectStandardEvents(error);
    }
    console.warn('Standard storefront events failed to load', error);
  }
})();
