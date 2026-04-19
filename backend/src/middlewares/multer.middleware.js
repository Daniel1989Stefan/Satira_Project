import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Calea relativă pleacă de la nivelul unde se află package.json
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    // Generăm un prefix unic (milisecunde curente + număr random)
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);

    // Noul nume va fi ex: "1709123456789-123456789-numele_original.jpg"
    // Astfel, e imposibil să avem două fișiere cu același nume
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

export const upload = multer({
  storage,
  // Opțional, dar recomandat: Setăm o limită de mărime pentru a nu ne bloca serverul
  limits: {
    fileSize: 50 * 1024 * 1024, // Limită de 50 MB per fișier (ajustabil pentru video)
  },
});
