-- Migration 003: Drop stray foreign key constraint on profiles

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'profiles_id_fkey' AND table_name = 'profiles') THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
  END IF;
END $$;
