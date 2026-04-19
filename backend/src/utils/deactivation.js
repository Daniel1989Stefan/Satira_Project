/**
 * - Dacă userul nu e disabled => returnează userul (ok)
 * - Dacă e disabled și disabledUntil a expirat => reactivează și salvează
 * - Dacă e disabled și încă nu a expirat / e permanent => aruncă 403
 */

import { ApiError } from "./api-error.js";

export const ensureActiveAccount = async (user) => {
  const deact = user?.deactivation; //verific daca userul (sau co-admin-ul) e deactivat

  if (!deact?.isDisabled) return user;

  const until = deact.disabledUntil;

  // dacă are termen și a expirat -> auto-reactivare
  if (until && until <= new Date()) {
    deact.isDisabled = false;
    deact.disabledUntil = null;
    deact.disabledAt = null;
    deact.disabledBy = null;
    deact.disabledByRole = null;
    deact.reason = null;

    await user.save({ validateBeforeSave: false });
    return user;
  }

  // încă e dezactivat (permanent sau până la o dată viitoare)
  throw new ApiError(403, "Account is disabled");
};
