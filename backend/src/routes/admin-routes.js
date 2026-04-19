import { Router } from "express";
import {
  createAdminAccount,
  adminLogin,
  adminRefreshAccessToken,
  createCoAdmin,
  adminLogout,
  getCurrentUser,
  changeCurrentPassword,
  forgotPasswordRequest,
  changeTemporaryPassword,
  resetForgotPassword,
  resetCoAdminPassword,
  updatecoAdminEmail,
  updateCoAdminFullname,
  updateAdminEmail,
  updateAdminFullname,
  coAdminList,
  coAdmin,
  getAllUsers,
  disableAccount,
  disabledUsersList,
  disabledCoAdminList,
  reactivateAccount,
  updatePermissions,
} from "../controllers/admin-auth.controller.js";
import { validate } from "../middlewares/validator.middleware.js";
import {
  registeradminValidator,
  registerCoAdminValidator,
  loginValidator,
  changeCurrentPasswordValidator,
  forgotPasswordValidator,
  changeTemporaryPasswordValidator,
  changeForgotPasswordValidator,
  changeCoAdminEmailValidator,
  changeEmailValidator,
  changeFullnameValidator,
  changeCoAdminFullnameValidator,
  disableValidator,
  reactivateAccountValidator,
  editPermissionsValidator,
  createPostValidator,
} from "../validators/admin-auth.validator.js";
import {
  createPost,
  getAllPosts,
  deletePost,
  getPostById,
  getPostsByCategory,
  getUniqueCategories,
  updatePost,
} from "../controllers/post.controller.js";
import { adminVerifyJWT } from "../middlewares/admin-jwt.middleware.js";
import { strictAuthLimiter, authLimiter } from "../middlewares/rateLimit.js";
import { getAnalyticsStats } from "../controllers/analytics.controller.js";
import { updateSettings } from "../controllers/settings.controller.js";

import { upload } from "../middlewares/multer.middleware.js"; //pt cloud photo si video
import { requirePermission } from "../middlewares/permissions.middleware.js";

const router = Router();

router.post(
  "/create-admin-account",
  registeradminValidator(),
  validate,
  createAdminAccount,
);

router.post(
  "/login",
  strictAuthLimiter,
  loginValidator(),
  validate,
  adminLogin,
);

router.post("/admin-refresh-access-token", adminRefreshAccessToken);

router.post(
  "/admin-forgot-password",
  strictAuthLimiter,
  forgotPasswordValidator(),
  validate,
  forgotPasswordRequest,
);

router.patch(
  "/admin-reset-password/:resetToken",
  changeForgotPasswordValidator(),
  validate,
  resetForgotPassword,
);

router.patch(
  "/admin-change-temporary-password",
  changeTemporaryPasswordValidator(),
  validate,
  changeTemporaryPassword,
);

//////////////////////////////////
////---Rute protejate de Admin JWT---////
router.post(
  "/create-co-admin-account",
  adminVerifyJWT,
  registerCoAdminValidator(),
  validate,
  createCoAdmin,
);

router.post("/logout", adminVerifyJWT, adminLogout);

router.post("/current-user", adminVerifyJWT, getCurrentUser);

router.patch(
  "/change-password",
  strictAuthLimiter,
  adminVerifyJWT,
  changeCurrentPasswordValidator(),
  validate,
  changeCurrentPassword,
);

router.patch(
  "/reset-co-admin-password",
  adminVerifyJWT,
  forgotPasswordValidator(),
  validate,
  resetCoAdminPassword,
);

router.patch(
  "/change-co-admin-fullname",
  adminVerifyJWT,
  changeCoAdminFullnameValidator(),
  validate,
  updateCoAdminFullname,
);

router.patch(
  "/update-co-admin-email",
  adminVerifyJWT,
  changeCoAdminEmailValidator(),
  validate,
  updatecoAdminEmail,
);

router.patch(
  "/update-email",
  strictAuthLimiter,
  adminVerifyJWT,
  changeEmailValidator(),
  validate,
  updateAdminEmail,
);

router.patch(
  "/change-fullname",
  strictAuthLimiter,
  adminVerifyJWT,
  changeFullnameValidator(),
  validate,
  updateAdminFullname,
);
router.get("/all-co-admins", adminVerifyJWT, coAdminList);

router.get("/co-admin/:id", adminVerifyJWT, coAdmin);

router.patch(
  "/disable-account",
  adminVerifyJWT,
  disableValidator(),
  validate,
  disableAccount,
);

router.get("/all-users", adminVerifyJWT, getAllUsers);

router.get("/disabled-users-list", adminVerifyJWT, disabledUsersList);

router.get("/disabled-co-admin-list", adminVerifyJWT, disabledCoAdminList);

router.patch(
  "/reactivate-account",
  adminVerifyJWT,
  reactivateAccountValidator(),
  validate,
  reactivateAccount,
);

router.patch(
  "/edit-permissions",
  adminVerifyJWT,
  editPermissionsValidator(),
  validate,
  updatePermissions,
);

router.post(
  "/create-post",
  adminVerifyJWT,
  requirePermission("createPosts"),
  // MULTER INTERVINE AICI:
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "blockFiles", maxCount: 50 }, // Permitem până la 50 de poze/video-uri în interiorul unei postări
  ]),
  createPostValidator(),
  validate,
  createPost,
);

router.get("/all-posts", adminVerifyJWT, getAllPosts); //pt a vedea postarile de la 11 la 20 (a 2-a pagina cu postari): http://localhost:8000/api/v1/admin-auth/all-posts?page=2  SAU http://localhost:8000/api/v1/admin-auth/all-posts?page=2&limit=10

router.get("/post/:postId", adminVerifyJWT, getPostById);

router.get("/post-category/:category", adminVerifyJWT, getPostsByCategory);

router.get("/post-categories", adminVerifyJWT, getUniqueCategories);

router.delete(
  "/delete-post/:postId",
  adminVerifyJWT,
  requirePermission("deletePosts"),
  deletePost,
);

router.patch(
  "/edit-post/:postId",
  adminVerifyJWT,
  requirePermission("editPosts"),
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "blockFiles", maxCount: 50 },
  ]),
  updatePost,
);

// Ruta pentru a prelua statisticile (exemplu: /admin/analytics?days=30)
router.get("/analytics", adminVerifyJWT, getAnalyticsStats);

router.patch("/update-settings", adminVerifyJWT, updateSettings);

////---END Rute protejate de Admin JWT---////

export default router;
