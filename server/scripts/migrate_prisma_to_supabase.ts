import path from 'path';
import dotenv from 'dotenv';
import prisma from '../src/prisma';
import { supabaseAdmin } from '../src/services/supabase/supabaseAdmin';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function migrate() {
  const sb = supabaseAdmin;
  if (!sb) {
    console.error('Supabase admin client not available');
    process.exit(1);
  }

  // Upsert user profiles first (email column may not exist in Supabase schema)
  const users = await prisma.user.findMany();
  for (const u of users) {
    const { error: userErr } = await sb.from('profiles').upsert({
      id: u.id,
      name: u.name,
      created_at: u.createdAt.toISOString(),
    });
    if (userErr) console.warn('User upsert error:', userErr.message);
  }

  const lectures = await prisma.lecture.findMany({
    include: {
      concepts: true,
      flashcards: true,
      quizzes: {
        include: {
          questions: true,
          attempts: { include: { answers: true } },
        },
      },
    },
  });

  for (const lec of lectures) {
    // Lecture upsert
    const { error: lecErr } = await sb.from('lectures').upsert({
      id: lec.id,
      user_id: lec.userId,
      youtube_url: lec.youtubeUrl,
      title: lec.title,
      transcript: lec.transcript ?? '',
      transcript_segments: lec.transcriptSegments ? JSON.parse(lec.transcriptSegments) : null,
      duration: lec.duration ?? null,
      status: lec.status,
      error_message: lec.errorMessage ?? null,
      summary: lec.summary ? JSON.parse(lec.summary) : null,
      created_at: lec.createdAt.toISOString(),
      updated_at: lec.updatedAt.toISOString(),
    });
    if (lecErr) console.warn('Lecture upsert error:', lecErr.message);

    // Concepts upsert
    for (const c of lec.concepts) {
      const { error } = await sb.from('concepts').upsert({
        id: c.id,
        lecture_id: lec.id,
        name: c.name,
        description: c.description,
        importance: c.importance ?? 'MEDIUM',
        timestamp_start: c.timestampStart ?? null,
        timestamp_end: c.timestampEnd ?? null,
        simple_explanation: (c as any).simpleExplanation ?? null,
        detailed_explanation: (c as any).detailedExplanation ?? null,
        example: (c as any).example ?? null,
        common_misconception: (c as any).commonMisconception ?? null,
        key_takeaway: (c as any).keyTakeaway ?? null,
        created_at: new Date().toISOString(),
      });
      if (error) console.warn('Concept upsert error:', error.message);
    }

    // Helper to parse possible legacy flashcard format stored in Prisma
    function parseFlashcard(f: any) {
      let options: string[] | null = null;
      let correctAnswer: number | null = null;
      let explanation: string | null = null;
      let answerText = f.answer ?? '';
      try {
        const parsed = JSON.parse(answerText);
        if (parsed && Array.isArray(parsed.options) && typeof parsed.correctAnswer === 'number') {
          options = parsed.options;
          correctAnswer = parsed.correctAnswer;
          explanation = parsed.explanation ?? null;
          if (options && correctAnswer !== null && correctAnswer < options.length) {
            answerText = parsed.text || options[correctAnswer];
          } else {
            answerText = parsed.text || '';
          }
        }
      } catch {}
      return { options, correctAnswer, explanation, answerText };

    }

    // Flashcards upsert
    for (const f of lec.flashcards) {
      const { options, correctAnswer, explanation, answerText } = parseFlashcard(f);
      const { error } = await sb.from('flashcards').upsert({
        id: f.id,
        lecture_id: lec.id,
        concept_id: f.conceptId ?? null,
        question: f.question,
        answer: answerText,
        options,
        correct_answer: correctAnswer,
        explanation,
        difficulty: f.difficulty ?? 'MEDIUM',
        created_at: new Date().toISOString(),
      });
      if (error) console.warn('Flashcard upsert error:', error.message);
    }

    // Quizzes and related data upsert
    for (const qz of lec.quizzes) {
      const { error: quizErr } = await sb.from('quizzes').upsert({
        id: qz.id,
        lecture_id: lec.id,
        title: qz.title,
        created_at: qz.createdAt?.toISOString() ?? new Date().toISOString(),
      });
      if (quizErr) console.warn('Quiz upsert error:', quizErr.message);

      // Questions
      for (const qq of qz.questions) {
        const { error: qErr } = await sb.from('quiz_questions').upsert({
          id: qq.id,
          quiz_id: qz.id,
          concept_id: (qq as any).conceptId ?? null,
          question: qq.question,
          options: qq.options,
          correct_answer: (qq as any).correctAnswer,
          explanation: qq.explanation,
          difficulty: qq.difficulty ?? 'MEDIUM',
          created_at: new Date().toISOString(),
        });
        if (qErr) console.warn('QuizQuestion upsert error:', qErr.message);
      }

      // Attempts
      for (const att of qz.attempts) {
        const { error: aErr } = await sb.from('quiz_attempts').upsert({
          id: att.id,
          user_id: att.userId,
          quiz_id: qz.id,
          score: att.score,
          started_at: att.startedAt?.toISOString() ?? new Date().toISOString(),
          completed_at: att.completedAt ? att.completedAt.toISOString() : null,
        });
        if (aErr) console.warn('QuizAttempt upsert error:', aErr.message);

        // Answers
        for (const ans of att.answers) {
          const { error: ansErr } = await sb.from('quiz_answers').upsert({
            id: ans.id,
            attempt_id: att.id,
            question_id: (ans as any).questionId,
            selected_answer: (ans as any).selectedAnswer,
            is_correct: (ans as any).isCorrect,
          });
          if (ansErr) console.warn('QuizAnswer upsert error:', ansErr.message);
        }
      }
    }
  }

  console.log('Migration complete');
}

migrate()
  .catch((e) => {
    console.error('Migration failed', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
