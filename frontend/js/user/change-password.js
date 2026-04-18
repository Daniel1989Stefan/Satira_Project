document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("change-password-form");
  const oldPasswordInput = document.getElementById("old-password");
  const newPasswordInput = document.getElementById("new-password");
  const confirmNewPasswordInput = document.getElementById(
    "confirm-new-password",
  );
  const messageBox = document.getElementById("password-message-box");
  const showPasswordsCheckbox = document.getElementById("show-passwords");

  if (form) {
    if (showPasswordsCheckbox) {
      showPasswordsCheckbox.addEventListener("change", function () {
        const passField = document.getElementById("old-password");
        const newPassField = document.getElementById("new-password");
        const confirmPassField = document.getElementById(
          "confirm-new-password",
        );
        if (this.checked) {
          passField.type = "text";
          newPassField.type = "text";
          confirmPassField.type = "text";
        } else {
          passField.type = "password";
          newPassField.type = "password";
          confirmPassField.type = "password";
        }
      });
    }
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const oldPasswordValue = oldPasswordInput.value;
      const newPasswordValue = newPasswordInput.value;
      const confirmNewPasswordValue = confirmNewPasswordInput.value;

      if (newPasswordValue !== confirmNewPasswordValue) {
        messageBox.innerHTML =
          "<span class='text-error'>Eroare: Parolele noi nu se potrivesc!</span>";
        return;
      }

      if (newPasswordValue.length < 12) {
        messageBox.innerHTML =
          "<span class='text-error'>Eroare: Noua parolă trebuie să aibă minim 12 caractere.</span>";
        return;
      }

      let areLiteraMare = false;
      let areLiteraMica = false;
      let areCifra = false;
      let areCaracterSpecial = false;

      const caractereSpeciale = "!@#$%^&*()_+{}[]:;<>,.?~\\/-";

      for (let i = 0; i < newPasswordValue.length; i++) {
        const caracter = newPasswordValue[i];

        if (caracter >= "A" && caracter <= "Z") {
          areLiteraMare = true;
        } else if (caracter >= "a" && caracter <= "z") {
          areLiteraMica = true;
        } else if (caracter >= "0" && caracter <= "9") {
          areCifra = true;
        } else if (caractereSpeciale.includes(caracter)) {
          areCaracterSpecial = true;
        }
      }

      if (
        !areLiteraMare ||
        !areLiteraMica ||
        !areCifra ||
        !areCaracterSpecial
      ) {
        messageBox.innerHTML =
          "<span class='text-error>Eroare: Noua parolă trebuie să conțină litere mari, mici, cifre și caractere speciale (!@#).</span>";
        return;
      }

      messageBox.innerHTML =
        "<span class='text-info'>Se verifică și se salvează...</span>";

      try {
        const response = await fetchAPI("/user/change-password", {
          method: "PATCH",
          credentials: "include",
          body: JSON.stringify({
            oldPassword: oldPasswordValue, //
            newPassword: newPasswordValue,
            confirmPassword: confirmNewPasswordValue,
          }),
        });

        messageBox.innerHTML =
          "<span class='text-success'>✅ Parola a fost schimbată cu succes! Te rugăm să te reloghezi.</span>";

        oldPasswordInput.value = "";
        newPasswordInput.value = "";
        confirmNewPasswordInput.value = "";

        setTimeout(() => {
          window.location.href = "login.html";
        }, 3000);
      } catch (error) {
        messageBox.innerHTML = `<span class='text-error'>❌ Eroare: ${error.message}</span>`;
      }
    });
  }
});
