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

	function relocateBackground(scope) {
		const background = findBackground(scope);
		if (!background || !root) return;

		let previous = null;
		for (const child of root.children) {
			if (child.id === 'background' && child.classList.contains('done')) {
				previous = child;
				break;
			}
		}
		if (previous && previous !== background) previous.remove();

		if (background.parentNode !== root) root.appendChild(background);
		background.classList.add('done');
	}

	function updatePasswordState(link, input) {
		if (!link || !input || !link.parentElement) return;
		link.parentElement.classList.toggle('not-empty', input.value !== '');
	}

	function bindPasswordToggles(scope) {
		const holder = scope && scope.querySelectorAll ? scope : document;
		const links = holder.querySelectorAll('a.show');

		for (const link of links) {
			if (link.getAttribute('data-plugin-password-bound') === '1') continue;

			const label = link.parentElement;
			const input = label ? label.nextElementSibling : null;
			if (!label || !input || input.tagName !== 'INPUT') continue;

			link.setAttribute('data-plugin-password-bound', '1');
			label.classList.add('has-show');
			updatePasswordState(link, input);

			input.addEventListener('input', function () {
				updatePasswordState(link, input);
			});

			link.addEventListener('click', function (event) {
				event.preventDefault();
				link.classList.toggle('show-toggle');

				for (const child of link.children) {
					child.classList.toggle('hidden');
				}

				input.type = input.type === 'password' ? 'text' : 'password';
			});
		}
	}

	function countAlerts(container) {
		const hiddenItems = container.querySelectorAll('li.hidden').length;
		container.classList.toggle('all-hidden', container.children.length === hiddenItems);
	}

	function hideAlert(container, item) {
		if (!container || !item || item.classList.contains('hidden')) return;
		item.classList.add('fade-me-out');
		window.setTimeout(function () {
			item.classList.add('hidden');
			countAlerts(container);
		}, 400);
	}

	function bindAlertItem(container, item) {
		if (!item || item.getAttribute('data-plugin-password-alert-bound') === '1') return;
		item.setAttribute('data-plugin-password-alert-bound', '1');

		const close = item.querySelector('a.close');
		if (close) {
			close.addEventListener('click', function (event) {
				event.preventDefault();
				hideAlert(container, item);
			});
		}

		window.setTimeout(function () {
			hideAlert(container, item);
		}, 5000);
	}

	function showAlert(event) {
		if (!event || !event.detail || !event.detail.message) return;
		loadSupportAssets();

		const detail = event.detail;
		const typeMap = {
			success: ['lime', window.translations && window.translations.general_alerts_success_text ? window.translations.general_alerts_success_text : 'Success'],
			info: ['pine', window.translations && window.translations.general_alerts_info_text ? window.translations.general_alerts_info_text : 'Info'],
			error: ['rose', window.translations && window.translations.general_alerts_error_text ? window.translations.general_alerts_error_text : 'Error']
		};
		const type = typeMap[detail.type] ? detail.type : 'success';
		const color = typeMap[type][0];
		const header = detail.header || typeMap[type][1];
		const originClass = detail.origin ? `message-${detail.origin}` : '';

		let container = document.querySelector('.l4al:not(.inline):not(.l4al-trustbadge)');
		if (!container) {
			container = document.createElement('ul');
			container.classList.add('l4al', 'fixed');
			root.appendChild(container);
		}

		if (originClass && container.getElementsByClassName(originClass).length) return;

		const template = document.createElement('template');
		template.innerHTML = `<li class="overlay-${color} ${originClass}"><i aria-hidden="true" class="icon-${type}"></i><p class="strong">${header}</p><p>${detail.message}</p><a href="#" class="close">Close</a></li>`;
		const item = template.content.firstElementChild;
		if (!item) return;

		container.appendChild(item);
		countAlerts(container);
		bindAlertItem(container, item);
	}

	function init(scope) {
		setDeviceClass();
		relocateBackground(scope);
		bindPasswordToggles(scope);
	}

	window.addEventListener('showAlert', showAlert, false);
	bindSupportAssets();
	init(document);

	document.addEventListener('shopify:section:load', function (event) {
		const detail = event.detail || {};
		const sectionId = detail.sectionId || '';
		const section = event.target;

		if (!sectionId.endsWith('main-password') && (!section || !section.querySelector || !section.querySelector('#background, a.show'))) return;
		init(section);
	});
})();
