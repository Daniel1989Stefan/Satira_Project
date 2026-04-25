document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // LOGICA PENTRU LOGIN (EMAIL + PASSWORD)
  // ==========================================
  const loginForm = document.getElementById("login-form");

  if (loginForm) {
    const toggleIcon = document.getElementById("toggle-password-icon");
    const passField = document.getElementById("password");
    const messageBox = document.getElementById("login-message-box");

    if (toggleIcon && passField) {
      toggleIcon.addEventListener("click", function () {
        if (passField.type === "password") {
          passField.type = "text";
          this.classList.replace("fa-eye", "fa-eye-slash");
          if (typeof confirmPassField !== "undefined" && confirmPassField)
            confirmPassField.type = "text";
        } else {
          passField.type = "password";
          this.classList.replace("fa-eye-slash", "fa-eye");
          if (typeof confirmPassField !== "undefined" && confirmPassField)
            confirmPassField.type = "password";
        }
      });
    }

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("email").value.trim();
      const loginPassword = passField.value;

      const recaptchaToken = grecaptcha.getResponse();

      if (!recaptchaToken) {
        messageBox.innerHTML =
          "<span class='text-error'>❌ Te rugăm să bifezi căsuța 'Nu sunt robot'!</span>";
        return;
      }

      messageBox.innerHTML =
        "<span class='text-info'>Se verifică datele... ⏳</span>";

      try {
        const response = await fetchAPI("/user/login", {
          method: "POST",
          credentials: "include",
          body: JSON.stringify({ email, loginPassword, recaptchaToken }),
        });

        messageBox.innerHTML =
          "<span class='text-success'>✅ Logare reușită! Te redirecționăm...</span>";

        setTimeout(() => {
          const redirectUrl =
            localStorage.getItem("returnUrl") || "../../index.html";
          localStorage.removeItem("returnUrl");
          window.location.href = redirectUrl;
        }, 1500);
      } catch (error) {
        grecaptcha.reset();
        messageBox.innerHTML = `<span class='text-error'>❌ Eroare: ${error.message}</span>`;
      }
    });
  }

  // ==========================================
  //  LOGICA PENTRU REGISTER (EMAIL + PASSWORD)
  // ==========================================
  const registerForm = document.getElementById("register-form");
  const agreeTermsCheckbox = document.getElementById("agree-terms");
  const termsContainer = document.getElementById("terms-container");

  if (registerForm) {
    const passField = document.getElementById("password");
    const confirmPassField = document.getElementById("confirmPassword");
    const toggleBothPasswords = document.getElementById(
      "toggle-both-passwords",
    );
    const messageBox = document.getElementById("register-message-box");

    // Logica NOUĂ pentru afișarea ambelor parole folosind Checkbox-ul
    if (toggleBothPasswords && passField && confirmPassField) {
      toggleBothPasswords.addEventListener("change", function () {
        const inputType = this.checked ? "text" : "password";
        passField.type = inputType;
        confirmPassField.type = inputType;
      });
    }

    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Verificare Checkbox T&C
      if (!agreeTermsCheckbox.checked) {
        messageBox.innerHTML =
          "<span class='text-error'>❌ Trebuie să accepți Termenii și Condițiile pentru a continua.</span>";

        // Adăugăm clasa CSS pentru a evidenția eroarea
        if (termsContainer) {
          termsContainer.classList.add("terms-error-highlight");
          setTimeout(() => {
            termsContainer.classList.remove("terms-error-highlight");
          }, 2000);
        }
        return;
      }

      const nickname = document.getElementById("nickname").value.trim();
      const email = document.getElementById("email").value.trim();
      const loginPassword = passField.value;
      const confirmPassword = confirmPassField.value;

      if (loginPassword !== confirmPassword) {
        messageBox.innerHTML =
          "<span class='text-error'>❌ Eroare: Parolele nu se potrivesc!</span>";
        return;
      }

      if (loginPassword.length < 12) {
        messageBox.innerHTML =
          "<span class='text-error'>❌ Eroare: Parola trebuie să aibă minim 12 caractere.</span>";
        return;
      }

      let areLiteraMare = false;
      let areLiteraMica = false;
      let areCifra = false;
      let areCaracterSpecial = false;
      const caractereSpeciale = "!@#$%^&*()_+{}[]:;<>,.?~\\/-";

      for (let i = 0; i < loginPassword.length; i++) {
        const char = loginPassword[i];
        if (char >= "A" && char <= "Z") areLiteraMare = true;
        else if (char >= "a" && char <= "z") areLiteraMica = true;
        else if (char >= "0" && char <= "9") areCifra = true;
        else if (caractereSpeciale.includes(char)) areCaracterSpecial = true;
      }

      if (
        !areLiteraMare ||
        !areLiteraMica ||
        !areCifra ||
        !areCaracterSpecial
      ) {
        messageBox.innerHTML =
          "<span class='text-error'>❌ Eroare: Parola trebuie să conțină litere mari, mici, cifre și caractere speciale (!@#).</span>";
        return;
      }

      messageBox.innerHTML =
        "<span class='text-info'>Se creează contul... ⏳</span>";

      const payload = {
        email: email,
        password: loginPassword,
        confirmPassword: confirmPassword,
      };

      if (nickname !== "") {
        payload.nickname = nickname;
      }

      try {
        const response = await fetchAPI("/user/register", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        messageBox.innerHTML =
          "<span class='text-success'>✅ Cont creat cu succes! Te poți loga acum.</span>";

        setTimeout(() => {
          window.location.href = "login.html";
        }, 2000);
      } catch (error) {
        messageBox.innerHTML = `<span class='text-error'>❌ Eroare: ${error.message}</span>`;
      }
    });
  }

  // ==========================================
  // 3. LOGICA PENTRU LOGIN PRIN GOOGLE
  // ==========================================
  const googleMessageBox =
    document.getElementById("login-message-box") ||
    document.getElementById("register-message-box");
  const clientIdElement = document.getElementById("g-client-id");

  if (clientIdElement && googleMessageBox) {
    const clientId = clientIdElement.value;

    window.handleGoogleResponse = async (response) => {
      googleMessageBox.innerHTML =
        "<span class='text-info'>Se procesează conectarea cu Google... ⏳</span>";

      // IMPORTANT: Determinăm dacă suntem pe pagina de Register sau Login
      // Asta îi va spune backend-ului dacă are voie să creeze un cont nou sau nu.
      const currentIntent = registerForm ? "register" : "login";

      try {
        const apiResponse = await fetchAPI("/user/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            credential: response.credential,
            intent: currentIntent, // <-- TRIMITEM INTENȚIA AICI
          }),
        });

        googleMessageBox.innerHTML =
          "<span class='text-success'>✅ Te-ai autentificat cu succes!</span>";

        setTimeout(() => {
          const redirectUrl =
            localStorage.getItem("returnUrl") || "../../index.html";
          localStorage.removeItem("returnUrl");
          window.location.href = redirectUrl;
        }, 1500);
      } catch (error) {
        googleMessageBox.innerHTML = `<span class='text-error'>❌ Eroare: ${error.message}</span>`;
      }
    };

    const initGoogleButton = () => {
      if (window.google && window.google.accounts) {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleResponse,
        });

        const googleBtnContainer = document.getElementById(
          "google-btn-container",
        );
        google.accounts.id.renderButton(googleBtnContainer, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          width: 300,
        });

        // Dacă suntem pe pagina de Register, aplicăm masca pentru T&C
        if (registerForm && agreeTermsCheckbox) {
          googleBtnContainer.classList.add("position-relative");

          const overlay = document.createElement("div");
          overlay.classList.add("google-btn-overlay");
          googleBtnContainer.appendChild(overlay);

          overlay.addEventListener("click", (e) => {
            if (!agreeTermsCheckbox.checked) {
              e.stopPropagation();
              googleMessageBox.innerHTML =
                "<span class='text-error'>❌ Trebuie să accepți Termenii și Condițiile înainte de a continua cu Google.</span>";

              if (termsContainer) {
                termsContainer.classList.add("terms-error-highlight");
                setTimeout(() => {
                  termsContainer.classList.remove("terms-error-highlight");
                }, 2000);
              }
            } else {
              overlay.classList.add("d-none");

              const realButton =
                googleBtnContainer.querySelector('div[role="button"]');
              if (realButton) realButton.click();

              setTimeout(() => {
                overlay.classList.remove("d-none");
              }, 500);
            }
          });

          agreeTermsCheckbox.addEventListener("change", () => {
            if (agreeTermsCheckbox.checked) {
              overlay.classList.add("d-none");
            } else {
              overlay.classList.remove("d-none");
            }
          });
        }
      } else {
        console.error("Scriptul Google nu s-a încărcat la timp.");
      }
    };

    if (document.readyState === "complete") {
      initGoogleButton();
    } else {
      window.addEventListener("load", initGoogleButton);
    }
  }
});
