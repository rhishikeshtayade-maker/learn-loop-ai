-- LearnLoop AI - Complete Supabase PostgreSQL Database Schema
-- Migration 001_initial_schema.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. PUBLIC PROFILES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to automatically create profile on signup (disabled)
-- CREATE OR REPLACE FUNCTION public.handle_new_user()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   INSERT INTO public.profiles (id, name)
--   VALUES (
--     new.id,
--     COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'Student')
--   )
--   ON CONFLICT (id) DO UPDATE
--   SET name = EXCLUDED.name;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
--
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users;
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 2. LECTURES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.lectures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  youtube_url TEXT NOT NULL,
  title TEXT NOT NULL,
  transcript TEXT DEFAULT '',
  transcript_segments JSONB,
  duration INT,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED, AI_PROCESSING, AI_COMPLETED
  error_message TEXT,
  summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lectures_user_id ON public.lectures(user_id);
CREATE INDEX IF NOT EXISTS idx_lectures_status ON public.lectures(status);

-- ==========================================
-- 3. CONCEPTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  importance TEXT NOT NULL DEFAULT 'MEDIUM', -- HIGH, MEDIUM, LOW
  timestamp_start INT,
  timestamp_end INT,
  simple_explanation TEXT,
  detailed_explanation TEXT,
  example TEXT,
  common_misconception TEXT,
  key_takeaway TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_concepts_lecture_id ON public.concepts(lecture_id);

-- ==========================================
-- 4. FLASHCARDS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  concept_id UUID REFERENCES public.concepts(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'MEDIUM', -- EASY, MEDIUM, HARD
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flashcards_lecture_id ON public.flashcards(lecture_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_concept_id ON public.flashcards(concept_id);

-- ==========================================
-- 5. QUIZZES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_lecture_id ON public.quizzes(lecture_id);

-- ==========================================
-- 6. QUIZ QUESTIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  concept_id UUID REFERENCES public.concepts(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer INT NOT NULL,
  explanation TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'MEDIUM', -- EASY, MEDIUM, HARD
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON public.quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_concept_id ON public.quiz_questions(concept_id);

-- ==========================================
-- 7. QUIZ ATTEMPTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);

-- ==========================================
-- 8. QUIZ ANSWERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  selected_answer INT NOT NULL,
  is_correct BOOLEAN NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quiz_answers_attempt_id ON public.quiz_answers(attempt_id);

-- ==========================================
-- 9. CONCEPT MASTERY TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.concept_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  mastery_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  correct_count INT NOT NULL DEFAULT 0,
  incorrect_count INT NOT NULL DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_review_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_concept UNIQUE(user_id, concept_id)
);

CREATE INDEX IF NOT EXISTS idx_concept_mastery_user_id ON public.concept_mastery(user_id);

-- ==========================================
-- 10. REVISION TASKS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.revision_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL DEFAULT 'TARGETED_REVISION',
  content JSONB,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revision_tasks_user_id ON public.revision_tasks(user_id);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all public tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concept_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revision_tasks ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can select/update their own profile
CREATE POLICY "Profiles self access" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- Lectures: Users can access only their own lectures
CREATE POLICY "Lectures user isolation" ON public.lectures
  FOR ALL USING (auth.uid() = user_id);

-- Concepts: Accessible if the concept's lecture belongs to auth.uid()
CREATE POLICY "Concepts user isolation" ON public.concepts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.lectures l
      WHERE l.id = concepts.lecture_id AND l.user_id = auth.uid()
    )
  );

-- Flashcards: Accessible if the flashcard's lecture belongs to auth.uid()
CREATE POLICY "Flashcards user isolation" ON public.flashcards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.lectures l
      WHERE l.id = flashcards.lecture_id AND l.user_id = auth.uid()
    )
  );

-- Quizzes: Accessible if the quiz's lecture belongs to auth.uid()
CREATE POLICY "Quizzes user isolation" ON public.quizzes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.lectures l
      WHERE l.id = quizzes.lecture_id AND l.user_id = auth.uid()
    )
  );

-- Quiz Questions: Accessible if parent quiz belongs to a lecture owned by auth.uid()
CREATE POLICY "Quiz questions user isolation" ON public.quiz_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      JOIN public.lectures l ON l.id = q.lecture_id
      WHERE q.id = quiz_questions.quiz_id AND l.user_id = auth.uid()
    )
  );

-- Quiz Attempts: Accessible if user_id matches auth.uid()
CREATE POLICY "Quiz attempts user isolation" ON public.quiz_attempts
  FOR ALL USING (auth.uid() = user_id);

-- Quiz Answers: Accessible if quiz attempt belongs to auth.uid()
CREATE POLICY "Quiz answers user isolation" ON public.quiz_answers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      WHERE qa.id = quiz_answers.attempt_id AND qa.user_id = auth.uid()
    )
  );

-- Concept Mastery: Accessible if user_id matches auth.uid()
CREATE POLICY "Concept mastery user isolation" ON public.concept_mastery
  FOR ALL USING (auth.uid() = user_id);

-- Revision Tasks: Accessible if user_id matches auth.uid()
CREATE POLICY "Revision tasks user isolation" ON public.revision_tasks
  FOR ALL USING (auth.uid() = user_id);
