(function () {
	var openCartConfigured = false;
	var updateCartConfigured = false;
	var cartFallbackStarted = false;
	var cartRefreshFallbackStarted = false;
	var cartUrl = '/cart';
	var updateCartSource = 'xtra-standard-action';

	function applyConfig(config) {
		if (config && typeof config.cartUrl === 'string' && config.cartUrl) {
			cartUrl = config.cartUrl;
		} else {
			cartUrl = '/cart';
		}

		if (config && typeof config.updateCartSource === 'string' && config.updateCartSource) {
			updateCartSource = config.updateCartSource;
		} else {
			updateCartSource = 'xtra-standard-action';
		}
	}

	function navigateToCartOnce() {
		if (cartFallbackStarted) return;
		cartFallbackStarted = true;

		try {
			window.location.assign(cartUrl);
		} catch (error) {
			window.location.href = cartUrl;
		}
	}

	function reloadPageOnce() {
		if (cartRefreshFallbackStarted) return;
		cartRefreshFallbackStarted = true;

		try {
			window.location.reload();
		} catch (error) {
			window.location.assign(window.location.href);
		}
	}

	function getProductAddEventTarget() {
		var activeElement = document.activeElement;
		var activeProductForm = null;

		if (activeElement && typeof activeElement.closest === 'function') {
			activeProductForm = activeElement.closest('form.f8pr');
		}

		if (
			activeProductForm &&
			activeProductForm.querySelector('input[name="id"], select[name="id"]')
		) {
			return activeProductForm;
		}

		if (document.body && document.body.classList.contains('template-product')) {
			return document.querySelector('form[id^="main-product-form-"].f8pr');
		}

		return null;
	}

	function getCartEventTarget(meta) {
		if (
			meta &&
			meta.type === 'shopify:cart:lines-update' &&
			meta.action === 'add'
		) {
			var productAddTarget = getProductAddEventTarget();
			if (productAddTarget) return productAddTarget;
		}

		var cartPageContent = document.querySelector('.form-cart, .cart-empty');
		var cartPageSection = cartPageContent
			? cartPageContent.closest('[id^="shopify-section-"]')
			: null;

		if (
			document.body &&
			document.body.classList.contains('template-cart') &&
			cartPageSection
		) {
			return cartPageSection;
		}

		return document.getElementById('cart') || cartPageSection || document.documentElement;
	}

	function addUpdateCartSource(result) {
		if (!result || typeof result !== 'object') return result;

		return Object.assign({}, result, {
			detail: Object.assign({}, result.detail || {}, {
				source: updateCartSource
			})
		});
	}

	async function getCartRuntime() {
		if (
			!window.XtraTheme ||
			typeof window.XtraTheme.ensureCustomAsyncRuntime !== 'function'
		) {
			throw new Error('Xtra cart runtime loader is unavailable.');
		}

		return window.XtraTheme.ensureCustomAsyncRuntime();
	}

	function configureOpenCart() {
		if (openCartConfigured) return;

		if (
			!window.Shopify ||
			!window.Shopify.actions ||
			!window.Shopify.actions.openCart ||
			typeof window.Shopify.actions.openCart.configure !== 'function'
		) {
			return;
		}

		try {
			window.Shopify.actions.openCart.configure({
				handler: async function () {
					try {
						var cart = await getCartRuntime();

						if (!cart || typeof cart.open !== 'function') {
							navigateToCartOnce();
							return;
						}

						var opened = await cart.open({ fallbackUrl: cartUrl, redirect: false });

						if (!opened) {
							navigateToCartOnce();
						}
					} catch (error) {
						console.warn('Shopify.actions.openCart failed', error);
						navigateToCartOnce();
					}
				}
			});
			openCartConfigured = true;
		} catch (error) {
			console.warn('Shopify.actions.openCart configuration failed', error);
		}
	}

	function configureUpdateCart() {
		if (updateCartConfigured) return;

		if (
			!window.Shopify ||
			!window.Shopify.actions ||
			!window.Shopify.actions.updateCart ||
			typeof window.Shopify.actions.updateCart.configure !== 'function'
		) {
			return;
		}

		try {
			window.Shopify.actions.updateCart.configure({
				eventTarget: getCartEventTarget,
				handler: async function (defaultHandler, payload, options) {
					var result = await defaultHandler();

					if (result && result.userErrors && result.userErrors.length) {
						return result;
					}

					try {
						var cart = await getCartRuntime();

						if (!cart || typeof cart.refresh !== 'function') {
							throw new Error('Xtra cart refresh adapter is unavailable.');
						}

						var refreshed = await cart.refresh();

						if (!refreshed) {
							throw new Error('Xtra cart UI refresh did not complete.');
						}

						return addUpdateCartSource(result);
					} catch (error) {
						console.warn('Shopify.actions.updateCart UI refresh failed', error);
						reloadPageOnce();
						return result;
					}
				}
			});
			updateCartConfigured = true;
		} catch (error) {
			console.warn('Shopify.actions.updateCart configuration failed', error);
		}
	}

	function configureStandardActions(config) {
		applyConfig(config);
		configureOpenCart();
		configureUpdateCart();
	}

	window.XtraStandardStorefrontActions = {
		configure: configureStandardActions
	};
})();
