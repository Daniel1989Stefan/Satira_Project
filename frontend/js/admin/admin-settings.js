document.addEventListener("DOMContentLoaded", () => {
  const btn30 = document.getElementById("btn-stats-30");
  const btn365 = document.getElementById("btn-stats-365");
  const statUnique = document.getElementById("stat-unique");
  const statViews = document.getElementById("stat-views");
  const statRefusals = document.getElementById("stat-refusals");
  const analyticsStatus = document.getElementById("analytics-status-msg");

  const loadAnalytics = async (days) => {
    try {
      analyticsStatus.innerText = "Se încarcă datele...";

      const response = await fetchAPI(`/admin/analytics?days=${days}`, {
        method: "GET",
      });

      if (response.success) {
        statUnique.innerText = response.stats.totalUniqueVisitors;
        statViews.innerText = response.stats.totalPageViews;
        statRefusals.innerText = response.stats.totalRefusals;

        analyticsStatus.innerText = `Arată statisticile pentru perioada: ${response.startDate} până la ${response.endDate}`;
      }
    } catch (error) {
      console.error("Eroare Analytics:", error);
      analyticsStatus.innerText = "❌ Nu s-au putut încărca statisticile.";
      analyticsStatus.style.color = "red";
    }
  };

  if (btn30 && btn365) {
    btn30.addEventListener("click", () => {
      btn30.style.backgroundColor = "var(--text-main)";
      btn30.style.color = "var(--bg-card)";
      btn30.style.border = "none";

      btn365.style.backgroundColor = "transparent";
      btn365.style.color = "var(--text-main)";
      btn365.style.border = "1px solid var(--text-main)";

      loadAnalytics(30);
    });

    btn365.addEventListener("click", () => {
      btn365.style.backgroundColor = "var(--text-main)";
      btn365.style.color = "var(--bg-card)";
      btn365.style.border = "none";

      btn30.style.backgroundColor = "transparent";
      btn30.style.color = "var(--text-main)";
      btn30.style.border = "1px solid var(--text-main)";

      loadAnalytics(365);
    });
  }

  loadAnalytics(30);

  const viewSection = document.getElementById("view-settings-section");
  const editSection = document.getElementById("edit-settings-section");
  const btnEdit = document.getElementById("btn-edit-settings");
  const btnCancel = document.getElementById("btn-cancel-edit");
  const settingsForm = document.getElementById("site-settings-form");
  const statusMsg = document.getElementById("settings-status-msg");

  if (!settingsForm || !viewSection) return;

  const viewCookie = document.getElementById("view-cookie-text");
  const viewDisclaimer = document.getElementById("view-disclaimer-text");
  const viewEmail = document.getElementById("view-contact-email");
  const viewPhone = document.getElementById("view-contact-phone");
  const viewWebsite = document.getElementById("view-contact-website");

  const viewSupportTitle = document.getElementById("view-support-title");
  const viewSupportDesc = document.getElementById("view-support-desc");
  const viewCopyright = document.getElementById("view-copyright-text");

  const cookieInput = document.getElementById("settings-cookie-text");
  const disclaimerInput = document.getElementById("settings-disclaimer-text");
  const emailInput = document.getElementById("settings-contact-email");
  const phoneInput = document.getElementById("settings-contact-phone");
  const websiteInput = document.getElementById("settings-contact-website");

  const supportTitleInput = document.getElementById("settings-support-title");
  const supportDescInput = document.getElementById("settings-support-desc");
  const copyrightInput = document.getElementById("settings-copyright-text");

  let currentSettingsData = null;

  const populateData = (data) => {
    viewCookie.innerText = data.cookieText || "-";
    viewDisclaimer.innerText = data.disclaimerText || "-";
    viewEmail.innerText = data.contact?.email || "-";
    viewPhone.innerText = data.contact?.phone || "- Necompletat -";
    viewWebsite.innerText = data.contact?.website || "- Necompletat -";

    if (viewSupportTitle) viewSupportTitle.innerText = data.supportTitle || "-";
    if (viewSupportDesc)
      viewSupportDesc.innerText = data.supportDescription || "-";
    if (viewCopyright) viewCopyright.innerText = data.copyrightText || "-";

    cookieInput.value = data.cookieText || "";
    disclaimerInput.value = data.disclaimerText || "";
    emailInput.value = data.contact?.email || "";
    phoneInput.value = data.contact?.phone || "";
    websiteInput.value = data.contact?.website || "";

    if (supportTitleInput) supportTitleInput.value = data.supportTitle || "";
    if (supportDescInput)
      supportDescInput.value = data.supportDescription || "";
    if (copyrightInput) copyrightInput.value = data.copyrightText || "";
  };

  btnEdit.addEventListener("click", () => {
    viewSection.style.display = "none";
    editSection.style.display = "block";
  });

  btnCancel.addEventListener("click", () => {
    if (currentSettingsData) populateData(currentSettingsData);
    editSection.style.display = "none";
    viewSection.style.display = "block";
    statusMsg.innerText = "";
  });

  const loadCurrentSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/settings`);
      const result = await response.json();

      if (result.success && result.data) {
        currentSettingsData = result.data;
        populateData(currentSettingsData);
      }
    } catch (error) {
      console.error("Eroare la preluarea setărilor:", error);
      viewCookie.innerText = "❌ Eroare la conectarea cu serverul.";
      viewCookie.style.color = "red";
    }
  };

  settingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const btnSave = document.getElementById("btn-save-settings");
    btnSave.disabled = true;
    btnSave.innerText = "⏳ Se salvează...";
    statusMsg.innerText = "";

    const newSettings = {
      cookieText: cookieInput.value,
      disclaimerText: disclaimerInput.value,
      supportTitle: supportTitleInput ? supportTitleInput.value : "",
      supportDescription: supportDescInput ? supportDescInput.value : "",
      copyrightText: copyrightInput ? copyrightInput.value : "",
      contact: {
        email: emailInput.value,
        phone: phoneInput.value,
        website: websiteInput.value,
      },
    };

    try {
      const data = await fetchAPI("/admin/update-settings", {
        method: "PATCH",
        body: JSON.stringify(newSettings),
      });

      if (data.success) {
        currentSettingsData = newSettings;
        populateData(currentSettingsData);

        statusMsg.innerText = "✅ Setările au fost salvate cu succes!";
        statusMsg.style.color = "green";

        setTimeout(() => {
          editSection.style.display = "none";
          viewSection.style.display = "block";
          statusMsg.innerText = "";
        }, 1500);
      }
    } catch (error) {
      console.error("Eroare la salvare:", error);
      statusMsg.innerText = `❌ ${error.message || "Eroare la salvare. Verifică permisiunile."}`;
      statusMsg.style.color = "red";
    } finally {
      btnSave.disabled = false;
      btnSave.innerText = "💾 Salvează Setările";
    }
  });

  loadCurrentSettings();
});
