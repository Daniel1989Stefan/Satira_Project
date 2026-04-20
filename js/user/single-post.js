window.shareToWhatsApp = function (postTitle, postUrl) {
  const messageText = `"${postTitle}"\n${postUrl}`;
  const encodedMessage = encodeURIComponent(messageText);
  window.open(`https://api.whatsapp.com/send?text=${encodedMessage}`, "_blank");
};

window.shareToFacebook = function (postUrl) {
  const encodedUrl = encodeURIComponent(postUrl);
  window.open(
    `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    "facebook-share-dialog",
    "width=800,height=600",
  );
};

window.copyPostLink = function (postUrl, btnElement) {
  navigator.clipboard
    .writeText(postUrl)
    .then(() => {
      const originalHTML = btnElement.innerHTML;
      btnElement.innerHTML = `<i class="fa-solid fa-check"></i> Copiat!`;
      setTimeout(() => {
        btnElement.innerHTML = originalHTML;
      }, 2000);
    })
    .catch((err) => {
      console.error("Eroare la copiere:", err);
      alert("Nu s-a putut copia link-ul.");
    });
};

document.addEventListener("DOMContentLoaded", async () => {
  await fetchSinglePost();
});

async function fetchSinglePost() {
  const container = document.getElementById("single-post-container");
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get("id");

  if (!postId) {
    container.innerHTML = `<p class='text-error text-center'>Eroare: Postarea nu a fost găsită.</p>`;
    return;
  }

  try {
    const response = await fetchAPI(`/user/post/${postId}`, { method: "GET" });
    const post = response.data.post;

    const title = post.title || "Fără titlu";
    const subtitle = post.subtitle || "";
    const blocks = post.blocks || [];
    const totalLikes = post.likes ? post.likes.length : 0;
    const totalDislikes = post.dislikes ? post.dislikes.length : 0;

    const categoryName = post.category || "recente";
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

    let subtitleHtml = subtitle
      ? `<h4 class="post-subtitle text-muted mt-10 mb-20" style="text-align: left; font-size: 18px;">${subtitle}</h4>`
      : "";

    let blocksHtml = "";
    blocks.forEach((block) => {
      if (block.type === "text") {
        blocksHtml += `<p class="post-text mb-15" style="white-space: pre-wrap;">${block.content}</p>`;
      } else if (block.type === "image") {
        let metaHtml = "";
        if (block.caption || block.reference) {
          metaHtml = `<div class="media-meta">
                        ${block.caption ? `<strong>${block.caption}</strong>` : ""} 
                        ${block.reference ? ` | Sursa: ${block.reference}` : ""}
                      </div>`;
        }
        blocksHtml += `
          <div class="post-media-block">
            <img src="${block.content}" alt="Imagine Postare">
            ${metaHtml}
          </div>`;
      } else if (block.type === "video") {
        let metaHtml = "";
        if (block.caption || block.reference) {
          metaHtml = `<div class="media-meta">
                        ${block.caption ? `<strong>${block.caption}</strong>` : ""} 
                        ${block.reference ? ` | Sursa: ${block.reference}` : ""}
                      </div>`;
        }
        blocksHtml += `
          <div class="post-media-block">
            <video controls class="video-player">
                <source src="${block.content}" type="video/mp4">
            </video>
            ${metaHtml}
          </div>`;
      }
    });

    const safeTitleForShare = title.split("'").join("\\'");

    // Verificăm dacă backend-ul ne spune că userul a votat deja (opțional)
    // Se bazează pe faptul că backend-ul trimite ceva de genul post.userVote = 'like' sau 'dislike'
    const userVote = post.userVote || post.userReaction || null;
    const likeClass = userVote === "like" ? "active-like" : "";
    const dislikeClass = userVote === "dislike" ? "active-dislike" : "";

    container.innerHTML = `
      <div class="breadcrumbs">
         <a href="../../index.html">Home</a> &raquo;
         <a href="../../index.html?category=${categoryName}">${displayCategory}</a>
      </div>

      <div class="post-card" style="border: none; box-shadow: none; padding: 0; background: transparent;">
        <h1 class="post-main-title" style="text-align: left; margin-bottom: 5px;">${title}</h1>
        ${subtitleHtml}
        
        <span class="post-date text-muted" style="display: block; margin-bottom: 30px; font-size: 14px; font-weight: bold;">
          PUBLICAT PE: ${dateStr.toUpperCase()}
        </span>
        
        <div id="admin-actions-placeholder"></div>

        <div class="post-content-area">
          ${blocksHtml}
        </div>
        
        <hr class="post-divider mt-20">
        
        <div class="vote-actions">
          <button id="btn-like-${post._id}" class="vote-btn ${likeClass}" onclick="votePost('${post._id}', 'like')">
              👍 Like (<span id="likes-${post._id}">${totalLikes}</span>)
          </button>
          
          <button id="btn-dislike-${post._id}" class="vote-btn ${dislikeClass}" onclick="votePost('${post._id}', 'dislike')">
              👎 Dislike (<span id="dislikes-${post._id}">${totalDislikes}</span>)
          </button>
        </div>

        <hr class="share-divider" />

        <div class="share-buttons-container">
            <button class="btn-share btn-whatsapp" onclick="shareToWhatsApp('${safeTitleForShare}', window.location.href)">
               <i class="fa-brands fa-whatsapp"></i> WhatsApp
            </button>
            <button class="btn-share btn-facebook" onclick="shareToFacebook(window.location.href)">
               <i class="fa-brands fa-facebook"></i> Facebook
            </button>
            <button class="btn-share btn-instagram" onclick="copyPostLink(window.location.href, this)">
               <i class="fa-brands fa-instagram"></i> Instagram
            </button>
         </div>
      </div>
    `;

    document.dispatchEvent(
      new CustomEvent("singlePostRendered", { detail: { postId: post._id } }),
    );
  } catch (error) {
    container.innerHTML = `<p class='text-error text-center'>❌ Eroare la încărcarea postării: ${error.message}</p>`;
  }
}

async function votePost(postId, action) {
  if (!currentUser) {
    localStorage.setItem("returnUrl", window.location.href);
    window.location.href = "login.html";
    return;
  }

  try {
    const btnLike = document.getElementById(`btn-like-${postId}`);
    const btnDislike = document.getElementById(`btn-dislike-${postId}`);

    let eraLikeApasat = false;
    let eraDislikeApasat = false;

    if (btnLike && btnDislike) {
      eraLikeApasat = btnLike.classList.contains("active-like");
      eraDislikeApasat = btnDislike.classList.contains("active-dislike");
    }

    // Trimitem votul la server
    const response = await fetchAPI(`/user/${postId}/vote`, {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ action: action }),
    });

    // Actualizăm numerele din paranteze
    document.getElementById(`likes-${postId}`).innerText =
      response.data.totalLikes;
    document.getElementById(`dislikes-${postId}`).innerText =
      response.data.totalDislikes;

    if (btnLike && btnDislike) {
      btnLike.classList.remove("active-like");
      btnDislike.classList.remove("active-dislike");

      if (response.data.userVote !== undefined) {
        if (response.data.userVote === "like")
          btnLike.classList.add("active-like");
        if (response.data.userVote === "dislike")
          btnDislike.classList.add("active-dislike");
      } else {
        if (action === "like" && !eraLikeApasat) {
          btnLike.classList.add("active-like");
        } else if (action === "dislike" && !eraDislikeApasat) {
          btnDislike.classList.add("active-dislike");
        }
      }
    }
  } catch (error) {
    alert("Eroare la votare: " + error.message);
  }
}
