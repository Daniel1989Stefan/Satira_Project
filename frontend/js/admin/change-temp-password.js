document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-temp-password");
  const statusMsg = document.getElementById("status-message");

  document.querySelectorAll(".toggle-pw").forEach((icon) => {
    icon.addEventListener("click", function () {
      const input = this.previousElementSibling;
      const type =
        input.getAttribute("type") === "password" ? "text" : "password";
      input.setAttribute("type", type);
      this.classList.toggle("fa-eye");
      this.classList.toggle("fa-eye-slash");
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button");

    const email = document.getElementById("input-email").value.trim();
    const temporaryPassword = document.getElementById(
      "input-temp-password",
    ).value;
    const newPassword = document.getElementById("input-new-password").value;
    const confirmPassword = document.getElementById(
      "input-confirm-password",
    ).value;

    if (newPassword !== confirmPassword) {
      statusMsg.style.display = "block";
      statusMsg.style.color = "#dc3545";
      statusMsg.innerHTML = "❌ Parolele noi nu coincid!";
      return;
    }

    try {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Se procesează...`;
      statusMsg.style.display = "none";

      await fetchAPI(`/admin/admin-change-temporary-password`, {
        method: "PATCH",
        body: JSON.stringify({
          email,
          temporaryPassword,
          newPassword,
          confirmPassword,
        }),
      });

      form.style.display = "none";
      statusMsg.style.display = "block";
      statusMsg.style.color = "#28a745";
      statusMsg.innerHTML =
        "✅ Parola a fost setată cu succes! Te redirecționăm la Login...";

      setTimeout(() => (window.location.href = "login-admin.html"), 3000);
    } catch (error) {
      statusMsg.style.display = "block";
      statusMsg.style.color = "#dc3545";
      statusMsg.innerHTML = `❌ Eroare: ${error.message}`;
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-lock"></i> Actualizează și Deblochează Contul`;
    }
  });
});
