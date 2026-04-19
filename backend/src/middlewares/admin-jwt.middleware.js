import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";

const adminVerifyJWT = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.adminAccessToken;

  if (!token) {
    throw new ApiError(401, "Unauthorized. Admin token missing");
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const admin = await User.findById(decoded?._id).select(
      "-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry",
    );

    if (!admin) {
      throw new ApiError(401, "Invalid admin token. Admin not found.");
    }

    if (admin.role !== "admin") {
      throw new ApiError(403, "Not an admin account.");
    }

    req.user = admin;
    next();
  } catch (err) {
    throw new ApiError(401, "Invalid or expired admin access token");
  }
});

export { adminVerifyJWT };
