// Configurează serviciul de trimitere email-uri prin Brevo și definește șabloanele (template-urile) pentru verificarea contului și resetarea parolei.

import Mailgen from "mailgen";
import nodemailer from "nodemailer";

export const sendEmail = async (options) => {
  // configurarea Mailgen pt design-ul mailului:
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "Ziarul Mincinos",
      link: process.env.FRONTEND_URL || "https://ziarulmincinos.ro",
      signature: "Echipa",
    },
  });

  // generatePlaintext -> if the client doesn't support HTML
  const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent);

  // in cazul in care clientul suporta HTML:
  const emailHTML = mailGenerator.generate(options.mailgenContent);

  // configurarea transporter-ului:
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mail = {
    // AICI E MODIFICAREA MAGICA:
    from: '"Ziarul Mincinos" <noreply@ziarulmincinos.ro>',
    to: options.email,
    subject: options.subject,
    text: emailTextual,
    html: emailHTML,
  };

  try {
    await transporter.sendMail(mail);
  } catch (error) {
    console.error(
      `Email service failed silently. Make sure that you provided your Brevo credentials in the .env file`,
    );
    console.error("Error: ", error);
  }
};

///////------Email Verification------////////
const emailVerificationMailgenContent = (fullname, verificationUrl) => {
  return {
    body: {
      name: fullname, // fullname sau nickname
      intro: "Vă mulțumim pentru utilizarea platformei noastre.",
      action: {
        instructions:
          "Pentru a-ți verifica adresa de e-mail, te rugăm să apeși pe butonul de mai jos:",
        button: {
          color: "#28a745",
          text: "Verifică adresa de e-mail",
          link: verificationUrl, // verificationUrl o sa fie valoarea introdusa cand apelam functia
        },
      },
      outro: "Ai nevoie de ajutor sau ai întrebări? Scrie-ne un e-mail.",
    },
  };
};
///////----END Email Verification-----////////

////----Email Forgot Password----///////
const forgotPasswordMailgenContent = (fullname, passwordResetUrl) => {
  return {
    body: {
      name: fullname,
      intro: "Am primit o cerere pentru resetarea parolei contului tău.",
      action: {
        instructions:
          "Pentru a-ți reseta parola, te rugăm să apeși pe butonul de mai jos.",
        button: {
          color: "#28a745",
          text: "Resetează parola",
          link: passwordResetUrl,
        },
      },
      outro:
        "Dacă nu ai solicitat această modificare, poți ignora acest email.",
    },
  };
};
////END----Email Forgot Password----///////

/////---Change Co-admin Password---///
const changeCoAdminPassword = (fullname, passwordResetUrl) => {
  return {
    body: {
      name: fullname,
      intro:
        "Te rugăm să îți schimbi parola pentru a putea accesa contul de administrare!",
      action: {
        instructions:
          "Pentru a-ți seta o nouă parolă, te rugăm să apeși pe butonul de mai jos.",
        button: {
          color: "#28a745",
          text: "Resetează parola",
          link: passwordResetUrl,
        },
      },
      outro:
        "Ai nevoie de ajutor sau ai întrebări? Te rugăm să contactezi administratorul principal.",
    },
  };
};
/////---END Change Co-admin Password---///

///---user reactivation by co-admin / admin---///
const accountReactivatedTemplate = (fullname, loginUrl) => {
  return {
    body: {
      name: fullname,
      intro:
        "Contul tău a fost reactivat cu succes de către echipa de moderare.",
      action: {
        instructions:
          "Te poți autentifica acum pentru a-ți relua activitatea pe platformă:",
        button: {
          color: "#28a745",
          text: "Autentifică-te Acum",
          link: loginUrl,
        },
      },
      outro: "Dacă ai întrebări, te rugăm să ne contactezi.",
      signature: "Cu respect",
    },
  };
};
///---user reactivation by co-admin / admin---///

export const sendEmailWithAttachment = async (options) => {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "Ziarul Mincinos",
      link: process.env.FRONTEND_URL || "https://ziarulmincinos.ro",
    },
  });

  const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent);
  const emailHTML = mailGenerator.generate(options.mailgenContent);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailExport = {
    // AICI E MODIFICAREA MAGICA:
    from: '"Ziarul Mincinos" <noreply@ziarulmincinos.ro>',
    to: options.email,
    subject: options.subject,
    text: emailTextual,
    html: emailHTML,
    attachments: [
      {
        filename: options.attachmentName || "date_export.json",
        content: options.attachmentContent, // Aici vine string-ul/buffer-ul JSON
        contentType: "application/json",
      },
    ],
  };

  try {
    await transporter.sendMail(mailExport);
    return true;
  } catch (error) {
    console.error("❌ Eroare la trimiterea email-ului cu atașament:", error);
    return false;
  }
};

export const dataExportTemplate = (userName) => {
  return {
    body: {
      name: userName,
      intro:
        "Atașat acestui email vei găsi arhiva cu datele tale personale pe care le-ai solicitat, conform regulamentului GDPR.",
      outro:
        "Fișierul este în format JSON. Dacă dorești ștergerea acestor date, poți face acest lucru direct din panoul de setări al contului tău.",
      signature: "Echipa",
    },
  };
};

export {
  forgotPasswordMailgenContent,
  emailVerificationMailgenContent,
  changeCoAdminPassword,
  accountReactivatedTemplate,
};
