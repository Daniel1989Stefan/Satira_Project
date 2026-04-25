document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("form-login-coadmin");
  const messageBox = document.getElementById("login-message-box");

  if (!loginForm) {
    console.error(
      "🔴 EROARE CRITICĂ: Nu am găsit formularul cu ID-ul 'form-login-coadmin' în HTML!",
    );
    return;
  }

  const btnSubmit = loginForm.querySelector('button[type="submit"]');

  const togglePassword = document.getElementById("toggle-password");
  const passwordInput = document.getElementById("password");
  if (togglePassword && passwordInput) {
    togglePassword.addEventListener("click", function () {
      const type =
        passwordInput.getAttribute("type") === "password" ? "text" : "password";
      passwordInput.setAttribute("type", type);
      this.classList.toggle("fa-eye");
      this.classList.toggle("fa-eye-slash");
    });
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    messageBox.textContent = "";
    messageBox.style.display = "none";
    messageBox.className = "message-box mb-15";

    const email = document.getElementById("email").value.trim();
    const password = passwordInput.value;

    const recaptchaToken = grecaptcha.getResponse();

    if (!recaptchaToken) {
      messageBox.innerHTML =
        "<span class='text-error'>❌ Te rugăm să bifezi căsuța 'Nu sunt robot'!</span>";
      return;
    }

    try {
      btnSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Se autentifică...`;
      btnSubmit.disabled = true;

      const response = await fetchAPI("/co-admin/login", {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          email: email,
          loginPassword: password,
          recaptchaToken,
        }),
      });

      messageBox.textContent = "✅ Autentificare reușită! Redirecționare...";
      messageBox.style.backgroundColor = "#d4edda";
      messageBox.style.color = "#155724";
      messageBox.style.border = "1px solid #c3e6cb";
      messageBox.style.display = "block";

      localStorage.setItem("satira_role", "co-admin");

      setTimeout(() => {
        window.location.href = "co-admin-dashboard.html";
      }, 1500);
    } catch (error) {
      grecaptcha.reset();
      console.error("❌ Eroare la autentificare:", error);

      messageBox.textContent = `❌ ${error.message}`;
      messageBox.style.backgroundColor = "#f8d7da";
      messageBox.style.color = "#721c24";
      messageBox.style.border = "1px solid #f5c6cb";
      messageBox.style.display = "block";

      if (
        error.message.includes("activation account") ||
        error.message.includes("mustChangePassword")
      ) {
        messageBox.textContent +=
          " Contul necesită activare. Verifică-ți adresa de email.";
      }

      btnSubmit.innerHTML = "Intră în cont";
      btnSubmit.disabled = false;
    }
  });

  async function checkAuth() {
    try {
      await fetchAPI("/co-admin/current-user", {
        method: "POST",
        credentials: "include",
      });

      localStorage.setItem("satira_role", "co-admin");

      window.location.href = "co-admin-dashboard.html";
    } catch (error) {
      console.log("🔒 Nu ești logat, aștept datele de autentificare.");
    }
  }

  checkAuth();
});
