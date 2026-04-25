const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:8000"
    : "https://satira-backend-api.onrender.com";

async function fetchAPI(endpoint, options = {}, isRetry = false) {
  try {
    const headers = { ...options.headers };

    if (options.body && options.body instanceof FormData) {
      delete headers["Content-Type"];
    } else {
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
    }

    options.credentials = "include";

    let response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: headers,
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = { message: "Eroare la parsarea răspunsului." };
    }

    const errorMessage = (data.message || "").toLowerCase();
    const isTokenError =
      response.status === 401 ||
      errorMessage.includes("jwt expired") ||
      errorMessage.includes("token");

    // Definim rutele unde INTERCEPTORUL NU TREBUIE SĂ INTERVINĂ
    const isAuthRoute =
      endpoint.includes("/login") ||
      endpoint.includes("/register") ||
      endpoint.includes("/forgot-password") ||
      endpoint.includes("/reset-password") ||
      endpoint.includes("/verify-email");

    if (!response.ok && isTokenError && !isRetry && !isAuthRoute) {
      let refreshRoute = "/user/refresh-token";

      if (endpoint.startsWith("/admin")) {
        refreshRoute = "/admin/admin-refresh-access-token";
      } else if (endpoint.startsWith("/co-admin")) {
        refreshRoute = "/co-admin/co-admin-refresh-access-token";
      }

      try {
        const refreshResponse = await fetch(`${API_BASE_URL}${refreshRoute}`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (refreshResponse.ok) {
          return await fetchAPI(endpoint, options, true);
        } else {
          throw new Error("Refresh eșuat.");
        }
      } catch (refreshError) {
        throw new Error(
          "Eroare de token: Sesiunea a expirat sau utilizatorul nu este autentificat.",
        );
      }
    }

    if (!response.ok) {
      throw new Error(
        data.message || "A apărut o problemă la comunicarea cu serverul.",
      );
    }

    return data;
  } catch (error) {
    if (error.message === "Failed to fetch" || error.name === "TypeError") {
      throw new Error(
        "Conexiune refuzată. Serverul pare a fi oprit sau inaccesibil.",
      );
    }

    throw error;
  }
}

// ==========================================
// UTILITARE PENTRU ANALYTICS
// ==========================================

/**
 * Generează un ID unic simplu pentru vizitator (UUID v4 simplificat)
 */
function generateVisitorId() {
  return (
    "user_" +
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}
