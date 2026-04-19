import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { ensureActiveAccount } from "../utils/deactivation.js";

export const coAdminVerifyJWT = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.coAdminAccessToken; //coAdminAccessToken il luam din cookiurile din login (coAdminAccessToken / coAdminRefreshToken)

  if (!token) {
    throw new ApiError(401, "Unauthorized. Co-Admin token missing");
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const coAdmin = await User.findById(decoded?._id).select(
      "-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry",
    );

    if (!coAdmin) {
      throw new ApiError(401, "Invalid co-admin token. Co-admin not found.");
    }

    if (coAdmin.role !== "co-admin") {
      throw new ApiError(403, "Not an co-admin account.");
    }

    await ensureActiveAccount(coAdmin); //verificarea daca co-admin e disabled sau nu

    req.user = coAdmin;
    next();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, "Invalid or expired co-admin access token");
  }
});
