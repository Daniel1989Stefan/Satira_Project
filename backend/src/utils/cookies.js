export const getAdminCookiesOptions = () => {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: isProd ? "strict" : "lax",
    path: "/", // IZOLARE: cookies admin doar pe admin routes
  };
}; //path: "/admin"

export const getCoAdminCookiesOptions = () => {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: isProd ? "strict" : "lax",
    path: "/", //path: "/co-admin"
  };
};

export const getUserCookiesOptions = () => {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: isProd ? "strict" : "lax",
    path: "/", // IZOLARE: cookies admin doar pe admin routes
  };
}; //de pus inapot path: "/user"

export const googleUserCookiesOptions = () => {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: isProd ? "strict" : "lax",
    path: "/",
  };
};
