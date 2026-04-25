//npm install dotenv --save
//npm i mongoose

//npm i express-validator
//pt validdarea datelor

//npm i express
//npm install dotenv --save
//npm install bcrypt jsonwebtoken
//npm install cloudinary multer -> pt incarcarea si salvarea imaginilor de profil
//npm i mailgen
//npm install nodemailer
//npm i express-validator
//npm install cookie-parser
//npm install cors
//npm install express-rate-limit
//npm uninstall cloudinary
//npm install @aws-sdk/client-s3
// npm install google-auth-library
//npm install node-cron

import "dotenv/config"; //face legătura cu fișierul .env

import app from "./app.js";
import connectDB from "./db/database.js";
import { startGDPRCleanupJob } from "./cron/gdpr-cleanup.js";
import { startDataExportJob } from "./cron/data-export.js";

const port = process.env.PORT;

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`The server is running on port ${port}`);
    });
    startGDPRCleanupJob(); //pt eliminare conturi dupa 30 zile
    // console.log("🕒 Cron jobs-urile au fost inițializate.");

    startDataExportJob(); //pt export data pt userii care au facut cererea
  })
  .catch((error) => {
    console.log(`MongoDB connection error`, error);
    process.exit(1);
  });
