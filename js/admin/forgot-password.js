document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-forgot-password");
  const statusMsg = document.getElementById("status-message");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    const email = document.getElementById("input-email").value.trim();

    try {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Se trimite...`;
      statusMsg.style.display = "none";

      await fetchAPI("/admin/admin-forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      statusMsg.style.display = "block";
      statusMsg.style.color = "#28a745";
      statusMsg.innerHTML =
        "✅ Dacă adresa există, vei primi un email în scurt timp.";
      form.reset();
    } catch (error) {
      statusMsg.style.display = "block";
      statusMsg.style.color = "#dc3545";
      statusMsg.innerHTML = `❌ Eroare: ${error.message}`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Trimite Link-ul`;
    }
  });
});
