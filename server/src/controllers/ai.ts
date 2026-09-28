import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import db from '../services/supabase/database';
import { processLectureWithAI } from '../services/aiPipeline';

/**
 * POST /api/lectures/:id/ai-process
 * Triggers Gemini AI pipeline to extract concepts, summary, explanations, flashcards, and quiz questions.
 */
export async function processLectureAI(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const { id } = req.params;

  try {
    const lecture = await db.getLectureById(id, req.user.id);
    if (!lecture) {
      res.status(404).json({ error: 'Lecture not found' });
      return;
    }

    if (lecture.status === 'AI_PROCESSING') {
      res.status(409).json({ error: 'AI processing is already in progress for this lecture.' });
      return;
    }

    const result = await processLectureWithAI(id, req.user.id);
    res.json(result);
  } catch (error: any) {
    console.error('processLectureAI error:', error);
    res.status(400).json({ error: error?.message || 'Failed to generate AI learning content.' });
  }
}

/**
 * GET /api/lectures/:id/concepts
 */
export async function getLectureConcepts(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const { id } = req.params;

  try {
    const lecture = await db.getLectureById(id, req.user.id);
    if (!lecture) {
      res.status(404).json({ error: 'Lecture not found' });
      return;
    }

    const concepts = await db.getConceptsByLecture(id);
    res.json({ concepts });
  } catch (error) {
    console.error('getLectureConcepts error:', error);
    res.status(500).json({ error: 'Failed to retrieve concepts' });
  }
}

/**
 * GET /api/lectures/:id/summary
 */
export async function getLectureSummary(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const { id } = req.params;

  try {
    const lecture = await db.getLectureById(id, req.user.id);
    if (!lecture) {
      res.status(404).json({ error: 'Lecture not found' });
      return;
    }

    res.json({ summary: lecture.summary || null });
  } catch (error) {
    console.error('getLectureSummary error:', error);
    res.status(500).json({ error: 'Failed to retrieve summary' });
  }
}

/**
 * GET /api/lectures/:id/flashcards
 */
export async function getLectureFlashcards(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const { id } = req.params;

  try {
    const lecture = await db.getLectureById(id, req.user.id);
    if (!lecture) {
      res.status(404).json({ error: 'Lecture not found' });
      return;
    }

    const flashcards = await db.getFlashcardsByLecture(id);
    res.json({ flashcards });
  } catch (error) {
    console.error('getLectureFlashcards error:', error);
    res.status(500).json({ error: 'Failed to retrieve flashcards' });
  }
}

/**
 * GET /api/lectures/:id/quiz
 * IMPORTANT: Excludes correctAnswer from questions sent to student before submission!
 */
export async function getLectureQuiz(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const { id } = req.params;

  try {
    const lecture = await db.getLectureById(id, req.user.id);
    if (!lecture) {
      res.status(404).json({ error: 'Lecture not found' });
      return;
    }

    const quizRes = await db.getQuizByLecture(id);
    if (!quizRes) {
      res.json({ quiz: null, questions: [] });
      return;
    }

    // Strip correct_answer and explanation before sending to student
    const safeQuestions = quizRes.questions.map((q) => ({
      id: q.id,
      quizId: q.quiz_id,
      conceptId: q.concept_id,
      question: q.question,
      options: q.options,
      difficulty: q.difficulty,
    }));

    res.json({
      quiz: {
        id: quizRes.quiz.id,
        title: quizRes.quiz.title,
        createdAt: quizRes.quiz.created_at,
      },
      questions: safeQuestions,
    });
  } catch (error) {
    console.error('getLectureQuiz error:', error);
    res.status(500).json({ error: 'Failed to retrieve quiz' });
  }
}

/**
 * GET /api/lectures/:id/learning-content
 * Aggregated endpoint returning all learning content for lecture learning page.
 */
export async function getLectureLearningContent(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const { id } = req.params;

  try {
    const lecture = await db.getLectureById(id, req.user.id);
    if (!lecture) {
      res.status(404).json({ error: 'Lecture not found' });
      return;
    }

    const [concepts, flashcards, quizRes] = await Promise.all([
      db.getConceptsByLecture(id),
      db.getFlashcardsByLecture(id),
      db.getQuizByLecture(id),
    ]);

    const safeQuestions = quizRes
      ? quizRes.questions.map((q) => ({
          id: q.id,
          quizId: q.quiz_id,
          conceptId: q.concept_id,
          question: q.question,
          options: q.options,
          difficulty: q.difficulty,
        }))
      : [];

    res.json({
      lecture: {
        id: lecture.id,
        title: lecture.title,
        youtubeUrl: lecture.youtube_url,
        status: lecture.status,
        duration: lecture.duration,
        summary: lecture.summary,
      },
      concepts,
      flashcards,
      quiz: quizRes
        ? {
            id: quizRes.quiz.id,
            title: quizRes.quiz.title,
            questions: safeQuestions,
          }
        : null,
    });
  } catch (error) {
    console.error('getLectureLearningContent error:', error);
    res.status(500).json({ error: 'Failed to retrieve learning content' });
  }
}
