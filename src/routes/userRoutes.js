import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import { getCurrentUser } from "../controllers/userControllers.js";

const router = express.Router();

router.get("/me", protectRoute, getCurrentUser);

export default router;
