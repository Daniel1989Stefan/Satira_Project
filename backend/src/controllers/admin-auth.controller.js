import { User, CO_ADMIN_PERMISSIONS_LIST } from "../models/user.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import jwt from "jsonwebtoken";
import { getAdminCookiesOptions } from "../utils/cookies.js";
import {
  sendEmail,
  forgotPasswordMailgenContent,
  changeCoAdminPassword,
  accountReactivatedTemplate,
} from "../utils/mail.js";
import * as crypto from "node:crypto";
import mongoose from "mongoose";
import { OAuth2Client } from "google-auth-library";

///---Genereate Admin Token---///
const generateAdminAccessAndRefreshTooken = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "Adminul nu a fost găsit!");
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};
///---END Genereate Admin Token---///

///----Create Admin---///
const createAdminAccount = asyncHandler(async (req, res) => {
  //luam datele de la Admin:
  const {
    activationCode,
    email,
    confirmEmail,
    password,
    confirmPassword,
    fullname,
  } = req.body;

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail)
    throw new ApiError(400, "Vă rugăm să introduceți adresa de e-mail");
  const normalizedConfirmEmail = confirmEmail.trim().toLowerCase();
  if (normalizedEmail !== normalizedConfirmEmail)
    throw new ApiError(
      400,
      "E-mailul și confirmarea e-mailului trebuie să fie identice",
    );
  const existingAdmin = await User.findOne({ role: "admin" }).select("_id");

  if (password !== confirmPassword)
    throw new ApiError(
      400,
      "E-mailul și confirmarea e-mailului trebuie să fie identice",
    );

  //verificaam daca exista deja un admin:

  if (existingAdmin) {
    throw new ApiError(409, "Adminul există deja");
  }

  //verificam codul de activare:
  if (activationCode !== process.env.ADMIN_ACTIVATION_CODE) {
    throw new ApiError(401, "Cod de activare invalid");
  }

  //cream admin-ul:
  const admin = await User.create({
    email: normalizedEmail,
    password,
    fullname,
    role: "admin",
    isEmailVerified: true,
  });

  const safeAdmin = await User.findById(admin._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry",
  );

  return res
    .status(201)
    .json(new ApiResponse(201, { admin: safeAdmin }, "Admin account created"));
});
///----END Create Admin---///

///---Admin Login---///
const adminLogin = asyncHandler(async (req, res) => {
  const { email, loginPassword, recaptchaToken } = req.body;

  if (!email) {
    throw new ApiError(400, "Adresa de e-mail este obligatorie.");
  }

  // VALIDARE RECAPTCHA
  if (!recaptchaToken) {
    throw new ApiError(
      400,
      "Validarea anti-robot (reCAPTCHA) este obligatorie.",
    );
  }

  const verifyUrl = `https://www.google.com/recaptcha/api/siteverify`;
  const googleResponse = await fetch(verifyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`,
  });

  const googleData = await googleResponse.json();

  if (!googleData.success) {
    throw new ApiError(
      400,
      "Validarea reCAPTCHA a eșuat. Te rog să reîncerci.",
    );
  }
  // SFÂRȘIT VALIDARE RECAPTCHA

  const admin = await User.findOne({ email });
  if (!admin) {
    throw new ApiError(404, "E-mailul sau parola sunt incorecte!");
  }

  if (admin.role !== "admin") {
    throw new ApiError(403, "Nu ești autorizat să accesezi această pagină");
  }

  const okP = await admin.isPasswordCorrect(loginPassword);
  if (!okP) {
    throw new ApiError(401, "E-mailul sau parola sunt incorecte!");
  }

  //in cazul in care admin--ul trebuie sa schimbe parola dupa procedura break-glass
  if (admin.mustChangePassword) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          mustChangePassword: true,
        },
        "Password change required",
      ),
    );
  }

  const { accessToken, refreshToken } =
    await generateAdminAccessAndRefreshTooken(admin._id);

  const safeAdmin = await User.findById(admin._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry",
  );

  const options = getAdminCookiesOptions();

  return res
    .status(200)
    .cookie("adminAccessToken", accessToken, options)
    .cookie("adminRefreshToken", refreshToken, options)
    .json(new ApiResponse(200, { admin: safeAdmin }, "Admin logged in"));
});
///---END Admin Login---///

///---Admin refresh AccessToken---///
//foloseste admin JWT
const adminRefreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.adminRefreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(
      401,
      "Din motive de securitate, ai fost deconectat din cauza inactivității. Introdu datele din nou.",
    );
  }

  let decoded;

  try {
    decoded = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );
  } catch {
    throw new ApiError(
      401,
      "Din motive de securitate, ai fost deconectat din cauza inactivității. Introdu datele din nou.",
    );
  }

  const admin = await User.findById(decoded?._id);
  if (!admin) {
    throw new ApiError(401, "Adminul nu a fost găsit");
  }

  if (admin.role !== "admin") {
    throw new ApiError(403, "Acces neautorizat.");
  }

  // comparăm cu refreshToken din DB (invalidare la logout / rotation)
  if (incomingRefreshToken !== admin.refreshToken) {
    throw new ApiError(
      401,
      "Din motive de securitate, sesiunea ta a fost invalidată. Introdu datele din nou.",
    );
  }

  //general noi token-uri:
  const accessToken = admin.generateAccessToken();
  const newRefreshToken = admin.generateRefreshToken();

  admin.refreshToken = newRefreshToken;
  await admin.save({ validateBeforeSave: false });

  const options = getAdminCookiesOptions();

  return res
    .status(200)
    .cookie("adminAccessToken", accessToken, options)
    .cookie("adminRefreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(200, { accessToken }, "Admin access token refreshed"),
    );
});
///---END Admin refresh AccessToken---///

///---Create Co-admin Accouunt---///
//Logica: Admin-ul creaza co-admin account direct din contul sau si tot el stabileste parola
//1. Admin trebuie sa fie logat; 2. admin merge pe '/co-admin-create-account' si introduce Email si Parola si co-admin-ul primeste email de activare Account + cererea de schimbare parola. 3.pana co-admin-ul nu-si schimba paroola, nu poate accesa contul
const createCoAdmin = asyncHandler(async (req, res) => {
  const { email, confirmEmail, fullname } = req.body;

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedConfirmEmail = confirmEmail.trim().toLowerCase();

  if (normalizedEmail !== normalizedConfirmEmail)
    throw new ApiError(400, "E-mailul și confirmarea e-mailului nu coincid.");

  //verificam daca emailul este deja folosit (chiar daca e folosit ca user, nu se acccepta )
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new ApiError(
      409,
      "Nu puteți folosi acest e-mail. Vă rugăm să alegeți un alt e-mail.",
    );
  }

  //generam o parola random pt user:
  const tempPassword = crypto.randomBytes(24).toString("hex");

  //daca e totul ook, cream co-admin-ul:
  const coAdmin = await User.create({
    email: normalizedEmail,
    fullname,
    password: tempPassword,
    role: "co-admin",
    mustChangePassword: true,
    isEmailVerified: true,
  });

  //generam token-ul pt email:
  const { unhashedToken, hashedToken, tokenExpiry } =
    coAdmin.generateTemporaryToken();
  coAdmin.changePasswordToken = hashedToken;
  coAdmin.changePasswordExpiry = tokenExpiry;
  await coAdmin.save({ validateBeforeSave: false });

  //verificam daca exista in .env link-ul pt change password
  if (!process.env.FRONTEND_URL) {
    throw new ApiError(
      500,
      "⚠️ Eroare de configurare a serverului. Nu s-a putut stabili conexiunea cu baza de date. Te rugăm să verifici starea serverului de backend.",
    );
  }

  //trimitere email pt scjhimbare parola (link-ul inca trebuie procesat pt schimbare)
  // const baseUrl = process.env.API_BASE_URL;
  // const changePasswordUrl = `${baseUrl}/co-admin/reset-password/${unhashedToken}`;
  //link-ul o sa fie localHost 'api//v1/co-admin-auth/change-password'
  const frontendUrl = process.env.FRONTEND_URL;

  // Trimitem token-ul ca parametru de URL (?token=...)
  const changePasswordUrl = `${frontendUrl}/pages/co-admin/reset-password.html?token=${unhashedToken}`;

  await sendEmail({
    email: coAdmin.email,
    subject: "Account co-admin created",
    mailgenContent: changeCoAdminPassword(
      coAdmin.fullname || "co-admin",
      changePasswordUrl,
    ),
  });

  const createdCoAdmin = await User.findById(coAdmin._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry -changePasswordToken -changePasswordExpiry",
  );

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { coAdmin: createdCoAdmin },
        `Co-admin ${coAdmin.fullname} successfully created.`,
      ),
    );
});
///---END Create Co-admin Accouunt---///

///---Admin Logout---///
const adminLogout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: "",
      },
    },
    {
      new: true,
    },
  );

  const options = getAdminCookiesOptions();

  return res
    .status(200)
    .clearCookie("adminAccessToken", options)
    .clearCookie("adminRefreshToken", options)
    .json(new ApiResponse(200, {}, "Admin logget out."));
});
///---END Admin Logout---///

///---Get Current User/Admin---///
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Admin user fetched successfully"));
});
///---END Get Current User/Admin---///

///---Change Current Password---///
//admin-uul trebuie sa fie deja logat
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "Cele două parole nu sunt identice.");
  }

  const admin = await User.findById(req.user?._id);

  const isPasswordValid = await admin.isPasswordCorrect(oldPassword);

  if (!isPasswordValid) {
    throw new ApiError(
      400,
      "Parolă invalidă. Dacă ați uitat vechea parolă, vă rugăm să urmați procedura „Am uitat parola”.",
    );
  }

  admin.password = newPassword;
  admin.refreshToken = "";

  await admin.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});
///---END Change Current Password---///

///---Request  Forgot Password---///
const forgotPasswordRequest = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const admin = await User.findOne({ email, role: "admin" });

  if (!admin) {
    throw new ApiError(404, "Am trimis un e-mail pentru resetarea parolei.");
  }

  const {
    unhashedToken, //tokenul BRUT (merge în email)
    hashedToken, //tokenul HASH-uit (merge în DB)
    tokenExpiry, // momentul când expiră tokenul
  } = admin.generateTemporaryToken();

  admin.forgotPasswordToken = hashedToken;
  admin.forgotPasswordExpiry = tokenExpiry;
  await admin.save({ validateBeforeSave: false });

  await sendEmail({
    email: admin?.email,
    subject: "Password reset request",
    mailgenContent: forgotPasswordMailgenContent(
      admin.fullname,
      `${process.env.ADMIN_FORGOT_PASSWORD_REDIRECT_URL}${unhashedToken}`,
    ),
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Password reset email has been sent on your email",
      ),
    );
});
///---END Request Forgot Password---///

///---Reset Forgot Password---///
const resetForgotPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;

  const { newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "Cele două parole nu sunt identice.");
  }

  let hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const admin = await User.findOne({
    forgotPasswordToken: hashedToken,
    forgotPasswordExpiry: { $gt: Date.now() },
    role: "admin",
  });

  if (!admin) {
    throw new ApiError(401, "Sesiunea este invalidă sau a expirat.");
  }

  admin.forgotPasswordExpiry = undefined;
  admin.forgotPasswordToken = undefined;

  admin.password = newPassword;
  admin.refreshToken = "";

  await admin.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Parola a fost resetată cu succes."));
});
///---END Reset Forgot Password---///

///---Change password from temporary password---///
const changeTemporaryPassword = asyncHandler(async (req, res) => {
  const { email, temporaryPassword, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "Cele două parole nu sunt identice.");
  }

  const normalizedEmail = email?.trim().toLowerCase();

  const admin = await User.findOne({ email: normalizedEmail, role: "admin" });

  if (!admin) {
    throw new ApiError(
      404,
      "Vă rugăm să vă verificați datele de autentificare.",
    );
  }

  if (!admin.mustChangePassword) {
    throw new ApiError(
      409,
      "Schimbarea parolei nu este necesară. Vă rugăm să vă autentificați.",
    );
  }

  const isPasswordValid = await admin.isPasswordCorrect(temporaryPassword);

  if (!isPasswordValid) {
    throw new ApiError(401, "Parola temporară este invalidă.");
  }

  admin.password = newPassword;
  admin.mustChangePassword = false;
  admin.refreshToken = "";

  await admin.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Password channged. Please return to Login page",
      ),
    );
});
///---END Change password from temporary password---///

///---Change Co-Admin password---///
const resetCoAdminPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";

  const coAdmin = await User.findOne({
    email: normalizedEmail,
    role: "co-admin",
  });

  if (!coAdmin) {
    throw new ApiError(
      404,
      "Co-adminul nu a fost găsit, vă rugăm să verificați din nou e-mailul.",
    );
  }

  const tempPassword = crypto.randomBytes(24).toString("hex");

  coAdmin.password = tempPassword;
  coAdmin.mustChangePassword = true;
  coAdmin.refreshToken = "";

  //generam token-urile pt email, in asa fel incat co-admin-ul sa-si schimbe parola:
  const { unhashedToken, hashedToken, tokenExpiry } =
    coAdmin.generateTemporaryToken();

  coAdmin.changePasswordToken = hashedToken;
  coAdmin.changePasswordExpiry = tokenExpiry;

  await coAdmin.save({ validateBeforeSave: false });

  //trimiterea emailului:
  if (!process.env.FRONTEND_URL) {
    throw new ApiError(
      500,
      "⚠️ Eroare de configurare a serverului. Nu s-a putut stabili conexiunea cu baza de date. Te rugăm să verifici starea serverului de backend.",
    );
  }
  // const baseUrl = process.env.API_BASE_URL;
  // const changePasswordUrl = `${baseUrl}/co-admin/reset-password/${unhashedToken}`;
  // SOLUȚIA: Punctăm către pagina ta HTML de pe frontend
  const frontendUrl = process.env.FRONTEND_URL;
  const changePasswordUrl = `${frontendUrl}/pages/co-admin/reset-password.html?token=${unhashedToken}`;

  await sendEmail({
    email: coAdmin.email,
    subject: `Co-Admin ${coAdmin.fullname} password changed`,
    mailgenContent: changeCoAdminPassword(
      coAdmin.fullname || "co-admin",
      changePasswordUrl,
    ),
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        `Co-admin ${coAdmin.fullname} password was changed. Please inform that he has to modify his password in order to have acccess`,
      ),
    );
});
///---Change Co-Admin password---///

///---Update Co--Admin email and Fullname---///
const updatecoAdminEmail = asyncHandler(async (req, res) => {
  const { email, newEmail, confirmEmail } = req.body;

  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  const normalizedNewEmail =
    typeof newEmail === "string" ? newEmail.trim().toLowerCase() : "";
  const normalizedConfirmNewEmail =
    typeof confirmEmail === "string" ? confirmEmail.trim().toLowerCase() : "";
  if (!normalizedEmail)
    throw new ApiError(400, "Adresa de e-mail este obligatorie.");
  if (!normalizedNewEmail)
    throw new ApiError(400, "Noua adresă de e-mail este obligatorie.");
  if (normalizedNewEmail !== normalizedConfirmNewEmail)
    throw new ApiError(
      400,
      "Noua adresă de e-mail și confirmarea noii adrese de e-mail trebuie să fie identice.",
    );

  //gasim co-admin-ul pt care se fac schimbarile:
  const coAdmin = await User.findOne({
    email: normalizedEmail,
    role: "co-admin",
  });

  if (!coAdmin)
    throw new ApiError(
      404,
      "Co-adminul nu a fost găsit, vă rugăm să verificați e-mailul.",
    );

  const emailWillChange =
    normalizedNewEmail && normalizedNewEmail !== coAdmin.email;
  // const fullnameWillChange =
  //   normalizedNewFullname && normalizedNewFullname !== coAdmin.fullname;

  if (!emailWillChange) {
    throw new ApiError(
      400,
      "Nu au fost detectate modificări. Noua adresă de e-mail este identică cu cea actuală.",
    );
  }

  const verifyExistingUser = await User.findOne({
    email: normalizedNewEmail,
    _id: { $ne: coAdmin._id },
  });

  if (verifyExistingUser) {
    throw new ApiError(
      409,
      "Adresa de e-mail este deja utilizată, vă rugăm să alegeți o altă adresă de e-mail.",
    );
  }

  coAdmin.email = normalizedNewEmail;
  coAdmin.isEmailVerified = true;
  coAdmin.refreshToken = "";

  // if (fullnameWillChange) {
  //   coAdmin.fullname = normalizedNewFullname;
  // }

  await coAdmin.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { email: coAdmin.email },
        "Email successfully updated",
      ),
    );
});
///---END Update Co--Admin email and Fullname---///

///---UpdateCoAdminFullname---///
const updateCoAdminFullname = asyncHandler(async (req, res) => {
  const { email, newFullname } = req.body;

  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!normalizedEmail)
    throw new ApiError(400, "Adresa de e-mail este obligatorie.");

  const normalizedNewFullname =
    typeof newFullname === "string" ? newFullname.trim() : "";
  if (!normalizedNewFullname)
    throw new ApiError(400, "Noul nume complet este obligatoriu.");

  const coAdmin = await User.findOne({
    email: normalizedEmail,
    role: "co-admin",
  });

  if (!coAdmin) throw new ApiError(404, "Co-adminul nu a fost găsit.");

  const fullnameWillChange =
    normalizedNewFullname.toLowerCase() !== coAdmin.fullname.toLowerCase();

  if (!fullnameWillChange) {
    throw new ApiError(
      400,
      "Nu au fost detectate modificări. Noul nume complet este identic cu cel actual.",
    );
  }

  coAdmin.fullname = normalizedNewFullname;

  await coAdmin.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { fullname: coAdmin.fullname },
        "Fullname successfully updated",
      ),
    );
});
///---END UpdateCoAdminFullname---///

///---Update admin email or fullname---///
const updateAdminEmail = asyncHandler(async (req, res) => {
  const { loginPassword, newEmail, confirmEmail } = req.body;

  const admin = await User.findById(req.user?._id);

  if (!admin) {
    throw new ApiError(
      401,
      "Sesiune expirată. Administratorul nu a putut fi identificat.",
    );
  }

  if (admin.role !== "admin") {
    throw new ApiError(
      403,
      "Acces restricționat. Această pagină este disponibilă doar utilizatorilor autorizați.",
    );
  }

  const isPasswordValid = await admin.isPasswordCorrect(loginPassword);

  if (!isPasswordValid) {
    throw new ApiError(
      401,
      "Parola introdusă este incorectă. Vă rugăm să utilizați procedura de recuperare a parolei dacă este necesar.",
    );
  }

  const normalizedNewEmail =
    typeof newEmail === "string" ? newEmail.trim().toLowerCase() : "";
  const normalizedConfirmNewEmail =
    typeof confirmEmail === "string" ? confirmEmail.trim().toLowerCase() : "";

  // const normalizedNewFullname =
  //   typeof newFullname === "string" ? newFullname.trim() : "";
  if (!normalizedNewEmail) {
    throw new ApiError(400, "Nicio modificare detectată.");
  }

  if (normalizedNewEmail !== normalizedConfirmNewEmail)
    throw new ApiError(
      400,
      "Cele două adrese de e-mail trebuie să fie identice.",
    );

  const emailWillChange =
    normalizedNewEmail && normalizedNewEmail !== admin.email;
  // const fullnameWillChange =
  //   normalizedNewFullname && normalizedNewFullname !== admin.fullname;

  if (!emailWillChange) {
    throw new ApiError(400, "Nu ai efectuat nicio schimbare de salvat.");
  }

  const verifyExistingUser = await User.findOne({
    email: normalizedNewEmail,
    _id: { $ne: admin._id },
  });

  if (verifyExistingUser) {
    throw new ApiError(409, "Această adresă de e-mail este deja utilizată.");
  }

  admin.email = normalizedNewEmail;
  admin.isEmailVerified = true;

  // if (fullnameWillChange) {
  //   admin.fullname = normalizedNewFullname;
  // }

  await admin.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { email: admin.email },
        "Email successfully updated",
      ),
    );
});
///---END Update admin email or fullname---///

///---Update Fullname---///
const updateAdminFullname = asyncHandler(async (req, res) => {
  const { loginPassword, newFullname } = req.body;

  const admin = await User.findById(req.user?._id);

  if (!admin) {
    throw new ApiError(
      401,
      "Sesiunea de administrator a expirat. Te rugăm să te autentifici din nou.",
    );
  }

  if (admin.role !== "admin") {
    throw new ApiError(
      403,
      "Acces restricționat. Nu aveți permisiunile necesare pentru a vizualiza această pagină.",
    );
  }

  const normalizedNewFullname =
    typeof newFullname === "string" ? newFullname.trim() : "";
  if (!normalizedNewFullname) {
    throw new ApiError(400, "Nu au fost detectate modificări noi de salvat.");
  }
  if (normalizedNewFullname === admin.fullname) {
    throw new ApiError(400, "Nu au fost detectate modificări noi de salvat.");
  }

  const isPasswordValid = await admin.isPasswordCorrect(loginPassword);

  if (!isPasswordValid) {
    throw new ApiError(
      401,
      "Parola este incorectă. Vă rugăm să urmați pașii de recuperare a parolei dacă ați uitat-o pe cea actuală.",
    );
  }

  admin.fullname = normalizedNewFullname;

  await admin.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { fullname: admin.fullname },
        "Fullname successfully updated",
      ),
    );
});
///---END Update Fullname---///

///---Get Co-Admin list---///
// const coAdminList = asyncHandler(async (req, res) => {
//   const coAdmins = await User.find({ role: "co-admin" })
//     .select("email fullname deactivation") // sau fără, dacă mapezi tu
//     .lean();

//   const formatted = coAdmins.map((a) => ({
//     email: a.email,
//     fullname: a.fullname,
//     _id: a._id,
//     deactivation: a.deactivation,
//   }));

//   return res
//     .status(200)
//     .json(new ApiResponse(200, { coAdmins: formatted }, "OK"));
// });
const coAdminList = asyncHandler(async (req, res) => {
  // 1. Preluăm un posibil filtru din URL (ex: ?permission=createPosts)
  const { permission } = req.query;

  // 2. Construim obiectul de căutare de bază
  const query = { role: "co-admin" };

  // 3. Dacă frontend-ul a cerut un filtru specific, cerem bazei de date doar userii cu acea permisiune setată pe 'true'
  if (permission) {
    query[`permissions.${permission}`] = true;
  }

  // 4. Executăm căutarea și cerem EXPLICIT să ne returneze și 'permissions'
  const coAdmins = await User.find(query)
    .select("email fullname deactivation permissions")
    .lean();

  // 5. Formatăm răspunsul
  const formatted = coAdmins.map((a) => ({
    _id: a._id,
    email: a.email,
    fullname: a.fullname,
    deactivation: a.deactivation,
    permissions: a.permissions || {},
  }));

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { coAdmins: formatted },
        "This is the list of Co-Admins",
      ),
    );
});
///---END Get Co-Admin list---///

///---Get Co-Admin---///
// const coAdmin = asyncHandler(async (req, res) => {
//   const { id } = req.params;

//   if (!mongoose.Types.ObjectId.isValid(id)) {
//     throw new ApiError(400, "Invalid ID format");
//   }

//   const user = await User.findOne({
//     _id: new mongoose.Types.ObjectId(id),
//     role: "co-admin",
//   }).select("email fullname deactivation.isDisabled");

//   if (!user) {
//     throw new ApiError(404, "Co-admin not found");
//   }

//   return res.status(200).json(
//     new ApiResponse(
//       200,
//       {
//         email: user.email,
//         fullname: user.fullname,
//         isDisabled: user.deactivation?.isDisabled ?? false,
//       },
//       "Co-admin fetched successfully",
//     ),
//   );
// });
const coAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Formatul ID-ului este invalid.");
  }

  const user = await User.findOne({
    _id: new mongoose.Types.ObjectId(id),
    role: "co-admin",
  }).select(
    "-password -refreshToken -forgotPasswordToken -emailVerificationToken -changePasswordToken",
  );

  if (!user) {
    throw new ApiError(404, "Co-adminul nu a fost găsit.");
  }

  // Returnăm întregul obiect de utilizator către frontend
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        coAdminDetails: user, // Trimitem obiectul complet
      },
      "Co-admin fetched successfully",
    ),
  );
});
///---END Get Co-Admin---///

///---Get All Users (Cu Paginare și Căutare Exactă)---///
const getAllUsers = asyncHandler(async (req, res) => {
  // 1. Preluăm parametrii din URL, cu valori default de siguranță
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100;
  const search = req.query.search ? req.query.search.trim() : "";

  // 2. Calculăm câte documente trebuie să "sărim" în baza de date
  const skip = (page - 1) * limit;

  // 3. Construim query-ul de bază (doar utilizatorii simpli)
  const query = { role: "user" };

  // 4. Dacă s-a introdus ceva în bara de căutare (Fără Regex)
  if (search) {
    const normalizedSearch = search.toLowerCase();

    // Căutăm o potrivire EXACTĂ fie pe email, fie pe nickname
    query.$or = [
      { email: normalizedSearch },
      { nickname: search }, // Dacă nickname-urile tale sunt case-sensitive, lasă-l așa
    ];
  }

  // 5. Interogăm baza de date pentru utilizatori
  const users = await User.find(query)
    .select("fullname email nickname deactivation")
    .skip(skip)
    .limit(limit)
    .lean(); // .lean() face ca Mongoose să returneze obiecte JS simple (mai rapid)

  // 6. Aflăm numărul total de utilizatori (pentru a ști câte pagini avem în total)
  const totalUsers = await User.countDocuments(query);
  const totalPages = Math.ceil(totalUsers / limit);

  // 7. Formatăm răspunsul exact cum se așteaptă frontend-ul
  const formattedUsers = users.map((u) => ({
    _id: u._id,
    fullname: u.fullname,
    email: u.email,
    nickname: u.nickname,
    deactivation: u.deactivation || {},
  }));

  // 8. Trimitem datele
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        users: formattedUsers,
        totalPages: totalPages === 0 ? 1 : totalPages, // minim 1 pagină
        currentPage: page,
        totalUsers: totalUsers,
      },
      "Lista utilizatorilor a fost extrasă cu succes",
    ),
  );
});
///---END Get All Users---///

///---Disable CoAdmin---///
const disableCoAdmin = asyncHandler(async (req, res) => {
  const { email, reason } = req.body;

  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (!normalizedEmail) {
    throw new ApiError(
      400,
      "Adresa de e-mail a co-adminului este obligatorie.",
    );
  }

  const targetCoAdmin = await User.findOne({ email: normalizedEmail });

  if (!targetCoAdmin) {
    throw new ApiError(404, "Contul nu a fost găsit.");
  }

  if (targetCoAdmin.role !== "co-admin") {
    throw new ApiError(
      403,
      "Această funcție este destinată exclusiv gestionării conturilor de Co-Admin.",
    );
  }

  if (!targetCoAdmin.deactivation) targetCoAdmin.deactivation = {};

  // Aplicăm suspendarea direct permanenta
  targetCoAdmin.deactivation.isDisabled = true;
  targetCoAdmin.deactivation.reason = reason
    ? reason.trim()
    : "Retragere acces de către Administrator";
  targetCoAdmin.deactivation.disabledAt = new Date();
  targetCoAdmin.deactivation.disabledUntil = null; // permanenta
  targetCoAdmin.deactivation.disabledByRole = "admin";
  targetCoAdmin.deactivation.disabledBy = req.user._id;

  // Delogare forțată
  targetCoAdmin.refreshToken = "";

  await targetCoAdmin.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Accesul Co-Adminului a fost revocat cu succes.",
      ),
    );
});
///---END Disable CoAdmin---///

///---Deactivate Users---///
const disableUser = asyncHandler(async (req, res) => {
  const { email, disabledUntil, reason, isUnderLegalHold } = req.body;

  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (!normalizedEmail) {
    throw new ApiError(400, "Adresa de e-mail este obligatorie.");
  }

  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw new ApiError(
      404,
      "Utilizatorul nu a fost găsit. Te rugăm să verifici din nou e-mailul.",
    );
  }

  if (user.role !== "user") {
    throw new ApiError(
      403,
      "Această funcție este destinată exclusiv dezactivării conturilor de tip USER.",
    );
  }

  if (!user.deactivation) user.deactivation = {};

  user.deactivation.isDisabled = true;
  user.deactivation.reason =
    typeof reason === "string" ? reason.trim() : "Fără motiv specificat";
  user.deactivation.disabledAt = new Date();

  user.deactivation.disabledByRole = req.user.role; // sau "co-admin" în controllerul de co-admin
  user.deactivation.disabledBy = req.user._id;

  if (disabledUntil) {
    const date = new Date(disabledUntil);

    if (Number.isNaN(date.getTime())) {
      throw new ApiError(400, "Data de suspendare nu este validă.");
    }

    const oneHourFromNow = Date.now() + 60 * 60 * 1000;
    if (date.getTime() < oneHourFromNow) {
      throw new ApiError(
        400,
        "Data reactivării trebuie să fie cu cel puțin o oră mai târziu față de momentul actual.",
      );
    }

    user.deactivation.disabledUntil = date;
  } else {
    user.deactivation.disabledUntil = null; // suspendare permanentă
  }

  if (isUnderLegalHold === true) {
    if (!user.deletion) user.deletion = {};

    user.deletion.isUnderLegalHold = true;

    user.deletion.legalHoldReason = `Setat manual în timpul suspendării. Motiv original: ${user.deactivation.reason}`;
  }

  user.refreshToken = "";

  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        isDisabled: user.deactivation.isDisabled,
        reason: user.deactivation.reason,
        disabledBy: user.deactivation.disabledBy,
        disabledUntil: user.deactivation.disabledUntil,
        isUnderLegalHold: user.deletion?.isUnderLegalHold || false,
      },
      "Utilizatorul a fost suspendat cu succes.",
    ),
  );
});
///---END Deactivate Users---///

///---Reactivate User---///
const reactivateAccount = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (!normalizedEmail) {
    throw new ApiError(400, "Adresa de e-mail este obligatorie.");
  }

  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw new ApiError(
      404,
      "Utilizatorul nu a fost găsit. Te rugăm să verifici dacă e-mailul este scris corect.",
    );
  }

  if (!user.deactivation?.isDisabled && !user.deletion?.isPendingDeletion) {
    throw new ApiError(409, "Contul este deja activ.");
  }

  if (user.deactivation) {
    user.deactivation.isDisabled = false;
    user.deactivation.disabledByRole = null;
    user.deactivation.disabledBy = null;
    user.deactivation.reason = null;
    user.deactivation.disabledAt = null;
    user.deactivation.disabledUntil = null;
  }

  if (user.deletion) {
    user.deletion.isPendingDeletion = false;
    user.deletion.scheduledForDeletionAt = null;
    user.deletion.requestedByRole = null;
    user.deletion.requestedBy = null;
    user.deletion.isUnderLegalHold = false;
    user.deletion.legalHoldReason = "";
  }

  await user.save({ validateBeforeSave: false });

  // 3. Trimiterea Email-ului de notificare
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5500";
  const loginUrl = `${frontendUrl}/pages/user/login.html`;

  const userNameDisplay = user.fullname || user.nickname || "Utilizator";

  await sendEmail({
    email: user.email,
    subject: "Contul tău a fost reactivat!",
    mailgenContent: accountReactivatedTemplate(userNameDisplay, loginUrl),
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { email: user.email, isDisabled: user.deactivation.isDisabled },
        "Utilizatorul a fost reactivat și notificat pe email cu succes.",
      ),
    );
});
///---END Reactivate User---///

///---Reactivate Co-admin---///
const reactivateCoAdmin = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (!normalizedEmail) {
    throw new ApiError(400, "Adresa de e-mail este obligatorie.");
  }

  const targetCoAdmin = await User.findOne({ email: normalizedEmail });

  if (!targetCoAdmin) {
    throw new ApiError(
      404,
      "Utilizatorul nu a fost găsit. Te rugăm să verifici din nou e-mailul.",
    );
  }

  if (targetCoAdmin.role !== "co-admin") {
    throw new ApiError(
      403,
      "Această funcție este destinată exclusiv reactivării conturilor de Co-Admin.",
    );
  }

  if (
    !targetCoAdmin.deactivation?.isDisabled &&
    !targetCoAdmin.deletion?.isPendingDeletion
  ) {
    throw new ApiError(409, "Contul de Co-Admin este deja complet activ.");
  }

  // 1. Resetăm corect obiectul de Suspendare
  if (targetCoAdmin.deactivation) {
    targetCoAdmin.deactivation.isDisabled = false;
    targetCoAdmin.deactivation.disabledByRole = null;
    targetCoAdmin.deactivation.disabledBy = null;
    targetCoAdmin.deactivation.reason = null;
    targetCoAdmin.deactivation.disabledAt = null;
    targetCoAdmin.deactivation.disabledUntil = null;
  }

  // 2. Anulăm orice cerere de Ștergere Definitivă
  if (targetCoAdmin.deletion) {
    targetCoAdmin.deletion.isPendingDeletion = false;
    targetCoAdmin.deletion.scheduledForDeletionAt = null;
    targetCoAdmin.deletion.requestedByRole = null;
    targetCoAdmin.deletion.requestedBy = null;
  }

  await targetCoAdmin.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Accesul Co-Adminului a fost reactivat cu succes.",
      ),
    );
});
///---Reactivate Co-admin---///

///---get all disabled users---///
const disabledUsersList = asyncHandler(async (req, res) => {
  const disabledUsers = await User.find({
    role: "user",
    "deactivation.isDisabled": true,
  }).select("email _id deactivation"); //retunreaza [{}]

  const result = disabledUsers.map((user) => ({
    email: user.email,
    id: user._id,
    isDisabled: user.deactivation.isDisabled,
    reason: user.deactivation.reason,
    disabledAt: user.deactivation.disabledAt,
    disabledByRole: user.deactivation.disabledByRole,
    disabledBy: user.deactivation.disabledBy,
    disabledUntil: user.deactivation.disabledUntil,
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, { result }, "This is the disabled users list"));
});
///---END get all disabled users---///

///---get all co-Admin Disabled---///
const disabledCoAdminList = asyncHandler(async (req, res) => {
  const disabledcoAdmins = await User.find({
    role: "co-admin",
    "deactivation.isDisabled": true,
  }).select("email _id deactivation"); //retunreaza [{}]

  const result = disabledcoAdmins.map((coAdmin) => ({
    email: coAdmin.email,
    id: coAdmin._id,
    isDisabled: coAdmin.deactivation.isDisabled,
    reason: coAdmin.deactivation.reason,
    disabledAt: coAdmin.deactivation.disabledAt,
    disabledByRole: coAdmin.deactivation.disabledByRole,
    disabledBy: coAdmin.deactivation.disabledBy,
    disabledUntil: coAdmin.deactivation.disabledUntil,
  }));

  return res
    .status(200)
    .json(
      new ApiResponse(200, { result }, "This is the co-admin disabled list"),
    );
});
///---END get all co-Admin Disabled---///

///---Assign Permissions---///
const updatePermissions = asyncHandler(async (req, res) => {
  const { email, permissions } = req.body; //permissions va fi un obiect (ex manageCoAdmins/manageUsers/etc) cu valori true sau false
  /* 
  "permissions": {
    manageUsers: true,
    editPosts: true,
    }
  */

  if (!email)
    throw new ApiError(
      400,
      "Co-adminul nu a fost găsit. Te rugăm să verifici din nou adresa de e-mail.",
    );

  const normalizedEmail = email.trim().toLowerCase();
  const coAdmin = await User.findOne({
    email: normalizedEmail,
    role: "co-admin",
  });
  if (!coAdmin)
    throw new ApiError(
      404,
      "Co-adminul nu a fost găsit. Te rugăm să verifici din nou adresa de e-mail.",
    );

  //verificam sa existe minim o permisiune:
  if (
    !permissions ||
    typeof permissions !== "object" ||
    Object.keys(permissions).length === 0
  )
    throw new ApiError(400, "Nu au fost selectate permisiuni noi.");

  const allowedPermissions = CO_ADMIN_PERMISSIONS_LIST;

  const updateData = {};

  for (const [key, value] of Object.entries(permissions)) {
    // Dacă permisiunea trimisă de user se află în lista noastră oficială
    if (allowedPermissions.includes(key)) {
      if (value === true) {
        updateData[`permissions.${key}`] = true;
      } else if (value === false) {
        updateData[`permissions.${key}`] = false;
      }
    }
  }

  if (Object.keys(updateData).length === 0) {
    throw new ApiError(400, "Permisiunile furnizate nu sunt valide.");
  }

  const updatedCoAdmin = await User.findOneAndUpdate(
    { _id: coAdmin._id },
    { $set: updateData },
    { new: true },
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { permissions: updatedCoAdmin.permissions },
        "Permissions update",
      ),
    );
});
///---END Assign Permissions---///

export {
  createAdminAccount,
  adminLogin,
  adminRefreshAccessToken,
  createCoAdmin,
  adminLogout,
  getCurrentUser,
  changeCurrentPassword,
  forgotPasswordRequest,
  resetForgotPassword,
  changeTemporaryPassword,
  resetCoAdminPassword,
  updatecoAdminEmail,
  updateCoAdminFullname,
  updateAdminEmail,
  updateAdminFullname,
  coAdminList,
  coAdmin,
  getAllUsers,
  disableUser,
  disabledUsersList,
  disabledCoAdminList,
  reactivateAccount,
  updatePermissions,
  disableCoAdmin,
  reactivateCoAdmin,
};
