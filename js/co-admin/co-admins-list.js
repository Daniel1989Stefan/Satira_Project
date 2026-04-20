document.addEventListener("DOMContentLoaded", async () => {
  const role = localStorage.getItem("satira_role");
  if (role !== "co-admin") {
    window.location.href = "login-co-admin.html";
    return;
  }

  await loadCoAdmins();
});

async function loadCoAdmins() {
  const container = document.getElementById("team-container");

  try {
    const response = await fetchAPI("/co-admin/all-co-admins", {
      method: "GET",
      credentials: "include",
    });

    const coAdmins = response.data?.coAdmins || [];

    if (coAdmins.length === 0) {
      container.innerHTML = `<p class="text-center text-muted">Nu există colegi înregistrați.</p>`;
      return;
    }

    let html = `
            <table class="team-table">
                <thead>
                    <tr>
                        <th>Nume Complet</th>
                        <th>Email</th>
                        <th>Status Cont</th>
                        <th style="text-align: right;">Acțiuni Rapide</th>
                    </tr>
                </thead>
                <tbody>
        `;

    coAdmins.forEach((admin) => {
      const isDisabled = admin.deactivation?.isDisabled === true;
      const statusBadge = isDisabled
        ? `<span class="status-badge status-suspended"><i class="fa-solid fa-ban"></i> Suspendat</span>`
        : `<span class="status-badge status-active"><i class="fa-solid fa-check-circle"></i> Activ</span>`;

      let actionButtons = "";
      if (isDisabled) {
        actionButtons = `
              <button class="btn-action btn-activate" onclick="showActionModal('${admin.email}', 'reactivate')">
                  <i class="fa-solid fa-unlock"></i> Activează
              </button>
          `;
      } else {
        actionButtons = `
              <button class="btn-action btn-suspend" onclick="showActionModal('${admin.email}', 'suspend')">
                  <i class="fa-solid fa-lock"></i> Suspendă
              </button>
          `;
      }

      html += `
                <tr>
                    <td style="font-weight: bold; color: var(--text-main);">${admin.fullname || "Nespecificat"}</td>
                    <td style="color: var(--text-muted);">${admin.email}</td>
                    <td>${statusBadge}</td>
                    <td style="text-align: right;">${actionButtons}</td>
                </tr>
            `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<p class="text-center text-error font-bold">❌ Eroare: ${error.message}</p>`;
  }
}

// ==========================================
// LOGICĂ CHENAR ȘI NOTIFICĂRI INLINE
// ==========================================

window.showActionModal = function (email, action) {
  const existingModal = document.getElementById("custom-action-modal");
  if (existingModal) existingModal.remove();

  const isSuspend = action === "suspend";
  const title = isSuspend ? "Suspendare Cont" : "Reactivare Cont";
  const btnColor = isSuspend ? "#dc3545" : "#28a745";
  const btnText = isSuspend ? "Confirmă Suspendarea" : "Confirmă Reactivarea";

  const inputHtml = isSuspend
    ? `<input type="text" id="modal-reason-input" class="input-full" placeholder="Scrie motivul aici (opțional)..." style="margin-bottom: 15px; padding: 10px; border: 1px solid var(--border-color); border-radius: 5px; width: 100%; box-sizing: border-box;">`
    : ``;

  const modalHtml = `
        <div id="custom-action-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(3px);">
            <div style="width: 400px; max-width: 90%; background: var(--bg-card); padding: 25px; border-radius: 10px; box-shadow: 0 15px 30px rgba(0,0,0,0.3); border: 1px solid var(--border-color);">
                <h3 style="margin-top: 0; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; color: var(--text-main);">
                    ${isSuspend ? '<i class="fa-solid fa-lock text-error"></i>' : '<i class="fa-solid fa-unlock text-success"></i>'} ${title}
                </h3>
                <p class="text-sm text-muted" style="margin-bottom: 15px;">
                    Ești pe cale să ${isSuspend ? "suspenzi" : "reactivezi"} contul colegului cu adresa <strong>${email}</strong>.
                </p>
                ${inputHtml}
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button id="modal-btn-confirm" class="btn-primary" style="flex: 1; padding: 10px; background-color: ${btnColor}; border: none;">
                        ${btnText}
                    </button>
                    <button id="modal-btn-cancel" class="btn-primary" style="flex: 1; padding: 10px; background-color: #6c757d; border: none;">
                        Anulează
                    </button>
                </div>
            </div>
        </div>
    `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);

  document.getElementById("modal-btn-cancel").addEventListener("click", () => {
    document.getElementById("custom-action-modal").remove();
  });

  document
    .getElementById("modal-btn-confirm")
    .addEventListener("click", async () => {
      const btnConfirm = document.getElementById("modal-btn-confirm");
      btnConfirm.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Se procesează...`;
      btnConfirm.disabled = true;

      let reason = "Fără motiv specificat";
      if (isSuspend) {
        const inputVal = document
          .getElementById("modal-reason-input")
          .value.trim();
        if (inputVal) reason = inputVal;
      }

      await executeStatusChange(email, action, reason);
      document.getElementById("custom-action-modal").remove();
    });
};

async function executeStatusChange(email, action, reason) {
  try {
    const endpoint =
      action === "suspend"
        ? "/co-admin/deactivate-co-admin"
        : "/co-admin/reactivate-co-admin";
    const bodyData = { email: email };
    if (action === "suspend") bodyData.reason = reason;

    await fetchAPI(endpoint, {
      method: "PATCH",
      credentials: "include",
      body: JSON.stringify(bodyData),
    });

    const successMessage =
      action === "suspend" ? "a fost suspendat" : "a fost reactivat";
    showInlineNotification(
      `✅ Contul ${email} ${successMessage} cu succes!`,
      "success",
    );

    await loadCoAdmins();
  } catch (error) {
    showInlineNotification(`❌ Eroare: ${error.message}`, "error");
  }
}

function showInlineNotification(message, type) {
  const mainContainer = document.querySelector(".editor-container");

  const oldNotif = document.getElementById("inline-notification");
  if (oldNotif) oldNotif.remove();

  const bgColor = type === "success" ? "#d4edda" : "#f8d7da";
  const textColor = type === "success" ? "#155724" : "#721c24";
  const borderColor = type === "success" ? "#c3e6cb" : "#f5c6cb";

  const notifHtml = `
        <div id="inline-notification" style="
            background-color: ${bgColor}; 
            color: ${textColor}; 
            border: 1px solid ${borderColor}; 
            padding: 15px; 
            border-radius: 8px; 
            margin-bottom: 20px; 
            font-weight: bold; 
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            transition: opacity 0.5s ease;
        ">
            ${message}
        </div>
    `;

  const headerDiv = mainContainer.querySelector(
    "div[style*='margin-bottom: 30px']",
  );
  if (headerDiv) {
    headerDiv.insertAdjacentHTML("afterend", notifHtml);
  } else {
    mainContainer.insertAdjacentHTML("afterbegin", notifHtml);
  }

  setTimeout(() => {
    const notif = document.getElementById("inline-notification");
    if (notif) {
      notif.style.opacity = "0";
      setTimeout(() => notif.remove(), 500);
    }
  }, 4000);
}
