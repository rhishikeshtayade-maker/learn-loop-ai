import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  createLecture,
  getLectures,
  getLectureById,
  processLecture,
  deleteLecture,
} from '../controllers/lecture';
import {
  processLectureAI,
  getLectureConcepts,
  getLectureSummary,
  getLectureFlashcards,
  getLectureQuiz,
  getLectureLearningContent,
} from '../controllers/ai';

const router = Router();

router.post('/', requireAuth, createLecture);
router.get('/', requireAuth, getLectures);
router.get('/:id', requireAuth, getLectureById);
router.post('/:id/process', requireAuth, processLecture);
router.delete('/:id', requireAuth, deleteLecture);

// Phase 4 AI Endpoints
router.post('/:id/ai-process', requireAuth, processLectureAI);
router.get('/:id/concepts', requireAuth, getLectureConcepts);
router.get('/:id/summary', requireAuth, getLectureSummary);
router.get('/:id/flashcards', requireAuth, getLectureFlashcards);
router.get('/:id/quiz', requireAuth, getLectureQuiz);
router.get('/:id/learning-content', requireAuth, getLectureLearningContent);

export default router;
