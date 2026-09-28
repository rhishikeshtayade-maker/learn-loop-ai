import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../../config';
import { getConceptPrompt } from './prompts/conceptPrompt';
import { getSummaryPrompt } from './prompts/summaryPrompt';
import { getExplanationPrompt } from './prompts/explanationPrompt';
import { getFlashcardPrompt } from './prompts/flashcardPrompt';
import { getQuizPrompt } from './prompts/quizPrompt';
import {
  ConceptsArraySchema,
  SummarySchema,
  ConceptExplanationsArraySchema,
  FlashcardsArraySchema,
  QuizQuestionsArraySchema,
} from '../../schemas/ai';

export class GeminiError extends Error {
  constructor(message: string, public readonly originalError?: any) {
    super(message);
    this.name = 'GeminiError';
  }
}

export class GeminiService {
  private getModel() {
    const apiKey = config.geminiApiKey;
    if (!apiKey) {
      throw new GeminiError('GEMINI_API_KEY environment variable is not configured.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });
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
      throw new GeminiError(`Failed to parse structured JSON from Gemini response: ${err.message}`, err);
    }
  }

  /**
   * 1. Extract Concepts
   */
  async extractConcepts(transcript: string) {
    const model = this.getModel();
    const prompt = getConceptPrompt(transcript);

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const rawJson = this.parseJSON<unknown>(text);
      const validated = ConceptsArraySchema.parse(rawJson);
      return validated;
    } catch (err: any) {
      console.error('Gemini extractConcepts error:', err?.message || err);
      throw new GeminiError(`Concept extraction failed: ${err.message}`, err);
    }
  }

  /**
   * 2. Generate Summary
   */
  async generateSummary(transcript: string) {
    const model = this.getModel();
    const prompt = getSummaryPrompt(transcript);

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const rawJson = this.parseJSON<unknown>(text);
      const validated = SummarySchema.parse(rawJson);
      return validated;
    } catch (err: any) {
      console.error('Gemini generateSummary error:', err?.message || err);
      throw new GeminiError(`Summary generation failed: ${err.message}`, err);
    }
  }

  /**
   * 3. Generate Concept Explanations
   */
  async generateConceptExplanations(transcript: string, concepts: Array<{ name: string; description: string }>) {
    const model = this.getModel();
    const prompt = getExplanationPrompt(transcript, concepts);

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const rawJson = this.parseJSON<unknown>(text);
      const validated = ConceptExplanationsArraySchema.parse(rawJson);
      return validated;
    } catch (err: any) {
      console.error('Gemini generateConceptExplanations error:', err?.message || err);
      throw new GeminiError(`Concept explanation generation failed: ${err.message}`, err);
    }
  }

  /**
   * 4. Generate Flashcards
   */
  async generateFlashcards(transcript: string, concepts: Array<{ name: string }>) {
    const model = this.getModel();
    const prompt = getFlashcardPrompt(transcript, concepts);

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const rawJson = this.parseJSON<unknown>(text);
      const validated = FlashcardsArraySchema.parse(rawJson);
      return validated;
    } catch (err: any) {
      console.error('Gemini generateFlashcards error:', err?.message || err);
      throw new GeminiError(`Flashcard generation failed: ${err.message}`, err);
    }
  }

  /**
   * 5. Generate Quiz
   */
  async generateQuiz(transcript: string, concepts: Array<{ name: string }>) {
    const model = this.getModel();
    const prompt = getQuizPrompt(transcript, concepts);

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const rawJson = this.parseJSON<unknown>(text);
      const validated = QuizQuestionsArraySchema.parse(rawJson);
      return validated;
    } catch (err: any) {
      console.error('Gemini generateQuiz error:', err?.message || err);
      throw new GeminiError(`Quiz generation failed: ${err.message}`, err);
    }
  }
}

export const geminiService = new GeminiService();
export default geminiService;
