document.addEventListener("DOMContentLoaded", async () => {
  const legalTitle = document.getElementById("legal-title");
  const legalBody = document.getElementById("legal-body");

  // 1. Citim ce document a fost cerut din URL
  const urlParams = new URLSearchParams(window.location.search);
  const docType = urlParams.get("doc");

  try {
    // 2. Apelăm endpoint-ul  public
    const response = await fetchAPI("/settings", {
      method: "GET",
    });

    if (response.success && response.data) {
      const settings = response.data;

      // 3. Alegem titlul și textul în funcție de parametrul din link
      switch (docType) {
        case "tc":
          document.title = "Termeni și Condiții | Ziarul cu Minciuni";
          legalTitle.innerText = "Termeni și Condiții";

          legalBody.textContent =
            settings.termsAndConditionsText ||
            "Textul pentru Termeni și Condiții nu a fost încă definit de administrator.";
          break;

        case "privacy":
          document.title = "Politica de Confidențialitate | Ziarul cu Minciuni";
          legalTitle.innerText = "Politica de Confidențialitate";
          legalBody.textContent =
            settings.privacyPolicyText ||
            "Textul pentru Politica de Confidențialitate nu a fost încă definit de administrator.";
          break;

        case "cookie":
          document.title = "Politica de Cookies | Ziarul cu Minciuni";
          legalTitle.innerText = "Politica de Cookies";
          legalBody.textContent =
            settings.cookiePolicyText ||
            "Textul pentru Politica de Cookies nu a fost încă definit de administrator.";
          break;

        default:
          legalTitle.innerText = "Document Negăsit";
          legalBody.innerHTML = `<span class="text-error">Te rugăm să folosești un link valid pentru a accesa documentele legale.</span>`;
          break;
      }
    } else {
      legalTitle.innerText = "Eroare";
      legalBody.innerHTML = `<span class="text-error">Nu s-au putut încărca documentele legale.</span>`;
    }
  } catch (error) {
    console.error("Eroare la preluarea setărilor legale:", error);
    legalTitle.innerText = "Eroare de conexiune";
    legalBody.innerHTML = `<span class="text-error">Eroare la comunicarea cu serverul. Te rugăm să revii mai târziu.</span>`;
  }
});
