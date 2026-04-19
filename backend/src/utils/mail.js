// Configurează serviciul de trimitere email-uri prin Mailtrap și definește șabloanele (template-urile) pentru verificarea contului și resetarea parolei.

import Mailgen from "mailgen";
import nodemailer from "nodemailer";

const sendEmail = async (options) => {
  //configurarea Mailgen pt design-ul mailuluui:
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "Proiect_Test",
      link: "https://taskmanagelink.com",
    },
  });

  //generatePlaintext -> if the client doesn't support HTML
  const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent);

  //in cazul in care clientul suporta HTML:
  const emailHTML = mailGenerator.generate(options.mailgenContent);

  //configurarea transporter-ului:
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mail = {
    from: "stefan.danca.dev@gmail.com", //adresa de email trebuie sa coincida cu cel de pe contul Brevo in asa fel incat sa nu existe eroari
    to: options.email,
    subject: options.subject,
    text: emailTextual,
    html: emailHTML,
  };

  try {
    await transporter.sendMail(mail);
  } catch (error) {
    console.error(
      `Email service failed silently. Make sure that you provided your MAILTRAP credentials in the .env file`,
    );
    console.error("Error: ", error);
  }
};

///////------Email Verification------////////
const emailVerificationMailgenContent = (fullname, verificationUrl) => {
  return {
    body: {
      name: fullname, //fullname sau nickname
      intro: "Vă mulțumim pentru utilizarea aplicației noastre.",
      action: {
        instructions:
          "Pentru a-ți verifica adresa de e-mail, te rugăm să apeși pe butonul de mai jos",
        button: {
          color: "#28a745",
          text: "Verifică adresa de e-mail",
          link: verificationUrl, //verificationUrl o sa fie valoarea introdusa cand apelam functia
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
          "Pentru a-ți reseta parola, te rugăm să apeși pe butonul sau linkul de mai jos.",
        button: {
          color: "#28a745",
          text: "Resetează parola",
          link: passwordResetUrl,
        },
      },
      outro: "Ai nevoie de ajutor sau ai întrebări? Scrie-ne un e-mail.",
    },
  };
};
////END----Email Forgot Password----///////

/////---Change Co-admin Password---///
const changeCoAdminPassword = (fullname, passwordResetUrl) => {
  return {
    body: {
      name: fullname,
      intro: "Te rugăm să îți schimbi parola pentru a putea accesa contul!",
      action: {
        instructions:
          "Pentru a-ți reseta parola, te rugăm să apeși pe butonul sau linkul de mai jos.",
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

export {
  forgotPasswordMailgenContent,
  emailVerificationMailgenContent,
  sendEmail,
  changeCoAdminPassword,
};
