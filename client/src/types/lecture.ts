export type LectureStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
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
  summary?: string | null;
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
