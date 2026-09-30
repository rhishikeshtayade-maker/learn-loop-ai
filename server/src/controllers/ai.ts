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
        errorMessage: lecture.error_message,
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
/**
 * POST /api/lectures/:id/quiz/start
 * Creates a new quiz attempt for the authenticated user.
 */
export async function startQuizAttempt(
  req: AuthRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const { id } = req.params;

  try {
    // Verify lecture ownership
    const lecture = await db.getLectureById(id, req.user.id);

    if (!lecture) {
      res.status(404).json({ error: 'Lecture not found' });
      return;
    }

    // Get quiz
    const quizRes = await db.getQuizByLecture(id);

    if (!quizRes) {
      res.status(404).json({ error: 'Quiz not found for this lecture' });
      return;
    }

    if (!quizRes.questions.length) {
      res.status(400).json({ error: 'Quiz has no questions' });
      return;
    }

    // Create attempt
    const attempt = await db.createQuizAttempt(
      req.user.id,
      quizRes.quiz.id
    );

    res.status(201).json({
      success: true,
      attempt: {
        id: attempt.id,
        quizId: attempt.quiz_id,
        startedAt: attempt.started_at,
      },
    });
  } catch (error: any) {
    console.error('startQuizAttempt error:', error);

    res.status(500).json({
      error: error?.message || 'Failed to start quiz attempt',
    });
  }
}

/**
 * POST /api/quiz-attempts/:attemptId/submit
 * Grades and completes a quiz attempt.
 */
export async function submitQuizAttempt(
  req: AuthRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const { attemptId } = req.params;

  try {
    const answers = req.body?.answers;

    if (!Array.isArray(answers)) {
      res.status(400).json({
        error: 'answers must be an array',
      });
      return;
    }

    // Validate basic answer structure
    for (const answer of answers) {
      if (
        !answer ||
        typeof answer.questionId !== 'string' ||
        !(typeof answer.selectedAnswer === 'string' || Number.isInteger(answer.selectedAnswer))
      ) {
        res.status(400).json({
          error: 'Each answer must contain questionId and selectedAnswer',
        });
        return;
      }
    }

    const result = await db.submitQuizAttempt(
      attemptId,
      req.user.id,
      answers
    );

    res.json({
      success: true,
      result: {
        attemptId: result.attempt.id,
        quizId: result.attempt.quiz_id,
        score: result.score,
        correctAnswers: result.correctAnswers,
        totalQuestions: result.totalQuestions,
      },
    });
  } catch (error: any) {
    console.error('submitQuizAttempt error:', error);

    const message = error?.message || 'Failed to submit quiz';

    if (
      message === 'Quiz attempt not found' ||
      message === 'Quiz attempt has already been submitted' ||
      message === 'Invalid question submitted' ||
      message === 'Invalid answer option submitted' ||
      message === 'Duplicate question answer submitted' ||
      message === 'Please answer all questions before submitting'
    ) {
      res.status(400).json({ error: message });
      return;
    }

    res.status(500).json({
      error: 'Failed to submit quiz',
    });
  }
}

/**
 * GET /api/quiz-attempts/:attemptId/result
 * Returns the authenticated user's quiz result.
 */
export async function getQuizAttemptResult(
  req: AuthRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const { attemptId } = req.params;

  try {
    const result = await db.getQuizAttemptResult(
      attemptId,
      req.user.id
    );

    if (!result) {
      res.status(404).json({
        error: 'Quiz attempt not found or not completed yet',
      });
      return;
    }

    res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('getQuizAttemptResult error:', error);

    res.status(500).json({
      error: 'Failed to retrieve quiz result',
    });
  }
}