import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/async-handler.js";

import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";

////---Api Pt verificarea rolului---///
//EX: ceea ce poate face adminul, nu e permis userlui
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    //verificam daca rolul userului (setat de verifyJWT) este in lista rolurilor permise
    if (!roles.includes(req.user.role)) {
      throw new ApiError(
        403,
        `Role ${req.user.role} is not authoorized to access this resource`,
      );
    }
    next();
  };
};
////---END Api Pt verificarea rolului---///

//VERIFICAM DACA EXISTA UN ADMIN: (nu e bun cod-ul)
// GET /api/v1/admin/status
export const getAdminStatus = asyncHandler(async (req, res) => {
  const exists = await User.exists({ role: "admin" });

  return res.status(200).json(new ApiResponse(200, { adminExists: !!exists }));
}); //pt frontend: dacă adminExists === false → redirect la /admin/create-account
