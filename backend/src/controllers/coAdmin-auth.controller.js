import { User } from "../models/user.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import jwt from "jsonwebtoken";
import { getCoAdminCookiesOptions } from "../utils/cookies.js";
import { sendEmail, changeCoAdminPassword } from "../utils/mail.js";
import * as crypto from "node:crypto";
import { ensureActiveAccount } from "../utils/deactivation.js";
import { OAuth2Client } from "google-auth-library";

///---Generate Co-Admin Token---///
const generateCoAdminAccessAndRefreshToken = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "Contul de Co-Admin nu a fost găsit");
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;

  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};
///---END Generate Co-Admin Token---///

///---Activate co-admin Account (Change password)---///
const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;

  const { password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    throw new ApiError(400, "Parolele introduse nu coincid");
  }

  let hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  //cautam c0-admin-ul in DB in baza token-ului (changePasswordToken/changePasswordExpiry)

  const coAdmin = await User.findOne({
    role: "co-admin",
    changePasswordToken: hashedToken,
    changePasswordExpiry: { $gt: Date.now() },
  });

  if (!coAdmin) {
    throw new ApiError(401, "Te rugăm să te autentifici din nou.");
  }

  //stergem token-urile:
  coAdmin.changePasswordToken = undefined;
  coAdmin.changePasswordExpiry = undefined;

  coAdmin.password = password;
  coAdmin.mustChangePassword = false;
  coAdmin.refreshToken = "";

  //salvam noile date in DB:
  await coAdmin.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Co-admin password changed and account successfully activated",
      ),
    );
});
///---END Activate co-admin Account (Change password)---///

///---Co-Admin Login---///
const coAdminLogin = asyncHandler(async (req, res) => {
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

  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  const coAdmin = await User.findOne({ email: normalizedEmail });

  if (!coAdmin) {
    throw new ApiError(404, "Contul nu există");
  }

  if (coAdmin.mustChangePassword) {
    throw new ApiError(
      403,
      "Te rugăm să îți verifici adresa de email pentru activarea contului",
    );
  }

  if (coAdmin.role !== "co-admin") {
    throw new ApiError(403, "Nu ești autorizat să accesezi această pagină");
  }

  const okP = await coAdmin.isPasswordCorrect(loginPassword);
  if (!okP) {
    throw new ApiError(401, "Emailul sau parola sunt incorecte");
  }

  await ensureActiveAccount(coAdmin); //verificare din nou daca e disabled sau nu

  const { accessToken, refreshToken } =
    await generateCoAdminAccessAndRefreshToken(coAdmin._id);

  const safeCoAdmin = await User.findById(coAdmin._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry",
  );

  const options = getCoAdminCookiesOptions();

  return res
    .status(200)
    .cookie("coAdminAccessToken", accessToken, options)
    .cookie("coAdminRefreshToken", refreshToken, options)
    .json(new ApiResponse(200, { coAdmin: safeCoAdmin }, "Co-Admin logged in"));
});
///---END Co-Admin Login---///

///---coAdmin Logout---///
const coAdminLogout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id, //este request-ul din verifyJWT (req.user = coAdmin).
    {
      $set: {
        refreshToken: "",
      },
    },
    {
      new: true,
    },
  );

  const options = getCoAdminCookiesOptions();

  return res
    .status(200)
    .clearCookie("coAdminAccessToken", options)
    .clearCookie("coAdminRefreshToken", options)
    .json(new ApiResponse(200, {}, "Co-Admin logget out."));
});
///---coAdmin Logout---///

///---Current user---///
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Co-Admin user fetched successfully"));
});
///---END Current user---///
///---Current user (Self-Healing cu Refresh Token)---///

///---Refresh Access Token---///
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.coAdminRefreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Acces neautorizat");
  }
  let decodedToken;
  try {
    decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );

    const coAdmin = await User.findOne({
      _id: decodedToken?._id,
      role: "co-admin",
    });

    if (!coAdmin) {
      throw new ApiError(
        401,
        "Sesiunea ta a expirat. Te rugăm să te autentifici din nou.",
      );
    }

    //Verificam daca token-ul primit (din cookies) este egal cu cel din DB:
    if (incomingRefreshToken !== coAdmin?.refreshToken) {
      throw new ApiError(
        401,
        "Sesiunea nu a putut fi reînnoită. Te rugăm să te autentifici din nou",
      );
    }

    const options = getCoAdminCookiesOptions();

    //generam token--uri noi:
    const { accessToken, refreshToken: newRefreshToken } =
      await generateCoAdminAccessAndRefreshToken(coAdmin._id);

    return res
      .status(200)
      .cookie("coAdminAccessToken", accessToken, options)
      .cookie("coAdminRefreshToken", newRefreshToken, options)
      .json(new ApiResponse(200, { accessToken }, "Co-Admin token refreshed"));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      500,
      "A apărut o eroare la reînnoirea sesiunii de Co-Admin. Te rugăm să te autentifici din nou",
    );
  }
});
///---END Refresh Access Token---///

///---Change Current Password---///
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "Parolele introduse nu coincid");
  }

  const coAdmin = await User.findById(req.user?._id);

  const isPasswordValid = await coAdmin.isPasswordCorrect(oldPassword);

  if (!isPasswordValid) {
    throw new ApiError(
      400,
      "Parolă incorectă. Dacă ai uitat vechea parolă, te rugăm să contactezi administratorul pentru a primi un e-mail de resetare a parolei.",
    );
  }

  coAdmin.password = newPassword;
  coAdmin.refreshToken = "";

  await coAdmin.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});
///---END Change Current Password---///

///---Disable Users---///
const disableUser = asyncHandler(async (req, res) => {
  const { email, disabledUntil, reason } = req.body;

  if (!email) throw new ApiError(400, "Adresa de email este obligatorie");

  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail, role: "user" });

  if (!user) throw new ApiError(404, "Utilizatorul nu a fost găsit");

  if (user.deactivation && user.deactivation.isDisabled) {
    throw new ApiError(400, "Acest utilizator este deja dezactivat.");
  }

  if (!user.deactivation) user.deactivation = {}; //in cazul in care in user nu exista obiectul deactivation, cream un obiect nou cu nu acelasi nume, deactivation

  user.deactivation.isDisabled = true;
  user.deactivation.reason = typeof reason === "string" ? reason.trim() : "";
  user.deactivation.disabledAt = new Date();
  user.deactivation.disabledByRole = req.user.role;
  user.deactivation.disabledBy = req.user._id;

  if (disabledUntil) {
    const date = new Date(disabledUntil);

    if (Number.isNaN(date.getTime())) {
      throw new ApiError(400, "Data limită pentru dezactivare nu este validă");
    }

    const oneHourFromNow = Date.now() + 60 * 60 * 1000;
    if (date.getTime() < oneHourFromNow) {
      throw new ApiError(
        400,
        "Data reactivării trebuie să fie cu cel puțin o oră mai mare decât ora curentă",
      );
    }

    user.deactivation.disabledUntil = date;
  } else {
    user.deactivation.disabledUntil = null; // permanent
  }

  user.refreshToken = "";

  await user.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        isDisabled: user.deactivation.isDisabled,
        reason: user.deactivation.reason,
        disabledBy: user.deactivation.disabledBy,
        disabledByRole: user.deactivation.disabledByRole,
        disabledAt: user.deactivation.disabledAt,
        disabledUntil: user.deactivation.disabledUntil,
      },
      "User successfully disabled",
    ),
  );
});
///---END Disable Users---///

///---Reanable User ---///
const reactivateUser = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) throw new ApiError(400, "Adresa de email este obligatorie");

  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail, role: "user" });

  if (!user)
    throw new ApiError(
      404,
      "Utilizatorul nu a fost găsit. Te rugăm să verifici adresa de email.",
    );

  if (!user.deactivation?.isDisabled)
    throw new ApiError(409, "Acest utilizator nu este dezactivat");

  user.deactivation = {
    isDisabled: false,
  };

  await user.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { email: user.email, isDisabled: user.deactivation.isDisabled },
        "User successfully reactivated",
      ),
    );
});
///---END Reanable User ---///

///---Disable Co-admins---///
const disableCoAdmin = asyncHandler(async (req, res) => {
  const { email, disabledUntil, reason } = req.body;

  if (!email) throw new ApiError(400, "Adresa de email este obligatorie.");

  const normalizedEmail = email.trim().toLowerCase();

  const coAdmin = await User.findOne({
    email: normalizedEmail,
    role: "co-admin",
  });

  if (!coAdmin) throw new ApiError(404, "Contul de Co-Admin nu a fost găsit");

  if (coAdmin.deactivation && coAdmin.deactivation.isDisabled) {
    throw new ApiError(400, "Acest Co-Admin este deja dezactivat");
  }

  if (!coAdmin.deactivation) coAdmin.deactivation = {}; //in cazul in care in user nu exista obiectul deactivation, cream un obiect nou cu nu acelasi nume, deactivation

  coAdmin.deactivation.isDisabled = true;
  coAdmin.deactivation.reason = typeof reason === "string" ? reason.trim() : "";
  coAdmin.deactivation.disabledAt = new Date();
  coAdmin.deactivation.disabledByRole = req.user.role;
  coAdmin.deactivation.disabledBy = req.user._id;

  if (disabledUntil) {
    const date = new Date(disabledUntil);

    if (Number.isNaN(date.getTime())) {
      throw new ApiError(400, "Data limită pentru dezactivare nu este validă");
    }

    const oneHourFromNow = Date.now() + 60 * 60 * 1000;
    if (date.getTime() < oneHourFromNow) {
      throw new ApiError(
        400,
        "Data reactivării trebuie să fie cu cel puțin o oră mai mare decât ora curentă",
      );
    }

    coAdmin.deactivation.disabledUntil = date;
  } else {
    coAdmin.deactivation.disabledUntil = null; // permanent
  }

  coAdmin.refreshToken = "";

  await coAdmin.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        isDisabled: coAdmin.deactivation.isDisabled,
        reason: coAdmin.deactivation.reason,
        disabledBy: coAdmin.deactivation.disabledBy,
        disabledByRole: coAdmin.deactivation.disabledByRole,
        disabledAt: coAdmin.deactivation.disabledAt,
        disabledUntil: coAdmin.deactivation.disabledUntil,
      },
      "User successfully disabled",
    ),
  );
});
///---END Disable Co-admins---///

///---Reanable Co-Admin ---///
const reactivateCoAdmin = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) throw new ApiError(400, "Adresa de email este obligatorie");

  const normalizedEmail = email.trim().toLowerCase();

  const coAdmin = await User.findOne({
    email: normalizedEmail,
    role: "co-admin",
  });

  if (!coAdmin)
    throw new ApiError(
      404,
      "Utilizatorul nu a fost găsit. Te rugăm să verifici adresa de email",
    );

  if (!coAdmin.deactivation?.isDisabled)
    throw new ApiError(409, "Acest utilizator nu este dezactivat");

  coAdmin.deactivation = {
    isDisabled: false,
  };

  await coAdmin.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { email: coAdmin.email, isDisabled: coAdmin.deactivation.isDisabled },
        "Co-Admin successfully reactivated",
      ),
    );
});
///---END Reanable Co-Admin---///

///---Get All Users (for Co-Admin)---///
const getAllUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = parseInt(req.query.limit) || 100;
  const skip = (page - 1) * limit;
  const searchQuery = req.query.search || "";

  // Setăm filtrul de bază: vrem doar utilizatori cu rolul de "user"
  const query = { role: "user" };

  // Dacă utilizatorul a folosit bara de căutare
  if (searchQuery) {
    query.$or = [
      { email: { $regex: searchQuery, $options: "i" } },
      { nickname: { $regex: searchQuery, $options: "i" } },
    ];
  }

  // Interogăm baza de date, excluzând datele sensibile
  const users = await User.find(query)
    .select(
      "-password -refreshToken -forgotPasswordToken -forgotPasswordExpiry -emailVerificationToken",
    )
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalUsers = await User.countDocuments(query);
  const totalPages = Math.ceil(totalUsers / limit);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { users, totalPages, currentPage: page, totalUsers },
        "Users fetched successfully",
      ),
    );
});
///---END Get All Users---///

///---Get All Co-Admins (for Co-Admin)---///
const getAllCoAdmins = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = parseInt(req.query.limit) || 100;
  const skip = (page - 1) * limit;
  const searchQuery = req.query.search || "";

  // Setăm filtrul de bază: vrem doar "co-admin"
  const query = { role: "co-admin" };

  if (searchQuery) {
    query.$or = [
      { email: { $regex: searchQuery, $options: "i" } },
      { fullname: { $regex: searchQuery, $options: "i" } },
    ];
  }

  // Interogăm baza de date
  const coAdmins = await User.find(query)
    .select(
      "-password -refreshToken -forgotPasswordToken -forgotPasswordExpiry",
    )
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalCoAdmins = await User.countDocuments(query);
  const totalPages = Math.ceil(totalCoAdmins / limit);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { coAdmins, totalPages, currentPage: page, totalCoAdmins },
        "Co-Admins fetched successfully",
      ),
    );
});
///---END Get All Co-Admins---///

export {
  resetPassword,
  coAdminLogin,
  coAdminLogout,
  getCurrentUser,
  refreshAccessToken,
  changeCurrentPassword,
  disableUser,
  reactivateUser,
  disableCoAdmin,
  reactivateCoAdmin,
  getAllUsers,
  getAllCoAdmins,
};
