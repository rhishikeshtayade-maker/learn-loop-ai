import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../prisma';
import { createLectureSchema } from '../schemas/lecture';
import { extractYouTubeVideoId, fetchYouTubeMetadata } from '../utils/youtube';
import { transcriptService, TranscriptError } from '../services/transcript/transcript.service';

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

    const lecture = await prisma.lecture.create({
      data: {
        userId: req.user.id,
        youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
        title: meta.title,
        transcript: '',
        status: 'PENDING',
      },
      select: {
        id: true,
        youtubeUrl: true,
        title: true,
        status: true,
        duration: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      message: 'Lecture created successfully',
      lecture,
    });
  } catch (error) {
    console.error('Failed to create lecture:', error);
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
    const lectures = await prisma.lecture.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        youtubeUrl: true,
        title: true,
        duration: true,
        status: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            concepts: true,
            flashcards: true,
            quizzes: true,
          },
        },
      },
    });

    res.json({ lectures });
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
    const lecture = await prisma.lecture.findFirst({
      where: {
        id,
        userId: req.user.id, // Enforce strict user ownership
      },
      include: {
        _count: {
          select: {
            concepts: true,
            flashcards: true,
            quizzes: true,
          },
        },
      },
    });

    if (!lecture) {
      res.status(404).json({ error: 'Lecture not found' });
      return;
    }

    // Parse transcriptSegments JSON if stored
    let parsedSegments = null;
    if (lecture.transcriptSegments) {
      try {
        parsedSegments = JSON.parse(lecture.transcriptSegments);
      } catch {
        parsedSegments = null;
      }
    }

    res.json({
      lecture: {
        ...lecture,
        transcriptSegments: parsedSegments,
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
  const lecture = await prisma.lecture.findFirst({
    where: {
      id,
      userId: req.user.id,
    },
  });

  if (!lecture) {
    res.status(404).json({ error: 'Lecture not found' });
    return;
  }

  const videoId = extractYouTubeVideoId(lecture.youtubeUrl);
  if (!videoId) {
    await prisma.lecture.update({
      where: { id },
      data: {
        status: 'FAILED',
        errorMessage: 'Invalid or missing YouTube video ID',
      },
    });
    res.status(400).json({ error: 'Invalid or missing YouTube video ID' });
    return;
  }

  // 2. Transition state to PROCESSING
  await prisma.lecture.update({
    where: { id },
    data: {
      status: 'PROCESSING',
      errorMessage: null,
    },
  });

  try {
    // 3. Fetch structured transcript via modular service
    const transcriptData = await transcriptService.getTranscript(videoId);

    // 4. Update lecture to COMPLETED with normalized transcript & segments
    const updatedLecture = await prisma.lecture.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        transcript: transcriptData.normalizedText,
        transcriptSegments: JSON.stringify(transcriptData.segments),
        duration: transcriptData.duration,
        errorMessage: null,
      },
    });

    res.json({
      message: 'Lecture transcript processed successfully',
      lecture: {
        ...updatedLecture,
        transcriptSegments: transcriptData.segments,
      },
    });
  } catch (error) {
    const safeErrorMessage =
      error instanceof TranscriptError
        ? error.message
        : 'Transcript is unavailable for this video.';

    // 5. Update lecture to FAILED with safe error message
    await prisma.lecture.update({
      where: { id },
      data: {
        status: 'FAILED',
        errorMessage: safeErrorMessage,
      },
    });

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

  const existing = await prisma.lecture.findFirst({
    where: {
      id,
      userId: req.user.id,
    },
  });

  if (!existing) {
    res.status(404).json({ error: 'Lecture not found' });
    return;
  }

  try {
    await prisma.lecture.delete({
      where: { id },
    });

    res.json({ message: 'Lecture deleted successfully' });
  } catch (error) {
    console.error('Failed to delete lecture:', error);
    res.status(500).json({ error: 'Failed to delete lecture' });
  }
}
