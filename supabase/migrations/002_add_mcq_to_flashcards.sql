-- ==========================================
-- Migration 002: Add MCQ options, correct_answer, and explanation to flashcards table
-- ==========================================

ALTER TABLE public.flashcards 
ADD COLUMN IF NOT EXISTS options JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS correct_answer INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS explanation TEXT DEFAULT NULL;
