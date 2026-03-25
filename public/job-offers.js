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
  const template = document.querySelector("[data-job-offer-template]");
  const list = document.querySelector("[data-job-offers-list]");
  const findOfferEl =
    document.querySelector("[data-find-offer-section]") ||
    document.querySelector(".find_offer_wrapper") ||
    null;

  if (!list || !template) {
    console.warn("[job-offers] Missing required elements:", {
      "data-job-offers-list": Boolean(list),
      "data-job-offer-template": Boolean(template),
    });
    return;
  }

  const company = wrapper ? wrapper.getAttribute("data-company") : "";
  const endpoint =
    API_BASE +
    "/get-job-offers" +
    (company ? "?company=" + encodeURIComponent(company) : "");

  const mockJobs =
    (wrapper && wrapper.hasAttribute("data-mock-job-offers")) ||
    new URLSearchParams(window.location.search).get("mockJobs") === "1";
  const DEBUG = new URLSearchParams(window.location.search).get("debugJobOffers") === "1";

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
    // For your Webflow setup the template is the Link Block row itself.
    return tpl.cloneNode(true);
  }

  function renderOffer(offer, index) {
    const root = cloneOfferRowFromTemplate(template);
    if (!root) {
      return;
    }

    // If Webflow hides elements via conditional classes, remove it from the clone.
    root.classList.remove("w-condition-invisible");
    root.querySelectorAll(".w-condition-invisible").forEach((n) => {
      n.classList.remove("w-condition-invisible");
    });

    root.removeAttribute("data-job-offer-template");
    // Webflow "Hidden" often applies inline `style="display:none"`. Clear it from the clone.
    root.removeAttribute("style");
    // Force visible layout for the clone.
    root.style.setProperty("display", "block", "important");
    root.style.setProperty("visibility", "visible", "important");
    root.style.setProperty("opacity", "1", "important");
    root.style.setProperty("pointer-events", "auto", "important");
    root.style.setProperty("position", "static", "important");

    const deptId = offer.departmentId || "";
    if (deptId) {
      root.setAttribute("data-job-department-id", deptId);
    }

    const positionEl =
      root.querySelector("[data-job-position]") || root.querySelector(".index_number");
    const titleEl =
      root.querySelector("[data-job-title]") || root.querySelector(".job_offer_header");
    const salaryEl =
      root.querySelector("[data-job-salary]") || root.querySelector(".offer_salary");

    const detailEls = root.querySelectorAll(".offer_detail");
    const locationEl =
      root.querySelector("[data-job-location]") || detailEls[0] || null;
    const remoteEl =
      root.querySelector("[data-job-remote]") || detailEls[1] || null;

    if (titleEl) titleEl.textContent = offer.title || "";
    if (salaryEl) salaryEl.textContent = formatSalary(offer);
    if (positionEl) {
      positionEl.textContent = String(index + 1).padStart(2, "0");
    }
    if (locationEl) locationEl.textContent = offer.locationLabel || "";
    if (remoteEl) {
      remoteEl.textContent = offer.remoteLabel || remoteStatusLabel(offer.remoteStatus) || "";
    }

    if (offer.url) {
      if (root.tagName === "A") {
        root.setAttribute("href", offer.url);
      } else {
        const linkEl =
          root.querySelector("[data-job-link]") || root.querySelector("a[href]");
        if (linkEl) linkEl.setAttribute("href", offer.url);
      }
    }

    root.setAttribute("data-job-clone", "");
    list.appendChild(root);
    if (DEBUG && mockJobs) console.debug("[job-offers] rendered", { index, title: offer.title });
  }

  function setupDepartmentTabs(offers) {
    const tabsHost = document.querySelector(".all_positions_wrapper");
    if (!tabsHost) return;

    const buttons = Array.from(tabsHost.querySelectorAll(".all_positions_button"));
    const tabAll = buttons[0];
    const tabTemplate = buttons[1];
    if (!tabAll || !tabTemplate) return;

    // If we've already injected tabs before, remove only the ones we injected.
    tabsHost.querySelectorAll("[data-job-tab-dynamic]").forEach((n) => n.remove());

    const departments = [];
    const seen = new Set();
    offers.forEach((o) => {
      const id = o.departmentId || "";
      const name = o.departmentName || id;
      if (!id || seen.has(id)) return;
      seen.add(id);
      departments.push({ id, name });
    });

    if (!departments.length) return;

    // Default: show all offers, activate All positions tab.
    const activateAll = () => {
      buttons.forEach((b) => b.classList.remove("is-active"));
      tabAll.classList.add("is-active");
      list.querySelectorAll("[data-job-department-id]").forEach((row) => {
        row.style.setProperty("display", "block", "important");
      });
    };

    tabAll.onclick = activateAll;
    activateAll();

    // Create at least one department tab (Engineering etc.)
    departments.forEach((dep, idx) => {
      const btn = tabTemplate.cloneNode(true);
      btn.setAttribute("data-job-tab-dynamic", "");
      btn.removeAttribute("id");
      btn.style.display = "";
      btn.classList.remove("is-active");
      btn.textContent = dep.name || "Department";

      btn.onclick = () => {
        buttons.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");

        list.querySelectorAll("[data-job-department-id]").forEach((row) => {
          const rid = row.getAttribute("data-job-department-id") || "";
          row.style.setProperty(
            "display",
            rid === dep.id ? "block" : "none",
            "important",
          );
        });
      };

      tabsHost.insertBefore(btn, tabAll.nextSibling);
      // InsertBefore keeps the ordering as last inserted; that's OK for testing.
    });
  }

  function setFindOfferIndex(nextIndex) {
    if (!findOfferEl) return;
    const indexEl = findOfferEl.querySelector(".index_number");
    if (!indexEl) return;
    indexEl.textContent = String(nextIndex).padStart(2, "0");
  }

  function runWithPayload(payload) {
    const offers = Array.isArray(payload.offers) ? payload.offers : [];

    list.querySelectorAll("[data-job-clone]").forEach((n) => {
      n.remove();
    });

    if (DEBUG) console.debug("[job-offers] payload", { offersCount: offers.length });

    if (!offers.length) {
      list.style.display = "none";
      setFindOfferIndex(1);
      return;
    }

    const displayMode = list.getAttribute("data-list-display") || "flex";
    list.style.display = displayMode;
    if (displayMode === "flex") {
      list.style.flexDirection = "column";
    }

    offers.forEach((offer, i) => renderOffer(offer, i));
    setupDepartmentTabs(offers);
    setFindOfferIndex(offers.length + 1);
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
      list.style.display = "none";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initJobOffers);
  } else {
    initJobOffers();
  }
})();
