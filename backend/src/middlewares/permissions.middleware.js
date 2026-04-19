import { ApiError } from "../utils/api-error.js";

// export const requirePermission = (permissionName) => {
//   return (req, res, next) => {
//     const user = req.user;

//     if (!user) {
//       return next(new ApiError(401, "Unauthorized"));
//     }

//     // Admin are acces total
//     if (user.role === "admin") {
//       return next();
//     }

//     // Co-admin trebuie să aibă permisiune
//     if (user.role === "co-admin") {
//       if (user.permissions && user.permissions[permissionName] === true) {
//         return next();
//       }
//       return next(
//         new ApiError(403, "You do not have the permission for this action"),
//       );
//     }

//     return next(
//       new ApiError(403, "You do not have permission for this action"),
//     );
//   };
// };

export const requirePermission = (permissionName) => {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      return next(new ApiError(401, "Unauthorized"));
    }

    if (user.role === "admin") {
      return next();
    }

    if (user.role === "co-admin") {
      if (user.permissions && user.permissions[permissionName] === true) {
        return next();
      }

      return next(
        new ApiError(403, "You do not have permission for this action"),
      );
    }

    return next(new ApiError(403, "Access denied for your role"));
  };
};
/* Folosirea in route:
router.patch(
  "/co-admins/:id/disable",
  adminVerifyJWT,
  requirePermission("manageCoAdmins"),
  disableUser
)

router.get(
  "/disabled-users-list",
  adminVerifyJWT, // 1. Verifică dacă e logat ca admin/co-admin 
  requirePermission("manageUsers"), // 2. Verifică dreptul specific 
  disabledUsersList // 3. Controllerul
);
  */
