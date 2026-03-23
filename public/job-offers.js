(function () {
  var API_BASE = "/app/api";
  var endpoint = API_BASE + "/get-job-offers";

  var wrapper = document.querySelector("[data-job-offers-wrapper]");
  var emptyState = document.querySelector("[data-job-offers-empty]");
  var template = document.querySelector("[data-job-offer-template]");
  var list = document.querySelector("[data-job-offers-list]");

  if (!wrapper || !list || !template) {
    return;
  }

  var company = wrapper.getAttribute("data-company");
  if (company) {
    endpoint += "?company=" + encodeURIComponent(company);
  }

  function setVisible(el, visible) {
    if (!el) return;
    el.style.display = visible ? "" : "none";
  }

  function formatSalary(offer) {
    if (!offer.currency || (offer.minSalary == null && offer.maxSalary == null)) {
      return "";
    }
    if (offer.minSalary != null && offer.maxSalary != null) {
      return offer.minSalary + "-" + offer.maxSalary + " " + offer.currency;
    }
    return String(offer.minSalary || offer.maxSalary) + " " + offer.currency;
  }

  function renderOffer(offer, index) {
    var node = template.content ? template.content.cloneNode(true) : template.cloneNode(true);
    var root = node.querySelector ? node.querySelector("[data-job-offer-item]") : null;
    if (!root && node.firstElementChild) {
      root = node.firstElementChild;
    }
    if (!root) {
      return;
    }

    var titleEl = root.querySelector("[data-job-title]");
    var salaryEl = root.querySelector("[data-job-salary]");
    var positionEl = root.querySelector("[data-job-position]");
    var linkEl = root.querySelector("[data-job-link]");

    if (titleEl) titleEl.textContent = offer.title || "";
    if (salaryEl) salaryEl.textContent = formatSalary(offer);
    if (positionEl) positionEl.textContent = String(index + 1).padStart(2, "0");
    if (linkEl && offer.url) linkEl.setAttribute("href", offer.url);

    list.appendChild(root);
  }

  fetch(endpoint)
    .then(function (res) {
      if (!res.ok) throw new Error("Failed to fetch job offers");
      return res.json();
    })
    .then(function (payload) {
      var offers = Array.isArray(payload.offers) ? payload.offers : [];
      if (!offers.length) {
        setVisible(wrapper, false);
        setVisible(emptyState, true);
        return;
      }

      setVisible(wrapper, true);
      setVisible(emptyState, false);
      offers.forEach(renderOffer);
    })
    .catch(function (error) {
      console.error("job-offers load error:", error);
      setVisible(wrapper, false);
      setVisible(emptyState, true);
    });
})();
