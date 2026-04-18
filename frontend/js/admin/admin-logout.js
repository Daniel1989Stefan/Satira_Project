document.addEventListener("DOMContentLoaded", () => {
  const btnLogout = document.getElementById("btn-logout");

  const role = localStorage.getItem("satira_role") || "admin";
  const apiPrefix = `/${role}`;

  if (btnLogout) {
    btnLogout.addEventListener("click", async (e) => {
      e.preventDefault();

      if (btnLogout.dataset.confirm !== "true") {
        const originalHtml = btnLogout.innerHTML;
        btnLogout.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>Sigur ieși?</span>`;
        btnLogout.dataset.confirm = "true";

        setTimeout(() => {
          if (btnLogout.dataset.confirm === "true") {
            btnLogout.innerHTML = originalHtml;
            btnLogout.dataset.confirm = "false";
          }
        }, 3000);
        return;
      }

      try {
        btnLogout.style.pointerEvents = "none";
        btnLogout.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Se deconectează...</span>`;

        await fetchAPI(`${apiPrefix}/logout`, {
          method: "POST",
          credentials: "include",
        });

        localStorage.removeItem("satira_role");

        window.location.href =
          role === "co-admin"
            ? "../co-admin/login-co-admin.html"
            : "login-admin.html";
      } catch (error) {
        btnLogout.innerHTML = `<i class="fa-solid fa-xmark"></i> <span>Eroare</span>`;
        setTimeout(() => {
          btnLogout.innerHTML = `<i class="fa-solid fa-right-from-bracket"></i> <span>Deconectare</span>`;
          btnLogout.style.pointerEvents = "auto";
          btnLogout.dataset.confirm = "false";
        }, 3000);
      }
    });
  }
});
