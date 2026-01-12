import { protectRoute } from '../middleware/protectRoute.js';
import express from "express";
import { getStreamtoken } from '../controllers/chatController.js';
const router =express.Router();

router.get('/token',protectRoute,getStreamtoken);

export default router;