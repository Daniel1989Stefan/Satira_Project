document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetchAPI("/admin/current-user", {
      method: "POST",
      credentials: "include",
    });
    const role =
      res.data?.role || res.data?.user?.role || res.data?.admin?.role;

    if (role !== "admin") {
      alert("🔒 Acces interzis! Nu ai permisiunea de a crea conturi noi.");
      window.location.href = "manage-posts.html";
      return;
    }
  } catch (err) {
    window.location.href = "login-admin.html";
    return;
  }

  const form = document.getElementById("create-coadmin-form");
  const messageBox = document.getElementById("message-box");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullname = document.getElementById("fullname").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const confirmEmail = document
      .getElementById("confirmEmail")
      .value.trim()
      .toLowerCase();

    if (email !== confirmEmail) {
      messageBox.innerHTML =
        "<span class='text-error'>❌ Email-urile nu coincid! Verifică te rog.</span>";
      return;
    }

    messageBox.innerHTML =
      "<span class='text-info'>Se procesează cererea și se trimite emailul... ⏳</span>";

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const response = await fetchAPI("/admin/create-co-admin-account", {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          fullname: fullname,
          email: email,
          confirmEmail: confirmEmail,
        }),
      });

      messageBox.innerHTML = `<span class='text-success'>✅ Succes! Emailul de activare a fost trimis către ${fullname}.</span>`;

      form.reset();

      setTimeout(() => {
        window.location.href = "co-admins-list.html";
      }, 3000);
    } catch (error) {
      messageBox.innerHTML = `<span class='text-error'>❌ Eroare: ${error.message}</span>`;
    } finally {
      submitBtn.disabled = false;
    }
  });
});
