import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"; // <-- AM ADĂUGAT DeleteObjectCommand
import fs from "fs";
import path from "path";

// 1. Conectăm "curierul" la contul tău de Cloudflare
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
  },
});

// --- FUNCȚIA DE UPLOAD (A RĂMAS NESCHIMBATĂ) ---
const uploadOnCloudflare = async (localFilePath, mimeType) => {
  try {
    if (!localFilePath) return null;

    const fileStream = fs.createReadStream(localFilePath);
    const fileExtension = path.extname(localFilePath);
    const fileName = `post_${Date.now()}_${Math.floor(Math.random() * 1000)}${fileExtension}`;

    const uploadParams = {
      Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
      Key: fileName,
      Body: fileStream,
      ContentType: mimeType || "application/octet-stream",
    };

    await s3Client.send(new PutObjectCommand(uploadParams));
    fs.unlinkSync(localFilePath); // Șterge fișierul TEMPORAR local

    return `${process.env.CLOUDFLARE_PUBLIC_URL}/${fileName}`;
  } catch (error) {
    console.error("Eroare la upload pe Cloudflare:", error);
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return null;
  }
};

// --- NOU: FUNCȚIA DE ȘTERGERE DEFINITIVĂ DE PE CLOUDFLARE ---
const deleteFromCloudflare = async (fileUrl) => {
  try {
    if (!fileUrl) return;

    const fileName = fileUrl.split("/").pop();

    const deleteParams = {
      Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
      Key: fileName,
    };

    // Trimitem comanda către Cloudflare să șteargă fișierul definitiv
    await s3Client.send(new DeleteObjectCommand(deleteParams));
  } catch (error) {
    console.error("Eroare la ștergerea de pe Cloudflare:", error);
  }
};

export { uploadOnCloudflare, deleteFromCloudflare }; // Exportăm ambele funcții
