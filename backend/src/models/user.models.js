import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"; //se foloseste pt Token care este folosit pt autentificare
import crypto from "crypto";
import { firstUpperLetter } from "../utils/string.js";

export const CO_ADMIN_PERMISSIONS_LIST = [
  "manageUsers",
  "manageCoAdmins",
  "createPosts",
  "editPosts",
  "deletePosts",
];

// Construim obiectul pentru Schema în mod dinamic
const permissionFields = {};
CO_ADMIN_PERMISSIONS_LIST.forEach((permission) => {
  permissionFields[permission] = { type: Boolean, default: false };
});

// Creăm schema folosind obiectul generat mai sus
const coAdminPermissionsSchema = new Schema(
  permissionFields,
  { _id: false }, //
);

const userSchema = new Schema(
  {
    //id-ul este generat automat
    avatar: {
      type: {
        url: String,
        localPath: String,
      },
      default: {
        url: `https://placehold.co/200x200`,
        localPath: "",
      },
    },
    fullname: {
      type: String,
      required: function () {
        // Returnează true (deci devine obligatoriu) doar dacă rolul este admin sau co-admin
        return this.role === "admin" || this.role === "co-admin";
      }, // AICI este menționată obligativitatea condiționată:
    },
    nickname: {
      type: String,
      trim: true,
      unique: true,
      sparse: true, // Permite ca adminii să nu aibă nickname fără a genera erori de unicitate
      required: function () {
        return this.role === "user";
      },
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    role: {
      type: String,
      enum: ["admin", "co-admin", "user"],
      default: "user",
    },
    isEmailVerified: {
      //arata daca emailul e verificat sau nu
      type: Boolean,
      default: false,
    },
    refreshToken: {
      //odata ce expira accessToken, dam refresh in asa fel ca sa-l salvam in coookies pt logare automata. Nu salvăm Refresh Token-ul din nou, ci îl folosim pe cel existent pentru a genera un Access Token proaspăt.
      type: String,
    },
    forgotPasswordToken: {
      //este folosit în Faza de Recuperare a Contului. Serverul verifică dacă email-ul există în baza de date. Dacă există, se generează un string aleatoriu și unic (acesta este forgotPasswordToken). Acest token este salvat în baza de date
      type: String,
    },
    forgotPasswordExpiry: {
      //odata ce a fost creata cerererea de forgotPassword, acesta are timp llimita in care sa se ppoata schimba parola
      type: Date,
    },
    emailVerificationToken: {
      //odata ce se creaza account-ul, este trimis un email de verificare in care exista un token.
      type: String,
    },
    emailVerificationExpiry: {
      type: Date,
    }, //odata trimis emailul pt verificare, are un timp limitat pt a-l verifica
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    changePasswordToken: {
      //este folosit pt schimbarea parolei prin email la co-admin
      type: String,
    },
    changePasswordExpiry: {
      type: Date,
    },
    deactivation: {
      isDisabled: {
        type: Boolean,
        default: false,
      },
      disabledByRole: {
        type: String,
        enum: ["self", "admin", "co-admin"],
      },
      disabledBy: { type: Schema.Types.ObjectId, ref: "User" },
      reason: { type: String, trim: true },
      disabledAt: { type: Date },
      disabledUntil: { type: Date }, //in cazul in care se doreaste auto-reactivarea
    },
    authProvider: {
      type: String,
      enum: ["local", "google", "facebook"],
      default: "local",
    },
    permissions: {
      type: coAdminPermissionsSchema,
      default: undefined, // nu apare la user normal
      validate: {
        validator: function (val) {
          if (this.role !== "co-admin") return val == null; //daca rolul nu e co-admin, returneaza null
          return true;
        },
        message: "permissions can exist only for co-admin accounts",
      },
    },
  },
  {
    timestamps: true, //arata cand documentul a fost creat si cand a fost actualizat
  },
);

//Un singur user poate avea role === "admin":
userSchema.index(
  { role: 1 },
  {
    unique: true,
    partialFilterExpression: { role: "admin" },
  },
);

userSchema.pre("validate", async function () {
  if (this.role !== "co-admin") {
    this.permissions = undefined;
  } else if (!this.permissions) {
    this.permissions = {};
  }

  if (this.fullname) {
    this.fullname = firstUpperLetter(this.fullname);
  }

  if (this.isNew || this.isModified("nickname")) {
    let baseNickname = "";

    if (this.nickname) {
      baseNickname = firstUpperLetter(this.nickname.trim());
    } else if (this.role === "user") {
      baseNickname = firstUpperLetter(this.email.split("@")[0]);
    }

    if (baseNickname) {
      let finalNickname = baseNickname;
      let exists = await this.constructor.findOne({
        nickname: finalNickname,
        _id: { $ne: this._id },
      });

      if (exists) {
        const suffix = crypto.randomBytes(2).toString("hex"); // ex: "4f2a"
        finalNickname = `${baseNickname}_${suffix}`;
      }
      this.nickname = finalNickname;
    }
  }
});

//.pre(save) este un middleware de tip "hook". Aici sunt ajustate unele lucruri inainte de a fi salvate in DB. EX: Criptam parola
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 10);
}); // Odata ce trece acest middleware, lucrurile sunt salvate in DB automat

//verificarea parolei daca a fost introdusa corect:
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
}; //returneaza true sal false. Ia parola care o sa fie introdusa ca si argument si o sa faca comparatia cu parola din DB (this.password)

//generarea Tokenului
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      role: this.role,
    }, //acesta este 'payload'-ul si reprezinta datele care o sa fie memorate in token
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY },
  );
};

//refresh Token:
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    }, //acesta este payload-ul.
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY },
  );
};

//token cu crypto
//folosit pt: Resetarea Parolei/Verificarea Email-ului/Schimbarea datelor sensibile
userSchema.methods.generateTemporaryToken = function () {
  //generam un sir de caractere aletariu:
  const unhashedToken = crypto.randomBytes(20).toString("hex");

  //criptarea Tokenului(acesta va fi salavat in DB):
  const hashedToken = crypto
    .createHash("sha256")
    .update(unhashedToken)
    .digest("hex");

  //Se seteaza in cat timp expira acest token(15 min):
  const tokenExpiry = Date.now() + 15 * 60 * 1000;

  return { unhashedToken, hashedToken, tokenExpiry };

  //unhashedToken -> in link-ul de email si req.body cand se trimite formularul de resetare
  //hashedToken -> Stocare în MongoDB/Verificare(Când userul vine cu unhashedToken din email, serverul îl hashează pe loc și verifică dacă rezultatul se potrivește cu hashedToken salvat în DB.)/Protecție la Database Leak
  //tokenExpiry -> Validare în Controller (Înainte de a schimba parola, serverul verifică: if (Date.now() > user.tokenExpiry). Dacă timpul a trecut, cererea este respinsă.)
};

export const User = mongoose.model("User", userSchema);
