import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getDashboard } from '../controllers/dashboard';

const router = Router();

router.get('/', requireAuth, getDashboard);

export default router;
