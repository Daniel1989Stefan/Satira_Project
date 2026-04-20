document.addEventListener("DOMContentLoaded", () => {
  const themeToggleBtn = document.getElementById("theme-toggle");
  const body = document.body;

  const savedTheme = localStorage.getItem("site-theme");

  if (savedTheme === "dark") {
    body.setAttribute("data-theme", "dark");
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      if (body.getAttribute("data-theme") === "dark") {
        body.removeAttribute("data-theme");
        localStorage.setItem("site-theme", "light");
      } else {
        body.setAttribute("data-theme", "dark");
        localStorage.setItem("site-theme", "dark");
      }
    });
  }

  const hamburgerBtn = document.getElementById("hamburger-btn");
  const closeSidebarBtn = document.getElementById("close-sidebar-btn");
  const sidebarMenu = document.getElementById("sidebar-menu");
  const sidebarOverlay = document.getElementById("sidebar-overlay");

  function toggleSidebar() {
    sidebarMenu.classList.toggle("active");
    sidebarOverlay.classList.toggle("active");
  }

  if (hamburgerBtn) hamburgerBtn.addEventListener("click", toggleSidebar);
  if (closeSidebarBtn) closeSidebarBtn.addEventListener("click", toggleSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener("click", toggleSidebar);

  const pcCategoriesList = document.getElementById("pc-categories-list");
  const scrollLeftBtn = document.getElementById("scroll-left");
  const scrollRightBtn = document.getElementById("scroll-right");

  function checkScrollButtons() {
    if (!pcCategoriesList) return;

    if (pcCategoriesList.scrollWidth > pcCategoriesList.clientWidth) {
      if (pcCategoriesList.scrollLeft > 0) {
        scrollLeftBtn.style.display = "block";
      } else {
        scrollLeftBtn.style.display = "none";
      }

      if (
        pcCategoriesList.scrollLeft <
        pcCategoriesList.scrollWidth - pcCategoriesList.clientWidth - 1
      ) {
        scrollRightBtn.style.display = "block";
      } else {
        scrollRightBtn.style.display = "none";
      }
    } else {
      if (scrollLeftBtn) scrollLeftBtn.style.display = "none";
      if (scrollRightBtn) scrollRightBtn.style.display = "none";
    }
  }

  if (scrollLeftBtn) {
    scrollLeftBtn.addEventListener("click", () => {
      pcCategoriesList.scrollBy({ left: -200, behavior: "smooth" });
    });
  }

  if (scrollRightBtn) {
    scrollRightBtn.addEventListener("click", () => {
      pcCategoriesList.scrollBy({ left: 200, behavior: "smooth" });
    });
  }

  if (pcCategoriesList) {
    pcCategoriesList.addEventListener("scroll", checkScrollButtons);
    window.addEventListener("resize", checkScrollButtons);
    setTimeout(checkScrollButtons, 100);
  }

  const toggleCategoriesBtn = document.getElementById("toggle-categories-btn");
  const categoriesListContainer = document.getElementById(
    "sidebar-categories-list",
  );
  const toggleIconSidebar = document.getElementById("toggle-icon");

  if (toggleCategoriesBtn && categoriesListContainer && toggleIconSidebar) {
    toggleCategoriesBtn.addEventListener("click", () => {
      categoriesListContainer.classList.toggle("d-none");
      toggleIconSidebar.classList.toggle("closed");
    });
  }
});

// ==========================================
// POPULARE MENIU (SIDEBAR & NAVBAR BOTTOM)
// ==========================================
async function loadCategoriesIntoMenu() {
  const sidebarList = document.getElementById("sidebar-categories-list");
  const pcList = document.getElementById("pc-categories-list");

  if (!sidebarList && !pcList) return;

  try {
    const response = await fetchAPI("/user/post-categories", { method: "GET" });
    const categories = response.data.categories;

    if (sidebarList) sidebarList.innerHTML = "";

    const isSubPage = window.location.pathname.includes("/pages/");
    const basePath = isSubPage ? "../../index.html" : "index.html";

    if (categories && categories.length > 0) {
      categories.sort().forEach((cat) => {
        const displayCategory = cat.charAt(0).toUpperCase() + cat.slice(1);

        if (sidebarList) {
          const linkMobile = document.createElement("a");
          linkMobile.href = `${basePath}?category=${cat}`;
          linkMobile.className = "sidebar-subitem";
          linkMobile.innerText = displayCategory;
          sidebarList.appendChild(linkMobile);
        }

        if (pcList) {
          const linkPC = document.createElement("a");
          linkPC.href = `${basePath}?category=${cat}`;
          linkPC.className = "nav-category-link";
          linkPC.innerText = displayCategory;
          pcList.appendChild(linkPC);
        }
      });
    }
  } catch (error) {
    console.error("Eroare la încărcarea categoriilor în meniu:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadCategoriesIntoMenu();
});

// ==========================================
// SETĂRI GLOBALE, ANALYTICS & COOKIE BANNER
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
  // PRELUAREA SETĂRILOR GLOBALE
  let globalSettings = {
    cookieText:
      "Respectăm intimitatea ta! Folosim un sistem propriu de statistici...",
    disclaimerText: "Acesta este un proiect de satiră.",
    contact: { email: "stefan.danca.dev@gmail.com", phone: "", website: "" },
  };

  try {
    const response = await fetch(`${API_BASE_URL}/settings`);
    const result = await response.json();
    if (result.success && result.data) {
      globalSettings = result.data;
    }
  } catch (error) {
    console.error(
      "Eroare la încărcarea setărilor globale, folosim fallback:",
      error,
    );
  }

  // POPULAREA FOOTER-ULUI
  const disclaimerEl = document.getElementById("footer-disclaimer-text");
  const contactContainer = document.getElementById("footer-contact-container");
  const supportTitleEl = document.getElementById("footer-support-title");
  const supportDescEl = document.getElementById("footer-support-desc");
  const copyrightEl = document.getElementById("footer-copyright-text");

  if (supportTitleEl) supportTitleEl.innerText = globalSettings.supportTitle;
  if (supportDescEl)
    supportDescEl.innerText = globalSettings.supportDescription;
  if (copyrightEl) copyrightEl.innerHTML = globalSettings.copyrightText;

  if (disclaimerEl) {
    disclaimerEl.innerText = globalSettings.disclaimerText;
  }

  if (contactContainer) {
    let contactHTML = `<p>Email: <a href="mailto:${globalSettings.contact.email}" style="color: inherit;">${globalSettings.contact.email}</a></p>`;

    if (
      globalSettings.contact.phone &&
      globalSettings.contact.phone.trim() !== ""
    ) {
      contactHTML += `<p>Telefon: ${globalSettings.contact.phone}</p>`;
    }

    if (
      globalSettings.contact.website &&
      globalSettings.contact.website.trim() !== ""
    ) {
      contactHTML += `<p>Website: <a href="${globalSettings.contact.website}" target="_blank" style="color: inherit;">${globalSettings.contact.website}</a></p>`;
    }

    contactContainer.innerHTML = contactHTML;
  }

  //CREAREA BANNER-ULUI CU TEXT DINAMIC
  const createCookieBanner = () => {
    const bannerHTML = `
      <div id="cookie-consent-banner">
        <div class="cookie-content">
          <div class="cookie-text">
            <p><strong>Atenție!</strong> 🕵️‍♂️ ${globalSettings.cookieText}</p>
          </div>
          <div class="cookie-buttons">
            <button id="btn-refuse-cookies" class="btn-cookie btn-cookie-refuse">Refuz</button>
            <button id="btn-accept-cookies" class="btn-cookie btn-cookie-accept">Accept</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", bannerHTML);
  };

  // LOGICA DE ANALYTICS
  const sendVisitToBackend = async (visitorId) => {
    try {
      await fetch(`${API_BASE_URL}/analytics/visit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId }),
      });
    } catch (err) {
      console.error("Eroare la înregistrarea vizitei:", err);
    }
  };

  const sendRefusalToBackend = async () => {
    try {
      await fetch(`${API_BASE_URL}/analytics/refuse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("Eroare la înregistrarea refuzului:", err);
    }
  };

  const initAnalytics = () => {
    const consent = localStorage.getItem("analytics_consent");

    if (consent === "true") {
      let visitorId = localStorage.getItem("visitor_id");
      if (!visitorId) {
        visitorId = generateVisitorId();
        localStorage.setItem("visitor_id", visitorId);
      }
      sendVisitToBackend(visitorId);
    } else if (consent === "false") {
    } else {
      createCookieBanner();

      setTimeout(() => {
        const banner = document.getElementById("cookie-consent-banner");
        banner.classList.add("show");

        document
          .getElementById("btn-accept-cookies")
          .addEventListener("click", () => {
            localStorage.setItem("analytics_consent", "true");
            const newVisitorId = generateVisitorId();
            localStorage.setItem("visitor_id", newVisitorId);
            banner.classList.remove("show");
            sendVisitToBackend(newVisitorId);
          });

        document
          .getElementById("btn-refuse-cookies")
          .addEventListener("click", () => {
            localStorage.setItem("analytics_consent", "false");
            banner.classList.remove("show");
            sendRefusalToBackend();
          });
      }, 500);
    }
  };

  initAnalytics();
});
