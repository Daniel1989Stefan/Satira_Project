//La refresh pagină: frontend apelează getCurrentUser, dacă access token e valid → gata, dacă primește 401 (expirat) → apelează refreshAccessToke, primește access token nou, apelează din nou getCurrentUser

// fisier pt functiile rutelor

import crypto from "crypto";
import { User } from "../models/user.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
  sendEmail,
} from "../utils/mail.js";
import jwt from "jsonwebtoken";
import {
  getUserCookiesOptions,
  googleUserCookiesOptions,
} from "../utils/cookies.js";
import { ensureActiveAccount } from "../utils/deactivation.js";
import { OAuth2Client } from "google-auth-library";

///----////
//Experiența Utilizatorului: Fără acest mecanism, utilizatorul ar trebui să se logheze cu user și parolă de fiecare dată când închide tab-ul sau când expiră biletul de scurtă durată.
const generateAccessAndRefreshToken = async (userId) => {
  try {
    //cautam userul dupa ID
    const user = await User.findById(userId);

    //folosim functia 'generateAccessToken' din user.model.js in care se genereaza jwt.sign si obtinem id-ul, emailul si rolul
    const accessToken = user.generateAccessToken();

    //folosim functia generateRefreshToken tot din user.model.js si creaza un 'bilet' pe termen lung folosit pt a obtine noi Acess Token-uri
    const refreshToken = user.generateRefreshToken();

    //salvam refreshToken in DB. Este pt a invalida sesiunea de logout (stergem token-ul din DB)
    user.refreshToken = refreshToken;

    //salvam modificarea in DB
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    console.log("EROAREA REALA LA TOKEN: ", error);
    throw new ApiError(
      500,
      "S-a produs o eroare la configurarea sesiunii. Te rugăm să încerci să te autentifici din nou.",
    );
  }
};
///----////

////--Register User--////
const registerUser = asyncHandler(async (req, res) => {
  //preluam datele de la utilizator:
  const { email, password, confirmPassword, nickname } = req.body;

  const normalizedEmail = email.trim().toLowerCase();
  ///verificam daca exista deja un user cu adresa de email (singura care trebuie sa fie unica):

  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new ApiError(
      409,
      "Această adresă de e-mail este deja utilizată. Te rugăm să folosești o altă adresă de e-mail.",
    );
  }

  if (password !== confirmPassword) {
    throw new ApiError(400, "Cele două parole trebuie să fie identice.");
  }

  //cream user-ul fara token:
  const user = await User.create({
    email: normalizedEmail,
    password,
    nickname,
    role: "user",
  }); //middleware-ul .pre("save") se va ocupa de restul

  //generam token-ul de verificare folosind functia generateTemporaryToken() din models/user.models.js care returneaza { unhashedToken, hashedToken, tokenExpiry }:
  const { unhashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();

  //salvam token-ul hasuit in DB: ??????
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });

  if (!process.env.FRONTEND_URL) {
    throw new ApiError(
      500,
      "Eroare la procesarea paginii. Te rugăm să încerci din nou peste câteva momente.",
    );
  }

  // const verificationUrl = `${process.env.API_BASE_URL}/user/verify-email/${unhashedToken}`;
  // Îl trimitem pe pagina de HTML și agățăm token-ul la final cu "?token="
  // const verificationUrl = `${process.env.FRONTEND_URL}/verify.html?token=${unhashedToken}`;
  const verificationUrl = `${process.env.FRONTEND_URL}/pages/user/verify.html?token=${unhashedToken}`;

  await sendEmail({
    email: user.email,
    subject: "Please verify your email",
    mailgenContent: emailVerificationMailgenContent(
      user.nickname || "User",
      verificationUrl,
    ),
  });

  //Eliminam datele sensibile inainte de a le trimite raspunsul:
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry",
  );

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { user: createdUser },
        `User ${user.nickname} successfully created. Pleasse check your email for verification.`,
      ),
    );
});
////--END Register User--////

///---Inregistrarea / autentificarea prin Google---///
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
export const googleAuthLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    throw new ApiError(
      400,
      "Nu am putut finaliza autentificarea cu Google. Te rugăm să încerci să te conectezi din nou.",
    );
  }

  // 1. Verificăm token-ul la Google
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  // 2. Extragem datele sigure trimise de Google (am scos 'picture')
  const payload = ticket.getPayload();
  const { email, name, email_verified } = payload;

  if (!email_verified) {
    throw new ApiError(403, "Adresa de email Google nu este verificată.");
  }

  // 3. Căutăm utilizatorul în baza noastră de date
  let user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    // 4. Dacă nu există, ÎL CREĂM AUTOMAT
    // Generăm o parolă aleatoare pe care nu o va folosi niciodată (doar ca să validăm Modelul)
    const randomPassword = Math.random().toString(36).slice(-8) + "A1!";

    user = await User.create({
      nickname: name,
      email: email.toLowerCase(),
      password: randomPassword,
      isEmailVerified: true, // E verificat deja de Google
      authProvider: "google",
    });
  }

  // Verificăm dacă a fost suspendat de Admin ÎNAINTE de a-i da token-urile
  await ensureActiveAccount(user);

  // 5. generăm token-urile NOASTRE
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id,
  );

  const safeUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken",
  );

  const options = googleUserCookiesOptions();

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: safeUser, accessToken, refreshToken },
        "Autentificare cu Google reușită!",
      ),
    );
});
///---END Inregistrarea / autentificarea prin Google---///

const login = asyncHandler(async (req, res) => {
  // Extragem datele trimise de user, inclusiv recaptchaToken:
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

  const normalizedEmail = email.trim().toLowerCase();

  // Căutam userul in DB:
  const user = await User.findOne({ email: normalizedEmail, role: "user" });

  if (!user) {
    throw new ApiError(404, "E-mailul sau parola sunt incorecte");
  }

  // Verificăm dacă parola introdusă în req.body e corectă
  const isPasswordValid = await user.isPasswordCorrect(loginPassword);

  if (!isPasswordValid) {
    throw new ApiError(401, "E-mailul sau parola sunt incorecte");
  }

  await ensureActiveAccount(user); // verificare din nou daca e disabled sau nu

  // Dacă e ok, generăm cele 2 chei (token).
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id,
  );

  // Preluăm datele utilizatorului din nou dar fără parolă și refreshToken:
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry",
  );

  // Configurăm opțiunile pt cookies:
  const options = getUserCookiesOptions();

  // Trimitem răspunsul către client:
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
        },
        "User logged in successfully",
      ),
    );
});
///---END Login----///

////---Logout---/////
//foloseste JWT
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: "", //este refreshToken din DB(nu e cel savat in browser)
      },
    },
    {
      new: true,
    },
  ); //din middleware-ul verifyJWT, luam req.user si pe baza id-ului actualizam token-ul. Noul token va fi gol, deci user-ul nu mai e logat

  const options = getUserCookiesOptions();

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logget out."));
});
////---END Logout---/////

///---Current User---////
//foloseste JWT
//cu acesta functie, se verifica daca user-ul este logat (folosind JWT.verify din middlewares/auth.middleware.js prin intermediul req.user)
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});
///---END Current User---////

///---Verify Email---///
//Cand utillizatorul da click pe link-ul din email, acesta are forma: http://localhost:8000/api/v1/auth/verify-email/TOKEN_BRUT
const verifyEmail = asyncHandler(async (req, res) => {
  //extragem token-ul brut (unhashed) din parametrii URL-ului
  const { verificationToken } = req.params;

  if (!verificationToken) {
    throw new ApiError(
      400,
      "Nu am putut valida adresa de e-mail. Te rugăm să soliciți un nou link de confirmare.",
    );
  }

  //hasuim token-ul primit pt a-l putea compara cu cel salvat in DB:
  let hashedToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex"); // verificationtoken este cel de sus primit in req.params

  //cautam user-ul care are acest token hasuit si la care token-ul nu a expirat ($gt: Date.now()):
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(
      400,
      "Acest link de confirmare nu mai este valid. Te rugăm să soliciți un nou e-mail de verificare.",
    );
  }

  //Daca gasim user-ul, curatam campurile de verificare si bifam isEmailVerified: true
  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;
  user.isEmailVerified = true;

  //salvam modificariile in DB (fara a decalnsa validarile de parola/nickname)
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, { isEmailVerified: true }, "Email is verified"));
});
///---END Verify Email---///

///---Resend Email Verification---///
//Folosim JWT
const resendEmailVerification = asyncHandler(async (req, res) => {
  //verificam daca userul e logat (prin JWT):
  const user = await User.findById(req.user?._id);

  if (!user) throw new ApiError(404, "Utilizatorul căutat nu există");

  if (user.isEmailVerified)
    throw new ApiError(409, "Adresa de e-mail a fost deja verificată");

  //verificam daca au fost mai mult de 2 cererri la fiecare 2 minute:
  const cooldownPeriod = 2 * 60 * 1000;
  if (
    user.emailVerificationExpiry &&
    user.emailVerificationExpiry - 15 * 60 * 1000 + cooldownPeriod > Date.now()
  ) {
    throw new ApiError(
      429,
      "Link-ul de verificare a fost deja trimis pe e-mail. Te rugăm să aștepți 2 minute înainte de a solicita unul nou",
    );
  }

  //generam token nou + expiry. Cream din nou cele 3 variabile din functia generateTemporaryToken() din user.models.js
  const { unhashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();

  //salvam token-ul nou in DB
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });

  if (!process.env.FRONTEND_URL) {
    throw new ApiError(
      500,
      "Eroare internă de server. Aplicația nu este configurată corect.",
    );
  }

  const verificationUrl = `${process.env.FRONTEND_URL}/pages/user/verify.html?token=${unhashedToken}`;

  await sendEmail({
    email: user.email,
    subject: "Please verify your email",
    mailgenContent: emailVerificationMailgenContent(
      user.nickname || "User", //in cazz ca lipseste nickname, folosim "user"
      verificationUrl,
    ),
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Email has been sent for verification"));
});
///---Resend Email Verification---///

///---Refresh Access Token---///
const refreshAccessToken = asyncHandler(async (req, res) => {
  // luam refresh Token din cookies sau din body(ex: mobile apps)
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(
      401,
      "Nu ai acces la această secțiune. Te rugăm să te autentifici din nou.",
    );
  }

  try {
    //verificam si decodam token-ul (daca e expirat jwt.verify va arunca o eroare):
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );

    //cautam user-ul in DB:
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    //Verificam daca token-ul primit (din cookies) este egal cu cel din DB:
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(
        401,
        "Sesiunea ta a expirat. Te rugăm să te autentifici din nou pentru a continua",
      );
    }

    //optiuni pt cookies:
    const options = getUserCookiesOptions();

    //Generăm un NOU access token + NOU refresh token cu generateAccessAndRefreshTokens() din models/users.models.js:
    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    //actualizam refreshtoken-ul in DB:
    // user.refreshToken = newRefreshToken;
    // await user.save(); //-> aceste date sunt deja salvate in DB in functia generateAccessAndRefreshToken() de mai sus

    //trimitem noile cookies + raspunsul catre client:
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(new ApiResponse(200, { accessToken }, "User token refreshed"));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      401,
      "Sesiunea ta a expirat. Te rugăm să te autentifici din nou pentru a continua",
    );
  }
});
///---End Refresh Access Token---///

////---Forgot password Request---/////
const forgotPasswordRequest = asyncHandler(async (req, res) => {
  //pt a completa cererea, userul trebuie doar sa adauge emailul:
  const { email } = req.body;

  //cautam userul in DB:
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(
      404,
      "Dacă există un cont asociat acestei adrese de e-mail, vom trimite un mesaj cu instrucțiuni pentru resetarea parolei",
      [],
    );
  }

  //generam token-ul temporar cu generateTemporaryToken()
  const {
    unhashedToken, //tokenul BRUT (merge în email)
    hashedToken, //tokenul HASH-uit (merge în DB)
    tokenExpiry, // momentul când expiră tokenul
  } = user.generateTemporaryToken();

  //salvam token-ul hash-uit in DB. Tokenul brut NU se salvează niciodată în DB (securitate)
  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });

  //trimitem emailul de resetare parola:
  await sendEmail({
    email: user?.email,
    subject: "Password reset request",
    mailgenContent: forgotPasswordMailgenContent(
      user.nickname,
      `${process.env.FORGOT_PASSWORD_REDIRECT_URL}${unhashedToken}`,
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
////---Forgot password Request---/////

///---Reset Forgot Password----///
const resetForgotPassword = asyncHandler(async (req, res) => {
  //luam token-ul de resetare din URL(primit prin email cand a facut cererea de forgot password):
  const { resetToken } = req.params;

  //user-ul trebuie sa completeze formularul cu parola noua +confirmare:
  const { newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "Parolele introduse nu coincid.");
  }

  //hash-uim token-ul primit in variabila resetToken
  let hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  //cautam in DB userul care are acest hashedToken si verificam sa nu fie expirat:
  const user = await User.findOne({
    forgotPasswordToken: hashedToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(
      401,
      "Link-ul de resetare a expirat sau este invalid. Te rugăm să soliciți unul nou.",
    );
  }

  //stergem tokenurile de resetare:
  user.forgotPasswordExpiry = undefined;
  user.forgotPasswordToken = undefined;

  //setam noua parola:
  user.password = newPassword;
  user.refreshToken = "";

  //salvam in DB:
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset successfully"));
});
///---Reset Forgot Password----///

///---Change Password---///
//e Nevoie de JWT
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "Parolele nu coincid");
  }

  //cautam user-ul in DB folosinf JWT.verify din middlewares/auth.middleware
  const user = await User.findById(req.user?._id);

  //verificam daca parola veche este corecta prim metoda isPasswordCorrect creata in user.models.js:
  const isPasswordValid = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordValid) {
    throw new ApiError(
      400,
      "Parolă incorectă. Dacă ai uitat vechea parolă, te rugăm să urmezi procedura „Recuperare parolă”",
    );
  }

  //setam noua parola:
  user.password = newPassword;
  user.refreshToken = "";

  //salvam in DB:
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});
///---END Change Password---///

///-Update Email ---///
const updateEmail = asyncHandler(async (req, res) => {
  const { loginPassword, newEmail } = req.body;

  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(
      401,
      "Sesiune invalidă. Utilizatorul nu a putut fi găsit",
    );
  }

  const isPasswordValid = await user.isPasswordCorrect(loginPassword);

  if (!isPasswordValid) {
    throw new ApiError(
      401,
      "Parolă incorectă. Dacă ai uitat vechea parolă, te rugăm să urmezi procedura „Recuperare parolă”",
    );
  }

  const normalizedNewEmail =
    typeof newEmail === "string" ? newEmail.trim().toLowerCase() : "";

  if (!normalizedNewEmail) {
    throw new ApiError(
      400,
      "Nu au fost detectate modificări pentru a fi salvate",
    );
  }

  const emailWillChange =
    normalizedNewEmail && normalizedNewEmail !== user.email;

  if (!emailWillChange) {
    throw new ApiError(
      400,
      "Nu au fost detectate modificări pentru a fi salvate",
    );
  }

  if (emailWillChange) {
    const verifyExistingUser = await User.findOne({
      email: normalizedNewEmail,
      _id: { $ne: user._id },
    });
    if (verifyExistingUser) {
      throw new ApiError(
        409,
        "Există deja un cont cu acest e-mail. Te rugăm să folosești o altă adresă",
      );
    }
    user.email = normalizedNewEmail;
    user.isEmailVerified = false;
  }

  const { unhashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;

  await user.save();

  if (!process.env.API_BASE_URL) {
    throw new ApiError(
      500,
      "Nu s-a putut stabili conexiunea cu serverul de date. Te rugăm să încerci mai târziu",
    );
  }

  const verificationUrl = `${process.env.API_BASE_URL}/user/verify-email/${unhashedToken}`;
  await sendEmail({
    email: user.email,
    subject: "Please verify your email",
    mailgenContent: emailVerificationMailgenContent(
      user.nickname || "User",
      verificationUrl,
    ),
  });
  ///

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { email: user.email },
        `Email updated, please check your new email ${user.email} in order to verify it`,
      ),
    );
});
///-END Update Email ---///

const changeNickname = asyncHandler(async (req, res) => {
  const { loginPassword, newNickname } = req.body;

  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(
      401,
      "Sesiune invalidă. Utilizatorul nu a putut fi găsit",
    );
  }

  if (user.authProvider === "local" || !user.authProvider) {
    if (!loginPassword) {
      throw new ApiError(
        400,
        "Este necesară introducerea parolei pentru a confirma modificările",
      );
    }

    const isPasswordValid = await user.isPasswordCorrect(loginPassword);

    if (!isPasswordValid) {
      throw new ApiError(
        401,
        "Parolă incorectă. Dacă ai uitat vechea parolă, te rugăm să urmezi procedura de recuperare a parolei",
      );
    }
  }

  const normalizedNewNickname =
    typeof newNickname === "string" ? newNickname.trim() : "";

  if (!normalizedNewNickname) {
    throw new ApiError(
      400,
      "Nu au fost detectate modificări pentru a fi salvate",
    );
  }

  const nicknameWillChange =
    normalizedNewNickname && normalizedNewNickname !== user.nickname;

  if (!nicknameWillChange) {
    throw new ApiError(
      400,
      "Nu au fost detectate modificări pentru a fi salvate",
    );
  }

  const checkForExistingNickname = await User.findOne({
    nickname: normalizedNewNickname,
    _id: { $ne: user._id },
  });

  if (checkForExistingNickname) {
    throw new ApiError(
      409,
      "Acest nickname este deja utilizat. Te rugăm să alegi altul",
    );
  }

  if (nicknameWillChange) {
    user.nickname = normalizedNewNickname;
  }

  await user.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { nickname: user.nickname },
        "Data successfully updated",
      ),
    );
});
///---END Change Nickname---///

///---Deactivate Account---///
const autoDeactivateAccount = asyncHandler(async (req, res) => {
  const { autoDeactivate, disabledUntil, reason } = req.body; //autoDeactivate = boolean

  if (!autoDeactivate)
    throw new ApiError(400, "Nu au fost detectate modificări");

  const user = await User.findById(req.user?._id);

  if (!user)
    throw new ApiError(
      401,
      "Te rugăm să te autentifici pentru a putea solicita dezactivarea contului",
    );

  if (user.role !== "user") throw new ApiError(403, "Acces neautorizat");

  user.deactivation.isDisabled = true;
  user.deactivation.reason = typeof reason === "string" ? reason.trim() : "";
  user.deactivation.disabledAt = new Date();
  user.deactivation.disabledByRole = "self";
  user.deactivation.disabledBy = user._id;

  if (disabledUntil) {
    const date = new Date(disabledUntil);

    if (Number.isNaN(date.getTime())) {
      throw new ApiError(400, "Formatul datei introduse este incorect");
    }

    user.deactivation.disabledUntil = date;
  } else {
    user.deactivation.disabledUntil = null; // permanent
  }

  user.refreshToken = "";

  await user.save();

  const options = getUserCookiesOptions();

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
      new ApiResponse(
        200,
        { isDisabled: true },
        "Account successfully deactivated",
      ),
    );
});
///---END Deactivate Account---///

export {
  registerUser,
  verifyEmail,
  login,
  logoutUser,
  getCurrentUser,
  resendEmailVerification,
  refreshAccessToken,
  forgotPasswordRequest,
  resetForgotPassword,
  changeCurrentPassword,
  updateEmail,
  changeNickname,
  autoDeactivateAccount,
};
