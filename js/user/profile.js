document.addEventListener("DOMContentLoaded", async () => {
  const displayEmail = document.getElementById("display-email");
  const displayNickname =
    document.getElementById("display-nickname") ||
    document.getElementById("display-fullname");
  const badge = document.getElementById("verification-badge");
  const resendContainer = document.getElementById("resend-container");
  const resendBtn = document.getElementById("resend-btn");
  const resendMessage = document.getElementById("resend-message");
  const logoutBtn = document.getElementById("logout-btn");

  const changePasswordSection = document.getElementById(
    "change-password-section",
  );
  const changeEmailSection = document.getElementById("change-email-section");
  const authProviderBadge = document.getElementById("auth-provider-badge");

  try {
    const response = await fetchAPI("/user/current-user", {
      method: "POST",
      credentials: "include",
    });

    const user = response.data;
    const displayName = user.fullname || user.nickname || "Utilizator";
    if (displayNickname) displayNickname.innerText = displayName;

    const avatarLetterElement = document.getElementById("avatar-letter");
    if (avatarLetterElement) {
      avatarLetterElement.innerText = displayName.charAt(0).toUpperCase();
    }

    const memberSinceElement = document.getElementById("member-since");
    if (memberSinceElement) {
      if (user.createdAt) {
        const date = new Date(user.createdAt);
        const options = { year: "numeric", month: "short", day: "numeric" };
        memberSinceElement.innerText = `Membru din ${date.toLocaleDateString("ro-RO", options)}`;
      } else {
        memberSinceElement.innerText = `Membru al comunității`;
      }
    }

    if (displayEmail) {
      displayEmail.innerText = user.email;
    }

    if (displayEmail) displayEmail.value = user.email;
    if (displayNickname)
      displayNickname.value = user.fullname || user.nickname || "Fără nume";

    if (user.isEmailVerified) {
      if (badge) {
        badge.textContent = "✅ Verificat";
        badge.className = "badge badge-success";
      }
      if (resendContainer) resendContainer.classList.add("d-none");
    } else {
      if (badge) {
        badge.textContent = "⚠️ Neverificat";
        badge.className = "badge badge-warning";
      }
      if (resendContainer) resendContainer.classList.remove("d-none");
    }

    // ========================================================
    // LOGICA PENTRU CONTURILE GOOGLE
    // ========================================================
    if (user.authProvider === "google") {
      if (displayEmail) {
        displayEmail.readOnly = true;
        displayEmail.title =
          "Email-ul conectat prin Google nu poate fi modificat.";
        displayEmail.style.backgroundColor = "#f0f0f0";
        displayEmail.style.cursor = "not-allowed";
      }

      if (changePasswordSection) {
        changePasswordSection.style.display = "none";
      }

      if (changeEmailSection) {
        changeEmailSection.style.display = "none";
      }

      if (authProviderBadge) {
        authProviderBadge.innerHTML = "🔗 Conectat prin Google";
        authProviderBadge.className = "text-info font-bold text-sm mb-10";
      }
    }
  } catch (error) {
    console.error("Eroare la încărcarea profilului:", error);
    window.location.href = "login.html";
    return;
  }

  if (resendBtn) {
    resendBtn.addEventListener("click", async () => {
      if (resendMessage)
        resendMessage.innerHTML =
          "<span class='text-info'>Se trimite email-ul... ⏳</span>";

      try {
        await fetchAPI("/user/resend-email-verification", {
          method: "POST",
          credentials: "include",
        });

        if (resendMessage)
          resendMessage.innerHTML =
            "<span class='text-success'>✅ Link trimis! Verifică inbox-ul.</span>";
      } catch (error) {
        if (resendMessage)
          resendMessage.innerHTML = `<span class='text-error'>❌ Eroare: ${error.message}</span>`;
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await fetchAPI("/user/logout", {
          method: "POST",
          credentials: "include",
        });

        window.location.href = "login.html";
      } catch (error) {
        alert("Eroare la delogare. Încearcă din nou.");
      }
    });
  }
});
