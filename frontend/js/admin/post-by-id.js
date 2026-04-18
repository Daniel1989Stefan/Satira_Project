document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get("id");

  if (!postId) {
    alert("ID-ul postării lipsește!");
    window.location.href = "all-posts-admin.html";
    return;
  }

  await fetchPostForAdmin(postId);
});

async function fetchPostForAdmin(postId) {
  const container = document.getElementById("post-view-container");
  const actionsHeader = document.getElementById("admin-top-actions");

  try {
    const response = await fetchAPI(`/admin/post/${postId}`, {
      method: "GET",
      credentials: "include",
    });
    const post = response.data.post;

    const title = post.title || "Fără titlu";
    const subtitle = post.subtitle || "";
    const blocks = post.blocks || [];
    const categoryName = post.category || "General";
    const displayCategory =
      categoryName.charAt(0).toUpperCase() + categoryName.slice(1);

    let dateStr = "Dată necunoscută";
    if (post.createdAt) {
      const dateObj = new Date(post.createdAt);
      dateStr = dateObj.toLocaleDateString("ro-RO", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    }

    let blocksHtml = "";
    blocks.forEach((block) => {
      if (block.type === "text") {
        blocksHtml += `<p class="post-text mb-15" style="white-space: pre-wrap;">${block.content}</p>`;
      } else if (block.type === "image") {
        blocksHtml += `
            <div class="post-media-block">
              <img src="${block.content}" alt="Imagine Postare">
              <div class="media-meta">${block.caption || ""} ${block.reference ? `| Sursa: ${block.reference}` : ""}</div>
            </div>`;
      } else if (block.type === "video") {
        blocksHtml += `
            <div class="post-media-block">
              <video controls class="video-player"><source src="${block.content}" type="video/mp4"></video>
              <div class="media-meta">${block.caption || ""} ${block.reference ? `| Sursa: ${block.reference}` : ""}</div>
            </div>`;
      }
    });

    container.innerHTML = `
        <div class="post-card" style="border: none; box-shadow: none; padding: 0; background: transparent;">
          <div class="breadcrumbs" style="text-align: left; margin-bottom: 10px;">
             🛡️ Admin &raquo; ${displayCategory}
          </div>
          <h1 class="post-main-title" style="text-align: left;">${title}</h1>
          ${subtitle ? `<h4 class="post-subtitle text-muted mb-20">${subtitle}</h4>` : ""}
          <span class="post-date text-muted" style="display: block; margin-bottom: 20px; font-weight: bold;">
            PUBLICAT PE: ${dateStr.toUpperCase()}
          </span>
          <div class="post-content-area">
            ${blocksHtml}
          </div>
        </div>
      `;

    actionsHeader.classList.remove("d-none");
    document.getElementById("btn-top-edit").onclick = () =>
      (window.location.href = `edit-post.html?id=${postId}`);
    document.getElementById("btn-top-delete").onclick = () =>
      deletePostAdmin(postId);
  } catch (error) {
    if (
      error.message.toLowerCase().includes("jwt") ||
      error.message.toLowerCase().includes("unauthorized")
    ) {
      window.location.href = "login-admin.html";
      return;
    }
    container.innerHTML = `<p class='text-error text-center'>❌ Eroare admin: ${error.message}</p>`;
  }
}

async function deletePostAdmin(postId) {
  if (
    !confirm(
      "⚠️ Atenție! Ștergi această postare direct din baza de date. Ești sigur?",
    )
  )
    return;
  try {
    await fetchAPI(`/admin/delete-post/${postId}`, {
      method: "DELETE",
      credentials: "include",
    });
    alert("✅ Șters cu succes!");
    window.location.href = "all-posts-admin.html";
  } catch (error) {
    alert("Eroare la ștergere: " + error.message);
  }
}
