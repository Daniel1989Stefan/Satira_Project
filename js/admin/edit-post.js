const role = localStorage.getItem("satira_role") || "admin";
const apiPrefix = `/${role}`;

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get("id");

  if (!postId) {
    alert("ID-ul postării lipsește!");
    window.location.href = "all-posts-admin.html";
    return;
  }

  const fixedContainer = document.getElementById("fixed-blocks-container");
  const dynamicContainer = document.getElementById("dynamic-blocks-container");
  const form = document.getElementById("edit-post-form");
  const loadingSpinner = document.getElementById("loading-spinner");
  const messageBox = document.getElementById("edit-message-box");

  let globalCategories = [];
  let mediaToDelete = [];

  if (!form) return;

  async function loadPostData() {
    try {
      const catRes = await fetchAPI(`${apiPrefix}/post-categories`, {
        method: "GET",
        credentials: "include",
      }).catch(() => fetchAPI("/user/post-categories"));
      globalCategories = catRes.data?.categories || [];

      const response = await fetchAPI(`${apiPrefix}/post/${postId}`, {
        method: "GET",
        credentials: "include",
      });
      const post = response.data.post;

      renderTitleBlock(post.title);
      renderSubtitleBlock(post.subtitle);
      renderCategoryBlock(post.category);
      renderCoverBlock(post.coverImage);

      if (post.blocks && post.blocks.length > 0) {
        post.blocks.forEach((block) => renderDynamicBlock(block, false));
      }

      loadingSpinner.classList.add("d-none");
      form.classList.remove("d-none");
    } catch (error) {
      loadingSpinner.innerHTML = `<span class="text-error">Eroare la încărcare: ${error.message}</span>`;
    }
  }

  function renderTitleBlock(title) {
    const html = `
        <div class="gutenberg-block" id="block-title" data-final-val="${title}">
            <div class="status-badge">Salvat Local</div>
            <div class="view-mode">
                <span class="text-muted font-bold block">📌 Titlu:</span>
                <h2 class="mt-5 view-text">${title}</h2>
                <div class="block-actions">
                    <button type="button" class="btn-outline btn-edit">✏️ Modifică</button>
                </div>
            </div>
            <div class="edit-mode d-none">
                <label class="form-label font-bold">Titlul Postării *</label>
                <input type="text" class="input-full edit-input" value="${title}" required>
                <div class="block-actions">
                    <button type="button" class="btn-primary btn-save-local">💾 Salvează (Local)</button>
                    <button type="button" class="btn-outline text-error btn-cancel">✖ Renunță</button>
                </div>
            </div>
        </div>`;
    fixedContainer.insertAdjacentHTML("beforeend", html);
  }

  function renderSubtitleBlock(subtitle) {
    const hasSub = subtitle && subtitle.trim() !== "";
    const html = `
        <div class="gutenberg-block" id="block-subtitle" data-final-val="${hasSub ? subtitle : ""}" ${!hasSub ? 'style="display:none;"' : ""}>
            <div class="status-badge">Salvat Local</div>
            <div class="view-mode">
                <span class="text-muted font-bold block">📝 Subtitlu:</span>
                <h4 class="mt-5 view-text">${hasSub ? subtitle : ""}</h4>
                <div class="block-actions">
                    <button type="button" class="btn-outline btn-edit">✏️ Modifică</button>
                    <button type="button" class="btn-outline text-error btn-delete-subtitle">🗑️ Elimină Subtitlu</button>
                </div>
            </div>
            <div class="edit-mode d-none">
                <label class="form-label font-bold">Subtitlu</label>
                <input type="text" class="input-full edit-input" value="${hasSub ? subtitle : ""}">
                <div class="block-actions">
                    <button type="button" class="btn-primary btn-save-local">💾 Salvează (Local)</button>
                    <button type="button" class="btn-outline text-error btn-cancel">✖ Renunță</button>
                </div>
            </div>
        </div>
        ${!hasSub ? `<button type="button" id="btn-restore-subtitle" class="btn-outline mb-20">➕ Adaugă Subtitlu</button>` : `<button type="button" id="btn-restore-subtitle" class="btn-outline mb-20 d-none">➕ Adaugă Subtitlu</button>`}`;
    fixedContainer.insertAdjacentHTML("beforeend", html);
  }

  function renderCategoryBlock(category) {
    let optionsHtml = `<option value="" disabled>-- Alege --</option>`;
    globalCategories.forEach((cat) => {
      const sel = category === cat ? "selected" : "";
      optionsHtml += `<option value="${cat}" ${sel}>${cat.toUpperCase()}</option>`;
    });
    optionsHtml += `<option value="new" style="font-weight:bold; color:blue;">➕ Creează Categorie Nouă...</option>`;

    const html = `
        <div class="gutenberg-block" id="block-category" data-final-val="${category}">
            <div class="status-badge">Salvat Local</div>
            <div class="view-mode">
                <span class="text-muted font-bold block">📁 Categorie:</span>
                <p class="mt-5 view-text font-bold text-info">${category.toUpperCase()}</p>
                <div class="block-actions">
                    <button type="button" class="btn-outline btn-edit">✏️ Modifică</button>
                </div>
            </div>
            <div class="edit-mode d-none">
                <label class="form-label font-bold">Alege Categoria</label>
                <select class="input-full mb-10 edit-select">${optionsHtml}</select>
                <input type="text" class="input-full edit-input-new d-none" placeholder="Numele noii categorii...">
                <div class="block-actions">
                    <button type="button" class="btn-primary btn-save-local">💾 Salvează (Local)</button>
                    <button type="button" class="btn-outline text-error btn-cancel">✖ Renunță</button>
                </div>
            </div>
        </div>`;
    fixedContainer.insertAdjacentHTML("beforeend", html);
  }

  function renderCoverBlock(coverUrl) {
    const html = `
        <div class="gutenberg-block" id="block-cover" data-existing-url="${coverUrl}">
            <div class="status-badge">Salvat Local</div>
            <div class="view-mode">
                <span class="text-muted font-bold block">🖼️ Poza Principală (Cover):</span>
                <img src="${coverUrl}" class="preview-image view-img">
                <div class="block-actions">
                    <button type="button" class="btn-outline btn-edit">✏️ Modifică Poza</button>
                </div>
            </div>
            <div class="edit-mode d-none">
                <label class="form-label font-bold">Încarcă o poză nouă (înlocuiește pe cea veche)</label>
                <input type="file" class="input-full mb-10 edit-file" accept="image/*">
                <img src="${coverUrl}" class="preview-image edit-preview">
                <div class="block-actions">
                    <button type="button" class="btn-primary btn-save-local">💾 Salvează (Local)</button>
                    <button type="button" class="btn-outline text-error btn-cancel">✖ Renunță</button>
                </div>
            </div>
        </div>`;
    fixedContainer.insertAdjacentHTML("beforeend", html);
  }

  function renderDynamicBlock(block, isNew = false) {
    const blockId = "dyn_" + Date.now() + Math.floor(Math.random() * 1000);
    const isMedia = block.type === "image" || block.type === "video";

    let viewContent = "";
    let editContent = "";

    if (block.type === "text") {
      viewContent = `<p class="view-text" style="white-space: pre-wrap;">${block.content || "Text gol..."}</p>`;
      editContent = `<textarea class="input-full edit-input" rows="4">${block.content || ""}</textarea>`;
    } else if (isMedia) {
      const mediaTag =
        block.type === "video"
          ? `<video src="${block.content}" class="preview-image view-img" controls></video>`
          : `<img src="${block.content}" class="preview-image view-img">`;
      viewContent = `
                ${mediaTag}
                <p class="text-sm text-muted mt-5">Sursă/Descriere setată.</p>
            `;
      editContent = `
                <input type="file" class="input-full mb-10 edit-file" accept="${block.type === "video" ? "video/*" : "image/*"}">
                <input type="text" class="input-full mb-10 edit-caption" placeholder="Explicație (Opțional)" value="${block.caption || ""}">
                <input type="text" class="input-full edit-reference" placeholder="Referință/Sursă (Opțional)" value="${block.reference || ""}">
                ${block.content ? `<p class="text-sm text-info mt-10">Fișier existent încărcat.</p>` : `<p class="text-sm text-error mt-10">Fișier lipsă. Te rog încarcă!</p>`}
            `;
    }

    const html = `
        <div class="gutenberg-block dynamic-block" id="${blockId}" data-type="${block.type}" ${block.content && !isNew ? `data-existing-url="${block.content}"` : ""}>
            <div class="status-badge ${isNew ? "editing" : ""}">${isNew ? "Editare..." : "Salvat Local"}</div>
            
            <div class="view-mode ${isNew ? "d-none" : ""}">
                <span class="text-muted font-bold block mb-10">Tip: ${block.type.toUpperCase()}</span>
                ${viewContent}
                <div class="block-actions">
                    <button type="button" class="btn-outline btn-edit">✏️ Modifică</button>
                    <button type="button" class="btn-outline text-error btn-delete-dyn">🗑️ Elimină</button>
                </div>
            </div>
  
            <div class="edit-mode ${isNew ? "" : "d-none"}">
                <span class="text-muted font-bold block mb-10">Editare ${block.type.toUpperCase()}</span>
                ${editContent}
                <div class="block-actions">
                    <button type="button" class="btn-primary btn-save-local">💾 Salvează (Local)</button>
                    <button type="button" class="btn-outline text-error ${isNew ? "btn-delete-dyn" : "btn-cancel"}">✖ Renunță</button>
                </div>
            </div>
        </div>`;
    dynamicContainer.insertAdjacentHTML("beforeend", html);
  }

  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-edit")) {
      const block = e.target.closest(".gutenberg-block");
      block.querySelector(".view-mode").classList.add("d-none");
      block.querySelector(".edit-mode").classList.remove("d-none");
      block.querySelector(".status-badge").innerText = "Editare...";
      block.querySelector(".status-badge").classList.add("editing");
    }

    if (e.target.classList.contains("btn-cancel")) {
      const block = e.target.closest(".gutenberg-block");
      block.querySelector(".edit-mode").classList.add("d-none");
      block.querySelector(".view-mode").classList.remove("d-none");
      block.querySelector(".status-badge").innerText = "Salvat Local";
      block.querySelector(".status-badge").classList.remove("editing");

      if (block.id === "block-title" || block.id === "block-subtitle") {
        block.querySelector(".edit-input").value =
          block.getAttribute("data-final-val");
      }
    }

    if (e.target.classList.contains("btn-delete-subtitle")) {
      const block = document.getElementById("block-subtitle");
      block.setAttribute("data-final-val", "");
      block.style.display = "none";
      document
        .getElementById("btn-restore-subtitle")
        .classList.remove("d-none");
    }

    if (e.target.id === "btn-restore-subtitle") {
      const block = document.getElementById("block-subtitle");
      block.style.display = "block";
      e.target.classList.add("d-none");
      block.querySelector(".view-mode").classList.add("d-none");
      block.querySelector(".edit-mode").classList.remove("d-none");
      block.querySelector(".status-badge").innerText = "Editare...";
      block.querySelector(".status-badge").classList.add("editing");
    }

    if (e.target.classList.contains("btn-delete-dyn")) {
      const block = e.target.closest(".dynamic-block");
      const existingUrl = block.getAttribute("data-existing-url");
      if (
        existingUrl &&
        confirm("Acest element conține un fișier pe server. Ștergi definitiv?")
      ) {
        mediaToDelete.push(existingUrl);
      }
      block.remove();
    }

    if (e.target.classList.contains("btn-save-local")) {
      const block = e.target.closest(".gutenberg-block");

      if (block.id === "block-title" || block.id === "block-subtitle") {
        const val = block.querySelector(".edit-input").value.trim();
        if (block.id === "block-title" && !val)
          return alert("Titlul nu poate fi gol!");
        block.setAttribute("data-final-val", val);
        block.querySelector(".view-text").innerText = val;
      }

      if (block.id === "block-category") {
        const selectVal = block.querySelector(".edit-select").value;
        let finalVal = selectVal;
        if (selectVal === "new") {
          finalVal = block.querySelector(".edit-input-new").value.trim();
          if (!finalVal) return alert("Scrie numele noii categorii!");
        }
        block.setAttribute("data-final-val", finalVal);
        block.querySelector(".view-text").innerText = finalVal.toUpperCase();
      }

      const fileInput = block.querySelector(".edit-file");
      if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const previewUrl = URL.createObjectURL(file);

        const oldUrl = block.getAttribute("data-existing-url");
        if (oldUrl) mediaToDelete.push(oldUrl);
        block.removeAttribute("data-existing-url");

        if (block.id === "block-cover") {
          block.querySelector(".view-img").src = previewUrl;
          block.querySelector(".edit-preview").src = previewUrl;
        } else if (block.getAttribute("data-type") === "image") {
          block.querySelector(".view-img").src = previewUrl;
        } else if (block.getAttribute("data-type") === "video") {
          block.querySelector(".view-img").src = previewUrl;
        }
      }

      if (block.getAttribute("data-type") === "text") {
        const val = block.querySelector(".edit-input").value;
        block.querySelector(".view-text").innerText = val;
      }

      block.querySelector(".edit-mode").classList.add("d-none");
      block.querySelector(".view-mode").classList.remove("d-none");
      block.querySelector(".status-badge").innerText = "Salvat Local";
      block.querySelector(".status-badge").classList.remove("editing");
    }
  });

  document.addEventListener("change", (e) => {
    if (e.target.classList.contains("edit-select")) {
      const inputNew = e.target
        .closest(".edit-mode")
        .querySelector(".edit-input-new");
      if (e.target.value === "new") {
        inputNew.classList.remove("d-none");
      } else {
        inputNew.classList.add("d-none");
      }
    }

    if (e.target.classList.contains("edit-file")) {
      const block = e.target.closest(".gutenberg-block");
      if (e.target.files.length > 0) {
        const tempUrl = URL.createObjectURL(e.target.files[0]);
        const previewImg = block.querySelector(".edit-preview");
        if (previewImg) previewImg.src = tempUrl;
      }
    }
  });

  document.getElementById("btn-add-text").onclick = () =>
    renderDynamicBlock({ type: "text", content: "" }, true);
  document.getElementById("btn-add-image").onclick = () =>
    renderDynamicBlock({ type: "image" }, true);
  document.getElementById("btn-add-video").onclick = () =>
    renderDynamicBlock({ type: "video" }, true);

  const submitBtn = form.querySelector('button[type="submit"]');

  submitBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const unsavedButtons = document.querySelectorAll(
      ".gutenberg-block .edit-mode:not(.d-none) .btn-save-local",
    );
    if (unsavedButtons.length > 0) {
      unsavedButtons.forEach((btn) => btn.click());
    }

    await new Promise((resolve) => setTimeout(resolve, 50));

    const stillUnSaved = document.querySelectorAll(".status-badge.editing");
    if (stillUnSaved.length > 0) {
      alert(
        "⚠️ Unele elemente nu au putut fi salvate automat. Verifică blocurile marcate cu galben!",
      );
      return;
    }

    const originalBtnText = submitBtn.innerHTML;

    try {
      submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Se salvează modificările...`;
      submitBtn.style.pointerEvents = "none";
      submitBtn.style.opacity = "0.7";

      messageBox.style.display = "block";
      messageBox.innerHTML =
        "<span class='text-info'>Se procesează datele și se uploadează fișierele... ⏳</span>";

      const formData = new FormData();

      const titleBlock = document.getElementById("block-title");
      const titleVal = titleBlock
        ? titleBlock.getAttribute("data-final-val")
        : "";
      if (!titleVal) throw new Error("Titlul postării nu poate fi gol!");
      formData.append("title", titleVal);

      const subBlock = document.getElementById("block-subtitle");
      if (subBlock && subBlock.style.display !== "none") {
        formData.append("subtitle", subBlock.getAttribute("data-final-val"));
      } else {
        formData.append("subtitle", "");
      }

      const catBlock = document.getElementById("block-category");
      const catVal = catBlock ? catBlock.getAttribute("data-final-val") : "";
      if (!catVal) throw new Error("Trebuie să alegi o categorie!");
      formData.append("category", catVal);

      const coverInput = document
        .getElementById("block-cover")
        .querySelector(".edit-file");
      if (coverInput && coverInput.files.length > 0) {
        formData.append("coverImage", coverInput.files[0]);
      }

      const blocksData = [];
      const dynamicBlocks = document.querySelectorAll(".dynamic-block");

      dynamicBlocks.forEach((block) => {
        const type = block.getAttribute("data-type");
        const existingUrl = block.getAttribute("data-existing-url");

        if (type === "text") {
          blocksData.push({
            type: "text",
            content: block.querySelector(".view-text").innerText,
          });
        } else if (type === "image" || type === "video") {
          const caption = block.querySelector(".edit-caption")?.value || "";
          const reference = block.querySelector(".edit-reference")?.value || "";

          if (existingUrl) {
            blocksData.push({
              type,
              existingUrl: existingUrl,
              caption,
              reference,
            });
          } else {
            const fileInput = block.querySelector(".edit-file");
            if (fileInput && fileInput.files.length > 0) {
              formData.append("blockFiles", fileInput.files[0]);
              blocksData.push({ type, caption, reference });
            }
          }
        }
      });

      if (blocksData.length === 0) {
        throw new Error(
          "Postarea trebuie să aibă cel puțin un bloc de conținut!",
        );
      }

      formData.append("blocks", JSON.stringify(blocksData));
      formData.append("mediaToDelete", JSON.stringify(mediaToDelete));

      const response = await fetchAPI(`${apiPrefix}/edit-post/${postId}`, {
        method: "PATCH",
        credentials: "include",
        body: formData,
      });

      messageBox.innerHTML =
        "<span class='text-success'>✅ Modificări Salvate cu Succes! Te redirecționăm...</span>";

      setTimeout(() => {
        window.location.href = "all-posts-admin.html";
      }, 1500);
    } catch (error) {
      console.error("🔴 EROARE:", error);
      messageBox.innerHTML = `<span class='text-error'>❌ Eroare: ${error.message}</span>`;
      submitBtn.innerHTML = originalBtnText;
      submitBtn.style.pointerEvents = "auto";
      submitBtn.style.opacity = "1";
    }
  });

  loadPostData();
});
