document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-admin-form");
  const messageBox = document.getElementById("login-message-box");
  const passwordInput = document.getElementById("password");
  const showPasswordCheckbox = document.getElementById("show-password");
  const btnCheckDashboard = document.getElementById("btn-check-dashboard");

  const showMessage = (
    htmlContent,
    isErrorFallback = false,
    rawErrorMsg = "",
  ) => {
    if (messageBox) {
      messageBox.innerHTML = htmlContent;
    } else if (isErrorFallback) {
      alert("❌ Eroare: " + rawErrorMsg);
    } else {
      console.log("Status Login:", rawErrorMsg || "Se încarcă...");
    }
  };

  if (btnCheckDashboard) {
    btnCheckDashboard.addEventListener("click", async (e) => {
      e.preventDefault();

      try {
        await fetchAPI("/admin/current-user", { method: "GET" });

        window.location.href = "admin-dashboard.html";
      } catch (error) {
        alert(
          "❌ Nu ai o sesiune activă! Te rugăm să te autentifici folosind formularul de mai jos.",
        );
      }
    });
  }

  if (showPasswordCheckbox) {
    showPasswordCheckbox.addEventListener("change", (e) => {
      if (passwordInput) {
        passwordInput.type = e.target.checked ? "text" : "password";
      }
    });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      showMessage(
        "<span class='text-info'>Verificare credențiale... ⏳</span>",
      );

      const emailInput = document.getElementById("email");
      const email = emailInput ? emailInput.value.trim() : "";
      const password = passwordInput ? passwordInput.value : "";

      const recaptchaToken = grecaptcha.getResponse();

      if (!recaptchaToken) {
        messageBox.innerHTML =
          "<span class='text-error'>❌ Te rugăm să bifezi căsuța 'Nu sunt robot'!</span>";
        return;
      }

      try {
        const payload = {
          email: email,
          loginPassword: password,
          recaptchaToken,
        };

        const response = await fetchAPI("/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        if (response.data && response.data.mustChangePassword) {
          showMessage(
            "<span class='text-info'>⚠️ Securitate: Este necesară schimbarea parolei. Te redirecționăm...</span>",
          );

          setTimeout(() => {
            window.location.href = "change-password.html";
          }, 2500);
          return;
        }

        showMessage(
          "<span class='text-success'>✅ Autentificare reușită! Te redirecționăm...</span>",
        );

        localStorage.setItem("satira_role", "admin");

        setTimeout(() => {
          window.location.href = "admin-dashboard.html";
        }, 1500);
      } catch (error) {
        grecaptcha.reset();
        showMessage(
          `<span class='text-error'>❌ ${error.message}</span>`,
          true,
          error.message,
        );
      }
    });
  }
});
