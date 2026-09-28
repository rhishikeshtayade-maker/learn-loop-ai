/**
 * Reusable YouTube URL parsing, validation, and metadata extraction utility.
 */

// Canonical YouTube video ID is exactly 11 characters of base64url characters
const YOUTUBE_VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

const YOUTUBE_URL_PATTERNS = [
  // https://www.youtube.com/watch?v=VIDEO_ID
  /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/i,
  // https://youtu.be/VIDEO_ID
  /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/i,
  // https://www.youtube.com/shorts/VIDEO_ID
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i,
  // https://www.youtube.com/embed/VIDEO_ID
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
  // https://www.youtube.com/v/VIDEO_ID
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/i,
];

/**
 * Extracts canonical 11-char YouTube video ID from a given URL or string.
 * Returns null if the URL is invalid, empty, non-YouTube, or has a malformed video ID.
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  // Direct video ID check
  if (YOUTUBE_VIDEO_ID_REGEX.test(trimmed)) {
    return trimmed;
  }

  try {
    // Try matching supported YouTube URL patterns
    for (const pattern of YOUTUBE_URL_PATTERNS) {
      const match = trimmed.match(pattern);
      if (match && match[1] && YOUTUBE_VIDEO_ID_REGEX.test(match[1])) {
        return match[1];
      }
    }

    // Secondary parsing using URL constructor
    const parsedUrl = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const hostname = parsedUrl.hostname.toLowerCase();

    if (hostname.includes('youtube.com')) {
      const v = parsedUrl.searchParams.get('v');
      if (v && YOUTUBE_VIDEO_ID_REGEX.test(v)) {
        return v;
      }
      const pathnameParts = parsedUrl.pathname.split('/').filter(Boolean);
      if ((pathnameParts[0] === 'shorts' || pathnameParts[0] === 'embed' || pathnameParts[0] === 'v') && pathnameParts[1]) {
        if (YOUTUBE_VIDEO_ID_REGEX.test(pathnameParts[1])) {
          return pathnameParts[1];
        }
      }
    } else if (hostname === 'youtu.be') {
      const pathId = parsedUrl.pathname.slice(1).split(/[?#&]/)[0];
      if (pathId && YOUTUBE_VIDEO_ID_REGEX.test(pathId)) {
        return pathId;
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Validates whether a given string is a valid YouTube URL.
 */
export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeVideoId(url) !== null;
}

export interface VideoMetadata {
  title: string;
  authorName?: string;
  thumbnailUrl?: string;
}

/**
 * Fetches real public video metadata via YouTube oEmbed API without requiring any API keys.
 */
export async function fetchYouTubeMetadata(videoId: string): Promise<VideoMetadata> {
  const defaultMeta: VideoMetadata = {
    title: `YouTube Lecture (${videoId})`,
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
  };

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(oembedUrl);
    if (res.ok) {
      const data = (await res.json()) as any;
      return {
        title: data.title || defaultMeta.title,
        authorName: data.author_name,
        thumbnailUrl: data.thumbnail_url || defaultMeta.thumbnailUrl,
      };
    }
  } catch (err) {
    console.warn(`oEmbed lookup failed for video ${videoId}:`, err);
  }

  return defaultMeta;
}
