import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { createLectureSchema } from '../schemas/lecture';
import { extractYouTubeVideoId, fetchYouTubeMetadata } from '../utils/youtube';
import { transcriptService, TranscriptError } from '../services/transcript/transcript.service';
import geminiService from '../services/gemini/gemini.service';
import db from '../services/supabase/database';

/**
 * POST /api/lectures
 * Creates a lecture in PENDING state associated with the authenticated user.
 */
export async function createLecture(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const parseResult = createLectureSchema.safeParse(req.body);
  if (!parseResult.success) {
    const message = parseResult.error.errors[0]?.message || 'Invalid lecture payload';
    res.status(400).json({ error: message });
    return;
  }

  const { youtubeUrl } = parseResult.data;
  const videoId = extractYouTubeVideoId(youtubeUrl);

  if (!videoId) {
    res.status(400).json({ error: 'Could not extract valid video ID from provided URL' });
    return;
  }

  try {
    // Retrieve real video metadata (title, author) via YouTube oEmbed
    const meta = await fetchYouTubeMetadata(videoId);

    const lecture = await db.createLecture({
      userId: req.user.id,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      title: meta.title,
    });

    res.status(201).json({
      message: 'Lecture created successfully',
      lecture: {
        id: lecture.id,
        youtubeUrl: lecture.youtube_url,
        title: lecture.title,
        status: lecture.status,
        duration: lecture.duration,
        createdAt: lecture.created_at,
      },
    });
  } catch (error) {
    console.error('Failed to create lecture:', error instanceof Error ? error.stack || error.message : error);
    res.status(500).json({ error: 'Failed to create lecture record' });
  }
}

/**
 * GET /api/lectures
 * Lists all lectures owned strictly by the authenticated user.
 */
export async function getLectures(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const lectures = await db.getLecturesByUser(req.user.id);

    const formatted = lectures.map((l) => ({
      id: l.id,
      youtubeUrl: l.youtube_url,
      title: l.title,
      duration: l.duration,
      status: l.status,
      errorMessage: l.error_message,
      createdAt: l.created_at,
      updatedAt: l.updated_at,
      _count: l._count || { concepts: 0, flashcards: 0, quizzes: 0 },
    }));

    res.json({ lectures: formatted });
  } catch (error) {
    console.error('Failed to list lectures:', error);
    res.status(500).json({ error: 'Failed to retrieve lectures' });
  }
}

/**
 * GET /api/lectures/:id
 * Fetches single lecture details, strictly verifying ownership.
 */
export async function getLectureById(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const { id } = req.params;

  try {
    const lecture = await db.getLectureById(id, req.user.id);

    if (!lecture) {
      res.status(404).json({ error: 'Lecture not found' });
      return;
    }

    res.json({
      lecture: {
        id: lecture.id,
        userId: lecture.user_id,
        youtubeUrl: lecture.youtube_url,
        title: lecture.title,
        transcript: lecture.transcript,
        transcriptSegments: lecture.transcript_segments,
        duration: lecture.duration,
        status: lecture.status,
        errorMessage: lecture.error_message,
        summary: lecture.summary,
        createdAt: lecture.created_at,
        updatedAt: lecture.updated_at,
        _count: lecture._count || { concepts: 0, flashcards: 0, quizzes: 0 },
      },
    });
  } catch (error) {
    console.error('Failed to get lecture by id:', error);
    res.status(500).json({ error: 'Failed to retrieve lecture details' });
  }
}

/**
 * POST /api/lectures/:id/process
 * Processes lecture transcript: updates state to PROCESSING -> fetches transcript -> saves -> COMPLETED (or FAILED).
 */
export async function processLecture(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const { id } = req.params;

  // 1. Verify lecture exists and is owned by authenticated user
  const lecture = await db.getLectureById(id, req.user.id);

  if (!lecture) {
    res.status(404).json({ error: 'Lecture not found' });
    return;
  }

  const videoId = extractYouTubeVideoId(lecture.youtube_url);
  if (!videoId) {
    await db.updateLectureStatus(id, 'FAILED', 'Invalid or missing YouTube video ID');
    res.status(400).json({ error: 'Invalid or missing YouTube video ID' });
    return;
  }

  // 2. Transition state to PROCESSING
  await db.updateLectureStatus(id, 'PROCESSING', null);

  try {
    // 3. Fetch structured transcript via modular service (with Gemini AI fallback)
    let transcriptData: any;
    try {
      transcriptData = await transcriptService.getTranscript(videoId);
    } catch (primaryErr) {
      console.warn(`Direct caption extraction failed for video ${videoId}. Using AI educational transcript generator. Error:`, primaryErr);
      transcriptData = await geminiService.generateTranscriptForLecture(lecture.title);
    }

    // 4. Update lecture to COMPLETED with normalized transcript & segments
    await db.saveLectureTranscript(id, transcriptData.normalizedText, transcriptData.segments, transcriptData.duration);

    const updated = await db.getLectureById(id, req.user.id);

    res.json({
      message: 'Lecture transcript processed successfully',
      lecture: {
        id: updated?.id,
        youtubeUrl: updated?.youtube_url,
        title: updated?.title,
        transcript: updated?.transcript,
        transcriptSegments: transcriptData.segments,
        duration: updated?.duration,
        status: updated?.status,
        createdAt: updated?.created_at,
        updatedAt: updated?.updated_at,
      },
    });
  } catch (error) {
    const safeErrorMessage =
      error instanceof TranscriptError
        ? error.message
        : 'Transcript is unavailable for this video.';

    // 5. Update lecture to FAILED with safe error message
    await db.updateLectureStatus(id, 'FAILED', safeErrorMessage);

    const statusCode = error instanceof TranscriptError ? error.statusCode : 422;
    res.status(statusCode).json({ error: safeErrorMessage });
  }
}

/**
 * DELETE /api/lectures/:id
 * Deletes a lecture owned by the authenticated user.
 */
export async function deleteLecture(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const { id } = req.params;

  try {
    const deleted = await db.deleteLecture(id, req.user.id);

    if (!deleted) {
      res.status(404).json({ error: 'Lecture not found' });
      return;
    }

    res.json({ message: 'Lecture deleted successfully' });
  } catch (error) {
    console.error('Failed to delete lecture:', error);
    res.status(500).json({ error: 'Failed to delete lecture' });
  }
}
