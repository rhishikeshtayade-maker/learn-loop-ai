import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  createLecture,
  getLectures,
  getLectureById,
  processLecture,
  deleteLecture,
} from '../controllers/lecture';

const router = Router();

router.post('/', requireAuth, createLecture);
router.get('/', requireAuth, getLectures);
router.get('/:id', requireAuth, getLectureById);
router.post('/:id/process', requireAuth, processLecture);
router.delete('/:id', requireAuth, deleteLecture);

export default router;
