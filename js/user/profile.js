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

  const btnRequestData = document.getElementById("btn-request-data");
  const dataRequestStatus = document.getElementById("data-request-status");

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
        // În loc de .style.backgroundColor, poți face acest câmp disabled
        // ca să preia automat stilul implicit al browserului pt elemente inactive
        displayEmail.disabled = true;
        displayEmail.title =
          "Email-ul conectat prin Google nu poate fi modificat.";
      }

      if (changePasswordSection) {
        changePasswordSection.classList.add("d-none");
      }

      if (changeEmailSection) {
        changeEmailSection.classList.add("d-none");
      }

      if (authProviderBadge) {
        authProviderBadge.innerHTML = "🔗 Conectat prin Google";
        authProviderBadge.className = "auth-badge-info";
      }
    }

    // ========================================================
    // Verificăm dacă are deja o cerere GDPR în așteptare
    // ========================================================
    if (user.dataExportRequest?.isPending) {
      if (btnRequestData && dataRequestStatus) {
        btnRequestData.disabled = true; // :disabled face opacity 0.6 si cursor: not-allowed din CSS

        dataRequestStatus.classList.remove("d-none");
        dataRequestStatus.className = "status-message status-msg-info"; // Folosim CSS pt bg/border
        dataRequestStatus.innerHTML =
          "ℹ️ Ai o solicitare de export date în curs de procesare. Vei primi arhiva pe email în maxim 30 de zile.";
      }
    }
  } catch (error) {
    console.error("Eroare la încărcarea profilului:", error);
    window.location.href = "login.html";
    return;
  }

  // ========================================================
  // Eveniment Click pentru Solicitare Date GDPR
  // ========================================================
  if (btnRequestData) {
    btnRequestData.addEventListener("click", async () => {
      btnRequestData.disabled = true;
      btnRequestData.innerHTML = `<span><i class="fa-solid fa-spinner fa-spin"></i> Se trimite cererea...</span>`;

      dataRequestStatus.classList.remove("d-none");
      dataRequestStatus.className = "status-message"; // Resetam alte culori
      dataRequestStatus.innerHTML =
        "<span class='text-info'>Se procesează solicitarea... ⏳</span>";

      try {
        const response = await fetchAPI("/user/request-data-export", {
          method: "POST",
          credentials: "include",
        });

        // Succes
        btnRequestData.innerHTML = `<span>📥 Solicită Arhiva Datelor (GDPR)</span>`;
        // btnRequestData.disabled = true; raman activat de sus

        dataRequestStatus.className = "status-message status-msg-success";
        dataRequestStatus.innerHTML = `✅ ${response.message}`;
      } catch (error) {
        // Eroare
        btnRequestData.disabled = false;
        btnRequestData.innerHTML = `<span>📥 Solicită Arhiva Datelor (GDPR)</span>`;

        dataRequestStatus.className = "status-message status-msg-error";
        dataRequestStatus.innerHTML = `❌ ${error.message}`;
      }
    });
  }

  // ========================================================
  // Restul codului pentru resendBtn și logoutBtn
  // ========================================================
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
