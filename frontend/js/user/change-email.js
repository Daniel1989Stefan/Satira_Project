document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("change-email-form");
  const emailInput = document.getElementById("new-email");
  const passwordInput = document.getElementById("current-password-email");
  const messageBox = document.getElementById("email-message-box");

  if (form) {
    const showPasswordsCheckbox = document.getElementById("show-passwords");
    if (showPasswordsCheckbox) {
      showPasswordsCheckbox.addEventListener("change", function () {
        const passField = document.getElementById("current-password-email");
        if (this.checked) {
          passField.type = "text";
        } else {
          passField.type = "password";
        }
      });
    }
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const newEmailValue = emailInput.value.trim();
      const currentPasswordValue = passwordInput.value;

      messageBox.innerHTML =
        "<span class='text-info'>Se procesează cererea...</span>";

      try {
        const response = await fetchAPI("/user/update-email", {
          method: "PATCH",
          credentials: "include",
          body: JSON.stringify({
            newEmail: newEmailValue,
            loginPassword: currentPasswordValue,
          }),
        });

        messageBox.innerHTML =
          "<span class='text-success'>✅ Email-ul a fost actualizat! Te rugăm să îți verifici noul inbox.</span>";

        emailInput.value = "";
        passwordInput.value = "";

        setTimeout(() => {
          window.location.href = "profile.html";
        }, 3000);
      } catch (error) {
        messageBox.innerHTML = `<span class='text-error'>❌ Eroare: ${error.message}</span>`;
      }
    });
  }
});
