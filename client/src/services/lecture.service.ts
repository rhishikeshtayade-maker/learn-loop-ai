import { apiRequest } from './api';
import type {
  Lecture,
  CreateLectureResponse,
  LecturesResponse,
  LectureDetailResponse,
  LearningContentResponse,
  Concept,
  SummaryData,
  Flashcard,
  QuizData,
} from '../types/lecture';

export const lectureService = {
  async createLecture(youtubeUrl: string): Promise<Lecture> {
    const res = await apiRequest<CreateLectureResponse>('/api/lectures', {
      method: 'POST',
      body: JSON.stringify({ youtubeUrl }),
    });
    return res.lecture;
  },

  async getLectures(): Promise<Lecture[]> {
    const res = await apiRequest<LecturesResponse>('/api/lectures');
    return res.lectures;
  },

  async getLectureById(id: string): Promise<Lecture> {
    const res = await apiRequest<LectureDetailResponse>(`/api/lectures/${id}`);
    return res.lecture;
  },

  async processLecture(id: string): Promise<Lecture> {
    const res = await apiRequest<LectureDetailResponse>(`/api/lectures/${id}/process`, {
      method: 'POST',
    });
    return res.lecture;
  },

  async deleteLecture(id: string): Promise<void> {
    await apiRequest(`/api/lectures/${id}`, {
      method: 'DELETE',
    });
  },

  // Phase 4 AI Methods
  async processAI(id: string): Promise<{ success: boolean; message: string; counts: any }> {
    return apiRequest<{ success: boolean; message: string; counts: any }>(`/api/lectures/${id}/ai-process`, {
      method: 'POST',
    });
  },

  async getLearningContent(id: string): Promise<LearningContentResponse> {
    return apiRequest<LearningContentResponse>(`/api/lectures/${id}/learning-content`);
  },

  async getConcepts(id: string): Promise<Concept[]> {
    const res = await apiRequest<{ concepts: Concept[] }>(`/api/lectures/${id}/concepts`);
    return res.concepts;
  },

  async getSummary(id: string): Promise<SummaryData | null> {
    const res = await apiRequest<{ summary: SummaryData | null }>(`/api/lectures/${id}/summary`);
    return res.summary;
  },

  async getFlashcards(id: string): Promise<Flashcard[]> {
    const res = await apiRequest<{ flashcards: Flashcard[] }>(`/api/lectures/${id}/flashcards`);
    return res.flashcards;
  },

  async getQuiz(id: string): Promise<QuizData | null> {
    const res = await apiRequest<{ quiz: QuizData | null; questions: any[] }>(`/api/lectures/${id}/quiz`);
    if (!res.quiz) return null;
    return {
      ...res.quiz,
      questions: res.questions,
    };
  },
};
