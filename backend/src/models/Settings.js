import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    cookieText: { type: String, default: "Respectăm intimitatea ta!..." },
    disclaimerText: {
      type: String,
      default: "Acesta este un proiect de satiră...",
    },

    // Secțiunea Susține Proiectul
    supportTitle: { type: String, default: "Susține Proiectul" },
    supportDescription: {
      type: String,
      default:
        "Salut! Dacă vrei să susții costurile de server, o cafea e mereu binevenită!",
    },

    // Secțiunea Copyright
    copyrightText: {
      type: String,
      default: "© 2026 Ziarul cu Minciuni. Toate drepturile rezervate.",
    },

    contact: {
      email: { type: String, default: "stefan.danca.dev@gmail.com" },
      phone: { type: String, default: "" },
      website: { type: String, default: "" },
    },

    termsAndConditionsText: {
      type: String,
      default: "1. Natura Platformei... \n\n2. Eligibilitate...",
    },
    privacyPolicyText: {
      type: String,
      default: "1. Cine suntem... \n\n2. Ce date colectăm...",
    },
    cookiePolicyText: {
      type: String,
      default: "1. Ce sunt cookie-urile... \n\n2. Ce tipuri folosim...",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Settings", settingsSchema);
