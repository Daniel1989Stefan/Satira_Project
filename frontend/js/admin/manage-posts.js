document.addEventListener("DOMContentLoaded", async () => {
  const savedRole = localStorage.getItem("satira_role") || "admin";

  const btnBack = document.getElementById("btn-back-dashboard");
  if (btnBack) {
    btnBack.href =
      savedRole === "co-admin"
        ? "../co-admin/co-admin-dashboard.html"
        : "admin-dashboard.html";
  }

  try {
    const apiPrefix = `/${savedRole}`;

    const res = await fetchAPI(`${apiPrefix}/current-user`, {
      method: "POST",
      credentials: "include",
    });

    const serverRole =
      res.data?.role ||
      res.data?.user?.role ||
      res.data?.admin?.role ||
      res.data?.coAdmin?.role;

    if (serverRole !== "admin" && serverRole !== "co-admin") {
      throw new Error(
        `Sistemul a detectat rolul: ${serverRole || "necunoscut"}`,
      );
    }
  } catch (err) {
    alert("Acces interzis sau sesiune expirată: " + err.message);
    window.location.href =
      savedRole === "co-admin"
        ? "../co-admin/login-co-admin.html"
        : "login-admin.html";
  }
});
