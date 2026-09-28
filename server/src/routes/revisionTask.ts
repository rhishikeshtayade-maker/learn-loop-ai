import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getRevisionTasksController } from '../controllers/mastery';

const router = Router();

router.get('/', requireAuth, getRevisionTasksController);

export default router;
