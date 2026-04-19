// pt a crea fisierul: node export.js

import fs from "fs";
import path from "path";

const outputFile = "cod_proiect_complet.txt";

// Folosim REGEX pentru a defini ce ignorăm și ce acceptăm
// ^ = început de string, $ = sfârșit de string, i = case insensitive
const ignoreFoldersRegex = /^(node_modules|\.git|uploads)$/i;
const ignoreFilesRegex =
  /^(\.env|\.gitignore|package-lock\.json|export\.js|cod_proiect_complet\.txt)$/i;
const allowedExtensionsRegex = /\.(js|json)$/i;

let output = "";

// Funcție care citește tot restul proiectului
function readDir(dir) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Dacă e folder și NU se potrivește cu regex-ul de ignorare, intrăm în el
      if (!ignoreFoldersRegex.test(item)) {
        readDir(fullPath);
      }
    } else {
      // Dacă e fișier, verificăm să NU fie ignorat și să aibă extensia corectă (.js sau .json)
      if (!ignoreFilesRegex.test(item) && allowedExtensionsRegex.test(item)) {
        output += `// ==========================================\n`;
        output += `// FILE: ${fullPath.replace(/\\/g, "/")}\n`;
        output += `// ==========================================\n\n`;
        output += fs.readFileSync(fullPath, "utf-8");
        output += `\n\n`;
      }
    }
  }
}

// Pornim scanarea din folderul curent
readDir(".");

// Salvăm totul în fișierul text
fs.writeFileSync(outputFile, output);
console.log(
  `✅ Gata! Fișierul "${outputFile}" a fost generat cu succes! (fără .env, .gitignore și package-lock.json)`,
);
