import { ApiError } from "./api-error.js";

/**
 * Utilitar pentru a verifica dacă un cont este activ.
 * Aruncă o eroare dacă contul este suspendat de un Admin/Co-Admin
 * și pedeapsa nu a expirat.
 */
export const ensureActiveAccount = async (user) => {
  if (!user) {
    throw new ApiError(404, "Utilizatorul nu a fost găsit.");
  }

  // Verificăm dacă există flag-ul de dezactivare
  if (user.deactivation?.isDisabled) {
    if (user.deactivation.disabledByRole === "self") {
      throw new ApiError(
        403,
        "Contul tău este în pauză. Te rugăm să te reconectezi (Login) pentru a-l reactiva.",
      );
    }

    // Dacă a fost suspendat ca formă de SANCȚIUNE de către echipa de administrare:
    if (
      user.deactivation.disabledByRole === "admin" ||
      user.deactivation.disabledByRole === "co-admin"
    ) {
      const cineL_aBlocat =
        user.deactivation.disabledByRole === "admin"
          ? "Administrator"
          : "Co-Administrator";
      const motiv = user.deactivation.reason || "Nespecificat";
      const now = new Date();

      // a. Sancțiune permanentă
      if (!user.deactivation.disabledUntil) {
        throw new ApiError(
          403,
          `Accesul tău a fost revocat definitiv de către un ${cineL_aBlocat}. Motiv: ${motiv}`,
        );
      }

      // b. Sancțiune temporară care încă este activă
      if (new Date(user.deactivation.disabledUntil) > now) {
        const d = new Date(user.deactivation.disabledUntil);
        const formattedDate = d.toLocaleDateString("ro-RO", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
        throw new ApiError(
          403,
          `Contul tău este suspendat de un ${cineL_aBlocat} până pe ${formattedDate}. Motiv: ${motiv}`,
        );
      }
    }
  }

  return true;
};
