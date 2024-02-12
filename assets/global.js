function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
    )
  );
}

document.querySelectorAll('[id^="Details-"] summary').forEach((summary) => {
  summary.setAttribute("role", "button");
  summary.setAttribute(
    "aria-expanded",
    summary.parentNode.hasAttribute("open")
  );

  if (summary.nextElementSibling.getAttribute("id")) {
    summary.setAttribute("aria-controls", summary.nextElementSibling.id);
  }

  summary.addEventListener("click", (event) => {
    event.currentTarget.setAttribute(
      "aria-expanded",
      !event.currentTarget.closest("details").hasAttribute("open")
    );
  });

  if (summary.closest("header-drawer, menu-drawer")) return;
  summary.parentElement.addEventListener("keyup", onKeyUpEscape);
});

const trapFocusHandlers = {};

function trapFocus(container, elementToFocus = container) {
  var elements = getFocusableElements(container);
  var first = elements[0];
  var last = elements[elements.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = (event) => {
    if (
      event.target !== container &&
      event.target !== last &&
      event.target !== first
    )
      return;

    document.addEventListener("keydown", trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function () {
    document.removeEventListener("keydown", trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = function (event) {
    if (event.code.toUpperCase() !== "TAB") return; // If not TAB key
    // On the last focusable element and tab forward, focus the first element.
    if (event.target === last && !event.shiftKey) {
      event.preventDefault();
      first.focus();
    }

    //  On the first focusable element and tab backward, focus the last element.
    if (
      (event.target === container || event.target === first) &&
      event.shiftKey
    ) {
      event.preventDefault();
      last.focus();
    }
  };

  document.addEventListener("focusout", trapFocusHandlers.focusout);
  document.addEventListener("focusin", trapFocusHandlers.focusin);

  elementToFocus.focus();

  if (
    elementToFocus.tagName === "INPUT" &&
    ["search", "text", "email", "url"].includes(elementToFocus.type) &&
    elementToFocus.value
  ) {
    elementToFocus.setSelectionRange(0, elementToFocus.value.length);
  }
}

// Here run the querySelector to figure out if the browser supports :focus-visible or not and run code based on it.
try {
  document.querySelector(":focus-visible");
} catch (e) {
  focusVisiblePolyfill();
}

function focusVisiblePolyfill() {
  const navKeys = [
    "ARROWUP",
    "ARROWDOWN",
    "ARROWLEFT",
    "ARROWRIGHT",
    "TAB",
    "ENTER",
    "SPACE",
    "ESCAPE",
    "HOME",
    "END",
    "PAGEUP",
    "PAGEDOWN",
  ];
  let currentFocusedElement = null;
  let mouseClick = null;

  window.addEventListener("keydown", (event) => {
    if (navKeys.includes(event.code.toUpperCase())) {
      mouseClick = false;
    }
  });

  window.addEventListener("mousedown", (event) => {
    mouseClick = true;
  });

  window.addEventListener(
    "focus",
    () => {
      if (currentFocusedElement)
        currentFocusedElement.classList.remove("focused");

      if (mouseClick) return;

      currentFocusedElement = document.activeElement;
      currentFocusedElement.classList.add("focused");
    },
    true
  );
}

function pauseAllMedia() {
  document.querySelectorAll(".js-youtube").forEach((video) => {
    video.contentWindow.postMessage(
      '{"event":"command","func":"' + "pauseVideo" + '","args":""}',
      "*"
    );
  });
  document.querySelectorAll(".js-vimeo").forEach((video) => {
    video.contentWindow.postMessage('{"method":"pause"}', "*");
  });
  document.querySelectorAll("video").forEach((video) => video.pause());
  document.querySelectorAll("product-model").forEach((model) => {
    if (model.modelViewerUI) model.modelViewerUI.pause();
  });
}

function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener("focusin", trapFocusHandlers.focusin);
  document.removeEventListener("focusout", trapFocusHandlers.focusout);
  document.removeEventListener("keydown", trapFocusHandlers.keydown);

  if (elementToFocus) elementToFocus.focus();
}

function onKeyUpEscape(event) {
  if (event.code.toUpperCase() !== "ESCAPE") return;

  const openDetailsElement = event.target.closest("details[open]");
  if (!openDetailsElement) return;

  const summaryElement = openDetailsElement.querySelector("summary");
  openDetailsElement.removeAttribute("open");
  summaryElement.setAttribute("aria-expanded", false);
  summaryElement.focus();
}

class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector("input");
    this.changeEvent = new Event("change", { bubbles: true });
    this.input.addEventListener("change", this.onInputChange.bind(this));
    this.querySelectorAll("button").forEach((button) =>
      button.addEventListener("click", this.onButtonClick.bind(this))
    );
  }

  quantityUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.validateQtyRules();
    this.quantityUpdateUnsubscriber = subscribe(
      PUB_SUB_EVENTS.quantityUpdate,
      this.validateQtyRules.bind(this)
    );
  }

  disconnectedCallback() {
    if (this.quantityUpdateUnsubscriber) {
      this.quantityUpdateUnsubscriber();
    }
  }

  onInputChange(event) {
    this.validateQtyRules();
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;

    event.target.name === "plus" ? this.input.stepUp() : this.input.stepDown();
    if (previousValue !== this.input.value)
      this.input.dispatchEvent(this.changeEvent);
  }

  validateQtyRules() {
    const value = parseInt(this.input.value);
    if (this.input.min) {
      const min = parseInt(this.input.min);
      const buttonMinus = this.querySelector(".quantity__button[name='minus']");
      buttonMinus.classList.toggle("disabled", value <= min);
    }
    if (this.input.max) {
      const max = parseInt(this.input.max);
      const buttonPlus = this.querySelector(".quantity__button[name='plus']");
      buttonPlus.classList.toggle("disabled", value >= max);
    }
  }
}

customElements.define("quantity-input", QuantityInput);

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function throttle(fn, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = new Date().getTime();
    if (now - lastCall < delay) {
      return;
    }
    lastCall = now;
    return fn(...args);
  };
}

function fetchConfig(type = "json") {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: `application/${type}`,
    },
  };
}

/*
 * Shopify Common JS
 *
 */
if (typeof window.Shopify == "undefined") {
  window.Shopify = {};
}

Shopify.bind = function (fn, scope) {
  return function () {
    return fn.apply(scope, arguments);
  };
};

Shopify.setSelectorByValue = function (selector, value) {
  for (var i = 0, count = selector.options.length; i < count; i++) {
    var option = selector.options[i];
    if (value == option.value || value == option.innerHTML) {
      selector.selectedIndex = i;
      return i;
    }
  }
};

Shopify.addListener = function (target, eventName, callback) {
  target.addEventListener
    ? target.addEventListener(eventName, callback, false)
    : target.attachEvent("on" + eventName, callback);
};

Shopify.postLink = function (path, options) {
  options = options || {};
  var method = options["method"] || "post";
  var params = options["parameters"] || {};

  var form = document.createElement("form");
  form.setAttribute("method", method);
  form.setAttribute("action", path);

  for (var key in params) {
    var hiddenField = document.createElement("input");
    hiddenField.setAttribute("type", "hidden");
    hiddenField.setAttribute("name", key);
    hiddenField.setAttribute("value", params[key]);
    form.appendChild(hiddenField);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

Shopify.CountryProvinceSelector = function (
  country_domid,
  province_domid,
  options
) {
  this.countryEl = document.getElementById(country_domid);
  this.provinceEl = document.getElementById(province_domid);
  this.provinceContainer = document.getElementById(
    options["hideElement"] || province_domid
  );

  Shopify.addListener(
    this.countryEl,
    "change",
    Shopify.bind(this.countryHandler, this)
  );

  this.initCountry();
  this.initProvince();
};

Shopify.CountryProvinceSelector.prototype = {
  initCountry: function () {
    var value = this.countryEl.getAttribute("data-default");
    Shopify.setSelectorByValue(this.countryEl, value);
    this.countryHandler();
  },

  initProvince: function () {
    var value = this.provinceEl.getAttribute("data-default");
    if (value && this.provinceEl.options.length > 0) {
      Shopify.setSelectorByValue(this.provinceEl, value);
    }
  },

  countryHandler: function (e) {
    var opt = this.countryEl.options[this.countryEl.selectedIndex];
    var raw = opt.getAttribute("data-provinces");
    var provinces = JSON.parse(raw);

    this.clearOptions(this.provinceEl);
    if (provinces && provinces.length == 0) {
      this.provinceContainer.style.display = "none";
    } else {
      for (var i = 0; i < provinces.length; i++) {
        var opt = document.createElement("option");
        opt.value = provinces[i][0];
        opt.innerHTML = provinces[i][1];
        this.provinceEl.appendChild(opt);
      }

      this.provinceContainer.style.display = "";
    }
  },

  clearOptions: function (selector) {
    while (selector.firstChild) {
      selector.removeChild(selector.firstChild);
    }
  },

  setOptions: function (selector, values) {
    for (var i = 0, count = values.length; i < values.length; i++) {
      var opt = document.createElement("option");
      opt.value = values[i];
      opt.innerHTML = values[i];
      selector.appendChild(opt);
    }
  },
};

class MenuDrawer extends HTMLElement {
  constructor() {
    super();

    this.mainDetailsToggle = this.querySelector("details");

    this.addEventListener("keyup", this.onKeyUp.bind(this));
    this.addEventListener("focusout", this.onFocusOut.bind(this));
    this.bindEvents();
  }

  bindEvents() {
    this.querySelectorAll("summary").forEach((summary) =>
      summary.addEventListener("click", this.onSummaryClick.bind(this))
    );
    this.querySelectorAll("button:not(.localization-selector)").forEach(
      (button) =>
        button.addEventListener("click", this.onCloseButtonClick.bind(this))
    );
  }

  onKeyUp(event) {
    if (event.code.toUpperCase() !== "ESCAPE") return;

    const openDetailsElement = event.target.closest("details[open]");
    if (!openDetailsElement) return;

    openDetailsElement === this.mainDetailsToggle
      ? this.closeMenuDrawer(
          event,
          this.mainDetailsToggle.querySelector("summary")
        )
      : this.closeSubmenu(openDetailsElement);
  }

  onSummaryClick(event) {
    const summaryElement = event.currentTarget;
    const detailsElement = summaryElement.parentNode;
    const parentMenuElement = detailsElement.closest(".has-submenu");
    const isOpen = detailsElement.hasAttribute("open");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function addTrapFocus() {
      trapFocus(
        summaryElement.nextElementSibling,
        detailsElement.querySelector("button")
      );
      summaryElement.nextElementSibling.removeEventListener(
        "transitionend",
        addTrapFocus
      );
    }

    if (detailsElement === this.mainDetailsToggle) {
      if (isOpen) event.preventDefault();
      isOpen
        ? this.closeMenuDrawer(event, summaryElement)
        : this.openMenuDrawer(summaryElement);

      if (window.matchMedia("(max-width: 990px)")) {
        document.documentElement.style.setProperty(
          "--viewport-height",
          `${window.innerHeight}px`
        );
      }
    } else {
      setTimeout(() => {
        detailsElement.classList.add("menu-opening");
        summaryElement.setAttribute("aria-expanded", true);
        parentMenuElement && parentMenuElement.classList.add("submenu-open");
        !reducedMotion || reducedMotion.matches
          ? addTrapFocus()
          : summaryElement.nextElementSibling.addEventListener(
              "transitionend",
              addTrapFocus
            );
      }, 100);
    }
  }

  openMenuDrawer(summaryElement) {
    setTimeout(() => {
      this.mainDetailsToggle.classList.add("menu-opening");
    });
    summaryElement.setAttribute("aria-expanded", true);
    trapFocus(this.mainDetailsToggle, summaryElement);
    document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);
  }

  closeMenuDrawer(event, elementToFocus = false) {
    if (event === undefined) return;

    this.mainDetailsToggle.classList.remove("menu-opening");
    this.mainDetailsToggle.querySelectorAll("details").forEach((details) => {
      details.removeAttribute("open");
      details.classList.remove("menu-opening");
    });
    this.mainDetailsToggle
      .querySelectorAll(".submenu-open")
      .forEach((submenu) => {
        submenu.classList.remove("submenu-open");
      });
    document.body.classList.remove(
      `overflow-hidden-${this.dataset.breakpoint}`
    );
    removeTrapFocus(elementToFocus);
    this.closeAnimation(this.mainDetailsToggle);

    if (event instanceof KeyboardEvent)
      elementToFocus?.setAttribute("aria-expanded", false);
  }

  onFocusOut() {
    setTimeout(() => {
      if (
        this.mainDetailsToggle.hasAttribute("open") &&
        !this.mainDetailsToggle.contains(document.activeElement)
      )
        this.closeMenuDrawer();
    });
  }

  onCloseButtonClick(event) {
    const detailsElement = event.currentTarget.closest("details");
    this.closeSubmenu(detailsElement);
  }

  closeSubmenu(detailsElement) {
    const parentMenuElement = detailsElement.closest(".submenu-open");
    parentMenuElement && parentMenuElement.classList.remove("submenu-open");
    detailsElement.classList.remove("menu-opening");
    detailsElement
      .querySelector("summary")
      .setAttribute("aria-expanded", false);
    removeTrapFocus(detailsElement.querySelector("summary"));
    this.closeAnimation(detailsElement);
  }

  closeAnimation(detailsElement) {
    let animationStart;

    const handleAnimation = (time) => {
      if (animationStart === undefined) {
        animationStart = time;
      }

      const elapsedTime = time - animationStart;

      if (elapsedTime < 400) {
        window.requestAnimationFrame(handleAnimation);
      } else {
        detailsElement.removeAttribute("open");
        if (detailsElement.closest("details[open]")) {
          trapFocus(
            detailsElement.closest("details[open]"),
            detailsElement.querySelector("summary")
          );
        }
      }
    };

    window.requestAnimationFrame(handleAnimation);
  }
}

customElements.define("menu-drawer", MenuDrawer);

class HeaderDrawer extends MenuDrawer {
  constructor() {
    super();
  }

  openMenuDrawer(summaryElement) {
    this.header = this.header || document.querySelector(".section-header");
    this.borderOffset =
      this.borderOffset ||
      this.closest(".header-wrapper").classList.contains(
        "header-wrapper--border-bottom"
      )
        ? 1
        : 0;
    document.documentElement.style.setProperty(
      "--header-bottom-position",
      `${parseInt(
        this.header.getBoundingClientRect().bottom - this.borderOffset
      )}px`
    );
    this.header.classList.add("menu-open");

    setTimeout(() => {
      this.mainDetailsToggle.classList.add("menu-opening");
    });

    summaryElement.setAttribute("aria-expanded", true);
    window.addEventListener("resize", this.onResize);
    trapFocus(this.mainDetailsToggle, summaryElement);
    document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);
  }

  closeMenuDrawer(event, elementToFocus) {
    if (!elementToFocus) return;
    super.closeMenuDrawer(event, elementToFocus);
    this.header.classList.remove("menu-open");
    window.removeEventListener("resize", this.onResize);
  }

  onResize = () => {
    this.header &&
      document.documentElement.style.setProperty(
        "--header-bottom-position",
        `${parseInt(
          this.header.getBoundingClientRect().bottom - this.borderOffset
        )}px`
      );
    document.documentElement.style.setProperty(
      "--viewport-height",
      `${window.innerHeight}px`
    );
  };
}

customElements.define("header-drawer", HeaderDrawer);

class ModalDialog extends HTMLElement {
  constructor() {
    super();
    this.querySelector('[id^="ModalClose-"]').addEventListener(
      "click",
      this.hide.bind(this, false)
    );
    this.addEventListener("keyup", (event) => {
      if (event.code.toUpperCase() === "ESCAPE") this.hide();
    });
    if (this.classList.contains("media-modal")) {
      this.addEventListener("pointerup", (event) => {
        if (
          event.pointerType === "mouse" &&
          !event.target.closest("deferred-media, product-model")
        )
          this.hide();
      });
    } else {
      this.addEventListener("click", (event) => {
        if (event.target === this) this.hide();
      });
    }
  }

  connectedCallback() {
    if (this.moved) return;
    this.moved = true;
    document.body.appendChild(this);
  }

  show(opener) {
    this.openedBy = opener;
    const popup = this.querySelector(".template-popup");
    document.body.classList.add("overflow-hidden");
    this.setAttribute("open", "");
    if (popup) popup.loadContent();
    trapFocus(this, this.querySelector('[role="dialog"]'));
    window.pauseAllMedia();
  }

  hide() {
    document.body.classList.remove("overflow-hidden");
    document.body.dispatchEvent(new CustomEvent("modalClosed"));
    this.removeAttribute("open");
    removeTrapFocus(this.openedBy);
    window.pauseAllMedia();
  }
}
customElements.define("modal-dialog", ModalDialog);

class ModalOpener extends HTMLElement {
  constructor() {
    super();

    const button = this.querySelector("button");

    if (!button) return;
    button.addEventListener("click", () => {
      const modal = document.querySelector(this.getAttribute("data-modal"));
      if (modal) modal.show(button);
    });
  }
}
customElements.define("modal-opener", ModalOpener);

class DeferredMedia extends HTMLElement {
  constructor() {
    super();
    const poster = this.querySelector('[id^="Deferred-Poster-"]');
    if (!poster) return;
    poster.addEventListener("click", this.loadContent.bind(this));
  }

  loadContent(focus = true) {
    window.pauseAllMedia();
    if (!this.getAttribute("loaded")) {
      const content = document.createElement("div");
      content.appendChild(
        this.querySelector("template").content.firstElementChild.cloneNode(true)
      );

      this.setAttribute("loaded", true);
      const deferredElement = this.appendChild(
        content.querySelector("video, model-viewer, iframe")
      );
      if (focus) deferredElement.focus();
      if (
        deferredElement.nodeName == "VIDEO" &&
        deferredElement.getAttribute("autoplay")
      ) {
        // force autoplay for safari
        deferredElement.play();
      }
    }
  }
}

customElements.define("deferred-media", DeferredMedia);

class SliderComponent extends HTMLElement {
  constructor() {
    super();
    this.slider = this.querySelector('[id^="Slider-"]');
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
    this.enableSliderLooping = false;
    this.currentPageElement = this.querySelector(".slider-counter--current");
    this.pageTotalElement = this.querySelector(".slider-counter--total");
    this.prevButton = this.querySelector('button[name="previous"]');
    this.nextButton = this.querySelector('button[name="next"]');

    if (!this.slider || !this.nextButton) return;

    this.initPages();
    const resizeObserver = new ResizeObserver((entries) => this.initPages());
    resizeObserver.observe(this.slider);

    this.slider.addEventListener("scroll", this.update.bind(this));
    this.prevButton.addEventListener("click", this.onButtonClick.bind(this));
    this.nextButton.addEventListener("click", this.onButtonClick.bind(this));
  }

  initPages() {
    this.sliderItemsToShow = Array.from(this.sliderItems).filter(
      (element) => element.clientWidth > 0
    );
    if (this.sliderItemsToShow.length < 2) return;
    this.sliderItemOffset =
      this.sliderItemsToShow[1].offsetLeft -
      this.sliderItemsToShow[0].offsetLeft;
    this.slidesPerPage = Math.floor(
      (this.slider.clientWidth - this.sliderItemsToShow[0].offsetLeft) /
        this.sliderItemOffset
    );
    this.totalPages = this.sliderItemsToShow.length - this.slidesPerPage + 1;
    this.update();
  }

  resetPages() {
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
    this.initPages();
  }

  update() {
    // Temporarily prevents unneeded updates resulting from variant changes
    // This should be refactored as part of https://github.com/Shopify/dawn/issues/2057
    if (!this.slider || !this.nextButton) return;

    const previousPage = this.currentPage;
    this.currentPage =
      Math.round(this.slider.scrollLeft / this.sliderItemOffset) + 1;

    if (this.currentPageElement && this.pageTotalElement) {
      this.currentPageElement.textContent = this.currentPage;
      this.pageTotalElement.textContent = this.totalPages;
    }

    if (this.currentPage != previousPage) {
      this.dispatchEvent(
        new CustomEvent("slideChanged", {
          detail: {
            currentPage: this.currentPage,
            currentElement: this.sliderItemsToShow[this.currentPage - 1],
          },
        })
      );
    }

    if (this.enableSliderLooping) return;

    if (
      this.isSlideVisible(this.sliderItemsToShow[0]) &&
      this.slider.scrollLeft === 0
    ) {
      this.prevButton.setAttribute("disabled", "disabled");
    } else {
      this.prevButton.removeAttribute("disabled");
    }

    if (
      this.isSlideVisible(
        this.sliderItemsToShow[this.sliderItemsToShow.length - 1]
      )
    ) {
      this.nextButton.setAttribute("disabled", "disabled");
    } else {
      this.nextButton.removeAttribute("disabled");
    }
  }

  isSlideVisible(element, offset = 0) {
    const lastVisibleSlide =
      this.slider.clientWidth + this.slider.scrollLeft - offset;
    return (
      element.offsetLeft + element.clientWidth <= lastVisibleSlide &&
      element.offsetLeft >= this.slider.scrollLeft
    );
  }

  onButtonClick(event) {
    event.preventDefault();
    const step = event.currentTarget.dataset.step || 1;
    this.slideScrollPosition =
      event.currentTarget.name === "next"
        ? this.slider.scrollLeft + step * this.sliderItemOffset
        : this.slider.scrollLeft - step * this.sliderItemOffset;
    this.setSlidePosition(this.slideScrollPosition);
  }

  setSlidePosition(position) {
    this.slider.scrollTo({
      left: position,
    });
  }
}

customElements.define("slider-component", SliderComponent);

class SlideshowComponent extends SliderComponent {
  constructor() {
    super();
    this.sliderControlWrapper = this.querySelector(".slider-buttons");
    this.enableSliderLooping = true;

    if (!this.sliderControlWrapper) return;

    this.sliderFirstItemNode = this.slider.querySelector(".slideshow__slide");
    if (this.sliderItemsToShow.length > 0) this.currentPage = 1;

    this.announcementBarSlider = this.querySelector(".announcement-bar-slider");
    // Value below should match --duration-announcement-bar CSS value
    this.announcerBarAnimationDelay = this.announcementBarSlider ? 250 : 0;

    this.sliderControlLinksArray = Array.from(
      this.sliderControlWrapper.querySelectorAll(".slider-counter__link")
    );
    this.sliderControlLinksArray.forEach((link) =>
      link.addEventListener("click", this.linkToSlide.bind(this))
    );
    this.slider.addEventListener("scroll", this.setSlideVisibility.bind(this));
    this.setSlideVisibility();

    if (this.announcementBarSlider) {
      this.announcementBarArrowButtonWasClicked = false;

      this.reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      );
      this.reducedMotion.addEventListener("change", () => {
        if (this.slider.getAttribute("data-autoplay") === "true")
          this.setAutoPlay();
      });

      [this.prevButton, this.nextButton].forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            this.announcementBarArrowButtonWasClicked = true;
          },
          { once: true }
        );
      });
    }

    if (this.slider.getAttribute("data-autoplay") === "true")
      this.setAutoPlay();
  }

  setAutoPlay() {
    this.autoplaySpeed = this.slider.dataset.speed * 1000;
    this.addEventListener("mouseover", this.focusInHandling.bind(this));
    this.addEventListener("mouseleave", this.focusOutHandling.bind(this));
    this.addEventListener("focusin", this.focusInHandling.bind(this));
    this.addEventListener("focusout", this.focusOutHandling.bind(this));

    if (this.querySelector(".slideshow__autoplay")) {
      this.sliderAutoplayButton = this.querySelector(".slideshow__autoplay");
      this.sliderAutoplayButton.addEventListener(
        "click",
        this.autoPlayToggle.bind(this)
      );
      this.autoplayButtonIsSetToPlay = true;
      this.play();
    } else {
      this.reducedMotion.matches || this.announcementBarArrowButtonWasClicked
        ? this.pause()
        : this.play();
    }
  }

  onButtonClick(event) {
    super.onButtonClick(event);
    this.wasClicked = true;

    const isFirstSlide = this.currentPage === 1;
    const isLastSlide = this.currentPage === this.sliderItemsToShow.length;

    if (!isFirstSlide && !isLastSlide) {
      this.applyAnimationToAnnouncementBar(event.currentTarget.name);
      return;
    }

    if (isFirstSlide && event.currentTarget.name === "previous") {
      this.slideScrollPosition =
        this.slider.scrollLeft +
        this.sliderFirstItemNode.clientWidth * this.sliderItemsToShow.length;
    } else if (isLastSlide && event.currentTarget.name === "next") {
      this.slideScrollPosition = 0;
    }

    this.setSlidePosition(this.slideScrollPosition);

    this.applyAnimationToAnnouncementBar(event.currentTarget.name);
  }

  setSlidePosition(position) {
    if (this.setPositionTimeout) clearTimeout(this.setPositionTimeout);
    this.setPositionTimeout = setTimeout(() => {
      this.slider.scrollTo({
        left: position,
      });
    }, this.announcerBarAnimationDelay);
  }

  update() {
    super.update();
    this.sliderControlButtons = this.querySelectorAll(".slider-counter__link");
    this.prevButton.removeAttribute("disabled");

    if (!this.sliderControlButtons.length) return;

    this.sliderControlButtons.forEach((link) => {
      link.classList.remove("slider-counter__link--active");
      link.removeAttribute("aria-current");
    });
    this.sliderControlButtons[this.currentPage - 1].classList.add(
      "slider-counter__link--active"
    );
    this.sliderControlButtons[this.currentPage - 1].setAttribute(
      "aria-current",
      true
    );
  }

  autoPlayToggle() {
    this.togglePlayButtonState(this.autoplayButtonIsSetToPlay);
    this.autoplayButtonIsSetToPlay ? this.pause() : this.play();
    this.autoplayButtonIsSetToPlay = !this.autoplayButtonIsSetToPlay;
  }

  focusOutHandling(event) {
    if (this.sliderAutoplayButton) {
      const focusedOnAutoplayButton =
        event.target === this.sliderAutoplayButton ||
        this.sliderAutoplayButton.contains(event.target);
      if (!this.autoplayButtonIsSetToPlay || focusedOnAutoplayButton) return;
      this.play();
    } else if (
      !this.reducedMotion.matches &&
      !this.announcementBarArrowButtonWasClicked
    ) {
      this.play();
    }
  }

  focusInHandling(event) {
    if (this.sliderAutoplayButton) {
      const focusedOnAutoplayButton =
        event.target === this.sliderAutoplayButton ||
        this.sliderAutoplayButton.contains(event.target);
      if (focusedOnAutoplayButton && this.autoplayButtonIsSetToPlay) {
        this.play();
      } else if (this.autoplayButtonIsSetToPlay) {
        this.pause();
      }
    } else if (this.announcementBarSlider.contains(event.target)) {
      this.pause();
    }
  }

  play() {
    this.slider.setAttribute("aria-live", "off");
    clearInterval(this.autoplay);
    this.autoplay = setInterval(
      this.autoRotateSlides.bind(this),
      this.autoplaySpeed
    );
  }

  pause() {
    this.slider.setAttribute("aria-live", "polite");
    clearInterval(this.autoplay);
  }

  togglePlayButtonState(pauseAutoplay) {
    if (pauseAutoplay) {
      this.sliderAutoplayButton.classList.add("slideshow__autoplay--paused");
      this.sliderAutoplayButton.setAttribute(
        "aria-label",
        window.accessibilityStrings.playSlideshow
      );
    } else {
      this.sliderAutoplayButton.classList.remove("slideshow__autoplay--paused");
      this.sliderAutoplayButton.setAttribute(
        "aria-label",
        window.accessibilityStrings.pauseSlideshow
      );
    }
  }

  autoRotateSlides() {
    const slideScrollPosition =
      this.currentPage === this.sliderItems.length
        ? 0
        : this.slider.scrollLeft + this.sliderItemOffset;

    this.setSlidePosition(slideScrollPosition);
    this.applyAnimationToAnnouncementBar();
  }

  setSlideVisibility(event) {
    this.sliderItemsToShow.forEach((item, index) => {
      const linkElements = item.querySelectorAll("a");
      if (index === this.currentPage - 1) {
        if (linkElements.length)
          linkElements.forEach((button) => {
            button.removeAttribute("tabindex");
          });
        item.setAttribute("aria-hidden", "false");
        item.removeAttribute("tabindex");
      } else {
        if (linkElements.length)
          linkElements.forEach((button) => {
            button.setAttribute("tabindex", "-1");
          });
        item.setAttribute("aria-hidden", "true");
        item.setAttribute("tabindex", "-1");
      }
    });
    this.wasClicked = false;
  }

  applyAnimationToAnnouncementBar(button = "next") {
    if (!this.announcementBarSlider) return;

    const itemsCount = this.sliderItems.length;
    const increment = button === "next" ? 1 : -1;

    const currentIndex = this.currentPage - 1;
    let nextIndex = (currentIndex + increment) % itemsCount;
    nextIndex = nextIndex === -1 ? itemsCount - 1 : nextIndex;

    const nextSlide = this.sliderItems[nextIndex];
    const currentSlide = this.sliderItems[currentIndex];

    const animationClassIn = "announcement-bar-slider--fade-in";
    const animationClassOut = "announcement-bar-slider--fade-out";

    const isFirstSlide = currentIndex === 0;
    const isLastSlide = currentIndex === itemsCount - 1;

    const shouldMoveNext =
      (button === "next" && !isLastSlide) ||
      (button === "previous" && isFirstSlide);
    const direction = shouldMoveNext ? "next" : "previous";

    currentSlide.classList.add(`${animationClassOut}-${direction}`);
    nextSlide.classList.add(`${animationClassIn}-${direction}`);

    setTimeout(() => {
      currentSlide.classList.remove(`${animationClassOut}-${direction}`);
      nextSlide.classList.remove(`${animationClassIn}-${direction}`);
    }, this.announcerBarAnimationDelay * 2);
  }

  linkToSlide(event) {
    event.preventDefault();
    const slideScrollPosition =
      this.slider.scrollLeft +
      this.sliderFirstItemNode.clientWidth *
        (this.sliderControlLinksArray.indexOf(event.currentTarget) +
          1 -
          this.currentPage);
    this.slider.scrollTo({
      left: slideScrollPosition,
    });
  }
}

customElements.define("slideshow-component", SlideshowComponent);

class VariantSelects extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("change", this.onVariantChange);
  }

  onVariantChange() {
    this.updateOptions();
    this.updateMasterId();
    this.toggleAddButton(true, "", false);
    this.updatePickupAvailability();
    this.removeErrorMessage();
    this.updateVariantStatuses();

    if (!this.currentVariant) {
      this.toggleAddButton(true, "", true);
      this.setUnavailable();
    } else {
      this.updateMedia();
      this.updateURL();
      this.updateVariantInput();
      this.renderProductInfo();
      this.updateShareUrl();
    }
  }

  updateOptions() {
    this.options = Array.from(
      this.querySelectorAll("select"),
      (select) => select.value
    );
  }

  updateMasterId() {
    this.currentVariant = this.getVariantData().find((variant) => {
      return !variant.options
        .map((option, index) => {
          return this.options[index] === option;
        })
        .includes(false);
    });
  }

  updateMedia() {
    if (!this.currentVariant) return;
    if (!this.currentVariant.featured_media) return;

    const mediaGalleries = document.querySelectorAll(
      `[id^="MediaGallery-${this.dataset.section}"]`
    );
    mediaGalleries.forEach((mediaGallery) =>
      mediaGallery.setActiveMedia(
        `${this.dataset.section}-${this.currentVariant.featured_media.id}`,
        true
      )
    );

    const modalContent = document.querySelector(
      `#ProductModal-${this.dataset.section} .product-media-modal__content`
    );
    if (!modalContent) return;
    const newMediaModal = modalContent.querySelector(
      `[data-media-id="${this.currentVariant.featured_media.id}"]`
    );
    modalContent.prepend(newMediaModal);
  }

  updateURL() {
    if (!this.currentVariant || this.dataset.updateUrl === "false") return;
    window.history.replaceState(
      {},
      "",
      `${this.dataset.url}?variant=${this.currentVariant.id}`
    );
  }

  updateShareUrl() {
    const shareButton = document.getElementById(
      `Share-${this.dataset.section}`
    );
    if (!shareButton || !shareButton.updateUrl) return;
    shareButton.updateUrl(
      `${window.shopUrl}${this.dataset.url}?variant=${this.currentVariant.id}`
    );
  }

  updateVariantInput() {
    const productForms = document.querySelectorAll(
      `#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`
    );
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      input.value = this.currentVariant.id;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  updateVariantStatuses() {
    const selectedOptionOneVariants = this.variantData.filter(
      (variant) => this.querySelector(":checked").value === variant.option1
    );
    const inputWrappers = [...this.querySelectorAll(".product-form__input")];
    inputWrappers.forEach((option, index) => {
      if (index === 0) return;
      const optionInputs = [
        ...option.querySelectorAll('input[type="radio"], option'),
      ];
      const previousOptionSelected =
        inputWrappers[index - 1].querySelector(":checked").value;
      const availableOptionInputsValue = selectedOptionOneVariants
        .filter(
          (variant) =>
            variant.available &&
            variant[`option${index}`] === previousOptionSelected
        )
        .map((variantOption) => variantOption[`option${index + 1}`]);
      this.setInputAvailability(optionInputs, availableOptionInputsValue);
    });
  }

  setInputAvailability(listOfOptions, listOfAvailableOptions) {
    listOfOptions.forEach((input) => {
      if (listOfAvailableOptions.includes(input.getAttribute("value"))) {
        input.innerText = input.getAttribute("value");
      } else {
        input.innerText = window.variantStrings.unavailable_with_option.replace(
          "[value]",
          input.getAttribute("value")
        );
      }
    });
  }

  updatePickupAvailability() {
    const pickUpAvailability = document.querySelector("pickup-availability");
    if (!pickUpAvailability) return;

    if (this.currentVariant && this.currentVariant.available) {
      pickUpAvailability.fetchAvailability(this.currentVariant.id);
    } else {
      pickUpAvailability.removeAttribute("available");
      pickUpAvailability.innerHTML = "";
    }
  }

  removeErrorMessage() {
    const section = this.closest("section");
    if (!section) return;

    const productForm = section.querySelector("product-form");
    if (productForm) productForm.handleErrorMessage();
  }

  renderProductInfo() {
    const requestedVariantId = this.currentVariant.id;
    const sectionId = this.dataset.originalSection
      ? this.dataset.originalSection
      : this.dataset.section;

    fetch(
      `${this.dataset.url}?variant=${requestedVariantId}&section_id=${
        this.dataset.originalSection
          ? this.dataset.originalSection
          : this.dataset.section
      }`
    )
      .then((response) => response.text())
      .then((responseText) => {
        // prevent unnecessary ui changes from abandoned selections
        if (this.currentVariant.id !== requestedVariantId) return;

        const html = new DOMParser().parseFromString(responseText, "text/html");
        const destination = document.getElementById(
          `price-${this.dataset.section}`
        );

        const priceButton = `price-button-${this.dataset.section}`;
        const destinationPriceButton = document.getElementById(priceButton);
        const sourcePriceButton = html.getElementById(priceButton);
        if (destinationPriceButton && sourcePriceButton)
          destinationPriceButton.innerHTML = sourcePriceButton.innerHTML;

        const source = html.getElementById(
          `price-${
            this.dataset.originalSection
              ? this.dataset.originalSection
              : this.dataset.section
          }`
        );
        const skuSource = html.getElementById(
          `Sku-${
            this.dataset.originalSection
              ? this.dataset.originalSection
              : this.dataset.section
          }`
        );
        const skuDestination = document.getElementById(
          `Sku-${this.dataset.section}`
        );
        const inventorySource = html.getElementById(
          `Inventory-${
            this.dataset.originalSection
              ? this.dataset.originalSection
              : this.dataset.section
          }`
        );
        const inventoryDestination = document.getElementById(
          `Inventory-${this.dataset.section}`
        );

        const volumePricingSource = html.getElementById(
          `Volume-${
            this.dataset.originalSection
              ? this.dataset.originalSection
              : this.dataset.section
          }`
        );

        const pricePerItemDestination = document.getElementById(
          `Price-Per-Item-${this.dataset.section}`
        );
        const pricePerItemSource = html.getElementById(
          `Price-Per-Item-${
            this.dataset.originalSection
              ? this.dataset.originalSection
              : this.dataset.section
          }`
        );

        const volumePricingDestination = document.getElementById(
          `Volume-${this.dataset.section}`
        );

        if (source && destination) destination.innerHTML = source.innerHTML;
        if (inventorySource && inventoryDestination)
          inventoryDestination.innerHTML = inventorySource.innerHTML;
        if (skuSource && skuDestination) {
          skuDestination.innerHTML = skuSource.innerHTML;
          skuDestination.classList.toggle(
            "visibility-hidden",
            skuSource.classList.contains("visibility-hidden")
          );
        }

        if (volumePricingSource && volumePricingDestination) {
          volumePricingDestination.innerHTML = volumePricingSource.innerHTML;
        }

        if (pricePerItemSource && pricePerItemDestination) {
          pricePerItemDestination.innerHTML = pricePerItemSource.innerHTML;
          pricePerItemDestination.classList.toggle(
            "visibility-hidden",
            pricePerItemSource.classList.contains("visibility-hidden")
          );
        }

        const price = document.getElementById(`price-${this.dataset.section}`);

        if (price) price.classList.remove("visibility-hidden");

        if (inventoryDestination)
          inventoryDestination.classList.toggle(
            "visibility-hidden",
            inventorySource.innerText === ""
          );

        const addButtonUpdated = html.getElementById(
          `ProductSubmitButton-${sectionId}`
        );
        this.toggleAddButton(
          addButtonUpdated ? addButtonUpdated.hasAttribute("disabled") : true,
          window.variantStrings.soldOut
        );

        publish(PUB_SUB_EVENTS.variantChange, {
          data: {
            sectionId,
            html,
            variant: this.currentVariant,
          },
        });
      });
  }

  toggleAddButton(disable = true, text, modifyClass = true) {
    const productForm = document.getElementById(
      `product-form-${this.dataset.section}`
    );
    if (!productForm) return;
    const addButton = productForm.querySelector('[name="add"]');
    const addButtonText = productForm.querySelector('[name="add"] > span');
    if (!addButton) return;

    if (disable) {
      addButton.setAttribute("disabled", "disabled");
      if (text) addButtonText.textContent = text;
    } else {
      addButton.removeAttribute("disabled");
      addButtonText.textContent = window.variantStrings.addToCart;
    }

    if (!modifyClass) return;
  }

  setUnavailable() {
    const button = document.getElementById(
      `product-form-${this.dataset.section}`
    );
    const addButton = button.querySelector('[name="add"]');
    const addButtonText = button.querySelector('[name="add"] > span');
    const price = document.getElementById(`price-${this.dataset.section}`);
    const inventory = document.getElementById(
      `Inventory-${this.dataset.section}`
    );
    const sku = document.getElementById(`Sku-${this.dataset.section}`);
    const pricePerItem = document.getElementById(
      `Price-Per-Item-${this.dataset.section}`
    );

    if (!addButton) return;
    addButtonText.textContent = window.variantStrings.unavailable;
    if (price) price.classList.add("visibility-hidden");
    if (inventory) inventory.classList.add("visibility-hidden");
    if (sku) sku.classList.add("visibility-hidden");
    if (pricePerItem) pricePerItem.classList.add("visibility-hidden");
  }

  getVariantData() {
    this.variantData =
      this.variantData ||
      JSON.parse(this.querySelector('[type="application/json"]').textContent);
    return this.variantData;
  }
}

customElements.define("variant-selects", VariantSelects);

class VariantRadios extends VariantSelects {
  constructor() {
    super();
  }

  setInputAvailability(listOfOptions, listOfAvailableOptions) {
    listOfOptions.forEach((input) => {
      if (listOfAvailableOptions.includes(input.getAttribute("value"))) {
        input.classList.remove("disabled");
      } else {
        input.classList.add("disabled");
      }
    });
  }

  updateOptions() {
    const fieldsets = Array.from(this.querySelectorAll("fieldset"));
    this.options = fieldsets.map((fieldset) => {
      return Array.from(fieldset.querySelectorAll("input")).find(
        (radio) => radio.checked
      ).value;
    });
  }
}

customElements.define("variant-radios", VariantRadios);

class ProductRecommendations extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const handleIntersection = (entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.unobserve(this);

      fetch(this.dataset.url)
        .then((response) => response.text())
        .then((text) => {
          const html = document.createElement("div");
          html.innerHTML = text;
          const recommendations = html.querySelector("product-recommendations");

          if (recommendations && recommendations.innerHTML.trim().length) {
            this.innerHTML = recommendations.innerHTML;
          }

          if (
            !this.querySelector("slideshow-component") &&
            this.classList.contains("complementary-products")
          ) {
            this.remove();
          }

          if (html.querySelector(".grid__item")) {
            this.classList.add("product-recommendations--loaded");
          }
        })
        .catch((e) => {
          console.error(e);
        });
    };

    new IntersectionObserver(handleIntersection.bind(this), {
      rootMargin: "0px 0px 400px 0px",
    }).observe(this);
  }
}

customElements.define("product-recommendations", ProductRecommendations);

// Select all elements with the class "products-wrapper"
var mainMenuItems = document.querySelectorAll(".header_menu-item");
mainMenuItems.forEach(function (menu) {
  menu.addEventListener("mouseenter", function () {
    mainMenuItems.forEach((menuItem) => {
      menuItem.classList.remove("active");
    });
    this.classList.add("active");
  });
});
var MegaMenuContainer = document.querySelector(".custom_megamenu:not(header-drawer .custom_megamenu)");
MegaMenuContainer.addEventListener("mouseleave", function () {
  let activeMenu = document.querySelector(".header_menu-item.active");
  console.log(activeMenu)
  if (activeMenu) { activeMenu.classList.remove("active");}
});

// Select all elements with the class "products-wrapper"
var menuItemsList = document.querySelectorAll(
  ".header-menu-content-wrapper .header-menu a.custom__list_item"
);
menuItemsList.forEach(function (wrapper) {
  wrapper.addEventListener("mouseenter", handleMouseEnter);
});
function handleMouseEnter(event) {
  var otherMenuItems = document.querySelectorAll(
    ".header-menu-content-wrapper .header-menu a.custom__list_item"
  );

  otherMenuItems.forEach(function (menu) {
    menu.classList.remove("active");
  });
  this.classList.add("active");
}

const variants = document.querySelectorAll(".color_swatch_main_col .variant_");
variants.forEach((variant) => {
  variant.addEventListener("click", handleVariantClick);
});
function handleVariantClick(event) {
  variants.forEach((variant) => {
    const varinat_id = this.getAttribute("variant_id");
    const variant_featured_image = this.getAttribute("variant_featured_image");
    const variant_title = this.getAttribute("variant_title");
    const parentMain = parents(this, "card-wrapper");
    parentMain.querySelector(".varinat_title_main .varinat__title").innerHTML =
      variant_title;
    parentMain
      .querySelector("form .product-variant-id")
      .setAttribute("value", varinat_id);
    parentMain
      .querySelector(".card__media .media .primary_image")
      .setAttribute("src", variant_featured_image);

    variant.classList.remove("active");
  });
  event.target.classList.add("active");
}

function handleQuickViewClick(events) {
  const swatch_con = parents(this, "color_swatch_main_col");
  const swatch_variant = swatch_con.querySelectorAll(".variant_");
  const ulElement = document.createElement("ul");
  ulElement.setAttribute("class", "quick-view__list");

  swatch_variant.forEach((swatch_variant) => {
    const shades_variant_id = swatch_variant.getAttribute("variant_id");
    const shades_title = swatch_variant.getAttribute("variant_title");
    const variant_price = swatch_variant.getAttribute("data_price");
    const variant_style = swatch_variant.getAttribute("style");
    // console.log("variant_id: "+shades_variant_id+ "sades title: "+shades_title+"shades price: "+variant_price);
    const card__parent = parents(this, "card__content");
    // check active varinat
    if (swatch_variant.classList.contains("active")) {
      const active_varinat_title = swatch_variant.getAttribute("variant_title");
      const active_varinat_id = swatch_variant.getAttribute("variant_id");
      const product__title = swatch_variant.getAttribute("product_title");
      document.querySelector(".shades_drawer_title").innerHTML = product__title;
      document.querySelector(".shades_drawer_sub_title").innerHTML =
        active_varinat_title;
      const replaced_variant_id = card__parent
        .querySelector(".quick-add form .product-variant-id")
        .setAttribute("value", active_varinat_id);
      // console.log("Replaced id : "+replaced_variant_id);
    }
    // get add to card button html
    const add_to_card_button =
      card__parent.querySelector(".quick-add").outerHTML;
    document.querySelector(".shades_drawer_footer").innerHTML =
      add_to_card_button;
    // create list item
    const liElement = document.createElement("li");
    liElement.setAttribute("class", "quick-view__list__item");
    if (swatch_variant.classList.contains("active")) {
      liElement.setAttribute("class", "quick-view__list__item active");
    }
    // quick view color div
    const quick_view_item_swatch = document.createElement("div");
    quick_view_item_swatch.setAttribute("class", " quick_view_item_swatch");
    quick_view_item_swatch.setAttribute("style", variant_style);
    quick_view_item_swatch.innerHTML = quick_view_item_swatch.outerHTML;
    // quick view title and price main
    const quick_view_item_button = document.createElement("div");
    quick_view_item_button.setAttribute("class", "quick_view_item_button");
    // quick view title
    const quick_view_item_button_title = document.createElement("div");
    quick_view_item_button_title.innerHTML = shades_title;
    quick_view_item_button_title.setAttribute(
      "class",
      "quick_view_item_button_title"
    );
    // quick view price
    const quick_view_item_button_price = document.createElement("div");
    quick_view_item_button_price.innerHTML = variant_price;
    quick_view_item_button_title.setAttribute(
      "class",
      "quick_view_item_button_price"
    );
    // quick view title and price main appen child
    quick_view_item_button.appendChild(quick_view_item_button_title);
    quick_view_item_button.appendChild(quick_view_item_button_price);

    // const quick_view_item = document.createElement('div');
    // Set attributes for the LI element
    liElement.setAttribute("data-variant-id", shades_variant_id);
    liElement.setAttribute("data-variant-title", shades_title);
    liElement.setAttribute("data-variant-price", variant_price);
    liElement.appendChild(quick_view_item_swatch);
    liElement.appendChild(quick_view_item_button);

    ulElement.appendChild(liElement);
  });
  const drawer_con = document.querySelector(".shades_drawer-container");
  const drawer_content = document.querySelector(".drawer_content");
  drawer_content.innerHTML = ulElement.outerHTML;
  drawer_con.style.left = "0%";
  drawer_con.style.visibility = "visible";
  drawer_con.style.opacity = "1";
}
// close the shades drawer
const shades_drawer_close = document.querySelectorAll(
  ".shades_drawer .close-button"
);
shades_drawer_close.forEach((shades_drawer_close) => {
  shades_drawer_close.addEventListener("click", function () {
    const shades_drawer_close_main_con = parents(
      shades_drawer_close,
      "shades_drawer-container"
    );
    shades_drawer_close_main_con.style.left = "100%";
    shades_drawer_close_main_con.style.visibility = "hidden";
    shades_drawer_close_main_con.style.opacity = "0";
    document.body.classList.remove("overflow-hidden");
  });
});
const open_quick_view = document.querySelectorAll(".open-quick-view-button");
open_quick_view.forEach((open_quick_view) => {
  open_quick_view.addEventListener("click", handleQuickViewClick);
});

// windows click function for variant selector
document.addEventListener("click", function (event) {
  const clickedElement = event.target;
  var element = document.querySelector(".shades_drawer-container");

  var computedStyle = window.getComputedStyle(element);

  if (computedStyle.visibility !== "hidden") {
    try {
      document.body.classList.add("overflow-hidden");
      const drawer_main_shades = document.querySelector(".shades_drawer");
      const drawer_main_shades_con = document.querySelector(
        ".shades_drawer-container"
      );
      drawer_main_shades_con.setAttribute(
        "id",
        "shades_drawer-container_activeid"
      );
      drawer_main_shades_con.classList.add("shades_drawer-container_active");
      const drawer_main_shades_close = document.querySelector(
        ".shades_drawer .close-button"
      );
      if (!drawer_main_shades.contains(event.target)) {
        const check_click_contain_shades_con =
          clickedElement.getAttribute("id");
        if (
          check_click_contain_shades_con == "shades_drawer-container_activeid"
        ) {
          drawer_main_shades_close.click();
        }
      }
      const drawer_main_con = parents(
        clickedElement,
        "shades_drawer-container"
      );
      const drawer_main_list = parents(clickedElement, "quick-view__list");
      const drawer_item_child = parents(
        clickedElement,
        "quick-view__list__item"
      );
      const drawer_main_item = drawer_main_list.querySelectorAll(
        ".quick-view__list__item"
      );
      drawer_main_item.forEach((swatch) => {
        swatch.classList.remove("active");
      });
      const sub_heading_main = drawer_main_con.querySelector(
        ".shades_drawer_sub_title"
      );
      const product_variant_id_rep = drawer_main_con.querySelector(
        ".quick-add form .product-variant-id"
      );

      const variantId_rep = drawer_item_child.getAttribute("data-variant-id");
      const variantTitle_rep =
        drawer_item_child.getAttribute("data-variant-title");
      product_variant_id_rep.setAttribute("value", variantId_rep);
      sub_heading_main.innerHTML = variantTitle_rep;
      drawer_item_child.classList.add("active");
    } catch (error) {}
  }
});
document.addEventListener("DOMContentLoaded", function () {
  document.addEventListener("click", function (event) {
    if (event.target.matches(".shades_drawer-container .quick-add button")) {
      const drawer_main_shades_close = document.querySelector(
        ".shades_drawer .close-button"
      );
      if (drawer_main_shades_close) {
        setTimeout(function () {
          drawer_main_shades_close.click();
        }, 1000);
      }
    }
  });
  if (window.innerWidth < 749.5) {
                var nextButton = document.querySelector('.swiper.mySwiper .swiper-button-next');
                var prevButton = document.querySelector('.swiper.mySwiper .swiper-button-prev');
                var swiperWrapper = document.querySelector('.swiper.mySwiper2 .swiper-wrapper');
                swiperWrapper.insertAdjacentElement('afterend', nextButton);
                swiperWrapper.insertAdjacentElement('afterend', prevButton);
            }
});
  
function appendButtons() {
            
        }

        // Call the function when the page loads
        window.addEventListener('load', appendButtons);

        // You can also add an event listener to adjust the buttons when the window is resized
        window.addEventListener('resize', appendButtons);
  

// add to cart

function addToCart(variantId) {
  var formData = {
    items: [
      {
        id: variantId,
        quantity: 1,
      },
    ],
  };

  fetch("/cart/add.js", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formData),
  })
    .then((response) => response.json())
    .then((data) => {
      // update card drawer
      var cart_item = document.getElementById("CartDrawer");
      var cart_item = cart_item.parentNode;
      cart_item.classList.remove("is-empty");
      fetch(window.location.href)
        .then((response) => response.text())
        .then((data) => {
          console.log('count');
          var tempDiv = document.createElement("div");
          tempDiv.innerHTML = data;
          var updatedContent = tempDiv.querySelector("#CartDrawer").outerHTML;
          if(updatedContent != '' && cart_item){
            console.log('drawer is not empty');
            cart_item.innerHTML = updatedContent;
          }else{
            console.log('drawer is empty');
          }
          
        })
        .catch((error) => {
          console.log(error);
        });
      var cartCountElement = document.querySelector(".cart-count-bubble span");
      var cart_clicked_element = document.querySelector(".header__icon--cart");

      if (cartCountElement) {
        var get_count = document.querySelector(
          ".header__icon--cart .cart-count-bubble span:first-child"
        );
        var get_count_innerhtml = parseInt(get_count.innerHTML);
        var final_count = get_count_innerhtml + 1;
        get_count.innerHTML = final_count;
      } else {
        var insert = `<div class="cart-count-bubble"><span aria-hidden="true">1</span><span class="visually-hidden">1 vare</span></div>`;
        var get_cart_icon = document.querySelector(".header__icon--cart");
        if (get_cart_icon) {
          var parser = new DOMParser();
          var insertElement = parser.parseFromString(insert, "text/html").body
            .firstChild;
          get_cart_icon.appendChild(insertElement);
        }
      }
      cart_clicked_element.click();
    })
    .catch((error) => {});
}

function parents(element, parentClass) {
  let currentElement = element;
  while (currentElement) {
    if (currentElement.classList.contains(parentClass)) {
      return currentElement;
    }
    currentElement = currentElement.parentNode;
  }
}

// document.querySelector('.load-more-btn').addEventListener('click',function(){
function loadMore(elem){
  var settings_product_per_page = elem.closest('.load-more-btn-con').getAttribute('setting_product_per_page');
  // Get button, spinner, and current page number elements
  var btn = document.getElementById('btn');
  var spinner = document.querySelector('.spinner-border');
  var get_page_num = document.querySelector('.load-more-btn');
 
  // get_page_num.style.opacity = '0.3';
  get_page_num.disabled = true;
  spinner.classList.remove('dd__none');

  // Get the URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  var page__count = get_page_num.getAttribute("page-value");
    if (urlParams.keys().next().done) {
      urlParams.set('page',page__count.toString());
      var updatedUrl = `${window.location.origin}${window.location.pathname}?${urlParams.toString()}`;
    } else {
      var current__url = `${window.location.origin}${window.location.pathname}`;
      var windows_hash = `${urlParams.toString()}${window.location.hash}`;
      var updatedUrl = current__url+"?page="+page__count+"&"+windows_hash ;
    }
   let page = get_page_num.getAttribute("page-value");

  // Fetch data from the server
  fetch(updatedUrl)
    .then(function(response) {
      return response.text();
    })
    .then(function(html) {
      // Parse the HTML response
      var parser = new DOMParser();
      var doc = parser.parseFromString(html, "text/html");
      var newProducts = doc.querySelector('#product-grid');
      var product_per_page = doc.querySelector('.load-more-btn-con').getAttribute('product_per_page');
      if (parseInt(product_per_page) < parseInt(settings_product_per_page) ) {
        elem.classList.add('dd__none');
      }
      
      const containsClass = doc.querySelector('.title-wrapper');
      
      if (!containsClass) {
        // Insert new products if available
        var targetElement = document.querySelector('.collection .product-grid:last-of-type');
        targetElement.insertAdjacentHTML('afterend', newProducts.outerHTML);

        // Update the page value
        page++;
        get_page_num.setAttribute("page-value", page);
      } else {
        // Display message or handle the case when there are no more products
        var nomoreProducts = newProducts.outerHTML;
        var targetElement = document.querySelector('.load-more-btn');
        targetElement.insertAdjacentHTML('afterend', nomoreProducts);
        targetElement.classList.add('dd__none');
      }

      // Enable the button and hide the spinner
      get_page_num.style.opacity = '1';
      get_page_num.disabled = false;
      spinner.classList.add('dd__none');
    })
    .catch(function(err) {
      console.log('Failed to fetch page: ', err);
    });
}

document.addEventListener('DOMContentLoaded', function (params) {

  function setWishlistItem(data) {
    var existingData = getWishlistFromLocal();
   
    var dataIndex = existingData.indexOf(data);
    if (dataIndex !== -1) {
      createPopup('remove')
      existingData.splice(dataIndex, 1);
    } else {
      createPopup('add');
      existingData.push(data);
    }
     console.log('length'+ existingData.length);
    if (existingData.length >= 1) {
     document.querySelector('.header__wishlist .header_wishlist_seconry_icon').style.display = 'block';
     document.querySelector('.header__wishlist .wishlis_icon').style.display = 'none'; 
   }else{
     document.querySelector('.header__wishlist .header_wishlist_seconry_icon').style.display = 'none';
     document.querySelector('.header__wishlist .wishlis_icon').style.display = 'block'; 
   }
    localStorage.setItem('setwishListitem', JSON.stringify(existingData));
  }

  function getWishlistFromLocal() {
    var data = localStorage.getItem('setwishListitem');
    return data ? JSON.parse(data) : [];
  }

  function handleButtonClick(event) {
    this.classList.toggle('wishlist_added');
    var data_source = this.getAttribute('data_source');
    setWishlistItem(data_source);
  }

  document.querySelectorAll('.add_to_wishlist').forEach(function (add_wishlist) {
    console.log(add_wishlist);
    add_wishlist.addEventListener('click', handleButtonClick);
  });

  function fetchWishlistItem(urls) {
   if (urls.length >= 1) {
     document.querySelector('.header__wishlist .header_wishlist_seconry_icon').style.display = 'block';
     document.querySelector('.header__wishlist .wishlis_icon').style.display = 'none'; 
   }else{
     document.querySelector('.header__wishlist .header_wishlist_seconry_icon').style.display = 'none';
     document.querySelector('.header__wishlist .wishlis_icon').style.display = 'block'; 
   }
    Promise.all(
      urls.map(url => {
        var add_class_to_wishlist = document.querySelector(`.add_to_wishlist[data_source="${url}"]`);
        if (add_class_to_wishlist) {
          add_class_to_wishlist.classList.add('wishlist_added');
        }
      })
    );
  }

  var productUrls = getWishlistFromLocal();
  fetchWishlistItem(productUrls);
  
 
   function createPopup(element) {
      var existingOverlay = document.querySelector('.wishlist_overlay');
      if (existingOverlay) {
       var wislist_content = existingOverlay.querySelector('.wishlist_popup p');
        console.log(wislist_content);
         if (element === 'add') {
          wislist_content.innerHTML = '1 item <strong>added</strong> in your wishlist!';
        } else {
          wislist_content.innerHTML = '1 item <strong>removed</strong> in your wishlist!';
        }
        return;
      }
     
    var overlay = document.createElement('div');
    overlay.classList.add('wishlist_overlay');
    var popup = document.createElement('div');
    popup.classList.add('wishlist_popup');
      if (element === 'add') {
        popup.innerHTML = '<p>1 item <strong>added</strong> in your wishlist!</p>';  
     } else {
      popup.innerHTML = '<p>1 item <strong>removed</strong> in your wishlist!</p>'; 
     }

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    overlay.style.display = 'flex';
    overlay.style.animation = 'slideDown 0.5s ease';
    setTimeout(function () {
      hideOverlay(overlay);
    }, 1000);
  }

  function hideOverlay(overlay) {
    setTimeout(() => {
      document.body.removeChild(overlay);
    }, 1000);
  }
});

function apply_swiper_slider() {
   var swiper = new Swiper(".new_swiper", {
      pagination: {
        el: ".swiper-pagination",
         clickable: true,
      },
       spaceBetween: 12,
      slidesPerView: 2,
      freeMode: false,
      draggable: true,
      clickable: true,
        // Responsive breakpoints
  breakpoints: {
  
    768: {
      slidesPerView: 3,
    }
  }
    });
}
