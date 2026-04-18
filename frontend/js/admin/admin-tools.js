function checkIsAdmin() {
  return (
    typeof currentUser !== "undefined" &&
    currentUser &&
    (currentUser.role === "admin" || currentUser.role === "co-admin")
  );
}

document.addEventListener("feedRendered", () => {
  if (!checkIsAdmin()) return;

  const postCards = document.querySelectorAll(".post-card[data-post-id]");

  postCards.forEach((card) => {
    const postId = card.getAttribute("data-post-id");
    const imageWrapper = card.querySelector(".image-wrapper");

    if (imageWrapper) {
      const adminOverlay = document.createElement("div");
      adminOverlay.className = "admin-actions-overlay";

      adminOverlay.innerHTML = `
                <button class="btn-admin-edit" onclick="event.stopPropagation(); window.location.href='pages/admin/edit-post.html?id=${postId}'" title="Editează postarea">✏️ Edit</button>
                <button class="btn-admin-delete" onclick="event.stopPropagation(); deletePostHandler('${postId}')" title="Șterge postarea">🗑️ Delete</button>
            `;

      imageWrapper.appendChild(adminOverlay);
    }
  });
});

document.addEventListener("singlePostRendered", (event) => {
  if (!checkIsAdmin()) return;

  const postId = event.detail.postId;
  const placeholder = document.getElementById("admin-actions-placeholder");

  if (placeholder) {
    placeholder.innerHTML = `
            <div class="single-post-admin-actions">
                <button class="btn-admin-edit" onclick="window.location.href='../admin/edit-post.html?id=${postId}'">✏️ Editează Postarea</button>
                <button class="btn-admin-delete" onclick="deletePostHandler('${postId}')">🗑️ Șterge Postarea</button>
            </div>
        `;
  }
});

window.deletePostHandler = async function (postId) {
  const confirmare = confirm(
    "⚠️ Ești sigur că vrei să ștergi DEFINITIV această postare? Fișierele asociate și imaginile vor fi șterse ireversibil!",
  );
  if (!confirmare) return;

  try {
    await fetchAPI(`/admin/delete-post/${postId}`, {
      method: "DELETE",
      credentials: "include",
    });

    alert("✅ Postarea a fost ștearsă cu succes!");

    if (window.location.pathname.includes("single-post.html")) {
      window.location.href = "../../index.html";
    } else {
      window.location.reload();
    }
  } catch (error) {
    alert("❌ Eroare la ștergerea postării: " + error.message);
  }
};
