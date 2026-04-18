//node export-frontend.js

const fs = require("fs");
const path = require("path");

// Definim folderele
const frontendDir = path.join(__dirname, "frontend");
const outputFile = path.join(__dirname, "frontend_complet.txt");

// Ignorăm folderul cu active statice (poze, clipuri)
const ignoreDirs = ["assets", "images"];

let outputContent = "";

function readDirectory(directory) {
  // Verificăm dacă folderul frontend există
  if (!fs.existsSync(directory)) {
    console.log(`❌ Folderul nu a fost găsit la calea: ${directory}`);
    console.log(
      `Asigură-te că ai numit folderul exact "frontend" și că acest script este lângă el.`,
    );
    return;
  }

  const files = fs.readdirSync(directory);

  files.forEach((file) => {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    // Dacă e folder, intrăm în el recursiv (doar dacă nu e pe lista de ignorate)
    if (stat.isDirectory()) {
      if (!ignoreDirs.includes(file)) {
        readDirectory(fullPath);
      }
    } else {
      // Dacă e fișier, îl procesăm doar dacă are extensia corectă
      if (
        file.endsWith(".html") ||
        file.endsWith(".css") ||
        file.endsWith(".js")
      ) {
        // Calculăm calea relativă (ex: css/style.css) pentru a pune un titlu frumos
        const relativePath = path
          .relative(frontendDir, fullPath)
          .replace(/\\/g, "/");
        const fileContent = fs.readFileSync(fullPath, "utf8");

        outputContent += `// ==========================================\n`;
        outputContent += `// FILE: frontend/${relativePath}\n`;
        outputContent += `// ==========================================\n\n`;
        outputContent += fileContent;
        outputContent += `\n\n`;
      }
    }
  });
}

try {
  console.log("⏳ Se extrage codul din Frontend...");
  readDirectory(frontendDir);

  if (outputContent !== "") {
    fs.writeFileSync(outputFile, outputContent, "utf8");
    console.log(`✅ Fişierul de export a fost creat cu succes: ${outputFile}`);
  } else {
    console.log(
      "⚠️ Nu am găsit niciun fișier .html, .css sau .js în folderul frontend.",
    );
  }
} catch (error) {
  console.error("❌ A apărut o eroare:", error.message);
}
