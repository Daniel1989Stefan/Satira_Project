document.addEventListener("DOMContentLoaded", async () => {
  localStorage.setItem("satira_role", "co-admin");

  await loadCoAdminDashboard();
});

async function loadCoAdminDashboard() {
  const gridContainer = document.getElementById("dashboard-grid");
  const welcomeMessage = document.getElementById("welcome-message");

  try {
    const response = await fetchAPI("/co-admin/current-user", {
      method: "POST",
      credentials: "include",
    });

    const user = response.data;

    if (!user || user.role !== "co-admin") {
      console.warn("⚠️ Utilizatorul nu este co-admin sau nu este logat.");
      window.location.href = "login-co-admin.html";
      return;
    }

    welcomeMessage.innerHTML = `👋 Bun venit, ${user.fullname || user.nickname || "Colegule"}!`;

    const perms = user.permissions || {};

    let cardsHtml = "";

    cardsHtml += `
            <a href="co-admin-account.html" class="dashboard-card">
                <div class="card-icon"><i class="fa-solid fa-user-gear"></i></div>
                <h3>Secțiunea Mea</h3>
                <p class="text-muted text-sm">Vizualizare date profil și schimbare parolă.</p>
            </a>
        `;

    if (perms.createPosts || perms.editPosts || perms.deletePosts) {
      cardsHtml += `
                <a href="../admin/manage-posts.html" class="dashboard-card">
                    <div class="card-icon"><i class="fa-solid fa-file-pen"></i></div>
                    <h3>Postări & Conținut</h3>
                    <p class="text-muted text-sm">Gestionează articolele conform drepturilor tale.</p>
                </a>
            `;
    }

    if (perms.manageUsers) {
      cardsHtml += `
                <a href="../admin/manage-users.html" class="dashboard-card">
                    <div class="card-icon"><i class="fa-solid fa-users"></i></div>
                    <h3>Gestionează Userii</h3>
                    <p class="text-muted text-sm">Vezi lista de utilizatori și activează/suspendă conturile.</p>
                </a>
            `;
    }

    if (perms.manageCoAdmins) {
      cardsHtml += `
                <a href="co-admins-list.html" class="dashboard-card">
                    <div class="card-icon"><i class="fa-solid fa-user-shield"></i></div>
                    <h3>Echipa Co-Admini</h3>
                    <p class="text-muted text-sm">Gestionează statusul colegilor tăi (Suspendare/Activare).</p>
                </a>
            `;
    }

    if (cardsHtml === "") {
      gridContainer.innerHTML = `<p class="text-center text-muted" style="grid-column: 1/-1;">Nu ai încă permisiuni active. Contactează administratorul.</p>`;
    } else {
      gridContainer.innerHTML = cardsHtml;
    }
  } catch (error) {
    console.error("🔴 Eroare la încărcarea dashboard-ului:", error);
    gridContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; color: #dc3545; padding: 20px;">
                <i class="fa-solid fa-circle-xmark" style="font-size: 40px; margin-bottom: 10px;"></i>
                <h3>Sesiune expirată sau eroare server</h3>
                <p>${error.message}</p>
                <a href="login-co-admin.html" class="btn-primary" style="display: inline-block; margin-top: 15px; text-decoration: none;">Înapoi la Login</a>
            </div>
        `;
  }
}
