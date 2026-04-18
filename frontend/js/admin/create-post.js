const role = localStorage.getItem("satira_role") || "admin";
const apiPrefix = `/${role}`;

document.addEventListener("DOMContentLoaded", () => {
  const btnBack = document.getElementById("btn-back-dashboard");
  if (btnBack) {
    btnBack.href = "manage-posts.html";
  }

  const blocksContainer = document.getElementById("blocks-container");
  const btnAddText = document.getElementById("btn-add-text");
  const btnAddImage = document.getElementById("btn-add-image");
  const btnAddVideo = document.getElementById("btn-add-video");

  const categorySelect = document.getElementById("category-select");
  const newCategoryInput = document.getElementById("new-category-input");

  async function loadCategories() {
    try {
      const response = await fetchAPI(`${apiPrefix}/post-categories`, {
        method: "GET",
        credentials: "include",
      });

      const categories = response.data.categories || [];

      let optionsHtml = `<option value="" disabled selected>-- Alege o categorie existentă sau creează una nouă --</option>`;

      if (categories.length > 0) {
        categories.sort().forEach((cat) => {
          const displayCat = cat.charAt(0).toUpperCase() + cat.slice(1);
          optionsHtml += `<option value="${cat}">${displayCat}</option>`;
        });
      }

      optionsHtml += `<option value="new" style="font-weight: bold; color: var(--btn-special);">➕ Creează o categorie nouă...</option>`;
      categorySelect.innerHTML = optionsHtml;
    } catch (error) {
      console.error("Eroare la încărcarea categoriilor:", error);
      categorySelect.innerHTML = `
        <option value="" disabled selected>-- Eroare la încărcare --</option>
        <option value="new" style="font-weight: bold;">➕ Creează o categorie manual</option>
      `;
    }
  }

  loadCategories();

  categorySelect.addEventListener("change", (e) => {
    if (e.target.value === "new") {
      newCategoryInput.classList.remove("d-none");
      newCategoryInput.setAttribute("required", "true");
    } else {
      newCategoryInput.classList.add("d-none");
      newCategoryInput.removeAttribute("required");
      newCategoryInput.value = "";
    }
  });

  btnAddText.addEventListener("click", () => {
    const block = document.createElement("div");
    block.className = "editor-block block-item";
    block.innerHTML = `
      <div class="block-header">
        <span class="font-bold">📝 Paragraf Text</span>
        <button type="button" class="btn-remove-block" onclick="this.closest('.editor-block').remove()">✖ Șterge</button>
      </div>
      <input type="hidden" class="block-type" value="text">
      <textarea class="input-full block-content" rows="4" placeholder="Scrie textul tău aici..." required></textarea>
    `;
    blocksContainer.appendChild(block);
  });

  btnAddImage.addEventListener("click", () => {
    const block = document.createElement("div");
    block.className = "editor-block block-item";
    block.innerHTML = `
      <div class="block-header">
        <span class="font-bold">📸 Imagine</span>
        <button type="button" class="btn-remove-block" onclick="this.closest('.editor-block').remove()">✖ Șterge</button>
      </div>
      <input type="hidden" class="block-type" value="image">
      
      <label class="form-label">Alege poza:</label>
      <input type="file" class="input-full mb-15 block-file" accept="image/*" required>
      
      <label class="form-label">Explicație poză (Opțional):</label>
      <input type="text" class="input-full mb-15 block-caption" placeholder="Ex: O pisică albă dormind...">
      
      <label class="form-label">Sursa / Referința (Opțional):</label>
      <input type="text" class="input-full block-reference" placeholder="Ex: Sursa: Unsplash">
    `;
    blocksContainer.appendChild(block);
  });

  btnAddVideo.addEventListener("click", () => {
    const block = document.createElement("div");
    block.className = "editor-block block-item";
    block.innerHTML = `
      <div class="block-header">
        <span class="font-bold">🎥 Video</span>
        <button type="button" class="btn-remove-block" onclick="this.closest('.editor-block').remove()">✖ Șterge</button>
      </div>
      <input type="hidden" class="block-type" value="video">
      
      <label class="form-label">Alege clipul video:</label>
      <input type="file" class="input-full mb-15 block-file" accept="video/mp4,video/x-m4v,video/*" required>
      
      <label class="form-label">Explicație video (Opțional):</label>
      <input type="text" class="input-full mb-15 block-caption" placeholder="Ex: Un scurt interviu...">
      
      <label class="form-label">Sursa / Referința (Opțional):</label>
      <input type="text" class="input-full block-reference" placeholder="Ex: Sursa: YouTube">
    `;
    blocksContainer.appendChild(block);
  });

  const form = document.getElementById("create-post-form");
  const messageBox = document.getElementById("create-message-box");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    messageBox.innerHTML =
      "<span class='text-info'>Se procesează și se încarcă fișierele. Te rugăm să aștepți... ⏳</span>";

    const formData = new FormData();

    formData.append("title", document.getElementById("post-title").value);
    formData.append("subtitle", document.getElementById("post-subtitle").value);

    let finalCategory = categorySelect.value;
    if (finalCategory === "new") {
      finalCategory = newCategoryInput.value.trim();
    }
    formData.append("category", finalCategory);

    const coverInput = document.getElementById("post-cover");
    if (coverInput.files.length > 0) {
      formData.append("coverImage", coverInput.files[0]);
    }

    const blocksData = [];
    const blockItems = document.querySelectorAll(".block-item");

    blockItems.forEach((blockEl) => {
      const type = blockEl.querySelector(".block-type").value;
      if (type === "text") {
        const textContent = blockEl.querySelector(".block-content").value;
        blocksData.push({ type: "text", content: textContent });
      } else if (type === "image" || type === "video") {
        const fileInput = blockEl.querySelector(".block-file");
        if (fileInput.files.length > 0) {
          formData.append("blockFiles", fileInput.files[0]);
          const captionInput = blockEl.querySelector(".block-caption");
          const referenceInput = blockEl.querySelector(".block-reference");

          blocksData.push({
            type: type,
            caption: captionInput ? captionInput.value : "",
            reference: referenceInput ? referenceInput.value : "",
          });
        }
      }
    });

    if (blocksData.length === 0) {
      messageBox.innerHTML =
        "<span class='text-error'>❌ Eroare: Adaugă cel puțin un bloc de text, imagine sau video!</span>";
      return;
    }

    formData.append("blocks", JSON.stringify(blocksData));

    try {
      const response = await fetchAPI(`${apiPrefix}/create-post`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      messageBox.innerHTML =
        "<span class='text-success'>✅ Postarea a fost publicată cu succes! Te redirecționăm...</span>";
      setTimeout(() => {
        window.location.href = "manage-posts.html";
      }, 2000);
    } catch (error) {
      messageBox.innerHTML = `<span class='text-error'>❌ Eroare: ${error.message}</span>`;
    }
  });
});
