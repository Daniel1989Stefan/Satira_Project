document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("delete-account-form");
  const passwordInput = document.getElementById("delete-password");
  const messageBox = document.getElementById("delete-message-box");
  const showPasswordsCheckbox = document.getElementById("show-passwords");

  if (form) {
    if (showPasswordsCheckbox) {
      showPasswordsCheckbox.addEventListener("change", function () {
        passwordInput.type = this.checked ? "text" : "password";
      });
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const passwordValue = passwordInput.value;

      if (!passwordValue) {
        messageBox.innerHTML =
          "<span class='text-error'>❌ Eroare: Parola este necesară.</span>";
        return;
      }

      const mesajConfirmare =
        "Atenție! Contul tău va fi programat pentru ștergere definitivă în 30 de zile, conform legii GDPR. Pierzi accesul imediat. Ești sigur că vrei să continui?";
      const confirmare = confirm(mesajConfirmare);

      if (!confirmare) {
        return;
      }

      messageBox.innerHTML =
        "<span class='text-info'>Se procesează cererea...</span>";

      try {
        const response = await fetchAPI("/user/request-account-deletion", {
          method: "PATCH",
          credentials: "include",
          body: JSON.stringify({
            loginPassword: passwordValue,
          }),
        });

        // Afișăm mesajul frumos generat de backend cu data limită
        messageBox.innerHTML = `<span class='text-success'>✅ ${response.message} Te deconectăm...</span>`;

        form.classList.add("d-none"); // Ascundem formularul să nu mai dea click

        setTimeout(() => {
          window.location.href = "login.html";
        }, 4000); // Lăsăm 4 secunde ca userul să poată citi data la care i se va șterge contul
      } catch (error) {
        messageBox.innerHTML = `<span class='text-error'>❌ Eroare: ${error.message}</span>`;
      }
    });
  }
});
