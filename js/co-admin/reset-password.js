document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const resetToken = urlParams.get("token");

  const form = document.getElementById("form-reset-password");
  const errorDiv = document.getElementById("status-error");
  const successDiv = document.getElementById("status-success");
  const btnSubmit = document.getElementById("btn-submit");

  if (!resetToken) {
    form.style.display = "none";
    errorDiv.style.display = "block";
    errorDiv.innerHTML = "❌ Link invalid sau lipsă token de resetare.";
    return;
  }

  const togglePassword = document.getElementById("toggle-password");
  const toggleConfirmPassword = document.getElementById(
    "toggle-confirm-password",
  );
  const inputPassword = document.getElementById("input-password");
  const inputConfirmPassword = document.getElementById(
    "input-confirm-password",
  );

  function setupPasswordToggle(toggleIcon, inputField) {
    if (toggleIcon && inputField) {
      toggleIcon.addEventListener("click", function () {
        const isPassword = inputField.getAttribute("type") === "password";
        inputField.setAttribute("type", isPassword ? "text" : "password");
        this.classList.toggle("fa-eye");
        this.classList.toggle("fa-eye-slash");
      });
    }
  }

  setupPasswordToggle(togglePassword, inputPassword);
  setupPasswordToggle(toggleConfirmPassword, inputConfirmPassword);

  function getPasswordErrors(password) {
    const errors = [];
    if (password.length < 12) {
      errors.push("minim 12 caractere");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("cel puțin o literă majusculă");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("cel puțin o literă minusculă");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("cel puțin o cifră");
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push("cel puțin un caracter special (ex: @, #, !, ?, etc.)");
    }
    return errors;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    errorDiv.style.display = "none";
    successDiv.style.display = "none";

    const password = inputPassword.value;
    const confirmPassword = inputConfirmPassword.value;

    if (password !== confirmPassword) {
      errorDiv.style.display = "block";
      errorDiv.innerHTML = "❌ Parolele nu coincid!";
      return;
    }

    const passwordErrors = getPasswordErrors(password);
    if (passwordErrors.length > 0) {
      errorDiv.style.display = "block";

      errorDiv.innerHTML = `❌ Parola nu este suficient de puternică. Trebuie să conțină:<br>
                <ul style="margin-top: 5px; margin-bottom: 0; padding-left: 20px; font-weight: normal; text-align: left;">
                    <li>${passwordErrors.join("</li><li>")}</li>
                </ul>`;
      return;
    }

    try {
      btnSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Se procesează...`;
      btnSubmit.disabled = true;

      const response = await fetchAPI(
        `/co-admin/reset-password/${resetToken}`,
        {
          method: "POST",
          credentials: "include",
          body: JSON.stringify({
            password: password,
            confirmPassword: confirmPassword,
          }),
        },
      );

      form.style.display = "none";
      successDiv.style.display = "block";
      successDiv.innerHTML =
        "✅ Parola a fost setată cu succes! Te redirecționăm către pagina de autentificare...";

      setTimeout(() => {
        window.location.href = "login-co-admin.html";
      }, 3000);
    } catch (error) {
      errorDiv.style.display = "block";
      errorDiv.innerHTML = `❌ Eroare: ${error.message}`;

      btnSubmit.innerHTML = "Salvează și Activează Contul";
      btnSubmit.disabled = false;
    }
  });
});
