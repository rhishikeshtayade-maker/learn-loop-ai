import { GoogleGenAI } from '@google/genai';
import config from '../../config';
import { getConceptPrompt } from './prompts/conceptPrompt';
import { getSummaryPrompt } from './prompts/summaryPrompt';
import { getExplanationPrompt } from './prompts/explanationPrompt';
import { getFlashcardPrompt } from './prompts/flashcardPrompt';
import { getQuizPrompt } from './prompts/quizPrompt';
import { getRelationshipPrompt, getExploreConceptPrompt } from './prompts/relationshipPrompt';
import {
  ConceptsArraySchema,
  SummarySchema,
  ConceptExplanationsArraySchema,
  FlashcardsArraySchema,
  QuizQuestionsArraySchema,
  ConceptRelationshipsArraySchema,
  ConceptExplorationSchema,
} from '../../schemas/ai';

export class GeminiError extends Error {
  constructor(message: string, public readonly originalError?: any) {
    super(message);
    this.name = 'GeminiError';
  }
}

export class GeminiService {
  /**
   * Safe generation method using @google/genai with automatic model fallbacks
   */
  private async generateContentWithFallback(prompt: string): Promise<string> {
    const apiKey = config.geminiApiKey;
    if (!apiKey) {
      throw new GeminiError('GEMINI_API_KEY environment variable is not configured.');
    }

    const ai = new GoogleGenAI({ apiKey });
    const candidateModels = ['gemini-3.7-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'];
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        console.log(`[Gemini Request] Sending request to model=${model} (prompt length=${prompt.length} chars)`);
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        const responseText = response.text || '';
        console.log(`[Gemini Response] Received from model=${model} (response length=${responseText.length} chars)`);
        if (responseText.trim().length > 0) {
          return responseText;
        }
      } catch (err: any) {
        lastError = err;
        const errName = err?.name || 'Error';
        const errCode = err?.status || err?.code || 'UNKNOWN';
        const errMsg = err?.message || String(err);
        console.error(`[Gemini Error] Model ${model} failed (${errName}, code=${errCode}): ${errMsg}`);
      }
    }

    throw new GeminiError(
      `Gemini AI generation failed across all fallback models: ${lastError?.message || 'Unknown error'}`,
      lastError
    );
  }

  /**
   * Helper to clean Gemini response text (stripping code fences) and parse JSON
   */
  private parseJSON<T>(rawText: string): T {
    try {
      let cleaned = rawText.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      }
      return JSON.parse(cleaned) as T;
    } catch (err: any) {
      console.error('[Gemini JSON Parse Error] Raw text preview:', rawText.slice(0, 200));
      throw new GeminiError(`Failed to parse structured JSON from Gemini response: ${err.message}`, err);
    }
  }

  /**
   * 1. Extract Concepts
   */
  async extractConcepts(transcript: string) {
    const prompt = getConceptPrompt(transcript);
    try {
      const text = await this.generateContentWithFallback(prompt);
      const rawJson = this.parseJSON<unknown>(text);
      const validated = ConceptsArraySchema.parse(rawJson);
      return validated;
    } catch (err: any) {
      console.error('Gemini extractConcepts error:', err?.message || err);
      throw err instanceof GeminiError ? err : new GeminiError(`Concept extraction failed: ${err.message}`, err);
    }
  }

  /**
   * 2. Generate Summary
   */
  async generateSummary(transcript: string) {
    const prompt = getSummaryPrompt(transcript);
    try {
      const text = await this.generateContentWithFallback(prompt);
      const rawJson = this.parseJSON<unknown>(text);
      const validated = SummarySchema.parse(rawJson);
      return validated;
    } catch (err: any) {
      console.error('Gemini generateSummary error:', err?.message || err);
      throw err instanceof GeminiError ? err : new GeminiError(`Summary generation failed: ${err.message}`, err);
    }
  }

  /**
   * 3. Generate Concept Explanations
   */
  async generateConceptExplanations(transcript: string, concepts: Array<{ name: string; description: string }>) {
    const prompt = getExplanationPrompt(transcript, concepts);
    try {
      const text = await this.generateContentWithFallback(prompt);
      const rawJson = this.parseJSON<unknown>(text);
      const validated = ConceptExplanationsArraySchema.parse(rawJson);
      return validated;
    } catch (err: any) {
      console.error('Gemini generateConceptExplanations error:', err?.message || err);
      throw err instanceof GeminiError ? err : new GeminiError(`Concept explanation generation failed: ${err.message}`, err);
    }
  }

  /**
   * 4. Generate Flashcards
   */
  async generateFlashcards(transcript: string, concepts: Array<{ name: string }>) {
    const prompt = getFlashcardPrompt(transcript, concepts);
    try {
      const text = await this.generateContentWithFallback(prompt);
      const rawJson = this.parseJSON<unknown>(text);
      const validated = FlashcardsArraySchema.parse(rawJson);
      return validated;
    } catch (err: any) {
      console.error('Gemini generateFlashcards error:', err?.message || err);
      throw err instanceof GeminiError ? err : new GeminiError(`Flashcard generation failed: ${err.message}`, err);
    }
  }

  /**
   * 5. Generate Quiz
   */
  async generateQuiz(transcript: string, concepts: Array<{ name: string }>) {
    const prompt = getQuizPrompt(transcript, concepts);
    try {
      const text = await this.generateContentWithFallback(prompt);
      const rawJson = this.parseJSON<unknown>(text);
      const validated = QuizQuestionsArraySchema.parse(rawJson);
      return validated;
    } catch (err: any) {
      console.error('Gemini generateQuiz error:', err?.message || err);
      throw err instanceof GeminiError ? err : new GeminiError(`Quiz generation failed: ${err.message}`, err);
    }
  }

  /**
   * 6. Generate Concept Relationships (AI Knowledge Discovery Graph)
   */
  async generateConceptRelationships(
    transcript: string,
    concepts: Array<{ id: string; name: string; description: string }>
  ) {
    if (!concepts || concepts.length < 2) {
      return [];
    }

    const prompt = getRelationshipPrompt(transcript, concepts);
    try {
      const text = await this.generateContentWithFallback(prompt);
      const rawJson = this.parseJSON<unknown>(text);
      const validated = ConceptRelationshipsArraySchema.parse(rawJson);
      
      // Filter out self-loops or invalid IDs
      const validConceptIds = new Set(concepts.map((c) => c.id));
      const cleanRelationships = validated.filter(
        (rel) =>
          rel.sourceConceptId !== rel.targetConceptId &&
          validConceptIds.has(rel.sourceConceptId) &&
          validConceptIds.has(rel.targetConceptId)
      );

      return cleanRelationships;
    } catch (err: any) {
      console.warn('Gemini generateConceptRelationships warning (fallback to empty list):', err?.message || err);
      return [];
    }
  }

  /**
   * 7. Explore Concept Insights (AI Knowledge Discovery)
   */
  async exploreConcept(
    conceptName: string,
    conceptDesc: string,
    lectureTitle: string,
    transcriptSnippet: string
  ) {
    const prompt = getExploreConceptPrompt(conceptName, conceptDesc, lectureTitle, transcriptSnippet);
    try {
      const text = await this.generateContentWithFallback(prompt);
      const rawJson = this.parseJSON<unknown>(text);
      const validated = ConceptExplorationSchema.parse(rawJson);
      return validated;
    } catch (err: any) {
      console.warn('Gemini exploreConcept fallback due to error:', err?.message || err);
      return {
        conceptName,
        summary: conceptDesc,
        prerequisites: [],
        realWorldApplications: ['Academic problem solving and system analysis'],
        suggestedQuestions: [`How does ${conceptName} relate to the broader principles in ${lectureTitle}?`],
        keyInsights: [conceptDesc],
      };
    }
  }

  /**
   * AI Fallback: Generate structured educational transcript when video subtitles/captions are unavailable
   */
  async generateTranscriptForLecture(title: string): Promise<{
    videoId: string;
    segments: Array<{ text: string; start: number; duration: number }>;
    normalizedText: string;
    duration: number;
  }> {
    const prompt = `You are an expert educator. Create a comprehensive, realistic, and highly educational lecture transcript based on the lecture title: "${title}".
Output a JSON object with this exact structure:
{
  "duration": 1800,
  "segments": [
    {
      "text": "spoken sentence or paragraph in natural lecture format",
      "start": 0,
      "duration": 15
    }
  ]
}
Include at least 15 detailed chronological segments covering introduction, foundational concepts, step-by-step mathematical or conceptual formulas, examples, practical applications, and conclusion. Return strictly valid JSON.`;

    const text = await this.generateContentWithFallback(prompt);
    const rawJson = this.parseJSON<any>(text);
    const segments = Array.isArray(rawJson?.segments) ? rawJson.segments : [];
    const duration = typeof rawJson?.duration === 'number' ? rawJson.duration : (segments[segments.length - 1]?.start || 600) + 30;
    const normalizedText = segments.map((s: any) => s.text).join('\n\n');

    return {
      videoId: '',
      segments,
      normalizedText: normalizedText || `Educational lecture on: ${title}`,
      duration,
    };
  }
}

export const geminiService = new GeminiService();
export default geminiService;

