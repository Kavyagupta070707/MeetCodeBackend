import express from 'express';
import { protectRoute } from '../middleware/protectRoute.js';
import { createSession, getActiveSessions, getPastSessions, getSessionById, joinSessionByCode, endSession } from '../controllers/sessionControllers.js';

const router = express.Router();

router.post('/',protectRoute,createSession)
router.get('/active',protectRoute,getActiveSessions)
router.get('/past-sessions',protectRoute,getPastSessions)
router.post('/join',protectRoute,joinSessionByCode)
router.post('/:id/end',protectRoute,endSession)
router.get('/:id',protectRoute,getSessionById)

export default router;
