// Conține verifyJWT, un filtru care verifică dacă utilizatorul este autentificat prin validarea Access Token-ului din cookies sau headers înainte de a permite accesul la rutele protejate.

import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import jwt from "jsonwebtoken";
import { ensureActiveAccount } from "../utils/deactivation.js";

/*verificare se face in felul urm: 
1. se iau cookies care contin refreshToken decodad, 2.se verifica token-ul dar si variabila de mediu ACCESS_TOKEN_SECRET, 3.dupa verificare se cauta user-ul iin DB (care contine token--ul priimit din cookies)
*/
export const verifyJWT = asyncHandler(async (req, res, next) => {
  //extragem token-ul din cookies sau din header-ul Authorization:
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Unaothorized request. No token provided.");
  }

  try {
    //decodam token-ul folosind .env
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    //cautam userul in DB si excludem campurile sensibile:
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken -emailVerificationToken -emailVerificationExpiry",
    );

    if (!user) {
      throw new ApiError(401, "Invalid access token. User not found");
    }
    if (user.role !== "user") {
      throw new ApiError(403, "You are not authorized to this resource");
    }

    await ensureActiveAccount(user); //verificarea daca user-ul e disabled sau nu

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});
