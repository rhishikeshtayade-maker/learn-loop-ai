import { z } from 'zod';
import { extractYouTubeVideoId } from '../utils/youtube';

export const createLectureSchema = z.object({
  youtubeUrl: z
    .string({ required_error: 'YouTube URL is required' })
    .trim()
    .min(1, { message: 'YouTube URL cannot be empty' })
    .refine((url) => extractYouTubeVideoId(url) !== null, {
      message: 'Please enter a valid YouTube video URL (e.g., https://www.youtube.com/watch?v=...)',
    }),
});

export type CreateLectureInput = z.infer<typeof createLectureSchema>;
