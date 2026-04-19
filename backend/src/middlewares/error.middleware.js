// fisier pt a preveni crearea a 2 account-uri facute in acelasi timp (2 cereri contemporan):
import { ApiError } from "../utils/api-error.js";

// export const errorHandler = (err, req, res, next) => {
//   console.error("🔥 ERROR CAUGHT:", err);
//   console.error("🔥 STACK:", err?.stack);
//   // Duplicate key (Mongo) - ex: email, nickname, single-admin index
//   if (err?.code === 11000) {
//     const field = err?.keyValue ? Object.keys(err.keyValue)[0] : "field";
//     const value = err?.keyValue ? err.keyValue[field] : "";

//     return res.status(409).json({
//       success: false,
//       message: `Duplicate value for ${field}`,
//       errors: value ? [{ [field]: value }] : [],
//     });
//   }

//   // Dacă a fost aruncat ApiError din proiectul tău
//   if (err instanceof ApiError) {
//     return res.status(err.statusCode).json({
//       success: false,
//       message: err.message,
//       errors: err.errors || [],
//     });
//   }

//   // fallback
//   return res.status(500).json({
//     success: false,
//     message: "Internal Server Error",
//     errors: [],
//   });
// };
// În src/middlewares/error.middleware.js

export const errorHandler = (err, req, res, next) => {
  // Gestionare erori unicitate MongoDB (ex: Email deja folosit)
  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    let message = `Valoarea pentru ${field} există deja.`;

    // Personalizăm mesajele pentru câmpurile cheie
    if (field === "email")
      message = "Această adresă de email este deja înregistrată.";
    if (field === "nickname")
      message = "Acest nickname este deja utilizat de altcineva.";
    if (field === "role" && err.keyValue.role === "admin") {
      message =
        "Există deja un cont de administrator. Nu se pot crea mai multe.";
    }

    return res.status(409).json({
      success: false,
      message,
      errors: [{ [field]: err.keyValue[field] }],
    });
  }

  // Dacă este o eroare de tip ApiError definită de noi
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || [],
    });
  }
  console.error("🔥 EROARE CRITICĂ PRINSĂ DE HANDLER:", err); //

  // Fallback pentru erori necunoscute
  return res.status(500).json({
    success: false,
    message: err.message || "A apărut o eroare internă de server.", //
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined, // Opțional: arată stack trace-ul în dev
  });
};

/// de modificat inainte de a publica pe server
