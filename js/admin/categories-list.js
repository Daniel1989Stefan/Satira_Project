document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("categories-container");

  try {
    const response = await fetchAPI("/admin/post-categories", {
      method: "GET",
      credentials: "include",
    });
    const categories = response.data.categories;

    if (!categories || categories.length === 0) {
      container.innerHTML =
        "<p class='text-center text-muted'>Nu există nicio categorie în baza de date.</p>";
      return;
    }

    container.innerHTML = "";

    categories.forEach((cat) => {
      const btn = document.createElement("a");
      btn.href = `all-posts-admin.html?category=${encodeURIComponent(cat)}`;

      btn.style.cssText = `
                display: flex; 
                align-items: center;
                padding: 15px 20px; 
                background: var(--bg-card, #fff); 
                border: 1px solid var(--border-color, #ccc); 
                border-radius: 8px; 
                text-decoration: none; 
                color: var(--text-main, #333); 
                font-weight: bold; 
                font-size: 16px; 
                transition: 0.2s ease-in-out;
            `;

      btn.onmouseover = () => {
        btn.style.borderColor = "#f39c12";
        btn.style.transform = "translateX(5px)";
      };
      btn.onmouseout = () => {
        btn.style.borderColor = "var(--border-color, #ccc)";
        btn.style.transform = "translateX(0)";
      };

      btn.innerHTML = `<i class="fa-solid fa-folder" style="color: #f39c12; margin-right: 15px; font-size: 20px;"></i> ${cat.toUpperCase()}`;

      container.appendChild(btn);
    });
  } catch (error) {
    container.innerHTML = `<p class='text-center text-error'>❌ Eroare la extragerea categoriilor: ${error.message}</p>`;
  }
});
