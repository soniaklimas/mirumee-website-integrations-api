(function () {
  const API_BASE = "/app/api";
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("to");

  function loadPipedriveUser() {
    const hiddenInput = document.getElementById("pipedrive-user-id");
    if (hiddenInput && userId) {
      hiddenInput.value = userId;
    }

    let endpoint = API_BASE + "/get-pipedrive-user";
    if (userId) endpoint += "?userId=" + userId;

    fetch(endpoint)
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to fetch user");
        return res.json();
      })
      .then(function (user) {
        const container = document.getElementById("pipedrive-user");
        const nameEl = document.getElementById("pipedrive-name");
        const avatarEl = document.getElementById("pipedrive-avatar");
        const calendarEl = document.getElementById("calendar-link");

        if (nameEl) nameEl.textContent = user.name;
        if (avatarEl) {
          avatarEl.src = user.icon_url || "";
          avatarEl.alt = user.name;
        }
        if (hiddenInput) hiddenInput.value = String(user.id);
        if (calendarEl && user.calendar_link) {
          calendarEl.href = user.calendar_link;
          calendarEl.style.display = "";
        }
        if (container) container.style.display = "";
      })
      .catch(function (err) {
        console.error("Pipedrive user load error:", err);
      });
  }

  function validateForm(form) {
    let hasError = false;

    const textFields = [
      ["name", "name-error"],
      ["email", "email-error"],
      ["message", "message-error"],
    ];

    textFields.forEach(function ([inputId, errorId]) {
      const input = document.getElementById(inputId);
      const errorEl = document.getElementById(errorId);

      if (input && input.value.trim() === "") {
        if (errorEl) errorEl.style.opacity = "100%";
        input.classList.add("error-field");
        hasError = true;
      } else if (input) {
        if (errorEl) errorEl.style.opacity = "0%";
        input.classList.remove("error-field");
      }
    });

    const checkbox = document.getElementById("privacyPolicy");
    const checkboxText = document.getElementById("checkbox-label");
    const labelWrapper = checkboxText
      ? checkboxText.closest(".w-checkbox")
      : null;

    if (checkbox && !checkbox.checked) {
      hasError = true;
      if (labelWrapper) labelWrapper.classList.add("text-error");
    } else if (checkbox && labelWrapper) {
      labelWrapper.classList.remove("text-error");
    }

    return !hasError;
  }

  function setupFormSubmission() {
    const form =
      document.querySelector("[data-name='Contact Form']") ||
      document.querySelector("form");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      e.stopPropagation();

      if (!validateForm(form)) return;

      const formData = new FormData(form);
      const data = {
        name: formData.get("name"),
        email: formData.get("email"),
        phone: formData.get("phone") || undefined,
        message: formData.get("message"),
        pipedriveUserId: formData.get("pipedriveUserId") || undefined,
      };

      const submitBtn = form.querySelector("[type='submit']");
      if (submitBtn) submitBtn.disabled = true;

      fetch(API_BASE + "/submit-contact-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
        .then(function (res) {
          if (!res.ok) throw new Error("Submission failed");
          const success = form.parentElement.querySelector(".w-form-done");
          if (success) success.style.display = "block";
          form.style.display = "none";
          form.reset();
        })
        .catch(function () {
          const fail = form.parentElement.querySelector(".w-form-fail");
          if (fail) fail.style.display = "block";
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      loadPipedriveUser();
      setupFormSubmission();
    });
  } else {
    loadPipedriveUser();
    setupFormSubmission();
  }
})();
