/**
 * Job offers UI for Webflow.
 *
 * Script URL: must match your Next.js basePath. With basePath "/app", this file is at /app/job-offers.js
 * on the Cloud app origin. If the careers page is on webflow.io, use the full Cloud app URL for src=,
 * not a relative /app/... path (that would request webflow.io, not the API host).
 */
(function () {
  const API_BASE = "/app/api";

  function initJobOffers() {
  const wrapper = document.querySelector("[data-job-offers-wrapper]");
  const emptyState = document.querySelector("[data-job-offers-empty]");
  const template = document.querySelector("[data-job-offer-template]");
  const list = document.querySelector("[data-job-offers-list]");

  if (!wrapper || !list || !template) {
    console.warn(
      "[job-offers] Missing required elements (add Custom attributes on the careers page):",
      {
        "data-job-offers-wrapper": Boolean(wrapper),
        "data-job-offers-list": Boolean(list),
        "data-job-offer-template": Boolean(template),
      },
    );
    return;
  }

  const company = wrapper.getAttribute("data-company");
  const endpoint =
    API_BASE +
    "/get-job-offers" +
    (company ? "?company=" + encodeURIComponent(company) : "");

  const mockJobs =
    wrapper.hasAttribute("data-mock-job-offers") ||
    new URLSearchParams(window.location.search).get("mockJobs") === "1";

  /** Mock list: Engineering roles, PLN with spaced thousands (for layout / tabs testing) */
  function getMockPayload() {
    return {
      count: 2,
      hasOffers: true,
      offers: [
        {
          id: "mock-backend-python",
          title: "BACKEND DEVELOPER (PYTHON)",
          departmentId: "mock-dept-engineering",
          departmentName: "Engineering",
          locationLabel: "Wrocław/Piła",
          remoteLabel: "Fully Remote",
          minSalary: 15000,
          maxSalary: 23000,
          currency: "PLN",
          url: "#",
          remoteStatus: "remote",
          company: null,
        },
        {
          id: "mock-frontend-react",
          title: "SENIOR FRONTEND DEVELOPER (REACT)",
          departmentId: "mock-dept-engineering",
          departmentName: "Engineering",
          locationLabel: "Warszawa",
          remoteLabel: "Hybrid",
          minSalary: 18000,
          maxSalary: 26000,
          currency: "PLN",
          url: "#",
          remoteStatus: "hybrid",
          company: null,
        },
      ],
    };
  }

  function setVisible(el, visible) {
    if (!el) return;
    el.style.display = visible ? "" : "none";
  }

  function formatNumberWithSpaces(n) {
    return String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  function formatSalary(offer) {
    if (offer.salaryDisplay) {
      return offer.salaryDisplay;
    }
    if (!offer.currency || (offer.minSalary == null && offer.maxSalary == null)) {
      return "";
    }
    if (offer.minSalary != null && offer.maxSalary != null) {
      return (
        formatNumberWithSpaces(offer.minSalary) +
        " - " +
        formatNumberWithSpaces(offer.maxSalary) +
        " " +
        offer.currency
      );
    }
    return formatNumberWithSpaces(offer.minSalary || offer.maxSalary) + " " + offer.currency;
  }

  function remoteStatusLabel(status) {
    if (status === "remote") return "Fully Remote";
    if (status === "hybrid") return "Hybrid";
    if (status === "none") return "";
    return "";
  }

  function cloneOfferRowFromTemplate(tpl) {
    if (tpl.tagName === "TEMPLATE") {
      const frag = tpl.content.cloneNode(true);
      return (
        frag.querySelector("[data-job-offer-item]") || frag.firstElementChild
      );
    }
    if (tpl.hasAttribute && tpl.hasAttribute("data-job-offer-template")) {
      return tpl.cloneNode(true);
    }
    const clone = tpl.cloneNode(true);
    return (
      clone.querySelector("[data-job-offer-item]") ||
      clone.firstElementChild ||
      clone
    );
  }

  function renderOffer(offer, index) {
    const root = cloneOfferRowFromTemplate(template);
    if (!root) {
      return;
    }

    root.removeAttribute("data-job-offer-template");
    root.style.display = "";

    const deptId = offer.departmentId || "";
    if (deptId) {
      root.setAttribute("data-job-department-id", deptId);
    }

    const titleEl = root.querySelector("[data-job-title]");
    const salaryEl = root.querySelector("[data-job-salary]");
    const positionEl = root.querySelector("[data-job-position]");
    const locationEl = root.querySelector("[data-job-location]");
    const remoteEl = root.querySelector("[data-job-remote]");
    const linkEl = root.matches("[data-job-link]")
      ? root
      : root.querySelector("[data-job-link]");

    if (titleEl) titleEl.textContent = offer.title || "";
    if (salaryEl) salaryEl.textContent = formatSalary(offer);
    if (positionEl) {
      positionEl.textContent = String(index + 1).padStart(2, "0");
    }
    if (locationEl) {
      locationEl.textContent = offer.locationLabel || "";
    }
    if (remoteEl) {
      remoteEl.textContent =
        offer.remoteLabel || remoteStatusLabel(offer.remoteStatus) || "";
    }
    if (linkEl && offer.url) {
      linkEl.setAttribute("href", offer.url);
    }

    root.setAttribute("data-job-clone", "");
    list.appendChild(root);
  }

  function clearDynamicTabs(tabsHost, tabTemplate) {
    tabsHost.querySelectorAll("[data-job-tab-dynamic]").forEach((n) => {
      n.remove();
    });
    if (tabTemplate) {
      tabTemplate.style.display = "none";
    }
  }

  function setTabActive(activeBtn, allTabButtons) {
    allTabButtons.forEach((btn) => {
      btn.setAttribute("aria-pressed", btn === activeBtn ? "true" : "false");
      btn.classList.toggle("is-active", btn === activeBtn);
    });
  }

  function setupDepartmentTabs(offers) {
    const tabsHost = document.querySelector("[data-job-tabs]");
    const tabAll = document.querySelector("[data-job-tab-all]");
    const tabTemplate = document.querySelector("[data-job-tab-template]");
    if (!tabsHost || !tabAll || !tabTemplate) {
      return;
    }

    clearDynamicTabs(tabsHost, tabTemplate);

    const seen = new Map();
    offers.forEach((o) => {
      const id = o.departmentId || "";
      const name = o.departmentName || (id ? id : "");
      if (!id && !name) return;
      const key = id || name;
      if (!seen.has(key)) {
        seen.set(key, { id: id, name: name || id });
      }
    });

    const departments = Array.from(seen.values()).filter((d) => {
      return d.id || d.name;
    });
    if (departments.length <= 1 && !departments[0]) {
      return;
    }

    const tabButtons = [tabAll];
    departments.forEach((dep) => {
      const btn = tabTemplate.cloneNode(true);
      btn.removeAttribute("id");
      btn.setAttribute("data-job-tab-dynamic", "");
      btn.setAttribute("data-department-id", dep.id);
      btn.style.display = "";
      btn.textContent = dep.name || "Department";
      tabTemplate.parentNode.insertBefore(btn, tabTemplate.nextSibling);
      tabButtons.push(btn);
    });

    function filterRows(departmentId) {
      const rows = list.querySelectorAll("[data-job-department-id]");
      rows.forEach((row) => {
        const rid = row.getAttribute("data-job-department-id") || "";
        const show = !departmentId || rid === departmentId;
        row.style.display = show ? "" : "none";
      });
    }

    tabAll.addEventListener("click", () => {
      setTabActive(tabAll, tabButtons);
      filterRows("");
    });

    tabButtons.slice(1).forEach((btn) => {
      btn.addEventListener("click", () => {
        setTabActive(btn, tabButtons);
        filterRows(btn.getAttribute("data-department-id") || "");
      });
    });

    setTabActive(tabAll, tabButtons);
    filterRows("");
  }

  function showListForOffers(hasOffers) {
    const displayMode = list.getAttribute("data-list-display") || "flex";
    if (hasOffers) {
      list.style.display = displayMode;
      if (displayMode === "flex") {
        // Job rows should stack vertically.
        list.style.flexDirection = "column";
      }
    } else {
      list.style.display = "none";
    }
  }

  function runWithPayload(payload) {
    const offers = Array.isArray(payload.offers) ? payload.offers : [];

    list.querySelectorAll("[data-job-clone]").forEach((n) => {
      n.remove();
    });

    const tabsHost = document.querySelector("[data-job-tabs]");
    const tabTemplate = document.querySelector("[data-job-tab-template]");
    if (tabsHost && tabTemplate) {
      clearDynamicTabs(tabsHost, tabTemplate);
    }

    if (!offers.length) {
      setVisible(wrapper, true);
      setVisible(emptyState, !!emptyState);
      showListForOffers(false);
      return;
    }

    setVisible(wrapper, true);
    setVisible(emptyState, false);
    showListForOffers(true);

    offers.forEach((offer, i) => {
      renderOffer(offer, i);
    });

    setupDepartmentTabs(offers);
  }

  if (mockJobs) {
    runWithPayload(getMockPayload());
    return;
  }

  fetch(endpoint)
    .then(async (res) => {
      if (!res.ok) {
        const errText = await res.text();
        let detail = errText.slice(0, 500);
        try {
          const parsed = JSON.parse(errText);
          detail = parsed.error || parsed.message || detail;
        } catch {
          /* not JSON (e.g. HTML 404 page) */
        }
        console.error("[job-offers] API returned error:", res.status, detail);
        throw new Error(`get-job-offers ${res.status}: ${detail}`);
      }
      return res.json();
    })
    .then(runWithPayload)
    .catch((error) => {
      console.error("job-offers load error:", error.message || error);
      setVisible(wrapper, true);
      setVisible(emptyState, !!emptyState);
      showListForOffers(false);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initJobOffers);
  } else {
    initJobOffers();
  }
})();
