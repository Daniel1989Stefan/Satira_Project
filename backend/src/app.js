import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/error.middleware.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import { getSettings } from "./controllers/settings.controller.js";

const app = express();

app.use(express.json({ limit: "16kb" })); //se pot primi date de maxim 16kb
app.use(express.urlencoded({ extended: true, limit: "16kb" })); //se permite serverului să citească datele trimise prin formulare HTML clasice (cum este un formular de contact sau de login trimis direct dintr-un browser, fără să fie un obiect JSON).
app.use(express.static("public")); //transformă folderul numit public într-un spațiu accesibil oricui accesează site-ul tău, fără a mai trece prin rutele de autentificare sau controllere. In acest fel se pot folosii imaginile de pe server

////////////---Cookies---//////////////
app.use(cookieParser()); //When you use app.use(), you are telling Express to execute this function for every incoming request before it hits your route handlers.
//////////////--END Cookies--///////////

/////-----Cors configuration---////
app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",")
      : "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
  }),
);
/////-----END Cors configuration---////

///---Import And Use Routes---///
import authRouter from "./routes/user-auth.routes.js";
app.use("/user", authRouter);
///---END Import And Use Routes---///

///---Admin Routes----/////
import adminAuthRouter from "./routes/admin-routes.js";
app.use("/admin", adminAuthRouter);
///---END Admin Routes----/////

///---Co-Admin routes---///
import coAdminAuthRouter from "./routes/coAdmin-routes.js";
app.use("/co-admin", coAdminAuthRouter);
///---Co-Admin routes---///

////---partea de analythics---////
app.use("/analytics", analyticsRoutes);
////---END partea de analythics---////

app.get("/settings", getSettings);

app.get("/", (req, res) => {
  res.send(`The server is up and running`);
});

//pt rute inexistente (ACEASTA TREBUIE SĂ FIE DUPĂ TOATE RUTELE VALIDE)
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

//acest cod trebuie neaparat sa fie ultimul inaintea exportului (cod pt prevenirea dublului account (2 cereri cu acelasi email facut contemporan)

app.use(errorHandler);

export default app;
