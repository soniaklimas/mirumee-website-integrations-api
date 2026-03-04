(function () {
  const API_BASE = "/app/api";
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("to");

  let endpoint = API_BASE + "/get-pipedrive-user";
  if (userId) endpoint += "?userId=" + userId;

  fetch(endpoint)
    .then(function (res) {
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    })
    .then(function (user) {
      const wrapper = document.getElementById("contact-avatar-wrapper");
      const avatar = document.getElementById("contact-avatar");
      const nameEl = document.getElementById("contact-person-name");

      if (avatar) {
        avatar.src = user.icon_url || "";
        avatar.alt = user.name;
      }
      if (nameEl) nameEl.textContent = user.name;
      if (wrapper) wrapper.style.opacity = "1";
    })
    .catch(function (err) {
      console.error("Pipedrive user load error:", err);
    });
})();
