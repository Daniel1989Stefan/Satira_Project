const role = localStorage.getItem("satira_role") || "admin";
const apiPrefix = `/${role}`;

const endpointSuspend =
  role === "admin" ? "/admin/disable-account" : "/co-admin/disable-user";
const endpointReactivate =
  role === "admin" ? "/admin/reactivate-account" : "/co-admin/reactivate-user";

let currentPage = 1;
const limit = 100;
let searchQuery = "";

document.addEventListener("DOMContentLoaded", () => {
  const backBtn = document.getElementById("btn-back-dashboard");
  if (backBtn) {
    if (role === "co-admin") {
      backBtn.href = "../co-admin/co-admin-dashboard.html";
    } else {
      backBtn.href = "admin-dashboard.html";
    }
  }

  loadUsers();

  let searchTimeout;
  document.getElementById("user-search").addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    searchQuery = e.target.value.trim();
    searchTimeout = setTimeout(() => {
      currentPage = 1;
      loadUsers();
    }, 500);
  });

  document.getElementById("prev-page").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      loadUsers();
    }
  });

  document.getElementById("next-page").addEventListener("click", () => {
    currentPage++;
    loadUsers();
  });
});

async function loadUsers() {
  const wrapper = document.getElementById("users-table-wrapper");
  try {
    const response = await fetchAPI(
      `${apiPrefix}/all-users?page=${currentPage}&limit=${limit}&search=${searchQuery}`,
      {
        method: "GET",
        credentials: "include",
      },
    );

    const { users, totalPages } = response.data;
    renderTable(users);
    updatePaginationUI(currentPage, totalPages);
  } catch (error) {
    wrapper.innerHTML = `<p class="text-error text-center font-bold">Eroare la încărcare: ${error.message}</p>`;
  }
}

function renderTable(users) {
  const wrapper = document.getElementById("users-table-wrapper");
  if (!users || users.length === 0) {
    wrapper.innerHTML = `<p class="text-center text-muted" style="padding: 20px;">Nu s-au găsit utilizatori.</p>`;
    return;
  }

  let html = `
        <table class="manage-table">
            <thead>
                <tr>
                    <th>Nickname</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th style="text-align: right;">Acțiuni</th>
                </tr>
            </thead>
            <tbody>
    `;

  users.forEach((u) => {
    const isDisabled = u.deactivation?.isDisabled;
    html += `
            <tr id="row-${u._id}">
                <td>
                    <div class="font-bold text-main">@${u.nickname || "Utilizator"}</div>
                </td>
                <td>${u.email}</td>
                <td>
                    <span class="status-badge ${isDisabled ? "status-suspended" : "status-active"}">
                        ${isDisabled ? "Suspendat" : "Activ"}
                    </span>
                </td>
                <td style="text-align: right;" id="actions-${u._id}">
                    ${renderActionButtons(u._id, isDisabled)}
                </td>
            </tr>
        `;
  });

  html += `</tbody></table>`;
  wrapper.innerHTML = html;
}

function renderActionButtons(userId, isDisabled) {
  if (isDisabled) {
    return `<button class="btn-action" onclick="showConfirmInline('${userId}', 'reactivate')" style="color: #28a745; border-color: #28a745;">
                    <i class="fa-solid fa-unlock"></i> Reactivează
                </button>`;
  } else {
    return `<button class="btn-action" onclick="showConfirmInline('${userId}', 'suspend')" style="color: #dc3545; border-color: #dc3545;">
                    <i class="fa-solid fa-ban"></i> Suspendă
                </button>`;
  }
}

window.showConfirmInline = function (userId, action) {
  const container = document.getElementById(`actions-${userId}`);
  const isSuspend = action === "suspend";

  container.innerHTML = `
        <div class="inline-confirm">
            ${isSuspend ? '<input type="text" id="reason-' + userId + '" placeholder="Motiv..." style="padding: 5px; font-size: 12px; border: 1px solid var(--border-color); border-radius: 4px; width: 120px;">' : ""}
            <button onclick="executeAction('${userId}', '${action}')" class="btn-primary" style="padding: 5px 10px; font-size: 12px; background: ${isSuspend ? "#dc3545" : "#28a745"}; border:none;">Confirmă</button>
            <button onclick="cancelAction('${userId}', ${isSuspend ? "false" : "true"})" class="btn-outline" style="padding: 5px 10px; font-size: 12px;">Anulează</button>
        </div>
    `;
};

window.cancelAction = function (userId, wasDisabled) {
  document.getElementById(`actions-${userId}`).innerHTML = renderActionButtons(
    userId,
    wasDisabled,
  );
};

window.executeAction = async function (userId, action) {
  const container = document.getElementById(`actions-${userId}`);
  const reasonInput = document.getElementById(`reason-${userId}`);
  const reason = reasonInput ? reasonInput.value : "";

  const email = document.querySelector(
    `#row-${userId} td:nth-child(2)`,
  ).innerText;

  try {
    container.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;

    const endpointToCall =
      action === "suspend" ? endpointSuspend : endpointReactivate;

    await fetchAPI(endpointToCall, {
      method: "PATCH",
      credentials: "include",
      body: JSON.stringify({ email, reason }),
    });

    container.innerHTML = `<span style="color: #28a745; font-weight: bold;">✅ Gata!</span>`;

    setTimeout(() => {
      loadUsers();
    }, 4000);
  } catch (error) {
    container.innerHTML = `<span class="text-error" style="font-size: 11px;">Eroare: ${error.message}</span>`;
    setTimeout(() => cancelAction(userId, action === "reactivate"), 4000);
  }
};

function updatePaginationUI(current, total) {
  const safeTotal = total || 1;
  document.getElementById("page-info").innerText =
    `Pagina ${current} din ${safeTotal}`;
  document.getElementById("prev-page").disabled = current <= 1;
  document.getElementById("next-page").disabled = current >= safeTotal;
}
