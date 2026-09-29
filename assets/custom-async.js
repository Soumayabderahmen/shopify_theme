"use strict";


/*! Global scope initializations -------------------------------------------------- */
const mediaMax760 = window.matchMedia('(max-width: 760px)');
const mediaMin760 = window.matchMedia('(min-width: 761px)');
const mediaTablet = window.matchMedia('(min-width: 761px) and (max-width: 1000px)');

let search_input = search_id ? search_id.getElementsByTagName('input') : null;
let footer_id = document.querySelector('.shopify-section-footer');
let nav_user_id = document.getElementById('nav-user');
let root_id = document.getElementById('root');
let all_list_drop = document.querySelectorAll('.l4dr');

function getViewportHeight() {
	return window.innerHeight || document.documentElement.clientHeight || 0;
}

function getNavBottom() {
	return nav_main ? nav_main.getBoundingClientRect().bottom : 0;
}

let headerOuterHeight = 0;

function setHeaderOuterHeight() {
	if (!header_outer) return 0;

	const height = Math.max(0, Math.round(header_outer.offsetHeight));

	if (height !== headerOuterHeight) {
		headerOuterHeight = height;
		html_tag.style.setProperty('--header_outer_height', height + 'px');
	}

	return headerOuterHeight;
}

function getShopifyRouteRoot() {
	if (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) {
		return window.Shopify.routes.root;
	}
	return '/';
}

function getRouteUrl(key, fallbackPath) {
	if (typeof routes !== 'undefined' && routes && routes[key]) {
		return routes[key];
	}
	return fallbackPath ? getShopifyRouteRoot() + fallbackPath : '';
}

const css_filters = fp('styles/async-filters.css', 'async_filters_css');
const css_product = fp('styles/page-product.css', 'async_product_css');
const css_search = fp('styles/async-search.css', 'async_search_css');
const js_selects = fp('js/plugin-selects.js', 'plugin_selects_js');




/*! Environment & feature detection -------------------------------------------------- */

// Sets default language and "Read more" text, using Shopify translation if available, otherwise falling back to global settings.
let global_lang = 'en';
let readMoreText = '{{ "general.read_more.read_more" | t }}';

if (isNotShopify()) {
	readMoreText = 'Read more';
	global_lang = html_tag.getAttribute('lang') || global_lang;
} else {
	global_lang = (typeof general !== 'undefined' && general.language) ? general.language : 'en';
}




/*! Helper Functions -------------------------------------------------- */

// Wraps the given element in a new wrapper element, optionally adding a class to the wrapper.
function wrap(el, wrapper, className) {
	el.parentNode.insertBefore(wrapper, el);
	if (className) {
		wrapper.classList.add(className);
	}
	wrapper.appendChild(el);
}


// Closes a dropdown by removing active classes and resetting ARIA attributes; returns true if a toggle was closed.
function close_dropdown(el) {
	html_tag.classList.remove('user-form-active');

	if (el.classList.contains('toggle') && !el.classList.contains('mtoggle')) {
		el.classList.remove('toggle');
		el.setAttribute('aria-expanded', 'false');
		return true;
	}
	return false;
}


// Toggles a dropdown element by adding/removing the 'toggle' class.
function toggle_dropdowns_simple(el) {
	if (el.classList.contains('toggle')) {
		el.classList.remove('toggle');
	} else {
		el.classList.add('toggle');
	}
}


// Toggles a dropdown menu: closes other open dropdowns in the same scope, updates aria-expanded, adds/removes toggle class, manages user-form-active state on <html>, and adjusts nav-hover for horizontal navigation if needed.
function toggle_dropdowns(el, selector) {
	asyncCSS();
	html_tag.classList.remove('user-form-active');

	const parent = el.parentElement;

	const closeAll = () => {
		if (!selector) return;
		document.querySelectorAll(`${selector} li.toggle`).forEach(item => {
			item.classList.remove('toggle');
			item.setAttribute('aria-expanded', 'false');
		});
	};

	if (parent.classList.contains('toggle')) {
		parent.classList.remove('toggle');
		parent.setAttribute('aria-expanded', 'false');

		if (parent.classList.contains('has-form')) {
			html_tag.classList.remove('user-form-active');
		}

		closeAll();
		return;
	}

	closeAll();

	if (parent.classList.contains('has-form') && !parent.classList.contains('currency') && !parent.classList.contains('lang')) {
		setTimeout(() => html_tag.classList.add('user-form-active'), 0);
	}

	const ul = el.closest('ul');
	if (ul) {
		ul.querySelectorAll('li').forEach(li => li.classList.remove('toggle'));
	}

	parent.classList.add('toggle');
	parent.setAttribute('aria-expanded', 'true');
	parent.focus();

	const horUL = el.closest('[data-type="horizontal-nav"]');
	if (horUL && nav_main) {
		const hasSubToggle = nav_main.querySelectorAll('[data-type="horizontal-nav"] > li.sub.toggle, [data-type="main-nav"] > li.sub.toggle').length > 0;
		html_tag.classList.toggle('nav-hover', hasSubToggle);
	}
}


// Sets or removes tabindex on all interactive child elements to manage keyboard focus, with helpers for disabling (-1)
function setTabindex(el, value) {
	for (const childEl of el.querySelectorAll('a, input, button, select, textarea, [role="button"]')) {
		if (value === null) childEl.removeAttribute('tabindex');
		else childEl.setAttribute('tabindex', value);
	}
}

const negTabIn = el => setTabindex(el, -1);
const posTabIn = el => setTabindex(el, null);


// Remove element
function removeNode(el) {
	if (el && el.parentNode) el.parentNode.removeChild(el);
}


// Removes 'm2a' (mobile menu active) class immediately and 'm2a-delay' class after 400ms from the <html> element.
function removeM2A() {
	html_tag.classList.remove('m2a');
	setTimeout(() => html_tag.classList.remove('m2a-delay'), 400);
}


// Closes mobile nav by removing classes, updating aria-expanded, and adjusting tabindex for accessibility.
function close_mobile_nav() {
	html_tag.classList.remove('nav-hover');
	removeM2A();

	document.querySelectorAll('a[aria-controls="nav"]').forEach(el =>
		el.setAttribute('aria-expanded', 'false')
	);

	updateNavTabIndexForMobile(false);
}


// Removes toggle class and resets aria-expanded on parent elements of given elements.
function remove_active_submenus(elements) {
	elements.forEach(el => {
		const parent = el.parentElement;
		if (parent && parent.classList.contains('toggle')) {
			parent.classList.remove('toggle');
			parent.setAttribute('aria-expanded', 'false');
		}
	});
}


// Clears all active/toggled states in the mobile navigation by removing toggle, mtoggle, ul-toggle classes and resetting data-type attributes after a short delay.
function clear_mobile_nav() {
	[nav_top_id, nav_user_id, nav_bar_id].forEach(function (nav) {
		if (nav) remove_active_submenus(nav.querySelectorAll('a.toggle'));
	});

	if (!nav_id) return;

	setTimeout(function () {
		nav_id.querySelectorAll('a.toggle').forEach(el => {
			const parent = el.parentElement;
			if (parent && parent.classList.contains('toggle')) {
				parent.classList.remove('toggle');
			}
		});

		if (nav_id.hasAttribute('data-type')) {
			nav_id.removeAttribute('data-type');
		}

		nav_id.querySelectorAll('li.mtoggle').forEach(el => el.classList.remove('mtoggle'));
		nav_id.querySelectorAll('ul.ul-toggle').forEach(el => el.classList.remove('ul-toggle'));
		nav_id.querySelectorAll('.header-before').forEach(el => el.classList.remove('data-title-active'));
	}, 400);
}


// Throttle setting the mega menu max height using requestAnimationFrame, updating --mega_nav_mah CSS variable based on viewport height.
let customMegaRAF = 0;

function customMega() {
	if (!nav_main || mediaMax1000.matches) return;

	if (!customMegaRAF) {
		customMegaRAF = requestAnimationFrame(() => {
			customMegaRAF = 0;
			html_tag.style.setProperty('--mega_nav_mah', `${getViewportHeight() - getNavBottom()}px`);
		});
	}
}

window.addEventListener('resize', throttle(() => {
	customMega();
}, 500));


// Handles hover state for a navigation item: toggles nav-hover class, manages ARIA attributes, updates hover classes for parent and child elements, and sets data-items for submenus based on structure and item count.
function navSubHover(el) {
	const isSub = el.classList.contains('sub');
	html_tag.classList.toggle('nav-hover', isSub);

	const d = el.dataset.mirror;
	const p = el.closest('ul');

	if (isSub) {
		const ulInner = nav_id.querySelector('.ul-inner');

		if (ulInner && ulInner.children.length > 0) {
			for (const child of ulInner.children) {
				child.classList.remove('hover');
				child.setAttribute('aria-expanded', 'false');
				if (child.dataset.mirror === d) {
					child.classList.add('hover');
					child.setAttribute('aria-expanded', 'true');
				}
			}
		}

		for (const child of p.children) {
			const grandParent = child.parentElement && child.parentElement.parentElement;
			if (grandParent) grandParent.classList.add('ul-hover');
			child.classList.remove('hover');
			child.setAttribute('aria-expanded', 'false');
		}

		el.classList.add('hover');

		for (const em of el.children) {
			if (em.tagName.toLowerCase() === 'ul') {
				const elementsArray = Array.from(em.children);
				const parentUl = p.parentElement;

				parentUl.setAttribute('data-items', em.children.length);
				if (em.parentElement.classList.contains('sub-classic') && em.children.length > 5) {
					parentUl.setAttribute('data-items', 1);
				}

				for (const item of elementsArray) {
					if (item.className.includes('has-ul-class')) {
						parentUl.removeAttribute('data-items');
						break;
					}
				}
			}
		}

		el.setAttribute('aria-expanded', 'true');
	} else {
		for (const child of p.children) {
			child.removeAttribute('aria-expanded');
		}
	}
}


// Checks if the text inside a small popup overflows its container and adds/removes the 'longer' class accordingly.
// Checks if the USP content overflows and adds/removes the 'longer' class accordingly.
const smallPopupItems = [];
const smallPopupRegisteredItems = new WeakSet();

let smallPopupRafId = 0;
let smallPopupRecalcRafId = 0;
const smallPopupQueue = new Set();

function getSmallPopupGap(el) {
	const styles = window.getComputedStyle(el);
	let gap = parseFloat(styles.columnGap);

	if (isNaN(gap)) {
		gap = parseFloat(styles.gap);
	}

	return isNaN(gap) ? 0 : gap;
}

function measureSmallPopupContent(inner, outer) {
	const measure = inner.cloneNode(true);
	const display = window.getComputedStyle(inner).display;

	measure.style.position = 'absolute';
	measure.style.visibility = 'hidden';
	measure.style.pointerEvents = 'none';
	measure.style.left = '-9999px';
	measure.style.top = '0';
	measure.style.width = 'max-content';
	measure.style.maxWidth = 'none';
	measure.style.minWidth = '0';
	measure.style.whiteSpace = 'nowrap';
	measure.style.display = display === 'none' ? 'inline-block' : display;

	outer.appendChild(measure);

	const width = measure.getBoundingClientRect().width;

	measure.remove();

	return width;
}

function measureSmallPopupLink(link) {
	const previousStyle = link.getAttribute('style');

	link.style.position = 'absolute';
	link.style.visibility = 'hidden';
	link.style.pointerEvents = 'none';
	link.style.display = 'inline-block';
	link.style.width = 'max-content';
	link.style.maxWidth = 'none';
	link.style.whiteSpace = 'nowrap';

	const width = link.getBoundingClientRect().width;

	if (previousStyle === null) {
		link.removeAttribute('style');
	} else {
		link.setAttribute('style', previousStyle);
	}

	return width;
}

function processSmallPopupQueue() {
	smallPopupRafId = 0;
	if (!smallPopupQueue.size) return;

	const items = Array.from(smallPopupQueue);
	smallPopupQueue.clear();

	for (const el of items) {
		if (!el.isConnected) continue;

		const outer = el.querySelector('.outer');
		const inner = el.querySelector('.inner');
		const innerText = el.querySelector('.inner-text');
		const linked = el.querySelector('.linked');

		if (!outer || !inner || !innerText) continue;

		el.classList.remove('longer');

		const outerW = outer.getBoundingClientRect().width;
		const innerW = inner.getBoundingClientRect().width;
		const fullContentW = measureSmallPopupContent(inner, outer);

		let showReadMore = fullContentW - innerW > 4;

		if (showReadMore && linked) {
			const linkW = measureSmallPopupLink(linked);
			const gap = getSmallPopupGap(outer);
			const availableInnerW = outerW - linkW - gap;

			showReadMore = linkW < outerW - 4 && fullContentW - availableInnerW > 4;
		}

		el.classList.toggle('longer', showReadMore);
	}
}

function linkSmallPopup(el) {
	if (!el || !el.isConnected) return;

	smallPopupQueue.add(el);

	if (!smallPopupRafId) {
		smallPopupRafId = requestAnimationFrame(processSmallPopupQueue);
	}
}

function scheduleSmallPopupRecalc() {
	if (smallPopupRecalcRafId) return;

	smallPopupRecalcRafId = requestAnimationFrame(() => {
		smallPopupRecalcRafId = 0;
		recalcAllSmallPopups();
	});
}

function registerSmallPopupItem(el) {
	if (!el || !el.isConnected || smallPopupRegisteredItems.has(el)) return;

	smallPopupRegisteredItems.add(el);
	smallPopupItems.push(el);
	scheduleSmallPopupRecalc();
}

const recalcAllSmallPopups = throttle(() => {
	if (!smallPopupItems.length) return;

	const run = () => {
		smallPopupQueue.clear();
		smallPopupItems.forEach(linkSmallPopup);
	};

	if (typeof runWhenIdle === 'function') {
		runWhenIdle(run);
	} else if ('requestIdleCallback' in window) {
		requestIdleCallback(run);
	} else {
		requestAnimationFrame(run);
	}
}, 500);

window.addEventListener('resize', recalcAllSmallPopups);
window.addEventListener('load', recalcAllSmallPopups, asyncOnce);

if (document.fonts && document.fonts.ready) {
	document.fonts.ready.then(recalcAllSmallPopups);
}

// Finds the last visible child in a container, removes the class from all, and marks it with 'last-visible'.
function lastVis(cont) {
	const items = Array.from(cont.children);
	let lastVisible = null;

	for (const el of items) {
		if (!el.classList.contains('hidden') && !el.classList.contains('has-link-more')) {
			lastVisible = el;
		}
		el.classList.remove('last-visible');
	}

	if (lastVisible) lastVisible.classList.add('last-visible');
}


// Toggle element visibility for screen readers: aria_hide(el) hides, aria_show(el) shows
function aria_hide(el) {
	el.setAttribute('aria-hidden', 'true');
	el.setAttribute('focusable', 'false');
}

function aria_show(el) {
	el.setAttribute('aria-hidden', 'false');
	el.setAttribute('focusable', 'true');
}


// Returns true if the string ends with any of the given suffixes
function endsWithAny(suffixes, string) {
	for (let suffix of suffixes) {
		if (string.endsWith(suffix))
			return true;
	}
	return false;
}


// Toggle 'required' and 'disabled' attributes on inputs and textareas within a container based on addAttribute flag
const changeInputsRequired = function (addAttribute, container) {
	const inputs = container.querySelectorAll('input, textarea');

	for (const el of inputs) {
		if (!addAttribute) {
			el.checked = false;
			el.setAttribute('disabled', 'disabled');

			if (el.hasAttribute('data-required')) {
				el.removeAttribute('required');
			}
		} else {
			el.removeAttribute('disabled');

			if (el.hasAttribute('data-required')) {
				el.setAttribute('required', 'required');
			}
		}
	}
};


// Moves footer elements into the main nav once, cloning .m6cn, .l4sc, and certain user-nav items with images.
let footerIntoNavExecuted = false;

function footerIntoNav() {
	if (footerIntoNavExecuted || !footer_id || !nav_id) return;

	const f_m6cn = footer_id.getElementsByClassName('m6cn');
	const f_l4sc = footer_id.getElementsByClassName('l4sc');

	const appendIfAbsent = (className, sourceElements) => {
		if (!nav_id.getElementsByClassName(className).length && sourceElements.length) {
			nav_id.appendChild(sourceElements[0].cloneNode(true));
		}
	};

	appendIfAbsent('m6cn', f_m6cn);
	appendIfAbsent('l4sc', f_l4sc);

	if (nav_user_id) {
		nav_user_id.querySelectorAll('ul[data-type="user-nav"] > li:not(.cart, .lang, .currency) img:not(.desktop-only)').forEach(el => {
			const cloneMe = el.parentNode.cloneNode(true);
			cloneMe.classList.add('has-img');
			cloneMe.classList.remove('mobile-hide');
			nav_id.appendChild(cloneMe);
		});
	}

	footerIntoNavExecuted = true;
}


// Removes all classes from an element that start with a given prefix and returns the element.
function removeClassByPrefix(node, prefix) {
	for (const cls of Array.from(node.classList)) {
		if (cls.startsWith(prefix)) {
			node.classList.remove(cls);
		}
	}
	return node;
}


// Collects all next sibling elements until a matching selector is found, optionally filtering them by another selector.
const nextUntil = function (elem, selector, filter) {
	const siblings = [];
	let next = elem.nextElementSibling;

	while (next) {
		if (next.matches(selector)) break;
		if (!filter || next.matches(filter)) siblings.push(next);
		next = next.nextElementSibling;
	}

	return siblings;
};


// Collects all previous sibling elements until a matching selector is found, optionally filtering them by another selector.
const prevUntil = function (elem, selector, filter) {
	let prev = elem.previousElementSibling;

	while (prev) {
		if (prev.matches(selector)) return prev;
		if (filter && !prev.matches(filter)) {
			prev = prev.previousElementSibling;
			continue;
		}
		prev = prev.previousElementSibling;
	}

	return null;
};


// Adds the "processed" class to the given element immediately, then removes it after milliseconds (default: 3000).
const setProcessed = (el, ms = 3000) => {
	if (!el) return;

	el.classList.add('processed');

	window.setTimeout(() => {
		el.classList.remove('processed');
	}, ms);
};




/*! Layout utilities -------------------------------------------------- */

// Handles the mobile "burger" navigation toggle: resets nav states, updates ARIA attributes, manages footer/lang/currency integration, triggers mega menu and user/footer adjustments, and sets focus to the first link.
let neq = document.querySelectorAll('a[aria-controls="nav"]');

function nav_burger() {
	if (!nav_id) return;

	html_tag.classList.add('has-nav');

	for (const a of nav_id.querySelectorAll('a.toggle')) {
		if (a.parentElement) a.parentElement.classList.remove('toggle');
	}

	for (const section of [nav_top_id, nav_user_id, nav_bar_id]) {
		if (section) remove_active_submenus(section.querySelectorAll('a.toggle'));
	}

	html_tag.classList.remove('nav-hover');

	if (footer_id) {
		const checkLangCurrency = (footerSelector, topSelector, className) => {
			const footerElement = footer_id.querySelector(footerSelector);
			const topElement = top_id ? top_id.querySelector(topSelector) : null;
			if (!footerElement && topElement) {
				html_tag.classList.add(className);
			}
		};

		checkLangCurrency('li.lang', 'li.lang.mobile-nav-only', 'no-footer-lang');
		checkLangCurrency('li.currency', 'li.currency.mobile-nav-only', 'no-footer-curr');
	}

	if (html_tag.classList.contains('m2a')) {
		close_mobile_nav();
		return;
	}

	requestAnimationFrame(() => {
		html_tag.classList.add('m2a', 'm2a-delay');
		html_tag.classList.remove('search-compact-active', 'search-full', 'tr_hh', 'search-full-mode', 'user-form-active');
		if (search_id) search_id.classList.remove('full', 'has-text');

		for (const el of neq) el.setAttribute('aria-expanded', true);

		updateNavTabIndexForMobile(true);

		if (!navTabIndexListenerAttached) {
			mediaMax1000.addEventListener('change', () => {
				const isMenuOpen = html_tag.classList.contains('m2a');
				updateNavTabIndexForMobile(isMenuOpen);
			}, {
				passive: true
			});
			navTabIndexListenerAttached = true;
		}
	});
	requestAnimationFrame(() => {
		const nestedF = () => {
			customMega();
			//userNavIntoNav();
			footerIntoNav();
		};

		if ('requestIdleCallback' in window) {
			requestIdleCallback(nestedF);
		} else {
			setTimeout(nestedF, 0);
		}

		let firstFocusable = nav_id.querySelector('li:not(.nav-bar-element) > a:not(.toggle)');
		if (!firstFocusable) {
			const allLinks = nav_id.querySelectorAll('a');
			firstFocusable = allLinks.item(1) || null;
		}

		if (firstFocusable && typeof firstFocusable.focus === 'function') {
			firstFocusable.focus();
		}

		asyncCSS();
	});
}


// DROPPED - Mobile NAV - sets up and enhances the main navigation by adding headers, close buttons, nested menus, cloning nav-bar, user, and top sections, and preparing mobile-friendly toggles
/*let userNavIntoNavExecuted = false;

function userNavIntoNav() {
	if (userNavIntoNavExecuted || !nav_id) return;
	
	// Replaced with CSS - Detect if category images are in use
	// const ni = document.querySelectorAll('#nav > ul:first-child > li > a > img, ' + '#nav-bar > ul:first-child > li > a > img, ' + '#nav > ul:first-child > li > a > .img, ' + '#nav-bar > ul:first-child > li > a > .img'); if (ni.length) { ni.forEach(el => { const cl = 'category-img'; const closestNav = el.closest('[id^="nav"]'); const closestUl = el.closest('ul'); if (closestNav) closestNav.classList.add(cl); if (closestUl) closestUl.classList.add(cl); }); }

	// Replaced with HTML - Add close button to nav
	// const closeBtn = document.createElement('a'); closeBtn.classList.add('close', 'close-nav'); closeBtn.href = './'; closeBtn.textContent = 'Close'; nav_id.appendChild(closeBtn);

	// Replaced with HTML - Add submenu header if aria-label exists
	// if (nav_id.hasAttribute('aria-label')) { const header = document.createElement('div'); header.classList.add('header'); header.textContent = nav_id.getAttribute('aria-label'); nav_id.prepend(header); 

	// Replaced with HTML - Add header-before element
	// const headerBefore = document.createElement('div'); headerBefore.classList.add('header-before', 'header'); nav_id.prepend(headerBefore);

	// Replaced with HTML - Create nested desktop nav
	// const ndContainer = nav_id.querySelector('ul[data-type]'); if (ndContainer) { const na = document.createElement('ul'); na.classList.add('inner', 'ul-inner'); Array.from(ndContainer.children).forEach(el => na.appendChild(el.cloneNode(true))); na.addEventListener('mouseleave', () => nav_id.classList.remove('ul-hover')); nav_id.appendChild(na); }
	
	// Replaced with HTML - Clone nav-bar items and add to main nav
	// if (nav_bar_id) { const navItems = Array.from(document.querySelectorAll('#nav-bar > ul > li')).map(el => { const clone = el.cloneNode(true); clone.classList.add('nav-bar-element'); return clone; }); const navButtons = document.querySelectorAll('#header > .link-btn a, #header-inner > .link-btn a'); if (navButtons.length) { const navUl = document.querySelector('#nav > ul'); const navLi = document.createElement('li'); navLi.classList.add('nav-bar-element', 'nav-bar-element-main'); if (!document.querySelector('#nav-bar > ul > li:not(.show-all)')) navLi.classList.add('is-empty'); navLi.innerHTML = `<a href="#" class="toggle-wide"><span>${navButtons[0].textContent}</span> <span class="hidden">alle</span></a> <ul></ul>`; if (navButtons[0].classList.contains('mobile-hide')) navLi.classList.add('mobile-hide'); if (navButtons[0].classList.contains('mobile-text-uppercase')) navLi.classList.add('mobile-text-uppercase'); const ariaLabel = nav_bar_id.getAttribute('aria-label'); if (ariaLabel) navLi.querySelector('span.hidden').textContent = ariaLabel; navUl.prepend(navLi); navItems.forEach(item => navUl.appendChild(item)); } }
	
	// Replaced with HTML - Create a back link for mobile menu
	// const toggleLinks = document.querySelectorAll('#nav > ul > li > a.toggle'); for (const el of toggleLinks) { const clone = el.cloneNode(true); clone.classList.add('toggle-back'); el.parentElement.prepend(clone); }

	// Replaced with HTML - Clone user nav and remove unnecessary elements
	// if (nav_user_id) { const userNav = nav_user_id.querySelector('ul[data-type]'); if (userNav) { const clonedUserNav = userNav.cloneNode(true); clonedUserNav.classList.add('nav-user'); clonedUserNav.querySelectorAll('.currency, .lang').forEach(el => el.remove()); nav_id.appendChild(clonedUserNav); } const loginForm = nav_id.querySelector('.user-login'); if (loginForm) loginForm.remove(); }
	
	// Replaced with HTML - Clone nav-top for mobile menu
	// if (nav_top_id && !nav_id.querySelector('ul.nav-top')) { const navTop = nav_top_id.querySelector('ul[data-type]'); if (navTop) { const cloneTop = navTop.cloneNode(true); cloneTop.classList.add('nav-top'); nav_id.appendChild(cloneTop); nav_id.querySelectorAll('.currency .localization-form a').forEach(el => el.classList.remove('listening')); window.dispatchEvent(localizationFormEvt); } }
	
	userNavIntoNavExecuted = true;
}*/


// Dynamically sets CSS variables for sticky navigation heights on scroll, mousemove, and resize, avoiding repeated execution.
let isCustomStickyNavExecuted = false;
let scheduledStickyNav = false;

function customStickyNav() {
	if (mediaMax1000.matches) {
		return;
	}
	if (scheduledStickyNav || isCustomStickyNavExecuted) return;

	scheduledStickyNav = true;

	requestAnimationFrame(() => {
		if (!nav_main) {
			scheduledStickyNav = false;
			return;
		}
		const navHeight = nav_main.clientHeight;
		const navOffset = nav_main.offsetTop;
		const useOuter = !!nav_main.closest('#nav-outer');
		const viewportHeight = getViewportHeight();
		const navBottom = getNavBottom();


		html_tag.style.setProperty('--drop_nav_mah', `${useOuter ? (viewportHeight - navHeight) : (viewportHeight - navHeight - navBottom)}px`);
		html_tag.style.setProperty('--drop_nav_mah_fixed', `${viewportHeight - navHeight - navOffset}px`);
		html_tag.style.setProperty('--mega_nav_mah_fixed', `${viewportHeight - navOffset}px`);
		html_tag.style.setProperty('--sticky_nav_mah', `${viewportHeight - navHeight}px`);


		isCustomStickyNavExecuted = true;
		scheduledStickyNav = false;
	});
}

if (!isMobile) {
	window.addEventListener('mousemove', () => {
		customStickyNav();
	}, asyncOnce);
}

document.addEventListener('scroll', () => {
	customStickyNav();
}, asyncPass);

window.addEventListener('resize', throttle(() => {
	isCustomStickyNavExecuted = false;
	customStickyNav();
}, 500));


// Observes footer visibility to add toggle links to headers and handles their click to toggle dropdowns.
if (footer_id) {
	let isFooterIo = false;

	function footerIo(entries, observer) {
		entries.forEach(entry => {
			if (entry.isIntersecting && !isFooterIo) {
				Array.from(footer_id.querySelectorAll('h1, h2, h3, h4, h5, h6')).forEach(el => {
					append_url(el, 'Close', 'header-toggle');
				});
				isFooterIo = true;
				observer.unobserve(entry.target);
			}
		});
	}

	const observer = new IntersectionObserver(footerIo);
	observer.observe(footer_id);

	footer_id.addEventListener('click', function (event) {
		if (event.target.matches('a.header-toggle')) {
			const closestHeader = event.target.closest('h1, h2, h3, h4, h5, h6');
			if (closestHeader) {
				toggle_dropdowns_simple(closestHeader.parentElement);
				event.preventDefault();
			}
		}
	});
}




/*! Custom Events -------------------------------------------------- */
let announcementEvt = new CustomEvent('announcement');
let changeEvent = new Event('change');

function createProductSelectChangeEvent(source, bubbles = true) {
	const event = new Event('change', { bubbles: bubbles });
	event.xtraStandardProductSelectSource = source || null;
	return event;
}

function beginStandardProductSelect(source, targetSource, overrides) {
	if (
		!window.XtraTheme ||
		typeof window.XtraTheme.beginStandardProductSelect !== 'function'
	) {
		return null;
	}

	try {
		return window.XtraTheme.beginStandardProductSelect(source, targetSource, overrides);
	} catch (error) {
		console.warn('Standard storefront product select setup failed', error);
		return null;
	}
}

function beginStandardCartMutation(type, target, payload) {
	if (
		!window.XtraTheme ||
		typeof window.XtraTheme.beginStandardCartMutation !== 'function'
	) {
		return null;
	}

	try {
		return window.XtraTheme.beginStandardCartMutation(type, target, payload);
	} catch (error) {
		console.warn('Standard storefront cart event setup failed', error);
		return null;
	}
}

function getStandardCartContext(target, defaultContext = 'cart') {
	if (target && target.closest && target.closest('.m6pn')) return 'dialog';
	return defaultContext;
}

function getStandardCartEventTarget(source, container) {
	if (source && source.isConnected) {
		return source.closest('form, .product-card, .m6pr, #sticky-add-to-cart, #cart, .form-cart') || source;
	}
	if (container && container.isConnected) return container;
	return document.getElementById('cart') || document.querySelector('.form-cart') || document;
}

function createStandardCartError(response, fallbackMessage) {
	const message = response && (response.description || response.message) ?
		(response.description || response.message) :
		(fallbackMessage || 'Cart mutation failed');
	return new Error(typeof message === 'string' ? message : JSON.stringify(message));
}

let listCollectionSliderUpdateEvt = new CustomEvent('listCollectionSliderUpdate');
let mainProductSlideToEvt = new CustomEvent('mainProductSlideTo');
let moduleFeaturedSlideToEvt = new CustomEvent('moduleFeaturedSlideTo');
let modulePanelAnchorEvt = new CustomEvent('modulePanelAnchorEvt');
let productBuybarBtnEvt = new CustomEvent('productBuybarBtn');


// #nav-top - sets up top nav dropdowns: handles clicks, space key, closes others, and manages hover/aria states.
const navtopEvt = new CustomEvent('navTop');
window.addEventListener('navTop', function () {
	if (!nav_top_id) return;

	nav_top_id.querySelectorAll('a.toggle').forEach(el => {
		const clickHandler = el => {
			close_mobile_nav();

			if (nav_id) remove_active_submenus(nav_id.querySelectorAll('a.toggle'));
			if (nav_user_id) remove_active_submenus(nav_user_id.querySelectorAll('a.toggle'));

			toggle_dropdowns(el);
		};

		el.addEventListener('click', e => {
			clickHandler(el);
			e.preventDefault();
		});

		el.addEventListener('keyup', e => {
			if (e.key === ' ') {
				clickHandler(el);
				e.preventDefault();
			}
		});

		if (!isMobile) {
			const nextSibling = el.nextElementSibling;
			if (nextSibling) {
				nextSibling.addEventListener('mouseleave', () => close_dropdown(el.parentElement));
			}
		}
	});
});
window.dispatchEvent(navtopEvt);


// #nav - manages desktop/mobile nav, dropdowns, popups, USP links, and interactive elements dynamically
function createLinkedPopup(em, innerText, dataIndex) {
	if (document.querySelector(`.popup-a[data-title="${dataIndex}"]`)) return;

	const linkedPopup = document.createElement('div');
	linkedPopup.classList.add('popup-a', 'w360');
	linkedPopup.dataset.title = dataIndex;

	const p = document.createElement('p');

	const tmp = document.createElement('div');
	tmp.innerHTML = innerText;

	while (tmp.firstChild) {
		p.appendChild(tmp.firstChild);
	}

	linkedPopup.appendChild(p);
	root_id.appendChild(linkedPopup);
}

function navHandlerX(el) {
	clear_mobile_nav();
	close_mobile_nav();
}

function navHandlerWide(el) {
	html_tag.classList.toggle('nav-more-active');
}

function navHandler(el) {
	const parentElement = el.parentElement;
	const mobileHeader = nav_id.querySelector('.header-before');
	const parentList = el.closest('ul');

	for (const nav of [nav_top_id, nav_bar_id, nav_user_id]) {
		if (nav) remove_active_submenus(nav.querySelectorAll('a.toggle'));
	}

	const hasDataTitle = parentElement.hasAttribute('data-title');

	if (parentElement.classList.contains('toggle')) {
		parentElement.classList.remove('toggle', 'mtoggle');
		parentList.classList.remove('ul-toggle');
		if (hasDataTitle && mobileHeader) mobileHeader.classList.remove('data-title-active');
	} else {
		for (const child of parentList.children) {
			child.classList.remove('toggle');
		}
		parentElement.classList.add('toggle', 'mtoggle');
		parentList.classList.add('ul-toggle');

		const closestType = el.closest('[data-type]');
		if (closestType) {
			const typeValue = closestType.getAttribute('data-type');
			if (typeValue) nav_id.setAttribute('data-type', typeValue);
		}

		if (hasDataTitle && mobileHeader) {
			mobileHeader.innerHTML = parentElement.getAttribute('data-title');
			mobileHeader.classList.add('data-title-active');
		}
	}

	if (nav_id.querySelectorAll('.ul-toggle:not(.nav-user)').length === 0) {
		nav_id.removeAttribute('data-type');
	}

	const hasActiveSub = nav_id.querySelectorAll('[data-type="main-nav"] > li.sub.toggle').length > 0;
	html_tag.classList.toggle('nav-hover', hasActiveSub);
}

const navEvt = new CustomEvent('nav');
window.addEventListener('nav', function (evt) {

	// Add mouseover listener for nav_id if it exists and not mobile
	if (nav_id && !isMobile) nav_id.addEventListener('mouseover', asyncCSS);

	// Initialize top navigation links and hover effects
	if (top_id) {
		for (const el of top_id.querySelectorAll('a.toggle')) {
			el.addEventListener('click', asyncCSS);
		}
		if (!isMobile) top_id.addEventListener('mouseover', asyncCSS);
	}

	// Set or remove HTML classes depending on navigation presence
	if (nav_bar_id || nav_id) {
		html_tag.classList.remove('t1mn', 't1nn');
	} else {
		html_tag.classList.add('t1mn', 't1nn');
	}

	// Function to initialize the main nav bar
	function initNavBar(nav_bar_id, nav_id, nav_top_id, nav_user_id, html_tag, isMobile) {
		if (!nav_bar_id) return;

		// Append close button for nav bar
		append_url(nav_bar_id.children[0], 'Close', 'close');

		const toggleLinks = nav_bar_id.querySelectorAll('a.toggle');
		const navContainers = [nav_id, nav_top_id, nav_user_id].filter(Boolean);

		// Setup toggle click/touch/keyboard events
		toggleLinks.forEach(el => {
			el.parentElement.classList.add('sub');

			const clickHandler = () => {
				close_mobile_nav();
				navContainers.forEach(container => remove_active_submenus(container.querySelectorAll('a.toggle')));
				toggle_dropdowns(el);
			};

			const activate = e => {
				if (e.type === 'keyup' && e.key !== ' ') return;

				if ((e.type === 'click' || e.type === 'keyup') && e.cancelable) {
					e.preventDefault();
				}

				clickHandler();
			};

			el.addEventListener('click', activate);

			el.addEventListener('touchstart', activate, {
				passive: true
			});

			el.addEventListener('keyup', activate);
		});

		// Setup hover effects for desktop nav bar
		if (!isMobile) {
			for (const el of document.querySelectorAll('#nav-bar > ul > li')) {
				el.addEventListener('mouseover', removeM2A);
			}

			if (nav_bar_id.children.length > 0) {
				const navChildren = nav_bar_id.children[0].children;
				for (const el of navChildren) {
					const toggleNavHover = () => {
						if (el.classList.contains('sub') || el.classList.contains('show-all')) {
							html_tag.classList.add('nav-hover');
						} else {
							html_tag.classList.remove('nav-hover');
						}
					};
					el.addEventListener('mouseover', toggleNavHover);
					el.addEventListener('mouseleave', () => html_tag.classList.remove('nav-hover'));
				}
			}
		}

		// Toggle a class if there is no header link button
		const nav_id_btn = document.querySelectorAll('#header > .link-btn a, #header-inner > .link-btn a');
		html_tag.classList.toggle('t1nb', !nav_id_btn.length);
	}

	// Initialize nav bar if present
	if (nav_bar_id) initNavBar(nav_bar_id, nav_id, nav_top_id, nav_user_id, html_tag, isMobile);

	// Function to initialize standard navigation
	function initNav(nav_id, html_tag, isMobile) {
		if (!nav_id) return;

		// Add 'sub-classic' class to links with no children
		for (const el of document.querySelectorAll('#nav > ul > li > a.toggle')) {
			if (el.parentNode.querySelectorAll('li > ul:first-child').length === 0) {
				el.parentElement.classList.add('sub-classic');
			}
		}

		// Add 'sub' class to all toggle links
		for (const el of nav_id.querySelectorAll('a.toggle')) {
			const parent = el.parentElement;
			if (!parent.classList.contains('sub')) {
				parent.classList.add('sub');
			}
		}

		// Assign data-index to nav children for ordering		
		/*const navLists = [
			nav_id.querySelector('ul[data-type]'),
			nav_id.querySelector('ul.ul-inner')
		].filter(Boolean);

		navLists.forEach(ul => {
			const children = Array.from(ul.children);
			children.forEach((el, i) => {
				el.setAttribute('data-index', children.length - i);
			});
		});*/

		// Setup hover and click for nav submenus
		const ndContainer = nav_id.querySelector('ul[data-type]');
		if (ndContainer) {
			const nd = ndContainer.children;

			for (const el of nd) {
				if (!isMobile) {
					el.addEventListener('mouseover', e => {
						navSubHover(el);
						e.preventDefault();

						if (el.classList.contains('sub') || el.classList.contains('show-all')) {
							html_tag.classList.add('nav-hover');
						} else {
							html_tag.classList.remove('nav-hover');
						}
					});
					el.addEventListener('mouseleave', () => {
						html_tag.classList.remove('nav-hover');
					});
				}

				for (const em of el.querySelectorAll('a.toggle:not(.toggle-back)')) {
					em.addEventListener('click', () => navSubHover(el));
				}
			}
		}

		// Event delegation for nav clicks and keyboard
		const handleClick = event => {
			const target = event.target;

			if (target.matches('a.toggle, a.toggle *')) {
				navHandler(target.closest('a.toggle'));
				event.preventDefault();
				return;
			}

			if (target.matches('a.toggle-wide, a.toggle-wide *')) {
				navHandlerWide(target.closest('a.toggle'));
				event.preventDefault();
				return;
			}

			if (target.matches('.check label, .check label *')) {
				const wrapper = target.closest('.check.inside');
				if (wrapper) {
					const checkbox = wrapper.querySelector('input');
					if (checkbox) checkbox.checked = !checkbox.checked;
				}
				return;
			}

			if (target.matches('a.close-nav')) {
				navHandlerX(target);
				event.preventDefault();
			}
		};

		// Event delegation: space key for accessibility
		const handleKeyup = event => {
			if (event.key !== ' ') return;

			const target = event.target;

			if (target.matches('a.toggle, a.toggle *')) {
				navHandler(target.closest('a.toggle'));
			} else if (target.matches('a.toggle-wide, a.toggle-wide *')) {
				navHandlerWide(target.closest('a.toggle'));
			} else if (target.matches('a.close-nav')) {
				navHandlerX(target);
			}

			event.preventDefault();
		};

		nav_id.addEventListener('click', handleClick);
		nav_id.addEventListener('keyup', handleKeyup);

		// Remove t1nn class from HTML for burger menu
		html_tag.classList.remove('t1nn');
	}

	if (nav_id) initNav(nav_id, html_tag, isMobile);

	// Initialize nav burger buttons and set CSS variables
	if (neq) {
		const getDist = function (el) {
			const linkBtn = el.closest('.link-btn');
			if (linkBtn) {
				const container = linkBtn.offsetParent;
				if (container && container.id === 'header') {
					const l1 = linkBtn.getBoundingClientRect();
					const l2 = container.getBoundingClientRect();
					const dl = l1.left - l2.left;
					const dr = l2.right - l1.right;
					root_styles.style.setProperty('--nav_l', dl + 'px');
					root_styles.style.setProperty('--nav_r', dr + 'px');
				}
			}
		};
		for (const el of neq) {
			el.addEventListener('click', e => {
				nav_burger();
				getDist(el);
				e.preventDefault();
			});

			el.addEventListener('keyup', e => {
				if (e.key === ' ') {
					nav_burger();
					getDist(el);
					e.preventDefault();
				}
			});
		}
	}

	// Add t1nn class if no nav exists
	if ((!nav_id && !nav_bar_id) && !html_tag.classList.contains('t1nn')) {
		html_tag.classList.add('t1nn');
	}

	// Add rounded class for top static submenus on hover
	if (top_id && !isMobile) {
		const subStatic = top_id.querySelectorAll('.sub-static li > ul:not(:first-child):not(:last-child)');
		for (const el of subStatic) {
			const parent = el.parentElement;
			const grand = parent.parentElement;
			if (!parent || !grand) continue;

			parent.addEventListener('mouseenter', () => {
				const requiredH = el.clientHeight + parent.offsetTop - Math.abs(el.offsetTop);
				if (grand.clientHeight < requiredH) {
					el.classList.add('rounded-b2r');
				}
			});
		}
	}

	// Initialize USP section (Unique Selling Points)
	function initUSP(top_id, isMobile) {
		if (!top_id) return;

		const listUspHeader = top_id.getElementsByClassName('l4us');
		if (!listUspHeader.length) return;

		for (const el of listUspHeader) {
			if (el.closest('.m6kn')) return;

			const listItems = el.querySelectorAll('li');
			for (let in2 = 0; in2 < listItems.length; in2++) {
				const em = listItems[in2];
				if (em.classList.contains('rendered')) continue;

				const innerText = em.innerHTML;
				const originalHTML = em.innerHTML;
				const dataIndex = 'usp-' + [...listUspHeader].indexOf(el) + in2;

				if (typeof translations === 'undefined') {
					var translations = {
						readmore_text: 'Read more'
					};
				} else if (!translations.readmore_text) {
					translations.readmore_text = 'Read more';
				}

				// Wrap inner content and append read more link
				/*em.innerHTML = `
					<span class="outer">
						<span class="inner">${innerText}</span>
						<a href="#" class="linked" data-popup="${dataIndex}">${translations.readmore_text}</a>
						<span class="inner-text">${innerText}</span>
					</span>
				`;*/
				const originalNodes = Array.from(em.childNodes);

				const outerSpan = document.createElement('span');
				outerSpan.className = 'outer';

				const innerSpan = document.createElement('span');
				innerSpan.className = 'inner';

				const linkEl = document.createElement('a');
				linkEl.href = '#';
				linkEl.className = 'linked';
				linkEl.setAttribute('data-popup', dataIndex);
				linkEl.textContent = translations.readmore_text;

				const innerTextSpan = document.createElement('span');
				innerTextSpan.className = 'inner-text';

				for (const node of originalNodes) {
					innerSpan.appendChild(node);
				}

				for (const node of originalNodes) {
					innerTextSpan.appendChild(node.cloneNode(true));
				}

				outerSpan.appendChild(innerSpan);
				outerSpan.appendChild(linkEl);
				outerSpan.appendChild(innerTextSpan);

				em.appendChild(outerSpan);
				// End of: Wrap inner content and append read more link

				for (const en of el.querySelectorAll('.inner-text a')) {
					en.setAttribute('tabindex', '-1');
				}

				// Add image class if element contains image or SVG
				if (isHasSelectorSupported() && (em.querySelector('img') || em.querySelector('svg'))) {
					em.classList.add('has-img');
					el.classList.add('has-img');
				}

				em.classList.add('rendered');

				registerSmallPopupItem(em);

				// Slider navigation setup
				if (el.classList.contains('slider-single') && el.classList.contains('s4wi')) {
					const swiperEl = el.getElementsByClassName('swiper-outer')[0];
					if (swiperEl && swiperEl.swiper) {
						const isSwiper = swiperEl.swiper;

						append_url(em.querySelectorAll('.outer')[0], 'Next', 'next-item');

						for (const eo of el.getElementsByClassName('next-item')) {
							eo.addEventListener('click', e => {
								isSwiper.slideNext();
								e.preventDefault();
							});
						}
					}
				}

				if (!isMobile) {
					em.addEventListener('mouseover', () => createLinkedPopup(em, innerText, dataIndex));
				}
				linkEl.addEventListener('keyup', e => {
					if (e.key === ' ' || e.key === 'Enter') {
						createLinkedPopup(em, innerText, dataIndex);
						e.preventDefault();
					}
				});

				linkEl.addEventListener('click', e => {
					e.preventDefault();
					createLinkedPopup(em, innerText, dataIndex);
				});
			}
		}
	}
	initUSP(top_id, isMobile);

	// Initialize user navigation section
	function initNavUser(nav_user_id, nav_id, nav_top_id, nav_bar_id, isMobile) {
		if (!nav_user_id) return;

		// Mark forms inside nav user items
		const forms = nav_user_id.querySelectorAll('li > form');
		for (const form of forms) {
			const parent = form.parentNode;
			parent.classList.add('has-form');
			nav_user_id.classList.add('has-form');

			append_url(form, 'Toggle', 'toggle');
			append_url(parent, 'Toggle', 'toggle');
		}

		// Setup toggle events for nav user links
		const toggleLinks = nav_user_id.querySelectorAll('a.toggle');
		for (const el of toggleLinks) {
			const clickHandler = () => {
				close_mobile_nav();
				const containers = [nav_id, nav_top_id, nav_bar_id].filter(Boolean);
				for (const container of containers) {
					remove_active_submenus(container.querySelectorAll('a.toggle'));
				}
				toggle_dropdowns(el);
			};

			el.addEventListener('click', e => {
				clickHandler();
				e.preventDefault();
			});

			el.addEventListener('keyup', e => {
				if (e.key === ' ') {
					clickHandler();
					e.preventDefault();
				}
			});

			if (!isMobile) {
				const next = el.nextElementSibling;
				if (next && next.tagName.toLowerCase() !== 'form') {
					next.addEventListener('mouseleave', () => close_dropdown(el.parentElement));
				}
			}
		}
	}
	if (nav_user_id) initNavUser(nav_user_id, nav_id, nav_top_id, nav_bar_id, isMobile);

	// Remove hover class from ul-inner when mouse leaves
	if (nav_id) {
		const ulInner = nav_id.querySelector('.ul-inner');
		if (ulInner) {
			ulInner.addEventListener('mouseleave', () => nav_id.classList.remove('ul-hover'));
		}
	}
});
window.dispatchEvent(navEvt);


// Sticky header - initializes distance spacer, and overlay behavior with responsive and scroll-aware logic.
const stickyNavEvt = new CustomEvent('stickyNav');
window.addEventListener('stickyNav', function () {
	if (!top_id) return;

	// Toggle t1nt class depending on presence of #nav-top
	const navTopEl = document.querySelector('#nav-top:not(.no-js)');
	navTopEl ? html_tag.classList.remove('t1nt') : html_tag.classList.add('t1nt');

	// Toggle t1sn class depending on nav_id
	if (nav_id) {
		nav_id.classList.contains('sticky-menu') ? html_tag.classList.add('t1sn') : html_tag.classList.remove('t1sn');
	}

	// Determine main element for sticky logic
	let le = top_id;
	let n_el = nav_bar_id ? (nav_bar_id.closest('#header-inner') ? (nav_id || header_id) : nav_bar_id) : nav_id;
	if (html_tag.classList.contains('t1sn') || (n_el && n_el.classList.contains('sticky')) || (header_inner && header_inner.classList.contains('sticky-nav'))) {
		html_tag.classList.add('t1sn');
		le = n_el;
	}

	// Function to create distance spacer
	let distanceSpacerCreated = false;
	const createDistanceSpacer = () => {
		if (!distanceSpacerCreated && le) {
			const spacer = document.createElement('div');
			spacer.id = 'distance-spacer';
			spacer.style.height = le.offsetHeight + 'px';
			le.after(spacer);
			distanceSpacerCreated = true;
		}
	};

	// Add event listeners for creating distance spacer
	if (!isMobile) window.addEventListener('mousemove', createDistanceSpacer, asyncOnce);
	document.addEventListener('keyup', createDistanceSpacer, asyncOnce);
	document.addEventListener('touchstart', createDistanceSpacer, asyncPass);
	document.addEventListener('scroll', createDistanceSpacer, asyncPass);
	if (mediaMax1000.matches) createDistanceSpacer();

	// Update spacer height on window resize
	window.addEventListener('resize', throttle(() => {
		const spacer = document.getElementById('distance-spacer');
		if (spacer && le) spacer.style.height = le.offsetHeight + 'px';
	}, 500));

	// IntersectionObserver for sticky behavior
	const noSticky = top_id.querySelector('#header-inner.no-sticky');
	const io = entries => {
		entries.forEach(entry => {
			if (!noSticky) {
				if (entry.isIntersecting) {
					le.classList.remove('fixed');
				} else {
					le.classList.add('fixed');
					customStickyNav();
					if (le.id === 'nav' || le.id === 'nav-bar') {
						const runOverlayClose = () => mediaMin1000.matches && overlayClose(true);
						runOverlayClose();
						mediaMin1000.addEventListener('change', runOverlayClose);
					}
					asyncCSS();
				}
			}
		});
	};

	// Create distance counter element
	const distance_counter = document.createElement('div');
	distance_counter.id = 'distance-counter';
	let updateDistanceCounterCalculated = false;
	let updateDistanceCounterRAF = 0;
	let topOffset = 0;

	// Update distance counter height
	const updateDistanceCounterHeight = () => {
		updateDistanceCounterRAF = 0;
		if (updateDistanceCounterCalculated) return;

		if (nav_top_id) topOffset = nav_top_id.offsetHeight;
		if (!html_tag.classList.contains('t1sn')) distance_counter.style.top = topOffset + 'px';

		updateDistanceCounterCalculated = true;
	};

	// RequestAnimationFrame for distance counter update
	const updateDistanceCounterPosition = () => {
		if (!updateDistanceCounterCalculated && !updateDistanceCounterRAF) {
			updateDistanceCounterRAF = requestAnimationFrame(updateDistanceCounterHeight);
		}
	};

	// Append distance counter to proper container
	(html_tag.classList.contains('t1sn') ? header_id : root_id).append(distance_counter);

	// Add events for updating distance counter
	if (!isMobile) window.addEventListener('mousemove', updateDistanceCounterPosition, asyncOnce);
	document.addEventListener('keyup', updateDistanceCounterPosition, asyncOnce);
	document.addEventListener('touchstart', updateDistanceCounterPosition, asyncPass);
	document.addEventListener('scroll', updateDistanceCounterPosition, asyncPass);

	// Add header classes based on conditions
	header_inner.classList.contains('no-sticky') ? html_tag.classList.add('no-sticky') : html_tag.classList.remove('no-sticky');
	header_inner.classList.contains('mobile-visible-search') && top_id.classList.add('has-mobile-visible-search');
	header_inner.classList.contains('hide-btn-mobile') && top_id.classList.add('hide-btn-mobile');

	// Add hover behavior for header_outer
	if (header_inner.classList.contains('tr_h') && !isMobile) {
		top_id.classList.add('tr_h');
		header_outer.addEventListener('mouseenter', () => html_tag.classList.add('tr_hh'));
		header_outer.addEventListener('mouseleave', () => {
			if (!html_tag.classList.contains('search-full') && !html_tag.classList.contains('search-compact-active')) {
				html_tag.classList.remove('tr_hh');
			}
		});
	}

	// Observe distance counter for sticky logic
	header_id.classList.contains('no-sticky') ? html_tag.classList.add('t1ns') : new IntersectionObserver(io, {
		root: null,
		rootMargin: '0px',
		threshold: 0.9
	}).observe(distance_counter);

	// .overlay-close Add behaviours for closing the overlays
	if (top_id) {
		document.querySelectorAll('.overlay-close').forEach(el =>
			el.addEventListener('click', e => e.preventDefault())
		);

		document.addEventListener('click', event => {
			if (event.target.matches('.overlay-close, .overlay-close-clipping')) {
				overlayClose();
				event.preventDefault();
			}
		});
	}
});
window.dispatchEvent(stickyNavEvt);


// .l4dr - initializes dropdown behavior for all list dropdowns, handling click, spacebar key, and mouseleave events for proper toggle and accessibility.
function listDropSetup(el) {
	function clickHandler() {
		toggle_dropdowns(el, '.l4dr');
		asyncCSS();
	}

	el.addEventListener('click', function (e) {
		clickHandler();
		e.preventDefault();
	});

	el.addEventListener('keyup', function (e) {
		if (e.key === ' ') {
			clickHandler();
			e.preventDefault();
		}
	});

	if (!isMobile && el.nextElementSibling) {
		el.nextElementSibling.addEventListener('mouseleave', function () {
			if (el.parentElement) {
				close_dropdown(el.parentElement);
			}
		});
	}
}

const listDropEvt = new CustomEvent('listDrop');
window.addEventListener('listDrop', function () {
	const allListDrop = document.querySelectorAll('.l4dr');
	if (!allListDrop.length) return;

	for (const element of allListDrop) {
		for (const el of element.querySelectorAll('a.toggle')) {
			listDropSetup(el);
		}
	}
});
window.dispatchEvent(listDropEvt);


// Initialize click handlers to show, hide, or toggle elements based on [data-enable], [data-disable], or [data-toggle] attributes
function data_show_me(el) {
	el.addEventListener('click', function (e) {
		for (const elm of document.querySelectorAll('[data-element]')) {
			elm.classList.add('hidden');
		}

		const target = el.getAttribute('data-enable');
		if (target) {
			for (const elm of document.querySelectorAll(`[data-element="${target}"]`)) {
				elm.classList.remove('hidden');
			}
		}

		if (el.tagName.toLowerCase() === 'a') e.preventDefault();
	});
}

function data_hide_me(el) {
	el.addEventListener('click', function (e) {
		const target = el.getAttribute('data-disable');
		if (target) {
			for (const elm of document.querySelectorAll(`[data-element="${target}"]`)) {
				elm.classList.add('hidden');
			}
		}

		if (el.tagName.toLowerCase() === 'a') e.preventDefault();
	});
}

function data_togg_me(el) {
	el.addEventListener('click', function (e) {
		const parent = el.parentElement;
		const target = el.getAttribute('data-toggle');

		if (target) {
			for (const elm of document.querySelectorAll(`[data-element="${target}"]`)) {
				elm.classList.toggle('hidden');
				const box = elm.closest('.l4cl.box');
				if (box) lastVis(box);
			}
		}

		if (el.tagName.toLowerCase() === 'a' && parent) {
			parent.classList.toggle('link-toggle-clicked');
			e.preventDefault();
		}
	});
}

const showHideDataElementEvt = new CustomEvent('showHideDataElement');
window.addEventListener('showHideDataElement', function () {
	const data_show = document.querySelectorAll('a[data-enable]:not(.data-enable-listening), input[data-enable]:not(.data-enable-listening), button[data-enable]:not(.data-enable-listening)');
	const data_hide = document.querySelectorAll('a[data-disable]:not(.data-disable-listening), input[data-disable]:not(.data-disable-listening), button[data-disable]:not(.data-disable-listening)');
	const data_toggle = document.querySelectorAll('a[data-toggle]:not(.data-toggle-listening), input[data-toggle]:not(.data-toggle-listening), button[data-toggle]:not(.data-toggle-listening)');

	for (const el of data_show) {
		el.classList.add('data-enable-listening');
		data_show_me(el);
	}

	for (const el of data_hide) {
		el.classList.add('data-disable-listening');
		data_hide_me(el);
	}

	for (const el of data_toggle) {
		el.classList.add('data-toggle-listening');
		data_togg_me(el);
	}
});
window.dispatchEvent(showHideDataElementEvt);


// .input-amount - initializes and manages numeric input components with increment/decrement buttons, syncing linked inputs, enforcing min/max limits, and handling updates via custom events.
function amountRun(el) {
	el.classList.add('semantic-input-initialized');

	const frag = document.createDocumentFragment();
	const semAm = document.createElement('span');
	semAm.className = 'semantic-amount';

	while (el.firstChild) {
		semAm.appendChild(el.firstChild);
	}
	frag.appendChild(semAm);
	el.appendChild(frag);

	el.querySelectorAll('.semantic-amount').forEach((child) => {
		const inp = child.querySelector('input');
		if (!inp) return;

		const inc = document.createElement('a');
		const dec = document.createElement('a');
		inc.className = 'incr';
		dec.className = 'decr';
		inc.setAttribute('role', 'button');
		dec.setAttribute('role', 'button');
		inc.setAttribute('aria-label', 'Increase by 1');
		dec.setAttribute('aria-label', 'Decrease by 1');

		child.appendChild(inc);
		child.appendChild(dec);

		const value = parseFloat(inp.value) || 0;
		const min = parseFloat(inp.getAttribute('min')) || 0;
		const max = parseFloat(inp.getAttribute('max')) || Infinity;

		if (value <= min || value <= 1) dec.classList.add('disabled');
		if (value >= max) inc.classList.add('disabled');
	});

	const parent = el.parentNode;
	if (parent && parent.classList.contains('submit')) {
		const hasM = parent.querySelector('.size-m');
		const hasL = parent.querySelector('.size-l');
		if (hasM) el.classList.add('size-m');
		if (hasL) el.classList.add('size-l');
	}
}

function amountClick(elements) {
	Array.from(elements).forEach((el) => {
		if (el.classList.contains('input-amount-listening')) return;
		el.classList.add('input-amount-listening');

		const input = el.querySelector('input');
		const decr = el.querySelector('.decr');
		const incr = el.querySelector('.incr');
		if (!input || !decr || !incr) return;

		const step = parseFloat(input.getAttribute('step')) || 1;
		const min = parseFloat(input.getAttribute('min')) || 1;
		const max = parseFloat(input.getAttribute('max')) || Infinity;

		const linkedInputSelector = input.getAttribute('data-link');
		const linkedInput = linkedInputSelector ? document.querySelector(linkedInputSelector) : null;

		let _updating = false;

		const normalizeValue = (newValue) => {
			newValue = parseFloat(newValue);
			if (!isFinite(newValue)) newValue = min;
			return Math.max(min, Math.min(max, newValue));
		};

		const updateValue = (newValue, dispatchChange = false) => {
			if (_updating) return;
			_updating = true;

			newValue = normalizeValue(newValue);
			input.value = newValue;
			if (linkedInput) linkedInput.value = newValue;

			decr.classList.toggle('disabled', newValue <= min);
			incr.classList.toggle('disabled', newValue >= max);

			if (dispatchChange) input.dispatchEvent(new Event('change'));

			_updating = false;
		};

		decr.addEventListener('click', (e) => {
			if (!decr.classList.contains('disabled')) updateValue(parseFloat(input.value) - step, true);
			e.preventDefault();
		});

		incr.addEventListener('click', (e) => {
			if (!incr.classList.contains('disabled')) updateValue(parseFloat(input.value) + step, true);
			e.preventDefault();
		});

		input.addEventListener('change', () => {
			updateValue(input.value);
		});

		updateValue(input.value);
	});
}

const semanticInputEvt = new CustomEvent('semanticInput');
window.addEventListener('semanticInput', function () {
	const input_amount = document.querySelectorAll('.input-amount:not(.semantic-input-initialized, .in-popup)');
	if (!input_amount.length) return;

	input_amount.forEach(el => {
		el.classList.add('semantic-input-initialized');

		const inPopup = el.closest('[class^="popup-inset"]:not(html)');
		if (inPopup) {
			el.classList.add('in-popup');
			return;
		}

		amountRun(el);
	});
	const activeInputs = document.querySelectorAll('.input-amount:not(.in-popup, .input-amount-listening)');
	if (activeInputs.length) {
		amountClick(activeInputs);
	}
});
window.dispatchEvent(semanticInputEvt);


// .input-show - enable accordion-style toggle for input labels and focus the input on toggle
const accordeonEvt = new CustomEvent('accordeon');
window.addEventListener('accordeon', function () {
	const inputLabels = document.querySelectorAll('.input-show > label');
	if (!inputLabels.length) return;

	for (const label of inputLabels) {
		append_url(label, 'Toggle', 'toggle');
		const toggleLink = label.querySelector('a.toggle');
		if (!toggleLink) continue;

		toggleLink.addEventListener('click', (e) => {
			e.preventDefault();
			const parent = label.parentElement;
			parent.classList.toggle('toggle');

			setTimeout(() => {
				const input = parent.querySelector('input, textarea');
				if (input) input.focus();
			}, 0);
		});
	}
});
window.dispatchEvent(accordeonEvt);


// [data-change] - updates target elements inner content based on [data-change] triggers and handle hover/click updates
function dataChange(el, selector, innerSelector = '.inner') {
	const targets = document.querySelectorAll(selector);
	for (const target of targets) {
		const innerElements = target.querySelectorAll(innerSelector);
		for (const innerEl of innerElements) {
			innerEl.innerHTML = el;
		}
	}
}

const dataChangeEvt = new CustomEvent('dataChange');
window.addEventListener('dataChange', () => {
	const dataChangeElems = document.querySelectorAll('a[data-change][title]:not(.listening-data-change), input[data-change][title]:not(.listening-data-change)');
	const dataChangeToElems = document.querySelectorAll('[class^="data-change-to"]:not(.listening-data-change)');

	if (dataChangeToElems.length) {
		for (const el of dataChangeToElems) {
			const oldCont = createElementWithClass('span', 'hidden');
			oldCont.innerHTML = el.innerHTML;

			const newCont = document.createElement('span');
			newCont.classList.add('inner');

			while (el.firstChild) {
				newCont.appendChild(el.firstChild);
			}

			el.appendChild(newCont);
			el.appendChild(oldCont);
			el.classList.add('listening-data-change');
		}
	}

	if (dataChangeElems.length) {
		for (const el of dataChangeElems) {
			el.classList.add('listening-data-change');

			el.addEventListener('click', (e) => {
				dataChange(el.getAttribute('title'), el.getAttribute('data-change'), ['.inner', '.hidden']);
				if (el.tagName.toLowerCase() === 'a') e.preventDefault();
			});

			if (!isMobile && el.tagName.toLowerCase() === 'input' && el.nextElementSibling && el.nextElementSibling.tagName && el.nextElementSibling.tagName.toLowerCase() === 'label') {
				const label = el.nextElementSibling;

				label.addEventListener('mouseenter', () => {
					dataChange(el.getAttribute('title'), el.getAttribute('data-change'));
				});

				label.addEventListener('mouseleave', () => {
					const hiddenEl = document.querySelector(el.getAttribute('data-change') + ' .hidden');
					if (hiddenEl) dataChange(hiddenEl.innerText, el.getAttribute('data-change'));
				});
			}
		}
	}
});
window.dispatchEvent(dataChangeEvt);


// Add play/pause and mute toggle functionality for videos linked or inside picture/figure elements
const muteVideoEvt = new CustomEvent('muteVideo');
window.addEventListener('muteVideo', function () {
	const a_video = document.querySelectorAll('a video, a ~ video, a ~ picture video');
	if (!a_video.length) return;

	a_video.forEach(el => {
		const muteLink = document.createElement('span');
		muteLink.classList.add('link-mute');
		const anchor = document.createElement('a');
		anchor.href = './';
		anchor.textContent = 'Mute';
		muteLink.appendChild(anchor);
		const pictureEl = el.closest('picture');
		if (pictureEl) {
			const linkPicEl = pictureEl.closest('a');
			if (linkPicEl) {
				linkPicEl.insertAdjacentElement('afterend', muteLink);
			} else {
				pictureEl.insertAdjacentElement('afterend', muteLink);
			}
		}
		muteLink.querySelector('a').addEventListener('click', function (e) {
			e.preventDefault();
			muteLink.classList.toggle('muted');
			el.muted = muteLink.classList.contains('muted');
		});
		const figureEl = el.closest('figure');
		const linkEl = el.closest('a');
		let av;
		if (figureEl !== null) {
			av = figureEl.querySelector('.link-overlay:not([data-banner-overlay])');
		}
		if (linkEl !== null) {
			av = linkEl;
		}
		if (av) {
			av.addEventListener('click', function (e) {
				if (av.classList.contains('video-clicked')) {
					av.classList.remove('video-clicked');
					el.pause();
				} else {
					av.classList.add('video-clicked');
					el.play();
				}
				//el.setAttribute('controls', true);
				e.preventDefault();
			});
		}
	});
});
window.dispatchEvent(muteVideoEvt);


// [data-bind] - mirror input/textarea changes to target fields defined via data-bind
const bindInputEvt = new CustomEvent('bindInput');
window.addEventListener('bindInput', () => {
	const data_bind_input = document.querySelectorAll('input[data-bind], textarea[data-bind]');

	if (!data_bind_input.length) return;

	for (const el of data_bind_input) {
		el.addEventListener('change', () => {
			const bindSelector = el.getAttribute('data-bind');
			const binded = document.querySelectorAll(
				'input[id="' + bindSelector + '"], textarea[id="' + bindSelector + '"]'
			);

			for (const target of binded) {
				if (target.tagName.toLowerCase() === 'input') {
					const checkContainer = target.closest('.check');
					target.checked = el.checked;

					if (checkContainer && el.checked) {
						const feedback = checkContainer.getElementsByClassName('invalid-feedback')[0];
						if (feedback) feedback.innerHTML = '';
					}

				} else if (target.tagName.toLowerCase() === 'textarea') {
					target.value = el.value;
					target.removeAttribute('name');
				}
			}
		});
	}
});
window.dispatchEvent(bindInputEvt);


// Handles marquees by cloning list items for seamless scroll and initializes typewriter effect on '.type' marquees.
const maqrueeEvt = new CustomEvent('maqruee');
window.addEventListener('maqruee', function (event) {
	const module_maqruee = document.querySelectorAll('.m6kn:not(.done)');
	const module_maqruee_js = fp('js/plugin-typewritter.js', 'plugin_typewriter_js');

	if (!module_maqruee.length) return;

	const mqType = [];
	const mqNorm = [];

	for (const el of module_maqruee) {
		(el.classList.contains('type') ? mqType : mqNorm).push(el);
	}

	mqNorm.forEach(el => {
		if (el.classList.contains('done')) return;

		const ul = el.querySelector('ul');
		if (!ul) return;

		const li = ul.children;
		if (!li.length) return;

		el.style.setProperty('--items', li.length);

		requestAnimationFrame(() => {
			const div_by = ul.clientWidth || (root_id && root_id.clientWidth) || 1;
			const containerWidth = (root_id && root_id.clientWidth) || viewportWidth;
			const clonesNeeded = Math.max(3, Math.ceil(containerWidth / div_by) + 2);

			for (let i = 0; i < clonesNeeded; i++) {
				const clone = ul.cloneNode(true);
				el.appendChild(clone);
			}
			el.children[0].classList.add('clone');
		});

		el.classList.add('done');
	});

	if (mqType.length) {
		loadRes(module_maqruee_js, () => {
			const hasGraphemeSplitter = typeof GraphemeSplitter === 'function';
			const stringSplitter = hasGraphemeSplitter ? (function () {
				const splitter = new GraphemeSplitter();
				return function (str) {
					return splitter.splitGraphemes(str);
				};
			})() : function (str) {
				return Array.from(str);
			};

			mqType.forEach(el => {
				if (el.classList.contains('done') || typeof Typewriter !== 'function') return;

				const ul = el.querySelector('ul');
				if (!ul) return;

				const texts = Array.from(ul.children).map(li => {
					const span = li.querySelector(':scope > span');
					const html = (span ? span.innerHTML : li.innerHTML) || '';
					return html.trim();
				}).filter(Boolean);

				if (!texts.length) return;

				el.innerHTML = '';

				const wrapper = document.createElement('span');
				wrapper.className = 'inner';
				el.appendChild(wrapper);

				let delay = 'natural';
				if (el.classList.contains('fast')) delay = 50;
				if (el.classList.contains('slow')) delay = 200;
				if (el.hasAttribute('data-speed')) delay = parseFloat(el.dataset.speed);

				try {
					new Typewriter(wrapper, {
						loop: true,
						strings: texts,
						autoStart: true,
						delay,
						stringSplitter
					});

					el.classList.add('done');
				} catch (e) {
					console.warn('[maqruee] Typewriter init failed:', e);
				}
			});
		}, 'plugin_typewriter_js');
	}
});
window.dispatchEvent(maqrueeEvt);


// .f8vl - initialize form validation on forms: sets up error feedback, enables/disables submit, and attaches event listeners
const validation_js = fp('js/plugin-validator.js', 'plugin_validator_js');

function validate_me(el) {
	el.querySelectorAll('p:not(.s1pr, .r6rt), ul, span.input-amount').forEach(em => {
		if (!em.classList.contains('form-group') && !em.classList.contains('l4us')) {
			if (!em.querySelector('.invalid-feedback')) {
				em.appendChild(createElementWithClass('span', 'invalid-feedback'));
			}
			em.classList.add('form-group');

			em.querySelectorAll('.invalid-feedback').forEach(en => {
				if (en.previousElementSibling) {
					en.previousElementSibling.classList.add('last-child');
				}
			});

			em.querySelectorAll('span[class*="size-"] + .invalid-feedback').forEach(en => {
				en.previousElementSibling.before(en);
			});
		}
	});
	loadRes(validation_js, function () {
		if (typeof Validator === 'function') {
			el.noValidate = true;
			const validationPlugin = new Validator(el, {
				autoScroll: false,
				showValid: true
			});

			if (!validationPlugin.hasError()) {
				validationPlugin.setSubmitEnabled();
			}
		}
		new_css('form-validation-css', validation_css);
	}, 'validator-loaded');
}

const validatedControlsBound = new WeakSet();
const validatedFormHoverBound = new WeakSet();
const validatedFormSubmitBound = new WeakSet();

function validator_run(el) {
	const requiredElements = el.querySelectorAll('[required]');
	const submitButtons = el.querySelectorAll('button[type="submit"]');

	const hasEmptyRequired = Array.from(requiredElements).some(en => {
		const tag = en.tagName.toLowerCase();
		return (tag === 'input' || tag === 'textarea') && !en.value.trim();
	});

	for (const btn of submitButtons) {
		btn.disabled = hasEmptyRequired;
	}

	el.querySelectorAll('input, select, textarea, button').forEach(input => {
		if (validatedControlsBound.has(input)) return;
		validatedControlsBound.add(input);

		['focus', 'change'].forEach(evt =>
			input.addEventListener(evt, () => validate_me(el))
		);
	});

	if (!isMobile && !validatedFormHoverBound.has(el)) {
		validatedFormHoverBound.add(el);
		el.addEventListener('mouseenter', () => validate_me(el));
	}

	if (el.querySelector('footer.hidden') && !validatedFormSubmitBound.has(el)) {
		validatedFormSubmitBound.add(el);
		el.addEventListener('submit', e => {
			el.classList.add('submitted');
			e.preventDefault();
		});
	}
}

const formValidateEvt = new CustomEvent('formValidate')
window.addEventListener('formValidate', function (evt) {
	const form_validate = document.querySelectorAll('.f8vl');
	const nav_entry = performance.getEntriesByType('navigation')[0];
	const nav_type = nav_entry ? nav_entry.type : performance.navigation.type;

	if (nav_type !== 'back_forward' && form_validate.length) {
		form_validate.forEach(form => validator_run(form));
	}
});
window.dispatchEvent(formValidateEvt);


// .f8pr - handles sticky product form behavior by loading its CSS, tracking scroll/resize, and toggling classes/ARIA visibility via IntersectionObserver.
const formProductEvt = new CustomEvent('formProduct')
window.addEventListener('formProduct', function (evt) {
	const form_product = document.querySelectorAll('.f8pr');
	if (!form_product.length) return;

	const css_product_scroll = fp('styles/async-product-scrolled.css', 'async_product_scrolled_css');

	const handleResizeAndScroll = () => {
		new_css('css-product-scrolled', css_product_scroll);
	};

	const assignStyles = () => {
		if (form_product_sticky) {
			html_tag.style.setProperty('--f8ps_h', form_product_sticky.clientHeight + 'px');
		}
	};

	//function clearStickyForm() { for (const el of form_product) { if (el.closest('.m6pr')) { html_tag.classList.remove('product-scrolled'); html_tag.classList.add('product-not-scrolled'); if (form_product_sticky) aria_hide(form_product_sticky); } } }

	const form_product_sticky = document.querySelector('.f8ps');
	if (form_product_sticky) {
		window.addEventListener('resize', throttle(() => {
			handleResizeAndScroll();
			assignStyles();
		}, 500));

		window.addEventListener('scroll', handleResizeAndScroll, {
			passive: true
		});
	}

	const setProductScrolled = () => {
		html_tag.classList.add('product-scrolled', 'f8ps-css');
		html_tag.classList.remove('product-not-scrolled');

		if (form_product_sticky) aria_show(form_product_sticky);

		assignStyles();
		requestAnimationFrame(assignStyles);
	};

	const setProductNotScrolled = () => {
		html_tag.classList.remove('product-scrolled');
		html_tag.classList.add('product-not-scrolled');
		if (form_product_sticky) aria_hide(form_product_sticky);
	};

	const getProductScrollTarget = (form) => {
		return form.querySelector('.f8pr-buy-button') || form;
	};

	const io = (entries) => {
		const headerOffset = headerOuterHeight;

		for (const entry of entries) {
			const rect = entry.boundingClientRect;
			handleResizeAndScroll();

			if (entry.isIntersecting) {
				setProductNotScrolled();
			} else if (rect.bottom <= headerOffset) {
				setProductScrolled();
			}
		}
	};

	const productScrollTargets = [];
	let observer = null;
	let observerHeaderOffset = -1;

	const observeProductScrollTargets = (refreshHeaderOffset = false) => {
		const headerOffset = refreshHeaderOffset ? setHeaderOuterHeight() : headerOuterHeight;

		if (observer && observerHeaderOffset === headerOffset) return;

		if (observer) observer.disconnect();

		observerHeaderOffset = headerOffset;
		observer = new IntersectionObserver(io, {
			rootMargin: '-' + headerOffset + 'px 0px 0px 0px'
		});

		for (const target of productScrollTargets) {
			observer.observe(target);
		}
	};

	for (const el of form_product) {
		if (el.closest('.m6pr')) {
			productScrollTargets.push(getProductScrollTarget(el));
		}
	}

	observeProductScrollTargets();

	if (header_outer) {
		let headerHeightSet = false;
		window.addEventListener('scroll', () => {
			if (!headerHeightSet) {
				headerHeightSet = true;
				observeProductScrollTargets(true);
			}
		}, asyncPass);
	}

	window.addEventListener('resize', throttle(() => {
		observeProductScrollTargets(true);
	}, 500));
});
window.dispatchEvent(formProductEvt);


// Keeps cart upsell variant pickers native inside the side cart.
function isNativeCartUpsellSelect(el) {
	return el.closest('.product-recommendations.cart-upsell[data-template="side-cart"]') !== null;
}

// Converts native <select> elements into a custom searchable dropdown UI, and wires click/scroll/slider behaviors.
function selectRun(el) {
	if (isNativeCartUpsellSelect(el) || el.classList.contains('select-init')) return;

	const evt = new Event('change');
	const searchPlaceholder = el.getAttribute('data-search-placeholder') || '';
	el.setAttribute('tabindex', -1);

	if (el.querySelector('option[selected]:not([disabled], .disabled, [data-class="disabled"])')) {
		el.parentNode.classList.add('done');
	}

	if (isMobile) return;

	wrap(el, document.createElement('span'), 'select-wrapper');
	randomize(el);

	const selector = `#${el.id}[data-random="${el.dataset.random}"]`;

	const bvsel = new BVSelect({
		selector,
		searchbox: true,
		search_placeholder: searchPlaceholder,
		search_autofocus: true,
		offset: false
	});

	const links = el.nextSibling.querySelectorAll('.bv_ul_inner a');

	links.forEach((em) => {
		em.addEventListener('click', () => {
			const optionItem = em.closest('li');
			if (
				optionItem &&
				(optionItem.classList.contains('bv_disabled') || optionItem.classList.contains('disabled'))
			) {
				return;
			}

			el.dispatchEvent(createProductSelectChangeEvent(em));
			const group = em.closest('.form-group');
			if (group) group.classList.remove('is-invalid');

			if (em.parentNode.classList.contains('has-scroll')) {
				const target = document.querySelector(em.getAttribute('href'));
				if (target) target.scrollIntoView();
			}

			const slideTo = em.getAttribute('data-slide-to');
			if (slideTo !== null) {
				const li = em.closest('li');
				if (li) {
					const swiperHolder = li.querySelector('.s4wi');
					if (swiperHolder && swiperHolder.children && swiperHolder.children[0] && swiperHolder.children[0].swiper) {
						swiperHolder.children[0].swiper.slideTo(slideTo);
					}
				}
			}
		});
	});

	const bvAtual = el.parentNode.getElementsByClassName('bv_atual');

	const css_selects = fp('styles/async-select.css', 'async_select_css');
	const applyCss = () => new_css('css-select', css_selects);

	for (const em of bvAtual) {
		em.addEventListener('click', applyCss, {
			once: true
		});
		em.addEventListener('focus', applyCss, {
			once: true
		});
	}

	el.classList.add('select-init');
}

const semanticSelectEvt = new CustomEvent('semanticSelect');
function initSemanticSelects(root) {
	root = root || document;

	const selectTags = Array.from(
		root.querySelectorAll('select[id]:not(.semantic-select-initialized):not(.js-hidden)')
	).filter((el) => !isNativeCartUpsellSelect(el));
	if (!selectTags.length || isMobile) return;

	loadRes(js_selects, function () {
		for (const el of selectTags) {

			el.classList.add('semantic-select-initialized');

			const closestPopup = el.closest('[class^="popup-"]:not(html):not(.rendered)');
			const isInsideBoxOuter = el.closest('.box-outer') !== null;

			if ((closestPopup === null || isInsideBoxOuter) && el.querySelector('option')) {
				selectRun(el);
			}
		}
	}, 'selects-loaded');
}

window.addEventListener('semanticSelect', function () {
	initSemanticSelects(document);
});
window.dispatchEvent(semanticSelectEvt);


// .m6pr - updates the vertical offset CSS variable for product module backgrounds on small screens to create a sticky scroll effect.
function updateBgDist() {
	if (!mediaMax760.matches) return;

	requestAnimationFrame(() => {
		const module_product_bg = document.querySelector('.m6pr[style*="--m6pr_bg:"]');
		if (!module_product_bg) return;

		const container = module_product_bg.querySelector('.l4pr-container');
		if (!container) return;

		const offset = -container.getBoundingClientRect().top;
		module_product_bg.style.setProperty('--bg_dist', `${offset}px`);
	});
}

const moduleProductBackgroundEvt = new CustomEvent('moduleProductBackground');
window.addEventListener('moduleProductBackground', function () {
	const module_product = document.querySelector('.m6pr');
	const module_collection = document.getElementsByClassName('m6cl');

	if (!module_collection.length) return;

	for (const container of module_collection) {
		const elements = container.querySelectorAll('.l4cl.slider:not(.w12, .w14, .w16, .w20, .w25, .w33, .w50)');
		for (const element of elements) {
			element.classList.add('in-col');
		}
	}

	if (!module_product && !(module_collection.length && module_collection[0].classList.contains('sticky'))) return;

	html_tag.classList.add('t1pr');

	if (module_product) {
		updateBgDist();
		mediaMax760.addEventListener('change', updateBgDist);
	}
});
window.dispatchEvent(moduleProductBackgroundEvt);


// .img-compare - initializes image comparison sliders for elements with two images, handling orientation, starting position, and optional labels
const imageCompareEvt = new CustomEvent('imageCompare');
window.addEventListener('imageCompare', function () {
	const imageCompareElements = document.getElementsByClassName('img-compare');
	if (!imageCompareElements.length) return;

	const compareCss = fp('styles/async-compare.css', 'async_compare_css');
	const compareJs = fp('js/plugin-compare.js', 'plugin_compare_js');

	loadRes(compareJs, function () {
		new_css('compare-css', compareCss);

		for (const el of imageCompareElements) {
			let verticalMode = el.classList.contains('vertical');
			let startingPoint = 50;
			let showLabels = false;
			let labelBefore = 'Before';
			let labelAfter = 'After';

			const imgs = el.querySelectorAll('img');
			if (imgs.length !== 2) continue;

			if (!verticalMode && global_dir[1] === false) {
				const first = el.children[0];
				el.appendChild(first.cloneNode(true));
				el.removeChild(first);
			}

			const dataStart = el.getAttribute('data-start');
			if (dataStart !== null) {
				startingPoint = global_dir[1] === false ? 100 - parseFloat(dataStart) : parseFloat(dataStart);
			}

			const dataLabelBefore = el.getAttribute('data-label-before');
			const dataLabelAfter = el.getAttribute('data-label-after');

			if (dataLabelBefore === '') el.classList.add('no-label-before');
			if (dataLabelAfter === '') el.classList.add('no-label-after');

			if (dataLabelBefore !== null || dataLabelAfter !== null) {
				showLabels = true;
				labelBefore = dataLabelBefore !== null ? dataLabelBefore : (el.classList.add('no-label-before'), labelBefore);
				labelAfter = dataLabelAfter !== null ? dataLabelAfter : (el.classList.add('no-label-after'), labelAfter);
			}

			if (el.children.length === 2) {
				new ImageCompare(el, {
					verticalMode,
					startingPoint,
					showLabels,
					labelOptions: {
						before: labelBefore,
						after: labelAfter
					}
				}).mount();
			}
		}
	});
});
window.dispatchEvent(imageCompareEvt);


// input[type="date"] - replaces native date inputs with a custom datepicker for non-mobile devices, loading language support and applying formatting options
const datepicker_options = {
	orientation: 'bottom',
	format: 'yyyy-mm-dd',
	todayHighlight: true,
	language: global_lang
};

function initDatepickers(input_date) {
	input_date.forEach(function (el) {
		let minDate = el.getAttribute('data-min-date') === 'today' ? new Date() : null;
		let maxDate = el.getAttribute('data-max-days') != null ? new Date() : null;
		if (maxDate) maxDate.setDate(maxDate.getDate() + parseInt(el.getAttribute('data-max-days')));

		datepicker_options.minDate = minDate;
		datepicker_options.maxDate = maxDate;

		el.classList.add('datepicker-initialized');
		el.setAttribute('type', 'text');
		new Datepicker(el, datepicker_options);
	}, 'datepicker-loaded');
}

const inputDateEvt = new CustomEvent('inputDate');
window.addEventListener('inputDate', function (evt) {
	const input_date = document.querySelectorAll('input[type="date"]:not(.datepicker-initialized)');
	if (!input_date.length || isMobile) return;

	const datepicker_css = fp('styles/async-datepicker.css', 'async_datepicker_css');
	const datepicker_js = fp('js/plugin-datepicker.js', 'plugin_datepicker_js');

	new_css('datepicker-css', datepicker_css);

	const datepicker_path = isNotShopify() ?
		'js/datepicker-lang.js' :
		datepicker_path_global;

	loadRes(datepicker_js, function () {
		loadRes(datepicker_path, function () {
			initDatepickers(input_date);
		}, 'datepicker-lang-loaded');
	});
});
window.dispatchEvent(inputDateEvt);


// .l4ca - enables removing items from cart lists with animations, delayed removal, adds hover highlighting for nested items, and updates empty-cart states, including nested multi-item lists.
const cartRemoveBound = new WeakSet();

function cart_remove(el) {
	const hasDelay = el.hasAttribute('data-delay');
	let hide_delay = 1000;

	if (hasDelay) {
		const parsed = parseFloat(el.getAttribute('data-delay'));
		if (!Number.isNaN(parsed)) hide_delay = parsed;
	}

	for (const em of el.querySelectorAll('a .icon-trash, a .icon-x-circle')) {
		const link = em.closest('a');
		if (link && !link.classList.contains('remove')) link.classList.add('remove');
	}

	if (el.classList.contains('in-panel')) {
		for (const child of el.children) {
			if (child.querySelector('select')) child.classList.add('has-select');
		}
	}

	for (const em of el.querySelectorAll('a.remove')) {
		if (cartRemoveBound.has(em)) continue;

		const par = em.closest('li');
		if (!par) continue;

		cartRemoveBound.add(em);

		let timeout;

		const cleanupList = () => {
			const ul = par.closest('ul');
			if (!ul) return;

			const visibleLi = [];
			for (const li of ul.children) {
				if ([...li.classList].every(cls => !cls.startsWith('has-l4'))) visibleLi.push(li);
			}

			if (visibleLi.length < 2) ul.classList.add('is-empty');

			const parNext = par.nextElementSibling;
			if (parNext && [...parNext.classList].some(cls => cls.startsWith('has-l4'))) parNext.remove();
		};

		em.addEventListener('click', function (e) {
			asyncCSS();

			if (!hasDelay) {
				cleanupList();
				par.remove();
				e.preventDefault();
				return;
			}

			if (!par.classList.contains('removing')) {
				par.classList.add('removing');

				timeout = setTimeout(() => {
					if (par.classList.contains('removing')) {
						par.classList.add('removing2');

						setTimeout(() => {
							cleanupList();
							par.remove();
						}, 400);
					}
				}, hide_delay);
			} else {
				par.classList.remove('removing');
				cartRemoveHidden();
				clearTimeout(timeout);
			}

			e.preventDefault();
		});
	}
}

const cartRemoveHidden = () => {
	const cartEmpty = document.querySelector('#cart .empty.hidden');
	if (cartEmpty && !document.querySelector('#cart .l4ca > li')) {
		cartEmpty.classList.remove('hidden');
	}

	const formCartEmpty = document.querySelector('.cart-empty.hidden');
	if (formCartEmpty && !document.querySelector('.form-cart .l4ca > li')) {
		formCartEmpty.classList.remove('hidden');
		const sibling = formCartEmpty.nextElementSibling;
		if (sibling) sibling.classList.add('hidden');
	}
};

const cartHoverRange = function (em, on) {
	let anchor = em;

	if (em.classList.contains('nested')) {
		const found = prevUntil(em, 'li:not(.nested)');
		if (found) anchor = found;
	}

	anchor.classList.toggle('hover', on);

	const nested = nextUntil(anchor, 'li:not(.nested)', 'li.nested');
	for (const li of nested) {
		li.classList.toggle('hover', on);
	}
};

const listCartEvt = new CustomEvent('listCart');
const listCartHoverBound = new WeakSet();
window.addEventListener('listCart', function () {
	const listCart = document.querySelectorAll('.l4ca');
	const listMult = document.querySelectorAll('.l4ml');

	if (listCart.length) {
		for (const el of listCart) {
			cart_remove(el);

			if (!listCartHoverBound.has(el)) {
				listCartHoverBound.add(el);

				el.addEventListener('mouseover', function (e) {
					const em = e.target.closest('li');
					if (!em || !el.contains(em)) return;

					if (e.relatedTarget && em.contains(e.relatedTarget)) return;

					cartHoverRange(em, true);
				});

				el.addEventListener('mouseout', function (e) {
					const em = e.target.closest('li');
					if (!em || !el.contains(em)) return;

					if (e.relatedTarget && em.contains(e.relatedTarget)) return;

					cartHoverRange(em, false);
				});
			}
		}
		//removeHidden();
	}

	const listCartInnerLink = document.querySelectorAll('.show-l4ca:not(.toggle-l4ca-initialized)');
	for (const el of listCartInnerLink) {
		el.classList.add('toggle-l4ca-initialized');
		el.addEventListener('click', function (e) {
			const li = el.closest('li');
			if (li) li.classList.toggle('toggle-l4ca');
			e.preventDefault();
		});
	}

	if (listMult.length) {
		for (const el of listMult) {
			if (!el.closest('.l4ca')) cart_remove(el);
		}
	}
});
window.dispatchEvent(listCartEvt);


// #search - manages full and compact search UI, handling input focus, live search, clearing, toggles, accessibility, and responsive behavior with overlays.
function removeTextSearch() {
	if (!search_id || !search_input || !search_input.length) return;

	html_tag.classList.remove('search-full', 'user-form-active');
	html_tag.classList.add('search-cleared');
	search_id.classList.remove('has-text', 'not-empty');

	const input = search_input[0];
	input.value = '';
	input.focus();

	if (document.activeElement !== input) {
		setTimeout(() => input.focus(), 250);
	}
}

function clearCompactSearch() {
	if (!search_id) return;

	html_tag.classList.remove('search-compact-active', 'search-full', 'search-full-mode', 'user-form-active');
	search_id.classList.remove('full', 'has-text', 'not-empty');

	const fieldset = search_id.querySelector('fieldset');
	if (fieldset) negTabIn(fieldset);

	if (search_input && search_input.length) search_input[0].value = '';
}

function overlayClose(n) {
	html_tag.classList.remove('search-compact-active', 'search-full', 'search-full-mode', 'user-form-active', 'nav-hover', 'f8fl-open');
	removeM2A();

	if (search_id) search_id.classList.remove('full', 'has-text', 'not-empty');
	if (search_input && search_input.length) search_input[0].value = '';

	if (nav_id) clear_mobile_nav();

	[nav_top_id, nav_bar_id, nav_user_id].forEach(nav => {
		if (nav) remove_active_submenus(nav.querySelectorAll('a.toggle'));
	});

	if (!n && module_panel.length) hidePanels();
}

const searchEvt = new CustomEvent('search');
window.addEventListener('search', () => {
	if (!search_id) return;

	const input = (search_input && search_input.length > 0) ? search_input[0] : null;
	let searchLinksAppended = false;

	// --- Helper functions ---
	const appendSearchLinks = () => {
		if (searchLinksAppended) return;

		append_url(search_id, 'Toggle', 'toggle');
		append_url(search_id, 'Toggle', 'toggle');

		const formP = search_id.querySelector('form > p, fieldset > p');
		append_url(formP, 'Clear', 'clear-toggle');
		append_url(formP, 'Clear', 'search-back');

		const searchBack = search_id.querySelector('.search-back');
		if (searchBack) {
			searchBack.setAttribute('aria-controls', 'search');
			searchBack.setAttribute('href', '#' + search_id.getAttribute('id'));
		}

		searchLinksAppended = true;
	};

	const setupNegTabIn = (mediaQuery) => {
		const cb = () => {
			if (mediaQuery.matches) {
				const fieldset = search_id.querySelector('fieldset');
				if (fieldset) negTabIn(fieldset);
			}
		};
		cb();
		mediaQuery.addEventListener('change', cb);
	};

	const hideSearch = (event) => {
		if (!(event.target.getAttribute('aria-controls') === 'search' || (event.target.closest('a[aria-controls]') && event.target.closest('a[aria-controls]').getAttribute('aria-controls') === 'search') || event.target.closest('#search') || event.target.closest('.user-login'))) {
			clearCompactSearch();
		}
	};

	const compactSearch = () => {
		if (html_tag.classList.contains('search-compact-active')) {
			clearCompactSearch();
			return;
		}

		new_css('css-search', css_search);

		const classesToAdd = [];
		if (search_id.classList.contains('wide') && search_id.classList.contains('text-center-sticky')) classesToAdd.push('has-search-wide');
		if (search_id.classList.contains('m-pos-up')) classesToAdd.push('m-pos-up');
		classesToAdd.push('search-compact-active');
		html_tag.classList.add(...classesToAdd);

		html_tag.classList.remove('user-form-active', 'nav-hover', 'search-full-mode', 'f8fl-open');
		removeM2A();

		search_id.classList.remove('full', 'has-text', 'not-empty');

		if (input) {
			input.value = '';
			input.focus();
			if (document.activeElement !== input) setTimeout(() => input.focus(), 250);
		}

		const fieldset = search_id.querySelector('fieldset');
		if (fieldset) posTabIn(fieldset);
	};

	// --- Event listeners ---
	if (!isMobile) search_id.addEventListener('mousemove', appendSearchLinks, asyncOnce);
	search_id.addEventListener('keyup', appendSearchLinks, asyncOnce);
	search_id.addEventListener('touchstart', appendSearchLinks, asyncPass);
	search_id.addEventListener('scroll', appendSearchLinks, asyncPass);

	// --- Compact search setup ---
	if (search_id.classList.contains('compact')) {
		const searchCompactCont = document.createElement('span');
		let hideOnMobile = false;

		if (nav_user_id && nav_user_id.querySelectorAll('li.search.mobile-only').length) hideOnMobile = true;

		searchCompactCont.classList.add('search-compact-cont');
		append_url(searchCompactCont, 'Close', 'search-compact-toggle', '#search');

		const toggleEl = searchCompactCont.getElementsByClassName('search-compact-toggle');
		if (toggleEl.length) toggleEl[0].setAttribute('aria-controls', 'search');

		if (hideOnMobile) {
			searchCompactCont.classList.add('mobile-hide');
			html_tag.classList.add('t1srn');
		}
		if (search_id.classList.contains('blur')) html_tag.classList.add('search-blur');
	}

	if (search_id.classList.contains('compact') && !search_id.classList.contains('compact-desktop') && !search_id.classList.contains('compact-mobile')) {
		const fieldset = search_id.querySelector('fieldset');
		if (fieldset) negTabIn(fieldset);
	} else if (search_id.classList.contains('compact-mobile')) {
		setupNegTabIn(mediaMax760);
	} else if (search_id.classList.contains('compact-desktop')) {
		html_tag.classList.add('compact-desktop');
		setupNegTabIn(mediaMin760);
	}

	if (search_id.classList.contains('no-overlay')) html_tag.classList.add('no-search-overlay');

	// Click inside search
	search_id.addEventListener('click', (e) => {
		const target = e.target;
		if (target.matches('a.clear-toggle')) {
			removeTextSearch();
			e.preventDefault();
		}

		if (target.matches('a.toggle')) {
			clearCompactSearch();
			search_id.classList.remove('full', 'has-text', 'not-empty');
			html_tag.classList.remove('search-focus', 'search-full', 'search-full-mode', 'user-form-active');
			e.preventDefault();
		}
	});

	// Submit form
	search_id.addEventListener('submit', () => search_id.classList.add('processing'));

	// Live search placeholders
	const livesearchEl = document.getElementById('livesearch');
	let livesearch_placeholders = null;
	if (livesearchEl) {
		livesearch_placeholders = livesearchEl.querySelector('.search-placeholders');
	}

	// Input keyup/focus
	if (search_input && search_input.length > 0) {
		for (const el of search_input) {
			el.addEventListener('keyup', () => {
				removeM2A();
				if (el.value.length === 0 && !livesearch_placeholders) {
					html_tag.classList.remove('search-full', 'search-full-mode', 'user-form-active');
					search_id.classList.remove('full', 'has-text', 'not-empty', 'processing');
				} else {
					html_tag.classList.add('search-full', 'search-full-mode');
					search_id.classList.add('full', 'has-text', 'not-empty');
					if (!search_id.classList.contains('no-autocomplete')) {
						search_id.classList.add('processing');
						setTimeout(() => {
							if (typeof liveSearch === 'function') {
								liveSearch(el, livesearch_placeholders);
							}
						}, 300);
					}
				}
			});

			el.addEventListener('focus', () => {
				html_tag.classList.add('search-focus');
				html_tag.classList.remove('nav-hover');

				for (const nav of [nav_id, nav_top_id, nav_user_id, nav_bar_id]) {
					if (nav) remove_active_submenus(nav.querySelectorAll('a.toggle'));
				}

				new_css('css-search', css_search);

				if (livesearch_placeholders) {
					livesearchEl.innerHTML = '';
					livesearchEl.appendChild(livesearch_placeholders);
					html_tag.classList.add('search-full', 'search-full-mode');
					search_id.classList.add('full', 'has-text');
				}
			});
		}
	}

	// Top links
	if (top_id) {
		for (const el of top_id.querySelectorAll('[aria-controls="search"]')) {
			el.setAttribute('href', '#' + search_id.getAttribute('id'));
		}

		top_id.addEventListener('click', (e) => {
			if (e.target.matches('[aria-controls="search"]')) {
				compactSearch();
				appendSearchLinks();
				e.preventDefault();
			}
		});

		if (!isMobile) {
			top_id.addEventListener('mouseover', () => new_css('css-search', css_search));
			for (const el of top_id.querySelectorAll('[aria-controls="cart"]')) {
				el.addEventListener('mouseover', () => html_tag.classList.add('cart-hover'));
				el.addEventListener('mouseout', () => html_tag.classList.remove('cart-hover'));
			}
		}
	}

	// Hide search when clicking outside
	if (mediaMin760) {
		const setupListener = (e) => {
			if (e.matches) document.addEventListener('click', hideSearch);
			else document.removeEventListener('click', hideSearch);
		};
		setupListener(mediaMin760);
		mediaMin760.addEventListener('change', setupListener);
	}
});
window.dispatchEvent(searchEvt);


// .s1tt - initializes tooltips on elements by creating linked popups, adding info icons, and marking them as ready for display.
function runTooltips(el, index) {
	if (el.classList.contains('ready')) return;

	const innerText = el.innerHTML;

	const parentHeading = el.closest('p, h1, h2, h3, h4, h5, h6');
	if (parentHeading) parentHeading.classList.add('s1tt-cont');

	if (!el.getAttribute('data-panel') && !el.getAttribute('data-popup')) {
		const dataIndexValue = el.getAttribute('data-tooltip-id') || ('tip-' + index);

		if (el.tagName.toLowerCase() === 'a') {
			el.setAttribute('data-popup', dataIndexValue);
		} else {
			append_url(el, 'Popup', 's1tt-popup');
			const popupEl = el.querySelector('.s1tt-popup');
			if (popupEl) popupEl.setAttribute('data-popup', dataIndexValue);
		}

		if (!document.querySelector('.popup-a[data-title="' + dataIndexValue + '"]')) {
			const linkedPopup = document.createElement('div');
			linkedPopup.classList.add('popup-a', 'w360');
			linkedPopup.setAttribute('data-title', dataIndexValue);

			const hasBlockContent = /<(div|ul|ol|table|h[1-6]|section|article|blockquote)/i.test(innerText);
			const popupContent = document.createElement(hasBlockContent ? 'div' : 'p');
			popupContent.innerHTML = innerText;
			linkedPopup.appendChild(popupContent);

			root_id.appendChild(linkedPopup);
		}
	}

	const iconClass = el.getAttribute('data-icon') || 'icon-info';
	const icon = createElementWithClass('i', iconClass);
	icon.setAttribute('aria-hidden', 'true');
	el.appendChild(icon);

	el.classList.add('ready');
}

const schemeTooltipEvt = new CustomEvent('schemeTooltip');
window.addEventListener('schemeTooltip', () => {
	const tooltips = document.querySelectorAll('.s1tt:not(.ready)');
	for (const [index, el] of tooltips.entries()) {
		runTooltips(el, index);
	}
});
window.dispatchEvent(schemeTooltipEvt);


// a.link-more - toggles 'long' class on overflowing text, handles "More" links to reveal hidden content, and updates last-visible items on click.
function detectLong(el, container) {
	container.classList.toggle('long', el.clientHeight < el.scrollHeight);
}

const detectLongResize = throttle(() => {
	const infos = document.querySelectorAll('.info');
	if (!infos.length) return;

	for (const inInfo of infos) {
		const inner_p = inInfo.children[0];
		detectLong(inner_p, inInfo);
	}
}, 500);

window.addEventListener('resize', detectLongResize);

function handleInfoAndList(el) {
	const inInfo = el.closest('.info');
	if (!inInfo) return;

	// const inL4clHr = inInfo.closest('.l4cl.list');
	// if (!inL4clHr) return;

	const inner_p = inInfo.children[0];
	const hiddenParagraphs = inInfo.querySelectorAll('p.hidden, p:not(.link-more) .hidden');

	inInfo.classList.toggle('long', hiddenParagraphs.length > 0);

	if (hiddenParagraphs.length === 0) {
		detectLong(inner_p, inInfo);
	}
}

function linkMoreClick(e) {
	if (!e || !e.currentTarget) return;

	const current = e.currentTarget;
	if (!current) return;

	const parent = current.parentElement;
	if (!parent) return;

	const grandParent = parent.parentElement;
	if (!grandParent) return;

	const wasExpanded = grandParent.classList.contains('link-more-clicked');

	const hiddenElements = grandParent.querySelectorAll('.hidden, .was-hidden');
	for (const em of hiddenElements) {
		em.classList.toggle('hidden');
		em.classList.toggle('was-hidden');
	}

	grandParent.classList.toggle('link-more-clicked');

	if (mediaMax760.matches && wasExpanded && !grandParent.classList.contains('link-more-clicked')) {
		grandParent.scrollIntoView({
			behavior: 'smooth',
			block: 'center'
		});
	}

	const box = current.closest('.l4cl.box');
	if (box) lastVis(box);

	e.preventDefault();
}

const linkMoreEvt = new CustomEvent('linkMore');
window.addEventListener('linkMore', function () {
	const a_more = document.querySelectorAll('a.link-more:not(.link-more-initialized, .in-popup), .popup-a.shown a.link-more:not(.link-more-initialized)');
	if (!a_more.length) return;

	for (const el of a_more) {
		el.classList.add('link-more-initialized');

		const parent = el.parentElement;
		const grandParent = parent.parentElement;

		const limit = parseFloat(el.getAttribute('data-limit')) || 5;
		const inCheck = el.closest('.check');

		if (inCheck) {
			const hiddenElements = Array.from(inCheck.querySelectorAll(`li:nth-child(n+${limit + 1})`));
			for (const em of hiddenElements) {
				if (!em.classList.contains('link-more') && !em.classList.contains('hidden')) {
					em.classList.add('hidden');
				}
			}
		}

		handleInfoAndList(el);

		if (parent) {
			parent.classList.add('has-link-more');
		}

		const closestBox = el.closest('.l4cl.box');
		if (closestBox) lastVis(closestBox);

		const other_links = Array.from(grandParent.querySelectorAll('a.link-more'));
		other_links.forEach((link, index) => link.setAttribute('data-no', other_links.length - index));

		const href = el.getAttribute('href');
		if (!href || href === '#' || href === './') {
			el.addEventListener('click', linkMoreClick);
		}
	}
});
window.dispatchEvent(linkMoreEvt);


// .input-range - initializes custom noUiSlider range inputs: sets up single/multi sliders with tooltips, keeps them in sync with min/max input fields, and clones step markers for visual guidance.  
const rangeSliderEvt = new CustomEvent('rangeSlider')
window.addEventListener('rangeSlider', function (evt) {
	const input_range = document.querySelectorAll('.input-range:not(.slider-is-here)');
	if (!input_range.length) return;

	const sliders_css = fp('styles/async-ui-sliders.css', 'async_ui_sliders_css');
	const sliders_js = fp('js/plugin-sliders.js', 'plugin_sliders_js');
	const input_range_steps = document.querySelectorAll('.input-range-steps');

	loadRes(sliders_js, () => {
		new_css('form-sliders-css', sliders_css);
		const changeEvt = new Event('change');

		for (const el of input_range) {
			if (el.classList.contains('slider-is-here')) continue;

			const rangeInner = createElementWithClass('div', 'range-inner');
			el.appendChild(rangeInner);

			const dataMin = el.querySelector('input[min]');
			const dataMax = el.querySelector('input[max]');
			const dataEl = el.querySelector('input');

			let optConnect = true;
			let optStart = [parseFloat(dataMin.value), parseFloat(dataMax.value)];
			let isTooltip = el.classList.contains('tip');

			if (el.classList.contains('single')) {
				optConnect = 'lower';
				optStart = parseFloat(dataEl.value);
			}

			noUiSlider.create(rangeInner, {
				start: optStart,
				connect: optConnect,
				step: 1,
				direction: global_dir[0],
				range: {
					min: [parseFloat(dataMin.getAttribute('min'))],
					max: [parseFloat(dataMax.getAttribute('max'))]
				},
				tooltips: isTooltip,
				format: {
					to: value => Math.round(value),
					from: value => Math.round(value)
				}
			});

			rangeInner.noUiSlider.on('update', (values, handle) => {
				const target = handle ? dataMax : dataMin;
				target.value = parseFloat(values[handle]).toFixed();
			});

			rangeInner.noUiSlider.on('change', (handle) => {
				const target = handle ? dataMax : dataMin;
				target.dispatchEvent(changeEvt);
			});

			for (const sliderHandle of rangeInner.querySelectorAll('[role="slider"]')) {
				sliderHandle.setAttribute('aria-label', 'slider');
			}

			for (const input of el.querySelectorAll('input')) {
				input.addEventListener('blur', () => {
					const value = input.value.trim();
					if (value !== '') {
						const numValue = parseFloat(value);
						if (input.hasAttribute('min')) {
							rangeInner.noUiSlider.set([numValue, null]);
						} else if (input.hasAttribute('max')) {
							rangeInner.noUiSlider.set([null, numValue]);
						}
					}
				});
			}

			el.classList.add('slider-is-here');
		}

		if (input_range_steps.length) {
			for (const el of input_range_steps) {
				for (const child of el.children) {
					const wrapper = document.createElement('span');
					wrapper.className = 'inner';
					while (child.firstChild) wrapper.appendChild(child.firstChild);
					child.appendChild(wrapper);
				}

				const prevEl = el.previousElementSibling;
				if (prevEl && prevEl.classList.contains('input-range')) {
					const cloneMe = el.cloneNode(true);
					cloneMe.removeAttribute('class');
					cloneMe.classList.add('range-cloned');

					const noUiBase = prevEl.querySelector('.noUi-base');
					if (noUiBase) noUiBase.appendChild(cloneMe);
				}
			}
		}
	}, 'sliders-loaded');

});
window.dispatchEvent(rangeSliderEvt);


// .countdown - initializes countdown timers on '.countdown' elements with localized labels, hides original content, and removes the element or container when time expires. 
const countdownEvt = new CustomEvent('countdown');
window.addEventListener('countdown', function () {
	const countdowns = document.querySelectorAll('.countdown:not(.countdown-initialized)');
	const countdownContainers = document.getElementsByClassName('f8pr-shipping-timer');

	// Remove empty containers
	for (const container of countdownContainers) {
		if (container.children.length === 0) container.remove();
	}

	if (!countdowns.length) return;

	const countdown_js = fp('js/plugin-countdown.js', 'plugin_countdown_js');

	loadRes(countdown_js, () => {
		for (const el of countdowns) {
			el.classList.add('countdown-initialized');

			const container = el.closest('li, article');
			if (!container) continue;

			const now = new Date();
			const nowUTC = new Date(
				now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
				now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()
			);

			const showUntil = new Date(el.getAttribute('data-show-until'));
			const showFrom = new Date(el.getAttribute('data-show-from'));
			const showDays = el.getAttribute('data-show-days');

			const ended = () => {
				const endedShow = container.querySelector('.countdown-ended-show');
				const endedHide = container.querySelector('.countdown-ended-hide');

				if (endedShow && endedHide) {
					el.remove();
					endedHide.remove();
					endedShow.classList.remove('hidden');
				} else {
					container.remove();
				}
			};

			if (showFrom > now || now > showUntil || !showDays.includes(nowUTC.getDay())) {
				ended();
				continue;
			}

			// Wrap original content
			const wrapper = document.createElement('span');
			wrapper.className = 'hidden';
			while (el.firstChild) wrapper.appendChild(el.firstChild);
			el.appendChild(wrapper);

			// Localized words
			const words = {
				day: el.getAttribute('data-day') || 'day',
				days: el.getAttribute('data-days') || 'days',
				hour: el.getAttribute('data-hour') || 'hour',
				hours: el.getAttribute('data-hours') || 'hours',
				minute: el.getAttribute('data-minute') || 'minute',
				minutes: el.getAttribute('data-minutes') || 'minutes',
				second: el.getAttribute('data-second') || 'second',
				seconds: el.getAttribute('data-seconds') || 'seconds'
			};

			const renderCountdown = () => {
				if (el.classList.contains('done')) return;

				simplyCountdown(el, {
					year: showUntil.getFullYear(),
					month: showUntil.getMonth() + 1,
					day: showUntil.getDate(),
					hours: showUntil.getHours(),
					minutes: showUntil.getMinutes(),
					seconds: showUntil.getSeconds(),
					enableUtc: false,
					zeroPad: true,
					onEnd: ended,
					words: {
						days: {
							singular: words.day,
							plural: words.days
						},
						hours: {
							singular: words.hour,
							plural: words.hours
						},
						minutes: {
							singular: words.minute,
							plural: words.minutes
						},
						seconds: {
							singular: words.second,
							plural: words.seconds
						}
					}
				});

				el.classList.add('done');
				container.classList.add('done');
			};

			renderCountdown();
		}
	}, 'countdown-loaded');
});
window.dispatchEvent(countdownEvt);


// .l4cu - handles animated count-up values with symbol detection (e.g., +, %, currencies).
function renderListCount(em) {
	const specialMap = {
		'+': 'has-plus',
		'!': 'has-exc',
		'$': 'has-usd',
		'€': 'has-eur',
		'£': 'has-gbp',
		'¥': 'has-jpy',
		'₹': 'has-inr',
		'%': 'has-per',
		'★': 'has-str'
	};

	em.querySelectorAll('span.clone').forEach((el) => {
		let original = el.innerHTML;

		for (const char in specialMap) {
			if (original.includes(char)) {
				original = original.replaceAll(char, '');
				el.classList.add(specialMap[char]);
			}
		}

		if (/[+!$€£¥₹%★]$/.test(el.innerHTML)) {
			el.classList.add('after');
		}

		el.innerHTML = original;

		const decimals = original.includes('.') ? original.split('.')[1].length : 0;

		const value = parseFloat(el.getAttribute('data-val').replace(/[^\d.-]/g, ''));

		if (typeof CountUp === 'function') {
			const count = new CountUp(el, value, {
				decimalPlaces: decimals,
				duration: 3
			});
			if (!count.error) count.start();
		}
	});
}

const listCountEvt = new CustomEvent('listCount');
window.addEventListener('listCount', function (evt) {
	const list_count = document.querySelectorAll('.l4cu');

	if (!list_count.length) return;

	const list_count_js = fp('js/plugin-countup.js', 'plugin_countup_js');

	loadRes(list_count_js, function () {
		list_count.forEach(em => {
			em.querySelectorAll('span:first-child').forEach(el => {
				const cloneMe = el.cloneNode(true);
				const str = el.innerHTML;

				const wrapper = document.createElement('span');
				wrapper.className = 'main';

				while (el.firstChild) {
					wrapper.appendChild(el.firstChild);
				}
				el.appendChild(wrapper);

				cloneMe.classList.add('clone');
				cloneMe.setAttribute('data-val', str);
				el.appendChild(cloneMe);
				el.classList.add('cont');
			});

			const observer = new IntersectionObserver(entries => {
				entries.forEach(entry => {
					if (entry.isIntersecting) {
						renderListCount(em);
						observer.disconnect();
					}
				});
			});

			observer.observe(em);
		});
	}, 'countup-loaded');
});
window.dispatchEvent(listCountEvt);


// .l4al - manages alert lists by hiding/closing items with fade-out animation and marking container when all alerts are hidden.  
function countAlerts(container) {
	const hiddenItems = container.querySelectorAll('li.hidden').length;
	container.classList.toggle('all-hidden', container.children.length === hiddenItems);
}

const alertsEvt = new CustomEvent('alerts');
window.addEventListener('alerts', function () {
	const listAlerts = document.querySelectorAll('.l4al:not(.inline):not(.l4al-trustbadge)');

	for (const container of listAlerts) {
		countAlerts(container);
		asyncCSS();

		for (const btn of container.querySelectorAll('a.close')) {
			btn.addEventListener('click', e => {
				e.preventDefault();
				const li = btn.closest('li');
				li.classList.add('fade-me-out');
				setTimeout(() => {
					li.classList.add('hidden');
					countAlerts(container);
				}, 400);
			});
		}

		if (container.parentNode.id === 'root') {
			const delay = 5000;
			for (const li of container.querySelectorAll('li')) {
				setTimeout(() => li.classList.add('fade-me-out'), delay);
				setTimeout(() => {
					li.classList.add('hidden');
					countAlerts(container);
				}, delay + 400);
			}
		}
	}
});
window.dispatchEvent(alertsEvt);


// .link-print - initializes click handlers for .link-print elements and opens the native print dialog.
const linkPrintEvt = new CustomEvent('linkPrint');

window.addEventListener('linkPrint', function () {
	const link_print = document.querySelectorAll('.link-print');
	for (const el of link_print) {
		if (el.classList.contains('listening')) continue;
		el.classList.add('listening');
		el.addEventListener('click', function (e) {
			e.preventDefault();
			window.print();
		});
	}
});

window.dispatchEvent(linkPrintEvt);


// a[data-copy] - Copies text from data-copy attribute to clipboard and shows a temporary clicked state on the link.  
function copyToClipboardAsync(str) {
	if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
		return navigator.clipboard.writeText(str);
	}
	return Promise.reject('The Clipboard API is not available.');
}

const linkCopyEvt = new CustomEvent('linkCopy');
window.addEventListener('linkCopy', function () {
	const link_copy = document.querySelectorAll('a[data-copy]');
	if (!link_copy.length) return;

	for (const el of link_copy) {
		el.addEventListener('click', function (e) {
			e.preventDefault();
			el.classList.add('clicked');
			copyToClipboardAsync(el.dataset.copy).catch(() => {});
			setTimeout(function () {
				el.classList.remove('clicked');
			}, 2000);
		});
	}
});
window.dispatchEvent(linkCopyEvt);


// .scheme-tip - transforms elements into toggleable tooltips with open/close links and initializes interaction.  
const tooltipEvt = new CustomEvent('tooltip');
window.addEventListener('tooltip', function (evt) {
	const scheme_tip = document.getElementsByClassName('scheme-tip');
	if (!scheme_tip.length) return;

	for (const el of scheme_tip) {
		el.innerHTML = `
			<a class="tip-toggle" href="#"></a> 
			<span class="tip">
				<span class="tip-inner">${el.innerHTML}</span> 
				<a class="tip-toggle" href="#">Close</a>
			</span>
		`;

		const tipToggle = el.querySelector('a.tip-toggle');
		if (tipToggle) {
			tipToggle.addEventListener('click', function (e) {
				e.preventDefault();
				el.classList.toggle('toggle');
			});
		}

		el.classList.add('ready');
	}
});
window.dispatchEvent(tooltipEvt);


// .table-drop - enables expandable table rows by toggling visibility of subsequent rows until the next main row when a toggle link is clicked.
const tableDropEvt = new CustomEvent('tableDrop');
window.addEventListener('tableDrop', function () {
	const table_drop = document.getElementsByClassName('table-drop');
	if (!table_drop.length) return;

	for (const el of table_drop) {
		for (const tr of el.querySelectorAll('tr:not(.sub)')) {
			tr.classList.add('not-sub');
		}

		for (const toggle of el.querySelectorAll('a.toggle')) {
			toggle.addEventListener('click', function (e) {
				const tr = toggle.closest('tr');
				if (!tr) return;

				const nextRows = nextUntil(tr, '.not-sub');
				toggle.classList.toggle('active');

				for (const row of nextRows) {
					row.classList.toggle('hidden');
					row.classList.toggle('active');
				}

				e.preventDefault();
			});
		}
	}
});
window.dispatchEvent(tableDropEvt);


// [id^="section-"] - moves section ID into a span for accurate scroll anchoring.
const anchorEvt = new CustomEvent('anchor');
window.addEventListener('anchor', function () {
	const anchorEl = document.querySelectorAll('[id^="section-"]');
	if (!anchorEl.length) return;

	for (const el of anchorEl) {
		if (el.classList.contains('has-anchor')) continue;

		const span = document.createElement('span');
		span.className = 'anchor';
		span.id = el.id;

		el.classList.add('has-anchor');
		el.removeAttribute('id');
		el.appendChild(span);
	}
});
window.dispatchEvent(anchorEvt);


// .m6lm - enables expandable table rows by toggling visibility of subsequent rows until the next main row when a toggle link is clicked.
function checkHeight(el) {
	requestAnimationFrame(() => {
		if (!el.closest('.link-more-clicked')) {
			el.classList.toggle('high', el.scrollHeight > el.clientHeight);
		}
	});
}

const heightLimitEvt = new CustomEvent('heightLimit');
window.addEventListener('heightLimit', function (evt) {
	const module_limit = document.querySelectorAll('.m6lm:not(.m6lm-initialized)');
	if (!module_limit.length) return;

	for (const el of module_limit) {
		checkHeight(el);

		window.addEventListener('resize', throttle(() => {
			checkHeight(el);
		}, 500));

		const m6tbParent = el.closest('.m6tb');
		if (m6tbParent) {
			for (const tabHeader of m6tbParent.querySelectorAll('.tabs-header')) {
				tabHeader.addEventListener('click', () => {
					checkHeight(el);
				});
			}
		}
	}
});
window.dispatchEvent(heightLimitEvt);


// .m6cp - toggles the 'm6cp-open' class on the HTML tag when a product comparison module button is clicked.
const moduleCompareEvt = new CustomEvent('moduleCompare');
window.addEventListener('moduleCompare', function () {
	const moduleCompare = document.querySelectorAll('.m6cp');
	if (!moduleCompare.length) return;

	for (const el of moduleCompare) {
		const linkBtn = el.querySelector('.link-btn a[role="button"]');
		if (!linkBtn) continue;

		linkBtn.addEventListener('click', function (e) {
			e.preventDefault();
			html_tag.classList.toggle('m6cp-open');
		});
	}
});
window.dispatchEvent(moduleCompareEvt);


// a[data-share] - enables native share functionality on links with data-share attribute using the Web Share API.
const shareBtnsEvt = new CustomEvent('shareBtns');
window.addEventListener('shareBtns', function () {
	const shareBtns = document.querySelectorAll('a[data-share]');
	if (!shareBtns.length || !navigator.share) return;

	for (const el of shareBtns) {
		el.addEventListener('click', function (e) {
			e.preventDefault();
			navigator.share({
				title: document.title,
				url: el.getAttribute('data-share')
			});
		});
	}
});
window.dispatchEvent(shareBtnsEvt);


// [data-scroll] - scrolls the page to target elements specified in data-scroll on option change or element click, preventing default for links.
const dataScrollEvt = new CustomEvent('dataScroll');
window.addEventListener('dataScroll', function () {
	const dataScrollElements = document.querySelectorAll('[data-scroll]');
	if (!dataScrollElements.length) return;

	for (const el of dataScrollElements) {
		const isOption = el.tagName.toLowerCase() === 'option';
		const selector = el.getAttribute('data-scroll');

		const scrollHandler = (selectorToUse = selector) => {
			const targetElements = document.querySelectorAll(selectorToUse);
			if (targetElements.length) targetElements[0].scrollIntoView();
		};

		if (isOption) {
			const selectEl = el.parentNode;
			selectEl.addEventListener('change', () => {
				const selectedSelector = selectEl.options[selectEl.selectedIndex].getAttribute('data-scroll');
				if (selectedSelector) scrollHandler(selectedSelector);
			});
		} else {
			el.addEventListener('click', e => {
				scrollHandler();
				if (el.tagName.toLowerCase() === 'a') e.preventDefault();
			});
		}
	}
});
window.dispatchEvent(dataScrollEvt);


// Removes the default Shopify dynamic checkout CSS from the page to prevent style conflicts.
const removeSDCcssEvt = new CustomEvent('removeSDCcss');
window.addEventListener('removeSDCcss', function () {
	const shopifyDefaultCss = document.getElementById('shopify-dynamic-checkout');
	if (!shopifyDefaultCss) return;

	shopifyDefaultCss.remove();
});
window.dispatchEvent(removeSDCcssEvt);


// [data-slide-to] - syncs select option changes with a Swiper slider, navigating to the specified slide index.
const slideToEvt = new CustomEvent('slideTo');
const slideToSelectsBound = new WeakSet();
window.addEventListener('slideTo', function () {
	const dataUpdateGenericSlider = document.querySelectorAll('[data-slide-to]');
	if (!dataUpdateGenericSlider.length) return;

	for (const el of dataUpdateGenericSlider) {
		if (el.tagName.toLowerCase() !== 'option') continue;

		const select = el.parentNode;
		const closestLi = el.closest('li');
		if (!closestLi) continue;
		if (slideToSelectsBound.has(select)) continue;
		slideToSelectsBound.add(select);

		select.addEventListener('change', () => {
			const dx = select.options[select.selectedIndex].getAttribute('data-slide-to');
			if (dx === null) return;

			const findSwiper = closestLi.querySelector('.s4wi');
			if (findSwiper && findSwiper.children[0].swiper) {
				findSwiper.children[0].swiper.slideTo(dx);
			}
		});
	}
});
window.dispatchEvent(slideToEvt);


// .accordion-a - focuses the first non-checkbox/radio input inside an accordion section when it’s opened by clicking its label.
const accordionLabelEvt = new CustomEvent('accordionLabel');
window.addEventListener('accordionLabel', function () {
	const accordionContainer = document.querySelector('.accordion-a');
	if (!accordionContainer) return;

	accordionContainer.addEventListener('click', function (e) {
		const label = e.target.closest('summary label');
		if (!label) return;

		const details = label.closest('details');
		if (details && !details.open) {
			const input = details.querySelector('div input:not([type="checkbox"]):not([type="radio"])');
			if (input) setTimeout(() => input.focus(), 0);
		}
	});
});
window.dispatchEvent(accordionLabelEvt);


// Fancybox - initializes galleries for items with [data-fancybox], handling images, videos, model-viewers, carousel changes, and custom touch/zoom behaviors
function createFancyboxAndShowItem(itemIndex, fancyName) {
	function toogleTouchSupportOnItem(item, fancybox) {
		const touchStateForItem = item.type === "image";
		if (fancybox.Carousel.Panzoom.options.touch !== touchStateForItem) {
			fancybox.Carousel.Panzoom.options.touch = touchStateForItem;
			fancybox.Carousel.updatePanzoom();
		}
	}

	const showItems = [];
	const all_items = document.querySelectorAll('[data-fancybox="' + fancyName + '"]');
	for (const item of all_items) {
		const hrefItem = item.getAttribute('href');
		let src_type = null;
		let thumbImg = null;
		const caption = item.getAttribute('data-caption');
		const alt = item.getAttribute('data-alt');
		const title = item.getAttribute('data-title');

		const galleryThumb = item.getAttribute('data-gallery-thumb');
		if (galleryThumb) thumbImg = galleryThumb.trim();

		if (!thumbImg) {
			const imgElement = item.querySelector('img');

			if (imgElement) {
				thumbImg = imgElement.getAttribute('data-src') || imgElement.getAttribute('src') || '';
				thumbImg = thumbImg.trim();
			}
		}

		const cleanHref = (hrefItem || '').split('?')[0].split('#')[0].toLowerCase();

		if (endsWithAny(['.jpg', '.jpeg', '.gif', '.png', '.webp'], cleanHref)) src_type = 'image';
		else if (hrefItem && (hrefItem.indexOf('youtube.com/watch') !== -1 || hrefItem.indexOf('vimeo.com/') !== -1)) src_type = 'video';
		else if (endsWithAny(['.mp4', '.webm', '.ogg'], cleanHref)) src_type = 'html5video';

		if (!showItems.find(function (_item) {
				return _item.src === hrefItem;
			})) {
			showItems.push({
				src: hrefItem,
				type: src_type,
				preload: false,
				animated: false,
				caption: caption,
				thumb: thumbImg,
				baseClass: 'myCustomClass'
			});
		}
	}

	const fbox = new Fancybox(showItems, {
		startIndex: itemIndex || 0,
		Carousel: {
			Panzoom: {
				touch: true
			}
		},
		Html: {
			video: {
				autoplay: false
			}
		},
		hash: false,
		on: {
			ready: function (_fancybox) {
				toogleTouchSupportOnItem(_fancybox.items[_fancybox.Carousel.page], _fancybox);
				_fancybox.plugins.Thumbs.toggle();
				if (_fancybox.plugins.Thumbs.state === 'hidden') _fancybox.plugins.Thumbs.show();
			},
			done: function (_fancybox) {
				const slides = _fancybox.$container.querySelectorAll('div.fancybox__thumbs div.carousel__slide');
				if (slides.length < all_items.length) return;

				const thumbsEl = _fancybox.$container.querySelector('div.fancybox__thumbs');
				if (!thumbsEl) return;

				const ar_buttons = _fancybox.$container.querySelectorAll('div.fancybox__carousel model-viewer + [data-shopify-xr]');
				for (let i = 0; i < ar_buttons.length; i++) {
					ar_buttons[i].style.bottom = thumbsEl.offsetHeight + 23 + "px";
				}

				for (let i = 0; i < all_items.length; i++) {
					if (all_items[i].querySelectorAll('model-viewer').length > 0) slides[i].classList.add("has-cube");
				}

				const getClass = _fancybox.$container.querySelector('.fancybox__slide.is-selected');
				if (!getClass) return;
				_fancybox.$container.setAttribute('data-class', getClass.getAttribute('class'));
				const videoEl = getClass.querySelector('video');
				if (videoEl) videoEl.play();
			},
			"Carousel.change": function (_fancybox, carousel) {
				const iframes = _fancybox.$container.getElementsByTagName("iframe");
				for (let i = 0; i < iframes.length; i++) {
					const url = iframes[i].getAttribute('src');
					iframes[i].setAttribute('src', '');
					iframes[i].setAttribute('src', url);
				}

				setTimeout(function () {
					const getClass = _fancybox.$container.querySelector('.fancybox__slide.is-selected');
					if (!getClass) return;
					_fancybox.$container.setAttribute('data-class', getClass.getAttribute('class'));
					const videoEl = getClass.querySelector('video');
					if (videoEl) videoEl.play();
				}, 100);

				toogleTouchSupportOnItem(_fancybox.items[carousel.page], _fancybox);
			}
		}
	});
}

function bindModelViewerClickBlock(fancybox_name) {
	const modelViewers = document.querySelectorAll('[data-fancybox="' + fancybox_name + '"] model-viewer');

	for (let j = 0; j < modelViewers.length; j++) {
		const modelViewer = modelViewers[j];
		if (modelViewer.classList.contains('fancybox-model-initialized')) continue;

		modelViewer.classList.add('fancybox-model-initialized');
		modelViewer.addEventListener('click', function (ev) {
			ev.preventDefault();
			ev.stopPropagation();
			ev.cancelBubble = true;
			return false;
		});
	}
}

const fancyboxEvt = new CustomEvent('fancybox');

document.addEventListener('click', function (event) {
	if (event.target.closest('.carousel__button.fancybox__button--close')) {
		html_tag.classList.remove('fb-no-zoom');
	}
});

window.addEventListener('fancybox', function (evt) {
	const swipper_bullets = document.querySelectorAll('a.swiper-pagination-bullet');
	for (const [index, el] of swipper_bullets.entries()) {
		if (el.classList.contains('fancybox-bullet-initialized')) continue;

		el.classList.add('fancybox-bullet-initialized');
		el.addEventListener('click', function (e) {
			if (!el.classList.contains('has-more')) return true;

			const data_fancybox = document.querySelectorAll('[data-fancybox]');
			if (data_fancybox[index]) data_fancybox[index].click();
			return true;
		});
	}

	const data_fancybox = document.querySelectorAll('[data-fancybox]:not(.fancybox-initialized)');
	if (!data_fancybox.length) return;

	for (let i = 0; i < data_fancybox.length; i++) {
		const el = data_fancybox[i];
		el.classList.add('fancybox-initialized');
		const hrefItem = el.getAttribute('href');

		if (hrefItem.indexOf('youtube.com/watch') !== -1 || hrefItem.indexOf('vimeo.com/') !== -1) el.setAttribute('data-type', 'video');
		if (endsWithAny(['mp4', 'webm', 'ogg'], hrefItem)) el.setAttribute('data-type', 'html5video');

		el.addEventListener('click', function (e) {
			const fancybox_name = el.getAttribute('data-fancybox');
			if (!fancybox_name) {
				e.preventDefault();
				return;
			}

			const list = document.querySelectorAll('[data-fancybox="' + fancybox_name + '"]');
			const itemIndex = Array.prototype.indexOf.call(list, el);

			if (el.getAttribute('data-zoom') === 'false') html_tag.classList.add('fb-no-zoom');

			bindModelViewerClickBlock(fancybox_name);

			const fancybox_js = fp('js/plugin-fancybox.js', 'plugin_fancybox_js');
			const fancybox_css = fp('styles/async-fancybox.css', 'async_fancybox_css');

			loadRes(fancybox_js, function () {
				new_css('css-fancybox', fancybox_css);
				createFancyboxAndShowItem(itemIndex, fancybox_name);
			}, 'fancybox-loaded');

			e.preventDefault();
		});
	}
});

window.dispatchEvent(fancyboxEvt);


// a[data-youtube], a[data-vimeo] - embed and autoplay YouTube or Vimeo iframe when corresponding link is clicked
const videoLinksEvt = new CustomEvent('videoLinks');
window.addEventListener('videoLinks', function () {
	const videoLinks = document.querySelectorAll('a[data-youtube], a[data-vimeo]');

	if (!videoLinks.length) return;

	videoLinks.forEach(el => {
		el.addEventListener('click', e => {
			e.preventDefault();
			if (el.querySelector('iframe')) return;

			const iframe = document.createElement('iframe');
			iframe.classList.add('iframe-playing');
			iframe.setAttribute('frameborder', '0');
			iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
			iframe.setAttribute('allowfullscreen', '');

			let src = '';

			if (el.hasAttribute('data-youtube')) {
				src = 'https://www.youtube.com/embed/' + el.getAttribute('data-youtube') + '?autoplay=1&rel=0';
			} else if (el.hasAttribute('data-vimeo')) {
				src = 'https://player.vimeo.com/video/' + el.getAttribute('data-vimeo') + '?autoplay=1';
			}

			if (src) {
				iframe.setAttribute('src', src);
				el.appendChild(iframe);
			}
		});
	});
});
window.dispatchEvent(videoLinksEvt);


// .l4hs - initializes and manages interactive hotspots on elements, including toggles, legends, panels, responsive behavior, and associated CSS.
const hotspotsEvt = new CustomEvent('hotspots');
window.addEventListener('hotspots', function () {
	const list_hotspots = document.querySelectorAll('.l4hs:not(.l4hs-initialized)');

	if (!list_hotspots.length) return;

	const hotspots_css = fp('styles/async-hotspots.css', 'async_hotspots_css');
	new_css('css-hotspots', hotspots_css);

	for (const el of list_hotspots) {
		el.classList.add('l4hs-initialized');

		const figure = el.closest('figure');
		if (figure) figure.classList.add('has-l4hs');

		const hotspot_panels = el.getElementsByClassName('m6pn');
		for (const panel of hotspot_panels) {
			const root = document.querySelector('#root');
			if (root) root.appendChild(panel);
		}

		let closest = null;
		const list_hs_legend = document.getElementsByClassName('l4hs-l');
		if (list_hs_legend.length) closest = el.closest('article, .m6as, .m6ac, .m6fr, [class*="shopify-section"]');

		const toggles = el.getElementsByClassName('toggle');
		for (const en of toggles) {
			if (en.tagName.toLowerCase() === 'a') {
				en.addEventListener('click', function (e) {
					const pt = en.parentNode;
					const pt_leg = closest ? closest.querySelector('.l4hs-l') : null;
					let pt_index, pt_lg_ind;

					if (pt_leg) {
						pt_index = Array.from(pt.parentNode.children).indexOf(pt) + 1;
						pt_lg_ind = pt_leg.querySelector('li:nth-child(' + pt_index + ')');
					}

					new_css('css-hotspots', hotspots_css);

					if (!en.hasAttribute('data-panel') && !en.hasAttribute('data-popup')) {
						if (pt.classList.contains('toggle')) {
							pt.classList.remove('toggle');
							if (pt_leg && pt_lg_ind) pt_lg_ind.classList.remove('toggle');
						} else {
							for (const em of el.children) em.classList.remove('toggle');
							pt.classList.add('toggle');
							if (pt_leg) {
								for (const legLi of pt_leg.children) legLi.classList.remove('toggle');
								if (pt_lg_ind) pt_lg_ind.classList.add('toggle');
							}
						}
					}
					e.preventDefault();
				});
			}
		}

		for (const em of el.children) {
			let hds = em.offsetLeft;

			if (em.querySelector('.info')) em.classList.add('has-info');
			if (!global_dir[1]) hds = el.clientWidth - em.offsetLeft;
			if (hds > el.clientWidth * 0.5) em.classList.add('inv');
			if (em.offsetTop > el.clientHeight * 0.5) em.classList.add('inv-v');
		}

		if (list_hs_legend.length && closest) {
			const legends = closest.querySelectorAll('[class*="l4hs"] > li');
			for (const li of legends) {
				const closestLeg = li.closest('.l4hs-l');
				if (closestLeg) append_url(li, 'toggle', 'toggle');

				const closestDef = li.closest('.l4hs');
				const index = Array.from(li.parentNode.children).indexOf(li);

				if (closestDef) {
					const mobileLink = li.querySelector('a.desktop-hide');
					const relatedLi = closest.querySelector(`[class*="l4hs-l"] li:nth-child(${index + 1})`);
					if (mobileLink && relatedLi) {
						const clone = mobileLink.cloneNode(true);
						clone.classList.replace('desktop-hide', 'toggle-mobile');
						clone.classList.remove('toggle');
						relatedLi.appendChild(clone);
					}
				}

				const relatedLis = closest.querySelectorAll(`[class*="l4hs"] li:nth-child(${index + 1})`);
				if (relatedLis.length) {
					const toggleAnchor = li.querySelector('a.toggle');
					if (toggleAnchor) {
						toggleAnchor.addEventListener('mouseover', function () {
							for (const el of relatedLis) el.classList.add('hover');
						});
						toggleAnchor.addEventListener('mouseout', function () {
							for (const el of relatedLis) el.classList.remove('hover');
						});
						if (closestLeg) {
							toggleAnchor.addEventListener('click', function (e) {
								if (toggleAnchor.parentElement.classList.contains('toggle')) {
									for (const el of relatedLis) el.classList.remove('toggle');
								} else {
									for (const legend of legends) legend.classList.remove('toggle');
									for (const el of relatedLis) el.classList.add('toggle');
								}
								e.preventDefault();
							});
						}
					}
				}
			}
		}
	};
});
window.dispatchEvent(hotspotsEvt);


// .l4cl - initializes list-scrollable modules with hover image swaps, mobile clones, popup sliders, and responsive figure resizing.
const listScrollableColorImageBound = new WeakSet();
const listScrollableHoverSwapBound = new WeakSet();
const listScrollableHoverSwapImageBound = new WeakSet();
const listScrollableMobileImageCloned = new WeakSet();
const listScrollablePopupSliderBound = new WeakSet();
const listScrollableFigureResizeBound = new WeakSet();

function listScrollableHandleImages(li) {
	const dataImgElements = li.querySelectorAll('.check.color li[data-img]');
	const anyImg = li.querySelectorAll('figure img:not(.color-variant-img)');

	if (!anyImg.length) return;

	const firstImg = anyImg[0];
	const secondImg = firstImg;

	const productCard = li.closest('.product-card');
	let hasVariantPicker = null;
	if (productCard) {
		hasVariantPicker = productCard.querySelector('.variant-picker');
	}

	if (dataImgElements.length && firstImg) {
		if (hasVariantPicker) {
			for (const en of dataImgElements) {
				if (listScrollableColorImageBound.has(en)) continue;
				listScrollableColorImageBound.add(en);

				en.addEventListener('click', () => {
					const currentImages = li.querySelectorAll('figure img:not(.color-variant-img)');
					for (const eo of currentImages) {
						eo.src = en.dataset.img;
						if (eo.hasAttribute('srcset')) eo.removeAttribute('srcset');
					}
				});
			}
		} else {
			listScrollableSetupHoverSwap(li, dataImgElements, anyImg);
		}
	}
}

function listScrollableSetupHoverSwap(li, dataImgElements, anyImg) {
	if (!listScrollableHoverSwapBound.has(li)) {
		listScrollableHoverSwapBound.add(li);

		li.addEventListener('mouseover', () => {
			for (const img of li.querySelectorAll('picture img')) {
				if (!img.hasAttribute('data-src-initial')) img.dataset.srcInitial = img.src;
				if (!img.hasAttribute('data-srcset-initial') && img.srcset) img.dataset.srcsetInitial = img.srcset;
			}
		});
		li.addEventListener('mouseleave', () => {
			for (const img of li.querySelectorAll('picture img')) {
				img.src = img.dataset.srcInitial;
				if (img.dataset.srcsetInitial) img.srcset = img.dataset.srcsetInitial;
			}
		});
	}

	for (const en of dataImgElements) {
		if (listScrollableHoverSwapImageBound.has(en)) continue;
		listScrollableHoverSwapImageBound.add(en);

		en.addEventListener('mouseover', () => {
			const currentImages = li.querySelectorAll('figure img:not(.color-variant-img)');
			for (const eo of currentImages) {
				eo.src = en.dataset.img;
				if (en.dataset.srcsetInitial) eo.srcset = en.dataset.srcsetInitial;
				else eo.removeAttribute('srcset');
			}
		});
	}
}

function listScrollablePrependMobileImages(el) {
	const firstFigures = el.querySelectorAll('li:first-child figure.overlay');
	for (const fig of firstFigures) {
		const closestLi = fig.closest('li');
		if (!closestLi) continue;

		let hasClone = false;
		let sibling = el.previousElementSibling;
		while (sibling && sibling.classList && sibling.classList.contains('l4cl-figure-before')) {
			if (sibling.classList.contains('mobile-only')) {
				hasClone = true;
				break;
			}
			sibling = sibling.previousElementSibling;
		}

		if (hasClone) {
			listScrollableMobileImageCloned.add(fig);
			continue;
		}

		const clone = fig.cloneNode(true);
		clone.classList.add('mobile-only', 'l4cl-figure-before');
		closestLi.classList.add('mobile-hide');
		el.before(clone);
		listScrollableMobileImageCloned.add(fig);
	}
}

function listScrollableInitPopupSliders(el) {
	if (el.classList.contains('in-popup') && el.classList.contains('slider') && el.children.length > 3) {
		el.classList.add('im-sliding');
	}

	const pictures = el.querySelectorAll('picture.slider');

	for (const em of pictures) {
		const closestFig = em.closest('figure');
		const closestLi = em.closest('li');
		if (!closestFig || !closestLi) continue;
		if (listScrollablePopupSliderBound.has(em)) continue;
		listScrollablePopupSliderBound.add(em);

		let lbOverlays = [];
		let hasBg = false;

		if (em.getElementsByClassName('s1lb').length) {
			for (const child of em.getElementsByClassName('s1lb')) {
				hasBg = true;
				lbOverlays.push(child);
				child.remove();
			}
		}

		const initializeSlider = () => {
			if (closestFig.classList.contains('slider-ready')) return true;

			randomize(closestFig);
			create_slider(em, {
				direction: 'horizontal',
				allowTouchMove: false,
				loop: false,
				autoHeight: true,
				slidesPerView: 1,
				spaceBetween: 1,
				lazy: {
					loadPrevNext: true
				},
				breakpoints: {
					0: {
						allowTouchMove: el.classList.contains('mobile-scroll')
					},
					760: {
						allowTouchMove: !el.classList.contains('slider')
					}
				}
			});
			if (hasBg) lbOverlays.forEach(img => em.appendChild(img));
			closestFig.classList.add('slider-ready');

			return true;
		};

		if (!isMobile) {
			closestLi.addEventListener('mouseenter', initializeSlider);
		} else {
			const popupSliderObserver = new IntersectionObserver((entries, observer) => {
				for (const entry of entries) {
					if (entry.isIntersecting && initializeSlider()) {
						observer.unobserve(closestLi);
					}
				}
			});
			popupSliderObserver.observe(closestLi);
		}
	}
}

function listScrollableInitFigureSelectResize(el) {
	const selects = el.querySelectorAll('figure select');
	for (const select of selects) {
		const closestFig = select.closest('figure');
		const closestLi = select.closest('li');
		const closestForm = select.closest('form');
		if (!closestFig || !closestLi || !closestForm) continue;
		if (listScrollableFigureResizeBound.has(select)) continue;
		listScrollableFigureResizeBound.add(select);

		const updateHeight = () => {
			closestLi.style.setProperty('--dh', closestFig.offsetHeight - closestForm.offsetHeight + 'px');
		};

		closestLi.addEventListener('mouseenter', updateHeight);
		window.addEventListener('resize', throttle(updateHeight, 500));
	}
}

const listScrollableEvt = new CustomEvent('listScrollable');
window.addEventListener('listScrollable', function () {
	const listCollection = document.getElementsByClassName('l4cl');

	for (const el of listCollection) {
		const dataLi = el.querySelectorAll('li');

		if (el.classList.contains('box')) lastVis(el);

		if (el.parentNode.tagName.toLowerCase() === 'li') {
			el.parentNode.classList.add('has-l4cl', 'has-ul-class');
		}

		for (const li of dataLi) {
			listScrollableHandleImages(li);
		}

		listScrollablePrependMobileImages(el);

		listScrollableInitPopupSliders(el);

		listScrollableInitFigureSelectResize(el);
	}
});
window.dispatchEvent(listScrollableEvt);


// [data-popup] - initializes, loads, and controls all dynamic popups, including delayed triggers, focus handling, validation, blockers, and UI enhancements.
const popup_js = fp('js/plugin-popups.js', 'plugin_popups_js');
const popupFormsBound = new WeakSet();

function loadPopup(id, callback) {
	loadRes(popup_js, function () {
		const popup_css = fp('styles/async-popups.css', 'async_popups_css');
		new_css('css-popups', popup_css);

		const popups = document.querySelectorAll('[class^="popup-"]:not(html):not(.ready, .initialized-popup)');
		if (popups.length) {
			popups.semanticPopup();
		}

		openPopup(id);

		const popupEl = document.getElementById(id);
		if (!popupEl) return true;

		for (const el of popupEl.querySelectorAll('[tabindex="-1"]')) {
			el.removeAttribute('tabindex');
		}

		for (const el of popups) {

			const isRendered = el.classList.contains('rendered');
			if (isRendered) continue;

			/*if (typeof semanticTabs === 'function') {
				const tabs = el.getElementsByClassName('m6tb');
				for (const tab of tabs) {
					semanticTabs(tab);
				}
			}*/

			for (const formEl of el.querySelectorAll('.f8vl')) {
				validator_run(formEl);
			}

			for (const ctrl of el.querySelectorAll('a[data-enable], input[data-enable], button[data-enable]')) data_show_me(ctrl);
			for (const ctrl of el.querySelectorAll('a[data-disable], input[data-disable], button[data-disable]')) data_hide_me(ctrl);
			for (const ctrl of el.querySelectorAll('a[data-toggle], input[data-toggle], button[data-toggle]')) data_togg_me(ctrl);

			const tooltips = el.querySelectorAll('.s1tt');
			tooltips.forEach((t, idx) => runTooltips(t, idx));

			const selects = el.getElementsByTagName('select');
			if (selects.length && !isMobile) {
				loadRes(js_selects, function () {
					for (const select of selects) {
						if (select.querySelector('option')) {
							selectRun(select);
						}
					}
				}, 'selects-loaded');
			}

			const formChildren = el.querySelectorAll(
				'form > *, fieldset > *, .no-zindex, .no-zindex > *, ' +
				'.has-select, .f8pr > *, .l4ca.compact.in-panel > *, ' +
				'.l4cl.box > li, .f8pr-bulk > *'
			);
			if (formChildren.length) assignIndex(formChildren);

			const amounts = el.getElementsByClassName('input-amount');
			if (amounts.length) {
				for (const amt of amounts) amountRun(amt);
				amountClick(amounts);
			}
		}


		const newsletter_popup = document.querySelector('.popup-a[data-title="newsletter-popup"]');
		if (newsletter_popup) {
			for (const btn of newsletter_popup.querySelectorAll('a.close')) {
				if (btn.getAttribute('data-newsletter-popup-bound') === '1') continue;
				btn.setAttribute('data-newsletter-popup-bound', '1');

				btn.addEventListener("click", () => {
					Cookies.set('has-newsletter', 'no', {
						sameSite: 'none',
						secure: true
					});
				});
			}
			const form = newsletter_popup.querySelector('form');
			if (form && form.getAttribute('data-newsletter-popup-bound') !== '1') {
				form.setAttribute('data-newsletter-popup-bound', '1');

				form.addEventListener("submit", () => {
					Cookies.set('has-newsletter', 'no', {
						sameSite: 'none',
						secure: true
					});
				});
			}
		}

		if (popupEl.classList.contains('popup-blocker')) {

			html_tag.classList.add('page-blocked');

			const blockers = document.querySelectorAll('.popup-blocker a.close');
			const nonBlocked = document.querySelector('[data-popup-delay][data-title]:not(.popup-blocker)');

			for (const closeBtn of blockers) {
				if (closeBtn.getAttribute('data-popup-blocker-bound') === '1') continue;
				closeBtn.setAttribute('data-popup-blocker-bound', '1');

				closeBtn.addEventListener('click', function (event) {
					event.preventDefault();
					Cookies.set('age', 'old', {
						sameSite: 'none',
						secure: true
					});
					html_tag.classList.remove('page-blocked');

					if (nonBlocked) delayHandler(nonBlocked);
				});
			}
		}

		if (!html_tag.classList.contains(id + '-loaded')) {

			if (typeof callback === 'function') {
				callback();
			}

			html_tag.classList.add(id + '-loaded');
		}
		return true;

	}, 'popup-loaded');
};

function popupFocus(im) {
	setTimeout(function () {
		const container = document.querySelector('[data-title="' + im + '"]');
		if (!container) return;

		const focusable = container.querySelector('a, input, button, select, textarea, [role="button"]');
		if (focusable) focusable.focus();
	}, 100);
}

function delayHandler(el) {
	let proceed = false;
	const title = el.getAttribute('data-title');
	const delay = parseFloat(el.getAttribute('data-popup-delay')) || 0;

	if (title === 'newsletter-popup') {
		if (Cookies.get('has-newsletter') !== 'no') {
			proceed = true;
		}
	} else {
		proceed = true;
	}

	if (!proceed) return;

	if (delay === 0) {
		loadPopup(title);
		popupFocus(title);
	} else {
		setTimeout(function () {
			loadPopup(title);
			popupFocus(title);
		}, delay);
	}
}

const popupsEvt = new CustomEvent('popups');
window.addEventListener('popups', function () {
	const popupLinks = document.querySelectorAll('a[data-popup]:not(.initialized-popup)');
	for (const link of popupLinks) {
		link.classList.add('initialized-popup');

		link.addEventListener('click', function (event) {
			event.preventDefault();

			const popupName = this.getAttribute('data-popup');

			hidePanels();
			loadPopup(popupName, function () {
				setTimeout(() => {
					window.dispatchEvent(linkMoreEvt);
				}, 300);
				window.dispatchEvent(productVariantsEvt);
				window.dispatchEvent(formValidateEvt);
				ajaxCart.init();
				quickShop.init();
			});

			popupFocus(popupName);
		});
	}

	const formPopups = document.querySelectorAll('form[data-popup]');
	for (const form of formPopups) {
		if (popupFormsBound.has(form)) continue;

		if (!form.classList.contains('f8vl')) {
			popupFormsBound.add(form);

			form.addEventListener('submit', function (event) {
				event.preventDefault();
				const popupName = this.getAttribute('data-popup');
				loadPopup(popupName);
				popupFocus(popupName);
			});
		}
	}

	const delayedPopups = document.querySelectorAll('[data-popup-delay][data-title]');
	if (delayedPopups.length) {
		const nonBlocked = document.querySelector('[data-popup-delay][data-title]:not(.popup-blocker)');
		const ageCookie = Cookies.get('age');

		for (const el of delayedPopups) {
			const isBlocker = el.classList.contains('popup-blocker');

			if (isBlocker) {
				if (ageCookie === undefined) {
					delayHandler(el);
				} else if (nonBlocked) {
					delayHandler(nonBlocked);
				}
			} else if (!document.querySelector('.popup-blocker')) {
				delayHandler(el);
			}
		}
	}
});
window.dispatchEvent(popupsEvt);


// textarea[maxlength] - "current/max" character counters for all textareas with a valid maxlength.
const textareaLockEvt = new CustomEvent('textareaLock');
window.addEventListener('textareaLock', function () {
	const textareas = document.querySelectorAll('textarea[maxlength]');
	if (!textareas.length) return;

	for (let i = 0; i < textareas.length; i++) {
		const ta = textareas[i];

		const maxStr = ta.getAttribute('maxlength');
		if (!maxStr) continue;

		const max = parseInt(maxStr, 10);
		if (!isFinite(max) || max <= 0) continue;

		const next = ta.nextElementSibling;
		if (next && next.classList && next.classList.contains('f8pr-textarea-counter')) {
			ensureCounter(ta, next, max);
			continue;
		}

		const counter = document.createElement('span');
		counter.classList.add('f8pr-textarea-counter');
		counter.setAttribute('aria-live', 'polite');

		ta.insertAdjacentElement('afterend', counter);

		ensureCounter(ta, counter, max);
	}

	function ensureCounter(textarea, counterEl, max) {
		const update = function () {
			let val = textarea.value || '';
			let len = val.length;

			if (len > max) len = max;
			counterEl.textContent = String(len) + '/' + String(max);
		};

		if (textarea.dataset && textarea.dataset.counterBound === '1') {
			update();
			return;
		}

		textarea.addEventListener('input', update, {
			passive: true
		});
		textarea.addEventListener('change', update, {
			passive: true
		});

		update();

		textarea.dataset.counterBound = '1';
	}
});
window.dispatchEvent(textareaLockEvt);


// DROPPED: .fly-img - adds a fly-to-cart animation by cloning the clicked item image and animating it toward the cart icon
/*const flyToCartEvt = new CustomEvent('flyToCart');
window.addEventListener('flyToCart', function () {
	const img_selector = '.fly-img img, img.fly-img';
	const cart_selector = '.shopify-section-header li.cart a';

	function prefers_reduced_motion() {
		if (!window.matchMedia) return false;
		return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	function find_closest(el, selector) {
		let node = el;
		while (node && node !== document) {
			if (node.matches && node.matches(selector)) return node;
			node = node.parentNode;
		}
		return null;
	}

	function rect_center(rect) {
		return {
			x: rect.left + rect.width / 2,
			y: rect.top + rect.height / 2
		};
	}

	function create_ghost(img, start_rect) {
		const ghost = img.cloneNode(true);
		ghost.className = (ghost.className ? ghost.className + ' ' : '') + 'fly-to-cart__ghost';

		ghost.style.width = start_rect.width + 'px';
		ghost.style.height = start_rect.height + 'px';
		ghost.style.left = '0px';
		ghost.style.top = '0px';
		ghost.style.opacity = '1';
		ghost.style.transform = 'translate3d(' + start_rect.left + 'px,' + start_rect.top + 'px,0) scale(1)';

		return ghost;
	}

	function animate_ghost(ghost, start_rect, end_rect) {
		const start_c = rect_center(start_rect);
		const end_c = rect_center(end_rect);

		const dx = end_c.x - start_c.x;
		const dy = end_c.y - start_c.y;

		const end_scale = Math.max(0.12, Math.min(0.28, end_rect.width / start_rect.width));

		if (ghost.animate) {
			const anim = ghost.animate(
				[
					{
						transform: 'translate3d(' + start_rect.left + 'px,' + start_rect.top + 'px,0) scale(1)',
						opacity: 1
					},
					{
						transform: 'translate3d(' + (start_rect.left + dx) + 'px,' + (start_rect.top + dy) + 'px,0) scale(' + end_scale + ')',
						opacity: 0.15
					}
				], {
					duration: 1000,
					easing: 'cubic-bezier(0.2, 0.9, 0.2, 1)',
					fill: 'forwards'
				}
			);

			anim.onfinish = function () {
				if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
			};

			return;
		}

		let start_ts = null;
		const duration = 650;

		function step(ts) {
			if (!start_ts) start_ts = ts;

			const t = Math.min(1, (ts - start_ts) / duration);
			const e = 1 - Math.pow(1 - t, 3);

			const x = start_rect.left + dx * e;
			const y = start_rect.top + dy * e;
			const s = 1 + (end_scale - 1) * e;
			const o = 1 + (0.15 - 1) * e;

			ghost.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) scale(' + s + ')';
			ghost.style.opacity = String(o);

			if (t < 1) {
				requestAnimationFrame(step);
				return;
			}

			if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
		}

		requestAnimationFrame(step);
	}

	function fly_from_img(img) {
		if (prefers_reduced_motion()) return;

		const cart = document.querySelector(cart_selector);
		if (!cart) return;

		const source = img.closest('a') || img.closest('button');
		if (!source) return;

		const img_rect = img.getBoundingClientRect();
		if (!img_rect || img_rect.width < 10 || img_rect.height < 10) return;

		const cart_rect = cart.getBoundingClientRect();
		if (!cart_rect || cart_rect.width < 5 || cart_rect.height < 5) return;

		const ghost = create_ghost(img, img_rect);
		document.body.appendChild(ghost);

		animate_ghost(ghost, img_rect, cart_rect);
	}

	document.addEventListener('click', function (e) {
		const target = e.target;
		if (!target) return;

		const source = target.closest('a, button');
		if (!source) return;

		const img = source.querySelector(img_selector);
		if (!img) return;

		fly_from_img(img);
	});
});
window.dispatchEvent(flyToCartEvt);*/


// DROPPED: .l4ft - initializes Masonry, adjusts parent <li> classes, marks single-child submenus, and refreshes layout on visibility or resize. 
/*const masonryEvt = new CustomEvent('masonry');
window.addEventListener('masonry', function () {
	const listFeatured = document.getElementsByClassName('l4ft');
	if (!listFeatured.length) return;

	const masonry_js = fp('js/plugin-masonry.js', 'plugin_masonry_js');
	loadRes(masonry_js, function () {
		for (const el of listFeatured) {
			const parent = el.parentNode;

			if (parent.tagName.toLowerCase() === 'li') {
				parent.classList.add('has-l4ft', 'has-ul-class');
			}

			const liSub = el.closest('li.sub');
			if (liSub && parent.parentNode.children.length === 1) {
				liSub.classList.add('no-sub');
			}

			if (el.classList.contains('cols')) {
				el.classList.add('masonry-initialized');

				const msnry = new Masonry(el, {
					itemSelector: 'li',
					originLeft: global_dir[1],
					percentPosition: true,
					transitionDuration: 0
				});

				const io = new IntersectionObserver(entries => {
					for (const entry of entries) {
						if (entry.isIntersecting) {
							msnry.reloadItems();
						}
					}
				});
				io.observe(el);

				window.addEventListener('resize', throttle(() => {
					msnry.reloadItems();
				}, 500));
			}
		}
	}, 'masonry-loaded');
});
window.dispatchEvent(masonryEvt);*/




/*! Modules -------------------------------------------------- */

// Replaces obfuscated email text when the element enters the viewport.
const aEmailEls = document.querySelectorAll('.email');
const aEmailObs = new IntersectionObserver((entries, obs) => {
	entries.forEach(entry => {
		if (entry.isIntersecting) {
			const el = entry.target;
			const tag = el.tagName.toLowerCase();

			if (tag !== 'input' && tag !== 'div') {
				const textNode = Array.from(el.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
				if (textNode) {
					textNode.textContent = textNode.textContent.replace('//', '@').replace(/\//g, '.');
				}

				if (tag === 'a') {
					el.setAttribute('href', 'mailto:' + (textNode ? textNode.textContent.trim() : el.innerText.trim()));
				}
			}

			obs.unobserve(el);
		}
	});
});
aEmailEls.forEach(el => aEmailObs.observe(el));


// .f8ps - prepare sticky product form: set body flags, hide it initially, and disable focusable elements
const form_product_sticky = document.querySelector('.f8ps');
if (form_product_sticky) {
	const isTopF8pr = form_product_sticky.classList.contains('align-top');

	html_tag.classList.add(isTopF8pr ? 'has-f8ps-top' : 'has-f8ps');
	html_tag.classList.add('product-not-scrolled');

	aria_hide(form_product_sticky);

	const focusables = form_product_sticky.querySelectorAll('a, input, button, select, textarea, [role="button"]');

	for (const el of focusables) {
		el.setAttribute('tabindex', '-1');
	}
}




// .m6pn - manages opening, closing, and accessibility of sidebar panels on product/cart pages, including focus handling, sticky footers, CSS loading, and interactive sliders.
function hidePanels() {
	module_panel = document.getElementsByClassName('m6pn');
	html_tag.classList.remove('m6pn-open', 'm6cp-open', 'f8fl-open');

	for (const el of module_panel) {
		el.classList.remove('toggle');
		el.setAttribute('aria-hidden', true);
		negTabIn(el);
	}

	const m6pn_clicked = document.querySelector('.m6pn-clicked');
	if (m6pn_clicked) {
		setTimeout(() => {
			if (typeof whatInput !== 'undefined' && typeof whatInput.ask === 'function' && whatInput.ask() === 'keyboard') {
				m6pn_clicked.focus();
			}
			a_module_panel.forEach(el => el.classList.remove('m6pn-clicked'));
		}, 100);
	}
}

function getStickyFooters() {
	const sticky_in_panel = document.querySelectorAll('.sticky-in-panel:not(.sticky-panel-initialized)');
	for (const eo of sticky_in_panel) {
		eo.classList.add('sticky-panel-initialized');
		if (!eo.classList.contains('is-sticky')) {
			if (!eo.querySelector('.offset-dist')) eo.prepend(createElementWithClass('div', 'offset-dist'));
			const observer = new IntersectionObserver(
				([e]) => e.target.parentElement.classList.toggle('is-sticky', e.intersectionRatio < 1), {
					threshold: [1, 0]
				}
			);
			observer.observe(eo.querySelector('.offset-dist'));
		}
	}
}

function openPanel(id) {
	const linked = document.querySelectorAll(`.m6pn[id="${id}"]`);
	const a_source = document.querySelectorAll(`a[data-panel="${id}"]`);

	overlayClose();
	asyncCSS();
	html_tag.classList.add('has-panels', 'm6pn-open');

	a_module_panel.forEach(em => em.classList.remove('m6pn-clicked'));
	a_source.forEach(em => em.classList.add('m6pn-clicked'));

	for (const el of module_panel) {
		el.setAttribute('aria-hidden', true);
		if (!el.querySelector('.m6pn-close:not(.strong)')) append_url(el, 'Close', 'm6pn-close');
		el.classList.remove('toggle');
		negTabIn(el);
		el.querySelectorAll('.l4pr.aside-pager').forEach(em => em.classList.remove('aside-pager'));
	}

	for (const el of linked) {
		el.classList.add('toggle');
		el.setAttribute('aria-hidden', false);
		posTabIn(el);

		if (window.XtraTheme && typeof window.XtraTheme.activateStandardViewEvents === 'function') {
			window.XtraTheme.activateStandardViewEvents(el);
		}

		setTimeout(() => {
			const firstFocusable = el.querySelector('a, input, button, select, textarea, [role="button"]');
			if (firstFocusable) firstFocusable.focus();

			el.querySelectorAll('[style*="--fih:"]').forEach(slider => {
				const firstFig = slider.querySelector('.swiper-slide-active figure');
				if (firstFig) slider.style.setProperty('--fih', firstFig.clientHeight ? firstFig.offsetHeight + 'px' : '');
			});
		}, 100);
	}

	const css_panels = fp('styles/async-panels.css', 'async_panels_css');

	if (document.getElementsByClassName('f8fl').length) {
		new_css('css-filters', css_filters);
		new_css('css-search', css_search);
	}

	getStickyFooters();
	new_css('css-panels', css_panels);
	if (linked[0].classList.contains('m6pr-compact')) new_css('product-css', css_product);
	if (linked[0].hasAttribute('data-delay')) setTimeout(() => hidePanels(), parseFloat(linked[0].getAttribute('data-delay')));
}

function handlePanelEvents(e) {
	const el = e.target;
	const panelElement = el.closest('a[data-panel]') || el;
	const panelId = panelElement.dataset.panel;

	if (!panelId || !((el.matches && el.matches('a[data-panel]')) || panelElement)) return;

	if (e.type === 'click' || (e.type === 'keyup' && e.key === ' ')) {
		const linked = document.querySelectorAll(`.m6pn[id="${panelId}"]`);
		if (linked.length) {
			if (!isNotShopify()) {
				if (panelId === 'cart') {
					if (document.getElementById('cart') != null) ajaxCart.load();
					else ajaxCart.load(false, true, false, true);
				} else openPanel(panelId);
			} else openPanel(panelId);

			e.preventDefault();
		}
		if (el.matches && el.matches('a[data-panel]') && e.type === 'click' && !el.href.includes('#') && linked.length) e.preventDefault();
	}
}

const modulePanelEvt = new CustomEvent('modulePanel');

let module_panel = document.querySelectorAll('.m6pn');
const a_module_panel = document.querySelectorAll('a[data-panel]');

if (module_panel.length) {
	document.addEventListener('click', e => {
		if (e.target.matches('a.m6pn-close, a.m6pn-close *')) {
			hidePanels();
			e.preventDefault();
		}
	});

	document.addEventListener('keyup', e => {
		if (e.key === ' ' && e.target.matches('a.m6pn-close, a.m6pn-close *')) {
			hidePanels();
			e.preventDefault();
		}
	});

	document.onkeydown = evt => {
		if ((evt || window.event).key === 'Escape') hidePanels();
	};

	for (const el of a_module_panel) {
		const id = el.dataset.panel;
		if (!id) continue;
		if (document.querySelector(`.m6pn[id="${id}"]`)) {
			el.setAttribute('aria-haspopup', 'true');
			el.setAttribute('aria-controls', id);
		}
	}

	window.dispatchEvent(modulePanelEvt);
}

document.addEventListener('click', handlePanelEvents);
document.addEventListener('keyup', handlePanelEvents);


// .m6cl & .f8sr - sets flags when .m6cl is marked sticky; also flag presence of .f8sr.mobile-sticky.
const m6clSticky = document.querySelector('.m6cl.sticky');
const f8srSticky = document.querySelector('.f8sr.mobile-sticky');
if (m6clSticky) {
	html_tag.classList.add('t1cl');
	if (f8srSticky) html_tag.classList.add('has-m6cl-sticky');
}




/*! Click Events -------------------------------------------------- */

// Handles global click events: toggles mobile language/currency dropdowns from the footer, closes open dropdowns when clicking outside, and marks limited links as clicked inside .check elements
document.addEventListener('click', event => {
	const clickedElement = event.target;

	// Trigger the mobile language/currency dropdown when the corresponding language or currency icon in the footer is clicked.
	const footerSelector = '.shopify-section-footer li.lang a[aria-controls="nav"], .shopify-section-footer li.currency a[aria-controls="nav"], .shopify-section-footer li.lang a[aria-controls="nav"] *, .shopify-section-footer li.currency a[aria-controls="nav"] *';

	if (clickedElement.matches(footerSelector)) {
		const targetLi = clickedElement.closest('li');
		if (targetLi && (targetLi.classList.contains('lang') || targetLi.classList.contains('currency'))) {
			const category = targetLi.classList.contains('lang') ? 'lang' : 'currency';
			const nv_cl = nav_id.querySelector(`.${category} > a.toggle:not(.toggle-back)`);

			if (nv_cl) {
				nv_cl.click();
				setTimeout(() => nv_cl.focus(), 100);
			}

			event.preventDefault();
			return;
		}
	}

	// Closes any open dropdowns when clicking outside them, while allowing interaction with nested links inside the dropdowns.
	const allOpen = document.querySelectorAll('[aria-expanded="true"]');
	if (allOpen.length > 0) {
		for (const el of allOpen) {
			if (el === clickedElement) continue;

			if (el.contains(clickedElement)) {
				const closestLink = clickedElement.closest('a:not(.toggle, .show)');
				if (closestLink && closestLink.contains(clickedElement)) {
					close_dropdown(el);
				}
				continue;
			}

			close_dropdown(el);
		}
	}

	// [data-limit] - adds 'limit-clicked' class to parent on clicking limited links inside .check elements and prevents default action.
	const checkLimit = clickedElement.closest('.check[data-limit] a.limit, .check[data-limit] .limit a');
	if (checkLimit) {
		checkLimit.closest('.check').classList.add('limit-clicked');
		event.preventDefault();
	}
});


// Closes mobile nav and clears search on Escape key, removing active submenu states from various navigation elements.
document.addEventListener('keydown', (event) => {
	event = event || window.event;
	if (event.key === 'Escape' || event.key === 'Esc') {
		close_mobile_nav();
		clearCompactSearch();

		if (nav_id) remove_active_submenus(nav_id.querySelectorAll('a.toggle'));
		if (nav_top_id) remove_active_submenus(nav_top_id.querySelectorAll('a.toggle'));
		if (nav_user_id) remove_active_submenus(nav_user_id.querySelectorAll('a.toggle'));
		if (nav_bar_id) remove_active_submenus(nav_bar_id.querySelectorAll('a.toggle'));

		for (const list of all_list_drop) {
			remove_active_submenus(list.querySelectorAll('a.toggle'));
		}
	}
});


// #nav - ensures mobile navigation links are keyboard-accessible only on mobile screens
let navTabIndexListenerAttached = false;
let navLinksCache = null;

function getNavLinks() {
	if (!nav_id) return [];
	if (!navLinksCache) {
		navLinksCache = Array.from(nav_id.querySelectorAll('a'));
	}
	return navLinksCache;
}

function updateNavTabIndexForMobile(isMenuOpen) {
	if (!mediaMax1000.matches) return;

	const navLinks = getNavLinks();
	for (const el of navLinks) {
		if (isMenuOpen) {
			el.removeAttribute('tabindex');
		} else {
			el.setAttribute('tabindex', '-1');
		}
	}
}


// Toggle visibility of password inputs and update parent styling based on input content
const a_show = document.querySelectorAll('a.show');
if (a_show.length) {
	for (const el of a_show) {
		const children = el.children;
		const input = el.parentElement.nextElementSibling;

		el.parentElement.classList.add('has-show');

		input.addEventListener('keyup', function () {
			if (input.value === '') {
				el.parentElement.classList.remove('not-empty');
			} else {
				el.parentElement.classList.add('not-empty');
			}
		});

		el.addEventListener('click', function (e) {
			e.preventDefault();
			el.classList.toggle('show-toggle');

			for (const child of children) {
				child.classList.toggle('hidden');
			}

			input.setAttribute('type', input.getAttribute('type') === 'password' ? 'text' : 'password');
		});
	}
}




/*! Touch Interactions -------------------------------------------------- */


// CLICK: 
// .shopify-section-announcement-bar-container - closes the  announcement bar when its close button is clicked.
document.addEventListener('click', function (e) {
	const btn = e.target.closest('.shopify-section-announcement-bar-container button.close');
	if (!btn) return;

	e.preventDefault();

	const top_bar = btn.closest('.shopify-section-announcement-bar-container');
	if (top_bar) removeNode(top_bar);

	html_tag.classList.add('announcement-bar-closed');

	if (!isShopifyDesignMode()) {
		try {
			localStorage.setItem('announcement-bar-closed', '1');
		} catch (err) {}
	}
});


// SCROLL
// Syncs scroll-based UI state: adds/removes <html> scroll classes (scrolled/scr2) and toggles the #totop button visibility using one rAF-throttled scroll handler.
const scrolled_threshold = 10;
const totop = document.getElementById('totop');

let lastTotopState = null;
let tickingScroll = false;

const addScrolledClass = () => {
	if (html_tag.classList.contains('scrolled')) return;
	html_tag.classList.add('scrolled', 'scr2');
};

const applyScrolledState = () => {
	if (html_tag.classList.contains('scrolled')) return;

	const y = window.scrollY || window.pageYOffset || 0;
	if (y > scrolled_threshold) addScrolledClass();
};

const applyTotopVisibility = () => {
	if (!totop) return;

	const y = window.scrollY || window.pageYOffset || 0;
	const scrolled = y > getViewportHeight();
	if (scrolled === lastTotopState) return;

	lastTotopState = scrolled;
	totop.classList.toggle('hidden', !scrolled);
};

const updateOnScroll = () => {
	tickingScroll = false;
	applyScrolledState();
	applyTotopVisibility();
};

const requestScrollUpdate = () => {
	if (tickingScroll) return;
	tickingScroll = true;
	requestAnimationFrame(updateOnScroll);
};

document.addEventListener('scroll', requestScrollUpdate, {
	passive: true
});
document.addEventListener('touchmove', requestScrollUpdate, {
	passive: true
});

window.addEventListener('pageshow', () => {
	requestAnimationFrame(() => requestAnimationFrame(updateOnScroll));
}, asyncPass);

window.addEventListener('load', () => {
	requestAnimationFrame(updateOnScroll);
}, asyncPass);


if (mediaMin760.matches) {
	window.addEventListener('resize', throttle(() => {
		html_tag.classList.remove('scrolled');
		requestScrollUpdate();
	}, 500));
}

updateOnScroll();


// SCROLL
/*// Adds 'scrolled' and 'scr2' classes to HTML on scroll, touchmove or once the page is scrolled past the threshold, removes only 'scrolled' on resize.
const scrolled_threshold = 10;

const addScrolledClass = () => {
	if (html_tag.classList.contains('scrolled')) return;
	html_tag.classList.add('scrolled', 'scr2');
};

const applyScrolledState = () => {
	if (html_tag.classList.contains('scrolled')) return;

	const y = window.scrollY || window.pageYOffset || 0;
	if (y > scrolled_threshold) addScrolledClass();
}

if (!html_tag.classList.contains('scrolled')) {
	if (mediaMin760.matches) {
		window.addEventListener('resize', throttle(() => {
			html_tag.classList.remove('scrolled');
		}, 500));
	}

	window.addEventListener('scroll', addScrolledClass, asyncPass);
	window.addEventListener('touchmove', addScrolledClass, asyncPass);
	
	window.addEventListener('pageshow', () => {
		requestAnimationFrame(() => {
			requestAnimationFrame(applyScrolledState);
		});
	}, asyncPass);

	window.addEventListener('load', () => {
		requestAnimationFrame(applyScrolledState);
	}, asyncPass);

	applyScrolledState();
}


// SCROLL
// #totop - toggles visibility of the "back to top" icon based on scroll position
let totop_id = document.getElementById('totop');

let lastScrolledState = null;

const applyScrolledPosition = () => {
	if (!totop) return;

	const scrolled = (window.scrollY || window.pageYOffset || 0) > viewportHeight;
	if (scrolled === lastScrolledState) return;

	lastScrolledState = scrolled;
	totop.classList.toggle('hidden', !scrolled);
}
document.addEventListener('scroll', () => {
	requestAnimationFrame(applyScrolledPosition);
}, {
	passive: true
});*/


// Manages CSS custom properties for header heights on different screen sizes (tablet and mobile).
let customHeaderT_ready = false;
let customHeaderT_timeout = 0;
let customHeaderT_lastH = null;

function customHeaderT() {
	if (customHeaderT_ready || customHeaderT_timeout || mediaMin1000.matches || !top_id || !nav_main) return;

	customHeaderT_timeout = setTimeout(() => {
		customHeaderT_timeout = 0;

		const h = top_id.clientHeight;

		if (h !== customHeaderT_lastH) {
			customHeaderT_lastH = h;
			html_tag.style.setProperty('--header_mih_c', `${h}px`);
		}

		customHeaderT_ready = true;
	}, 0);
}

function navMediaTab() {
	customHeaderT_ready = false;

	function firstInteraction() {
		removeListeners();
		customHeaderT();
	}

	function removeListeners() {
		if (!isMobile) {
			window.removeEventListener('mousemove', firstInteraction);
		}
		document.removeEventListener('keyup', firstInteraction);
		document.removeEventListener('touchstart', firstInteraction);
		document.removeEventListener('scroll', firstInteraction);
	}

	if (!isMobile) {
		window.addEventListener('mousemove', firstInteraction, asyncOnce);
	}

	document.addEventListener('keyup', firstInteraction, asyncOnce);
	document.addEventListener('touchstart', firstInteraction, asyncPass);
	document.addEventListener('scroll', firstInteraction, asyncPass);

	window.addEventListener('resize', throttle(() => {
		customHeaderT_ready = false;
		customHeaderT();
	}, 500));
}


let customHeaderM_ready = false;
let customHeaderM_timeout = 0;
let customHeaderM_lastH = null;


function customHeaderM() {
	if (customHeaderM_ready || customHeaderM_timeout || mediaMin760.matches || !header_outer || !header_inner || !requiredElementsExist) return;

	customHeaderM_timeout = setTimeout(() => {
		customHeaderM_timeout = 0;

		const h = header_outer.clientHeight;

		if (h !== customHeaderM_lastH) {
			customHeaderM_lastH = h;
			html_tag.style.setProperty('--sticky_offset_m', `${h}px`);
		}

		customHeaderM_ready = true;
	}, 0);
}

function navMediaM() {
	customHeaderM_ready = false;

	function firstInteractionM() {
		removeListenersM();
		customHeaderM();
	}

	function removeListenersM() {
		if (!isMobile) {
			window.removeEventListener('mousemove', firstInteractionM);
		}
		document.removeEventListener('keyup', firstInteractionM);
		document.removeEventListener('touchstart', firstInteractionM);
		document.removeEventListener('scroll', firstInteractionM);
	}

	if (!isMobile) {
		window.addEventListener('mousemove', firstInteractionM, asyncOnce);
	}

	document.addEventListener('keyup', firstInteractionM, asyncOnce);
	document.addEventListener('touchstart', firstInteractionM, asyncPass);
	document.addEventListener('scroll', firstInteractionM, asyncPass);

	window.addEventListener('resize', throttle(() => {
		customHeaderM_ready = false;
		customHeaderM();
	}, 500));
}


if (nav_main) {
	if (mediaTablet.matches) {
		navMediaTab();
	}

	mediaTablet.addEventListener('change', e => {
		if (e.matches) navMediaTab();
	});

	if (mediaMax760.matches) {
		navMediaM();
	}

	mediaMax760.addEventListener('change', e => {
		if (e.matches) navMediaM();
	});
}




/*! Shopify Events -------------------------------------------------- */

// DROPPED: .localization-form - binds localization links so clicking sets the locale/country input from data-value and submits the nearest form.
/*const localizationFormEvt = new CustomEvent('localizationForm');
window.addEventListener('localizationForm', function () {
	const links = document.querySelectorAll('.localization-form a:not(.listening)');
	if (!links.length) return;

	for (const el of links) {
		el.classList.add('listening');

		el.addEventListener('click', function (event) {
			event.preventDefault();

			const form = el.closest('form');
			if (!form) return;

			const input = form.querySelector('input[name="locale_code"], input[name="country_code"]');
			if (!input) return;

			input.value = el.dataset.value;
			form.submit();
		});
	}
});
window.dispatchEvent(localizationFormEvt);*/


// Sticky Add to Cart variant selector with the main product form, updating the selected variant on change.
const stickyAddToCartEvt = new CustomEvent('stickyAddToCart');
window.addEventListener('stickyAddToCart', function (evt) {
	const stickyAddToCart = document.querySelector('#product_id_sticky:not(.listening)');
	if (!stickyAddToCart) return;

	stickyAddToCart.classList.add('listening');
	stickyAddToCart.addEventListener('change', function (event) {
		let currentTarget = event.currentTarget
		setTimeout(function () {
			const select = document.querySelector('#main-product select[name="variant-id"]');
			if (select) {
				select.value = currentTarget.value;
				select.dispatchEvent(createProductSelectChangeEvent(currentTarget, false));
			} else {
				const inputs = document.querySelectorAll('#main-product input[type="radio"][name="variant-id"]');
				Array.from(inputs).forEach(function (input) {
					if (input.value == currentTarget.value) {
						input.checked = true;
						input.dispatchEvent(createProductSelectChangeEvent(currentTarget, false));
					} else {
						input.checked = false;
					}
				});
			}
		}, 1);
	});
});
window.dispatchEvent(stickyAddToCartEvt);


// Subscription selling plans - toggles required/active plan inputs depending on selected purchase option.
const sellingplansEvt = new CustomEvent('sellingplans');
window.addEventListener('sellingplans', function (evt) {
	const selling_plan_group_input = document.querySelectorAll('input[name="selling_plan_group"]:not(.listening)');
	const selling_plan_input = document.querySelectorAll('input[name="selling_plan"]');

	if (!selling_plan_group_input.length) return;

	for (const el of selling_plan_group_input) {
		el.classList.add('listening');

		var productFormTemplate = el.dataset.template,
			productForm = document.querySelector('.m6pr-' + productFormTemplate);
		el.addEventListener('change', function () {
			if (productForm.querySelector('input[id^="purchase_option_single"][name="selling_plan_group"]:checked') != null) {
				changeSellingPlanRequired(false, el.getAttribute('data-enable'));
			} else {
				changeSellingPlanRequired(true, el.getAttribute('data-enable'));
			}
		});
	}
	var changeSellingPlanRequired = function (addAttribute, container) {
		Array.from(selling_plan_input).forEach(function (el) {
			el.checked = false;
			el.removeAttribute('required');
			el.setAttribute('type', 'hidden');
			if (el.getAttribute('name')) {
				el.setAttribute('xname', el.getAttribute('name'));
				el.removeAttribute('name');
			}
			if (addAttribute && (el.closest('[data-element]').getAttribute('data-element') == container)) {
				el.setAttribute('required', 'required');
				el.setAttribute('type', 'radio');
				if (el.getAttribute('xname')) {
					el.setAttribute('name', el.getAttribute('xname'));
					el.removeAttribute('xname');
				}
			}
		});
	};
});
window.dispatchEvent(sellingplansEvt);


// Pickup availability - loads pickup availability for a selected variant via AJAX and opens the pickup info panel with updated content.
const pickupAvailabilityEvt = new CustomEvent('pickupAvailability');
window.addEventListener('pickupAvailability', function (evt) {
	var pickup_availability_anchor = document.querySelectorAll('[data-pickup-availability]:not(.listening)');
	const routeRoot = getShopifyRouteRoot();

	if (!pickup_availability_anchor.length) return;

	for (const el of pickup_availability_anchor) {
		el.classList.add('listening');

		el.addEventListener('click', function (e) {
			e.preventDefault();
			var selected_variant_id = el.dataset.id;
			fetch(routeRoot + 'variants/' + selected_variant_id + '/?section_id=pickup-availability')
				.then((response) => {
					if (!response.ok) {
						console.warn('Request failed:', response.status, response.statusText);
						return;
					}
					return response.text();
				})
				.then((text) => {
					const resultsMarkup = new DOMParser().parseFromString(text, 'text/html').getElementById('pickup-availability').innerHTML;
					var section = document.getElementById('pickup-availability');
					section.innerHTML = resultsMarkup;
					append_url(section, 'Close', 'm6pn-close');
					openPanel('pickup-availability');
				})
				.catch((error) => {
					console.warn("pickupAvailability error", error);
				});
		});
	}
});
window.dispatchEvent(pickupAvailabilityEvt);


// Handles horizontal nav scroll state (start/end/no-scroll) and dynamically positions dropdowns inside a scrollable nav bar.
const navScrollEvt = new CustomEvent('navScroll');
const navScrollBound = new WeakSet();

window.addEventListener('navScroll', () => {
	const container = document.querySelector('.nav-scroll-wrapper:has(.nav-scroll)') || null;
	if (!container) {
		return;
	}
	const scrollElement = container.querySelector('.nav-scroll');

	function checkOverflow() {

		const isEnd = scrollElement.scrollLeft + scrollElement.clientWidth >= scrollElement.scrollWidth;
		const isStart = scrollElement.scrollLeft === 0;

		scrollElement.classList.toggle('no-scroll', scrollElement.clientWidth === scrollElement.scrollWidth);
		scrollElement.classList.toggle('end', isEnd);
		scrollElement.classList.toggle('start', isStart);


	}

	function checkDropdown() {
		const menuItems = document.querySelectorAll('.nav-scroll-wrapper.dropdown > ul.nav-scroll:not(.no-scroll) > li:has(ul):not(.promo)');
		const navbar = document.querySelector('.nav-scroll-wrapper > ul.nav-scroll:not(.no-scroll)');
		if (!navbar) return;

		menuItems.forEach(menuItem => {
			if (menuItem.classList.contains('nav-scroll-dropdown-initialized')) return;

			menuItem.classList.add('nav-scroll-dropdown-initialized');

			menuItem.addEventListener('mouseover', event => {
				const menuItemRect = menuItem.getBoundingClientRect();
				const dropdown = menuItem.querySelector(':scope > ul');
				if (!dropdown) return;

				const navbarWidth = navbar.offsetWidth;
				let leftPosition = calculateLeftPosition(event.currentTarget);

				requestAnimationFrame(() => {
					const dropdownWidth = dropdown.offsetWidth;
					if (dropdownWidth === 0) return;

					leftPosition = leftPosition - (dropdownWidth / 2) + menuItemRect.width / 2;
					leftPosition = Math.min(leftPosition, navbarWidth - dropdownWidth);
					leftPosition = Math.max(0, leftPosition);

					dropdown.style.left = `${leftPosition}px`;
					dropdown.style.visibility = 'visible';
				});
			});
		});

		function calculateLeftPosition(element) {
			const elementRect = element.getBoundingClientRect();
			const parentRect = element.parentNode.getBoundingClientRect();
			return elementRect.left - parentRect.left;
		}
	}

	setTimeout(() => {
		checkOverflow();
		checkDropdown();
	}, 1);

	if (!navScrollBound.has(scrollElement)) {
		navScrollBound.add(scrollElement);
		scrollElement.addEventListener('scroll', checkOverflow, {
			passive: true
		});
		window.addEventListener('resize', checkOverflow);
	}
	//window.addEventListener('resize', checkDropdown);

});
window.dispatchEvent(navScrollEvt);


// Moves and initializes size chart popups by relocating them into #root and removing previously active instances.
const sizechartPopupEvt = new CustomEvent('sizechartPopup');
window.addEventListener('sizechartPopup', function (evt) {
	let sizechart_popup = document.querySelectorAll('.popup-a[data-title^="sizing-chart-popup-"]:not(.sizechart-popup-initalized)');
	let sizechart_popupActive = document.querySelectorAll('.popup-a.sizechart-popup-initalized[id^="sizing-chart-popup-"]');

	if (sizechart_popupActive.length && sizechart_popup.length) {
		sizechart_popupActive.forEach(el => el.remove());
	}

	if (sizechart_popup.length) {
		sizechart_popup.forEach(el => {
			el.classList.add('sizechart-popup-initalized');
			document.querySelector('#root').appendChild(el);
		});
	}
});


// Handles product block popups: moves uninitialized popups to #root, sets click events, and manages active/quickshop popups.
const productBlockPopupEvt = new CustomEvent('productBlockPopup');
window.addEventListener('productBlockPopup', function (evt) {
	let link = document.querySelectorAll('[data-block-popup]:not(.block-popup-initialized)');
	let linkActiveQuickshop = document.querySelectorAll('.popup-a.block-popup-quickshop-popup-initalized[data-title^="block-popup"]');
	let linkActive = document.querySelectorAll('.popup-a.block-popup-initialized[data-title^="block-popup"]');

	if (link.length) {
		link.forEach(function (el) {
			let renderedPopup_id = el.getAttribute('data-block-popup');
			let popup = document.querySelector('.popup-a[data-title="' + renderedPopup_id + '"].block-popup-initialized');
			if (popup && popup.classList.contains('shown')) {
				popup.remove();
				let renderedPopup = document.querySelector('.popup-a[data-title="' + renderedPopup_id + '"]:not(.block-popup-initialized)');
				renderedPopup.classList.add('block-popup-initialized');
				document.querySelector('#root').appendChild(renderedPopup);
				loadPopup(renderedPopup_id, function () {
					hidePanels();
				});
			}

			el.addEventListener('click', function (e) {

				if (linkActive.length) {
					linkActive.forEach(el => el.remove());
				}
				let popup_id = el.getAttribute('data-block-popup');
				let popupWrapper = document.querySelector('.popup-a[data-title="' + popup_id + '"]:not(.block-popup-initialized)');
				let isQuickshop = false;
				if (e.target.closest('[data-template]')) {
					let productFormTemplate = e.target.closest('[data-template]').getAttribute('data-template')

					if (productFormTemplate.startsWith('quickshop')) {
						isQuickshop = true;
					}

					if (isQuickshop) {
						if (linkActiveQuickshop.length) {
							linkActiveQuickshop.forEach(el => el.remove());
						}
					}
				}

				if (!el.classList.contains('block-popup-initialized')) {
					if (isQuickshop) {
						popupWrapper.classList.add('block-popup-quickshop-popup-initalized');
					} else {
						popupWrapper.classList.add('block-popup-initialized');
					}
					document.querySelector('#root').appendChild(popupWrapper);
				}

				loadPopup(popup_id, function () {
					hidePanels();
				});
				el.classList.add('block-popup-initialized');
				e.preventDefault();
			});
		});
	}
});


// .inline-modal - ets up a custom event to attach click handlers to inline modal close links, preventing default behavior and removing the modal when clicked
const inlineModalCloseEvt = new CustomEvent('inlineModalClose');
window.addEventListener('inlineModalClose', () => {
	const inlineModals = document.querySelectorAll('.inline-modal a.inline-modal-close:not(.listening)');
	if (!inlineModals.length) return;

	for (const el of inlineModals) {
		el.classList.add('listening');

		el.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopImmediatePropagation();

			const inlineModal = el.closest('.inline-modal');
			if (!inlineModal) return;

			inlineModal.remove();
		});
	}
});
window.dispatchEvent(inlineModalCloseEvt);


// .address-delete-button - attaches click handlers to address delete buttons that confirm the action and submit a hidden form to perform a DELETE request
const addressDeleteButtonEvt = new CustomEvent('addressDeleteButton');
window.addEventListener('addressDeleteButton', function () {
	const address_delete_button = document.getElementsByClassName('address-delete-button');
	if (!address_delete_button.length) return;

	for (const el of address_delete_button) {
		el.addEventListener('click', function (e) {
			e.preventDefault();

			if (!confirm(el.dataset.confirmMessage)) return;

			const form = document.createElement('form');
			form.setAttribute('method', 'post');
			form.setAttribute('action', el.dataset.target);

			const hiddenField = document.createElement('input');
			hiddenField.setAttribute('type', 'hidden');
			hiddenField.setAttribute('name', '_method');
			hiddenField.setAttribute('value', 'delete');

			form.appendChild(hiddenField);
			document.body.appendChild(form);
			form.submit();
			document.body.removeChild(form);
		});
	}
});
window.dispatchEvent(addressDeleteButtonEvt);


// .spr-summary-actions-newreview - adds click handlers to "Add Review" buttons that remove all such buttons and scroll the newly displayed review form into view
const addReviewButtonEvt = new CustomEvent('addReviewButton');
window.addEventListener('addReviewButton', function () {
	const add_review_button = document.getElementsByClassName('spr-summary-actions-newreview');
	if (!add_review_button.length) return;

	for (const el of add_review_button) {
		el.addEventListener('click', function (e) {
			for (const elToRemove of add_review_button) {
				elToRemove.remove();
			}

			setTimeout(function () {
				const newReviewForms = document.getElementsByClassName('new-review-form');
				if (newReviewForms.length > 0) {
					newReviewForms[0].scrollIntoView(true);
				}
			}, 10);
		});
	}
});
window.dispatchEvent(addReviewButtonEvt);


// .checkbox-required - ensures at least one checkbox is required in forms with the 'checkbox-required' class, toggling the required attribute based on selection
const checkboxRequiredEvt = new CustomEvent('checkboxRequired');
window.addEventListener('checkboxRequired', function () {
	const checkbox_required = document.getElementsByClassName('checkbox-required');
	if (!checkbox_required.length) return;

	const checkIfChecked = function (form) {
		const checked = form.querySelector('input:checked');
		const inputs = form.getElementsByTagName('input');

		if (!checked) {
			if (inputs[0] != null) {
				inputs[0].setAttribute('required', '');
			}
		} else {
			if (inputs != null) {
				for (const el of inputs) {
					el.removeAttribute('required');
				}
			}
		}
	};

	for (const form_el of checkbox_required) {
		const inputs = form_el.getElementsByTagName('input');
		for (const input_el of inputs) {
			input_el.addEventListener('click', function () {
				checkIfChecked(form_el);
			});
		}
	}
});
window.dispatchEvent(checkboxRequiredEvt);


// .address-form - dynamically updates province/state options in address forms based on the selected country, handling defaults and semantic select updates
const addressFormEvt = new CustomEvent('addressForm');
window.addEventListener('addressForm', function () {
	const address_form = document.getElementsByClassName('address-form');
	if (!address_form.length) return;

	for (const el of address_form) {
		const countryInput = el.getElementsByClassName('address-country-option')[0];
		const provinceInput = el.getElementsByClassName('address-province-option')[0];
		const provinceInputContainer = el.getElementsByClassName('address-provinces')[0];

		const checkForProvinces = function (input) {
			const selected = input;
			setTimeout(function () {
				const dataProvinces = selected.options[selected.selectedIndex].dataset.provinces;
				if (dataProvinces) {
					const provinces = JSON.parse(dataProvinces);
					if (provinces.length) {
						provinceInput.innerHTML = '';
						let value;
						if (provinceInput.dataset.default) {
							value = provinceInput.dataset.default;
						}
						for (const province of provinces) {
							if (value && (value == province[0] || value == province[1])) {
								provinceInput.innerHTML += '<option selected value=\'' + province[0] + '\'>' + province[1] + '</option>';
							} else {
								provinceInput.innerHTML += '<option value=\'' + province[0] + '\'>' + province[1] + '</option>';
							}
						}
						provinceInputContainer.style.display = '';
						const selectWrapper = provinceInputContainer.querySelector('.select-wrapper');
						if (selectWrapper) {
							selectWrapper.parentNode.replaceChild(provinceInput, selectWrapper);
							provinceInput.classList.remove('semantic-select-initialized', 'select-init');
							provinceInput.removeAttribute('data-random');
							window.dispatchEvent(semanticSelectEvt);
						}
					} else {
						for (const el of provinceInput.querySelectorAll('option:not([value=""][disabled])')) {
							el.remove();
						}
						provinceInputContainer.style.display = 'none';
					}
				}
			}, 10);
		};

		if (countryInput.dataset.default) {
			const value = countryInput.dataset.default;
			for (const option of countryInput.options) {
				if (value == option.value || value == option.innerHTML) {
					option.setAttribute('selected', 'selected');
				}
			}
		}

		checkForProvinces(countryInput);

		countryInput.addEventListener('change', function () {
			checkForProvinces(this);
		});
	}
});
window.dispatchEvent(addressFormEvt);


// [data-shopify-xr] - loads and initializes Shopify 3D/AR models on the page, parsing JSON data and setting up XR elements for display.
const model3dEvt = new CustomEvent('model3d');
window.addEventListener('model3d', function () {
	const model3d = document.querySelectorAll('[data-shopify-xr]');

	if (!model3d.length) return;

	window.ProductModel = {
		loadShopifyXR() {
			Shopify.loadFeatures([
				{
					name: 'shopify-xr',
					version: '1.0',
					onLoad: this.setupShopifyXR.bind(this),
		},
	  ]);
		},
		setupShopifyXR(errors) {
			if (errors) return;
			if (!window.ShopifyXR) {
				document.addEventListener('shopify_xr_initialized', () =>
					this.setupShopifyXR()
				);
				return;
			}
			document.querySelectorAll('[id^="ProductJSON-"]').forEach((modelJSON) => {
				window.ShopifyXR.addModels(JSON.parse(modelJSON.textContent));
				modelJSON.remove();
			});
			window.ShopifyXR.setupXRElements();
		},
	};
	if (window.ProductModel) window.ProductModel.loadShopifyXR();
});
window.dispatchEvent(model3dEvt);


// Cart upsell horizontal slider controls
const cartUpsellSliderEvt = new CustomEvent('cartUpsellSlider');
window.addEventListener('cartUpsellSlider', function (evt) {
	var cart_upsell_sliders = document.querySelectorAll('.product-recommendations.cart-upsell.horizontal-scrollable');
	if (cart_upsell_sliders.length) {
		Array.from(cart_upsell_sliders).forEach(function (el) {
			var list = el.querySelector('ul.l4ca'),
				prev = el.querySelector('.cart-upsell-nav-prev'),
				next = el.querySelector('.cart-upsell-nav-next');
			if (!list || !prev || !next) return;

			var setButtonState = function (button, muted) {
				if (muted) {
					button.classList.add('is-muted');
					button.setAttribute('aria-disabled', 'true');
					button.setAttribute('tabindex', '-1');
				} else {
					button.classList.remove('is-muted');
					button.setAttribute('aria-disabled', 'false');
					button.removeAttribute('tabindex');
				}
			};

			var updateButtons = function () {
				var max_scroll = list.scrollWidth - list.clientWidth;
				if (max_scroll <= 1) {
					setButtonState(prev, true);
					setButtonState(next, true);
					return;
				}
				setButtonState(prev, list.scrollLeft <= 1);
				setButtonState(next, list.scrollLeft >= max_scroll - 1);
			};

			var scrollList = function (direction) {
				var item = list.querySelector('li'),
					gap = 12,
					distance = list.clientWidth;
				if (item) {
					distance = item.getBoundingClientRect().width + gap;
				}
				list.scrollBy({ left: direction * distance, behavior: 'smooth' });
			};

			if (prev.getAttribute('data-cart-upsell-nav-initialized') != 'true') {
				prev.setAttribute('data-cart-upsell-nav-initialized', 'true');
				prev.addEventListener('click', function (event) {
					event.preventDefault();
					if (prev.getAttribute('aria-disabled') == 'true') return;
					scrollList(-1);
				});
			}

			if (next.getAttribute('data-cart-upsell-nav-initialized') != 'true') {
				next.setAttribute('data-cart-upsell-nav-initialized', 'true');
				next.addEventListener('click', function (event) {
					event.preventDefault();
					if (next.getAttribute('aria-disabled') == 'true') return;
					scrollList(1);
				});
			}

			if (list.getAttribute('data-cart-upsell-scroll-initialized') != 'true') {
				list.setAttribute('data-cart-upsell-scroll-initialized', 'true');
				list.addEventListener('scroll', updateButtons, { passive: true });
			}

			updateButtons();
			setTimeout(updateButtons, 250);
		});
	}
});
window.dispatchEvent(cartUpsellSliderEvt);

// Productpage recommended products - fetches and displays recommended products for each product recommendation section, handling multiple intents, removing duplicates, and initializing related UI components
const recommendedProductsEvt = new CustomEvent('recommendedProducts');
window.addEventListener('recommendedProducts', function (evt) {
	var product_recommendations = document.querySelectorAll(".product-recommendations:not(.product-recommendations-initialized)");
	if (product_recommendations.length) {
		Array.from(product_recommendations).forEach(function (el) {
			el.classList.add('product-recommendations-initialized');
			var product_id = el.dataset.productId.split(','),
				limit = el.dataset.limit || el.dataset.upsellLimit,
				template = el.dataset.template,
				intents = el.dataset.intent.split(','),
				count = 0,
				calls = intents.length * product_id.length;
			if (product_id === undefined) {
				document.getElementById('shopify-section-' + template).classList.remove('hidden');
				return;
			}
			if (el.classList.contains('cart-upsell')) {
				var cart_upsell = true;
			}
			var fetchRecommendedProducts = function (url, intent) {
				fetch(url)
					.then((response) => {
						if (!response.ok) {
							console.warn('Request failed:', response.status, response.statusText);
							return;
						}
						return response.text();
					})
					.then((text) => {
						count++;
						const resultsMarkup = new DOMParser().parseFromString(text, 'text/html').querySelector('#shopify-section-' + template + ' .product-recommendations');
						if (calls == 1) {
							el.querySelector('article, .l4cl, .l4ca').innerHTML = resultsMarkup.querySelector('article, .l4cl, .l4ca').innerHTML;
						} else {
							Array.from(resultsMarkup.querySelector('article, .l4cl, .l4ca').children).forEach(function (em) {
								el.querySelector('article, .l4cl, .l4ca').appendChild(em);
							});
						}
						if (count == calls) {
							var seen = {};
							el.querySelectorAll('.l4ca > li[data-product-id]').forEach(function (el) {
								if (seen[el.dataset.productId]) {
									el.remove();
								} else {
									seen[el.dataset.productId] = true;
								}
							});
							if (cart_upsell && el.dataset.upsellLimit) {
								var upsell_limit = parseInt(el.dataset.upsellLimit, 10);
								if (upsell_limit > 0) {
									Array.from(el.querySelectorAll('.l4ca > li[data-product-id]')).forEach(function (item, index) {
										if (index >= upsell_limit) {
											item.remove();
										}
									});
								}
							}
							if (el.querySelector('.l4cl, .l4ca') && el.querySelector('.l4cl, .l4ca').children.length == 0) {
								el.innerHTML = '';
								if (el.classList.contains('tab')) {
									el.closest('.m6tb').querySelector('nav ul li[data-index="' + el.getAttribute('data-index') + '"]').remove();
									if (el.closest('.m6tb').querySelector('nav ul li a') != null) {
										el.closest('.m6tb').querySelector('nav ul li a').click();
									}
								}
								return;
							}
							if (resultsMarkup.getAttribute('data-hide') != null) {
								document.getElementById('shopify-section-' + template).classList.add('margin-mobile-content');
								if (intent == 'related') {
									if (resultsMarkup.getAttribute('data-tab') != null) {
										document.getElementById('shopify-section-' + template).querySelector('li[data-index="' + el.closest('[data-index]').getAttribute('data-index') + '"]').remove();
										el.innerHTML = '';
									} else {
										document.getElementById('shopify-section-' + template).innerHTML = '';
										return;
									}
								} else {
									el.innerHTML = '';
									return;
								}
							}
							if (template && document.getElementById('shopify-section-' + template)) {
								document.getElementById('shopify-section-' + template).classList.remove('hidden');
							}
							el.classList.remove('hidden');
							window.dispatchEvent(listScrollableEvt);
							window.dispatchEvent(listCollectionSliderEvt);
							window.dispatchEvent(formZindexEvt);
							window.dispatchEvent(semanticInputEvt);
							window.dispatchEvent(ratingsEvt);
							window.dispatchEvent(schemeTooltipEvt);
							window.dispatchEvent(popupsEvt);
							window.dispatchEvent(semanticSelectEvt);
							window.dispatchEvent(productcardVariantsEvt);
							window.dispatchEvent(check_limit_event);
							window.dispatchEvent(cartUpsellSliderEvt);
							ajaxCart.init();
							quickShop.init();
						}
					})
					.catch((error) => {
						console.warn("recommendedProducts error", error);
					});
			};
			intents.forEach(function (intent) {
				if (!window.routes || !window.routes.product_recommendations_url) return;


				product_id.forEach(function (id) {
					const url = window.routes.product_recommendations_url + '?section_id=' + template + (limit ? '&limit=' + limit : '') + '&product_id=' + id + '&intent=' + intent;
					fetchRecommendedProducts(url, intent);
				});
			});
		});
	}
	if (document.getElementById('section-related') == null) {
		document.querySelectorAll('a[href="#section-related"]').forEach(function (el) {
			el.parentElement.remove();
		})
	}
});
window.dispatchEvent(recommendedProductsEvt);


const recentlyViewedProductsEvt = new CustomEvent('recentlyViewedProducts');
window.addEventListener('recentlyViewedProducts', function (evt) {
	var recently_viewed_products = document.querySelectorAll(".recently-viewed-products:not(.recently-viewed-products-initialized)");
	var currProductData = JSON.parse(localStorage.getItem("recentlyViewedProduct"));
	if (typeof general !== 'undefined' && general.viewed_product) {
		var numberOfProducts = 12,
			productUrl = general.viewed_product,
			productId = general.viewed_product_id,
			productData = {
				productUrl: productUrl,
				productId: productId
			},
			pushNewProductData = false,
			currProductData, sameProduct, newProductData, sameProductIndex;
		if (currProductData === null) {
			currProductData = [];
			pushNewProductData = true;
		} else {
			sameProduct = currProductData.filter(e => e.productId === productId).length > 0;
			if (sameProduct) {
				sameProductIndex = currProductData.map(function (e) {
					return e.productId;
				}).indexOf(productId);
				currProductData.splice(sameProductIndex, 1);
				pushNewProductData = true;
			}
			if (currProductData.length < numberOfProducts && !sameProduct) {
				pushNewProductData = true;
			} else if (currProductData.length >= numberOfProducts && !sameProduct) {
				currProductData.shift();
				pushNewProductData = true;
			}
		}
		if (pushNewProductData) {
			currProductData.push(productData);
			newProductData = JSON.stringify(currProductData);
			localStorage.setItem("recentlyViewedProduct", newProductData);
		}
	}
	if (recently_viewed_products.length) {
		const productData = JSON.parse(localStorage.getItem("recentlyViewedProduct"));
		if (productData == null) {
			Array.from(recently_viewed_products).forEach(function (el) {
				el.remove();
			});
			return;
		}

		var widthClass = 'w33',
			recently_viewed_products_el = recently_viewed_products[0],
			number_of_items = parseInt(recently_viewed_products[recently_viewed_products.length - 1].querySelector('[data-number_of_items]').dataset.number_of_items),
			enable_quick_buy_desktop = recently_viewed_products_el.querySelector('[data-enable_quick_buy_desktop]'),
			enable_quick_buy_mobile = recently_viewed_products_el.querySelector('[data-enable_quick_buy_mobile]'),
			enable_quick_buy_qty_selector = recently_viewed_products_el.querySelector('[data-enable_quick_buy_qty_selector]'),
			quick_buy_compact = recently_viewed_products_el.querySelector('[data-enable_quick_buy_compact]'),
			quick_buy_drawer = recently_viewed_products_el.querySelector('[data-enable_quick_buy_drawer]'),
			enable_color_picker = recently_viewed_products_el.querySelector('[data-enable_color_picker]'),
			content_alignment = recently_viewed_products_el.querySelector('[data-content_alignment]'),
			show_title = recently_viewed_products_el.querySelector('[data-show_title]'),
			show_price = recently_viewed_products_el.querySelector('[data-show_price]'),
			show_stock = recently_viewed_products_el.querySelector('[data-show_stock]'),
			show_labels = false,
			show_swatches = recently_viewed_products_el.querySelector('[data-show_swatches]'),
			fill_images = recently_viewed_products_el.querySelector('[data-fill_images]'),
			images_rounded = recently_viewed_products_el.querySelector('[data-images_rounded]'),
			template = recently_viewed_products_el.querySelector('[data-template]').dataset.template,
			length = productData.length,
			max = number_of_items;
		switch (max) {
			case 2:
				widthClass = 'w50'
				break;
			case 3:
				widthClass = 'w33'
				break;
			case 4:
				widthClass = 'w25'
				break;
			case 5:
				widthClass = 'w20'
				break;
			case 6:
				widthClass = 'w16'
				break;
			case 7:
				widthClass = 'w14'
				break;
			case 8:
				widthClass = 'w12'
				break;
			default:
				widthClass = 'w10'
				break;
		}
		var recentlyViewedHtml = '',
			recentlyViewedProductsObj = {},
			itemsDone = 0,
			data = productData.reverse();
		Array.from(data).forEach(function (product, index, array) {
			fetch(product.productUrl + '/?section_id=' + template)
				.then((response) => {
					if (!response.ok) {
						console.warn('Request failed:', response.status, response.statusText);
						return;
					}
					return response.text();
				})
				.then((text) => {
					const removeElements = (elements) => {
						for (const el of elements) el.remove();
					};
					const addClass = (elements, className) => {
						for (const el of elements) el.classList.add(className);
					};
					const removeClass = (elements, className) => {
						for (const el of elements) el.classList.remove(className);
					};

					const replaceQuickBuyWithLink = (list_collection, linkClass, text) => {
						const elements = list_collection.querySelectorAll('form, .link-btn');
						for (const el of elements) {
							const newItem = document.createElement('p');
							newItem.classList.add('link-btn');
							newItem.innerHTML = `<a class="${linkClass}" href="${el.closest('li').querySelector('a').getAttribute('href')}" data-quickshop>${text}</a>`;
							el.parentNode.replaceChild(newItem, el);
						}
					};

					const handleImages = (list_collection, fill_images, images_rounded) => {
						const imgs = list_collection.querySelectorAll('img');
						for (const img of imgs) {
							if (!fill_images) img.classList.remove('filled');
							else {
								img.classList.add('filled');
								if (img.src.includes('&pad_color=fff')) img.src = img.src.replace('&pad_color=fff', '');
								if (img.srcset && img.srcset.includes('&pad_color=fff')) img.srcset = img.srcset.replaceAll('&pad_color=fff', '');
							}
						}
						if (images_rounded) {
							for (const el of list_collection.querySelectorAll('figure, picture')) el.classList.add('rounded');
						}
					};

					const handleQuickBuySettings = (list_collection, options) => {
						const {
							enable_quick_buy_desktop,
							enable_quick_buy_mobile,
							enable_quick_buy_qty_selector,
							show_swatches,
							quick_buy_compact,
							quick_buy_drawer,
							translations
						} = options;

						const quickBuyElements = list_collection.querySelectorAll('form, .link-btn, .variant-picker');

						if (!enable_quick_buy_desktop && !enable_quick_buy_mobile) removeElements(quickBuyElements);
						else {
							if (quick_buy_drawer) replaceQuickBuyWithLink(list_collection, 'overlay-tertiary', translations.view_options_text);

							for (const el of quickBuyElements) {
								if (!enable_quick_buy_desktop && !el.closest('figure')) el.classList.add('mobile-only');
								if (!enable_quick_buy_mobile) el.classList.add('mobile-hide');
							}

							if (!enable_quick_buy_qty_selector) removeElements(list_collection.querySelectorAll('.input-amount'));
							if (!show_swatches) removeElements(list_collection.querySelectorAll('.check.color'));

							if (quick_buy_compact) {
								for (const btn of list_collection.querySelectorAll('form button')) {
									btn.classList.add('compact');

									const mobileHide = btn.querySelector('.mobile-hide');
									if (mobileHide) mobileHide.remove();

									const iconCart = btn.querySelector('.icon-cart');
									if (iconCart) iconCart.classList.remove('mobile-only');
								}
								for (const link of list_collection.querySelectorAll('.link-btn a')) {
									const icon = link.querySelector('.icon-cart');
									if (icon) {
										link.classList.add('compact');

										const mobileHide = link.querySelector('.mobile-hide');
										if (mobileHide) mobileHide.remove();

										icon.classList.remove('mobile-only');
									} else {
										link.textContent = translations.view_text;
									}
								}
							}
						}
					};

					const dispatchAllEvents = () => {
						window.dispatchEvent(ratingsEvt);
						window.dispatchEvent(listCollectionSliderEvt);
						window.dispatchEvent(formZindexEvt);
						window.dispatchEvent(semanticInputEvt);
						window.dispatchEvent(schemeTooltipEvt);
						window.dispatchEvent(popupsEvt);
						window.dispatchEvent(listScrollableEvt);
						window.dispatchEvent(check_limit_event);
						ajaxCart.init();
						quickShop.init();
					};

					const resultsMarkup = new DOMParser().parseFromString(text, 'text/html')
						.getElementById('shopify-section-' + template).innerHTML;

					recentlyViewedProductsObj[product.productId] = resultsMarkup;
					itemsDone++;

					if (itemsDone !== productData.length) return;

					let recentlyViewedHtml = '';
					for (const prod of productData) recentlyViewedHtml += recentlyViewedProductsObj[prod.productId];

					for (const el of recently_viewed_products) {
						const list_collection = el.querySelector('.l4cl');
						list_collection.innerHTML = recentlyViewedHtml;

						removeElements(list_collection.querySelectorAll('.placeholder-product'));

						if (getHtmlTheme() === 'Xclusive') {
							const compact = el.classList.contains('compact');
							if (!compact) {
								if ((length - list_collection.querySelectorAll('.placeholder-product').length) > max) list_collection.classList.add('slider');
								else list_collection.classList.add('mobile-compact');
								list_collection.classList.add(widthClass);
							} else {
								removeElements(list_collection.querySelectorAll(
									'.l4cl > li > *:not(figure), .l4cl > li > figure .label, .l4cl > li > figure .link-btn, .l4cl > li > figure form'
								));
							}
							if (!show_title) removeElements(list_collection.querySelectorAll('h3'));
							if (!show_price) removeElements(list_collection.querySelectorAll('.price, .s1pr'));
							if (!show_stock) removeElements(list_collection.querySelectorAll('.stock'));
							if (show_labels === false) removeElements(list_collection.querySelectorAll('.s1lb'));
							if (!show_swatches) removeElements(list_collection.querySelectorAll('.color'));
						} else if (getHtmlTheme() === 'xtra') {
							list_collection.classList.remove('slider', 's4wi');
							if ((length - list_collection.querySelectorAll('.placeholder-product').length) > max) list_collection.classList.add('slider');
							else list_collection.classList.add('mobile-compact');
							list_collection.classList.add(widthClass);
						}

						// Images
						handleImages(list_collection, fill_images, images_rounded);

						// Content alignment
						if (content_alignment != null) {
							for (const li of el.querySelectorAll('.l4cl > li')) {
								li.classList.remove('text-start', 'text-center');
								li.classList.add(el.querySelector('[data-content_alignment]').dataset.content_alignment);
							}
						}

						// Quick buy handling
						handleQuickBuySettings(list_collection, {
							enable_quick_buy_desktop,
							enable_quick_buy_mobile,
							enable_quick_buy_qty_selector,
							show_swatches,
							quick_buy_compact,
							quick_buy_drawer,
							translations
						});
					}

					dispatchAllEvents();
				})
				.catch((error) => {
					console.warn("recentlyViewedProducts error", error);
				});
		});
	}
});
window.dispatchEvent(recentlyViewedProductsEvt);


// Productcards variant select - handles product card variant selection, updating images, prices, availability, and triggering related events/forms.
const productcardVariantsEvt = new CustomEvent('productcardVariants');
function initProductcardVariants(root) {
	root = root || document;

	const isGlobalRoot = root === document;
	let card_id_input = isGlobalRoot ?
		document.querySelectorAll('.l4ca > li select[name="id"]:not(.listening), .upsell-items.l4cl > li p:has(select) select:not(.listening), .l4cl li select[name="id"]:not(.listening)') :
		root.querySelectorAll('select[name="id"]:not(.listening), p:has(select) select:not(.listening)');
	const product_card_add_to_cart = isGlobalRoot ?
		document.querySelectorAll('.l4cl .product-card.update-variants select[name="id"]:not(.listening)') :
		root.querySelectorAll('.product-card.update-variants select[name="id"]:not(.listening), select[name="id"]:not(.listening)');

	if (!card_id_input.length && product_card_add_to_cart.length) {
		card_id_input = product_card_add_to_cart;
	}
	if (card_id_input.length) {
		new_css('form-validation-css', validation_css);
		Array.from(card_id_input).forEach(function (el) {
			el.classList.add('listening');

			const productCard = el.closest('.product-card');
			if (productCard && getHtmlTheme() === 'xclusive' && productCard.querySelector('ul.variant-picker')) {
				var updateAvailableSizes = function (sizeChanged) {
					var colorContainer = productCard.querySelector('ul.color');
					if (!colorContainer) {
						return;
					}
					if (sizeChanged) {
						colorContainer.classList.remove('sizes-initialized');
					}
					if (colorContainer.classList.contains('sizes-initialized')) {
						return;
					}
					colorContainer.classList.add('sizes-initialized');
					// Get available sizes for selected color
					var availableSizes = colorContainer.querySelector('input:checked').getAttribute('data-sizes');
					var availableInventory = colorContainer.querySelector('input:checked').getAttribute('data-sizes-availability');
					var sizes = availableSizes.split('/');
					var inventory = availableInventory.split('/');
					productCard.querySelectorAll('.variant-picker input').forEach(function (input) {
						input.parentElement.style.display = 'none'
						if (sizes.includes(input.value)) {
							input.parentElement.style.display = 'block'
							var sizeIndex = sizes.indexOf(input.value);
							if (sizeIndex !== -1) {
								if (input.nextSibling) {
									if (inventory[sizeIndex] == 'true') {
										input.parentElement.querySelector('label').classList.remove('disabled-style');
									} else {
										input.parentElement.querySelector('label').classList.add('disabled-style');
									}
								}
							}
						}
					});
					// If there is only one color swatch and all variants are not available, show all variants
					var totalColorSwatches = productCard.querySelectorAll('.check.color li').length;
					if (totalColorSwatches == 1) {
						var totalDisabled = productCard.getElementsByClassName('disabled-style').length;
						var totalLiElements = productCard.querySelectorAll('.variant-picker li').length - 1;
						if (totalDisabled == totalLiElements) {
							productCard.querySelectorAll('.variant-picker .disabled-style').forEach(function (el) {
								el.parentElement.style.display = 'block'
							});
						}
					}
				}
				productCard.addEventListener('mouseover', function () {
					updateAvailableSizes();
				});
				productCard.querySelectorAll('input[type="radio"]:not(.listening), input[name^="color"]:not(.listening)').forEach(function (radio) {
					radio.classList.add('listening');
					radio.addEventListener('change', function () {
						var updateOptions = function () {
							this.options = Array.from(productCard.querySelectorAll('select[name^="options"], input[type="radio"][name^="options"]:checked, input[type="radio"][name^="color"]:checked'), (select) => select.value);
						}

						var getVariantData = function () {
							var data = [];
							Array.from(productCard.querySelectorAll('select[name="id"] option')).forEach(function (r) {
								data.push(JSON.parse(r.dataset.options));
							});
							this.variantData = data;
							return this.variantData;
						}
						var updateMasterId = function () {
							var variantData = getVariantData();
							this.currentVariant = variantData.find((variant) => {
								return this.options.every((option) => variant.options.includes(option));
							});
						}
						var setUnavailable = function (el) {
							el.classList.add('unavailable');
							el.querySelector('button[type="submit"]').textContent = translations.unavailable_text;
							el.querySelector('button[type="submit"]').setAttribute('disabled', 'disabled');
						}

						var updateVariantInput = function () {
							if (!this.currentVariant) {
								setUnavailable(productCard.querySelector('form'));
							} else {
								const select = productCard.querySelector('select[name="id"]');
								select.value = this.currentVariant.id;
								select.dispatchEvent(changeEvent);
								const input = productCard.querySelector('input[name="product-id"]');
								input.value = this.currentVariant.id;
								input.dispatchEvent(new Event('change', {
									bubbles: true
								}));
							}
						}
						updateOptions();
						updateMasterId();
						updateVariantInput();
						updateAvailableSizes(true);

						// Submit form if option is size
						if (this.closest('ul.variant-picker')) {
							if (productCard.querySelector('form').classList.contains('product-options')) {
								// Redirect if product has a third option
								var window_location_url = document.location.origin + productCard.querySelector('a').getAttribute('href');
								if (window_location_url.includes('?')) {
									window_location_url = window_location_url + '&';
								} else {
									window_location_url = window_location_url + '?';
								}
								window_location_url = window_location_url + 'variant=' + productCard.querySelector('form select').value
								window.location.href = window_location_url;
							} else {
								// Add variant to card
								if (radio.nextElementSibling.classList.contains('disabled-style')) {
									return;
								}
								productCard.querySelector('form:not(.process-add-to-cart) button[type="submit"]').click();
								productCard.querySelector('form').classList.add('initialized');
								setTimeout(function () {
									productCard.querySelector('form').classList.remove('initialized');
									radio.checked = false;
								}, 500);
							}
						}
					});
				});
			}

			el.addEventListener('change', function (event) {
				const standardProductSelectSource = event.isTrusted || event.xtraStandardProductSelectSource ?
					(event.xtraStandardProductSelectSource || el) :
					null;

				setTimeout(function () {
					let standardProductSelect = null;

					try {
						const selected_option = el.options[el.selectedIndex];
						const productFormSection = el.closest('li');

						if (!selected_option || !productFormSection) return;

						if (standardProductSelectSource) {
							standardProductSelect = beginStandardProductSelect(el, standardProductSelectSource);
						}

						const variant_data = JSON.parse(selected_option.dataset.variantinfo);

						const imgEl = productFormSection.querySelector('img');
						if (variant_data.image && imgEl) {
							if (!(getHtmlTheme() === 'xclusive' && productFormSection.querySelector('picture.slider'))) {
								imgEl.src = variant_data.image;
								imgEl.removeAttribute('srcset');
								imgEl.removeAttribute('sizes');
							}
						}

						const priceEl = productFormSection.querySelector('.price');
						if (variant_data.price && priceEl) {
							let priceHTML = '<span class="old-price"></span>';

							if (getHtmlTheme() === 'xclusive' && variant_data.price_old) {
								priceHTML += '&nbsp;';
							}

							priceHTML += variant_data.price;
							priceEl.innerHTML = priceHTML;
						}

						const oldPriceEl = productFormSection.querySelector('.old-price');
						if (oldPriceEl) {
							if (variant_data.price_old) {
								oldPriceEl.innerHTML = variant_data.price_old + (getHtmlTheme() === 'xtra' ? ' ' : '');
								oldPriceEl.classList.remove('hidden');
							} else {
								oldPriceEl.classList.add('hidden');
							}
						}

						if (getHtmlTheme() === 'xtra') {
							const variantEl = productFormSection.querySelector('[data-variant-id]');
							if (variantEl) {
								variantEl.setAttribute('data-variant-id', selected_option.value);
							}

							const checkInput = productFormSection.querySelector('.check > input');
							if (checkInput) {
								checkInput.checked = true;
								checkInput.dataset.id = variant_data.id;
							}
						}

						// Common
						initProductcardVariants(productFormSection);
						initSemanticSelects(productFormSection);
						ajaxCart.init();

						if (standardProductSelect) {
							standardProductSelect.resolveFrom(selected_option);
						}
					} catch (error) {
						if (standardProductSelect) standardProductSelect.reject(error);
						console.warn('Product card variant change error', error);
					}
				}, 1);

				/*
				setTimeout(function () {
					var selected_option = el.options[el.selectedIndex],
						productFormSection = el.closest('li'),
						variant_data = JSON.parse(selected_option.dataset.variantinfo);

					if (variant_data.image && productFormSection.querySelector('img')) {
					}
					if (variant_data.price && productFormSection.querySelector('.price')) {
					}
					if (variant_data.price_old && productFormSection.querySelector('.old-price')) {
						productFormSection.querySelector('.old-price').innerHTML = variant_data.price_old + ' ';
						productFormSection.querySelector('.old-price').classList.remove('hidden');
					} else {
						productFormSection.querySelector('.old-price').classList.add('hidden');
					}
					window.dispatchEvent(productcardVariantsEvt);
					window.dispatchEvent(semanticSelectEvt);
					ajaxCart.init();
				}, 1);*/
			});
		});
	}
}

window.addEventListener('productcardVariants', function (evt) {
	initProductcardVariants(document);
});
window.dispatchEvent(productcardVariantsEvt);


// Productpage variant select - updates variants, bulk quantities, UI, and cart dynamically with AJAX and event handling.
const productVariantRequests = new WeakMap();
const productVariantsEvt = new CustomEvent('productVariants');
window.addEventListener('productVariants', function (evt) {
	let bulk = document.querySelectorAll('#root .l4ml');
	var main_id_input = Array.from(document.querySelectorAll('.m6pr select[name="variant-id"]:not(.listening), .m6pr input[type="radio"][name="variant-id"]:not(.listening), .m6pr-compact select[name="variant-id"]:not(.listening), .m6pr-compact input[type="radio"][name="variant-id"]:not(.listening)'));
	var options_input = Array.from(document.querySelectorAll('.m6pr select[name^="options"]:not(.listening), .m6pr input[type="radio"][name^="options"]:not(.listening), .m6pr-compact select[name^="options"]:not(.listening), .m6pr-compact input[type="radio"][name^="options"]:not(.listening)'));
	var inputs = main_id_input.concat(options_input);
	var sticky_variant_input = Array.from(document.querySelectorAll('#sticky-add-to-cart select[name="product_id_sticky"]:not(.listening)'));

	if (sticky_variant_input.length) {
		sticky_variant_input.forEach(function (el) {
			el.classList.add('listening');

			el.addEventListener('change', function () {
				const mainVariantSelect = document.querySelector('.m6pr select[name="variant-id"], .m6pr-compact select[name="variant-id"]');

				if (mainVariantSelect) {
					mainVariantSelect.value = this.value;
					mainVariantSelect.dispatchEvent(createProductSelectChangeEvent(this));
					return;
				}

				const mainVariantRadio = document.querySelector('.m6pr input[type="radio"][name="variant-id"][value="' + this.value + '"], .m6pr-compact input[type="radio"][name="variant-id"][value="' + this.value + '"]');

				if (mainVariantRadio) {
					mainVariantRadio.checked = true;
					mainVariantRadio.dispatchEvent(createProductSelectChangeEvent(this));
				}
			});
		});
	}
	if (inputs.length) {
		new_css('form-validation-css', validation_css);

		inputs.forEach(function (el) {
			el.classList.add('listening');

			el.addEventListener('change', function (event) {
				const standardProductSelectSource = event.isTrusted || event.xtraStandardProductSelectSource ?
					(event.xtraStandardProductSelectSource || el) :
					null;

				setTimeout(async () => {
					const theme = getHtmlTheme();
					if (!['xclusive', 'xtra'].includes(theme)) return;

					let productFormTemplate = el.dataset.template;
					let productFormId = el.getAttribute('form');
					const productFormSection = document.querySelector('.m6pr-' + productFormTemplate);
					const sticky = document.getElementById('sticky-add-to-cart');

					if (!productFormSection) return;

					const productFormSectionF8pr = productFormSection.querySelector('form.f8pr');

					if (productFormSectionF8pr) {
						productFormSectionF8pr.classList.add('processing');

						if (productFormSectionF8pr.classList.contains('processed')) {
							productFormSectionF8pr.classList.remove('processed');
						}
					}

					let isQuickshop = false;

					if (productFormTemplate.startsWith('quickshop')) {
						productFormTemplate = productFormTemplate.replace('quickshop-', '');
						productFormId = productFormId.replace('-quickshop', '');
						isQuickshop = true;
					}

					const variantSelection = productFormSection.querySelector('.f8pr-variant-selection');
					const productGallery = productFormSection.querySelector('.l4pr');
					const oldProductUrl = productFormSection.dataset.productUrl;

					if (!variantSelection || !oldProductUrl) {
						if (productFormSectionF8pr) productFormSectionF8pr.classList.remove('processing');
						return;
					}

					const selectedOption = el.tagName === 'SELECT' ?
						el.options[el.selectedIndex] :
						variantSelection.querySelector(`input[name="${el.name}"]:checked`);

					const allSelectedOptions = variantSelection.querySelectorAll('input:checked, select option:checked');

					let newProductUrl =
						selectedOption && selectedOption.dataset && selectedOption.dataset.productUrl ?
						selectedOption.dataset.productUrl :
						allSelectedOptions[0] && allSelectedOptions[0].dataset && allSelectedOptions[0].dataset.productUrl ?
						allSelectedOptions[0].dataset.productUrl :
						oldProductUrl;

					let isSameProduct = oldProductUrl === newProductUrl || !newProductUrl;
					let newUrl = newProductUrl;

					if (!isSameProduct && isQuickshop) {
						newProductUrl = oldProductUrl;
						newUrl = oldProductUrl;
						isSameProduct = true;
					}

					let params = '';
					let renderSections = productFormTemplate;

					if (sticky) {
						renderSections += ',sticky-add-to-cart';
						sticky.classList.add('processing');

						if (sticky.classList.contains('processed')) {
							sticky.classList.remove('processed');
						}
					}

					if (isSameProduct) {
						params = `sections=${renderSections}`;
					}

					if (el.name === 'variant-id') {
						params += `&variant=${el.value}`;
					} else {
						const selectedOptionValues = Array.from(allSelectedOptions)
							.map(({
								dataset
							}) => dataset.optionValueId)
							.filter(Boolean);

						if (selectedOptionValues.length) {
							params += `&option_values=${selectedOptionValues.join(',')}`;
						}
					}

					const fetchUrl = params ? `${newProductUrl}?${params}` : newProductUrl;
					const standardProductSelect = standardProductSelectSource ?
						beginStandardProductSelect(el, standardProductSelectSource) :
						null;
					const previousRequest = productVariantRequests.get(productFormSection);

					if (previousRequest) {
						const supersededError = new DOMException('Superseded product variant request', 'AbortError');
						if (previousRequest.standardProductSelect) {
							previousRequest.standardProductSelect.reject(supersededError);
						}
						if (previousRequest.controller) previousRequest.controller.abort();
					}

					const requestState = {
						controller: new AbortController(),
						standardProductSelect: standardProductSelect
					};
					productVariantRequests.set(productFormSection, requestState);

					try {
						const response = await fetch(fetchUrl, { signal: requestState.controller.signal });

						if (!response.ok) {
							throw new Error(`Request failed: ${response.status} ${response.statusText}`);
						}

						const text = await response.text();

						if (productVariantRequests.get(productFormSection) !== requestState) {
							throw new DOMException('Superseded product variant request', 'AbortError');
						}

						const parsedResponse = isSameProduct ? JSON.parse(text) : null;
						const productSectionHtml = isSameProduct ? parsedResponse && parsedResponse[productFormTemplate] : text;

						if (typeof productSectionHtml !== 'string' || !productSectionHtml.trim()) {
							throw new Error('Product variant response is missing the product section');
						}

						const resultsMarkupForm = new DOMParser().parseFromString(productSectionHtml, 'text/html');
						const expectedProductSection = resultsMarkupForm.querySelector('.m6pr-' + productFormTemplate);

						if (!expectedProductSection || !resultsMarkupForm.querySelector('.f8pr-variant-selection')) {
							throw new Error('Product variant response contains incomplete product markup');
						}

						let resultsMarkupSticky = null;
						if (isSameProduct && sticky) {
							const stickySectionHtml = parsedResponse && parsedResponse['sticky-add-to-cart'];
							if (typeof stickySectionHtml !== 'string' || !stickySectionHtml.trim()) {
								throw new Error('Product variant response is missing the sticky cart section');
							}

							resultsMarkupSticky = new DOMParser().parseFromString(stickySectionHtml, 'text/html');
							if (!resultsMarkupSticky.querySelector('#sticky-add-to-cart')) {
								throw new Error('Product variant response contains incomplete sticky cart markup');
							}
						}

						const resultsGallery = resultsMarkupForm.querySelector('.l4pr');
						const shouldUpdateVariantGallery = productGallery && resultsGallery && (
							productGallery.dataset.variantImage || resultsGallery.dataset.variantImage
						);

						const currentVariantEl = resultsMarkupForm.querySelector('[data-current-variant]');
						const selected_variant_id = currentVariantEl && currentVariantEl.dataset ?
							currentVariantEl.dataset.currentVariant :
							undefined;

						if (sticky && selected_variant_id) {
							const stickySelect = sticky.querySelector('select[name="product_id_sticky"]');

							if (stickySelect) {
								stickySelect.value = selected_variant_id;
							}
						}

						const replaceElement = (selector) => {
							const oldEl = productFormSection.querySelector(selector);
							const newEl = resultsMarkupForm.querySelector(selector);

							if (oldEl && newEl) {
								oldEl.parentNode.replaceChild(newEl, oldEl);
							}
						};
						const replaceStickyElement = (selector) => {
							if (!sticky || !resultsMarkupSticky) {
								return;
							}

							const oldEl = sticky.querySelector(selector);
							const newEl = resultsMarkupSticky.querySelector(selector);

							if (oldEl && newEl) {
								oldEl.parentNode.replaceChild(newEl, oldEl);
							}
						};

						const elementsToReplace = [
							'.f8pr-stock',
							'.f8pr-variant-selection',
							'.f8pr-selling-plan',
							'.f8pr-pickup',
							'.f8pr-codes',
							'.f8pr-price',
							'.f8pr-product-form-installment',
							'.f8pr-fallback-id-input',
							'.f8pr-buy-button',
							'.f8pr-amount',
							'.f8pr-preorder',
							'.f8pr-quantity-rules',
							'.f8pr-volume-pricing',
							'.f8pr-shipping-timer',
							'.f8pr-urgency',
							'.f8pr-bulk'
						];
						const stickyElementsToReplace = [
							'figure',
							'header',
							'.f8pr-price',
							'.submit'
						];

						if (!isSameProduct) {
							document.querySelector('head title').innerHTML = resultsMarkupForm.querySelector('head title').innerHTML;
							document.getElementById('content').innerHTML = resultsMarkupForm.querySelector('#content').innerHTML;
						} else {
							elementsToReplace.forEach(replaceElement);
							stickyElementsToReplace.forEach(replaceStickyElement);

							if (shouldUpdateVariantGallery) {
								const oldGalleryContainer = productFormSection.querySelector('.l4pr-container');
								const newGalleryContainer = resultsMarkupForm.querySelector('.l4pr-container');
							
								if (oldGalleryContainer && newGalleryContainer) {
									oldGalleryContainer.innerHTML = newGalleryContainer.innerHTML;
								}
							}

							const f8pr = productFormSection.querySelector('form.f8pr');

							if (f8pr) {
								f8pr.classList.remove('processing', 'unavailable');
							}

							if (sticky) {
								sticky.classList.remove('processing', 'unavailable');
							}
						}

						if (isQuickshop) {
							if (shouldUpdateVariantGallery) {
								var noThumbs = productFormSection.querySelector('.l4pr.no-thumbs-mobile');
								if (noThumbs) noThumbs.classList.add('no-thumbs-desktop');

								var staticEl = productFormSection.querySelector('.l4pr.static');
								if (staticEl) staticEl.classList.remove('static');

								var stickyLi = productFormSection.querySelector('.l4pr li.sticky');
								if (stickyLi) stickyLi.remove();
							}

							const buyButton = productFormSection.querySelector('.f8pr-buy-button');

							if (buyButton) {
								const idAttr = buyButton.getAttribute('id');

								if (idAttr) {
									let id = idAttr;

									id = id
										.replaceAll(productFormTemplate, `quickshop-${productFormTemplate}`)
										.replaceAll(productFormId, `${productFormId}-quickshop`);

									buyButton.setAttribute(
										'id',
										id.replace(/(quickshop-)+/g, 'quickshop-').replace(/-$/, '')
									);
								}
							}
						}

						if (shouldUpdateVariantGallery) {
							window.dispatchEvent(listProductSliderEvt);
							window.dispatchEvent(updateSlidersEvt);
							window.dispatchEvent(fancyboxEvt);
						}

						//const resultsGallery = resultsMarkupForm.querySelector('.l4pr');

						if (
							productFormSection.querySelector('.l4pr .swiper-outer') &&
							resultsGallery &&
							resultsGallery.dataset.featured_media_position &&
							resultsGallery.dataset.mediaSize > 1
						) {
							var swiper = productFormSection.querySelector('.l4pr .swiper-outer').swiper;
							swiper.slideTo((resultsGallery.dataset.featured_media_position - 1), 500);
						}

						if (
							!isQuickshop &&
							!html_tag.classList.contains('mobile') &&
							resultsGallery &&
							resultsGallery.dataset.featured_media_position > 0 &&
							resultsGallery.classList.contains('static')
						) {
							const target = productFormSection.querySelector(
								'#section-product-' + resultsGallery.dataset.featured_media_position
							);

							if (target) {
								target.scrollIntoView();
							}
						}

						if (window.Shopify && Shopify.PaymentButton) {
							Shopify.PaymentButton.init();
						}

						const events = [
							productVariantsEvt,
							semanticSelectEvt,
							showHideDataElementEvt,
							sellingplansEvt,
							pickupAvailabilityEvt,
							modulePanelEvt,
							modulePanelAnchorEvt,
							schemeTooltipEvt,
							popupsEvt,
							removeSDCcssEvt,
							semanticInputEvt,
							formZindexEvt,
							dataChangeEvt,
							ratingsEvt,
							listProductSliderEvt,
							listDropEvt,
							fancyboxEvt,
							rangeSliderEvt,
							recommendedProductsEvt,
							accordeonEvt,
							countdownEvt,
							moduleTabsEvt,
							recentlyViewedProductsEvt
						];

						events.forEach(evt => window.dispatchEvent(evt));

						ajaxCart.init();
						linkMoreClick();

						if (general.template === 'product' && productFormTemplate.endsWith('main-product') && !isQuickshop) {
							window.history.replaceState({}, '', `${newUrl}${selected_variant_id ? `?variant=${selected_variant_id}` : ''}`);
						}

						if (standardProductSelect) {
							// Direct variant controls always identify an existing exact variant.
							// Keep the rendered response authoritative, but fall back to the
							// selected control if that response exposes a null variant payload.
							standardProductSelect.resolveFrom(
								resultsMarkupForm,
								el.name === 'variant-id' ? selectedOption : null
							);
						}
					} catch (error) {
						if (standardProductSelect) standardProductSelect.reject(error);
						if (!error || error.name !== 'AbortError') {
							console.warn('Productform variant change error', error);
						}
					} finally {
						if (productVariantRequests.get(productFormSection) === requestState) {
							productVariantRequests.delete(productFormSection);
							const currentProductForm = productFormSection.querySelector('form.f8pr');
							if (currentProductForm) currentProductForm.classList.remove('processing');
							if (sticky) sticky.classList.remove('processing');
						}
					}
				}, 1);
			});
		});
	} else if (bulk.length) {
		bulk.forEach(function (el) {
			let buttonSubmit = el.closest('.f8pr, .popup-a, .f8vl, .l4ml-form') ? el.closest('.f8pr, .popup-a, .f8vl, .l4ml-form').querySelector('button[type="submit"]') : null;
			if (!buttonSubmit) {
				return;
			}

			el.querySelectorAll('input').forEach(function (input) {
				input.addEventListener('blur', function () {
					if (input.value == '') {
						input.value = 0;
					}
				});

				input.addEventListener('change', function () {
					let total = 0;
					let price = 0;

					el.querySelectorAll('input').forEach(function (input) {
						if (input.value == '') {
							return;
						}

						total += parseInt(input.value);
						price += parseInt(input.value) * parseInt(input.getAttribute('data-price'));
					});

					let total_el = null;
					let price_el = null;

					const form = buttonSubmit.closest('form');

					if (form) {
						const bulkQty = form.querySelector('.bulk-qty');

						if (bulkQty) {
							total_el = bulkQty;
							price_el = form.querySelector('.bulk-price');
						}
					} else {
						const m6pr = buttonSubmit.closest('.m6pr');

						if (m6pr) {
							const bulkQty = m6pr.querySelector('.bulk-qty');

							if (bulkQty) {
								total_el = bulkQty;
								price_el = m6pr.querySelector('.bulk-price');
							}
						}
					}

					if (total_el) {
						total_el.innerHTML = total;
						price_el.innerHTML = Shopify.formatMoney(price);
					}

					if (total > 0) {
						buttonSubmit.classList.remove('disabled');
						buttonSubmit.removeAttribute('disabled');
					} else {
						buttonSubmit.classList.add('disabled');
					}
				});
			});

			buttonSubmit.addEventListener('click', function (e) {
				e.preventDefault();
				new_css('form-validation-css', validation_css);
				this.classList.add('processing');
				this.closest('form').classList.add('processing');

				let productData = [];

				el.querySelectorAll('li').forEach(function (variant) {
					let input = variant.querySelector('input');

					if (input == null) {
						return;
					}

					if (input.value > 0) {
						productData.push({
							'id': input.getAttribute('data-id'),
							'quantity': input.value
						});

						input.value = 0;
					}

					productData.reverse();
				});

				if (productData.length == 0) {
					this.closest('form').classList.remove('processing');
					setProcessed(this.closest('form'));
					return;
				}

				const form = this.closest('form');
				ajaxCart.addBulkItems(form, productData);
			});
		});
	}

	const product_card_add_to_cart = document.querySelectorAll('.l4cl .product-card.update-variants select[name="id"]:not(.listening)');

	if (product_card_add_to_cart.length) {
		window.dispatchEvent(productcardVariantsEvt);
	}
});
window.dispatchEvent(productVariantsEvt);


// Dispatch theme-specific events
if (getHtmlTheme() === 'xclusive') {
	window.dispatchEvent(sizechartPopupEvt);
	window.dispatchEvent(productBlockPopupEvt);
} else if (getHtmlTheme() === 'xtra') {
	window.dispatchEvent(inlineModalCloseEvt);
}




/*! Shopify Functions -------------------------------------------------- */

// Live search - performs search by fetching predictive results from Shopify, updating the results container, and handling suggestion clicks.
var liveSearch = function (elem, livesearch_placeholders) {
	if (!elem || !search_id) return;

	const searchTerm = elem.value.trim();
	getSearchResults(searchTerm, livesearch_placeholders);
}
var getSearchResults = function (searchTerm, livesearch_placeholders) {
	var liveSearchEl = document.getElementById('livesearch');
	if (!liveSearchEl || !search_id) return;

	if (searchTerm.length > 0) {
		const predictiveSearchUrl = getRouteUrl('predictive_search_url');
		if (!predictiveSearchUrl) {
			search_id.classList.remove('processing');
			return;
		}

		fetch(predictiveSearchUrl + "?q=" + encodeURIComponent(searchTerm) + "&resources[limit]=4&resources[limit_scope]=each&section_id=livesearch")
			.then((response) => {
				if (!response.ok) {
					console.warn('Request failed:', response.status, response.statusText);
					return;
				}
				return response.text();
			})
			.then((text) => {
				const liveSearchSection = new DOMParser().parseFromString(text, 'text/html').querySelector('#shopify-section-livesearch');
				if (!liveSearchSection) {
					search_id.classList.remove('processing');
					return;
				}

				const resultsMarkup = liveSearchSection.innerHTML;
				liveSearchEl.innerHTML = resultsMarkup;
				search_id.classList.remove('processing');
				const suggestions = liveSearchEl.querySelectorAll('[data-search-suggestion]');
				if (suggestions.length) {
					Array.from(suggestions).forEach(function (el) {
						el.addEventListener('click', function (e) {
							e.preventDefault();
							search_input = search_id.getElementsByTagName('input');
							if (!search_input.length) return;
							search_input[0].value = el.dataset.searchSuggestion;
							search_id.classList.add('processing');
							liveSearch(search_input[0]);
						});
					});
				}
				window.dispatchEvent(ratingsEvt);
			})
			.catch((error) => {
				console.warn(error);
			});
	} else if (livesearch_placeholders) {
		liveSearchEl.innerHTML = '';
		liveSearchEl.appendChild(livesearch_placeholders);
		html_tag.classList.add('search-full', 'search-full-mode');
		search_id.classList.remove('processing');
	} else {
		search_id.classList.remove('processing');
	}
};


// Updates the cart item count element by fetching the current cart data if the cart drawer is disabled
if (!document.getElementById('cart')) {
	const cartCountEl = document.getElementById('cart-count');

	if (cartCountEl) {
		fetch(getShopifyRouteRoot() + 'cart.js')
			.then(response => response.json())
			.then(data => {
				cartCountEl.innerHTML = data.item_count;
			})
			.catch(error => {
				console.log('cartCount error', error);
			});
	}
}


// AJAX cart - handling add-to-cart, bulk/upsell items, cart updates, notes, discounts, and item removal.
var ajaxCart = (function (module) {
	var init, formOverride, addCartItem, handleCartPanel, updateCartPanel, handleCartPage, updateCartPage, showCartPanel, openCart, refreshCart, updateDiscount, handleCartUpdates, removeItem, updateCartCount, handleErrorMessage, addToCart, addBulkItems, addNote; // Define the functions
	var productFormContainer, cartPageContainer, sideCartContainer, cartPageTemplate, countElement, totalElement, itemsQueue, formData, formObject, line, quantity, count, config, checkedProducts, sideCartId, openCartPromise, cartRefreshQueue = Promise.resolve(), cartFallbackStarted, cartNoteOperationId = 0, activeCartNoteSave = null, queuedCartNoteSave = null; // Define the data and elements

	init = function () {
		productFormContainer = document.querySelectorAll('form.f8pr:not(.cart-initialized), form.form-card:not(.initialized, .cart-initialized)');
		cartPageContainer = document.querySelector('.form-cart, .cart-empty');
		sideCartContainer = document.getElementById('cart');
		countElement = document.querySelectorAll('#cart-count, #cart-count--m, .mobile-home-cart-count');
		totalElement = document.querySelectorAll('#cart-total, #cart-total--m');

		var sideCartSection = sideCartContainer ? sideCartContainer.closest('[id^="shopify-section-"]') : null;

		sideCartId = sideCartContainer ?
			sideCartContainer.getAttribute('data-section-id') ||
			(sideCartSection ? sideCartSection.id.replace('shopify-section-', '') : 'side-cart') :
			'side-cart';

		if (productFormContainer.length) {
			formOverride();
		}

		if (cartPageContainer != null) {
			cartPageContainer = cartPageContainer.parentElement;
			cartPageTemplate = cartPageContainer.id.replace('shopify-section-', '');
			handleCartUpdates(cartPageContainer);
		}
	};

	function processLinkedForm(form, action = 'add', success = true) {
		const formId = form.getAttribute('id');
		if (!formId) return;

		const btn = document.querySelector(`button[form="${formId}"]`);
		if (!btn) return;

		const closestForm = btn.closest('form.f8ps');
		if (!closestForm) return;

		if (action === 'add') {
			closestForm.classList.add('processing');
			closestForm.classList.remove('processed');
			return;
		}

		if (action === 'remove') {
			closestForm.classList.remove('processing');

			if (success) {
				setProcessed(closestForm);
			} else {
				closestForm.classList.remove('processed');
			}
		}
	}

	formOverride = function () {
		Array.from(productFormContainer).forEach(function (form) {
			if (form.classList.contains('cart-initialized')) {
				return;
			}
			form.classList.add('cart-initialized');
			form.addEventListener('submit', function (e) {
				new_css('form-validation-css', validation_css);

				form.classList.add('processing');

				processLinkedForm(form, 'add');
				/*if (sticky) {
					sticky.classList.add('processing');
				}*/
				e.preventDefault();
				addCartItem(form);
			});
		});
	};

	addCartItem = function (form, listItem) {
		let selectedUpsellItems = null;

		if (form.classList.contains('f8pr-buy-button')) {
			const productContainer = form.closest('div.f8pr');
			const currentUpsellElement = productContainer ? productContainer.querySelector('.upsell-items') : null;

			if (currentUpsellElement) {
				selectedUpsellItems = currentUpsellElement.querySelectorAll('input:checked');
			}
		}

		addToCart(form, listItem, selectedUpsellItems);
	}

	function getCartJsonForStandardEvent(response) {
		if (
			response &&
			Array.isArray(response.items) &&
			typeof response.item_count !== 'undefined' &&
			typeof response.total_price !== 'undefined'
		) {
			return Promise.resolve(response);
		}

		return fetch(getRouteUrl('cart_url', 'cart') + '.js', {
			credentials: 'same-origin',
			headers: {
				'X-Requested-With': 'XMLHttpRequest',
				'Accept': 'application/json'
			}
		}).then((cartResponse) => {
			if (!cartResponse.ok) {
				throw new Error(`Cart state request failed: ${cartResponse.status} ${cartResponse.statusText}`);
			}
			return cartResponse.json();
		});
	}

	function resolveStandardCartMutation(standardMutation, response) {
		if (!standardMutation) return Promise.resolve(true);

		return getCartJsonForStandardEvent(response)
			.then((cart) => standardMutation.resolveFromAjaxCart(cart))
			.catch((error) => {
				standardMutation.reject(error, 'INVALID', false);
				console.warn('Standard storefront cart result conversion failed', error);
				return false;
			});
	}

	function rejectStandardCartMutation(standardMutation, error, code, emitError = true) {
		if (standardMutation) standardMutation.reject(error, code, emitError);
	}

	function getStandardCartMutationStatus(response) {
		const parsedStatus = parseInt(response && response.status, 10);
		if (Number.isFinite(parsedStatus)) return parsedStatus;
		return response && response.status === 'bad_request' ? 400 : 0;
	}


	function settleStandardCartMutationFailure(standardMutation, response) {
		if (!standardMutation) return Promise.resolve(false);

		const status = getStandardCartMutationStatus(response);
		standardMutation.reject(
			createStandardCartError(response),
			status >= 500 || status === 423 || status === 429 || status === 430 ? 'SERVICE_UNAVAILABLE' : 'INVALID',
			true
		);
		return Promise.resolve(false);
	}


	function queueNativeCartSurfaceUpdate(updates, callback) {
		try {
			updates.push(Promise.resolve(callback()));
		} catch (error) {
			updates.push(Promise.reject(error));
		}
	}

	function settleNativeCartMutationWithUi(standardSettlement, updates, failureMessage) {
		const uiSettlement = Promise.all(updates).then(
			(results) => ({ results: results, error: null }),
			(error) => ({ results: null, error: error })
		);

		return Promise.resolve(standardSettlement).then((settledCart) => {
			return uiSettlement.then((outcome) => {
				const renderFailed = outcome.error || outcome.results.some((result) => result === false);

				if (renderFailed) {
					console.warn(failureMessage, outcome.error || new Error(failureMessage));
					navigateToCartOnce();
				}

				return settledCart;
			});
		});
	}

	function handlePostMutationFailure(standardMutation, error, failureMessage) {
		console.warn(failureMessage, error);
		return resolveStandardCartMutation(standardMutation, false).then(() => {
			navigateToCartOnce();
			return false;
		});
	}

	function getStandardAddLines(form, upsellItems) {
		const data = new FormData(form);
		const lines = [];
		const mainProductId = data.get('id');
		const mainQuantity = parseInt(data.get('quantity') || 1, 10);

		if (mainProductId) {
			lines.push({
				merchandiseId: mainProductId,
				quantity: Number.isFinite(mainQuantity) ? mainQuantity : 1
			});
		}

		if (upsellItems && upsellItems.length) {
			Array.from(upsellItems).forEach((element) => {
				if (!element.dataset.id) return;
				lines.push({ merchandiseId: element.dataset.id, quantity: 1 });
			});
		}

		return lines;
	}

	function requireNativeCartRefresh(result, message) {
		return Promise.resolve(result).then((updated) => {
			if (!updated) throw new Error(message);
			return true;
		});
	}

	function refreshCartAfterAdd(response, listItem) {
		const updates = [];

		if (sideCartContainer) {
			if (response && response.sections && Object.keys(response.sections).length) {
				updates.push(requireNativeCartRefresh(updateCartPanel(response, true, !!listItem), 'Cart drawer refresh did not complete.'));
			} else {
				updates.push(requireNativeCartRefresh(updateCartPanel(false, true, !!listItem, true), 'Cart drawer refresh did not complete.'));
			}
		}

		if (general.template == 'cart' && cartPageContainer != null) {
			if (response && response.sections && response.sections[cartPageTemplate]) {
				updates.push(requireNativeCartRefresh(updateCartPage(response), 'Cart page refresh did not complete.'));
			} else {
				updates.push(
					fetch(getShopifyRouteRoot() + '?sections=' + cartPageTemplate)
						.then((cartPageResponse) => {
							if (!cartPageResponse.ok) {
								throw new Error(`Cart page refetch failed: ${cartPageResponse.status} ${cartPageResponse.statusText}`);
							}
							return cartPageResponse.json();
						})
						.then((sections) => {
							if (!sections[cartPageTemplate]) {
								throw new Error('Cart page section is missing from the cart response.');
							}
							const resultsMarkup = getCartPageMarkupFromSection(sections[cartPageTemplate]);
							if (resultsMarkup == null) {
								throw new Error('Cart page refresh did not complete.');
							}
							handleCartPage(resultsMarkup);
							return true;
						})
				);
			}
		}

		if (!sideCartContainer && cartPageContainer == null) {
			updates.push(refreshCartSummary());
		}

		return Promise.all(updates);
	}

	const handleAddToCartResponse = function (response, form, listItem, upsellItems, standardMutation) {
		form.classList.remove('processing');

		document.querySelectorAll('[data-error-key]').forEach(function (el) {
			el.classList.remove('is-invalid');
		});

		const isError = !!(response && response.status);

		processLinkedForm(form, 'remove', !isError);

		if (isError) {
			form.classList.remove('processed');

			if (listItem) listItem.remove();
			hidePanels();

			if (typeof response.description == 'object') {
				let keys = Object.keys(response.description);
				let messages = Object.values(response.description);

				for (let i = 0; i < keys.length; i++) {
					const el = document.querySelector('[data-error-key="' + keys[i] + '"]');
					if (el) el.classList.add('is-invalid');
				}
				for (let i = 0; i < messages.length; i++) {
					handleErrorMessage(messages[i]);
				}
			} else {
				handleErrorMessage(response.description);
			}

			return settleStandardCartMutationFailure(standardMutation, response).then(() => false);
		}

		setProcessed(form);

		const standardSettlement = resolveStandardCartMutation(standardMutation, response);
		const uiUpdates = [];

		queueNativeCartSurfaceUpdate(uiUpdates, () => {
			if (listItem) listItem.remove();

			return refreshCartAfterAdd(response, listItem).then(() => {
				if (upsellItems && upsellItems.length > 0) {
					upsellItems.forEach(function (checkbox) {
						checkbox.checked = false;
					});
				}

				return true;
			});
		});

		return settleNativeCartMutationWithUi(
			standardSettlement,
			uiUpdates,
			'Cart UI update failed after a successful add-to-cart operation.'
		);
	};

	addToCart = function (form, listItem, upsellItems) {
		const sections = [];

		if (sideCartId) sections.push(sideCartId);
		if (general.template == 'cart' && cartPageTemplate) sections.push(cartPageTemplate);

		const sectionsToFetch = sections.join(',');
		const hasBulkItems = upsellItems && upsellItems.length > 0;
		const standardTarget = getStandardCartEventTarget(form, listItem && listItem.closest ? listItem.closest('#cart') : null);
		const standardMutation = beginStandardCartMutation('lines', standardTarget, {
			action: 'add',
			context: getStandardCartContext(standardTarget, 'product'),
			lines: getStandardAddLines(form, upsellItems)
		});

		let request;
		let mutationSucceeded = false;

		if (hasBulkItems) {
			const bulkFormData = new FormData(form);
			let allItems = [];
			const mainProductId = bulkFormData.get('id');
			const mainProductQuantity = bulkFormData.get('quantity') || 1;
			const mainProductItem = {
				id: parseInt(mainProductId),
				quantity: parseInt(mainProductQuantity)
			};
			const sellingPlan = bulkFormData.get('selling_plan');
			if (sellingPlan) mainProductItem.selling_plan = parseInt(sellingPlan);

			const properties = {};
			for (let [key, value] of bulkFormData.entries()) {
				if (key.startsWith('properties[')) {
					const propKey = key.replace('properties[', '').replace(']', '');
					properties[propKey] = value;
				}
			}
			if (Object.keys(properties).length > 0) mainProductItem.properties = properties;
			allItems.push(mainProductItem);

			Array.from(upsellItems).forEach(element => {
				const upsellItem = { id: parseInt(element.dataset.id), quantity: 1 };
				if (element.dataset.parentProduct) upsellItem.parent_id = parseInt(element.dataset.parentProduct);
				allItems.push(upsellItem);
			});

			config = {
				method: 'POST',
				credentials: 'same-origin',
				body: JSON.stringify({ items: allItems, sections: sectionsToFetch }),
				headers: {
					'Content-Type': 'application/json',
					'X-Requested-With': 'xmlhttprequest'
				}
			};
			request = fetch(getRouteUrl('cart_add_url', 'cart/add.js'), config);
		} else {
			formData = new FormData(form);
			formData.append('sections', sectionsToFetch);
			config = {
				method: 'POST',
				body: formData,
				headers: {
					'X-Requested-With': 'XMLHttpRequest',
					'Accept': 'application/javascript'
				}
			};
			request = fetch(getRouteUrl('cart_add_url', 'cart/add.js'), config);
		}

		return request
			.then(async (cartResponse) => {
				let response;
				mutationSucceeded = cartResponse.ok;
				try {
					response = await cartResponse.json();
				} catch (error) {
					throw new Error('Invalid add-to-cart response');
				}
				if (!cartResponse.ok && !response.status) response.status = cartResponse.status;
				mutationSucceeded = !response.status;
				return handleAddToCartResponse(response, form, listItem, upsellItems, standardMutation);
			})
			.catch((error) => {
				form.classList.remove('processing');

				if (mutationSucceeded) {
					processLinkedForm(form, 'remove', true);
					setProcessed(form);
					return handlePostMutationFailure(
						standardMutation,
						error,
						'Post-mutation add-to-cart handling failed.'
					);
				}

				form.classList.remove('processed');
				processLinkedForm(form, 'remove', false);
				rejectStandardCartMutation(standardMutation, error, 'SERVICE_UNAVAILABLE', true);
				console.warn('addCartItem error', error);
				if (hasBulkItems) {
					handleErrorMessage('Er is een fout opgetreden bij het toevoegen aan de winkelwagen.');
				}
				return false;
			});
	};


	addBulkItems = function (form, productData) {
		const sections = [];

		if (sideCartId) sections.push(sideCartId);
		if (general.template == 'cart' && cartPageTemplate) sections.push(cartPageTemplate);

		const items = productData.map((element) => ({
			id: parseInt(element.id, 10),
			quantity: parseInt(element.quantity, 10)
		}));
		const requestBody = { items: items };
		const sectionsToFetch = sections.join(',');
		const standardTarget = getStandardCartEventTarget(form, null);
		const standardMutation = beginStandardCartMutation('lines', standardTarget, {
			action: 'add',
			context: getStandardCartContext(standardTarget, 'product'),
			lines: items.map((item) => ({
				merchandiseId: String(item.id),
				quantity: item.quantity
			}))
		});
		let mutationSucceeded = false;

		if (sectionsToFetch) requestBody.sections = sectionsToFetch;

		return fetch(getRouteUrl('cart_add_url', 'cart/add.js'), {
			method: 'POST',
			credentials: 'same-origin',
			body: JSON.stringify(requestBody),
			headers: {
				'Content-Type': 'application/json',
				'X-Requested-With': 'xmlhttprequest'
			}
		})
			.then(async (cartResponse) => {
				let response;
				mutationSucceeded = cartResponse.ok;

				try {
					response = await cartResponse.json();
				} catch (error) {
					throw new Error('Invalid bulk add-to-cart response');
				}

				if (!cartResponse.ok && !response.status) response.status = cartResponse.status;
				mutationSucceeded = !response.status;
				form.classList.remove('processing');

				if (response.status) {
					if (typeof response.description == 'object') {
						const keys = Object.keys(response.description);
						const messages = Object.values(response.description);

						keys.forEach((key) => {
							const errorElement = document.querySelector('[data-error-key="' + key + '"]');
							if (errorElement) errorElement.classList.add('is-invalid');
						});
						messages.forEach((message) => handleErrorMessage(message));
					} else {
						handleErrorMessage(response.description);
					}

					await settleStandardCartMutationFailure(standardMutation, response);
					return false;
				}

				setProcessed(form);

				const standardSettlement = resolveStandardCartMutation(standardMutation, response);
				const uiUpdates = [];
				queueNativeCartSurfaceUpdate(uiUpdates, () => refreshCartAfterAdd(response, null));

				return settleNativeCartMutationWithUi(
					standardSettlement,
					uiUpdates,
					'Cart UI update failed after a successful bulk add-to-cart operation.'
				);
			})
			.catch((error) => {
				form.classList.remove('processing');

				if (mutationSucceeded) {
					setProcessed(form);
					return handlePostMutationFailure(
						standardMutation,
						error,
						'Post-mutation bulk add-to-cart handling failed.'
					);
				}

				form.classList.remove('processed');
				rejectStandardCartMutation(standardMutation, error, 'SERVICE_UNAVAILABLE', true);
				console.warn('bulkAddCartItems error', error);
				return false;
			});
	};


	handleErrorMessage = function (errorMessage = false) {
		if (errorMessage) {
			var alertAttributes = {
					message: errorMessage,
					type: "error"
				},
				showAlertEvent = new CustomEvent("showAlert", {
					detail: alertAttributes
				});
			window.dispatchEvent(showAlertEvent);
		}
	}

	showCartPanel = function () {
		openPanel('cart');
		window.dispatchEvent(new CustomEvent("themeCartOpened"));
	}

	function getCartPanelMarkupFromSection(sectionHtml) {
		if (!sectionHtml) return null;

		const parsed = new DOMParser().parseFromString(sectionHtml, 'text/html');
		const cartElement = parsed.querySelector('#cart');

		if (cartElement) {
			return cartElement.innerHTML;
		}

		const sectionRoot = parsed.querySelector('#shopify-section-' + sideCartId);

		if (!sectionRoot) {
			console.warn('cart section root not found', {
				sideCartId: sideCartId,
				sectionHtml: sectionHtml
			});
			return null;
		}

		return sectionRoot.innerHTML;
	}

	function getCartPageMarkupFromSection(sectionHtml) {
		if (!sectionHtml || !cartPageTemplate) return null;

		const parsed = new DOMParser().parseFromString(sectionHtml, 'text/html');
		const sectionRoot = parsed.querySelector('#shopify-section-' + cartPageTemplate);

		if (!sectionRoot) {
			console.warn('cart page section root not found', {
				cartPageTemplate: cartPageTemplate,
				sectionHtml: sectionHtml
			});
			return null;
		}

		return sectionRoot.innerHTML;
	}

	function getCartSectionsUrl(sectionIds) {
		const url = new URL(window.location.href);
		url.searchParams.delete('section_id');
		url.searchParams.set('sections', sectionIds.join(','));
		return url.pathname + url.search;
	}

	function refreshCartSummary() {
		if (!countElement.length && !totalElement.length) return Promise.resolve(true);

		return fetch(getRouteUrl('cart_url', 'cart') + '.js', {
			credentials: 'same-origin',
			headers: {
				'X-Requested-With': 'XMLHttpRequest',
				'Accept': 'application/json'
			}
		})
			.then((response) => {
				if (!response.ok) {
					throw new Error(`Cart summary request failed: ${response.status} ${response.statusText}`);
				}
				return response.json();
			})
			.then((cart) => {
				let formattedTotal = null;

				if (totalElement.length) {
					if (!window.Shopify || typeof window.Shopify.formatMoney !== 'function') {
						throw new Error('Shopify.formatMoney is unavailable for the cart total refresh.');
					}
					formattedTotal = window.Shopify.formatMoney(cart.total_price);
				}

				updateCartCount(cart.item_count, formattedTotal);
				return true;
			});
	}

	updateCartPage = function (response = false) {
		if (!response || !response.sections || !cartPageTemplate) {
			return Promise.resolve(false);
		}

		const resultsMarkup = getCartPageMarkupFromSection(response.sections[cartPageTemplate]);

		if (resultsMarkup == null) {
			return Promise.resolve(false);
		}

		handleCartPage(resultsMarkup);
		return Promise.resolve(true);
	}

	updateCartPanel = function (response = false, openCartPanel = true, undoRemove = false, forceRefetch = false) {
		if (response) {
			if (!response.sections || !response.sections[sideCartId]) {
				console.warn('updateCartPanel: missing side cart section', {
					sideCartId: sideCartId,
					availableSections: response.sections ? Object.keys(response.sections) : []
				});
				return Promise.resolve(false);
			}

			const resultsMarkup = getCartPanelMarkupFromSection(response.sections[sideCartId]);

			if (resultsMarkup == null) {
				return Promise.resolve(false);
			}

			handleCartPanel(resultsMarkup, openCartPanel, undoRemove);
			return Promise.resolve(true);
		}

		if (
			sideCartContainer &&
			(!sideCartContainer.classList.contains('side-cart-initialized') || forceRefetch)
		) {
			return fetch(getShopifyRouteRoot() + '?sections=' + sideCartId)
				.then((response) => {
					if (!response.ok) {
						throw new Error(`Request failed: ${response.status} ${response.statusText}`);
					}
					return response.text();
				})
				.then((text) => {
					if (!text) return false;

					const sections = JSON.parse(text);

					if (!sections[sideCartId]) {
						console.warn('updateCartPanel fetch: section missing', {
							sideCartId: sideCartId,
							availableSections: Object.keys(sections)
						});
						return false;
					}

					const resultsMarkup = getCartPanelMarkupFromSection(sections[sideCartId]);

					if (resultsMarkup == null) {
						return false;
					}

					handleCartPanel(resultsMarkup, openCartPanel, undoRemove);
					return true;
				})
				.catch((error) => {
					console.warn('updateCartPanel error', error);
					return false;
				});
		}

		if (sideCartContainer) {
			showCartPanel();
			return Promise.resolve(true);
		}

		return Promise.resolve(false);
	};

	function getCartFallbackUrl(fallbackUrl) {
		if (typeof fallbackUrl === 'string' && fallbackUrl) return fallbackUrl;
		return getRouteUrl('cart_url', 'cart');
	}

	function navigateToCartOnce(fallbackUrl) {
		if (cartFallbackStarted) return;
		cartFallbackStarted = true;

		const targetUrl = getCartFallbackUrl(fallbackUrl);

		try {
			window.location.assign(targetUrl);
		} catch (error) {
			window.location.href = targetUrl;
		}
	}

	refreshCart = function () {
		const performRefresh = function () {
			init();

			const sectionIds = [];

			if (sideCartContainer && sideCartId) {
				sectionIds.push(sideCartId);
			}

			if (cartPageContainer && cartPageTemplate && !sectionIds.includes(cartPageTemplate)) {
				sectionIds.push(cartPageTemplate);
			}

			if (!sectionIds.length) {
				return refreshCartSummary();
			}

			return fetch(getCartSectionsUrl(sectionIds), {
				credentials: 'same-origin',
				headers: {
					'X-Requested-With': 'XMLHttpRequest',
					'Accept': 'application/json'
				}
			})
				.then((response) => {
					if (!response.ok) {
						throw new Error(`Cart sections request failed: ${response.status} ${response.statusText}`);
					}
					return response.json();
				})
				.then((sections) => {
					let panelMarkup = null;
					let pageMarkup = null;

					if (sideCartContainer) {
						panelMarkup = getCartPanelMarkupFromSection(sections[sideCartId]);
						if (panelMarkup == null) {
							throw new Error(`Missing or invalid cart section: ${sideCartId}`);
						}
					}

					if (cartPageContainer) {
						pageMarkup = getCartPageMarkupFromSection(sections[cartPageTemplate]);
						if (pageMarkup == null) {
							throw new Error(`Missing or invalid cart page section: ${cartPageTemplate}`);
						}
					}

					if (panelMarkup != null) {
						handleCartPanel(panelMarkup, false, false, false);
					}

					if (pageMarkup != null) {
						handleCartPage(pageMarkup);
					}

					return true;
				});
		};

		const queuedRefresh = cartRefreshQueue
			.catch(() => true)
			.then(performRefresh);

		cartRefreshQueue = queuedRefresh;
		return queuedRefresh;
	};

	openCart = function (options = {}) {
		const shouldRedirect = options.redirect !== false;
		const fallbackUrl = getCartFallbackUrl(options.fallbackUrl);

		if (!openCartPromise) {
			openCartPromise = Promise.resolve()
				.then(() => {
					init();
					return sideCartContainer ? updateCartPanel(false, true) : false;
				})
				.then((opened) => !!opened)
				.finally(() => {
					openCartPromise = null;
				});
		}

		return openCartPromise
			.then((opened) => {
				if (!opened && shouldRedirect) {
					navigateToCartOnce(fallbackUrl);
				}
				return opened;
			})
			.catch((error) => {
				if (shouldRedirect) {
					navigateToCartOnce(fallbackUrl);
					return false;
				}
				throw error;
			});
	};

	handleCartPage = function (resultsMarkup) {
		cartPageContainer.innerHTML = resultsMarkup;
		if (typeof window.updateAcceleratedCheckoutLayout === 'function') {
			window.updateAcceleratedCheckoutLayout();
		}
		window.dispatchEvent(semanticInputEvt);
		window.dispatchEvent(formValidateEvt);
		window.dispatchEvent(accordeonEvt);
		window.dispatchEvent(countdownEvt);
		window.dispatchEvent(bindInputEvt);
		window.dispatchEvent(schemeTooltipEvt);
		window.dispatchEvent(popupsEvt);
		handleCartUpdates(cartPageContainer);
		updateCartCount();
	}

	handleCartPanel = function (resultsMarkup, openCartPanel, undoRemove, preserveRemoving = true) {

		let items = sideCartContainer.querySelectorAll('.l4ca > li');
		sideCartContainer.innerHTML = resultsMarkup;
		Array.from(items).forEach(function (item, index) {
			if (preserveRemoving && item.classList.contains('removing')) {
				if (undoRemove && sideCartContainer.querySelectorAll('.l4ca > li')[(index + 1)]) {
					sideCartContainer.querySelector('.l4ca').insertBefore(item, sideCartContainer.querySelectorAll('.l4ca > li')[(index + 1)]);
				} else if (undoRemove) {
					sideCartContainer.querySelector('.l4ca').append(item);
				} else {
					sideCartContainer.querySelector('.l4ca').insertBefore(item, sideCartContainer.querySelectorAll('.l4ca > li')[(index)]);
				}
				if (sideCartContainer.querySelector('.empty:not(.hidden)')) {
					sideCartContainer.querySelector('.empty').classList.add('hidden');
				}
			}
		});

		if (sideCartContainer.querySelector('.product-recommendations:not(.product-recommendations-initialized)')) {
			window.dispatchEvent(recommendedProductsEvt);
		}

		window.dispatchEvent(modulePanelEvt);
		window.dispatchEvent(listCartEvt);
		window.dispatchEvent(semanticInputEvt);
		handleCartUpdates(sideCartContainer);
		window.dispatchEvent(formValidateEvt);
		window.dispatchEvent(accordeonEvt);
		window.dispatchEvent(schemeTooltipEvt);
		window.dispatchEvent(popupsEvt);
		updateCartCount();
		if (openCartPanel) {
			showCartPanel();
		}
		sideCartContainer.classList.add('side-cart-initialized');
	}

	function createCartNoteAbortError() {
		if (typeof DOMException === 'function') {
			return new DOMException('Cart note save was superseded', 'AbortError');
		}

		const error = new Error('Cart note save was superseded');
		error.name = 'AbortError';
		return error;
	}

	function hasPendingCartNoteSave() {
		return Boolean(activeCartNoteSave || queuedCartNoteSave);
	}

	function isCurrentCartNoteOperation(operation) {
		return Boolean(
			operation &&
			!operation.superseded &&
			activeCartNoteSave === operation &&
			operation.id === cartNoteOperationId
		);
	}

	function restoreCartNoteNavigationState(element) {
		if (!element || element.getAttribute('data-cart-note-locked') !== 'true') return;

		if ('disabled' in element) {
			element.disabled = element.getAttribute('data-cart-note-original-disabled') === 'true';
		}
		if ('inert' in element) {
			element.inert = element.getAttribute('data-cart-note-original-inert') === 'true';
		}

		if (element.getAttribute('data-cart-note-had-aria-disabled') === 'true') {
			element.setAttribute('aria-disabled', element.getAttribute('data-cart-note-original-aria-disabled') || 'false');
		} else {
			element.removeAttribute('aria-disabled');
		}

		if (element.getAttribute('data-cart-note-original-disabled-class') !== 'true') {
			element.classList.remove('disabled');
		}

		element.removeAttribute('data-cart-note-locked');
		element.removeAttribute('data-cart-note-original-disabled');
		element.removeAttribute('data-cart-note-original-inert');
		element.removeAttribute('data-cart-note-had-aria-disabled');
		element.removeAttribute('data-cart-note-original-aria-disabled');
		element.removeAttribute('data-cart-note-original-disabled-class');
	}

	function setCartNoteNavigationLocked(locked) {
		const navigationElements = document.querySelectorAll(
			'[data-cart-note-navigation], [data-cart-note-navigation-container]'
		);

		Array.from(navigationElements).forEach(function (element) {
			if (!locked) {
				restoreCartNoteNavigationState(element);
				return;
			}

			if (element.getAttribute('data-cart-note-locked') !== 'true') {
				element.setAttribute('data-cart-note-locked', 'true');
				if ('disabled' in element) {
					element.setAttribute('data-cart-note-original-disabled', element.disabled ? 'true' : 'false');
				}
				if ('inert' in element) {
					element.setAttribute('data-cart-note-original-inert', element.inert ? 'true' : 'false');
				}
				element.setAttribute('data-cart-note-had-aria-disabled', element.hasAttribute('aria-disabled') ? 'true' : 'false');
				element.setAttribute('data-cart-note-original-aria-disabled', element.getAttribute('aria-disabled') || '');
				element.setAttribute('data-cart-note-original-disabled-class', element.classList.contains('disabled') ? 'true' : 'false');
			}

			if (element.hasAttribute('data-cart-note-navigation')) element.classList.add('disabled');
			if ('disabled' in element) element.disabled = true;
			if (element.hasAttribute('data-cart-note-navigation-container') && 'inert' in element) element.inert = true;
			element.setAttribute('aria-disabled', 'true');
		});
	}

	function bindCartNoteNavigationGuards(container) {
		const navigationElements = container.querySelectorAll(
			'[data-cart-note-navigation]:not([data-cart-note-navigation-listening])'
		);
		const navigationForms = container.querySelectorAll(
			'form[data-cart-note-navigation-form]:not([data-cart-note-navigation-listening])'
		);

		Array.from(navigationElements).forEach(function (element) {
			element.setAttribute('data-cart-note-navigation-listening', 'true');
			element.addEventListener('click', function (event) {
				if (!hasPendingCartNoteSave()) return;
				event.preventDefault();
				event.stopImmediatePropagation();
			}, true);
		});

		Array.from(navigationForms).forEach(function (form) {
			form.setAttribute('data-cart-note-navigation-listening', 'true');
			form.addEventListener('submit', function (event) {
				if (!hasPendingCartNoteSave()) return;
				event.preventDefault();
				event.stopImmediatePropagation();
			}, true);
		});
	}

	function finishCartNoteOperation(operation, result) {
		if (!operation || operation.completionSettled) return false;
		operation.completionSettled = true;
		operation.resolveCompletion(result);
		return true;
	}

	function supersedeCartNoteOperation(operation) {
		if (!operation || operation.superseded) return;

		const abortError = createCartNoteAbortError();
		rejectStandardCartMutation(operation.standardMutation, abortError, 'INVALID', false);
		operation.superseded = true;

		if (operation.controller) operation.controller.abort();
		if (!operation.started) finishCartNoteOperation(operation, false);
	}

	function markCartNoteSaved(note) {
		const noteElements = document.querySelectorAll('textarea.cart-note-listening, textarea[name="note"]');

		Array.from(noteElements).forEach(function (noteElement) {
			const savedValue = noteElement.getAttribute('data-cart-note-saved-value');

			if (noteElement.value === note) {
				noteElement.setAttribute('data-cart-note-saved-value', note);
			} else if (savedValue != null && noteElement.value === savedValue) {
				noteElement.value = note;
				noteElement.setAttribute('data-cart-note-saved-value', note);
			}
		});
	}

	handleCartUpdates = function (container) {
		var updateItemInput = container.querySelectorAll('input[name="updates[]"]'),
			removeItemLink = container.querySelectorAll('.remove-from-cart-link:not(.listening)'),
			discountForm = container.querySelectorAll('.discount-form:not(.listening)'),
			removeDiscountLink = container.querySelectorAll('.remove-discount:not(.listening)');

		Array.from(updateItemInput).forEach(function (input) {
			if (input.classList.contains('listening')) return;
			input.classList.add('listening');
			input.addEventListener('change', function (e) {
				updateItemQty(e.target, container);
			});
		});

		Array.from(discountForm).forEach(function (form) {
			form.classList.add('listening');
			form.addEventListener('submit', function (e) {
				e.preventDefault();
				updateDiscount(form, form.querySelector('input[name="discount"]').value, 'add', container);
			});
		});
		Array.from(removeDiscountLink).forEach(function (link) {
			link.classList.add('listening');
			link.addEventListener('click', function (e) {
				e.preventDefault();
				updateDiscount(link, link.dataset.discountCode, 'remove', container);
			});
		});

		bindCartNoteNavigationGuards(container);

		const noteElements = container.querySelectorAll('textarea[name="note"]:not(.cart-note-listening)');
		Array.from(noteElements).forEach(function (noteElement) {
			let enableTimer = null;

			noteElement.classList.add('cart-note-listening');
			noteElement.setAttribute('data-cart-note-saved-value', noteElement.value);
			noteElement.addEventListener('input', function () {
				clearTimeout(enableTimer);
				enableTimer = setTimeout(function () {
					if (!noteElement.isConnected || !container.isConnected) return;
					if (noteElement.getAttribute('data-cart-note-saved-value') === noteElement.value) return;

					addNote(noteElement, container).catch(function (error) {
						console.warn('Cart note save failed', error);
					});
				}, 500);
			});
		});

		if (hasPendingCartNoteSave()) setCartNoteNavigationLocked(true);

		Array.from(removeItemLink).forEach(function (link) {
			link.classList.add('listening');
			link.addEventListener('click', function (e) {
				e.preventDefault();
				removeItem(e.currentTarget, container);
			});
		});
	}

	function getNativeCartSectionsValue() {
		return [sideCartId, cartPageTemplate]
			.filter(Boolean)
			.filter((sectionId, index, sectionIds) => sectionIds.indexOf(sectionId) === index)
			.join(',');
	}

	function refreshNativeCartSurfaces(response, container, options = {}) {
		const updates = [];
		const refreshPanel = options.refreshPanel !== false;
		const refreshPage = options.refreshPage !== false;
		const openPanelAfterRefresh = options.openPanel === true;
		const undoRemove = options.undoRemove === true;

		if (refreshPanel && sideCartContainer) {
			if (!response || !response.sections || !response.sections[sideCartId]) {
				return Promise.reject(new Error('Cart drawer section is missing from the cart response.'));
			}

			updates.push(
				updateCartPanel(response, openPanelAfterRefresh, undoRemove).then((updated) => {
					if (!updated) throw new Error('Cart drawer refresh did not complete.');
					return true;
				})
			);
		}

		if (refreshPage && cartPageContainer != null) {
			if (!response || !response.sections || !response.sections[cartPageTemplate]) {
				return Promise.reject(new Error('Cart page section is missing from the cart response.'));
			}

			updates.push(
				updateCartPage(response).then((updated) => {
					if (!updated) throw new Error('Cart page refresh did not complete.');
					return true;
				})
			);
		}

		if (!updates.length && !sideCartContainer && cartPageContainer == null) {
			updates.push(refreshCartSummary());
		}

		return Promise.all(updates).then(() => true);
	}

	function refreshCartNoteReferences() {
		cartPageContainer = document.querySelector('.form-cart, .cart-empty');
		if (cartPageContainer) {
			cartPageContainer = cartPageContainer.parentElement;
			cartPageTemplate = cartPageContainer.id.replace('shopify-section-', '');
		} else {
			cartPageTemplate = null;
		}

		sideCartContainer = document.getElementById('cart');
		const sideCartSection = sideCartContainer ? sideCartContainer.closest('[id^="shopify-section-"]') : null;
		sideCartId = sideCartContainer ?
			sideCartContainer.getAttribute('data-section-id') ||
			(sideCartSection ? sideCartSection.id.replace('shopify-section-', '') : 'side-cart') :
			null;
	}

	function getCartNoteSectionIds() {
		refreshCartNoteReferences();
		return [sideCartId, cartPageTemplate]
			.filter(Boolean)
			.filter(function (sectionId, index, sectionIds) {
				return sectionIds.indexOf(sectionId) === index;
			});
	}

	function refreshCartNoteOppositeSurface(response, operation) {
		if (!isCurrentCartNoteOperation(operation)) return Promise.resolve(false);
		refreshCartNoteReferences();

		return refreshNativeCartSurfaces(response, operation.container, {
			refreshPanel: operation.sourceSurface === 'page',
			refreshPage: operation.sourceSurface === 'dialog',
			openPanel: false
		}).then(function (result) {
			return isCurrentCartNoteOperation(operation) ? result : false;
		});
	}

	function performCartNoteSave(operation) {
		let mutationSucceeded = false;
		const sectionIds = getCartNoteSectionIds();
		const requestBody = { note: operation.note };
		if (sectionIds.length) requestBody.sections = sectionIds.join(',');

		operation.controller = typeof AbortController === 'function' ? new AbortController() : null;
		const requestConfig = {
			method: 'POST',
			body: JSON.stringify(requestBody),
			headers: {
				'X-Requested-With': 'XMLHttpRequest',
				'Content-Type': 'application/json',
				'Accept': 'application/javascript'
			}
		};
		if (operation.controller) requestConfig.signal = operation.controller.signal;

		return fetch(getRouteUrl('cart_update_url', 'cart/update.js'), requestConfig)
			.then(function (cartResponse) {
				mutationSucceeded = cartResponse.ok;
				return cartResponse.json().then(function (response) {
					return { cartResponse: cartResponse, response: response };
				});
			})
			.then(function (result) {
				const cartResponse = result.cartResponse;
				const response = result.response;
				if (!isCurrentCartNoteOperation(operation)) return false;

				if (!cartResponse.ok && !response.status) response.status = cartResponse.status;
				if (response.status) {
					mutationSucceeded = false;
					const error = createStandardCartError(response);
					handleErrorMessage(response.description || error.message);
					return settleStandardCartMutationFailure(operation.standardMutation, response).then(function () {
						return false;
					});
				}

				mutationSucceeded = true;
				return resolveStandardCartMutation(operation.standardMutation, response).then(function (settledCart) {
					if (!isCurrentCartNoteOperation(operation)) return false;
					markCartNoteSaved(operation.note);
					return refreshCartNoteOppositeSurface(response, operation)
						.catch(function (error) {
							console.warn('Cart note opposite-surface refresh failed', error);
							return false;
						})
						.then(function () { return settledCart; });
				});
			})
			.catch(function (error) {
				if (operation.superseded || (error && error.name === 'AbortError')) return false;
				rejectStandardCartMutation(operation.standardMutation, error, 'SERVICE_UNAVAILABLE', !mutationSucceeded);
				console.warn('addNote error', error);
				return false;
			});
	}

	function completeActiveCartNoteOperation(operation, result) {
		if (activeCartNoteSave === operation) activeCartNoteSave = null;
		if (queuedCartNoteSave) {
			startNextCartNoteSave();
		} else {
			setCartNoteNavigationLocked(false);
		}
		finishCartNoteOperation(operation, result);
	}

	function startNextCartNoteSave() {
		if (activeCartNoteSave || !queuedCartNoteSave) {
			if (!activeCartNoteSave && !queuedCartNoteSave) setCartNoteNavigationLocked(false);
			return;
		}

		const operation = queuedCartNoteSave;
		queuedCartNoteSave = null;
		if (operation.superseded) {
			finishCartNoteOperation(operation, false);
			startNextCartNoteSave();
			return;
		}

		activeCartNoteSave = operation;
		operation.started = true;
		setCartNoteNavigationLocked(true);
		performCartNoteSave(operation).then(function (result) {
			completeActiveCartNoteOperation(operation, result);
		}).catch(function (error) {
			if (!operation.superseded) rejectStandardCartMutation(operation.standardMutation, error, 'SERVICE_UNAVAILABLE');
			completeActiveCartNoteOperation(operation, false);
		});
	}

	addNote = function (attribute, container) {
		const note = attribute.value;
		if (queuedCartNoteSave && queuedCartNoteSave.note === note) return queuedCartNoteSave.completion;
		if (activeCartNoteSave && !activeCartNoteSave.superseded && activeCartNoteSave.note === note) return activeCartNoteSave.completion;

		const target = getStandardCartEventTarget(attribute, container);
		const sourceSurface = getStandardCartContext(target, 'cart') === 'dialog' ? 'dialog' : 'page';
		const standardMutation = beginStandardCartMutation('note', target, {
			context: sourceSurface === 'dialog' ? 'dialog' : 'cart',
			note: note
		});
		let resolveCompletion;
		const operation = {
			id: ++cartNoteOperationId,
			note: note,
			container: container,
			sourceSurface: sourceSurface,
			standardMutation: standardMutation,
			controller: null,
			started: false,
			superseded: false,
			completionSettled: false,
			resolveCompletion: null,
			completion: null
		};

		operation.completion = new Promise(function (resolve) { resolveCompletion = resolve; });
		operation.resolveCompletion = resolveCompletion;

		if (queuedCartNoteSave) supersedeCartNoteOperation(queuedCartNoteSave);
		queuedCartNoteSave = operation;
		if (activeCartNoteSave) supersedeCartNoteOperation(activeCartNoteSave);

		setCartNoteNavigationLocked(true);
		startNextCartNoteSave();
		return operation.completion;
	}


	updateDiscount = function (element, discountCode, action, container) {
		if (!discountCode) return Promise.resolve(false);
		discountCode = discountCode.toLowerCase();
		let discounts = [];
		const existingDiscounts = container.querySelectorAll('.remove-discount');
		for (const discount of existingDiscounts) {
			discounts.push(discount.dataset.discountCode.toLowerCase());
		}
		if (action === 'add') {
			if (discounts.includes(discountCode)) {
				handleErrorMessage(container.querySelector('.discount-form .already-applied-error-message ').innerText);
				return Promise.resolve(false);
			}
			discounts.push(discountCode);
		} else if (action === 'remove') {
			const index = discounts.indexOf(discountCode);
			if (index === -1) return Promise.resolve(false);
			discounts.splice(index, 1);
		}

		const target = getStandardCartEventTarget(container, container);
		const standardMutation = beginStandardCartMutation('discount', target, {
			discountCodes: discounts.map((code) => ({ code: code }))
		});
		let mutationSucceeded = false;

		element.classList.add('processing');
		config = {
			method: 'POST',
			body: JSON.stringify({
				'discount': discounts.join(','),
				'sections': getNativeCartSectionsValue()
			}),
			headers: {
				'X-Requested-With': 'XMLHttpRequest',
				'Content-Type': 'application/json',
				'Accept': 'application/javascript'
			}
		};

		return fetch(getRouteUrl('cart_update_url', 'cart/update.js'), config)
			.then(async (cartResponse) => {
				mutationSucceeded = cartResponse.ok;
				const response = await cartResponse.json();
				if (!cartResponse.ok && !response.status) response.status = cartResponse.status;
				if (response.status) {
					mutationSucceeded = false;
					const error = createStandardCartError(response);
					handleErrorMessage(response.description);
					await settleStandardCartMutationFailure(standardMutation, response);
					return false;
				}

				const rejectedDiscount = response.discount_codes && response.discount_codes.find((discount) => {
					return discount.code.toLowerCase() === discountCode && discount.applicable === false;
				});
				if (rejectedDiscount) {
					mutationSucceeded = true;
					const messageElement = container.querySelector('.discount-form .not-applicable-error-message ');
					const message = messageElement ? messageElement.innerText : 'Discount code is not applicable';
					const form = container.querySelector('.discount-form');
					if (form) form.querySelector('input[name="discount"]').value = '';
					handleErrorMessage(message);
					await resolveStandardCartMutation(standardMutation, response);
					return false;
				}
				mutationSucceeded = true;

				const standardSettlement = resolveStandardCartMutation(standardMutation, response);
				const uiUpdates = [];

				queueNativeCartSurfaceUpdate(uiUpdates, () => {
					return refreshNativeCartSurfaces(response, container, {
						openPanel: container === sideCartContainer
					}).then(() => {
						setProcessed(element);
						return true;
					});
				});

				return settleNativeCartMutationWithUi(
					standardSettlement,
					uiUpdates,
					'Cart UI update failed after a successful discount operation.'
				);
			})
			.catch((error) => {
				if (mutationSucceeded) {
					return handlePostMutationFailure(
						standardMutation,
						error,
						'Post-mutation discount handling failed.'
					);
				}

				rejectStandardCartMutation(standardMutation, error, 'SERVICE_UNAVAILABLE', true);
				console.warn('updateDiscount error', error);
				return false;
			})
			.finally(() => {
				element.classList.remove('processing');
			});
	};


	const updateItemQty = function (input, container) {
		line = parseInt(input.dataset.line, 10);
		quantity = parseInt(input.value, 10);
		if (!Number.isFinite(line) || !Number.isFinite(quantity)) {
			console.warn('Cart quantity update skipped because line or quantity is invalid.', {
				line: input.dataset.line,
				quantity: input.value
			});
			return Promise.resolve(false);
		}

		const lineId = input.dataset.lineKey || String(line);
		const target = getStandardCartEventTarget(container, container);
		const standardMutation = beginStandardCartMutation('lines', target, {
			action: quantity === 0 ? 'remove' : 'update',
			context: getStandardCartContext(target, 'cart'),
			lines: [{ id: lineId, quantity: quantity }]
		});
		let mutationSucceeded = false;
		config = {
			method: 'POST',
			body: JSON.stringify({
				'line': line,
				'quantity': quantity,
				'sections': getNativeCartSectionsValue()
			}),
			headers: {
				'X-Requested-With': 'XMLHttpRequest',
				'Content-Type': 'application/json',
				'Accept': 'application/javascript'
			}
		};

		const noteElBefore = container ? container.querySelector('textarea[name="note"]') : null;
		const savedNote = noteElBefore ? noteElBefore.value : null;

		return fetch(getRouteUrl('cart_change_url', 'cart/change.js'), config)
			.then(async (cartResponse) => {
				mutationSucceeded = cartResponse.ok;
				const response = await cartResponse.json();
				if (!cartResponse.ok && !response.status) response.status = cartResponse.status;
				if (response.status) {
					mutationSucceeded = false;
					const error = createStandardCartError(response);
					handleErrorMessage(response.description);
					await settleStandardCartMutationFailure(standardMutation, response);
					return false;
				}
				mutationSucceeded = true;

				const standardSettlement = resolveStandardCartMutation(standardMutation, response);
				const uiUpdates = [];

				queueNativeCartSurfaceUpdate(uiUpdates, () => {
					return refreshNativeCartSurfaces(response, container, {
						openPanel: container === sideCartContainer
					}).then(() => {
						if (savedNote) {
							const newNoteElement = document.querySelector('textarea[name="note"]');
							if (newNoteElement) newNoteElement.value = savedNote;
						}

						return true;
					});
				});

				return settleNativeCartMutationWithUi(
					standardSettlement,
					uiUpdates,
					'Cart UI update failed after a successful quantity operation.'
				);
			})
			.catch((error) => {
				if (mutationSucceeded) {
					return handlePostMutationFailure(
						standardMutation,
						error,
						'Post-mutation quantity handling failed.'
					);
				}

				rejectStandardCartMutation(standardMutation, error, 'SERVICE_UNAVAILABLE', true);
				console.warn('updateItemQty error', error);
				return false;
			});
	};


	removeItem = function (link, container) {
		line = parseInt(link.dataset.line);
		const lineId = link.dataset.lineKey || String(line);
		let item = link.closest('li');
		const target = getStandardCartEventTarget(container, container);
		const standardMutation = beginStandardCartMutation('lines', target, {
			action: 'remove',
			context: getStandardCartContext(target, 'cart'),
			lines: [{ id: lineId, quantity: 0 }]
		});
		let mutationSucceeded = false;

		if (container === sideCartContainer && item && item.querySelector('.removed') != null) {
			item.classList.add('processing');
		}
		config = {
			method: 'POST',
			body: JSON.stringify({
				'line': line,
				'quantity': 0,
				'sections': getNativeCartSectionsValue()
			}),
			headers: {
				'X-Requested-With': 'XMLHttpRequest',
				'Content-Type': 'application/json',
				'Accept': 'application/javascript'
			}
		};

		return fetch(getRouteUrl('cart_change_url', 'cart/change.js'), config)
			.then(async (cartResponse) => {
				mutationSucceeded = cartResponse.ok;
				const response = await cartResponse.json();
				if (!cartResponse.ok && !response.status) response.status = cartResponse.status;
				if (response.status) {
					mutationSucceeded = false;
					const error = createStandardCartError(response);
					handleErrorMessage(response.description);
					await settleStandardCartMutationFailure(standardMutation, response);
					return false;
				}
				mutationSucceeded = true;

				const standardSettlement = resolveStandardCartMutation(standardMutation, response);
				const uiUpdates = [];

				if (container === sideCartContainer && item && item.querySelector('.removed') != null) {
					queueNativeCartSurfaceUpdate(uiUpdates, () => {
						item.dispatchEvent(new CustomEvent('removing'));
						item.classList.add('removing');
						item.classList.remove('processing');
						setProcessed(item);

						const undoLink = item.querySelector('.removed a');
						if (undoLink && !undoLink.classList.contains('cart-undo-listening')) {
							undoLink.classList.add('cart-undo-listening');
							undoLink.addEventListener('click', function (e) {
								e.preventDefault();
								const currentUndoLink = e.currentTarget;
								item.classList.add('processing');
								let tempForm = document.createElement('form');
								tempForm.innerHTML = '<input type="hidden" name="id" value="' + currentUndoLink.dataset.id + '"><input type="hidden" name="quantity" value="' + currentUndoLink.dataset.qty + '">';
								if (currentUndoLink.dataset.selling_plan) {
									tempForm.innerHTML += '<input type="hidden" name="selling_plan" value="' + currentUndoLink.dataset.selling_plan + '">';
								}
								if (currentUndoLink.dataset.parentKey) {
									tempForm.innerHTML += '<input type="hidden" name="parent_line_key" value="' + currentUndoLink.dataset.parentKey + '">';
								}
								for (var key in currentUndoLink.dataset) {
									if (key.indexOf('property-') === 0) {
										var data = JSON.parse(currentUndoLink.dataset[key]);
										tempForm.innerHTML += '<input type="hidden" name="properties[' + data[0] + ']" value="' + data[1] + '">';
									}
								}
								let undoUpsellItems = null;
								if (currentUndoLink.dataset.childrenId) {
									let tempFormUpsell = document.createElement('form');
									const parentLineKeys = currentUndoLink.dataset.childrenId.split(',');
									parentLineKeys.forEach(key => {
										tempFormUpsell.innerHTML += '<input type="hidden" data-id="' + key + '" data-parent-product="' + currentUndoLink.dataset.id + '">';
									});
									undoUpsellItems = tempFormUpsell.querySelectorAll('input');
								}
								addToCart(tempForm, item, undoUpsellItems);
								tempForm.remove();
							});
						}

						return true;
					});
				}

				queueNativeCartSurfaceUpdate(uiUpdates, () => {
					return refreshNativeCartSurfaces(response, container, {
						openPanel: container === sideCartContainer
					});
				});

				return settleNativeCartMutationWithUi(
					standardSettlement,
					uiUpdates,
					'Cart UI update failed after a successful remove operation.'
				);
			})
			.catch((error) => {
				if (item) item.classList.remove('processing');

				if (mutationSucceeded) {
					return handlePostMutationFailure(
						standardMutation,
						error,
						'Post-mutation remove handling failed.'
					);
				}

				rejectStandardCartMutation(standardMutation, error, 'SERVICE_UNAVAILABLE', true);
				console.warn('removeItem error', error);
				return false;
			});
	};


	updateCartCount = function (count, total) {

		if (count == null) {
			const qtyEl = document.querySelector('[data-totalqty]');
			if (qtyEl && qtyEl.dataset) {
				count = qtyEl.dataset.totalqty;
			}
		}

		if (countElement.length && count != null) {
			countElement.forEach((element) => {
				element.innerHTML = count;
				if (element.id === 'cart-count--m') {
					element.hidden = Number(count) <= 0;
				}
				if (element.classList.contains('mobile-home-cart-count')) {
					element.hidden = Number(count) <= 0;
				}
			});
		}

		if (totalElement.length) {
			if (total == null) {
				const priceEl = document.querySelector('[data-totalprice]');
				if (priceEl && priceEl.dataset) {
					total = priceEl.dataset.totalprice;
				}
			}

			if (total != null) {
				totalElement.forEach((element) => {
					element.innerHTML = total;
				});
			}
		}
	};

	module = {
		init: init,
		load: updateCartPanel,
		open: openCart,
		refresh: refreshCart,
		addBulkItems: addBulkItems
	};
	return module;

}(ajaxCart || {}));
ajaxCart.init();

window.addEventListener('ajaxCart', function (evt) {
	ajaxCart.init();
});

const handleSideCartEvt = new CustomEvent('handleSideCart');
window.addEventListener("handleSideCart", function (evt) {
	let sideCartContainer = document.getElementById('cart');
	let userNav = document.getElementById('nav-user');
	let enable_cart_drawer_header = sideCartContainer ? sideCartContainer.getAttribute('data-enable-cart-drawer-header') || '' : 'false';
	let cartLink = userNav ? userNav.querySelector('.cart a') : null;

	if (!sideCartContainer && !userNav) return;
	if (!cartLink) return;

	if (enable_cart_drawer_header === 'false') {
		cartLink.removeAttribute('data-panel');
		cartLink.classList.remove('listening');
	} else {
		cartLink.setAttribute('data-panel', 'cart');
	}

});
window.dispatchEvent(handleSideCartEvt);

document.addEventListener('shopify:section:load', function () {
	window.dispatchEvent(listCartEvt);
	window.dispatchEvent(pickupAvailabilityEvt);
	ajaxCart.init();
	window.dispatchEvent(handleSideCartEvt);
});


// Quickshop - initializes and handles the "Quickshop" feature: fetches product content via AJAX, cleans and adjusts it for the popup, dispatches related events, and opens the quickshop panel
var quickShop = (function (module) {
	let quickshopContainer = null;
	let activeController = null;

	function ensureContainer() {
		if (!quickshopContainer) quickshopContainer = document.getElementById('quickshop');
		return quickshopContainer;
	}

	function onDocumentClick(e) {
		var trigger = e.target.closest ? e.target.closest('[data-quickshop]') : null;
		if (!trigger) return;

		e.preventDefault();

		var container = ensureContainer();
		if (!container) return;

		trigger.classList.add('loading');
		container.innerHTML = '';

		openQuickshop(trigger.getAttribute('href'), trigger);
	}

	function openQuickshop(quickshopUrl, triggerEl) {
		if (activeController) activeController.abort();
		activeController = new AbortController();

		fetch(quickshopUrl, {
				signal: activeController.signal,
				credentials: 'same-origin'
			})
			.then(function (response) {
				if (!response.ok) {
					console.warn('Request failed:', response.status, response.statusText);
				}
				return response.text();
			})
			.then(function (text) {
				if (activeController && activeController.signal && activeController.signal.aborted) return;

				var doc = new DOMParser().parseFromString(text, 'text/html');
				var resultsMarkup = doc.querySelector('div[id$="main-product"]');
				if (!resultsMarkup) throw new Error('Quickshop: main product markup not found');

				var container = resultsMarkup.querySelector('.m6pr');
				if (!container) throw new Error('Quickshop: .m6pr not found');

				var sectionId = container.getAttribute('data-template') || '';
				var formId = container.getAttribute('data-form-id') || '';
				var viewEventTarget = resultsMarkup.querySelector('[data-standard-view-event="product"]');

				if (viewEventTarget) {
					try {
						var viewEventPayload = JSON.parse(viewEventTarget.getAttribute('data-standard-view-event-payload'));
						viewEventPayload.context = 'dialog';
						viewEventTarget.setAttribute('data-standard-view-event-payload', JSON.stringify(viewEventPayload));
						viewEventTarget.setAttribute('data-standard-view-event-trigger', 'manual');
					} catch (error) {
						console.warn('Quickshop standard product view payload could not be updated', error);
					}
				}

				container.classList.add('m6pr-compact');
				container.classList.remove('m6pr');

				var mobileHeader = resultsMarkup.querySelector('header.mobile-only');
				if (mobileHeader) mobileHeader.classList.remove('mobile-only');

				var l4prNoThumbsMobile = resultsMarkup.querySelector('.l4pr.no-thumbs-mobile');
				if (l4prNoThumbsMobile) l4prNoThumbsMobile.classList.add('no-thumbs-desktop');

				var l4prStatic = resultsMarkup.querySelector('.l4pr.static');
				if (l4prStatic) l4prStatic.classList.remove('static');

				var thumbs = resultsMarkup.querySelector('.l4pr-container .m6tb');
				if (thumbs) thumbs.remove();

				var w50 = resultsMarkup.querySelector('.l4ml.w50');
				if (w50) w50.classList.remove('w50');

				resultsMarkup.querySelectorAll('.mobile-scroll').forEach(function (el) {
					el.classList.remove('mobile-scroll');
				});

				resultsMarkup.querySelectorAll('a[href="#section-info"]').forEach(function (a) {
					a.setAttribute('href', quickshopUrl + a.getAttribute('href'));
				});

				resultsMarkup
					.querySelectorAll('.pickup, .has-social, .syk-x, .benefit, .true-size, .l4pr li.sticky, .product-recommendations, header.mobile-hide, #section-info')
					.forEach(function (el) {
						el.remove();
					});

				var heading = resultsMarkup.querySelector('header > h1, header > h2, header > h3, header > h4, header > h5');
				if (heading) {
					heading.innerHTML = '<a href="' + quickshopUrl + '">' + heading.innerHTML + '</a>';
				}

				var html = resultsMarkup.innerHTML;
				if (sectionId) html = html.split(sectionId).join('quickshop-' + sectionId);
				if (formId) html = html.split(formId).join(formId + '-quickshop');

				handleQuickshopPanel(html, triggerEl);
			})
			.catch(function (error) {
				if (error && error.name === 'AbortError') return;
				if (triggerEl) {
					triggerEl.classList.remove('loading');
					setProcessed(triggerEl);
				}
			});
	}

	function handleQuickshopPanel(html, triggerEl) {
		var container = ensureContainer();
		if (!container) return;

		container.innerHTML = html;

		openPanel('quickshop');

		if (triggerEl) {
			triggerEl.classList.remove('loading');
			setProcessed(triggerEl);
		}

		var runHeavy = function () {
			var events = [
				modulePanelEvt,
				semanticInputEvt,
				ratingsEvt,
				productVariantsEvt,
				listProductSliderEvt,
				listDropEvt,
				semanticSelectEvt,
				showHideDataElementEvt,
				sellingplansEvt,
				pickupAvailabilityEvt,
				modulePanelAnchorEvt,
				formZindexEvt,
				fancyboxEvt,
				accordeonEvt,
				dataChangeEvt,
				countdownEvt,
				schemeTooltipEvt,
				popupsEvt,
				moduleTabsEvt,
				rangeSliderEvt
			];

			for (var i = 0; i < events.length; i++) window.dispatchEvent(events[i]);

			linkMoreClick();

			if (window.Shopify && Shopify.PaymentButton) Shopify.PaymentButton.init();

			Promise.resolve().then(function () {
				window.dispatchEvent(removeSDCcssEvt);
			});

			ajaxCart.init();

			if (window.ProductModel && typeof window.ProductModel.loadShopifyXR === 'function') {
				window.ProductModel.loadShopifyXR();
			}

			if (typeof findAndHideShownElements === 'function') findAndHideShownElements();

			new_css('product-css', css_product);

			var theme = getHtmlTheme();
			if (theme === 'xclusive' && typeof sizechartPopupEvt !== 'undefined') {
				window.dispatchEvent(sizechartPopupEvt);
			} else if (theme === 'xtra') {
				window.dispatchEvent(new CustomEvent('themeQuickshopOpened'));
				if (typeof upsellPopup !== 'undefined' && typeof upsellPopup.init === 'function') upsellPopup.init();
			}
		};

		if ('requestIdleCallback' in window) {
			window.requestIdleCallback(runHeavy, {
				timeout: 800
			});
		} else {
			window.requestAnimationFrame(runHeavy);
		}
	}

	function init() {
		if (!module._bound) {
			document.addEventListener('click', onDocumentClick);
			module._bound = true;
		}
		ensureContainer();
	}

	module = {
		init: init,
		open: openQuickshop
	};
	return module;
}(quickShop || {}));
quickShop.init();

window.addEventListener('quickShop', function () {
	quickShop.init();
});



// ShoptheLook Drawer - handles product card variant selection, updating images, prices, availability, and triggering related events/forms.
var shopTheLookDrawer = (function (module) {
	var init, shopTheLookOverride, openShopTheLook, removeShopTheLookBtn, addShopTheLookBtn;
	var shopTheLookBtn;
	var shopTheLookContainer;
	var maxItems;
	init = function () {
		shopTheLookBtn = document.querySelectorAll('[data-shopthelook]:not(.shopthelook-initialized)');
		shopTheLookContainer = document.querySelector('#add-products-to-banner ul');
		if (!shopTheLookContainer) {
			removeShopTheLookBtn();
			return;
		}
		maxItems = shopTheLookContainer.dataset.items;
		if (shopTheLookBtn.length) {
			shopTheLookOverride();
		}
	};
	shopTheLookOverride = function () {
		Array.from(shopTheLookBtn).forEach(function (el) {
			el.classList.add('shopthelook-initialized');
			el.closest('.link-btn').style.opacity = 1;
			el.addEventListener('click', function (e) {
				if (el.classList.contains('circle')) {
					el.classList.add('loading');
				}
				e.preventDefault();
				shopTheLookContainer.innerHTML = '';

				let blockListItem = el.closest('li[class*=block-]');
				let blockArticle = el.closest('article[class*=block-]');
				let blockId = (
					(blockListItem && blockListItem.dataset ? blockListItem.dataset.block : false) ||
					(blockArticle && blockArticle.dataset ? blockArticle.dataset.block : false)
				);
				shopTheLookContainer.setAttribute('data-block-id', blockId);

				let widthClass;
				switch (maxItems) {
					case '4':
						widthClass = 'w25';
						break;
					case '5':
						widthClass = 'w20';
						break;
					default:
						widthClass = 'w16';
						break;
				}

				shopTheLookContainer.className = `l4cl ${widthClass} slider mobile-compact`;
				openShopTheLook(el);
			});
		});
	};

	openShopTheLook = function (el, ignoreFetch) {
		if (ignoreFetch) {
			window.dispatchEvent(modulePanelEvt);
			addShopTheLookBtn();
			openPanel('add-products-to-banner');
			return;
		}

		let productData = JSON.parse(el.getAttribute('data-products'));
		if (productData.length === 0) {
			productData = new Array(parseInt(maxItems));
		}
		let shopTheLookHTML = ''
		let shopTheLookProductsObj = {}
		let itemsDone = 0;
		var enable_quick_buy_desktop = shopTheLookContainer.dataset.enable_quick_buy_desktop,
			enable_quick_buy_mobile = shopTheLookContainer.dataset.enable_quick_buy_mobile,
			enable_quick_buy_qty_selector = shopTheLookContainer.dataset.enable_quick_buy_qty_selector,
			quick_buy_compact = shopTheLookContainer.dataset.enable_quick_buy_compact,
			quick_buy_drawer = shopTheLookContainer.dataset.enable_quick_buy_drawer,
			enable_color_picker = shopTheLookContainer.dataset.enable_color_picker;
		Array.from(productData).forEach(function (product, index, array) {
			fetch(product + '/?section_id=product-item')
				.then((response) => {
					if (!response.ok) {
						console.warn('Request failed:', response.status, response.statusText);
						return;
					}
					return response.text();
				})
				.then((text) => {
					const parser = new DOMParser();
					const doc = parser.parseFromString(text, 'text/html');
					const resultsElement = doc.getElementById('shopify-section-product-item');
					if (getHtmlTheme() === 'xtra' && resultsElement) {
						const viewEventTarget = resultsElement.querySelector('[data-standard-view-event="product"]');

						if (viewEventTarget) {
							try {
								const viewEventPayload = JSON.parse(viewEventTarget.getAttribute('data-standard-view-event-payload'));
								viewEventPayload.context = 'dialog';
								viewEventTarget.setAttribute('data-standard-view-event-payload', JSON.stringify(viewEventPayload));
								viewEventTarget.setAttribute('data-standard-view-event-trigger', 'manual');
							} catch (error) {
								console.warn('Shop the look standard product view payload could not be updated', error);
							}
						}
					}

					const resultsMarkup = resultsElement ? resultsElement.innerHTML : '';

					if (getHtmlTheme() === 'xclusive' && resultsElement) {
						shopTheLookProductsObj[product] = resultsMarkup;
						itemsDone++;
						if (itemsDone === array.length) {
							Array.from(productData).forEach(function (product) {
								shopTheLookHTML += shopTheLookProductsObj[product];
							});
							el.classList.add('shopthelook-initialized-initialized');
							shopTheLookContainer.innerHTML = shopTheLookHTML;
							window.dispatchEvent(ratingsEvt);
							window.dispatchEvent(listCollectionSliderEvt);
							window.dispatchEvent(formZindexEvt);
							window.dispatchEvent(semanticInputEvt);
							window.dispatchEvent(semanticSelectEvt);
							window.dispatchEvent(schemeTooltipEvt);
							window.dispatchEvent(popupsEvt);
							window.dispatchEvent(listScrollableEvt);
							window.dispatchEvent(check_limit_event);
							ajaxCart.init();
							quickShop.init();
							openPanel('add-products-to-banner');
							el.classList.remove('loading');
						}
					}

					if (getHtmlTheme() === 'xtra' && resultsElement) {
						shopTheLookProductsObj[product] = resultsMarkup;
						itemsDone++;
						if (itemsDone === array.length) {
							Array.from(productData).forEach(function (product) {
								shopTheLookHTML += shopTheLookProductsObj[product];
							});

							let list_collection = shopTheLookContainer;
							list_collection.innerHTML = shopTheLookHTML;

							let placeholder_items = list_collection.querySelectorAll('.placeholder-product');
							Array.from(placeholder_items).forEach(function (el) {
								el.remove();
							});

							if (enable_quick_buy_desktop === undefined && enable_quick_buy_mobile === undefined) {
								Array.from(list_collection.querySelectorAll('form, .link-btn')).forEach(function (el) {
									el.remove();
								});
							} else {
								if (quick_buy_drawer !== undefined) {
									Array.from(list_collection.querySelectorAll('form, .link-btn')).forEach(function (el) {
										const newItem = document.createElement('p');
										newItem.classList.add('link-btn');
										newItem.innerHTML = '<a class="overlay-buy_button" href="' + el.closest('li').querySelector('a').getAttribute('href') + '" data-quickshop>' + translations.view_options_text + '</a>';
										el.parentNode.replaceChild(newItem, el);
									});
								}
								Array.from(list_collection.querySelectorAll('form, .link-btn')).forEach(function (el) {
									if (enable_quick_buy_desktop === undefined) el.classList.add('mobile-only');
									if (enable_quick_buy_mobile === undefined) el.classList.add('mobile-hide');
								});
								if (enable_quick_buy_qty_selector === undefined) {
									Array.from(list_collection.querySelectorAll('.input-amount')).forEach(el => el.remove());
								}
								if (enable_color_picker === undefined) {
									Array.from(list_collection.querySelectorAll('.check.color')).forEach(el => el.remove());
								}
								if (quick_buy_compact !== undefined) {
									Array.from(list_collection.querySelectorAll('form button')).forEach(function (el) {
										el.classList.add('compact');
										el.querySelector('.mobile-hide').remove();
										el.querySelector('.icon-cart').classList.remove('mobile-only');
									});
									Array.from(list_collection.querySelectorAll('.link-btn a')).forEach(function (el) {
										const iconCart = el.querySelector('.icon-cart');
										if (iconCart != null) {
											el.classList.add('compact');
											el.querySelector('.mobile-hide').remove();
											iconCart.classList.remove('mobile-only');
										} else {
											el.textContent = translations.view_text;
										}
									});
								}
							}

							el.classList.add('shopthelook-initialized');
							shopTheLookContainer.classList.remove('s4wi');
							shopTheLookContainer.classList.add('slider', 'mobile-compact');
							shopTheLookContainer.style.opacity = 1;
							shopTheLookContainer.innerHTML = list_collection.innerHTML;

							window.dispatchEvent(listCollectionSliderEvt);
							window.dispatchEvent(ratingsEvt);
							window.dispatchEvent(formZindexEvt);
							window.dispatchEvent(semanticInputEvt);
							window.dispatchEvent(schemeTooltipEvt);
							window.dispatchEvent(popupsEvt);
							window.dispatchEvent(listScrollableEvt);
							window.dispatchEvent(productcardVariantsEvt);

							upsellPopup.init();
							window.dispatchEvent(check_limit_event);
							ajaxCart.init();
							quickShop.init();
							openPanel('add-products-to-banner');

							if (el.classList.contains('circle')) el.classList.remove('loading');
						}
					}
				})
				.catch((error) => {
					console.warn("shopTheLookDrawer error", error);
				});
		});
	}
	removeShopTheLookBtn = function (el) {
		shopTheLookBtn = document.querySelectorAll('[data-shopthelook]');
		Array.from(shopTheLookBtn).forEach(function (el) {
			el.closest('.link-btn').style.opacity = 0;
		});
	}

	addShopTheLookBtn = function (el) {
		shopTheLookBtn = document.querySelectorAll('[data-shopthelook]');
		Array.from(shopTheLookBtn).forEach(function (el) {
			el.closest('.link-btn').style.opacity = 1;
		});
	}

	module = {
		init: init,
		load: openShopTheLook,
		removeBtn: removeShopTheLookBtn,
		addBtn: addShopTheLookBtn
	};
	return module;
}(shopTheLookDrawer || {}));
shopTheLookDrawer.init();




// Initializes and handles upsell popups: dynamically builds variant selectors, updates images/prices, and applies the selected variant to the main product item when chosen
if (getHtmlTheme() === 'xtra') {
	var upsellPopupOptions = function (el, popup, variantsData) {
		let listItem = el;
		let selects = popup.querySelectorAll('select');
		let btn = popup.querySelector('.link-btn a');
		let variantSelected = null;

		// Function to check if two arrays match
		function arraysMatch(arr1, arr2) {
			if (arr1.length !== arr2.length) {
				return false;
			}
			for (let i = 0; i < arr1.length; i++) {
				if (arr1[i] !== arr2[i]) {
					return false;
				}
			}
			return true;
		}

		// Function to check if two arrays match
		function updateButton(available = true) {
			if (available) {
				btn.textContent = translations.select;
				btn.classList.remove('disabled');
			} else {
				btn.textContent = translations.unavailable_text;
				btn.classList.add('disabled');
			}
		}

		function addSelectChangeEventListeners() {
			Array.from(selects).forEach(function (el) {
				el.addEventListener('change', handleSelectChange);
			});
		}

		function handleSelectChange(event) {
			const standardProductSelectSource = event.isTrusted || event.xtraStandardProductSelectSource ?
				(event.xtraStandardProductSelectSource || event.currentTarget) :
				null;

			setTimeout(function () {
				let standardProductSelect = null;

				try {
					const popupSelects = Array.from(popup.querySelectorAll('select'));
					const options = popupSelects.map((select) => select.value);
					const selectedOptions = popupSelects.map((select) => ({
						name: select.name,
						value: select.value
					}));

					if (standardProductSelectSource) {
						standardProductSelect = beginStandardProductSelect(listItem, standardProductSelectSource, {
							selectedOptions: selectedOptions,
							target: popup.querySelector('form') || popup
						});
					}

					getVariant(options);

					if (variantSelected === null) {
						updateButton(false);
					} else {
						updateButton(true);

						// update popup image, price, old price
						if (variantSelected.image) {
							popup.querySelector('img').src = variantSelected.image;
						}
						if (variantSelected.price) {
							popup.querySelector('.price').innerHTML = '<span class="old-price"></span>&nbsp;' + variantSelected.price;
						}
						if (variantSelected.price_old) {
							popup.querySelector('.old-price').innerHTML = variantSelected.price_old;
							popup.querySelector('.old-price').classList.remove('hidden');
						} else {
							popup.querySelector('.old-price').classList.add('hidden');
						}
					}

					if (standardProductSelect) {
						const variantOption = variantSelected ?
							listItem.querySelector('select[name="upsell-id"] option[value="' + variantSelected.id + '"]') :
							null;

						standardProductSelect.resolveFrom(variantOption);
					}
				} catch (error) {
					if (standardProductSelect) standardProductSelect.reject(error);
					console.warn('Upsell popup variant change error', error);
				}
			}, 1);
		}

		function addSelectBtnClickEventListener() {
			btn.addEventListener('click', handleSelectBtnClick);
		}

		function handleSelectBtnClick(e) {
			setTimeout(function () {
				e.preventDefault();

				// get current selected variant
				let options = Array.from(popup.querySelectorAll('select'), (select) => select.value);
				getVariant(options);

				listItem.querySelector('select[name="upsell-id"]').value = variantSelected.id;
				listItem.querySelector('a[data-upsell]').setAttribute('data-variant', variantSelected.id);

				// checkbox
				listItem.querySelector('span.check > input').checked = true;
				listItem.querySelector('span.check > input').dataset.id = variantSelected.id;
				// listItem.querySelector('span.check > input').dispatchEvent(new Event('change'));

				//image
				if (variantSelected.image) {
					listItem.querySelector('img').src = variantSelected.image;
					listItem.querySelector('img').removeAttribute('srcset', 'sizes');
				}

				//price
				listItem.querySelector('.price').innerHTML = '<span class="old-price"></span>&nbsp;' + variantSelected.price;
				if (variantSelected.price_old) {
					listItem.querySelector('.old-price').innerHTML = variantSelected.price_old;
					listItem.querySelector('.old-price').classList.remove('hidden');
				} else {
					listItem.querySelector('.old-price').classList.add('hidden');
				}

				// variant title
				listItem.querySelector('h3 + p + p > span').innerText = variantSelected.variant;

				// select option in product item
				// listItem.querySelector('select').innerText = variantSelected.variant;
			}, 1);
		}

		function initialize() {

			// add z-index to form elements
			window.dispatchEvent(semanticSelectEvt);
			var form_children = popup.querySelectorAll('form > *, fieldset > *, .has-select');
			Array.from(form_children).forEach(function (el, index) {
				el.style.zIndex = form_children.length - index;
			});

			// call event listeners
			addSelectChangeEventListeners();
			addSelectBtnClickEventListener();
		}

		var getVariant = function (options) {
			// Loop through the variant objects
			for (const variant of variantsData) {
				// Check if the options in the variant match the given option names
				if (arraysMatch(variant.options, options)) {
					variantSelected = variant;
					break;
				} else {
					variantSelected = null;
				}
			}
		}
		initialize();
	}
	var upsellPopup = (function (module) {
		var init, upsellOverride, openUpsell; // Define the functions
		var upsellBtn; // Define the data and elements
		var popup = document.querySelector('article[data-title="upsell-popup"]');

		init = function () {
			upsellBtn = document.querySelectorAll('[data-upsell]:not(.upsell-initialized)');
			if (upsellBtn.length) {
				upsellOverride();
			}
		};

		upsellOverride = function () {
			Array.from(upsellBtn).forEach(function (el) {
				el.classList.add('upsell-initialized');
				el.addEventListener('click', function (e) {
					e.preventDefault();
					openUpsell(el);
				});
			});
		};

		openUpsell = function (el) {

			let productItemEl = el.closest('li');
			let optionLabels = JSON.parse(el.getAttribute('data-options'));
			var variantsData = [];

			// get variants data from product item
			Array.from(productItemEl.querySelectorAll('select[name="upsell-id"] option')).forEach(function (el) {
				variantsData.push(JSON.parse(el.dataset.variantinfo));
			});

			// get current variant
			let currentVariant = variantsData.find((v) => v.id == el.getAttribute('data-variant'));

			// get options list
			let options_list = {};
			variantsData.forEach((v) =>
				v.options.forEach((option, index) => {
					if (!Array.isArray(options_list['option-' + index])) {
						options_list['option-' + index] = [option];
					} else if (!options_list['option-' + index].includes(option)) {
						options_list['option-' + index].push(option);
					}
				})
			);

			// create dropdowns inside popup
			let dropdowns = '';
			Object.keys(options_list).forEach((key, index) => {
				let select = '<p class="m10" data-variant="' + currentVariant.id + '" data-value="' + options_list[key][0] + '">';
				select += '<label for="' + optionLabels[index] + '">' + optionLabels[index] + '</label>';
				select += '<select id="' + key + +optionLabels[index] + '" name="' + optionLabels[index] + '">';
				options_list[key].forEach((x, i) => {
					if (x == currentVariant.options[index]) {
						select += '<option value="' + x + '" selected data-value="' + x + '">' + x + '</option>';
					} else {
						select += '<option value="' + x + '" data-value="' + x + '">' + x + '</option>';
					}
				});
				select += '</select></p>';
				dropdowns += select;
			});

			// update popup content
			popup.querySelector('fieldset').innerHTML = dropdowns;
			popup.querySelector('.link-btn').innerHTML = '<a>' + translations.select + '</a>';
			const title = productItemEl.querySelector('h3 > a').innerText;
			if (popup.querySelector('h2')) {
				popup.querySelector('h2').innerText = title;
			} else {
				const containerDiv = popup.querySelector('div');
				const priceElement = containerDiv.querySelector('.price');
				const h2Element = document.createElement('h2');
				h2Element.innerText = title;
				containerDiv.insertBefore(h2Element, priceElement);
			}

			if (currentVariant.image) {
				popup.querySelector('img').parentElement.classList.remove('svg');
				popup.querySelector('img').src = currentVariant.image;
			} else {
				popup.querySelector('img').src = 'data:image/svg+xml;base64,' + btoa(productItemEl.querySelector('svg').outerHTML);
				popup.querySelector('img').parentElement.classList.add('svg');
			}
			if (currentVariant.price) {
				popup.querySelector('.price').innerHTML = '<span class="old-price"></span>&nbsp;' + currentVariant.price;
			}
			if (currentVariant.price_old) {
				popup.querySelector('.old-price').innerHTML = currentVariant.price_old;
				popup.querySelector('.old-price').classList.remove('hidden');
			} else {
				popup.querySelector('.old-price').classList.add('hidden');
			}

			el.classList.add('listening');
			loadPopup('upsell-popup', function () {
				upsellPopupOptions(productItemEl, popup, variantsData);
			});

		}
		module = {
			init: init
		};
		return module;
	}(upsellPopup || {}));
	upsellPopup.init();
}
