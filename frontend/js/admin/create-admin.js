document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("create-admin-form");
  const messageBox = document.getElementById("admin-message-box");

  const showPasswordCheckbox = document.getElementById("show-password");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");

  showPasswordCheckbox.addEventListener("change", (e) => {
    const type = e.target.checked ? "text" : "password";
    passwordInput.type = type;
    confirmPasswordInput.type = type;
  });

  function isPasswordStrong(password) {
    if (password.length < 12) return false;

    let hasUpperCase = false;
    let hasLowerCase = false;
    let hasNumber = false;
    let hasSpecialChar = false;

    for (let i = 0; i < password.length; i++) {
      let char = password[i];

      if (char >= "A" && char <= "Z") {
        hasUpperCase = true;
      } else if (char >= "a" && char <= "z") {
        hasLowerCase = true;
      } else if (char >= "0" && char <= "9") {
        hasNumber = true;
      } else {
        hasSpecialChar = true;
      }
    }

    return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    messageBox.innerHTML =
      "<span class='text-info'>Se procesează datele... ⏳</span>";

    const fullname = document.getElementById("fullname").value.trim();
    const email = document.getElementById("email").value.trim();
    const confirmEmail = document.getElementById("confirmEmail").value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const activationCode = document
      .getElementById("activationCode")
      .value.trim();

    if (email.toLowerCase() !== confirmEmail.toLowerCase()) {
      messageBox.innerHTML =
        "<span class='text-error'>❌ Eroare: Adresele de email nu coincid!</span>";
      return;
    }

    if (password !== confirmPassword) {
      messageBox.innerHTML =
        "<span class='text-error'>❌ Eroare: Parolele nu coincid!</span>";
      return;
    }

    if (!isPasswordStrong(password)) {
      messageBox.innerHTML =
        "<span class='text-error'>❌ Eroare: Parola trebuie să aibă minim 12 caractere și să conțină cel puțin o literă mare, o literă mică, o cifră și un caracter special!</span>";
      return;
    }

    const payload = {
      fullname,
      email,
      confirmEmail,
      password,
      confirmPassword,
      activationCode,
    };

    try {
      const response = await fetchAPI("/admin/create-admin-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      messageBox.innerHTML =
        "<span class='text-success'>✅ Contul de Admin a fost creat cu succes! Te poți autentifica acum.</span>";

      form.reset();
      passwordInput.type = "password";
      confirmPasswordInput.type = "password";

      setTimeout(() => {
        window.location.href = "login-admin.html";
      }, 2000);
    } catch (error) {
      messageBox.innerHTML = `<span class='text-error'>❌ Eroare: ${error.message}</span>`;
    }
  });
});
