const role = localStorage.getItem("satira_role") || "admin";
const apiPrefix = `/${role}`;

document.addEventListener("DOMContentLoaded", async () => {
  const btnBack = document.getElementById("btn-back-dashboard");
  if (btnBack) {
    btnBack.href = "manage-posts.html";
  }

  await fetchAdminPosts();
});

async function fetchAdminPosts() {
  const container = document.getElementById("posts-container");
  const paginationContainer = document.getElementById("pagination-container");

  const urlParams = new URLSearchParams(window.location.search);
  const pageParam = parseInt(urlParams.get("page")) || 1;
  const categoryParam = urlParams.get("category");

  try {
    let endpoint = `${apiPrefix}/all-posts?page=${pageParam}`;

    if (categoryParam) {
      endpoint = `${apiPrefix}/post-category/${encodeURIComponent(categoryParam)}?page=${pageParam}`;

      const titleTag = document.querySelector("h1");
      if (titleTag)
        titleTag.innerHTML = `📁 Categoria: <span class="text-info">${categoryParam.toUpperCase()}</span>`;
    }

    const response = await fetchAPI(endpoint, {
      method: "GET",
      credentials: "include",
    });

    const posts = response.data.posts;
    const pagination = response.data.pagination;

    if (!posts || posts.length === 0) {
      container.innerHTML = `<p class="text-center font-bold text-muted">Nu există nicio postare ${categoryParam ? `în categoria ${categoryParam}` : `în baza de date`}.</p>`;
      return;
    }

    container.innerHTML = "";

    posts.forEach((post) => {
      const postElement = document.createElement("div");
      postElement.classList.add("post-card");
      postElement.style.height = "auto";
      postElement.style.minHeight = "100%";
      postElement.style.display = "flex";
      postElement.style.flexDirection = "column";

      const title = post.title || "Fără titlu";
      const coverImage = post.coverImage || "";
      const category = post.category ? post.category.toUpperCase() : "GENERAL";
      const viewUrl = `post-by-id.html?id=${post._id}`;

      let dateStr = "Dată necunoscută";
      if (post.createdAt) {
        const dateObj = new Date(post.createdAt);
        dateStr = dateObj.toLocaleDateString("ro-RO", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }

      let coverHtml = coverImage
        ? `<div class="image-wrapper" style="cursor:pointer;" onclick="window.location.href='${viewUrl}'">
            <img src="${coverImage}" alt="Cover" class="post-cover-img">
           </div>`
        : `<div class="image-wrapper" style="height: 200px; background: #eee; cursor:pointer;" onclick="window.location.href='${viewUrl}'"></div>`;

      postElement.innerHTML = `
        ${coverHtml}
        <div class="post-card-content" style="flex: 1; display: flex; flex-direction: column; padding-bottom: 20px;">
            <span class="post-date">${dateStr} | 📁 ${category}</span>
            <h2 style="margin-bottom: 20px; cursor:pointer;" onclick="window.location.href='${viewUrl}'">${title}</h2>
            
            <div style="display: flex; gap: 10px; margin-top: auto; border-top: 1px solid var(--border-color); padding-top: 15px;">
                <button class="btn-full" style="background-color: var(--bg-color); color: var(--text-main); border: 1px solid var(--border-color); cursor: pointer; padding: 10px; border-radius: 6px; font-weight: bold; width: 50%;" onclick="window.location.href='edit-post.html?id=${post._id}'">
                    ✏️ Editează
                </button>
                <button class="btn-full" style="background-color: #dc3545; color: white; border: none; cursor: pointer; padding: 10px; border-radius: 6px; font-weight: bold; width: 50%;" onclick="deletePost('${post._id}')">
                    🗑️ Șterge
                </button>
            </div>
        </div>
      `;
      container.appendChild(postElement);
    });

    renderPagination(paginationContainer, pagination, categoryParam);
  } catch (error) {
    if (
      error.message.toLowerCase().includes("token") ||
      error.message.toLowerCase().includes("expirat")
    ) {
      window.location.href =
        role === "co-admin"
          ? "../co-admin/login-co-admin.html"
          : "login-admin.html";
      return;
    }
    container.innerHTML = `<p class="text-error text-center font-bold">Eroare: ${error.message}</p>`;
  }
}

function renderPagination(container, pagination, categoryParam) {
  if (!container || !pagination) return;
  const { currentPage, totalPages } = pagination;
  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  const catQuery = categoryParam
    ? `&category=${encodeURIComponent(categoryParam)}`
    : "";

  let html = "";
  if (currentPage > 1) {
    html += `<a href="all-posts-admin.html?page=${currentPage - 1}${catQuery}" class="page-btn">« Înapoi</a>`;
  } else {
    html += `<span class="page-btn disabled">« Înapoi</span>`;
  }
  for (let i = 1; i <= totalPages; i++) {
    if (i === currentPage) {
      html += `<span class="page-btn active">${i}</span>`;
    } else {
      html += `<a href="all-posts-admin.html?page=${i}${catQuery}" class="page-btn">${i}</a>`;
    }
  }
  if (currentPage < totalPages) {
    html += `<a href="all-posts-admin.html?page=${currentPage + 1}${catQuery}" class="page-btn">Înainte »</a>`;
  } else {
    html += `<span class="page-btn disabled">Înainte »</span>`;
  }
  container.innerHTML = html;
}

window.deletePost = async function (postId) {
  if (
    !confirm(
      "⚠️ Ești sigur că vrei să ștergi DEFINITIV această postare? Această acțiune nu poate fi anulată!",
    )
  )
    return;

  try {
    await fetchAPI(`${apiPrefix}/delete-post/${postId}`, {
      method: "DELETE",
      credentials: "include",
    });
    alert("✅ Postarea a fost ștearsă cu succes!");
    window.location.reload();
  } catch (error) {
    alert("Eroare la ștergerea postării: " + error.message);
  }
};
