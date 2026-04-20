let currentUser = null; // Aici vom păstra datele utilizatorului dacă e logat

document.addEventListener("DOMContentLoaded", async () => {
  await checkUserStatus(); // 1. Verificăm dacă e logat
  await fetchPosts(); // 2. Aducem postările
});

// --- VERIFICAREA AUTENTIFICĂRII ---
async function checkUserStatus() {
  const authContainer = document.getElementById("user-menu-top"); // PC
  const sidebarAuth = document.getElementById("sidebar-auth-links"); // MOBIL

  if (!authContainer) return;

  //Detectăm inteligent unde ne aflăm pentru a genera link-urile corect
  const isSubPage = window.location.pathname.includes("/pages/");
  const profileLink = isSubPage ? "profile.html" : "pages/user/profile.html";
  const loginLink = isSubPage ? "login.html" : "pages/user/login.html";

  try {
    const response = await fetchAPI("/user/current-user", {
      method: "POST",
      credentials: "include",
    });
    currentUser = response.data;

    // LOGICA PENTRU PC
    authContainer.innerHTML = `
      <div class="user-dropdown-container" id="user-dropdown">
        <button id="dropdown-toggle-btn" class="nav-btn-special">
           <i class="fa-regular fa-user"></i> <span>Contul Meu</span>
        </button>
        <div class="user-dropdown-menu">
           <a href="${profileLink}" class="dropdown-item">Contul meu</a>
           <button onclick="logout()" class="dropdown-item text-error font-bold">Log out</button>
        </div>
      </div>
    `;

    const dropdownContainer = document.getElementById("user-dropdown");
    const dropdownBtn = document.getElementById("dropdown-toggle-btn");

    if (dropdownBtn) {
      dropdownBtn.addEventListener("click", () => {
        dropdownContainer.classList.toggle("active");
      });
    }

    document.addEventListener("click", (e) => {
      if (dropdownContainer && !dropdownContainer.contains(e.target)) {
        dropdownContainer.classList.remove("active");
      }
    });

    // LOGICA PENTRU MOBIL
    if (sidebarAuth) {
      sidebarAuth.innerHTML = `
           <a href="${profileLink}" class="sidebar-item font-bold" style="border-bottom: none;"><i class="fa-regular fa-user"></i> Contul Meu</a>
           <button onclick="logout()" class="sidebar-item sidebar-btn font-bold text-error" style="width: 100%; border-bottom: none;"><i class="fa-solid fa-arrow-right-from-bracket"></i> Log out</button>
        `;
    }
  } catch (error) {
    currentUser = null;

    // PC: Butonul de Login
    authContainer.innerHTML = `
      <a href="${loginLink}" id="special-action-btn" class="nav-btn-special">
         <i class="fa-regular fa-user"></i> <span>Intră în cont</span>
      </a>
    `;

    // MOBIL: Butonul de Login
    if (sidebarAuth) {
      sidebarAuth.innerHTML = `
           <a href="${loginLink}" class="sidebar-item font-bold" style="border-bottom: none;"><i class="fa-regular fa-user"></i> Intră în cont</a>
        `;
    }
  }
}

async function logout() {
  try {
    await fetchAPI("/user/logout", { method: "POST", credentials: "include" });
    window.location.reload(); // Reîncărcăm pagina ca să îl deconectăm vizual
  } catch (error) {
    alert("Eroare la logout: " + error.message);
  }
}

async function fetchPosts() {
  const container = document.getElementById("posts-container");
  const paginationContainer = document.getElementById("pagination-container");
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  const categoryParam = urlParams.get("category");
  const pageParam = parseInt(urlParams.get("page")) || 1;

  try {
    let endpoint = categoryParam
      ? `/user/post-category/${categoryParam}`
      : "/user/all-posts";

    endpoint += `?page=${pageParam}`;

    const response = await fetchAPI(endpoint);
    const posts = response.data.posts;
    const pagination = response.data.pagination;

    const pageTitle = document.querySelector("main h1");
    if (pageTitle) {
      if (categoryParam) {
        const capitalizedCategory =
          categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1);
        pageTitle.innerText = `${capitalizedCategory}`;
      } else {
        pageTitle.innerText = "Ultimele Postări";
      }
    }

    if (!posts || posts.length === 0) {
      container.innerHTML = `<p>Momentan nu există nicio postare ${categoryParam ? "în această categorie" : ""}.</p>`;
      if (paginationContainer) paginationContainer.innerHTML = "";
      return;
    }

    container.innerHTML = "";

    posts.forEach((post) => {
      const postElement = document.createElement("div");
      postElement.classList.add("post-card", "clickable");

      postElement.setAttribute("data-post-id", post._id);

      const title = post.title || "Fără titlu";
      const coverImage = post.coverImage || "";

      let dateStr = "Dată necunoscută";
      if (post.createdAt) {
        const dateObj = new Date(post.createdAt);
        dateStr = dateObj.toLocaleDateString("ro-RO", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
      }

      let coverHtml = coverImage
        ? `<div class="image-wrapper" style="position: relative; overflow: hidden;"><img src="${coverImage}" alt="Cover Postare" class="post-cover-img"></div>`
        : `<div class="image-wrapper" style="position: relative; overflow: hidden;"></div>`;

      postElement.innerHTML = `
          ${coverHtml}
          <div class="post-card-content">
            <span class="post-date">${dateStr}</span>
            <h2>${title}</h2>
          </div>
      `;

      postElement.addEventListener("click", () => {
        window.location.href = `pages/user/single-post.html?id=${post._id}`;
      });

      container.appendChild(postElement);
    });

    renderPagination(paginationContainer, pagination, categoryParam);

    document.dispatchEvent(new CustomEvent("feedRendered"));
  } catch (error) {
    container.innerHTML = `<p class='text-error'>Eroare la încărcarea postărilor: ${error.message}</p>`;
  }
}

function renderPagination(container, pagination, categoryParam) {
  if (!container || !pagination) return;

  const { currentPage, totalPages } = pagination;

  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = "";
  const catQuery = categoryParam ? `&category=${categoryParam}` : "";

  if (currentPage > 1) {
    html += `<a href="index.html?page=${currentPage - 1}${catQuery}" class="page-btn">« Înapoi</a>`;
  } else {
    html += `<span class="page-btn disabled">« Înapoi</span>`;
  }

  for (let i = 1; i <= totalPages; i++) {
    if (i === currentPage) {
      html += `<span class="page-btn active">${i}</span>`;
    } else {
      html += `<a href="index.html?page=${i}${catQuery}" class="page-btn">${i}</a>`;
    }
  }

  if (currentPage < totalPages) {
    html += `<a href="index.html?page=${currentPage + 1}${catQuery}" class="page-btn">Înainte »</a>`;
  } else {
    html += `<span class="page-btn disabled">Înainte »</span>`;
  }

  container.innerHTML = html;
}

async function votePost(postId, action) {
  if (!currentUser) {
    localStorage.setItem("returnUrl", window.location.href);
    window.location.href = "pages/user/login.html";
    return;
  }

  try {
    const response = await fetchAPI(`/user/${postId}/vote`, {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ action: action }),
    });

    document.getElementById(`likes-${postId}`).innerText =
      response.data.totalLikes;
    document.getElementById(`dislikes-${postId}`).innerText =
      response.data.totalDislikes;
  } catch (error) {
    alert("Eroare la votare: " + error.message);
  }
}
