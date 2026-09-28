import { apiRequest } from './api';
import type {
  Lecture,
  CreateLectureResponse,
  LecturesResponse,
  LectureDetailResponse,
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
};
