import express from "express";
import {
  trackVisit,
  trackRefusal,
} from "../controllers/analytics.controller.js";

const router = express.Router();

// Ruta: POST /api/analytics/visit
router.post("/visit", trackVisit);

// Ruta: POST /api/analytics/refuse
router.post("/refuse", trackRefusal);

export default router;
