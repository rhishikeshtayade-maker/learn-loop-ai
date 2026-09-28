import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { submitQuizAttempt, getQuizAttemptResult } from '../controllers/ai';

const router = Router();

router.post('/:attemptId/submit', requireAuth, submitQuizAttempt);
router.get('/:attemptId/result', requireAuth, getQuizAttemptResult);

export default router;
