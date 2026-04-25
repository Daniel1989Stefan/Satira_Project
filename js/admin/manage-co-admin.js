const CO_ADMIN_PERMISSIONS_LIST = [
  { id: "manageUsers", label: "Gestionează Utilizatori Simpli" },
  { id: "manageCoAdmins", label: "Gestionează alți Co-Admini" },
  { id: "createPosts", label: "Creează Postări" },
  { id: "editPosts", label: "Editează Postări" },
  { id: "deletePosts", label: "Șterge Postări" },
];

let currentCoAdminId = null;
let currentCoAdminEmail = null;

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  currentCoAdminId = urlParams.get("id");

  if (!currentCoAdminId) {
    window.location.href = "co-admins-list.html";
    return;
  }

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

  await loadCoAdminData();
  setupEventListeners();
});

async function loadCoAdminData() {
  try {
    const response = await fetchAPI(`/admin/co-admin/${currentCoAdminId}`, {
      method: "GET",
      credentials: "include",
    });

    const user =
      response.data?.coAdmin ||
      response.data?.coAdminDetails ||
      response.data?.user ||
      response.data;

    if (!user || !user.email) {
      throw new Error("Datele utilizatorului nu au putut fi încărcate.");
    }

    currentCoAdminEmail = user.email;

    document.getElementById("loading-spinner").style.display = "none";
    document.getElementById("profile-content").style.display = "block";

    document.getElementById("display-fullname").innerText =
      user.fullname || "Nume nesetat";
    document.getElementById("display-email").innerText = user.email;

    const isDisabled = user.deactivation?.isDisabled === true;
    document.getElementById("display-status").innerHTML = isDisabled
      ? `<span class="status-badge status-suspended" style="background:#f8d7da; color:#721c24; padding:5px 15px; border-radius:20px; font-weight:bold;"><i class="fa-solid fa-ban"></i> Cont Suspendat</span>`
      : `<span class="status-badge status-active" style="background:#d4edda; color:#155724; padding:5px 15px; border-radius:20px; font-weight:bold;"><i class="fa-solid fa-check-circle"></i> Cont Activ</span>`;

    const fullnameText = user.fullname || "Nume nesetat";
    document.getElementById("display-fullname-text").innerText = fullnameText;
    document.getElementById("input-fullname").value = fullnameText;

    document.getElementById("display-email-text").innerText = user.email;
    document.getElementById("input-email").value = user.email;

    const viewFullname = document.getElementById("fullname-view-mode");
    const editFullname = document.getElementById("fullname-edit-mode");
    if (viewFullname && editFullname) {
      viewFullname.style.display = "flex";
      editFullname.style.display = "none";
    }

    const viewEmail = document.getElementById("email-view-mode");
    const editEmail = document.getElementById("email-edit-mode");
    if (viewEmail && editEmail) {
      viewEmail.style.display = "flex";
      editEmail.style.display = "none";
    }

    const permViewContainer = document.getElementById(
      "permissions-view-container",
    );
    const permEditContainer = document.getElementById(
      "permissions-edit-container",
    );

    if (permViewContainer && permEditContainer) {
      permViewContainer.innerHTML = "";
      permEditContainer.innerHTML = "";

      const userPerms = user.permissions || {};

      CO_ADMIN_PERMISSIONS_LIST.forEach((perm) => {
        const isActive =
          userPerms[perm.id] === true || userPerms[perm.id] === "true";

        const icon = isActive
          ? `<i class="fa-solid fa-check text-success" style="width: 20px;"></i>`
          : `<i class="fa-solid fa-xmark text-error" style="width: 20px;"></i>`;
        const textColor = isActive ? `var(--text-main)` : `var(--text-muted)`;
        const fontWeight = isActive ? `bold` : `normal`;

        permViewContainer.innerHTML += `
          <div style="margin-bottom: 8px; font-size: 14px; color: ${textColor}; font-weight: ${fontWeight};">
              ${icon} ${perm.label}
          </div>
        `;

        const isChecked = isActive ? "checked" : "";
        permEditContainer.innerHTML += `
          <div class="checkbox-group" style="margin-bottom: 10px;">
              <input type="checkbox" id="perm_${perm.id}" value="${perm.id}" ${isChecked}>
              <label for="perm_${perm.id}" style="font-weight: normal; cursor: pointer;">${perm.label}</label>
          </div>
        `;
      });
    }

    const statusContainer = document.getElementById("status-action-container");
    if (isDisabled) {
      const reason = user.deactivation?.reason || "Nespecificat";
      statusContainer.innerHTML = `
        <p class="text-sm text-error mb-10"><strong>Motiv Suspendare:</strong> ${reason}</p>
        <button id="btn-reactivate" class="btn-primary btn-full" style="padding: 10px; background-color: #28a745; border:none;">
            <i class="fa-solid fa-unlock"></i> Reactivare Cont
        </button>
      `;
      document
        .getElementById("btn-reactivate")
        .addEventListener("click", reactivateAccount);
    } else {
      statusContainer.innerHTML = `
        <div class="form-group mb-10">
            <input type="text" id="suspend-reason" class="input-full" placeholder="Motivul suspendării (ex: Abuz permisiuni)...">
        </div>
        <button id="btn-suspend" class="btn-primary btn-full" style="padding: 10px; background-color: #dc3545; border:none; color:white;">
            <i class="fa-solid fa-lock"></i> Suspendă Contul
        </button>
      `;
      document
        .getElementById("btn-suspend")
        .addEventListener("click", suspendAccount);
    }
  } catch (error) {
    console.error("Eroare la încărcare:", error);
  }
}

function setupEventListeners() {
  const viewFullname = document.getElementById("fullname-view-mode");
  const editFullname = document.getElementById("fullname-edit-mode");

  document
    .getElementById("btn-edit-fullname-mode")
    ?.addEventListener("click", () => {
      viewFullname.style.display = "none";
      editFullname.style.display = "block";
    });

  document
    .getElementById("btn-cancel-fullname")
    ?.addEventListener("click", () => {
      editFullname.style.display = "none";
      viewFullname.style.display = "flex";
      document.getElementById("input-fullname").value = document.getElementById(
        "display-fullname-text",
      ).innerText;
    });

  const btnSaveFullname = document.getElementById("btn-save-fullname");
  if (btnSaveFullname) {
    btnSaveFullname.addEventListener("click", async () => {
      const newFullname = document
        .getElementById("input-fullname")
        .value.trim();

      if (!newFullname) {
        showMessageInCard(btnSaveFullname, "Numele nu poate fi gol!", false);
        return;
      }

      try {
        btnSaveFullname.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
        btnSaveFullname.disabled = true;

        await fetchAPI("/admin/change-co-admin-fullname", {
          method: "PATCH",
          credentials: "include",
          body: JSON.stringify({
            email: currentCoAdminEmail,
            newFullname: newFullname,
          }),
        });

        showMessageInCard(viewFullname, "Numele a fost actualizat!", true);
        loadCoAdminData();
      } catch (error) {
        showMessageInCard(btnSaveFullname, error.message, false);
      } finally {
        btnSaveFullname.innerHTML = `Salvează`;
        btnSaveFullname.disabled = false;
      }
    });
  }

  const viewEmail = document.getElementById("email-view-mode");
  const editEmail = document.getElementById("email-edit-mode");

  document
    .getElementById("btn-edit-email-mode")
    ?.addEventListener("click", () => {
      viewEmail.style.display = "none";
      editEmail.style.display = "flex";
    });

  document.getElementById("btn-cancel-email")?.addEventListener("click", () => {
    editEmail.style.display = "none";
    viewEmail.style.display = "flex";
    document.getElementById("input-email").value =
      document.getElementById("display-email-text").innerText;
    document.getElementById("input-confirm-email").value = "";
  });

  const btnSaveEmail = document.getElementById("btn-save-email");
  if (btnSaveEmail) {
    btnSaveEmail.addEventListener("click", async () => {
      const newEmail = document.getElementById("input-email").value.trim();
      const confirmEmail = document
        .getElementById("input-confirm-email")
        .value.trim();

      if (!newEmail || !confirmEmail) {
        showMessageInCard(
          btnSaveEmail,
          "Ambele câmpuri trebuie completate!",
          false,
        );
        return;
      }
      if (newEmail !== confirmEmail) {
        showMessageInCard(btnSaveEmail, "Adresele de email nu coincid!", false);
        return;
      }
      if (newEmail === currentCoAdminEmail) {
        showMessageInCard(
          btnSaveEmail,
          "Acesta este deja email-ul curent.",
          false,
        );
        return;
      }

      try {
        btnSaveEmail.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
        btnSaveEmail.disabled = true;

        await fetchAPI("/admin/update-co-admin-email", {
          method: "PATCH",
          credentials: "include",
          body: JSON.stringify({
            email: currentCoAdminEmail,
            newEmail: newEmail,
            confirmEmail: confirmEmail,
          }),
        });

        showMessageInCard(viewEmail, "Email-ul a fost actualizat!", true);
        document.getElementById("input-confirm-email").value = "";
        loadCoAdminData();
      } catch (error) {
        showMessageInCard(btnSaveEmail, error.message, false);
      } finally {
        btnSaveEmail.innerHTML = `Salvează`;
        btnSaveEmail.disabled = false;
      }
    });
  }

  const btnTogglePermEdit = document.getElementById(
    "btn-toggle-permissions-edit",
  );
  const formUpdatePermissions = document.getElementById(
    "form-update-permissions",
  );
  const permViewContainer = document.getElementById(
    "permissions-view-container",
  );
  const btnCancelPerms = document.getElementById("btn-cancel-permissions");

  if (btnTogglePermEdit && formUpdatePermissions && permViewContainer) {
    btnTogglePermEdit.addEventListener("click", () => {
      permViewContainer.style.display = "none";
      formUpdatePermissions.style.display = "block";
      btnTogglePermEdit.style.display = "none";
    });

    if (btnCancelPerms) {
      btnCancelPerms.addEventListener("click", () => {
        formUpdatePermissions.style.display = "none";
        permViewContainer.style.display = "block";
        btnTogglePermEdit.style.display = "block";
        loadCoAdminData();
      });
    }

    formUpdatePermissions.addEventListener("submit", async (e) => {
      e.preventDefault();

      const permissionsObject = {};
      CO_ADMIN_PERMISSIONS_LIST.forEach((perm) => {
        const isChecked = document.getElementById(`perm_${perm.id}`).checked;
        permissionsObject[perm.id] = isChecked;
      });

      try {
        const submitBtn = formUpdatePermissions.querySelector(
          'button[type="submit"]',
        );
        if (submitBtn) {
          submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Se actualizează...`;
          submitBtn.disabled = true;
        }

        await fetchAPI("/admin/edit-permissions", {
          method: "PATCH",
          credentials: "include",
          body: JSON.stringify({
            email: currentCoAdminEmail,
            permissions: permissionsObject,
          }),
        });

        formUpdatePermissions.style.display = "none";
        permViewContainer.style.display = "block";
        btnTogglePermEdit.style.display = "block";

        showMessageInCard(
          btnTogglePermEdit,
          "Permisiunile au fost actualizate!",
          true,
        );
        loadCoAdminData();
      } catch (error) {
        showMessageInCard(btnTogglePermEdit, error.message, false);
        const submitBtn = formUpdatePermissions.querySelector(
          'button[type="submit"]',
        );
        if (submitBtn) {
          submitBtn.innerHTML = `Salvează`;
          submitBtn.disabled = false;
        }
      }
    });
  }

  const btnResetPassword = document.getElementById("btn-reset-password");
  if (btnResetPassword) {
    btnResetPassword.addEventListener("click", async () => {
      try {
        await fetchAPI("/admin/reset-co-admin-password", {
          method: "PATCH",
          credentials: "include",
          body: JSON.stringify({ email: currentCoAdminEmail }),
        });
        showMessageInCard(
          btnResetPassword,
          "Link de resetare trimis cu succes!",
          true,
        );
      } catch (error) {
        showMessageInCard(btnResetPassword, error.message, false);
      }
    });
  }
}

async function suspendAccount() {
  const reasonInput = document.getElementById("suspend-reason");
  const reason = reasonInput
    ? reasonInput.value.trim() || "Fără motiv specificat"
    : "Fără motiv specificat";

  try {
    // ACTUALIZAT: Endpoint-ul schimbat la /admin/disable-co-admin
    await fetchAPI("/admin/disable-co-admin", {
      method: "PATCH",
      credentials: "include",
      body: JSON.stringify({ email: currentCoAdminEmail, reason: reason }),
    });

    await loadCoAdminData();
    const targetElement = document.getElementById("status-action-container");
    if (targetElement)
      showMessageInCard(targetElement, "Cont suspendat cu succes!", true);
  } catch (error) {
    const targetElement = document.getElementById("btn-suspend");
    if (targetElement) showMessageInCard(targetElement, error.message, false);
  }
}

async function reactivateAccount() {
  try {
    await fetchAPI("/admin/reactivate-co-admin", {
      method: "PATCH",
      credentials: "include",
      body: JSON.stringify({ email: currentCoAdminEmail }),
    });

    await loadCoAdminData();
    const targetElement = document.getElementById("status-action-container");
    if (targetElement)
      showMessageInCard(targetElement, "Cont reactivat cu succes!", true);
  } catch (error) {
    const targetElement = document.getElementById("btn-reactivate");
    if (targetElement) showMessageInCard(targetElement, error.message, false);
  }
}

function showMessageInCard(elementDinCard, mesaj, isSuccess = true) {
  const card = elementDinCard.closest(".settings-card");
  if (!card) return;

  const existingAlert = card.querySelector(".custom-alert");
  if (existingAlert) existingAlert.remove();

  const alertDiv = document.createElement("div");
  alertDiv.className = "custom-alert";
  alertDiv.style.padding = "10px";
  alertDiv.style.marginTop = "10px";
  alertDiv.style.marginBottom = "15px";
  alertDiv.style.borderRadius = "5px";
  alertDiv.style.fontSize = "14px";
  alertDiv.style.fontWeight = "bold";
  alertDiv.style.textAlign = "center";
  alertDiv.style.transition = "opacity 0.4s ease";

  if (isSuccess) {
    alertDiv.style.backgroundColor = "#d4edda";
    alertDiv.style.color = "#155724";
    alertDiv.style.border = "1px solid #c3e6cb";
    alertDiv.innerHTML = `✅ ${mesaj}`;
  } else {
    alertDiv.style.backgroundColor = "#f8d7da";
    alertDiv.style.color = "#721c24";
    alertDiv.style.border = "1px solid #f5c6cb";
    alertDiv.innerHTML = `❌ ${mesaj}`;
  }

  const title = card.querySelector("h3");
  if (title) {
    title.insertAdjacentElement("afterend", alertDiv);
  } else {
    card.prepend(alertDiv);
  }

  setTimeout(() => {
    alertDiv.style.opacity = "0";
    setTimeout(() => alertDiv.remove(), 400);
  }, 4000);
}
