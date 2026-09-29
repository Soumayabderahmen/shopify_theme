"use strict";

(function () {
	const html = document.documentElement;
	const root = document.getElementById('root') || document.body;
	const supportEvents = ['mousemove', 'keyup', 'touchstart', 'pointerdown', 'scroll'];
	let supportAssetsLoaded = false;

	function filepath(key, fallback) {
		if (window.filepaths && window.filepaths[key]) return window.filepaths[key];
		return fallback;
	}

	function addStylesheet(id, href) {
		if (!href || document.getElementById(id)) return;

		const link = document.createElement('link');
		link.id = id;
		link.rel = 'stylesheet';
		link.href = href;
		link.media = 'screen';
		document.head.appendChild(link);
	}

	function addScript(id, src) {
		if (!src || document.getElementById(id)) return;

		const script = document.createElement('script');
		script.id = id;
		script.src = src;
		script.async = true;
		document.head.appendChild(script);
	}

	function removeSupportListeners() {
		for (const eventName of supportEvents) {
			const target = eventName === 'mousemove' ? window : document;
			target.removeEventListener(eventName, loadSupportAssets);
		}
	}

	function loadSupportAssets() {
		if (supportAssetsLoaded) return;
		supportAssetsLoaded = true;
		removeSupportListeners();

		addStylesheet('async-css', filepath('async_css', 'styles/async.css'));
		addStylesheet('hovers-css', filepath('async_hovers_css', 'styles/async-hovers.css'));

		const isFakeNoHover = navigator.maxTouchPoints > 0 && window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(hover: hover)').matches;
		if (isFakeNoHover) {
			addStylesheet('hovers-hack-css', filepath('async_hovers_hack_css', 'styles/async-hovers-hack.css'));
		}

		addScript('outline-js', filepath('plugin_outline_js', 'js/plugin-outline.js'));
	}

	function bindSupportAssets() {
		for (const eventName of supportEvents) {
			const target = eventName === 'mousemove' ? window : document;
			const options = eventName === 'touchstart' || eventName === 'pointerdown' || eventName === 'scroll' ? { passive: true } : false;
			target.addEventListener(eventName, loadSupportAssets, options);
		}
	}

	function setDeviceClass() {
		const isMobile = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
		html.classList.remove(isMobile ? 'no-mobile' : 'mobile');
		html.classList.add(isMobile ? 'mobile' : 'no-mobile');
	}

	function findBackground(scope) {
		if (scope && scope.querySelector) {
			const scopedBackground = scope.querySelector('#background');
			if (scopedBackground) return scopedBackground;
		}

		return document.querySelector('#content #background, #content .shopify-section #background, .shopify-section #background:not(.done)');
	}

	function updateBackground(scope, sectionReload) {
		const background = findBackground(scope);
		let previous = null;
		if (root) {
			for (const child of root.children) {
				if (child.id === 'background' && child.classList.contains('done')) {
					previous = child;
					break;
				}
			}
		}

		if (background && root) {
			if (previous && previous !== background) previous.remove();
			if (background.parentNode !== root) root.appendChild(background);
			background.classList.add('done');
			html.classList.add('t1as');
			html.classList.remove('t1pl');
			return;
		}

		if (sectionReload && previous) previous.remove();
		html.classList.remove('t1as');
		html.classList.add('t1pl');
	}

	function initQrCodes(scope) {
		if (typeof window.QRCode !== 'function') return;

		const holder = scope && scope.querySelectorAll ? scope : document;
		const qrCodes = holder.querySelectorAll('.giftcard-qr[data-identifier]');
		const strings = window.giftCardStrings || {};

		for (const qrCode of qrCodes) {
			if (qrCode.getAttribute('data-plugin-giftcard-qr') === '1') continue;

			try {
				new window.QRCode(qrCode, {
					text: qrCode.dataset.identifier,
					width: 120,
					height: 120,
					imageAltText: strings.qrImageAlt || ''
				});
				qrCode.setAttribute('data-plugin-giftcard-qr', '1');
			} catch (error) {}
		}
	}

	function copyFallback(value) {
		return new Promise(function (resolve, reject) {
			const textarea = document.createElement('textarea');
			textarea.value = value;
			textarea.setAttribute('readonly', '');
			textarea.style.position = 'fixed';
			textarea.style.opacity = '0';
			document.body.appendChild(textarea);
			textarea.select();

			try {
				const copied = document.execCommand('copy');
				textarea.remove();
				if (copied) resolve();
				else reject(new Error('Copy command failed.'));
			} catch (error) {
				textarea.remove();
				reject(error);
			}
		});
	}

	function copyText(value) {
		if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
			return navigator.clipboard.writeText(value).catch(function () {
				return copyFallback(value);
			});
		}
		return copyFallback(value);
	}

	function bindCopyLinks(scope) {
		const holder = scope && scope.querySelectorAll ? scope : document;
		const links = holder.querySelectorAll('a[data-copy]');

		for (const link of links) {
			if (link.getAttribute('data-plugin-giftcard-copy-bound') === '1') continue;
			link.setAttribute('data-plugin-giftcard-copy-bound', '1');

			link.addEventListener('click', function (event) {
				event.preventDefault();
				copyText(link.dataset.copy || '').catch(function () {});
				link.classList.add('clicked');
				window.setTimeout(function () {
					link.classList.remove('clicked');
				}, 2000);
			});
		}
	}

	function bindPrintLinks(scope) {
		const holder = scope && scope.querySelectorAll ? scope : document;
		const links = holder.querySelectorAll('.link-print');

		for (const link of links) {
			if (link.getAttribute('data-plugin-giftcard-print-bound') === '1') continue;
			link.setAttribute('data-plugin-giftcard-print-bound', '1');

			link.addEventListener('click', function (event) {
				event.preventDefault();
				window.print();
			});
		}
	}

	function init(scope, sectionReload) {
		setDeviceClass();
		updateBackground(scope, sectionReload);
		initQrCodes(scope);
		bindCopyLinks(scope);
		bindPrintLinks(scope);
	}

	bindSupportAssets();
	init(document, false);

	window.addEventListener('load', function () {
		initQrCodes(document);
	}, { once: true });

	document.addEventListener('shopify:section:load', function (event) {
		const detail = event.detail || {};
		const sectionId = detail.sectionId || '';
		const section = event.target;

		if (!sectionId.endsWith('main-giftcard') && (!section || !section.querySelector || !section.querySelector('.giftcard-qr, #background'))) return;
		init(section, true);
	});
})();
