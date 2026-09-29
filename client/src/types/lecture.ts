export type LectureStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'AI_PROCESSING' | 'AI_COMPLETED';

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface Concept {
  id: string;
  lecture_id?: string;
  lectureId?: string;
  name: string;
  description: string;
  importance: 'HIGH' | 'MEDIUM' | 'LOW';
  timestamp_start?: number | null;
  timestamp_end?: number | null;
  timestampStart?: number | null;
  timestampEnd?: number | null;
  simple_explanation?: string | null;
  detailed_explanation?: string | null;
  example?: string | null;
  common_misconception?: string | null;
  key_takeaway?: string | null;
}

export interface SummaryData {
  overview: string;
  keyTakeaways: string[];
  importantDefinitions: string[];
  importantFacts: string[];
  formulasOrRules: string[];
  prerequisites: string[];
}

export interface Flashcard {
  id: string;
  lecture_id?: string;
  lectureId?: string;
  concept_id?: string | null;
  conceptId?: string | null;
  question: string;
  answer: string;
  options?: string[] | null;
  correct_answer?: number | null;
  correctAnswer?: number | null;
  explanation?: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface QuizQuestion {
  id: string;
  quizId?: string;
  conceptId?: string | null;
  question: string;
  options: string[];
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface QuizData {
  id: string;
  title: string;
  questions: QuizQuestion[];
}

export interface Lecture {
  id: string;
  userId: string;
  youtubeUrl: string;
  title: string;
  transcript: string;
  transcriptSegments?: TranscriptSegment[] | null;
  duration?: number | null;
  status: LectureStatus;
  errorMessage?: string | null;
  summary?: SummaryData | string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    concepts: number;
    flashcards: number;
    quizzes: number;
  };
}

export interface CreateLectureResponse {
  message: string;
  lecture: Lecture;
}

export interface LecturesResponse {
  lectures: Lecture[];
}

export interface LectureDetailResponse {
  lecture: Lecture;
}

export interface LearningContentResponse {
  lecture: Partial<Lecture>;
  concepts: Concept[];
  flashcards: Flashcard[];
  quiz: QuizData | null;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  startedAt: string;
  completedAt?: string | null;
  score?: number;
}

export interface StartQuizResponse {
  success: boolean;
  attempt: QuizAttempt;
}

export interface QuizAnswerPayload {
  questionId: string;
  selectedAnswer: number;
}

export interface SubmitQuizResponse {
  success: boolean;
  result: {
    attemptId: string;
    quizId: string;
    score: number;
    correctAnswers: number;
    totalQuestions: number;
  };
}

export interface QuizResultData {
  attemptId: string;
  quizId: string;
  lectureId: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  startedAt: string;
  completedAt: string;
}

export interface QuizResultResponse {
  success: boolean;
  result: QuizResultData;
}

export interface ConceptMastery {
  id: string;
  user_id?: string;
  userId?: string;
  concept_id?: string;
  conceptId?: string;
  mastery_score?: number;
  masteryScore?: number;
  correct_count?: number;
  correctCount?: number;
  incorrect_count?: number;
  incorrectCount?: number;
  last_reviewed_at?: string;
  lastReviewedAt?: string;
  next_review_at?: string;
  nextReviewAt?: string;
}

export interface RevisionTask {
  id: string;
  user_id?: string;
  userId?: string;
  concept_id?: string;
  conceptId?: string;
  task_type?: string;
  taskType?: string;
  content?: any;
  scheduled_for?: string;
  scheduledFor?: string;
  completed: boolean;
  created_at?: string;
  createdAt?: string;
}
