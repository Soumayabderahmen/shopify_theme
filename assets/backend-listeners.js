var reassignVars = function () {
  html_tag = document.documentElement;
  root_styles = html_tag;
  top_id = document.querySelector('.shopify-section-header');
  nav_top_id = top_id.querySelector('#nav-top') || null;
  header_outer = top_id.querySelector('#header-outer');
  header_id = header_outer.querySelector('#header');
  header_inner = top_id.querySelector('#header-inner');
  logo_id = top_id.querySelector('#logo');
  logo_img = logo_id.querySelector('img');
  search_id = top_id.querySelector('#search');
  nav_outer = header_outer.querySelector('#nav-outer');
  nav_bar_id = header_outer.querySelector('#nav-bar');
  nav_id = header_outer.querySelector('#nav');
  content_id = document.getElementById('content');
  html_width = html_tag.getBoundingClientRect().width;
  nav_main = nav_bar_id ?? nav_id;
  footer_id = document.querySelector('.shopify-section-footer');
  nav_user_id = document.getElementById('nav-user');
  root_id = document.getElementById('root');
  all_list_drop = document.querySelectorAll('.l4dr');
  if (search_id) {
      search_input = search_id.getElementsByTagName('input');
  }
}
document.addEventListener("shopify:section:load", function (event) {
	const section = event.srcElement;
	const editorData = section.dataset.shopifyEditorSection;

	// console.log(editorData);
	// console.log("section load:", section);
	// console.log(event.detail.sectionId);

	if (Shopify.visualPreviewMode && section.closest('shopify-editor') != null) {
		section.closest('shopify-editor').id = 'root';
	}
	reassignVars();
	window.dispatchEvent(createColsEvt);

	if (editorData) {
		try {
			const cfg = JSON.parse(editorData);

			if (cfg.type === 'announcement-bar') {
				window.dispatchEvent(stickyNavEvt);
				window.dispatchEvent(maqrueeEvt);
			}
			if (cfg.type === 'header') {
				window.dispatchEvent(maqrueeEvt);
			}
		} catch (e) {
			console.warn('JSON error in data-shopify-editor-section', e);
		}
	}
  
  if (event.srcElement.getElementsByClassName("l4us").length) {
    window.dispatchEvent(listUspSliderEvt);
  }
  if (event.srcElement.getElementsByClassName("f8vl").length) {
    window.dispatchEvent(accordeonEvt);
    window.dispatchEvent(semanticInputEvt);
    window.dispatchEvent(formValidateEvt);
    ajaxCart.init();
  }
  if (event.srcElement.classList.contains("shopify-section-header")) {
    //userNavIntoNavExecuted = false;
    footerIntoNavExecuted = false;
    html_tag.classList.remove('t1sr');
    html_tag.classList.remove('t1sn');
    html_tag.classList.remove('t1nb');
    html_tag.classList.remove('t1nn');
    html_tag.classList.remove('t1mn');
    if (html_tag.classList.contains('m2a')) {
      html_tag.classList.remove('m2a');
      if (mediaMax1000.matches) {
        nav_burger();
      }
    } else {
      html_tag.classList.remove('m2a');
    }
    window.dispatchEvent(navScrollEvt);
    window.dispatchEvent(navEvt);
    window.dispatchEvent(navtopEvt);
    window.dispatchEvent(searchClassesEvt);
    window.dispatchEvent(searchEvt);
    window.dispatchEvent(stickyNavEvt);
    window.dispatchEvent(topEvt);
    window.dispatchEvent(popupsEvt);
  }
  if (event.detail.sectionId.endsWith("main-password") || event.detail.sectionId.endsWith("main-giftcard")) {
    window.dispatchEvent(backgroundEvt);
  }
  if (event.srcElement.getElementsByClassName("product-recommendations").length) {
    setTimeout(function () {
      window.dispatchEvent(recommendedProductsEvt);
    }, 50);
  }
  if (event.srcElement.querySelector(".l4cl.slider") != null) {
    window.dispatchEvent(listCollectionSliderEvt);
  }
  if (event.srcElement.getElementsByClassName("l4cl").length) {
    window.dispatchEvent(ratingsEvt);
    window.dispatchEvent(formZindexEvt);
    window.dispatchEvent(semanticInputEvt);
    window.dispatchEvent(schemeTooltipEvt);
    window.dispatchEvent(popupsEvt);
    window.dispatchEvent(listScrollableEvt);
    window.dispatchEvent(productcardVariantsEvt);
    upsellPopup.init();
    window.check_limit_event();
    ajaxCart.init();
    quickShop.init();
  }
  if (event.srcElement.getElementsByClassName("l4hs").length) {
    window.dispatchEvent(hotspotsEvt);
    ajaxCart.init();
    quickShop.init();
  }
  if (event.srcElement.getElementsByClassName("m6tb").length) {
    window.dispatchEvent(moduleTabsEvt);
  }
  if (event.srcElement.getElementsByClassName("m6fr").length) {
    window.dispatchEvent(moduleFeaturedSliderEvt);
  }
  if (event.srcElement.querySelector(".l4ft.cols") != null) {
    window.dispatchEvent(masonryEvt);
  }
  if (event.srcElement.querySelector(".l4ft.static") != null) {
    window.dispatchEvent(fancyboxEvt);
  }
  if (event.srcElement.getElementsByClassName("m6cu").length || event.srcElement.getElementsByClassName('countdown-container').length) {
    window.dispatchEvent(countdownEvt);
  }
  if (event.srcElement.getElementsByClassName("l4ts").length) {
    window.dispatchEvent(ratingsEvt);
    window.dispatchEvent(listTestimonialsSliderEvt);
  }
  if (event.srcElement.getElementsByClassName("img-compare").length) {
    window.dispatchEvent(imageCompareEvt);
  }
  if (event.srcElement.getElementsByClassName("l4st").length) {
    window.dispatchEvent(listStaticSliderEvt);
  }
  if (event.srcElement.querySelectorAll("input[type='date']").length) {
    window.dispatchEvent(inputDateEvt);
  }
  if (event.srcElement.getElementsByClassName("m6lm").length) {
    window.dispatchEvent(heightLimitEvt);
    linkMore();
  }
  if (event.srcElement.getElementsByClassName("n6as").length) {
    window.dispatchEvent(navAsideEvt);
  }
  if (event.srcElement.getElementsByClassName("f8pr-urgency").length) {
    window.dispatchEvent(rangeSliderEvt);
  }
  if (event.srcElement.querySelectorAll('video.lazy').length) {
    window.dispatchEvent(lazyVideoEvt);
  }
  console.log(event.detail.sectionId);
  if (event.detail.sectionId.includes("recently_viewed") || event.detail.sectionId.includes("recently-viewed")) {
    window.dispatchEvent(recentlyViewedProductsEvt);
  }
  if (event.detail.sectionId.endsWith("sticky-add-to-cart")) {
    window.dispatchEvent(productVariantsEvt);
    window.dispatchEvent(semanticSelectEvt);
    window.dispatchEvent(stickyAddToCartEvt);
    ajaxCart.init();
  }
  if (event.srcElement.getElementsByClassName('m6pr').length) {
    window.dispatchEvent(stickyAddToCartEvt);
    window.dispatchEvent(ratingsEvt);
    window.dispatchEvent(productVariantsEvt);
    window.dispatchEvent(listProductSliderEvt);
    window.dispatchEvent(listDropEvt);
    window.dispatchEvent(semanticSelectEvt);
    window.dispatchEvent(showHideDataElementEvt);
    window.dispatchEvent(sellingplansEvt);
    window.dispatchEvent(pickupAvailabilityEvt);
    window.dispatchEvent(modulePanelEvt);
    window.dispatchEvent(modulePanelAnchorEvt);
    window.dispatchEvent(formZindexEvt);
    window.dispatchEvent(fancyboxEvt);
    window.dispatchEvent(dataChangeEvt);
    window.dispatchEvent(schemeTooltipEvt);
    window.dispatchEvent(popupsEvt);
    window.dispatchEvent(moduleProductBackgroundEvt);
    linkMore();
  }
  if (event.srcElement.getElementsByClassName('popup-a').length) {
      hidePanels();
      window.dispatchEvent(popupsEvt);
      window.dispatchEvent(productBlockPopupEvt);
  }
  if (event.detail.sectionId.endsWith("main-collection") || event.detail.sectionId.endsWith("main-search") ) {
    window.dispatchEvent(rangeSliderEvt);
    window.dispatchEvent(initFiltersEvt);
    window.dispatchEvent(filtersEvt);
    window.dispatchEvent(collectionSortEvt);
    window.dispatchEvent(collectionLoadMoreEvt);
    linkMore();
    window.dispatchEvent(semanticSelectEvt);
  }
  if (event.detail.sectionId.endsWith("main-giftcard")) {
    if (document.getElementById("background")) {
      document.documentElement.classList.add("t1as");
      document.documentElement.classList.remove("t1pl");
    } else {
      document.documentElement.classList.remove("t1as");
      document.documentElement.classList.add("t1pl");
    }
  }

  if (event.srcElement.querySelectorAll('a[data-shopthelook]').length) {
    shopTheLookDrawer.init();
    let panel =  document.querySelector('#add-products-to-banner ul');
    if (panel.closest('.m6pn').classList.contains('toggle')) {
        let block = panel.getAttribute('data-block-id');
        panel.style.opacity = 0;
        block = document.querySelector(`.${block} [data-shopthelook]`);
        shopTheLookDrawer.load(block);
    }
  }

  // open side cart on select section
  if(section.querySelector('#cart') != null) {
    window.dispatchEvent(handleSideCartEvt);
    ajaxCart.init();
    ajaxCart.load(false, true, false, true);
  }

  if(section.querySelector('#add-products-to-banner') != null) {
      shopTheLookDrawer.init();
      shopTheLookDrawer.load(section.querySelector('#add-products-to-banner'), true);
  }

  if(section.querySelector('article.popup-a:not([data-title^="block-popup"])') != null) {
      let popup = section.querySelector('article.popup-a:not([id^="block-popup"])');
      window.dispatchEvent(popupsEvt);
      loadPopup(popup.getAttribute('data-title'));
  }
});

document.addEventListener("shopify:section:unload", function (event) {
    reassignVars();
    var section = event.srcElement;

    if(section.querySelector('article.popup-a') != null) {
        let popup = section.querySelector('article.popup-a');
        let close = popup.querySelector('.close');
        close.click();
        window.dispatchEvent(popupsEvt);
    }
    if(section.querySelector('.m6pn') != null) {
        hidePanels();

        if(section.querySelector('#add-products-to-banner') != null) {
            shopTheLookDrawer.removeBtn();
            window.dispatchEvent(modulePanelEvt);
        }
    }

});

document.addEventListener("shopify:block:select", function (event) {
  var section = document.getElementById(
    "shopify-section-" + event.detail.sectionId + ""
  );

  html_tag.classList.remove('editor-nav-hover')
    if (section.classList.contains('shopify-section-header') && event.srcElement.classList.contains('sub') && document.documentElement.getBoundingClientRect().width > 1000) {
      setTimeout(function () {
        Array.from(section.querySelectorAll('.sub.toggle')).forEach(function (el) {
            el.classList.remove('toggle');
        });
        navSubHover(event.srcElement);
        event.srcElement.classList.add('toggle');
        html_tag.classList.add('editor-nav-hover')
      }, 0);
    }

  if (section.querySelector(".m6fr") != null) {
    var slideIndex = event.srcElement.dataset.slideIndex;
    var swiper = section.querySelector(".m6fr .swiper-outer").swiper;
    if (swiper != null) {
      swiper.slideTo(slideIndex, 500);
    }
  }
  if (section.querySelector(".l4cl.slider") != null) {
    var slideIndex = event.srcElement.dataset.slideIndex;
    if (slideIndex) {
      var swiper = section.querySelector(".l4cl.slider .swiper-outer").swiper;
      if (swiper != null) {
        swiper.slideTo(slideIndex, 500);
      }
    }
  }
  if (section.querySelector(".accordion-a") != null) {
    window.dispatchEvent(accordeonEvt);
    Array.from(section.querySelectorAll("details")).forEach(function (el) {
      el.removeAttribute("open");
    });
    event.srcElement.setAttribute("open", "");

  }
});
document.addEventListener("shopify:section:reorder", function (event) {
  reassignVars();
  window.dispatchEvent(createColsEvt);
});

document.addEventListener('shopify:section:select', function (event) {
  let section = event.srcElement;
  let popup = section.querySelector('article.popup-a:not([data-title^="block-popup"])');

  if (popup !== null) {
      window.dispatchEvent(popupsEvt);
      loadPopup(popup.getAttribute('data-title'));
  } else if (html_tag.classList.contains('popup-shown')) {
      // Close any open popup if a new section is selected
      let openPopup = document.querySelector('article.popup-a.shown');
      if (openPopup !== null) {
          openPopup.querySelector('.close').click();
      }
  }

  // open side cart on select section
  if(section.querySelector('#cart') != null) {
      ajaxCart.init();
      ajaxCart.load(false, true, false, true);
  }
  if(section.querySelector('#add-products-to-banner') != null) {
      hidePanels();
      shopTheLookDrawer.init();
      shopTheLookDrawer.load(section.querySelector('#add-products-to-banner'), true);
  }
});

document.addEventListener('shopify:section:deselect', function (event) {
  let section = event.srcElement;
  if(section.querySelector('.m6pn') != null) {
      hidePanels();
  }
});