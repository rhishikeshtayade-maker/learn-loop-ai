import { getSupabaseAdmin } from './supabaseAdmin';
import { isAnswerMatch } from '../../utils/answerMatch';
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

export interface ConceptRelationshipRecord {
  id: string;
  lecture_id: string;
  source_concept_id: string;
  target_concept_id: string;
  relationship_type: string;
  confidence: number;
  description?: string | null;
  created_at?: string;
}


export interface FlashcardRecord {
  id: string;
  lecture_id: string;
  concept_id?: string | null;
  question: string;
  answer: string;
  options?: string[] | null;
  correct_answer?: number | null;
  correctAnswer?: number | null;
  explanation?: string | null;
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

export interface ConceptMasteryRecord {
  id: string;
  user_id: string;
  concept_id: string;
  mastery_score: number;
  correct_count: number;
  incorrect_count: number;
  last_reviewed_at: string;
  next_review_at: string;
}

export interface RevisionTaskRecord {
  id: string;
  user_id: string;
  concept_id: string;
  task_type: string;
  content: any;
  scheduled_for: string;
  completed: boolean;
  created_at?: string;
}

class SupabaseDatabaseService {
  /**
   * Helper to determine whether Supabase Cloud is active
   */
  private useSupabase(): boolean {
    // Enable Supabase usage
    return true;
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
    if (!prisma) return null;
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
      try {
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

        if (!error && created) {
          return created;
        }
        console.warn(`Supabase createLecture failed (${error?.message}). Falling back to Prisma...`);
      } catch (sbErr) {
        console.warn('Supabase createLecture exception, falling back to Prisma:', sbErr);
      }
    }

    // Prisma Fallback
    if (!prisma) throw new Error('Database service unavailable');
    await prisma.user.upsert({
      where: { id: data.userId },
      create: {
        id: data.userId,
        email: `${data.userId}@placeholder.local`,
        name: 'Student',
        passwordHash: '',
      },
      update: {},
    }).catch(() => {});

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
      try {
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

        if (!error && data) {
          return data.map((row: any) => ({
            ...row,
            _count: {
              concepts: row.concepts?.[0]?.count || 0,
              flashcards: row.flashcards?.[0]?.count || 0,
              quizzes: row.quizzes?.[0]?.count || 0,
            },
          }));
        }
        console.warn(`Supabase getLecturesByUser failed (${error?.message}). Falling back to Prisma...`);
      } catch (sbErr) {
        console.warn('Supabase getLecturesByUser exception, falling back to Prisma:', sbErr);
      }
    }

    // Prisma Fallback
    if (!prisma) return [];
    const list = await prisma.lecture.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { concepts: true, flashcards: true, quizzes: true },
        },
      },
    });

    return list.map((item: any) => ({
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
      try {
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

        if (!error && data) {
          return {
            ...data,
            _count: {
              concepts: data.concepts?.[0]?.count || 0,
              flashcards: data.flashcards?.[0]?.count || 0,
              quizzes: data.quizzes?.[0]?.count || 0,
            },
          };
        }
        console.warn(`Supabase getLectureById failed (${error?.message}). Falling back to Prisma...`);
      } catch (sbErr) {
        console.warn('Supabase getLectureById exception, falling back to Prisma:', sbErr);
      }
    }

    // Prisma Fallback
    if (!prisma) return null;
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
      try {
        const { error } = await sb
          .from('lectures')
          .update({
            status,
            error_message: errorMessage || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
        if (!error) return;
        console.warn(`Supabase updateLectureStatus failed (${error?.message}). Falling back to Prisma...`);
      } catch (sbErr) {
        console.warn('Supabase updateLectureStatus exception, falling back to Prisma:', sbErr);
      }
    }

    // Prisma Fallback
    if (!prisma) return;
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
      try {
        const { error } = await sb
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
        if (!error) return;
        console.warn(`Supabase saveLectureTranscript failed (${error?.message}). Falling back to Prisma...`);
      } catch (sbErr) {
        console.warn('Supabase saveLectureTranscript exception, falling back to Prisma:', sbErr);
      }
    }

    // Prisma Fallback
    if (!prisma) return;
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
    if (!prisma) return false;
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
      try {
        await sb.from('concepts').delete().eq('lecture_id', lectureId);

        const rows = concepts.map((c: any) => ({
          lecture_id: lectureId,
          name: c.name,
          description: c.description,
          importance: c.importance || 'MEDIUM',
          timestamp_start: c.timestampStart ?? null,
          timestamp_end: c.timestampEnd ?? null,
        }));

        const { data, error } = await sb.from('concepts').insert(rows).select('*');
        if (!error && data) return data;
        console.warn(`Supabase saveConcepts failed (${error?.message}). Falling back to Prisma...`);
      } catch (err) {
        console.warn('Supabase saveConcepts exception, falling back to Prisma:', err);
      }
    }

    // Prisma Fallback
    if (!prisma) return [];
    await prisma.concept.deleteMany({ where: { lectureId } });

    const created = await Promise.all(
      concepts.map((c: any) =>
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

    return created.map((c: any) => ({
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
        (c: any) => c.name.toLowerCase().trim() === exp.conceptName.toLowerCase().trim()
      );
      if (!target) continue;

      if (sb) {
        try {
          const { error } = await sb
            .from('concepts')
            .update({
              simple_explanation: exp.simpleExplanation,
              detailed_explanation: exp.detailedExplanation,
              example: exp.example,
              common_misconception: exp.commonMisconception,
              key_takeaway: exp.keyTakeaway,
            })
            .eq('id', target.id);
          if (!error) continue;
          throw new Error(`Supabase updateConceptExplanations failed: ${error.message}`);
        } catch (e: any) {
          throw new Error(`Supabase updateConceptExplanations exception: ${e.message}`);
        }
      }

      if (!prisma) continue;
      try {
        await prisma.concept.update({
          where: { id: target.id },
          data: {
            description: exp.detailedExplanation || exp.simpleExplanation || target.description,
          },
        });
      } catch {
        // Ignore if concept is not stored in Prisma
      }
    }
  }

  async getConceptsByLecture(lectureId: string): Promise<ConceptRecord[]> {
    const sb = getSupabaseAdmin();
    if (sb) {
      try {
        const { data, error } = await sb
          .from('concepts')
          .select('*')
          .eq('lecture_id', lectureId)
          .order('created_at', { ascending: true });
        if (!error && data) return data;
      } catch {
        // Fallback to Prisma
      }
    }

    // Prisma Fallback
    if (!prisma) return [];
    const list = await prisma.concept.findMany({
      where: { lectureId },
      orderBy: { id: 'asc' },
    });

    return list.map((c: any) => ({
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
  // CONCEPT RELATIONSHIPS (KNOWLEDGE GRAPH)
  // =========================================
  async saveConceptRelationships(
    lectureId: string,
    relationships: Array<{
      sourceConceptId: string;
      targetConceptId: string;
      relationshipType: string;
      confidence?: number;
      description?: string;
    }>
  ): Promise<ConceptRelationshipRecord[]> {
    if (!relationships || relationships.length === 0) return [];

    const sb = getSupabaseAdmin();
    const rows = relationships.map((r) => ({
      lecture_id: lectureId,
      source_concept_id: r.sourceConceptId,
      target_concept_id: r.targetConceptId,
      relationship_type: r.relationshipType,
      confidence: typeof r.confidence === 'number' ? r.confidence : 1.0,
      description: r.description || null,
    }));

    if (sb) {
      try {
        const { data, error } = await sb
          .from('concept_relationships')
          .upsert(rows, { onConflict: 'source_concept_id,target_concept_id,relationship_type' })
          .select('*');

        if (!error && data && data.length > 0) {
          return data;
        }
        if (error) {
          console.warn(`Supabase concept_relationships notice (${error.message}). Saving to lecture summary fallback...`);
        }
      } catch (err: any) {
        console.warn('Supabase concept_relationships table exception:', err?.message || err);
      }

      // Resilient fallback: store in lecture summary JSON so graph is persisted even if table creation hasn't run yet
      try {
        const { data: lec } = await sb.from('lectures').select('summary').eq('id', lectureId).maybeSingle();
        const currentSummary = typeof lec?.summary === 'object' && lec?.summary ? lec.summary : {};
        const storedRelationships = rows.map((r, i) => ({
          id: `rel-${i}-${Date.now()}`,
          ...r,
          created_at: new Date().toISOString(),
        }));
        await sb
          .from('lectures')
          .update({
            summary: {
              ...currentSummary,
              conceptRelationships: storedRelationships,
            },
          })
          .eq('id', lectureId);
        return storedRelationships;
      } catch (sumErr) {
        console.warn('Fallback save to lecture summary failed:', sumErr);
      }
    }

    return rows.map((r, i) => ({
      id: `rel-mem-${i}`,
      ...r,
      created_at: new Date().toISOString(),
    }));
  }

  async getConceptRelationships(lectureId: string): Promise<ConceptRelationshipRecord[]> {
    const sb = getSupabaseAdmin();
    if (sb) {
      try {
        const { data, error } = await sb
          .from('concept_relationships')
          .select('*')
          .eq('lecture_id', lectureId);

        if (!error && data && data.length > 0) {
          return data;
        }
      } catch {
        // Fallback to checking lecture summary
      }

      // Check lecture summary fallback
      try {
        const { data: lec } = await sb.from('lectures').select('summary').eq('id', lectureId).maybeSingle();
        if (lec?.summary?.conceptRelationships && Array.isArray(lec.summary.conceptRelationships)) {
          return lec.summary.conceptRelationships;
        }
      } catch {
        // Ignore
      }
    }

    return [];
  }

  // =========================================
  // SUMMARY
  // =========================================
  async saveSummary(lectureId: string, summaryObj: any): Promise<void> {
    const sb = getSupabaseAdmin();
    if (sb) {
      try {
        const { error } = await sb
          .from('lectures')
          .update({
            summary: summaryObj,
            updated_at: new Date().toISOString(),
          })
          .eq('id', lectureId);
        if (!error) return;
        console.warn(`Supabase saveSummary failed (${error?.message}). Falling back to Prisma...`);
      } catch (err) {
        console.warn('Supabase saveSummary exception, falling back to Prisma:', err);
      }
    }

    // Prisma Fallback
    if (!prisma) return;
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
  // FLASHCARDS
  // =========================================
  private mapFlashcardRecord(raw: any): FlashcardRecord {
    let options: string[] | null = null;
    let correctAnswer: number | null = null;
    let explanation: string | null = null;
    let answerText: string = raw.answer || '';

    if (raw.options) {
      if (Array.isArray(raw.options)) {
        options = raw.options;
      } else if (typeof raw.options === 'string') {
        try {
          options = JSON.parse(raw.options);
        } catch {
          options = null;
        }
      }
    }

    if (raw.correct_answer !== undefined && raw.correct_answer !== null) {
      correctAnswer = typeof raw.correct_answer === 'number' ? raw.correct_answer : parseInt(String(raw.correct_answer), 10);
    } else if (raw.correctAnswer !== undefined && raw.correctAnswer !== null) {
      correctAnswer = typeof raw.correctAnswer === 'number' ? raw.correctAnswer : parseInt(String(raw.correctAnswer), 10);
    }

    if (raw.explanation) {
      explanation = raw.explanation;
    }

    // Fallback: Check if answerText itself was stored as JSON string in legacy schema
    if ((!options || options.length !== 4) && typeof answerText === 'string' && answerText.trim().startsWith('{')) {
      try {
        const json = JSON.parse(answerText);
        if (json && Array.isArray(json.options) && typeof json.correctAnswer === 'number') {
          options = json.options;
          correctAnswer = json.correctAnswer;
          explanation = json.explanation || null;
          answerText = json.text || json.options[json.correctAnswer] || answerText;
        }
      } catch {
        // Ignore JSON parse error, treat as text answer
      }
    }

    // Ensure raw carries parsed fields for downstream usage
    raw.options = options;
    raw.correct_answer = correctAnswer;
    raw.correctAnswer = correctAnswer;
    raw.explanation = explanation;

    return {
      id: raw.id,
      lecture_id: raw.lecture_id || raw.lectureId || '',
      concept_id: raw.concept_id || raw.conceptId,
      question: raw.question,
      answer: answerText,
      options: options && options.length === 4 ? options : null,
      correct_answer: correctAnswer,
      correctAnswer: correctAnswer,
      explanation,
      difficulty: raw.difficulty || 'MEDIUM',
      created_at: raw.created_at || raw.createdAt,
    };
  }

  async saveFlashcards(lectureId: string, flashcards: Array<{
    question: string;
    answer?: string;
    options?: string[] | null;
    correctAnswer?: number | null;
    correct_answer?: number | null;
    explanation?: string | null;
    conceptId?: string | null;
    conceptName?: string;
    difficulty: string;
  }>, savedConcepts: ConceptRecord[]): Promise<FlashcardRecord[]> {
    const sb = getSupabaseAdmin();

    const prepared = flashcards.map((f: any) => {
      let resolvedConceptId = f.conceptId || null;
      if (!resolvedConceptId && f.conceptName) {
        const found = savedConcepts.find(
          (c: any) => c.name.toLowerCase().trim() === f.conceptName?.toLowerCase().trim()
        );
        if (found) resolvedConceptId = found.id;
      }

      const optionsArr = Array.isArray(f.options) && f.options.length === 4 ? f.options : null;
      const cAns = typeof f.correctAnswer === 'number'
        ? f.correctAnswer
        : (typeof f.correct_answer === 'number' ? f.correct_answer : null);
      const textAnswer = f.answer || (optionsArr && cAns !== null ? optionsArr[cAns] : '');

      return {
        lecture_id: lectureId,
        concept_id: resolvedConceptId,
        question: f.question,
        answer: textAnswer,
        options: optionsArr,
        correct_answer: cAns,
        explanation: f.explanation || null,
        difficulty: f.difficulty || 'MEDIUM',
      };
    });

    if (sb) {
      try {
        await sb.from('flashcards').delete().eq('lecture_id', lectureId);
        const { data, error } = await sb.from('flashcards').insert(prepared).select('*');
        if (!error && data) return data.map((row: any) => this.mapFlashcardRecord(row));
        console.warn(`Supabase saveFlashcards failed (${error?.message}). Falling back to Prisma...`);
      } catch (err) {
        console.warn('Supabase saveFlashcards exception, falling back to Prisma:', err);
      }
    }

    // Prisma Fallback
    if (!prisma) return [];
    await prisma.flashcard.deleteMany({ where: { lectureId } });
    const created = await Promise.all(
      prepared.map((f: any) => {
        let dbAnswer = f.answer;
        if (f.options && Array.isArray(f.options)) {
          dbAnswer = JSON.stringify({
            text: f.answer,
            options: f.options,
            correctAnswer: f.correct_answer,
            explanation: f.explanation || '',
          });
        }
        return prisma.flashcard.create({
          data: {
            lectureId: f.lecture_id,
            conceptId: f.concept_id,
            question: f.question,
            answer: dbAnswer,
            difficulty: f.difficulty,
          },
        });
      })
    );

    return created.map((f: any) => this.mapFlashcardRecord(f));
  }

  async getFlashcardsByLecture(lectureId: string): Promise<FlashcardRecord[]> {
    const sb = getSupabaseAdmin();
    if (sb) {
      try {
        const { data, error } = await sb
          .from('flashcards')
          .select('*')
          .eq('lecture_id', lectureId)
          .order('created_at', { ascending: true });
        if (!error && data) return data.map((row: any) => this.mapFlashcardRecord(row));
      } catch {
        // Fallback to Prisma
      }
    }

    // Prisma Fallback
    if (!prisma) return [];
    const list = await prisma.flashcard.findMany({ where: { lectureId } });
    return list.map((f: any) => this.mapFlashcardRecord(f));
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
      try {
        // Delete old quiz for this lecture if any
        await sb.from('quizzes').delete().eq('lecture_id', lectureId);

        const { data: newQuiz, error: qErr } = await sb
          .from('quizzes')
          .insert({ lecture_id: lectureId, title: quizTitle })
          .select('*')
          .single();

        if (!qErr && newQuiz) {
          const qRows = questions.map((q: any) => {
            let resolvedConceptId = q.conceptId || null;
            if (!resolvedConceptId && q.conceptName) {
              const found = savedConcepts.find(
                (c: any) => c.name.toLowerCase().trim() === q.conceptName?.toLowerCase().trim()
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

          if (!qqErr && savedQuestions) {
            return { quiz: newQuiz, questions: savedQuestions };
          }
          throw new Error(`Supabase saveQuiz questions failed: ${qqErr?.message}`);
        }
        throw new Error(`Supabase saveQuiz failed: ${qErr?.message}`);
      } catch (err: any) {
        throw new Error(`Supabase saveQuiz exception: ${err.message}`);
      }
    }

    // Prisma Fallback
    if (!prisma) throw new Error('Database service unavailable');
    await prisma.quiz.deleteMany({ where: { lectureId } });

    const newQuiz = await prisma.quiz.create({
      data: {
        lectureId,
        title: quizTitle,
      },
    });

    const savedQuestions = await Promise.all(
      questions.map((q: any) => {
        let resolvedConceptId = q.conceptId || null;
        if (!resolvedConceptId && q.conceptName) {
          const found = savedConcepts.find(
            (c: any) => c.name.toLowerCase().trim() === q.conceptName?.toLowerCase().trim()
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
      questions: savedQuestions.map((sq: any) => ({
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
      try {
        const { data: quiz, error: qErr } = await sb
          .from('quizzes')
          .select('*')
          .eq('lecture_id', lectureId)
          .single();

        if (!qErr && quiz) {
          const { data: questions, error: qqErr } = await sb
            .from('quiz_questions')
            .select('*')
            .eq('quiz_id', quiz.id)
            .order('created_at', { ascending: true });

          if (!qqErr && questions) {
            return { quiz, questions };
          }
          throw new Error(`Supabase getQuizQuestions failed: ${qqErr?.message}`);
        }
        if (qErr && qErr.code === 'PGRST116') {
          return null; // Quiz hasn't been generated yet
        }
        throw new Error(`Supabase getQuizByLecture failed: ${qErr?.message}`);
      } catch (err: any) {
        throw new Error(`Supabase exception: ${err.message}`);
      }
    }

    // Prisma Fallback
    if (!prisma) return null;
    const quiz = await prisma.quiz.findFirst({
      where: { lectureId },
      include: { questions: true },
    });

    if (!quiz) return null;

    return {
      quiz: { id: quiz.id, lecture_id: quiz.lectureId, title: quiz.title },
      questions: quiz.questions.map((q: any) => ({
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
    if (!prisma) throw new Error('Database service unavailable');
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
    if (!prisma) return null;
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
    answers: Array<{ questionId: string; selectedAnswer: string | number }>
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
      if (!prisma) throw new Error('Database service unavailable');
      const list = await prisma.quizQuestion.findMany({
        where: { quizId: attempt.quiz_id },
      });
      if (!list || list.length === 0) {
        throw new Error('Quiz questions not found');
      }
      quizQuestions = list.map((q: any) => ({
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
      selected_answer: any;
      is_correct: boolean;
    }> = [];

    for (const ans of answers) {
      const qRecord = questionMap.get(ans.questionId);
      if (!qRecord) {
        throw new Error('Invalid question submitted');
      }

      // Determine correctness and integer representation based on type of answer
      let isCorrect = false;
      let selectedAnswerInt = 0;

      const correctOptionText = qRecord.options?.[qRecord.correct_answer] || '';

      if (typeof ans.selectedAnswer === 'number') {
        selectedAnswerInt = ans.selectedAnswer;
        isCorrect = ans.selectedAnswer === qRecord.correct_answer;
      } else if (typeof ans.selectedAnswer === 'string') {
        const studentAnswer = ans.selectedAnswer.trim();
        isCorrect = isAnswerMatch(studentAnswer, correctOptionText, qRecord.options, qRecord.correct_answer);

        // Find best option index that corresponds to the student answer
        const matchedIdx = qRecord.options?.findIndex((opt: string, i: number) =>
          isAnswerMatch(studentAnswer, opt, qRecord.options, i)
        );

        selectedAnswerInt = matchedIdx !== undefined && matchedIdx >= 0
          ? matchedIdx
          : (isCorrect ? qRecord.correct_answer : 0);
      } else {
        throw new Error('Invalid answer submitted');
      }

      if (isCorrect) correctCount++;

      answerRecordsToInsert.push({
        attempt_id: attemptId,
        question_id: ans.questionId,
        selected_answer: selectedAnswerInt,
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

      // Update Concept Mastery for answered questions
      for (const ans of answers) {
        const qRecord = questionMap.get(ans.questionId);
        const conceptId = qRecord?.concept_id;
        if (conceptId) {
          const isCorrect = typeof ans.selectedAnswer === 'number'
            ? ans.selectedAnswer === qRecord.correct_answer
            : isAnswerMatch(ans.selectedAnswer ?? '', qRecord.options?.[qRecord.correct_answer] ?? '', qRecord.options, qRecord.correct_answer);
          try {
            await this.updateConceptMastery(userId, conceptId, isCorrect);
          } catch (mErr) {
            console.error(`Error updating concept mastery for concept ${conceptId}:`, mErr);
          }
        }
      }

      return {
        attempt: updatedAttempt,
        score: percentageScore,
        correctAnswers: correctCount,
        totalQuestions,
      };
    }

    // Prisma Fallback
    if (!prisma) throw new Error('Database service unavailable');
    await Promise.all(
      answerRecordsToInsert.map((ans: any) =>
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

    // Update Concept Mastery for answered questions (Prisma Fallback)
    for (const ans of answers) {
      const qRecord = questionMap.get(ans.questionId);
      const conceptId = qRecord?.concept_id;
      if (conceptId) {
        const isCorrect = typeof ans.selectedAnswer === 'number'
          ? ans.selectedAnswer === qRecord.correct_answer
          : (ans.selectedAnswer ?? '').trim().toLowerCase() === (qRecord.options?.[qRecord.correct_answer] ?? '').trim().toLowerCase();
        try {
          await this.updateConceptMastery(userId, conceptId, isCorrect);
        } catch (mErr) {
          console.error(`Error updating concept mastery for concept ${conceptId}:`, mErr);
        }
      }
    }

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
      const correctAnswers = answers.filter((a: any) => a.is_correct).length;
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
    if (!prisma) return null;
    const [answers, quiz] = await Promise.all([
      prisma.quizAnswer.findMany({ where: { attemptId } }),
      prisma.quiz.findUnique({ where: { id: attempt.quiz_id } }),
    ]);

    const totalQuestions = answers.length;
    const correctAnswers = answers.filter((a: any) => a.isCorrect).length;
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

  // =========================================
  // CONCEPT MASTERY & REVISION TASKS (PHASE 6)
  // =========================================
  async updateConceptMastery(
    userId: string,
    conceptId: string,
    isCorrect: boolean
  ): Promise<ConceptMasteryRecord> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data: existing } = await sb
        .from('concept_mastery')
        .select('*')
        .eq('user_id', userId)
        .eq('concept_id', conceptId)
        .maybeSingle();

      const correctCount = (existing?.correct_count || 0) + (isCorrect ? 1 : 0);
      const incorrectCount = (existing?.incorrect_count || 0) + (isCorrect ? 0 : 1);
      const total = correctCount + incorrectCount;
      const masteryScore = total > 0 ? Math.round((correctCount / total) * 100) : 0;

      let daysToAdd = 1;
      if (masteryScore >= 80) {
        daysToAdd = 7;
      } else if (masteryScore >= 60) {
        daysToAdd = 3;
      }

      const lastReviewedAt = new Date().toISOString();
      const nextReviewAt = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

      const { data: updated, error } = await sb
        .from('concept_mastery')
        .upsert(
          {
            user_id: userId,
            concept_id: conceptId,
            mastery_score: masteryScore,
            correct_count: correctCount,
            incorrect_count: incorrectCount,
            last_reviewed_at: lastReviewedAt,
            next_review_at: nextReviewAt,
          },
          { onConflict: 'user_id,concept_id' }
        )
        .select('*')
        .single();

      if (error || !updated) {
        throw new Error(`Failed to update concept mastery: ${error?.message}`);
      }

      if (masteryScore < 60) {
        await this.createRevisionTask(userId, conceptId, masteryScore, nextReviewAt);
      }

      return updated;
    }

    // Prisma Fallback
    if (!prisma) throw new Error('Database service unavailable');
    const existing = await prisma.conceptMastery.findUnique({
      where: {
        userId_conceptId: {
          userId,
          conceptId,
        },
      },
    });

    const correctCount = (existing?.correctCount || 0) + (isCorrect ? 1 : 0);
    const incorrectCount = (existing?.incorrectCount || 0) + (isCorrect ? 0 : 1);
    const total = correctCount + incorrectCount;
    const masteryScore = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    let daysToAdd = 1;
    if (masteryScore >= 80) {
      daysToAdd = 7;
    } else if (masteryScore >= 60) {
      daysToAdd = 3;
    }

    const lastReviewedAt = new Date();
    const nextReviewAt = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);

    const updated = await prisma.conceptMastery.upsert({
      where: {
        userId_conceptId: {
          userId,
          conceptId,
        },
      },
      create: {
        userId,
        conceptId,
        masteryScore,
        correctCount,
        incorrectCount,
        lastReviewedAt,
        nextReviewAt,
      },
      update: {
        masteryScore,
        correctCount,
        incorrectCount,
        lastReviewedAt,
        nextReviewAt,
      },
    });

    if (masteryScore < 60) {
      await this.createRevisionTask(userId, conceptId, masteryScore, nextReviewAt.toISOString());
    }

    return {
      id: updated.id,
      user_id: updated.userId,
      concept_id: updated.conceptId,
      mastery_score: updated.masteryScore,
      correct_count: updated.correctCount,
      incorrect_count: updated.incorrectCount,
      last_reviewed_at: updated.lastReviewedAt.toISOString(),
      next_review_at: updated.nextReviewAt.toISOString(),
    };
  }

  async createRevisionTask(
    userId: string,
    conceptId: string,
    masteryScore: number,
    scheduledFor?: string
  ): Promise<RevisionTaskRecord> {
    const sb = getSupabaseAdmin();
    const contentObj = {
      reason: 'Weak concept detected from quiz performance',
      masteryScore,
      recommendedAction: 'Review this concept and retry related questions',
    };

    if (sb) {
      // Check for existing unfinished revision task to prevent duplicates
      const { data: existingTask } = await sb
        .from('revision_tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('concept_id', conceptId)
        .eq('completed', false)
        .maybeSingle();

      if (existingTask) {
        return existingTask;
      }

      const { data: created, error } = await sb
        .from('revision_tasks')
        .insert({
          user_id: userId,
          concept_id: conceptId,
          task_type: 'TARGETED_REVISION',
          content: contentObj,
          scheduled_for: scheduledFor || new Date().toISOString(),
          completed: false,
        })
        .select('*')
        .single();

      if (error || !created) {
        throw new Error(`Failed to create revision task: ${error?.message}`);
      }
      return created;
    }

    // Prisma Fallback
    if (!prisma) throw new Error('Database service unavailable');
    const existingTask = await prisma.revisionTask.findFirst({
      where: {
        userId,
        conceptId,
        completed: false,
      },
    });

    if (existingTask) {
      return {
        id: existingTask.id,
        user_id: existingTask.userId,
        concept_id: existingTask.conceptId,
        task_type: existingTask.taskType,
        content: existingTask.content ? JSON.parse(existingTask.content) : null,
        scheduled_for: existingTask.scheduledFor.toISOString(),
        completed: existingTask.completed,
        created_at: existingTask.createdAt.toISOString(),
      };
    }

    const created = await prisma.revisionTask.create({
      data: {
        userId,
        conceptId,
        taskType: 'TARGETED_REVISION',
        content: JSON.stringify(contentObj),
        scheduledFor: scheduledFor ? new Date(scheduledFor) : new Date(),
        completed: false,
      },
    });

    return {
      id: created.id,
      user_id: created.userId,
      concept_id: created.conceptId,
      task_type: created.taskType,
      content: contentObj,
      scheduled_for: created.scheduledFor.toISOString(),
      completed: created.completed,
      created_at: created.createdAt.toISOString(),
    };
  }

  async getConceptMastery(userId: string, conceptId?: string): Promise<ConceptMasteryRecord[]> {
    const sb = getSupabaseAdmin();
    if (sb) {
      try {
        let query = sb.from('concept_mastery').select('*').eq('user_id', userId);
        if (conceptId) {
          query = query.eq('concept_id', conceptId);
        }

        const { data, error } = await query.order('last_reviewed_at', { ascending: false });
        if (!error && data) return data;
        console.warn(`Supabase getConceptMastery failed (${error?.message}). Falling back to Prisma...`);
      } catch (err) {
        console.warn('Supabase getConceptMastery exception, falling back to Prisma:', err);
      }
    }

    // Prisma Fallback
    if (!prisma) return [];
    const whereClause: any = { userId };
    if (conceptId) whereClause.conceptId = conceptId;

    const list = await prisma.conceptMastery.findMany({
      where: whereClause,
      orderBy: { lastReviewedAt: 'desc' },
    });

    return list.map((m: any) => ({
      id: m.id,
      user_id: m.userId,
      concept_id: m.conceptId,
      mastery_score: m.masteryScore,
      correct_count: m.correctCount,
      incorrect_count: m.incorrectCount,
      last_reviewed_at: m.lastReviewedAt.toISOString(),
      next_review_at: m.nextReviewAt.toISOString(),
    }));
  }

  async getRevisionTasks(userId: string, includeCompleted?: boolean): Promise<RevisionTaskRecord[]> {
    const sb = getSupabaseAdmin();
    if (sb) {
      try {
        let query = sb.from('revision_tasks').select('*').eq('user_id', userId);
        if (!includeCompleted) {
          query = query.eq('completed', false);
        }

        const { data, error } = await query.order('scheduled_for', { ascending: true });
        if (!error && data) return data;
        console.warn(`Supabase getRevisionTasks failed (${error?.message}). Falling back to Prisma...`);
      } catch (err) {
        console.warn('Supabase getRevisionTasks exception, falling back to Prisma:', err);
      }
    }

    // Prisma Fallback
    if (!prisma) return [];
    const whereClause: any = { userId };
    if (!includeCompleted) {
      whereClause.completed = false;
    }

    const list = await prisma.revisionTask.findMany({
      where: whereClause,
      orderBy: { scheduledFor: 'asc' },
    });

    return list.map((t: any) => ({
      id: t.id,
      user_id: t.userId,
      concept_id: t.conceptId,
      task_type: t.taskType,
      content: t.content ? JSON.parse(t.content) : null,
      scheduled_for: t.scheduledFor.toISOString(),
      completed: t.completed,
      created_at: t.createdAt.toISOString(),
    }));
  }

  async getDashboardData(userId: string) {
    const sb = getSupabaseAdmin();
    if (sb) {
      try {
        // 1. Fetch Lectures
        const { data: lectures, error: lecErr } = await sb
          .from('lectures')
          .select('*, concepts:concepts(count), flashcards:flashcards(count), quizzes:quizzes(count)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!lecErr && lectures && lectures.length > 0) {
          const formattedLectures = lectures.map((l: any) => ({
            ...l,
            _count: {
              concepts: l.concepts?.[0]?.count || 0,
              flashcards: l.flashcards?.[0]?.count || 0,
              quizzes: l.quizzes?.[0]?.count || 0,
            },
          }));

          // 2. Fetch Quiz Attempts
          const { data: quizAttempts } = await sb
            .from('quiz_attempts')
            .select('*')
            .eq('user_id', userId);

          const quizzesAttempted = quizAttempts?.length || 0;
          let averageScore = 0;
          if (quizzesAttempted > 0) {
            const totalScore = quizAttempts!.reduce((sum: number, a: any) => sum + (a.score || 0), 0);
            averageScore = Math.round(totalScore / quizzesAttempted);
          }

          // 3. Fetch Concept Mastery with Concept details
          const { data: masteryData } = await sb
            .from('concept_mastery')
            .select('*, concept:concepts(id, name, lecture_id)')
            .eq('user_id', userId)
            .order('last_reviewed_at', { ascending: false });

          const mastery = (masteryData || []).map((m: any) => ({
            id: m.id,
            user_id: m.user_id,
            concept_id: m.concept_id,
            concept_name: m.concept?.name || 'Concept',
            lecture_id: m.concept?.lecture_id || null,
            mastery_score: m.mastery_score,
            correct_count: m.correct_count,
            incorrect_count: m.incorrect_count,
            last_reviewed_at: m.last_reviewed_at,
            next_review_at: m.next_review_at,
          }));

          const conceptsMastered = mastery.filter((m: any) => m.mastery_score >= 80).length;
          const weakConcepts = mastery.filter((m: any) => m.mastery_score < 60);

          // 4. Fetch Revision Tasks with Concept details
          const { data: taskData } = await sb
            .from('revision_tasks')
            .select('*, concept:concepts(id, name, lecture_id)')
            .eq('user_id', userId)
            .eq('completed', false)
            .order('scheduled_for', { ascending: true });

          const revisionTasks = (taskData || []).map((t: any) => {
            const matchingMastery = mastery.find((m: any) => m.concept_id === t.concept_id);
            return {
              id: t.id,
              user_id: t.user_id,
              concept_id: t.concept_id,
              concept_name: t.concept?.name || 'Concept',
              lecture_id: t.concept?.lecture_id || null,
              task_type: t.task_type,
              mastery_score: matchingMastery?.mastery_score ?? 0,
              content: t.content,
              scheduled_for: t.scheduled_for,
              completed: t.completed,
              created_at: t.created_at,
            };
          });

          // 5. Upcoming Reviews sorted by earliest next_review_at
          const upcomingReviews = [...mastery].sort(
            (a: any, b: any) => new Date(a.next_review_at).getTime() - new Date(b.next_review_at).getTime()
          );

          return {
            stats: {
              totalLectures: formattedLectures.length,
              quizzesAttempted,
              averageScore,
              conceptsMastered,
            },
            mastery,
            weakConcepts,
            revisionTasks,
            upcomingReviews,
            recentLectures: formattedLectures.slice(0, 5),
          };
        }
      } catch (err) {
        console.warn('Supabase getDashboardData failed, falling back to Prisma:', err);
      }
    }

    // Prisma Fallback
    if (!prisma) throw new Error('Database service unavailable');
    const [lectures, quizAttempts, masteryList, revisionTaskList] = await Promise.all([
      prisma.lecture.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { concepts: true, flashcards: true, quizzes: true } } },
      }),
      prisma.quizAttempt.findMany({
        where: { userId },
      }),
      prisma.conceptMastery.findMany({
        where: { userId },
        include: { concept: true },
        orderBy: { lastReviewedAt: 'desc' },
      }),
      prisma.revisionTask.findMany({
        where: { userId, completed: false },
        include: { concept: true },
        orderBy: { scheduledFor: 'asc' },
      }),
    ]);

    const formattedLectures = lectures.map((item: any) => ({
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

    const quizzesAttempted = quizAttempts.length;
    let averageScore = 0;
    if (quizzesAttempted > 0) {
      const totalScore = quizAttempts.reduce((sum: number, a: any) => sum + (a.score || 0), 0);
      averageScore = Math.round(totalScore / quizzesAttempted);
    }

    const mastery = masteryList.map((m: any) => ({
      id: m.id,
      user_id: m.userId,
      concept_id: m.conceptId,
      concept_name: m.concept?.name || 'Concept',
      lecture_id: m.concept?.lectureId || null,
      mastery_score: m.masteryScore,
      correct_count: m.correctCount,
      incorrect_count: m.incorrectCount,
      last_reviewed_at: m.lastReviewedAt.toISOString(),
      next_review_at: m.nextReviewAt.toISOString(),
    }));

    const conceptsMastered = mastery.filter((m: any) => m.mastery_score >= 80).length;
    const weakConcepts = mastery.filter((m: any) => m.mastery_score < 60);

    const revisionTasks = revisionTaskList.map((t: any) => {
      const matchingMastery = mastery.find((m: any) => m.concept_id === t.conceptId);
      return {
        id: t.id,
        user_id: t.userId,
        concept_id: t.conceptId,
        concept_name: t.concept?.name || 'Concept',
        lecture_id: t.concept?.lectureId || null,
        task_type: t.taskType,
        mastery_score: matchingMastery?.mastery_score ?? 0,
        content: t.content ? JSON.parse(t.content) : null,
        scheduled_for: t.scheduledFor.toISOString(),
        completed: t.completed,
        created_at: t.createdAt.toISOString(),
      };
    });

    const upcomingReviews = [...mastery].sort(
      (a: any, b: any) => new Date(a.next_review_at).getTime() - new Date(b.next_review_at).getTime()
    );

    return {
      stats: {
        totalLectures: formattedLectures.length,
        quizzesAttempted,
        averageScore,
        conceptsMastered,
      },
      mastery,
      weakConcepts,
      revisionTasks,
      upcomingReviews,
      recentLectures: formattedLectures.slice(0, 5),
    };
  }
}

export const db = new SupabaseDatabaseService();
export default db;
