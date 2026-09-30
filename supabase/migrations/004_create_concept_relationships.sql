-- LearnLoop AI - Migration 004: Create Concept Relationships Table
-- Feature: AI Knowledge Discovery Graph

CREATE TABLE IF NOT EXISTS public.concept_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  source_concept_id UUID NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  target_concept_id UUID NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL, -- 'PREREQUISITE', 'RELATED_TO', 'PART_OF', 'LEADS_TO', 'APPLICATION_OF'
  confidence DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_concept_relationship UNIQUE(source_concept_id, target_concept_id, relationship_type)
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_concept_relationships_lecture_id ON public.concept_relationships(lecture_id);
CREATE INDEX IF NOT EXISTS idx_concept_relationships_source ON public.concept_relationships(source_concept_id);
CREATE INDEX IF NOT EXISTS idx_concept_relationships_target ON public.concept_relationships(target_concept_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.concept_relationships ENABLE ROW LEVEL SECURITY;

-- User isolation policy: Access relationships only if lecture belongs to authenticated user
CREATE POLICY "Concept relationships user isolation" ON public.concept_relationships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.lectures l
      WHERE l.id = concept_relationships.lecture_id AND l.user_id = auth.uid()
    )
  );
