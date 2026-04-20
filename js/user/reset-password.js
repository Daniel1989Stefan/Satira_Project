document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("reset-password-form");
  const newPasswordInput = document.getElementById("new-password");
  const confirmNewPasswordInput = document.getElementById(
    "confirm-new-password",
  );
  const messageBox = document.getElementById("reset-message-box");
  const showPasswordsCheckbox = document.getElementById("show-passwords");
  const loginButtonContainer = document.getElementById(
    "login-button-container",
  );

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  if (!token) {
    messageBox.innerHTML = `<span class='text-error'>❌ Eroare: Link-ul de resetare este invalid sau lipsește!</span>`;
    if (form) form.classList.add("d-none");
    return;
  }

  if (form) {
    if (showPasswordsCheckbox) {
      showPasswordsCheckbox.addEventListener("change", function () {
        if (this.checked) {
          newPasswordInput.type = "text";
          confirmNewPasswordInput.type = "text";
        } else {
          newPasswordInput.type = "password";
          confirmNewPasswordInput.type = "password";
        }
      });
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const newPasswordValue = newPasswordInput.value;
      const confirmNewPasswordValue = confirmNewPasswordInput.value;

      if (newPasswordValue !== confirmNewPasswordValue) {
        messageBox.innerHTML = `<span class='text-error'>Eroare: Parolele nu se potrivesc!</span>`;
        return;
      }

      if (newPasswordValue.length < 12) {
        messageBox.innerHTML = `<span class='text-error'>Eroare: Parola trebuie să aibă minim 12 caractere.</span>`;
        return;
      }

      const caractereSpeciale = "!@#$%^&*()_+{}[]:;<>,.?~\\/-";
      let [areLiteraMare, areLiteraMica, areCifra, areCaracterSpecial] = [
        false,
        false,
        false,
        false,
      ];

      for (let char of newPasswordValue) {
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
        messageBox.innerHTML = `<span class='text-error'>Eroare: Parola trebuie să conțină litere mari, mici, cifre și caractere speciale (!@#).</span>`;
        return;
      }

      messageBox.innerHTML = `<span class='text-info'>Se resetează parola...</span>`;

      try {
        await fetchAPI(`/user/reset-password/${token}`, {
          method: "POST",
          body: JSON.stringify({
            newPassword: newPasswordValue,
            confirmPassword: confirmNewPasswordValue,
          }),
        });

        messageBox.innerHTML = `<span class='text-success'>✅ Parola a fost resetată cu succes!</span>`;

        form.classList.add("d-none");
        loginButtonContainer.classList.remove("d-none");
      } catch (error) {
        messageBox.innerHTML = `<span class='text-error'>❌ Eroare: ${error.message}</span>`;
      }
    });
  }
});
