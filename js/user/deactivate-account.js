document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("deactivate-account-form");
  const passwordInput = document.getElementById("deactivate-password");
  const reasonInput = document.getElementById("deactivate-reason");
  const durationInput = document.getElementById("deactivate-duration");
  const messageBox = document.getElementById("deactivate-message-box");
  const showPasswordsCheckbox = document.getElementById("show-passwords");

  if (form) {
    if (showPasswordsCheckbox) {
      showPasswordsCheckbox.addEventListener("change", function () {
        if (this.checked) {
          passwordInput.type = "text";
        } else {
          passwordInput.type = "password";
        }
      });
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const passwordValue = passwordInput.value;
      const reasonValue = reasonInput.value.trim();
      const durationValue = durationInput.value;

      if (!reasonValue) {
        messageBox.innerHTML =
          "<span class='text-error'>❌ Eroare: Motivul dezactivării este obligatoriu.</span>";
        return;
      }

      if (!passwordValue) {
        messageBox.innerHTML =
          "<span class='text-error'>❌ Eroare: Parola este necesară pentru a confirma acțiunea.</span>";
        return;
      }

      // Calculăm data de expirare (acum avem doar 1, 3 sau 6 luni)
      const monthsToAdd = parseInt(durationValue);
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + monthsToAdd);

      const untilValue = futureDate.toISOString().split("T")[0];
      const textDurataConfirmare = `pentru ${monthsToAdd} lun${monthsToAdd === 1 ? "ă" : "i"}`;

      const mesajConfirmare = `Ești sigur că vrei să dezactivezi contul ${textDurataConfirmare}? Vei pierde accesul IMEDIAT!`;
      const confirmare = confirm(mesajConfirmare);

      if (!confirmare) {
        return;
      }

      messageBox.innerHTML =
        "<span class='text-info'>Se procesează cererea...</span>";

      try {
        const response = await fetchAPI("/user/auto-deactivate-account", {
          method: "PATCH",
          credentials: "include",
          body: JSON.stringify({
            disabledUntil: untilValue,
            reason: reasonValue,
            loginPassword: passwordValue,
          }),
        });

        // Backend-ul returnează un mesaj de succes cu data exactă, îl putem afișa direct!
        messageBox.innerHTML = `<span class='text-success'>✅ ${response.message} Te deconectăm instant...</span>`;

        form.classList.add("d-none");

        setTimeout(() => {
          window.location.href = "login.html";
        }, 3000);
      } catch (error) {
        const errorMessage = error.message.toLowerCase();

        if (
          errorMessage.includes("jwt expired") ||
          errorMessage.includes("unauthorized") ||
          errorMessage.includes("token")
        ) {
          alert(
            "Sesiunea ta a expirat. Te rugăm să te conectezi din nou pentru a continua.",
          );
          window.location.href = "login.html";
          return;
        }

        messageBox.innerHTML = `<span class='text-error'>❌ Eroare: ${error.message}</span>`;
      }
    });
  }
});
