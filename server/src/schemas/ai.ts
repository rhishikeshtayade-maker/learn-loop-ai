import { z } from 'zod';

export const ConceptSchema = z.object({
  name: z.string().min(1, 'Concept name is required'),
  description: z.string().min(1, 'Concept description is required'),
  importance: z.enum(['HIGH', 'MEDIUM', 'LOW']).catch('MEDIUM'),
  timestampStart: z.number().nullable().optional(),
  timestampEnd: z.number().nullable().optional(),
});

export const ConceptsArraySchema = z.array(ConceptSchema).min(1, 'At least 1 concept required');

export const SummarySchema = z.object({
  overview: z.string().min(1, 'Overview is required'),
  keyTakeaways: z.array(z.string()).default([]),
  importantDefinitions: z.array(z.string()).default([]),
  importantFacts: z.array(z.string()).default([]),
  formulasOrRules: z.array(z.string()).default([]),
  prerequisites: z.array(z.string()).default([]),
});

export const ConceptExplanationSchema = z.object({
  conceptName: z.string().min(1, 'Concept name is required'),
  simpleExplanation: z.string().min(1, 'Simple explanation is required'),
  detailedExplanation: z.string().min(1, 'Detailed explanation is required'),
  example: z.string().min(1, 'Example is required'),
  commonMisconception: z.string().min(1, 'Common misconception is required'),
  keyTakeaway: z.string().min(1, 'Key takeaway is required'),
});

export const ConceptExplanationsArraySchema = z.array(ConceptExplanationSchema);

export const FlashcardSchema = z.object({
  question: z.string().min(1, 'Flashcard question is required'),
  answer: z.string().optional().default(''),
  options: z.array(z.string()).length(4, 'Flashcard must have exactly 4 options'),
  correctAnswer: z.number().int().min(0).max(3, 'Correct answer index must be 0, 1, 2, or 3'),
  explanation: z.string().min(1, 'Explanation is required'),
  conceptName: z.string().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).catch('MEDIUM'),
}).transform((card) => ({
  ...card,
  answer: card.answer || card.options[card.correctAnswer] || '',
}));

export const FlashcardsArraySchema = z.array(FlashcardSchema).min(1, 'At least 1 flashcard required');

export const QuizQuestionSchema = z.object({
  question: z.string().min(1, 'Quiz question is required'),
  options: z.array(z.string()).length(4, 'Quiz question must have exactly 4 options'),
  correctAnswer: z.number().int().min(0).max(3, 'Correct answer index must be 0, 1, 2, or 3'),
  explanation: z.string().min(1, 'Explanation is required'),
  conceptName: z.string().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).catch('MEDIUM'),
});

export const QuizQuestionsArraySchema = z.array(QuizQuestionSchema).min(1, 'At least 1 quiz question required');

export const RelationshipTypeSchema = z.enum([
  'PREREQUISITE',
  'RELATED_TO',
  'PART_OF',
  'LEADS_TO',
  'APPLICATION_OF',
]);

export const ConceptRelationshipSchema = z.object({
  sourceConceptId: z.string().min(1, 'Source concept ID is required'),
  targetConceptId: z.string().min(1, 'Target concept ID is required'),
  relationshipType: RelationshipTypeSchema.catch('RELATED_TO'),
  confidence: z.number().min(0).max(1).catch(0.9),
  description: z.string().optional().default(''),
});

export const ConceptRelationshipsArraySchema = z.array(ConceptRelationshipSchema);

export const ConceptExplorationSchema = z.object({
  conceptName: z.string(),
  summary: z.string(),
  prerequisites: z.array(z.string()).default([]),
  realWorldApplications: z.array(z.string()).default([]),
  suggestedQuestions: z.array(z.string()).default([]),
  keyInsights: z.array(z.string()).default([]),
});

