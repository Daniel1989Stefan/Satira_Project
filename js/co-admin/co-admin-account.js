document.addEventListener("DOMContentLoaded", async () => {
  await loadCoAdminProfile();
  setupPasswordToggles();
  setupPasswordForm();
});

async function loadCoAdminProfile() {
  try {
    const response = await fetchAPI("/co-admin/current-user", {
      method: "POST",
      credentials: "include",
    });

    const user = response.data?.coAdmin || response.data;

    if (!user || user.role !== "co-admin") {
      window.location.href = "login-co-admin.html";
      return;
    }

    document.getElementById("display-header-name").innerText =
      user.fullname || user.nickname || "Co-Admin";
    document.getElementById("info-current-name").innerText =
      user.fullname || "Nespecificat";
    document.getElementById("info-current-email").innerText = user.email;
  } catch (error) {
    alert("Eroare la încărcarea profilului: " + error.message);
    window.location.href = "login-co-admin.html";
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

function showMessageInCard(formElement, mesaj, isSuccess = true) {
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
  setTimeout(() => {
    alertDiv.style.opacity = "0";
    alertDiv.style.transition = "opacity 0.4s ease";
    setTimeout(() => alertDiv.remove(), 400);
  }, 4000);
}

function setupPasswordForm() {
  const form = document.getElementById("form-change-password");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button");

    const oldPw = document.getElementById("input-old-password").value;
    const newPw = document.getElementById("input-new-password").value;
    const confPw = document.getElementById("input-confirm-new-password").value;

    if (newPw !== confPw) {
      showMessageInCard(e.target, "Parolele noi nu coincid!", false);
      return;
    }

    try {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Se procesează...`;

      await fetchAPI("/co-admin/change-password", {
        method: "POST",
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
      showMessageInCard(e.target, err.message, false);
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-shield-halved"></i> Actualizează Parola`;
    }
  });
}
