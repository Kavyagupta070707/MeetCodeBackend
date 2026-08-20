import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  getOneVOneSessionById,
  matchOneVOneSession,
  submitOneVOneWin,
} from "../controllers/oneVOneControllers.js";

const router = express.Router();

router.post("/match", protectRoute, matchOneVOneSession);
router.post("/:id/submit-win", protectRoute, submitOneVOneWin);
router.get("/:id", protectRoute, getOneVOneSessionById);

export default router;
