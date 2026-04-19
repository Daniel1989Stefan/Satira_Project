////Acest fișier este "polițistul" care verifică raportul de la express-validator. Dacă acesta găsește nereguli (de exemplu, un email scris greșit), middleware-ul oprește cererea și trimite erorile înapoi, fără să mai lase procesul să ajungă în controller.

import fs from "fs";
import { validationResult } from "express-validator";
import { ApiError } from "../utils/api-error.js";

export const validate = (req, res, next) => {
  const errors = validationResult(req); // colectam erorile gasite de de express-validator

  if (errors.isEmpty()) {
    return next();
  }

  // Curățăm fișierele urcate de Multer dacă există erori de validare
  if (req.files) {
    Object.values(req.files)
      .flat()
      .forEach((file) => {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      });
  } else if (req.file && fs.existsSync(req.file.path)) {
    fs.unlinkSync(req.file.path);
  }

  const extractedErrors = []; //variabila unde o sa introducem erorile gasite

  errors.array().map((err) =>
    extractedErrors.push({
      [err.path]: err.msg,
    }),
  );

  //daca gasim vreo eroare:
  throw new ApiError(422, "Received data is not valid", extractedErrors);
};
