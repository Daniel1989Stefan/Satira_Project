document.addEventListener("DOMContentLoaded", async () => {
  await loadAdminProfile();
  setupPasswordToggles();
  setupForms();
});

async function loadAdminProfile() {
  try {
    const response = await fetchAPI("/admin/current-user", {
      method: "POST",
      credentials: "include",
    });

    const user = response.data?.user || response.data?.admin || response.data;

    if (user.role !== "admin") {
      window.location.href = "login-admin.html";
      return;
    }

    document.getElementById("display-header-name").innerText =
      user.fullname || "Admin";
    document.getElementById("display-header-email").innerText = user.email;

    document.getElementById("info-current-name").innerText =
      user.fullname || "Nespecificat";
    document.getElementById("info-current-email").innerText = user.email;

    document.getElementById("input-new-fullname").value = user.fullname || "";
  } catch (error) {
    alert("Eroare la încărcarea profilului: " + error.message);
    window.location.href = "login-admin.html";
  }
}

function setupPasswordToggles() {
  const toggles = document.querySelectorAll(".toggle-pw");
  toggles.forEach((icon) => {
    icon.addEventListener("click", function () {
      const input = this.previousElementSibling;
      const type =
        input.getAttribute("type") === "password" ? "text" : "password";
      input.setAttribute("type", type);
      this.classList.toggle("fa-eye");
      this.classList.toggle("fa-eye-slash");
    });
  });
}

function showMessageInCard(
  formElement,
  mesaj,
  isSuccess = true,
  isPermanent = false,
) {
  const card = formElement.closest(".settings-card");
  const existingAlert = card.querySelector(".custom-alert");
  if (existingAlert) existingAlert.remove();

  const alertDiv = document.createElement("div");
  alertDiv.className = "custom-alert";
  alertDiv.style.padding = "10px";
  alertDiv.style.marginTop = "15px";
  alertDiv.style.borderRadius = "5px";
  alertDiv.style.fontSize = "14px";
  alertDiv.style.fontWeight = "bold";
  alertDiv.style.textAlign = "center";

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

  formElement.appendChild(alertDiv);

  if (!isPermanent) {
    setTimeout(() => {
      if (alertDiv) {
        alertDiv.style.opacity = "0";
        alertDiv.style.transition = "opacity 0.4s ease";
        setTimeout(() => alertDiv.remove(), 400);
      }
    }, 4000);
  }
}

function setupForms() {
  document
    .getElementById("form-update-name")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector("button");

      try {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Se procesează...`;

        await fetchAPI("/admin/change-fullname", {
          method: "PATCH",
          credentials: "include",
          body: JSON.stringify({
            newFullname: document
              .getElementById("input-new-fullname")
              .value.trim(),
            loginPassword: document.getElementById("input-name-password").value,
          }),
        });

        showMessageInCard(
          e.target,
          "Numele a fost actualizat cu succes!",
          true,
        );
        document.getElementById("input-name-password").value = "";
        loadAdminProfile();
      } catch (err) {
        showMessageInCard(e.target, err.message, false);
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-save"></i> Salvează Numele`;
      }
    });

  document
    .getElementById("form-update-email")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector("button");
      const newEmail = document.getElementById("input-new-email").value.trim();
      const confirmEmail = document
        .getElementById("input-confirm-email")
        .value.trim();

      if (newEmail !== confirmEmail) {
        showMessageInCard(e.target, "Adresele de email nu coincid!", false);
        return;
      }

      try {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Se procesează...`;

        await fetchAPI("/admin/update-email", {
          method: "PATCH",
          credentials: "include",
          body: JSON.stringify({
            newEmail: newEmail,
            confirmEmail: confirmEmail,
            loginPassword: document.getElementById("input-email-password")
              .value,
          }),
        });

        showMessageInCard(e.target, "Email actualizat cu succes!", true);
        document.getElementById("input-new-email").value = "";
        document.getElementById("input-confirm-email").value = "";
        document.getElementById("input-email-password").value = "";
        loadAdminProfile();
      } catch (err) {
        showMessageInCard(e.target, err.message, false);
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-save"></i> Salvează Email-ul`;
      }
    });

  document
    .getElementById("form-change-password")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector("button");

      const oldPw = document.getElementById("input-old-password").value;
      const newPw = document.getElementById("input-new-password").value;
      const confPw = document.getElementById(
        "input-confirm-new-password",
      ).value;

      if (newPw !== confPw) {
        showMessageInCard(e.target, "Parolele noi nu coincid!", false);
        return;
      }

      try {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Se procesează...`;

        await fetchAPI("/admin/change-password", {
          method: "PATCH",
          credentials: "include",
          body: JSON.stringify({
            oldPassword: oldPw,
            newPassword: newPw,
            confirmPassword: confPw,
          }),
        });

        showMessageInCard(e.target, "Parola a fost schimbată cu succes!", true);
        e.target.reset();
      } catch (err) {
        const errMsg = err.message.toLowerCase();

        if (
          errMsg.includes("parol") ||
          errMsg.includes("password") ||
          errMsg.includes("invalid") ||
          errMsg.includes("incorect")
        ) {
          const linkForgotPw = `<a href="forgot-password.html" style="color: #721c24; text-decoration: underline; font-weight: 900;">„Am uitat parola”</a>`;
          const customMsg = `Parolă invalidă. Dacă ați uitat vechea parolă, vă rugăm să urmați procedura ${linkForgotPw}.`;

          showMessageInCard(e.target, customMsg, false, true);
        } else {
          showMessageInCard(e.target, err.message, false);
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-shield-halved"></i> Actualizează Parola`;
      }
    });
}
