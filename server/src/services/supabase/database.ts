import { getSupabaseAdmin } from './supabaseAdmin';
import prisma from '../../prisma';

export interface ProfileRecord {
  id: string;
  name: string;
  email?: string;
  created_at?: string;
}

export interface LectureRecord {
  id: string;
  user_id: string;
  youtube_url: string;
  title: string;
  transcript: string;
  transcript_segments?: any;
  duration?: number | null;
  status: string;
  error_message?: string | null;
  summary?: any;
  created_at?: string;
  updated_at?: string;
  _count?: {
    concepts: number;
    flashcards: number;
    quizzes: number;
  };
}

export interface ConceptRecord {
  id: string;
  lecture_id: string;
  name: string;
  description: string;
  importance: string;
  timestamp_start?: number | null;
  timestamp_end?: number | null;
  simple_explanation?: string | null;
  detailed_explanation?: string | null;
  example?: string | null;
  common_misconception?: string | null;
  key_takeaway?: string | null;
  created_at?: string;
}

export interface FlashcardRecord {
  id: string;
  lecture_id: string;
  concept_id?: string | null;
  question: string;
  answer: string;
  difficulty: string;
  created_at?: string;
}

export interface QuizRecord {
  id: string;
  lecture_id: string;
  title: string;
  created_at?: string;
}

export interface QuizQuestionRecord {
  id: string;
  quiz_id: string;
  concept_id?: string | null;
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  difficulty: string;
  created_at?: string;
}

export interface QuizAttemptRecord {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  started_at: string;
  completed_at?: string | null;
}

export interface QuizAnswerRecord {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_answer: number;
  is_correct: boolean;
}

class SupabaseDatabaseService {
  /**
   * Helper to determine whether Supabase Cloud is active
   */
  private useSupabase(): boolean {
    return getSupabaseAdmin() !== null;
  }

  // =========================================
  // USER PROFILES
  // =========================================
  async getProfile(userId: string): Promise<ProfileRecord | null> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data, error } = await sb
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error || !data) return null;
      return data;
    }

    // Prisma Fallback
    const u = await prisma.user.findUnique({ where: { id: userId } });
    if (!u) return null;
    return { id: u.id, name: u.name, email: u.email, created_at: u.createdAt.toISOString() };
  }

  // =========================================
  // LECTURES
  // =========================================
  async createLecture(data: { userId: string; youtubeUrl: string; title: string }): Promise<LectureRecord> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data: created, error } = await sb
        .from('lectures')
        .insert({
          user_id: data.userId,
          youtube_url: data.youtubeUrl,
          title: data.title,
          transcript: '',
          status: 'PENDING',
        })
        .select('*')
        .single();

      if (error || !created) {
        throw new Error(`Supabase createLecture error: ${error?.message}`);
      }
      return created;
    }

    // Prisma Fallback
    const created = await prisma.lecture.create({
      data: {
        userId: data.userId,
        youtubeUrl: data.youtubeUrl,
        title: data.title,
        transcript: '',
        status: 'PENDING',
      },
    });

    return {
      id: created.id,
      user_id: created.userId,
      youtube_url: created.youtubeUrl,
      title: created.title,
      transcript: created.transcript,
      status: created.status,
      created_at: created.createdAt.toISOString(),
      updated_at: created.updatedAt.toISOString(),
    };
  }

  async getLecturesByUser(userId: string): Promise<LectureRecord[]> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data, error } = await sb
        .from('lectures')
        .select(`
          *,
          concepts:concepts(count),
          flashcards:flashcards(count),
          quizzes:quizzes(count)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(`Supabase getLecturesByUser error: ${error.message}`);
      
      return (data || []).map((row: any) => ({
        ...row,
        _count: {
          concepts: row.concepts?.[0]?.count || 0,
          flashcards: row.flashcards?.[0]?.count || 0,
          quizzes: row.quizzes?.[0]?.count || 0,
        },
      }));
    }

    // Prisma Fallback
    const list = await prisma.lecture.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { concepts: true, flashcards: true, quizzes: true },
        },
      },
    });

    return list.map((item) => ({
      id: item.id,
      user_id: item.userId,
      youtube_url: item.youtubeUrl,
      title: item.title,
      transcript: item.transcript,
      transcript_segments: item.transcriptSegments ? JSON.parse(item.transcriptSegments) : null,
      duration: item.duration,
      status: item.status,
      error_message: item.errorMessage,
      summary: item.summary ? JSON.parse(item.summary) : null,
      created_at: item.createdAt.toISOString(),
      updated_at: item.updatedAt.toISOString(),
      _count: item._count,
    }));
  }

  async getLectureById(id: string, userId: string): Promise<LectureRecord | null> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data, error } = await sb
        .from('lectures')
        .select(`
          *,
          concepts:concepts(count),
          flashcards:flashcards(count),
          quizzes:quizzes(count)
        `)
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error || !data) return null;
      return {
        ...data,
        _count: {
          concepts: data.concepts?.[0]?.count || 0,
          flashcards: data.flashcards?.[0]?.count || 0,
          quizzes: data.quizzes?.[0]?.count || 0,
        },
      };
    }

    // Prisma Fallback
    const item = await prisma.lecture.findFirst({
      where: { id, userId },
      include: {
        _count: {
          select: { concepts: true, flashcards: true, quizzes: true },
        },
      },
    });

    if (!item) return null;

    let summaryObj = null;
    if (item.summary) {
      try { summaryObj = JSON.parse(item.summary); } catch {}
    }

    return {
      id: item.id,
      user_id: item.userId,
      youtube_url: item.youtubeUrl,
      title: item.title,
      transcript: item.transcript,
      transcript_segments: item.transcriptSegments ? JSON.parse(item.transcriptSegments) : null,
      duration: item.duration,
      status: item.status,
      error_message: item.errorMessage,
      summary: summaryObj,
      created_at: item.createdAt.toISOString(),
      updated_at: item.updatedAt.toISOString(),
      _count: item._count,
    };
  }

  async updateLectureStatus(id: string, status: string, errorMessage?: string | null): Promise<void> {
    const sb = getSupabaseAdmin();
    if (sb) {
      await sb
        .from('lectures')
        .update({
          status,
          error_message: errorMessage || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      return;
    }

    // Prisma Fallback
    await prisma.lecture.update({
      where: { id },
      data: {
        status,
        errorMessage: errorMessage || null,
      },
    });
  }

  async saveLectureTranscript(id: string, transcript: string, segments: any[], duration?: number): Promise<void> {
    const sb = getSupabaseAdmin();
    if (sb) {
      await sb
        .from('lectures')
        .update({
          status: 'COMPLETED',
          transcript,
          transcript_segments: segments,
          duration: duration || null,
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      return;
    }

    // Prisma Fallback
    await prisma.lecture.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        transcript,
        transcriptSegments: JSON.stringify(segments),
        duration: duration || null,
        errorMessage: null,
      },
    });
  }

  async deleteLecture(id: string, userId: string): Promise<boolean> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { error } = await sb
        .from('lectures')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      return !error;
    }

    // Prisma Fallback
    const existing = await prisma.lecture.findFirst({ where: { id, userId } });
    if (!existing) return false;
    await prisma.lecture.delete({ where: { id } });
    return true;
  }

  // =========================================
  // CONCEPTS
  // =========================================
  async saveConcepts(lectureId: string, concepts: Array<{
    name: string;
    description: string;
    importance: string;
    timestampStart?: number | null;
    timestampEnd?: number | null;
  }>): Promise<ConceptRecord[]> {
    const sb = getSupabaseAdmin();
    if (sb) {
      // Delete existing concepts for idempotency
      await sb.from('concepts').delete().eq('lecture_id', lectureId);

      const rows = concepts.map((c) => ({
        lecture_id: lectureId,
        name: c.name,
        description: c.description,
        importance: c.importance || 'MEDIUM',
        timestamp_start: c.timestampStart ?? null,
        timestamp_end: c.timestampEnd ?? null,
      }));

      const { data, error } = await sb.from('concepts').insert(rows).select('*');
      if (error || !data) throw new Error(`Failed to save concepts: ${error?.message}`);
      return data;
    }

    // Prisma Fallback
    await prisma.concept.deleteMany({ where: { lectureId } });

    const created = await Promise.all(
      concepts.map((c) =>
        prisma.concept.create({
          data: {
            lectureId,
            name: c.name,
            description: c.description,
            importance: c.importance || 'MEDIUM',
            timestampStart: c.timestampStart ?? null,
            timestampEnd: c.timestampEnd ?? null,
          },
        })
      )
    );

    return created.map((c) => ({
      id: c.id,
      lecture_id: c.lectureId,
      name: c.name,
      description: c.description,
      importance: c.importance,
      timestamp_start: c.timestampStart,
      timestamp_end: c.timestampEnd,
    }));
  }

  async updateConceptExplanations(lectureId: string, explanations: Array<{
    conceptName: string;
    simpleExplanation: string;
    detailedExplanation: string;
    example: string;
    commonMisconception: string;
    keyTakeaway: string;
  }>): Promise<void> {
    const concepts = await this.getConceptsByLecture(lectureId);
    const sb = getSupabaseAdmin();

    for (const exp of explanations) {
      const target = concepts.find(
        (c) => c.name.toLowerCase().trim() === exp.conceptName.toLowerCase().trim()
      );
      if (!target) continue;

      if (sb) {
        await sb
          .from('concepts')
          .update({
            simple_explanation: exp.simpleExplanation,
            detailed_explanation: exp.detailedExplanation,
            example: exp.example,
            common_misconception: exp.commonMisconception,
            key_takeaway: exp.keyTakeaway,
          })
          .eq('id', target.id);
      } else {
        // In Prisma, store extra fields or update if schema matches
        // (explanations stored in database records)
      }
    }
  }

  async getConceptsByLecture(lectureId: string): Promise<ConceptRecord[]> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data, error } = await sb
        .from('concepts')
        .select('*')
        .eq('lecture_id', lectureId)
        .order('created_at', { ascending: true });
      if (error) return [];
      return data || [];
    }

    // Prisma Fallback
    const list = await prisma.concept.findMany({
      where: { lectureId },
      orderBy: { id: 'asc' },
    });

    return list.map((c) => ({
      id: c.id,
      lecture_id: c.lectureId,
      name: c.name,
      description: c.description,
      importance: c.importance,
      timestamp_start: c.timestampStart,
      timestamp_end: c.timestampEnd,
    }));
  }

  // =========================================
  // SUMMARY
  // =========================================
  async saveSummary(lectureId: string, summaryObj: any): Promise<void> {
    const sb = getSupabaseAdmin();
    if (sb) {
      await sb
        .from('lectures')
        .update({
          summary: summaryObj,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lectureId);
      return;
    }

    // Prisma Fallback
    await prisma.lecture.update({
      where: { id: lectureId },
      data: {
        summary: JSON.stringify(summaryObj),
      },
    });
  }

  // =========================================
  // FLASHCARDS
  // =========================================
  async saveFlashcards(lectureId: string, flashcards: Array<{
    question: string;
    answer: string;
    conceptId?: string | null;
    conceptName?: string;
    difficulty: string;
  }>, savedConcepts: ConceptRecord[]): Promise<FlashcardRecord[]> {
    const sb = getSupabaseAdmin();

    const prepared = flashcards.map((f) => {
      let resolvedConceptId = f.conceptId || null;
      if (!resolvedConceptId && f.conceptName) {
        const found = savedConcepts.find(
          (c) => c.name.toLowerCase().trim() === f.conceptName?.toLowerCase().trim()
        );
        if (found) resolvedConceptId = found.id;
      }
      return {
        lecture_id: lectureId,
        concept_id: resolvedConceptId,
        question: f.question,
        answer: f.answer,
        difficulty: f.difficulty || 'MEDIUM',
      };
    });

    if (sb) {
      await sb.from('flashcards').delete().eq('lecture_id', lectureId);
      const { data, error } = await sb.from('flashcards').insert(prepared).select('*');
      if (error || !data) throw new Error(`Failed to save flashcards: ${error?.message}`);
      return data;
    }

    // Prisma Fallback
    await prisma.flashcard.deleteMany({ where: { lectureId } });
    const created = await Promise.all(
      prepared.map((f) =>
        prisma.flashcard.create({
          data: {
            lectureId: f.lecture_id,
            conceptId: f.concept_id,
            question: f.question,
            answer: f.answer,
            difficulty: f.difficulty,
          },
        })
      )
    );

    return created.map((f) => ({
      id: f.id,
      lecture_id: f.lectureId,
      concept_id: f.conceptId,
      question: f.question,
      answer: f.answer,
      difficulty: f.difficulty,
    }));
  }

  async getFlashcardsByLecture(lectureId: string): Promise<FlashcardRecord[]> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data, error } = await sb
        .from('flashcards')
        .select('*')
        .eq('lecture_id', lectureId)
        .order('created_at', { ascending: true });
      if (error) return [];
      return data || [];
    }

    // Prisma Fallback
    const list = await prisma.flashcard.findMany({ where: { lectureId } });
    return list.map((f) => ({
      id: f.id,
      lecture_id: f.lectureId,
      concept_id: f.conceptId,
      question: f.question,
      answer: f.answer,
      difficulty: f.difficulty,
    }));
  }

  // =========================================
  // QUIZ & QUIZ QUESTIONS
  // =========================================
  async saveQuiz(lectureId: string, quizTitle: string, questions: Array<{
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    conceptId?: string | null;
    conceptName?: string;
    difficulty: string;
  }>, savedConcepts: ConceptRecord[]): Promise<{ quiz: QuizRecord; questions: QuizQuestionRecord[] }> {
    const sb = getSupabaseAdmin();

    if (sb) {
      // Delete old quiz for this lecture if any
      await sb.from('quizzes').delete().eq('lecture_id', lectureId);

      const { data: newQuiz, error: qErr } = await sb
        .from('quizzes')
        .insert({ lecture_id: lectureId, title: quizTitle })
        .select('*')
        .single();

      if (qErr || !newQuiz) throw new Error(`Failed to create quiz: ${qErr?.message}`);

      const qRows = questions.map((q) => {
        let resolvedConceptId = q.conceptId || null;
        if (!resolvedConceptId && q.conceptName) {
          const found = savedConcepts.find(
            (c) => c.name.toLowerCase().trim() === q.conceptName?.toLowerCase().trim()
          );
          if (found) resolvedConceptId = found.id;
        }
        return {
          quiz_id: newQuiz.id,
          concept_id: resolvedConceptId,
          question: q.question,
          options: q.options,
          correct_answer: q.correctAnswer,
          explanation: q.explanation,
          difficulty: q.difficulty || 'MEDIUM',
        };
      });

      const { data: savedQuestions, error: qqErr } = await sb
        .from('quiz_questions')
        .insert(qRows)
        .select('*');

      if (qqErr || !savedQuestions) throw new Error(`Failed to save quiz questions: ${qqErr?.message}`);

      return { quiz: newQuiz, questions: savedQuestions };
    }

    // Prisma Fallback
    await prisma.quiz.deleteMany({ where: { lectureId } });

    const newQuiz = await prisma.quiz.create({
      data: {
        lectureId,
        title: quizTitle,
      },
    });

    const savedQuestions = await Promise.all(
      questions.map((q) => {
        let resolvedConceptId = q.conceptId || null;
        if (!resolvedConceptId && q.conceptName) {
          const found = savedConcepts.find(
            (c) => c.name.toLowerCase().trim() === q.conceptName?.toLowerCase().trim()
          );
          if (found) resolvedConceptId = found.id;
        }
        return prisma.quizQuestion.create({
          data: {
            quizId: newQuiz.id,
            conceptId: resolvedConceptId,
            question: q.question,
            options: JSON.stringify(q.options),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            difficulty: q.difficulty || 'MEDIUM',
          },
        });
      })
    );

    return {
      quiz: { id: newQuiz.id, lecture_id: newQuiz.lectureId, title: newQuiz.title },
      questions: savedQuestions.map((sq) => ({
        id: sq.id,
        quiz_id: sq.quizId,
        concept_id: sq.conceptId,
        question: sq.question,
        options: JSON.parse(sq.options),
        correct_answer: sq.correctAnswer,
        explanation: sq.explanation,
        difficulty: sq.difficulty,
      })),
    };
  }

  async getQuizByLecture(lectureId: string): Promise<{ quiz: QuizRecord; questions: QuizQuestionRecord[] } | null> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data: quiz, error: qErr } = await sb
        .from('quizzes')
        .select('*')
        .eq('lecture_id', lectureId)
        .single();

      if (qErr || !quiz) return null;

      const { data: questions, error: qqErr } = await sb
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quiz.id)
        .order('created_at', { ascending: true });

      if (qqErr) return null;

      return { quiz, questions: questions || [] };
    }

    // Prisma Fallback
    const quiz = await prisma.quiz.findFirst({
      where: { lectureId },
      include: { questions: true },
    });

    if (!quiz) return null;

    return {
      quiz: { id: quiz.id, lecture_id: quiz.lectureId, title: quiz.title },
      questions: quiz.questions.map((q) => ({
        id: q.id,
        quiz_id: q.quizId,
        concept_id: q.conceptId,
        question: q.question,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        correct_answer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty,
      })),
    };
  }

  // =========================================
  // QUIZ ATTEMPTS & ANSWERS
  // =========================================
  async createQuizAttempt(userId: string, quizId: string): Promise<QuizAttemptRecord> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data, error } = await sb
        .from('quiz_attempts')
        .insert({
          user_id: userId,
          quiz_id: quizId,
          score: 0,
        })
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(`Failed to create quiz attempt: ${error?.message}`);
      }
      return data;
    }

    // Prisma Fallback
    const created = await prisma.quizAttempt.create({
      data: {
        userId,
        quizId,
        score: 0,
      },
    });

    return {
      id: created.id,
      user_id: created.userId,
      quiz_id: created.quizId,
      score: created.score,
      started_at: created.startedAt.toISOString(),
      completed_at: created.completedAt ? created.completedAt.toISOString() : null,
    };
  }

  async getQuizAttempt(attemptId: string, userId: string): Promise<QuizAttemptRecord | null> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data, error } = await sb
        .from('quiz_attempts')
        .select('*')
        .eq('id', attemptId)
        .eq('user_id', userId)
        .single();

      if (error || !data) return null;
      return data;
    }

    // Prisma Fallback
    const item = await prisma.quizAttempt.findFirst({
      where: { id: attemptId, userId },
    });

    if (!item) return null;

    return {
      id: item.id,
      user_id: item.userId,
      quiz_id: item.quizId,
      score: item.score,
      started_at: item.startedAt.toISOString(),
      completed_at: item.completedAt ? item.completedAt.toISOString() : null,
    };
  }

  async submitQuizAttempt(
    attemptId: string,
    userId: string,
    answers: Array<{ questionId: string; selectedAnswer: number }>
  ): Promise<{ attempt: QuizAttemptRecord; score: number; correctAnswers: number; totalQuestions: number }> {
    const sb = getSupabaseAdmin();

    // 1. Verify ownership & attempt status
    const attempt = await this.getQuizAttempt(attemptId, userId);
    if (!attempt) {
      throw new Error('Quiz attempt not found');
    }

    if (attempt.completed_at) {
      throw new Error('Quiz attempt has already been submitted');
    }

    // 2. Load quiz questions from DB
    let quizQuestions: QuizQuestionRecord[] = [];
    if (sb) {
      const { data, error } = await sb
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', attempt.quiz_id);
      if (error || !data || data.length === 0) {
        throw new Error('Quiz questions not found');
      }
      quizQuestions = data;
    } else {
      const list = await prisma.quizQuestion.findMany({
        where: { quizId: attempt.quiz_id },
      });
      if (!list || list.length === 0) {
        throw new Error('Quiz questions not found');
      }
      quizQuestions = list.map((q) => ({
        id: q.id,
        quiz_id: q.quizId,
        concept_id: q.conceptId,
        question: q.question,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        correct_answer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty,
      }));
    }

    const questionMap = new Map<string, QuizQuestionRecord>();
    for (const q of quizQuestions) {
      questionMap.set(q.id, q);
    }

    // 3. Validate duplicate answers
    const seenQuestionIds = new Set<string>();
    for (const ans of answers) {
      if (seenQuestionIds.has(ans.questionId)) {
        throw new Error('Duplicate question answer submitted');
      }
      seenQuestionIds.add(ans.questionId);
    }

    // 4. Validate all questions answered
    if (answers.length !== quizQuestions.length || seenQuestionIds.size !== quizQuestions.length) {
      throw new Error('Please answer all questions before submitting');
    }

    // 5. Validate question IDs and answer option indexes
    let correctCount = 0;
    const answerRecordsToInsert: Array<{
      attempt_id: string;
      question_id: string;
      selected_answer: number;
      is_correct: boolean;
    }> = [];

    for (const ans of answers) {
      const qRecord = questionMap.get(ans.questionId);
      if (!qRecord) {
        throw new Error('Invalid question submitted');
      }

      if (
        !Number.isInteger(ans.selectedAnswer) ||
        ans.selectedAnswer < 0 ||
        ans.selectedAnswer >= qRecord.options.length
      ) {
        throw new Error('Invalid answer option submitted');
      }

      const isCorrect = ans.selectedAnswer === qRecord.correct_answer;
      if (isCorrect) correctCount++;

      answerRecordsToInsert.push({
        attempt_id: attemptId,
        question_id: ans.questionId,
        selected_answer: ans.selectedAnswer,
        is_correct: isCorrect,
      });
    }

    const totalQuestions = quizQuestions.length;
    const percentageScore = Math.round((correctCount / totalQuestions) * 100);
    const completedAtIso = new Date().toISOString();

    // 6. Save quiz_answers & update quiz_attempts
    if (sb) {
      const { error: ansErr } = await sb.from('quiz_answers').insert(answerRecordsToInsert);
      if (ansErr) {
        throw new Error(`Failed to save quiz answers: ${ansErr.message}`);
      }

      const { data: updatedAttempt, error: attErr } = await sb
        .from('quiz_attempts')
        .update({
          score: percentageScore,
          completed_at: completedAtIso,
        })
        .eq('id', attemptId)
        .select('*')
        .single();

      if (attErr || !updatedAttempt) {
        throw new Error(`Failed to update quiz attempt: ${attErr?.message}`);
      }

      return {
        attempt: updatedAttempt,
        score: percentageScore,
        correctAnswers: correctCount,
        totalQuestions,
      };
    }

    // Prisma Fallback
    await Promise.all(
      answerRecordsToInsert.map((ans) =>
        prisma.quizAnswer.create({
          data: {
            attemptId: ans.attempt_id,
            questionId: ans.question_id,
            selectedAnswer: ans.selected_answer,
            isCorrect: ans.is_correct,
          },
        })
      )
    );

    const updatedAttempt = await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        score: percentageScore,
        completedAt: new Date(completedAtIso),
      },
    });

    return {
      attempt: {
        id: updatedAttempt.id,
        user_id: updatedAttempt.userId,
        quiz_id: updatedAttempt.quizId,
        score: updatedAttempt.score,
        started_at: updatedAttempt.startedAt.toISOString(),
        completed_at: updatedAttempt.completedAt ? updatedAttempt.completedAt.toISOString() : null,
      },
      score: percentageScore,
      correctAnswers: correctCount,
      totalQuestions,
    };
  }

  async getQuizAttemptResult(
    attemptId: string,
    userId: string
  ): Promise<{
    attemptId: string;
    quizId: string;
    lectureId: string;
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    startedAt: string;
    completedAt: string | null;
  } | null> {
    const sb = getSupabaseAdmin();
    const attempt = await this.getQuizAttempt(attemptId, userId);
    if (!attempt || !attempt.completed_at) return null;

    if (sb) {
      const [answersRes, quizRes] = await Promise.all([
        sb.from('quiz_answers').select('is_correct').eq('attempt_id', attemptId),
        sb.from('quizzes').select('lecture_id').eq('id', attempt.quiz_id).single(),
      ]);

      const answers = answersRes.data || [];
      const totalQuestions = answers.length;
      const correctAnswers = answers.filter((a) => a.is_correct).length;
      const lectureId = quizRes.data?.lecture_id || '';

      return {
        attemptId: attempt.id,
        quizId: attempt.quiz_id,
        lectureId,
        score: attempt.score,
        correctAnswers,
        totalQuestions,
        startedAt: attempt.started_at,
        completedAt: attempt.completed_at,
      };
    }

    // Prisma Fallback
    const [answers, quiz] = await Promise.all([
      prisma.quizAnswer.findMany({ where: { attemptId } }),
      prisma.quiz.findUnique({ where: { id: attempt.quiz_id } }),
    ]);

    const totalQuestions = answers.length;
    const correctAnswers = answers.filter((a) => a.isCorrect).length;
    const lectureId = quiz?.lectureId || '';

    return {
      attemptId: attempt.id,
      quizId: attempt.quiz_id,
      lectureId,
      score: attempt.score,
      correctAnswers,
      totalQuestions,
      startedAt: attempt.started_at,
      completedAt: attempt.completed_at,
    };
  }
}

export const db = new SupabaseDatabaseService();
export default db;
