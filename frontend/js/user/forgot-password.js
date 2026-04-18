document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("forgot-password-form");
  const emailInput = document.getElementById("forgot-email");
  const messageBox = document.getElementById("forgot-message-box");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const emailValue = emailInput.value.trim();

      messageBox.innerHTML = `<span class='text-info'>Se procesează cererea...</span>`;

      try {
        await fetchAPI("/user/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email: emailValue }),
        });

        messageBox.innerHTML = `<span class='text-success'>✅ Dacă email-ul există, vei primi un link de resetare în curând!</span>`;
        emailInput.value = "";
      } catch (error) {
        messageBox.innerHTML = `<span class='text-error'>❌ Eroare: ${error.message}</span>`;
      }
    });
  }
});
