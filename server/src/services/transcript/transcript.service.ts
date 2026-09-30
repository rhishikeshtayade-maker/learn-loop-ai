import { YoutubeTranscript } from 'youtube-transcript';

export interface TranscriptSegment {
  text: string;
  start: number; // seconds
  duration: number; // seconds
}

export interface StructuredTranscript {
  videoId: string;
  segments: TranscriptSegment[];
  normalizedText: string;
  duration: number; // total duration in seconds
  language?: string;
}

export class TranscriptError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 422) {
    super(message);
    this.name = 'TranscriptError';
    this.statusCode = statusCode;
  }
}

export interface ITranscriptProvider {
  name: string;
  fetchTranscript(videoId: string): Promise<TranscriptSegment[]>;
}

/**
 * Default Provider using youtube-transcript with direct fallback
 */
class YouTubeCaptionProvider implements ITranscriptProvider {
  name = 'YouTubeCaptionProvider';

  async fetchTranscript(videoId: string): Promise<TranscriptSegment[]> {
    // Attempt 1: InnerTube Android API (Direct protobuf-based player endpoint, works from cloud datacenters)
    try {
      const innerTubeSegments = await this.fetchViaInnerTube(videoId);
      if (innerTubeSegments && innerTubeSegments.length > 0) {
        return innerTubeSegments;
      }
    } catch (innerErr) {
      console.warn('InnerTube Android extraction failed, trying fallbacks:', innerErr);
    }

    // Attempt 2: youtube-transcript package
    try {
      const items = await YoutubeTranscript.fetchTranscript(videoId);
      if (items && items.length > 0) {
        return items.map((item) => ({
          text: item.text,
          start: Math.round((item.offset / 1000) * 100) / 100,
          duration: Math.round((item.duration / 1000) * 100) / 100,
        }));
      }
    } catch (primaryErr) {
      // Primary failed; proceed to Direct YouTube HTML scraper fallback
    }

    // Attempt 3: Direct YouTube HTML scraper fallback
    try {
      const directSegments = await this.fetchDirectTimedText(videoId);
      if (directSegments && directSegments.length > 0) {
        return directSegments;
      }
    } catch {
      // Fallback failed as well
    }

    throw new TranscriptError('Transcript is unavailable for this video.');
  }

  private async fetchViaInnerTube(videoId: string): Promise<TranscriptSegment[] | null> {
    const resp = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)',
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'ANDROID',
            clientVersion: '20.10.38',
          },
        },
        videoId,
      }),
    });

    if (!resp.ok) return null;
    const data = await resp.json() as any;
    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!Array.isArray(tracks) || tracks.length === 0) return null;

    const track =
      tracks.find((t: any) => t.languageCode === 'en' || t.languageCode?.startsWith('en')) ||
      tracks[0];
    if (!track?.baseUrl) return null;

    return this.parseTimedTextUrl(track.baseUrl);
  }

  private async fetchDirectTimedText(videoId: string): Promise<TranscriptSegment[] | null> {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const res = await fetch(watchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!res.ok) return null;
    const html = await res.text();

    // Look for captionTracks in ytInitialPlayerResponse
    const match = html.match(/"captionTracks":\s*(\[.*?\])/);
    if (!match || !match[1]) return null;

    try {
      const tracks = JSON.parse(match[1]);
      if (!Array.isArray(tracks) || tracks.length === 0) return null;

      const track =
        tracks.find((t: any) => t.languageCode === 'en' || t.languageCode?.startsWith('en')) ||
        tracks[0];

      if (!track?.baseUrl) return null;

      return this.parseTimedTextUrl(track.baseUrl);
    } catch {
      return null;
    }
  }

  private async parseTimedTextUrl(baseUrl: string): Promise<TranscriptSegment[] | null> {
    try {
      // Clean any existing format and request clean json3
      const cleanUrl = baseUrl.replace(/&fmt=[^&]+/g, '');
      const captionRes = await fetch(`${cleanUrl}&fmt=json3`);
      if (!captionRes.ok) return null;

      const text = await captionRes.text();
      // Try json3 first
      if (text.startsWith('{')) {
        const data = JSON.parse(text);
        if (data.events && Array.isArray(data.events)) {
          const segments: TranscriptSegment[] = [];
          for (const event of data.events) {
            if (!event.segs) continue;
            const segText = event.segs.map((s: any) => s.utf8 || '').join('').trim();
            if (!segText) continue;

            segments.push({
              text: segText,
              start: Math.round(((event.tStartMs || 0) / 1000) * 100) / 100,
              duration: Math.round(((event.dDurationMs || 0) / 1000) * 100) / 100,
            });
          }
          if (segments.length > 0) return segments;
        }
      }

      // XML fallback if json3 was not returned
      const xmlMatches = [...text.matchAll(/<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g)];
      if (xmlMatches.length > 0) {
        return xmlMatches.map((m) => ({
          start: parseFloat(m[1]) || 0,
          duration: parseFloat(m[2]) || 0,
          text: m[3] || '',
        }));
      }

      // srv3 XML fallback (<p t="..." d="..."><s>...</s></p>)
      const pMatches = [...text.matchAll(/<p[^>]*t="(\d+)"[^>]*d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g)];
      if (pMatches.length > 0) {
        return pMatches.map((m) => {
          const cleanP = m[3].replace(/<[^>]+>/g, '').trim();
          return {
            start: Math.round((parseInt(m[1], 10) / 1000) * 100) / 100,
            duration: Math.round((parseInt(m[2], 10) / 1000) * 100) / 100,
            text: cleanP,
          };
        }).filter((s) => s.text.length > 0);
      }

      return null;
    } catch (err) {
      console.warn('parseTimedTextUrl error:', err);
      return null;
    }
  }
}

/**
 * Modular Transcript Service for managing transcript providers and normalization
 */
export class TranscriptService {
  private provider: ITranscriptProvider;

  constructor(provider: ITranscriptProvider = new YouTubeCaptionProvider()) {
    this.provider = provider;
  }

  /**
   * Set custom provider (allows swapping to Whisper, AssemblyAI, Deepgram, etc.)
   */
  setProvider(provider: ITranscriptProvider): void {
    this.provider = provider;
  }

  /**
   * Fetches, normalizes, and structures transcript for a given video ID.
   */
  async getTranscript(videoId: string): Promise<StructuredTranscript> {
    if (!videoId) {
      throw new TranscriptError('A valid YouTube video ID is required.', 400);
    }

    const rawSegments = await this.provider.fetchTranscript(videoId);

    if (!rawSegments || rawSegments.length === 0) {
      throw new TranscriptError('Transcript is unavailable for this video.');
    }

    // Clean and normalize segments
    const cleanedSegments: TranscriptSegment[] = rawSegments
      .map((seg) => ({
        text: this.cleanSegmentText(seg.text),
        start: seg.start,
        duration: seg.duration,
      }))
      .filter((seg) => seg.text.length > 0);

    if (cleanedSegments.length === 0) {
      throw new TranscriptError('Transcript is unavailable for this video.');
    }

    // Calculate total duration
    const lastSeg = cleanedSegments[cleanedSegments.length - 1];
    const totalDuration = Math.ceil(lastSeg.start + (lastSeg.duration || 0));

    // Construct structured paragraphs with timestamps
    const normalizedText = this.buildNormalizedText(cleanedSegments);

    return {
      videoId,
      segments: cleanedSegments,
      normalizedText,
      duration: totalDuration,
    };
  }

  /**
   * Decodes HTML entities and removes noise tags like [Music] or [Applause]
   */
  private cleanSegmentText(rawText: string): string {
    return rawText
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/\[(?:Music|Applause|Laughter|Cheering)\]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Assembles clean, readable paragraphs from raw segments
   */
  private buildNormalizedText(segments: TranscriptSegment[]): string {
    const paragraphs: string[] = [];
    let currentParagraph: string[] = [];
    let wordCount = 0;

    for (const seg of segments) {
      currentParagraph.push(seg.text);
      wordCount += seg.text.split(/\s+/).length;

      // Group into paragraphs roughly every 75-100 words or punctuation stop
      if (wordCount >= 80 || seg.text.endsWith('.') || seg.text.endsWith('?') || seg.text.endsWith('!')) {
        paragraphs.push(currentParagraph.join(' '));
        currentParagraph = [];
        wordCount = 0;
      }
    }

    if (currentParagraph.length > 0) {
      paragraphs.push(currentParagraph.join(' '));
    }

    return paragraphs.join('\n\n');
  }
}

// Singleton export
export const transcriptService = new TranscriptService();
