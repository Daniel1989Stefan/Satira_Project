import rateLimit from "express-rate-limit"; //pt a limita numarul de tentative de login sau nr de tentative pt change password

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute
  max: 15, // 10 requesturi / IP / 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // mai strict pentru reset password
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Try again later.",
  },
});

const emailResendLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // tentativele se poat face la fiecare 2 min
  max: 1, // Permite DOAR 1 cerere la fiecare 2 minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "You already send the request. Please wait 2 minutes before trying again.",
  },
});

export { strictAuthLimiter, authLimiter, emailResendLimiter };
