import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { lectureService } from '../services/lecture.service';
import type { Lecture } from '../types/lecture';
import {
  BookOpen,
  PlusCircle,
  Clock,
  Calendar,
  Trash2,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Video,
} from 'lucide-react';

export const LectureList: React.FC = () => {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchLectures = async () => {
    try {
      const data = await lectureService.getLectures();
      setLectures(data);
    } catch (err) {
      console.error('Failed to load lectures:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLectures();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this lecture?')) return;

    setDeletingId(id);
    try {
      await lectureService.deleteLecture(id);
      setLectures((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete lecture');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDuration = (totalSeconds?: number | null): string => {
    if (!totalSeconds) return '';
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Lecture Library</h1>
            <p className="text-xs text-slate-400 mt-1">
              Your ingested YouTube lectures and extracted transcripts.
            </p>
          </div>

          <Link
            to="/lecture/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Lecture</span>
          </Link>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Loading Library...</p>
          </div>
        ) : lectures.length === 0 ? (
          /* Empty State */
          <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800 max-w-xl mx-auto my-12">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">No lectures yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
              Paste your first YouTube lecture URL to extract its transcript and kick off your adaptive learning journey.
            </p>
            <Link
              to="/lecture/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add your first lecture</span>
            </Link>
          </div>
        ) : (
          /* Grid of Lectures */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lectures.map((lecture) => (
              <div
                key={lecture.id}
                className="glass-panel rounded-2xl border border-slate-800/80 p-5 flex flex-col justify-between hover:border-slate-700/80 transition group"
              >
                <div>
                  {/* Status & Actions Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    {lecture.status === 'COMPLETED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Ready
                      </span>
                    ) : lecture.status === 'PROCESSING' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" /> Processing
                      </span>
                    ) : lecture.status === 'FAILED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <AlertCircle className="w-3 h-3" /> Failed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    )}

                    <button
                      onClick={(e) => handleDelete(lecture.id, e)}
                      disabled={deletingId === lecture.id}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded-md transition"
                      title="Delete lecture"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-bold text-white mb-2 line-clamp-2 group-hover:text-indigo-300 transition">
                    {lecture.title}
                  </h3>

                  {/* Metadata */}
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(lecture.createdAt).toLocaleDateString()}
                    </span>
                    {lecture.duration ? (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(lecture.duration)}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Bottom Row */}
                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <a
                    href={lecture.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                  >
                    <Video className="w-3 h-3" /> YouTube
                  </a>

                  <Link
                    to={`/lecture/${lecture.id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-xs font-medium transition"
                  >
                    <span>{lecture.status === 'COMPLETED' ? 'View Transcript' : 'Process'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default LectureList;
