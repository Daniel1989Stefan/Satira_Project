import { Router } from "express";
import {
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
} from "../controllers/coAdmin-auth.controller.js";
import { validate } from "../middlewares/validator.middleware.js";
import {
  loginValidator,
  changePasswordValidator,
  changeCurrentPasswordValidator,
  disableValidator,
  reactivateAccountValidator,
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
import { upload } from "../middlewares/multer.middleware.js"; //pt cloud photo si video

import { strictAuthLimiter, authLimiter } from "../middlewares/rateLimit.js";
import { coAdminVerifyJWT } from "../middlewares/coAdmin-jwt.middleware.js";
import { requirePermission } from "../middlewares/permissions.middleware.js";

const router = Router();

router.post(
  "/reset-password/:resetToken",
  changePasswordValidator(),
  validate,
  resetPassword,
);

router.post(
  "/login",
  strictAuthLimiter,
  loginValidator(),
  validate,
  coAdminLogin,
);

router.post("/co-admin-refresh-access-token", refreshAccessToken);

///routes verificate cu JWT:
router.post("/logout", coAdminVerifyJWT, coAdminLogout);

router.post("/current-user", coAdminVerifyJWT, getCurrentUser);

router.post(
  "/change-password",
  strictAuthLimiter,
  coAdminVerifyJWT,
  changeCurrentPasswordValidator(),
  validate,
  changeCurrentPassword,
);

router.patch(
  "/disable-user",
  coAdminVerifyJWT,
  requirePermission("manageUsers"),
  disableValidator(),
  validate,
  disableUser,
);

router.patch(
  "/reactivate-user",
  coAdminVerifyJWT,
  requirePermission("manageUsers"),
  reactivateAccountValidator(),
  validate,
  reactivateUser,
);

router.patch(
  "/deactivate-co-admin",
  coAdminVerifyJWT,
  requirePermission("manageCoAdmins"),
  disableValidator(),
  validate,
  disableCoAdmin,
);

router.patch(
  "/reactivate-co-admin",
  coAdminVerifyJWT,
  requirePermission("manageCoAdmins"),
  reactivateAccountValidator(),
  validate,
  reactivateCoAdmin,
);

router.post(
  "/create-post",
  coAdminVerifyJWT,
  requirePermission("createPosts"),
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "blockFiles", maxCount: 20 },
  ]),
  createPostValidator(),
  validate,
  createPost,
);

router.get("/all-posts", coAdminVerifyJWT, getAllPosts); //pt a vedea postarile de la 11 la 20 (a 2-a pagina cu postari): http://localhost:8000/api/v1/admin-auth/all-posts?page=2  SAU http://localhost:8000/api/v1/admin-auth/all-posts?page=2&limit=10

router.get("/post/:postId", coAdminVerifyJWT, getPostById);

router.get("/post-category/:category", coAdminVerifyJWT, getPostsByCategory);

router.get("/post-categories", coAdminVerifyJWT, getUniqueCategories);

router.delete(
  "/delete-post/:postId",
  coAdminVerifyJWT,
  requirePermission("deletePosts"),
  deletePost,
);

router.patch(
  "/edit-post/:postId",
  coAdminVerifyJWT,
  requirePermission("editPosts"),
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "blockFiles", maxCount: 50 },
  ]),
  updatePost,
);

router.get(
  "/all-users",
  coAdminVerifyJWT,
  requirePermission("manageUsers"),
  getAllUsers,
);

router.get(
  "/all-co-admins",
  coAdminVerifyJWT,
  requirePermission("manageCoAdmins"),
  getAllCoAdmins,
);

export default router;
