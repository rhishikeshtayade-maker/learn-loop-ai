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

  // Phase 5 Quiz System Methods
  async startQuizAttempt(lectureId: string) {
    return apiRequest<{ success: boolean; attempt: { id: string; quizId: string; startedAt: string } }>(
      `/api/lectures/${lectureId}/quiz/start`,
      { method: 'POST' }
    );
  },

  async submitQuizAttempt(
    attemptId: string,
    answers: Array<{ questionId: string; selectedAnswer: string }>
  ) {
    return apiRequest<{
      success: boolean;
      result: {
        attemptId: string;
        quizId: string;
        score: number;
        correctAnswers: number;
        totalQuestions: number;
      };
    }>(`/api/quiz-attempts/${attemptId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  },

  async getQuizAttemptResult(attemptId: string) {
    return apiRequest<{
      success: boolean;
      result: {
        attemptId: string;
        quizId: string;
        lectureId: string;
        score: number;
        correctAnswers: number;
        totalQuestions: number;
        startedAt: string;
        completedAt: string;
      };
    }>(`/api/quiz-attempts/${attemptId}/result`);
  },

  // Phase 6 Concept Mastery & Revision Task Methods
  async getConceptMastery(conceptId?: string) {
    const url = conceptId ? `/api/mastery?conceptId=${encodeURIComponent(conceptId)}` : '/api/mastery';
    return apiRequest<{ success: boolean; mastery: any[] }>(url);
  },

  async getRevisionTasks(includeCompleted = false) {
    const url = includeCompleted ? '/api/revision-tasks?includeCompleted=true' : '/api/revision-tasks';
    return apiRequest<{ success: boolean; tasks: any[] }>(url);
  },

  // Phase 7 Adaptive Student Dashboard Method
  async getDashboardData() {
    return apiRequest<{
      success: boolean;
      user: { id: string; name: string; email: string };
      stats: {
        totalLectures: number;
        quizzesAttempted: number;
        averageScore: number;
        conceptsMastered: number;
      };
      mastery: Array<{
        id: string;
        user_id: string;
        concept_id: string;
        concept_name: string;
        lecture_id?: string | null;
        mastery_score: number;
        correct_count: number;
        incorrect_count: number;
        last_reviewed_at: string;
        next_review_at: string;
      }>;
      weakConcepts: Array<{
        id: string;
        user_id: string;
        concept_id: string;
        concept_name: string;
        lecture_id?: string | null;
        mastery_score: number;
        correct_count: number;
        incorrect_count: number;
        last_reviewed_at: string;
        next_review_at: string;
      }>;
      revisionTasks: Array<{
        id: string;
        user_id: string;
        concept_id: string;
        concept_name: string;
        lecture_id?: string | null;
        task_type: string;
        mastery_score: number;
        content: any;
        scheduled_for: string;
        completed: boolean;
        created_at?: string;
      }>;
      upcomingReviews: Array<{
        id: string;
        user_id: string;
        concept_id: string;
        concept_name: string;
        lecture_id?: string | null;
        mastery_score: number;
        correct_count: number;
        incorrect_count: number;
        last_reviewed_at: string;
        next_review_at: string;
      }>;
      recentLectures: Lecture[];
    }>('/api/dashboard');
  },
};
