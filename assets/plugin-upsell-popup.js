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
  
    function handleSelectChange() {
      setTimeout(function () {
  
        let options = Array.from(popup.querySelectorAll('select'), (select) => select.value);
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
  // upsell popup
  var upsellPopup = (function(module) {
    var init, upsellOverride, openUpsell; // Define the functions
    var upsellBtn; // Define the data and elements
    var popup = document.querySelector('article[data-title="upsell-popup"]');
  
    init = function () {
      upsellBtn = document.querySelectorAll('[data-upsell]:not(.upsell-initialized)');
      if (upsellBtn.length) { upsellOverride(); }
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
  
    openUpsell = function(el) {
  
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
        let select = '<p class="m10" data-variant="'+ currentVariant.id +'" data-value="' + options_list[key][0] + '">';
        select += '<label for="' + optionLabels[index] + '">' + optionLabels[index] + '</label>';
        select += '<select id="'+ key + + optionLabels[index] + '" name="' + optionLabels[index] + '">';
        options_list[key].forEach((x, i) => {
          if (x == currentVariant.options[index]) {
            select += '<option value="'+ x +'" selected data-value="' + x + '">' + x + '</option>';
          } else {
            select += '<option value="'+ x +'" data-value="' + x + '">' + x + '</option>';
          }
        });
        select += '</select></p>';
        dropdowns += select;
      });
  
      // update popup content
      popup.querySelector('fieldset').innerHTML = dropdowns;
      popup.querySelector('.link-btn').innerHTML = '<a>'+ translations.select +'</a>';
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