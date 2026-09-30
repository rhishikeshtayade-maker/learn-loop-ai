-- Migration: Allow typed string answers for quiz_answers
ALTER TABLE public.quiz_answers
  ALTER COLUMN selected_answer TYPE TEXT USING selected_answer::text;
