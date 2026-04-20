const CO_ADMIN_PERMISSIONS_LIST = [
  { id: "manageUsers", label: "Gestionează Utilizatori Simpli" },
  { id: "manageCoAdmins", label: "Gestionează alți Co-Admini" },
  { id: "createPosts", label: "Creează Postări" },
  { id: "editPosts", label: "Editează Postări" },
  { id: "deletePosts", label: "Șterge Postări" },
];

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetchAPI("/admin/current-user", {
      method: "POST",
      credentials: "include",
    });
    const role =
      res.data?.role || res.data?.user?.role || res.data?.admin?.role;
    if (role !== "admin") throw new Error("Acces Interzis");
  } catch (err) {
    window.location.href = "login-admin.html";
    return;
  }

  await loadCoAdmins();
});

async function loadCoAdmins() {
  const container = document.getElementById("team-container");

  try {
    const response = await fetchAPI("/admin/all-co-admins", {
      method: "GET",
      credentials: "include",
    });

    const coAdmins = response.data?.coAdmins || [];

    if (coAdmins.length === 0) {
      container.innerHTML = `<p class="text-center text-muted">Nu există co-admini înregistrați.</p>`;
      return;
    }

    let html = `
            <table class="team-table">
                <thead>
                    <tr>
                        <th>Nume Complet</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Acțiuni</th>
                    </tr>
                </thead>
                <tbody>
        `;

    coAdmins.forEach((admin) => {
      const isDisabled = admin.deactivation?.isDisabled === true;
      const statusBadge = isDisabled
        ? `<span class="status-badge status-suspended">Suspendat</span>`
        : `<span class="status-badge status-active">Activ</span>`;

      html += `
                <tr>
                    <td style="font-weight: bold; color: var(--text-main);">${admin.fullname || "Nespecificat"}</td>
                    <td style="color: var(--text-muted);">${admin.email}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <a href="manage-co-admin.html?id=${admin._id}" class="btn-action">
                            <i class="fa-solid fa-gear"></i> Gestionează
                        </a>
                    </td>
                </tr>
            `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;

    document.getElementById("permissions-manager-section").style.display =
      "block";
    initPermissionsManager(coAdmins);
  } catch (error) {
    container.innerHTML = `<p class="text-center text-error">❌ Eroare la încărcarea echipei: ${error.message}</p>`;
  }
}

function initPermissionsManager(coAdminsArray) {
  const selectPerm = document.getElementById("select-permission-filter");
  const selectCoAdmin = document.getElementById("select-coadmin-filter");

  selectPerm.innerHTML = '<option value="">-- Alege o permisiune --</option>';
  selectCoAdmin.innerHTML = '<option value="">-- Alege un Co-Admin --</option>';

  CO_ADMIN_PERMISSIONS_LIST.forEach((perm) => {
    selectPerm.innerHTML += `<option value="${perm.id}">${perm.label}</option>`;
  });

  coAdminsArray.forEach((admin) => {
    selectCoAdmin.innerHTML += `<option value="${admin._id}">${admin.fullname} (${admin.email})</option>`;
  });

  selectPerm.addEventListener("change", (e) => {
    const selectedPermId = e.target.value;
    const resultContainer = document.getElementById("filtered-coadmins-result");

    if (!selectedPermId) {
      resultContainer.innerHTML = `<p class="text-muted text-sm" style="margin: 0;">Selectează o permisiune pentru a vedea cine o are activă.</p>`;
      return;
    }

    const matchingAdmins = coAdminsArray.filter((admin) => {
      const perms = admin.permissions || {};
      return perms[selectedPermId] === true || perms[selectedPermId] === "true";
    });

    if (matchingAdmins.length === 0) {
      resultContainer.innerHTML = `<p class="text-error font-bold" style="margin: 0;"><i class="fa-solid fa-triangle-exclamation"></i> Niciun co-admin nu are această permisiune.</p>`;
      return;
    }

    let html = `<ul style="list-style-type: none; padding: 0; margin: 0;">`;
    matchingAdmins.forEach((admin) => {
      html += `
                <li style="padding: 10px 0; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--text-main); font-weight: 500;">${admin.fullname}</span>
                    <a href="manage-co-admin.html?id=${admin._id}" style="color: #3498db; text-decoration: none; font-size: 13px; font-weight: bold;">
                        <i class="fa-solid fa-arrow-right"></i> Profil
                    </a>
                </li>`;
    });
    html += `</ul>`;
    resultContainer.innerHTML = html;
  });

  selectCoAdmin.addEventListener("change", (e) => {
    const selectedAdminId = e.target.value;
    const resultContainer = document.getElementById(
      "coadmin-permissions-result",
    );
    const btnEdit = document.getElementById("btn-edit-filtered-coadmin");

    if (!selectedAdminId) {
      resultContainer.innerHTML = `<p class="text-muted text-sm" style="margin: 0;">Selectează un co-admin pentru a-i vedea permisiunile.</p>`;
      btnEdit.style.display = "none";
      return;
    }

    const selectedAdmin = coAdminsArray.find((a) => a._id === selectedAdminId);
    if (!selectedAdmin) return;

    const userPerms = selectedAdmin.permissions || {};
    let html = `<div style="margin-top: 10px;">`;

    CO_ADMIN_PERMISSIONS_LIST.forEach((perm) => {
      const isActive =
        userPerms[perm.id] === true || userPerms[perm.id] === "true";
      const icon = isActive
        ? `<i class="fa-solid fa-check text-success" style="width: 20px;"></i>`
        : `<i class="fa-solid fa-xmark text-error" style="width: 20px;"></i>`;
      const textColor = isActive ? `var(--text-main)` : `var(--text-muted)`;
      const fontWeight = isActive ? `bold` : `normal`;

      html += `
              <div style="margin-bottom: 8px; font-size: 14px; color: ${textColor}; font-weight: ${fontWeight};">
                  ${icon} ${perm.label}
              </div>
            `;
    });
    html += `</div>`;

    resultContainer.innerHTML = html;

    btnEdit.style.display = "block";
    btnEdit.href = `manage-co-admin.html?id=${selectedAdmin._id}`;
  });
}
