import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getConceptMasteryController } from '../controllers/mastery';

const router = Router();

router.get('/', requireAuth, getConceptMasteryController);

export default router;
