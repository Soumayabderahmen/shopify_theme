"use strict";

// ---------------------------------------------------------------
// Collection page
// ---------------------------------------------------------------




/*! Helper Functions -------------------------------------------------- */

// Saves a collection view preference to the cart attributes via a POST request
function saveCollectionview(attribute, value) {
	if (typeof routes === 'undefined' || !routes.cart_update_url) {
		console.warn('saveCollectionview skipped: routes.cart_update_url is not defined');
		return;
	}

	const config = {
		method: 'POST',
		body: JSON.stringify({
			attributes: {
				[attribute]: value
			}
		}),
		headers: {
			'X-Requested-With': 'XMLHttpRequest',
			'Content-Type': 'application/json',
			'Accept': 'application/javascript'
		}
	};
	fetch(routes.cart_update_url, config)
		.then(res => res.json())
		.then(res => {
			if (res.status) handleErrorMessage(res.description);
		})
		.catch(error => {
			console.warn('saveCollectionview error', error);
		});
}


// Inserts a new node immediately after a reference node in the DOM
function insertAfter(referenceNode, newNode) {
	referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}


// Clears the min and max range filter inputs by removing their 'name' attributes to prevent them from submitting values
function clearRangeInputs() {
	const minInput = document.querySelector('#filter input#min');
	const maxInput = document.querySelector('#filter input#max');

	if (minInput) minInput.removeAttribute('name');
	if (maxInput) maxInput.removeAttribute('name');
};


// Clears all filter inputs: resets the range inputs and unchecks all selected checkboxes
function clearAllInputs() {
	clearRangeInputs();

	document.querySelectorAll('#filter input[type="checkbox"]:checked').forEach(el => el.checked = false);
};


// Attaches click listeners to collection product links to save the last clicked item URL in localStorage for "load more" functionality
function saveLoadMoreAnchor() {
	const anchors = document.querySelectorAll('#collection > li > figure > a, .m6cl .results > div a, .m6cl .results > .l4ne a');

	for (const el of anchors) {
		if (el.getAttribute('data-load-more-anchor-bound') === '1') continue;
		el.setAttribute('data-load-more-anchor-bound', '1');

		el.addEventListener('click', () => {
			localStorage.setItem('loadMoreItemClicked', el.getAttribute('href'));
		});
	}
};




/*! Custom Events -------------------------------------------------- */

// Attaches click handlers to aside navigation toggle links, calling toggle_dropdowns_simple() on their parent element.  
const navAsideEvt = new CustomEvent('navAside');
window.addEventListener('navAside', () => {
	const nav_aside = document.querySelectorAll('.n6as a.toggle:not(.n6as-initialized)');

	if (!nav_aside) return;

	for (const el of nav_aside) {
		el.classList.add('n6as-initialized');
		el.addEventListener('click', e => {
			e.preventDefault();
			toggle_dropdowns_simple(el.parentElement);
		});
	}
});
window.dispatchEvent(navAsideEvt);


// .f8fl - manages the filter panel: initializes filter toggles, handles open/close actions, and toggles filter subsections on click or key events.  
let forceFormFilterRender = false;
let filtersDocumentListenersBound = false;
let latestRenderFormFilter = function () {};
let latestHandleFilterSub = function () {};

function handleFilterDocumentClick(event) {
	latestRenderFormFilter();

	if (event.target.closest('a[aria-controls="filter"]')) {
		html_tag.classList.add('has-filters');

		html_tag.classList.toggle('f8fl-open');
		if (!html_tag.classList.contains('f8fl-open')) hidePanels();

		if (event.target.closest('.m6pn')) overlayClose();

		getStickyFooters();
		new_css('css-filters', css_filters);
		new_css('css-search', css_search);

		event.preventDefault();
	}
}

function handleFilterDocumentKeyup(event) {
	if (event.key === ' ') {
		handleFilterDocumentClick(event);
		latestHandleFilterSub(event);
	}
}

const filtersEvt = new CustomEvent('filters');
window.addEventListener('filters', function (evt) {
	const form_filter = document.getElementsByClassName('f8fl');
	
	if (form_filter.length) {
		html_tag.classList.add('t1cl');
		let formFilterRendered = false;

		function renderFormFilter() {
			if (formFilterRendered) return;

			for (const el of form_filter) {
				append_url(el, 'Close', 'f8fl-toggle');

				const elementId = el.id;
				if (elementId) {
					const links = document.querySelectorAll(`[href="#${elementId}"]`);
					for (const link of links) {
						link.classList.add('f8fl-toggle');
					}
				}

				const headers = el.querySelectorAll('h1, h2, h3, h4, h5, h6');
				for (const header of headers) {
					append_url(header, 'Close', 'header-toggle');
				}
			}

			const toggles = document.getElementsByClassName('f8fl-toggle');
			for (const el of toggles) {
				el.setAttribute('aria-controls', 'filter');
			}

			formFilterRendered = true;
		}

		function handleFilterSub(event) {
			const link = event.target.closest('.f8fl a.header-toggle');
			if (!link) return;

			const closestH = link.closest('h1, h2, h3, h4, h5, h6');
			toggle_dropdowns_simple(closestH);

			if (closestH.classList.contains('toggle') && typeof runPaddingsForInputs === 'function') {
				for (const el of nextUntil(closestH, 'h1, h2, h3, h4, h5, h6')) {
					for (const input of el.querySelectorAll('[class*="input-"][class*="fix"]')) {
						runPaddingsForInputs(input);
					}
				}
			}

			if (!closestH.id) event.preventDefault();
		}

		latestRenderFormFilter = renderFormFilter;
		latestHandleFilterSub = handleFilterSub;

		if (forceFormFilterRender) {
			renderFormFilter();
			forceFormFilterRender = false;
		}
		if (!filtersDocumentListenersBound) {
			document.addEventListener('click', handleFilterDocumentClick);
			document.addEventListener('click', function (event) {
				latestHandleFilterSub(event);
			});
			document.addEventListener('keyup', handleFilterDocumentKeyup);
			filtersDocumentListenersBound = true;
		}
	} else {
		latestRenderFormFilter = function () {};
		latestHandleFilterSub = function () {};
	}


	function clearSortForm() {
		for (const el of form_sort) {
			el.classList.remove('fixed');
		}
		html_tag.classList.remove('f8sr-fixed');
	}

	const form_sort = document.getElementsByClassName('f8sr');
	if (form_sort.length) {
		Array.from(form_sort).forEach(function (form_cont) {
			html_tag.classList.add('t1cl');
			if ((form_cont.classList.contains('mobile-sticky') || form_cont.classList.contains('sticky')) && form_cont.getAttribute('data-f8sr-sticky-bound') !== '1') {
				form_cont.setAttribute('data-f8sr-sticky-bound', '1');

				const trickDiv = createElementWithClass('div', 'offset-dist');
				const trickDist = createElementWithClass('div', 'inner-dist');

				function updateTrickDistHeight(div) {
					if (!div || div.hasHeight || !form_cont) return;

					requestAnimationFrame(() => {
						const h = form_cont.offsetHeight;
						div.style.height = `${h}px`;
						root_styles.style.setProperty('--f8sr_height', `${h}px`);
						div.hasHeight = true;
					});
				}

				//let updateSearchHeightExecuted = false;
				let updateSearchHeightRAF = 0;

				function applySearchHeight() {
					updateSearchHeightRAF = 0;
					if (!search_id) return;

					const h = search_id.clientHeight;
					if (h <= 0) return;

					root_styles.style.setProperty('--search_height', `${h}px`);
					//updateSearchHeightExecuted = true;
				}

				function updateSearchHeight() {
					if (!updateSearchHeightRAF) {
						updateSearchHeightRAF = requestAnimationFrame(applySearchHeight);
					}
				}

				function createEventListeners(element) {
					window.addEventListener('scroll', function () {
						updateTrickDistHeight(element);
						updateSearchHeight();
					});
				}

				const observer = new IntersectionObserver(
					([e]) => {
						const boundingRect = e.boundingClientRect;

						if (e.isIntersecting) {
							const el_mod = form_cont.classList.contains('sticky') ? e.target.nextElementSibling : form_cont;
							el_mod.classList.remove('fixed');
							html_tag.classList.remove('f8sr-fixed');
						} else {
							const el_mod = form_cont.classList.contains('sticky') ? e.target.nextElementSibling : form_cont;
							if (boundingRect.top < 0) {
								el_mod.classList.add('fixed');
								html_tag.classList.add('f8sr-fixed');
							}
							if (boundingRect.bottom >= window.innerHeight) {
								el_mod.classList.remove('fixed');
								html_tag.classList.remove('f8sr-fixed');
							}
						}
					}, {
						threshold: [0, 1],
						rootMargin: "0px 0px 0px 0px"
					}
				);

				if (form_cont.classList.contains('sticky')) {
					const trg = form_cont;

					trickDist.classList.add('before-f8sr');
					form_cont.after(trickDiv);
					form_cont.before(trickDist);

					createEventListeners(form_cont.nextElementSibling);

					observer.observe(form_cont.previousElementSibling);
				} else if (form_cont.classList.contains('mobile-sticky') && form_cont.classList.contains('mobile-compact')) {
					const trg = form_cont.querySelector('.link-btn');

					if (trg) {
						if (trg.classList.contains('mobile-hide')) {
							form_cont.classList.add('btn-mobile-hide');
						}
					}

					form_cont.prepend(trickDiv);
					form_cont.prepend(trickDist);

					createEventListeners(form_cont.querySelector('.inner-dist'));

					observer.observe(form_cont.querySelector('.offset-dist'));
					if (trg !== undefined && trg !== null) {
						const clone_me = trg.cloneNode(true);
						clone_me.classList.add('clone');
						insertAfter(trg, clone_me);
					}
				}
			}

			const form_sort_list_view = form_cont.getElementsByClassName('l4vw');
			const form_sort_list_inline = form_cont.getElementsByClassName('l4in');

			if (getHtmlTheme() === 'xclusive') {
				const form_view_inputs = [...form_sort_list_view, ...form_sort_list_inline];

				if (form_view_inputs.length) {
					for (const el of form_view_inputs) {
						const targetId = el.getAttribute('aria-controls');
						if (!targetId) continue;

						const viewList = document.getElementById(targetId);

						for (const input of el.querySelectorAll('input')) {
							const parent = input.parentElement;

							parent.addEventListener('click', () => {
								const width = input.getAttribute('data-width');
								const widthMobile = input.getAttribute('data-width-mobile');
								const collectionImgView = input.getAttribute('data-collection_img_view');

								if (width) {
									viewList.classList.remove('w100', 'w50', 'w33', 'w25', 'w20');
									saveCollectionview('collection_grid_view', width);
									viewList.classList.add(width);

								} else if (widthMobile) {
									viewList.classList.remove('w100-mobile', 'w50-mobile');
									saveCollectionview('collection_grid_view_mobile', widthMobile);
									viewList.classList.add(widthMobile);

								} else if (collectionImgView) {
									saveCollectionview('collection_img_view', collectionImgView);

									const sliderPictures = viewList.querySelectorAll('li picture.slider');
									if (sliderPictures.length) {
										for (const pic of sliderPictures) {
											const firstChild = pic.firstChild;
											if (firstChild && firstChild.nodeName.toLowerCase() === 'div') {
												const slideTo = (collectionImgView !== 'first') ? (pic.querySelectorAll('.second-first').length ? 0 : 1) : (pic.querySelectorAll('.second-first').length ? 1 : 0);
												firstChild.swiper.slideTo(slideTo, 0, false);
											} else {
												const imgIndex = collectionImgView !== 'first' ? 2 : 1;
												let img = pic.querySelector(`img[data-index="${imgIndex}"]`);
												const closestLink = img.closest('a');
												if (closestLink) img = closestLink;
												pic.prepend(img);
											}
										}
									} else {
										for (const pic of viewList.querySelectorAll('li picture + picture')) {
											const li = pic.closest('li');
											if (collectionImgView !== 'first') {
												li.classList.add('second-img-first');
											} else {
												li.classList.remove('second-img-first');
											}
										}
									}
								}
							});
						}
					}
				}
			}

			if (getHtmlTheme() === 'xtra') {
				if (form_sort_list_view.length) {
					html_tag.classList.add('t1cl');

					for (const el of form_sort_list_view) {
						const targetId = el.getAttribute('aria-controls');
						if (!targetId) continue;

						const viewList = document.getElementById(targetId);
						const viewItems = el.querySelectorAll('li');

						for (const icon of el.querySelectorAll('a > i[class*="icon-view-"]')) {
							icon.parentElement.addEventListener('click', (e) => {
								for (const item of viewItems) item.classList.remove('active');

								if (icon.classList.contains('icon-view-list')) {
									saveCollectionview('collection_view', 'list');
									viewList.classList.add('list');
									form_cont.classList.add('list');

									for (const listIcon of el.querySelectorAll('a > i.icon-view-list')) {
										listIcon.closest('li').classList.add('active');
									}

									for (const linkMore of viewList.querySelectorAll('a.link-more')) {
										handleInfoAndList(linkMore);
									}
								}

								if (icon.classList.contains('icon-view-grid')) {
									saveCollectionview('collection_view', 'grid');
									viewList.classList.remove('list');
									form_cont.classList.remove('list');

									for (const gridIcon of el.querySelectorAll('a > i.icon-view-grid')) {
										gridIcon.closest('li').classList.add('active');
									}
								}

								e.preventDefault();
							});
						}
					}
				}

				if (form_sort_list_inline.length) {
					for (const el of form_sort_list_inline) {
						const targetId = el.getAttribute('aria-controls');
						if (!targetId) continue;

						const viewList = document.getElementById(targetId);

						for (const input of el.querySelectorAll('input')) {
							const parent = input.parentElement;

							parent.addEventListener('click', () => {
								let className = '';

								const width = input.getAttribute('data-width');
								const widthMobile = input.getAttribute('data-width-mobile');

								if (width) {
									viewList.classList.remove('w100', 'w50', 'w33', 'w25', 'w20');
									saveCollectionview('collection_grid_view', width);
									className = width;
								} else if (widthMobile) {
									viewList.classList.remove('w100-mobile', 'w50-mobile');
									saveCollectionview('collection_grid_view_mobile', widthMobile);
									className = widthMobile;
								}

								if (className) viewList.classList.add(className);
							});
						}
					}
				}
			}
		});
	}
});
window.dispatchEvent(filtersEvt);


// #filter - initializes and handles collection filters by fetching filtered products, updating the UI, managing drawer/sidebar behavior, and dispatching related events
const initFiltersEvt = new CustomEvent('initFilters');
const filterClearButtonsBound = new WeakSet();
const filterInputsBound = new WeakSet();
let currentFilterAbortController = null;
let currentStandardResultsUpdate = null;
let latestFilterRequestId = 0;
let filterDebounceTimer = null;
let processResultsHistoryState = null;

function isResultsControlledParam(name) {
	return name === 'q' ||
		name === 'type' ||
		name === 'sort_by' ||
		name === 'page' ||
		name.startsWith('filter.') ||
		name.startsWith('options[');
}

function getEffectiveResultsParams(filterForm, sourceParams) {
	if (sourceParams) {
		const historyParams = new URLSearchParams(sourceParams.toString());
		historyParams.delete('section_id');
		return historyParams;
	}

	const params = new URLSearchParams(window.location.search);
	Array.from(params.keys()).forEach((name) => {
		if (isResultsControlledParam(name)) params.delete(name);
	});
	params.delete('section_id');

	const formData = new FormData(filterForm);
	for (const [name, value] of formData.entries()) {
		params.append(name, value);
	}

	return params;
}

function beginStandardResultsUpdate(target, urlSearchParams) {
	if (
		!window.XtraTheme ||
		typeof window.XtraTheme.beginStandardResultsUpdate !== 'function'
	) {
		return null;
	}

	try {
		return window.XtraTheme.beginStandardResultsUpdate(target, urlSearchParams);
	} catch (error) {
		console.warn('Standard storefront results update setup failed', error);
		return null;
	}
}

function getStandardResultsCount(root) {
	if (!root) return 0;
	const resultsTarget = root.matches && root.matches('.collection-wrapper') ?
		root :
		root.querySelector('.collection-wrapper');
	const count = resultsTarget ? parseInt(resultsTarget.dataset.standardResultsCount, 10) : 0;
	return Number.isFinite(count) ? count : 0;
}

function cancelCurrentFilterRequest(message) {
	const error = new DOMException(message || 'Superseded collection or search update', 'AbortError');
	if (currentStandardResultsUpdate) currentStandardResultsUpdate.reject(error);
	currentStandardResultsUpdate = null;

	if (currentFilterAbortController) currentFilterAbortController.abort();
	currentFilterAbortController = null;
}

function clearFilterProcessing(filterForm, collectionSection) {
	if (filterForm && filterForm.isConnected) filterForm.classList.remove('processing');
	if (collectionSection && collectionSection.isConnected) {
		const list = collectionSection.querySelector('.l4cl.processing');
		if (list) list.classList.remove('processing');
	}
}

window.addEventListener('initFilters', function (evt) {
	const filter_form = document.getElementById('filter');

	if (!filter_form) return;

	new_css('form-validation-css', validation_css);

	// Core function: read filter form state, fetch updated collection HTML, replace markup and re-init JS modules
	const processFilters = function (options = {}) {
		if (filterDebounceTimer) {
			clearTimeout(filterDebounceTimer);
			filterDebounceTimer = null;
		}

		const filterRequestId = ++latestFilterRequestId;
		let filterFetchOptions = {};
		let filterAbortController = null;
		let standardResultsUpdate = null;

		cancelCurrentFilterRequest('Superseded by a newer collection or search update');

		if ('AbortController' in window) {
			filterAbortController = new AbortController();
			currentFilterAbortController = filterAbortController;
			filterFetchOptions = {
				signal: filterAbortController.signal
			};
		}

		// Get section template ID and corresponding collection section
		const filter_form_template = filter_form.dataset.template;
		let collectionSection = document.getElementById('shopify-section-' + filter_form_template);
		if (!collectionSection) return;
		const standardResultsTarget = collectionSection.querySelector('.collection-wrapper');

		// Drawer (aside) instance for filters, if it exists
		let sidebarGlobal = document.querySelector('.filters-aside-initialized');

		// Add "processing" state to form and, if present, to collection list container
		filter_form.classList.add('processing');
		if (collectionSection.querySelector('.l4cl:not(.bls)')) {
			collectionSection.querySelector('.l4cl:not(.bls)').classList.add('processing');
		}

		// Handle price range inputs: if at default min/max, clear them so they do not affect filters.
		// History navigation already contains the authoritative requested query string.
		if (!options.searchParams) {
			const minInput = document.querySelector('#filter input#min'),
				maxInput = document.querySelector('#filter input#max');
			if ((minInput && maxInput) && minInput.value == minInput.getAttribute('min') && maxInput.value == maxInput.getAttribute('max')) {
				clearRangeInputs();
			}
		}

		// Preserve non-filter storefront parameters such as preview_theme_id while
		// replacing the filter/search/sort state with the authoritative request.
		const filterSearchParams = getEffectiveResultsParams(filter_form, options.searchParams);
		const filterParams = filterSearchParams.toString();
		standardResultsUpdate = options.emitStandardEvent === false ?
			null :
			beginStandardResultsUpdate(standardResultsTarget, filterSearchParams);
		currentStandardResultsUpdate = standardResultsUpdate;

		// Build URL for section rendering endpoint with current filters applied.
		const sectionSearchParams = new URLSearchParams(filterSearchParams.toString());
		sectionSearchParams.set('section_id', filter_form_template);
		const filterUrl = window.location.pathname + '?' + sectionSearchParams.toString();

		// Fetch updated collection section HTML
		fetch(filterUrl, filterFetchOptions)
			.then((response) => {
				if (filterRequestId !== latestFilterRequestId) {
					if (standardResultsUpdate) {
						standardResultsUpdate.reject(new DOMException('Superseded collection or search response', 'AbortError'));
					}
					return null;
				}
				if (!response.ok) {
					throw new Error(`Collection or search update failed: ${response.status} ${response.statusText}`);
				}
				return response.text();
			})
			.then((text) => {
				// A stale response must not render over the latest selected filters.
				if (filterRequestId !== latestFilterRequestId || text === null) {
					if (standardResultsUpdate) {
						standardResultsUpdate.reject(new DOMException('Superseded collection or search response', 'AbortError'));
					}
					return;
				}

				// Parse response and extract updated section markup
				const resultsMarkup = new DOMParser()
					.parseFromString(text, 'text/html')
					.querySelector('#shopify-section-' + filter_form_template);

				if (!resultsMarkup || !resultsMarkup.querySelector('.collection-wrapper')) {
					throw new Error('Collection or search update response contains incomplete section markup.');
				}

				// Preserve toggle state on filter headings (open/closed)
				Array.from(filter_form.querySelectorAll('h4[data-filter-toggle].toggle')).forEach(function (el) {
					const updatedToggle = resultsMarkup.querySelector(
						'h4[data-filter-toggle="' + el.dataset.filterToggle + '"]'
					);
					if (updatedToggle) updatedToggle.classList.add('toggle');
				});

				// Preserve "show more" state on filter lists (which lists had 'link-more-clicked')
				const toggledLinkMore = filter_form.querySelectorAll('ul[data-filter-toggle].link-more-clicked');
				const hasInitializedFilterDrawer = Boolean(document.querySelector('.filters-aside-initialized'));
				const drawerMarkup = hasInitializedFilterDrawer ? resultsMarkup.querySelector('#filters-aside') : null;

				// Validate every required response surface before changing any live DOM.
				if (hasInitializedFilterDrawer && (!drawerMarkup || !sidebarGlobal)) {
					throw new Error('Collection or search update response is missing filter drawer markup.');
				}

				// Replace collection section content with freshly rendered HTML
				collectionSection.innerHTML = resultsMarkup.innerHTML;

				// If filters drawer (aside) is enabled, sync drawer markup with new content
				if (hasInitializedFilterDrawer) {

					// Replace HTML inside the drawer with updated filters
					sidebarGlobal.innerHTML = drawerMarkup.innerHTML;

					// Add close link/button inside drawer
					append_url(sidebarGlobal, 'Close', 'm6pn-close');

					// Special handling for "xclusive" theme – use drawer markup as main collection container
					if (getHtmlTheme() === 'xclusive') {
						append_url(sidebarGlobal, 'Close', 'm6pn-close');
						collectionSection = sidebarGlobal;
					}

					// Remove duplicated filters section (non-initialized instance)
					const duplicateFilters = document.querySelector('#filters-aside:not(.filters-aside-initialized)');
					if (duplicateFilters) duplicateFilters.remove();
				}

				// Re-bind "show more" behavior on updated filter lists
				window.dispatchEvent(linkMoreEvt);

				// Re-open filter lists that had been expanded before AJAX reload
				Array.from(toggledLinkMore).forEach(function (el) {
					const selector = 'ul[data-filter-toggle="' + el.dataset.filterToggle + '"] a.link-more';
					const linkMore = collectionSection.querySelector(selector);

					if (linkMore) {
						linkMore.click();
					}
				});

				// After direct filtering, scroll user back to the top of the collection.
				// Back/forward navigation keeps the browser's own scroll restoration.
				if (options.scroll !== false) {
					if (document.querySelector('.collection-wrapper')) {
						document.querySelector('.collection-wrapper').scrollIntoView();
					} else {
						window.scrollTo(0, 0);
					}
				}

				// Update URL only for a new accepted filter/sort interaction. Popstate
				// re-renders the requested history entry without creating another entry.
				if (options.updateHistory !== false) {
					history.pushState(
						{ filterParams },
						'',
						`${window.location.pathname}${filterParams && '?'.concat(filterParams)}`
					);
				}

				// Re-initialize all JS modules that depend on dynamically replaced content
				window.dispatchEvent(collectionSortEvt);
				window.dispatchEvent(rangeSliderEvt);
				forceFormFilterRender = true;
				window.dispatchEvent(initFiltersEvt);
				window.dispatchEvent(filtersEvt);
				window.dispatchEvent(modulePanelEvt);
				window.dispatchEvent(ratingsEvt);
				window.dispatchEvent(semanticInputEvt);
				window.dispatchEvent(semanticSelectEvt);
				window.dispatchEvent(schemeTooltipEvt);
				window.dispatchEvent(popupsEvt);
				window.dispatchEvent(collectionLoadMoreEvt);
				window.dispatchEvent(listScrollableEvt);
				window.dispatchEvent(modulePanelAnchorEvt);
				window.dispatchEvent(productcardVariantsEvt);
				window.dispatchEvent(listCollectionSliderEvt);
				window.dispatchEvent(check_limit_event);
				ajaxCart.init();
				quickShop.init();
				window.dispatchEvent(heightLimitEvt);

				if (standardResultsUpdate) {
					standardResultsUpdate.resolve(getStandardResultsCount(collectionSection));
				}
				if (currentStandardResultsUpdate === standardResultsUpdate) {
					currentStandardResultsUpdate = null;
				}
				if (currentFilterAbortController === filterAbortController) {
					currentFilterAbortController = null;
				}
			})
			.catch((error) => {
				if (standardResultsUpdate) standardResultsUpdate.reject(error);
				if (!error || error.name !== 'AbortError') {
					console.warn("processFilters error", error);
				}
				if (currentStandardResultsUpdate === standardResultsUpdate) {
					currentStandardResultsUpdate = null;
				}
				if (currentFilterAbortController === filterAbortController) {
					currentFilterAbortController = null;
				}
				clearFilterProcessing(filter_form, collectionSection);
			});
	};

	processResultsHistoryState = function () {
		processFilters({
			searchParams: new URLSearchParams(window.location.search),
			updateHistory: false,
			scroll: false,
			emitStandardEvent: false
		});
	};

	const scheduleProcessFilters = function () {
		// Invalidate pending filter renders during the debounce window.
		latestFilterRequestId++;
		cancelCurrentFilterRequest('Superseded during the filter debounce window');

		if (filterDebounceTimer) clearTimeout(filterDebounceTimer);
		filterDebounceTimer = setTimeout(function () {
			filterDebounceTimer = null;
			processFilters();
		}, 125);
	};

	if (filter_form.getAttribute('data-filter-apply-bound') !== '1') {
		filter_form.setAttribute('data-filter-apply-bound', '1');
		filter_form.addEventListener('xtra:apply-filters', scheduleProcessFilters);
	}

	// Disable clicks on anchors inside filter labels – they should not navigate, only toggle inputs
	const formFilterInputAnchors = filter_form.querySelectorAll('li label a');
	formFilterInputAnchors.forEach(el => el.classList.add('no-click'));

	// Handle "Clear all" and "Clear range" actions in filter UI
	const formFilterClear = filter_form.querySelectorAll('a.remove-all, a.clear-range');
	formFilterClear.forEach(el => {
		if (filterClearButtonsBound.has(el)) return;
		filterClearButtonsBound.add(el);

		el.addEventListener('click', e => {
			e.preventDefault();
			el.classList.contains('remove-all') ? clearAllInputs() : clearRangeInputs();
			processFilters();
		});
	});

	// Trigger filtering whenever any filter input changes
	const formFilterInputs = document.querySelectorAll('#filter input');
	formFilterInputs.forEach(el => {
		if (filterInputsBound.has(el)) return;
		filterInputsBound.add(el);

		el.addEventListener('change', scheduleProcessFilters);
	});

	// Determine filter layout (drawer vs static) and current collection wrapper / config
	const filterRoot = document.getElementById('filter');
	const layout = filterRoot.dataset.drawer;
	const collectionWrapper = document.querySelector('.collection-wrapper');
	const filters = collectionWrapper && collectionWrapper.dataset ? collectionWrapper.dataset.filters : undefined;
	const filtersDrawerContent = document.querySelector('#filters-aside');

	// If configuration is inconsistent (drawer markup with static layout or vice versa), clean up and exit
	if ((filtersDrawerContent && layout === 'static') || (!filters && layout === 'drawer')) {
		const initialized = document.querySelector('#root .filters-aside-initialized');
		if (initialized) {
			initialized.remove();
		}
		hidePanels();
		return;
	}

	// Initialize or update drawer layout for filters when layout === 'drawer'
	if (layout === 'drawer' && filtersDrawerContent) {
		const editor = filtersDrawerContent.dataset.editor;
		let initialized = document.querySelector('#root .filters-aside-initialized');

		// First-time initialization: move filters aside markup into root and mark it as initialized
		if (!initialized) {
			document.querySelector('#root').appendChild(filtersDrawerContent);
			filtersDrawerContent.classList.add('filters-aside-initialized');
		}
		// Theme editor handling: sync visibility and reset processed state
		else if (editor) {
			if (filtersDrawerContent.classList.contains('inv')) {
				initialized.classList.add('inv');
			} else {
				initialized.classList.remove('inv');
			}
			initialized.classList.remove('processed-filter');
		}

		// Re-init navigation / aside panel logic for the drawer
		window.dispatchEvent(navAsideEvt);
	}
});
window.dispatchEvent(initFiltersEvt);

window.XtraTheme = window.XtraTheme || {};
if (!window.XtraTheme.standardResultsPopstateBound) {
	window.XtraTheme.standardResultsPopstateBound = true;
	window.addEventListener('popstate', function () {
		if (typeof processResultsHistoryState === 'function') {
			processResultsHistoryState();
		}
	});
}


// #load-more-button - handles "Load More" buttons on collection pages by fetching and appending or prepending products, updating pagination, URL, and related UI components
const collectionLoadMoreEvt = new CustomEvent('collectionLoadMore');

function deferLoadMoreEnhancements(callback) {
	if (typeof runWhenIdle === 'function') {
		runWhenIdle(callback);
		return;
	}

	requestAnimationFrame(function () {
		setTimeout(callback, 0);
	});
}

window.addEventListener('collectionLoadMore', function (evt) {
	const collection_load_more = document.querySelectorAll('#load-more-button[data-next], #load-more-button[data-prev]');

	if (!collection_load_more) return;

	Array.from(collection_load_more).forEach(function (button) {
		if (button.getAttribute('data-collection-load-more-bound') === '1') return;
		button.setAttribute('data-collection-load-more-bound', '1');

		button.addEventListener('click', function (e) {
			e.preventDefault();
			var template = button.getAttribute('data-section'),
				collectionSection = document.getElementById('shopify-section-' + template),
				curr_products = collectionSection.querySelector('.results, .l4cl:not(.bls, .category)'),
				pagination_info = document.getElementById('load-more-info');
			if (button.getAttribute('data-next') != null) {
				var direction = 'next'
			} else {
				var direction = 'prev';
			}
			button.classList.add('loading');
			fetch(button.getAttribute('href'))
				.then((response) => {
					if (!response.ok) {
						var error = new Error(response.status);
						console.warn(error);
					}
					return response.text();
				})
				.then((text) => {
					const resultsMarkup = new DOMParser().parseFromString(text, 'text/html').querySelector('#shopify-section-' + template);
					var new_products = resultsMarkup.querySelector('.results, .l4cl:not(.bls, .category)'),
						new_button = resultsMarkup.querySelector('#load-more-button[data-' + direction + '], #load-more-button[data-top]'),
						new_pagination_info = resultsMarkup.querySelector('#load-more-info');

					if (direction == 'prev') {
						var lastScrollHeight = curr_products.scrollHeight;
					}
					if (curr_products && new_products) {
						const productsFragment = document.createDocumentFragment();

						if (direction == 'next') {
							while (new_products.firstElementChild) {
								productsFragment.appendChild(new_products.firstElementChild);
							}
							curr_products.appendChild(productsFragment);
						} else {
							while (new_products.firstElementChild) {
								productsFragment.appendChild(new_products.firstElementChild);
							}
							curr_products.insertBefore(productsFragment, curr_products.firstChild);
						}
					}
					if (direction == 'next' && pagination_info && pagination_info.parentNode && new_pagination_info) {
						pagination_info.parentNode.replaceChild(new_pagination_info, pagination_info);
					}
					if (button && button.parentNode && new_button) {
						button.parentNode.replaceChild(new_button, button);
					} else if (button && direction == 'prev') {
						button.parentNode.remove();
					}
					if (direction == 'prev') {
						var scrollDiff = curr_products.scrollHeight - lastScrollHeight,
							scrollTo = curr_products.scrollTop += scrollDiff;
						window.scrollTo({
							top: scrollTo,
							behavior: 'instant',
						});
					}
					window.history.replaceState({}, '', button.getAttribute('href'));
					saveLoadMoreAnchor();

					window.dispatchEvent(semanticInputEvt);
					window.dispatchEvent(collectionLoadMoreEvt);
					window.dispatchEvent(listScrollableEvt);
					window.dispatchEvent(productVariantsEvt);
					window.dispatchEvent(semanticSelectEvt);
					window.dispatchEvent(check_limit_event);
					ajaxCart.init();
					quickShop.init();

					deferLoadMoreEnhancements(function () {
						window.dispatchEvent(ratingsEvt);
						window.dispatchEvent(schemeTooltipEvt);
						window.dispatchEvent(popupsEvt);
						window.dispatchEvent(formZindexEvt);
					});
				})
				.catch((error) => {
					console.warn("collectionLoadMore error", error);
				});
		});
	});
});
window.dispatchEvent(collectionLoadMoreEvt);


// #sort_by - applies collection/search sort through the AJAX filter pipeline, with full navigation as a no-form fallback
const collectionSortEvt = new CustomEvent('collectionSort');
window.addEventListener('collectionSort', function (evt) {
	const sort_by = document.getElementById('sort_by');
	if (!sort_by) return;

	if (sort_by.getAttribute('data-collection-sort-bound') === '1') return;
	sort_by.setAttribute('data-collection-sort-bound', '1');
		
	Shopify.queryParams = [];
	if (location.search.length) {
		for (var aKeyValue, i = 0, aCouples = location.search.substr(1).split('&'); i < aCouples.length; i++) {
			aKeyValue = aCouples[i].split('=');
			if (aKeyValue.length > 1) {
				Shopify.queryParams.push({
					key: decodeURIComponent(aKeyValue[0]),
					value: decodeURIComponent(aKeyValue[1])
				});
			}
		}
	}
	sort_by.addEventListener('change', function () {
		const el = this;
		const filterForm = document.getElementById('filter');
		const sortByClone = filterForm ? filterForm.querySelector('.sort_by_clone') : null;

		if (filterForm && sortByClone) {
			sortByClone.value = el.value;
			filterForm.dispatchEvent(new CustomEvent('xtra:apply-filters'));
			return;
		}

		setTimeout(function () {
			const url = new URL(window.location.href);
			url.searchParams.set('sort_by', el.value);
			window.location.assign(url.pathname + url.search);
		}, 1);
	});
});
window.dispatchEvent(collectionSortEvt);
