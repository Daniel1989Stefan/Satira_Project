import { Router } from "express";
import {
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
  googleAuthLogin,
} from "../controllers/user-auth.controller.js";
import { validate } from "../middlewares/validator.middleware.js";
import { verifyJWT } from "../middlewares/user-jwt.auth.middleware.js";
import {
  userRegisterValidator,
  userLoginValidator,
  userChangeCurrentPasswordValidator,
  userForgotPasswordValidator,
  userResetForgotPasswordValidator,
  changeEmailValidator,
  changeNicknameValidator,
  autoDeactivationAccountValidator,
} from "../validators/auth.validators.js";
import {
  strictAuthLimiter, //5 incercari la fiecare 15 min
  authLimiter, //15 incercari la fiecare 15 min
  emailResendLimiter, // o incercare la fiecare 2 min
} from "../middlewares/rateLimit.js";
const router = Router();
import {
  getAllPosts,
  getPostById,
  getPostsByCategory,
  getUniqueCategories,
  toggleVotePost,
} from "../controllers/post.controller.js";

//Unsecure Routes:
router.post("/register", userRegisterValidator(), validate, registerUser); //checked

router.post("/login", strictAuthLimiter, userLoginValidator(), validate, login); // de pus inapoi strictAuthLimiter,

router.route("/auth/google").post(googleAuthLogin);

router.get("/verify-email/:verificationToken", verifyEmail); //checked

router.post("/refresh-token", refreshAccessToken); //checked

router.post(
  "/forgot-password",
  userForgotPasswordValidator(),
  validate,
  forgotPasswordRequest,
); //checked

router.post(
  "/reset-password/:resetToken",
  userResetForgotPasswordValidator(),
  validate,
  resetForgotPassword,
); //checked

router.get("/all-posts", getAllPosts); //pt a vedea postarile de la 11 la 20 (a 2-a pagina cu postari): http://localhost:8000/api/v1/admin-auth/all-posts?page=2  SAU http://localhost:8000/api/v1/admin-auth/all-posts?page=2&limit=10

router.get("/post/:postId", getPostById);

router.get("/post-category/:category", getPostsByCategory);

router.get("/post-categories", getUniqueCategories);

////////////////////---///////////////////////
//Secure Routes:
router.post("/logout", verifyJWT, logoutUser); //checked

router.post("/current-user", verifyJWT, getCurrentUser); //checked

router.patch(
  "/change-password",
  authLimiter,
  verifyJWT,
  userChangeCurrentPasswordValidator(),
  validate,
  changeCurrentPassword,
); //checked

router.post(
  "/resend-email-verification",
  verifyJWT,
  emailResendLimiter,
  resendEmailVerification,
); //checked

router.patch(
  "/update-email",
  authLimiter,
  verifyJWT,
  changeEmailValidator(),
  validate,
  updateEmail,
);

router.patch(
  "/change-nickname",
  authLimiter,
  verifyJWT,
  changeNicknameValidator(),
  validate,
  changeNickname,
);

router.patch(
  "/auto-deactivate-account",
  verifyJWT,
  autoDeactivationAccountValidator(),
  validate,
  autoDeactivateAccount,
);

router.post("/:postId/vote", verifyJWT, toggleVotePost);

export default router;
