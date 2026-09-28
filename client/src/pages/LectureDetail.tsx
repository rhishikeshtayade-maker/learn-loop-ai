import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { TranscriptViewer } from '../components/TranscriptViewer';
import { lectureService } from '../services/lecture.service';
import type { Lecture } from '../types/lecture';
import {
  Sparkles,
  Video,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ExternalLink,
  ArrowLeft,
  FileText,
} from 'lucide-react';

export const LectureDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLecture = useCallback(async () => {
    if (!id) return;
    try {
      const data = await lectureService.getLectureById(id);
      setLecture(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lecture details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLecture();
  }, [fetchLecture]);

  const handleProcess = async () => {
    if (!id) return;
    setProcessing(true);
    setError(null);
    try {
      const updated = await lectureService.processLecture(id);
      setLecture(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
      // Re-fetch to synchronize FAILED state in UI
      await fetchLecture();
    } finally {
      setProcessing(false);
    }
  };

  const formatDuration = (totalSeconds?: number | null): string => {
    if (!totalSeconds) return 'Unknown';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Loading Lecture...</p>
        </div>
      </div>
    );
  }

  if (error && !lecture) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-xl mx-auto px-4 py-16 text-center">
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl w-fit mx-auto mb-4 text-rose-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Lecture Unavailable</h2>
          <p className="text-xs text-slate-400 mb-6">{error}</p>
          <Link
            to="/lectures"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Lectures
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            to="/lectures"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Lectures
          </Link>
        </div>

        {/* Lecture Header Banner */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 mb-8 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
            <div className="space-y-3 max-w-3xl">
              {/* Status Badge */}
              <div className="flex items-center gap-3">
                {lecture?.status === 'COMPLETED' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Lecture ready
                  </span>
                )}
                {lecture?.status === 'PROCESSING' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Processing transcript...
                  </span>
                )}
                {lecture?.status === 'PENDING' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Clock className="w-3.5 h-3.5" />
                    Ready to process
                  </span>
                )}
                {lecture?.status === 'FAILED' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Transcript processing failed
                  </span>
                )}

                <span className="text-xs text-slate-500">ID: {lecture?.id.slice(0, 8)}...</span>
              </div>

              {/* Title */}
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                {lecture?.title}
              </h1>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <a
                  href={lecture?.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-rose-400 hover:text-rose-300 transition"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Open on YouTube</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                {lecture?.duration ? (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {formatDuration(lecture.duration)}
                  </span>
                ) : null}

                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  {lecture?.createdAt ? new Date(lecture.createdAt).toLocaleDateString() : ''}
                </span>
              </div>
            </div>

            {/* Action / Trigger button */}
            <div className="shrink-0 flex items-center gap-3">
              {(lecture?.status === 'PENDING' || lecture?.status === 'FAILED') && (
                <button
                  id="process-transcript-button"
                  onClick={handleProcess}
                  disabled={processing}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition disabled:opacity-50"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Fetching Transcript...</span>
                    </>
                  ) : lecture?.status === 'FAILED' ? (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Try Again</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Process Transcript</span>
                    </>
                  )}
                </button>
              )}

              {lecture?.status === 'COMPLETED' && (
                <button
                  onClick={handleProcess}
                  disabled={processing}
                  className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white text-xs font-medium rounded-xl flex items-center gap-1.5 transition"
                  title="Re-extract transcript"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${processing ? 'animate-spin' : ''}`} />
                  <span>Re-process</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error notification banner if FAILED */}
        {lecture?.status === 'FAILED' && lecture.errorMessage && (
          <div className="mb-8 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-200">Transcript Retrieval Notice</p>
                <p className="text-[11px] text-rose-300/80 mt-0.5">{lecture.errorMessage}</p>
              </div>
            </div>
            <button
              onClick={handleProcess}
              className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-medium rounded-lg transition"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Pending State Card */}
        {lecture?.status === 'PENDING' && (
          <div className="glass-card rounded-2xl p-12 text-center border border-slate-800/80">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Ready to Extract Transcript</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
              LearnLoop will connect to YouTube, fetch the timestamped closed captions, normalize the text, and prepare the foundation for Phase 4 AI concept extraction.
            </p>
            <button
              onClick={handleProcess}
              disabled={processing}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 inline-flex items-center gap-2 transition"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Start Processing Now</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Processing State Card */}
        {lecture?.status === 'PROCESSING' && (
          <div className="glass-card rounded-2xl p-12 text-center border border-slate-800/80">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto mb-4" />
            <h3 className="text-base font-bold text-white mb-2">Processing Lecture Transcript</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Please wait while the transcript is extracted and formatted...
            </p>
          </div>
        )}

        {/* Completed State: Transcript Viewer */}
        {lecture?.status === 'COMPLETED' && (
          <TranscriptViewer
            transcript={lecture.transcript}
            segments={lecture.transcriptSegments}
            youtubeUrl={lecture.youtubeUrl}
          />
        )}
      </main>
    </div>
  );
};

export default LectureDetail;
