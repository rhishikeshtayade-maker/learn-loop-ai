import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import db from '../services/supabase/database';
import { processLectureWithAI } from '../services/aiPipeline';
import { isAnswerMatch } from '../utils/answerMatch';
import geminiService from '../services/gemini/gemini.service';

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

/**
 * POST /api/lectures/:id/quiz/check-answer
 * Checks an individual answer immediately and returns whether it is right/wrong,
 * the correct answer, and the full explanation.
 */
export async function checkQuizAnswer(
  req: AuthRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const { id } = req.params;
  const { questionId, selectedAnswer } = req.body;

  if (!questionId || selectedAnswer === undefined || selectedAnswer === null) {
    res.status(400).json({ error: 'questionId and selectedAnswer are required' });
    return;
  }

  try {
    const lecture = await db.getLectureById(id, req.user.id);
    if (!lecture) {
      res.status(404).json({ error: 'Lecture not found' });
      return;
    }

    const quizRes = await db.getQuizByLecture(id);
    if (!quizRes || !quizRes.questions.length) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }

    const question = quizRes.questions.find((q) => q.id === questionId);
    if (!question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    const correctIdx = question.correct_answer;
    const correctText = question.options?.[correctIdx] || '';

    const isCorrect = isAnswerMatch(selectedAnswer, correctText, question.options, correctIdx);

    res.json({
      success: true,
      isCorrect,
      correctAnswer: correctIdx,
      correctAnswerText: correctText,
      explanation: question.explanation,
    });
  } catch (error: any) {
    console.error('checkQuizAnswer error:', error);
    res.status(500).json({ error: 'Failed to check answer' });
  }
}

/**
 * GET /api/lectures/:id/knowledge-graph
 * Returns concept nodes with mastery status, directed relationship edges,
 * and detected knowledge gaps for the authenticated user.
 */
export async function getLectureKnowledgeGraph(
  req: AuthRequest,
  res: Response
): Promise<void> {
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
    if (!concepts || concepts.length === 0) {
      res.json({
        success: true,
        lectureId: id,
        lectureTitle: lecture.title,
        nodes: [],
        edges: [],
        knowledgeGaps: [],
        stats: {
          totalConcepts: 0,
          totalRelationships: 0,
          masteredCount: 0,
          developingCount: 0,
          weakCount: 0,
          untestedCount: 0,
          knowledgeGapCount: 0,
        },
      });
      return;
    }

    // 1. Fetch user's concept mastery
    const userMastery = await db.getConceptMastery(req.user.id);
    const masteryMap = new Map<string, any>();
    for (const m of userMastery) {
      masteryMap.set(m.concept_id, m);
    }

    // 2. Fetch or generate concept relationships
    let relationships = await db.getConceptRelationships(id);
    if ((!relationships || relationships.length === 0) && concepts.length >= 2 && lecture.transcript) {
      try {
        const generated = await geminiService.generateConceptRelationships(
          lecture.transcript,
          concepts.map((c) => ({ id: c.id, name: c.name, description: c.description }))
        );
        if (generated.length > 0) {
          relationships = await db.saveConceptRelationships(id, generated);
        }
      } catch (genErr) {
        console.warn('On-demand relationship generation note:', genErr);
      }
    }

    // 3. Build Nodes
    const conceptNameMap = new Map<string, string>();
    const conceptMasteryScoreMap = new Map<string, number>();

    let masteredCount = 0;
    let developingCount = 0;
    let weakCount = 0;
    let untestedCount = 0;

    const nodes = concepts.map((c) => {
      conceptNameMap.set(c.id, c.name);
      const mastery = masteryMap.get(c.id);
      const totalAttempts = (mastery?.correct_count || 0) + (mastery?.incorrect_count || 0);
      const score = mastery?.mastery_score ?? 0;
      conceptMasteryScoreMap.set(c.id, score);

      let masteryStatus: 'strong' | 'developing' | 'weak' | 'untested' = 'untested';
      if (totalAttempts === 0) {
        masteryStatus = 'untested';
        untestedCount++;
      } else if (score >= 71) {
        masteryStatus = 'strong';
        masteredCount++;
      } else if (score >= 41) {
        masteryStatus = 'developing';
        developingCount++;
      } else {
        masteryStatus = 'weak';
        weakCount++;
      }

      return {
        id: c.id,
        name: c.name,
        description: c.description,
        importance: c.importance || 'MEDIUM',
        masteryScore: score,
        masteryStatus,
        attemptsCount: totalAttempts,
        simpleExplanation: c.simple_explanation || null,
        detailedExplanation: c.detailed_explanation || null,
        example: c.example || null,
        commonMisconception: c.common_misconception || null,
        keyTakeaway: c.key_takeaway || null,
        timestampStart: c.timestamp_start || null,
        timestampEnd: c.timestamp_end || null,
      };
    });

    // 4. Build Edges
    const edges = (relationships || []).map((rel, idx) => ({
      id: rel.id || `edge-${idx}`,
      source: rel.source_concept_id,
      target: rel.target_concept_id,
      relationshipType: rel.relationship_type,
      confidence: rel.confidence ?? 1.0,
      description: rel.description || '',
    }));

    // 5. Detect Knowledge Gaps
    // If a concept with low mastery (< 60% or weak) is a PREREQUISITE for another concept, detect the knowledge gap.
    const knowledgeGaps: Array<{
      sourceConceptId: string;
      sourceConceptName: string;
      targetConceptId: string;
      targetConceptName: string;
      masteryScore: number;
      reason: string;
      recommendedAction: {
        type: string;
        conceptId: string;
        conceptName: string;
        estimatedMinutes: number;
      };
    }> = [];

    const seenGaps = new Set<string>();

    for (const edge of edges) {
      if (edge.relationshipType === 'PREREQUISITE') {
        const sourceScore = conceptMasteryScoreMap.get(edge.source) ?? 0;
        const sourceMastery = masteryMap.get(edge.source);
        const sourceAttempts = (sourceMastery?.correct_count || 0) + (sourceMastery?.incorrect_count || 0);

        // Weak prerequisite (tested and < 60%, or explicitly weak)
        if (sourceAttempts > 0 && sourceScore < 60) {
          const sourceName = conceptNameMap.get(edge.source) || 'Prerequisite Concept';
          const targetName = conceptNameMap.get(edge.target) || 'Advanced Concept';
          const gapKey = `${edge.source}->${edge.target}`;

          if (!seenGaps.has(gapKey)) {
            seenGaps.add(gapKey);
            knowledgeGaps.push({
              sourceConceptId: edge.source,
              sourceConceptName: sourceName,
              targetConceptId: edge.target,
              targetConceptName: targetName,
              masteryScore: Math.round(sourceScore),
              reason: `Your understanding of ${sourceName} (${Math.round(sourceScore)}%) may be limiting your progress on ${targetName}.`,
              recommendedAction: {
                type: 'REVISE',
                conceptId: edge.source,
                conceptName: sourceName,
                estimatedMinutes: 8,
              },
            });
          }
        }
      }
    }

    res.json({
      success: true,
      lectureId: id,
      lectureTitle: lecture.title,
      nodes,
      edges,
      knowledgeGaps,
      stats: {
        totalConcepts: nodes.length,
        totalRelationships: edges.length,
        masteredCount,
        developingCount,
        weakCount,
        untestedCount,
        knowledgeGapCount: knowledgeGaps.length,
      },
    });
  } catch (error: any) {
    console.error('getLectureKnowledgeGraph error:', error);
    res.status(500).json({ error: 'Failed to retrieve knowledge graph data' });
  }
}

/**
 * POST /api/lectures/:id/knowledge-graph/explore
 * AI Discovery deep-dive into a specific concept in the knowledge graph.
 */
export async function exploreKnowledgeGraphConcept(
  req: AuthRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const { id } = req.params;
  const { conceptId } = req.body;

  if (!conceptId) {
    res.status(400).json({ error: 'conceptId is required' });
    return;
  }

  try {
    const lecture = await db.getLectureById(id, req.user.id);
    if (!lecture) {
      res.status(404).json({ error: 'Lecture not found' });
      return;
    }

    const concepts = await db.getConceptsByLecture(id);
    const concept = concepts.find((c) => c.id === conceptId);
    if (!concept) {
      res.status(404).json({ error: 'Concept not found' });
      return;
    }

    const transcriptSnippet = lecture.transcript ? lecture.transcript.slice(0, 5000) : '';
    const exploration = await geminiService.exploreConcept(
      concept.name,
      concept.description,
      lecture.title,
      transcriptSnippet
    );

    res.json({
      success: true,
      conceptId: concept.id,
      exploration,
    });
  } catch (error: any) {
    console.error('exploreKnowledgeGraphConcept error:', error);
    res.status(500).json({ error: 'Failed to explore concept' });
  }
}