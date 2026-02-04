import express from "express";
import { getGameById, getHistory } from "../controllers/gameController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/history", requireAuth, getHistory);
router.get("/:id", requireAuth, getGameById);

export default router;
