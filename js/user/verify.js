document.addEventListener("DOMContentLoaded", async () => {
  const messageBox = document.getElementById("verification-message");
  const actionButtons = document.getElementById("action-buttons");

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  if (!token) {
    messageBox.innerHTML =
      "<span class='text-error'>❌ Eroare: Link-ul este invalid sau incomplet!</span>";
    return;
  }

  try {
    const response = await fetchAPI(`/user/verify-email/${token}`, {
      method: "GET",
    });

    messageBox.innerHTML =
      "<span class='text-success'>✅ Email-ul tău a fost verificat cu succes! Contul este acum activ.</span>";

    actionButtons.classList.remove("d-none");
  } catch (error) {
    let errorText = error.message;

    if (
      errorText.toLowerCase().includes("invalid or expired") ||
      errorText.toLowerCase().includes("token")
    ) {
      errorText =
        "Acest link a expirat sau adresa de email a fost deja verificată.";
    }

    messageBox.innerHTML = `<span class='text-error'>ℹ️ ${errorText}</span>`;

    actionButtons.classList.remove("d-none");
  }
});
