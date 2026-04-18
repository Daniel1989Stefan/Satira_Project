document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("change-nickname-form");
  const nicknameInput = document.getElementById("new-nickname");
  const passwordInput = document.getElementById("current-password");
  const passwordSection = document.getElementById(
    "password-confirmation-section",
  );
  const messageBox = document.getElementById("nickname-message-box");
  const showPasswordsCheckbox = document.getElementById("show-passwords");

  let isGoogleUser = false;

  try {
    const response = await fetchAPI("/user/current-user", {
      method: "POST",
      credentials: "include",
    });

    if (response.data.authProvider === "google") {
      isGoogleUser = true;

      if (passwordSection) {
        passwordSection.style.display = "none";
      }

      if (passwordInput) {
        passwordInput.removeAttribute("required");
      }
    }
  } catch (error) {
    console.error("Eroare la verificarea userului:", error);
  }

  if (form) {
    if (showPasswordsCheckbox) {
      showPasswordsCheckbox.addEventListener("change", function () {
        passwordInput.type = this.checked ? "text" : "password";
      });
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const newNicknameValue = nicknameInput.value.trim();

      const currentPasswordValue = passwordInput ? passwordInput.value : "";

      if (newNicknameValue.length < 3) {
        messageBox.innerHTML =
          "<span class='text-error'>Nickname-ul trebuie să aibă minim 3 caractere.</span>";
        return;
      }

      messageBox.innerHTML =
        "<span class='text-info'>Se actualizează... ⏳</span>";

      try {
        const response = await fetchAPI("/user/change-nickname", {
          method: "PATCH",
          credentials: "include",
          body: JSON.stringify({
            newNickname: newNicknameValue,
            loginPassword: currentPasswordValue,
          }),
        });

        messageBox.innerHTML =
          "<span class='text-success'>✅ Nickname-ul a fost actualizat cu succes!</span>";

        nicknameInput.value = "";
        if (passwordInput) passwordInput.value = "";

        setTimeout(() => {
          window.location.href = "profile.html";
        }, 2000);
      } catch (error) {
        messageBox.innerHTML = `<span class='text-error'>❌ Eroare: ${error.message}</span>`;
      }
    });
  }
});
