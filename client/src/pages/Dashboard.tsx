import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { lectureService } from '../services/lecture.service';
import type { Lecture } from '../types/lecture';
import {
  BookOpen,
  Brain,
  Target,
  Repeat,
  PlusCircle,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [recentLectures, setRecentLectures] = useState<Lecture[]>([]);
  const [loadingLectures, setLoadingLectures] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const lectures = await lectureService.getLectures();
        setRecentLectures(lectures.slice(0, 4));
      } catch (err) {
        console.error('Failed to fetch dashboard lectures:', err);
      } finally {
        setLoadingLectures(false);
      }
    };

    loadDashboardData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 mb-8 border border-slate-800 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Welcome back, {user?.name}! 👋
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                Ready to continue your adaptive learning loop? Upload new lecture URLs or review existing transcripts and concepts.
              </p>
            </div>

            <div className="shrink-0">
              <Link
                to="/lecture/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Process New Lecture</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Learning Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="glass-card rounded-xl p-5 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Lectures Ingested</span>
              <BookOpen className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-2xl font-bold text-white">{recentLectures.length}</p>
            <p className="text-[11px] text-slate-500 mt-1">Processed & active</p>
          </div>

          <div className="glass-card rounded-xl p-5 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Concepts Mastered</span>
              <Brain className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-2xl font-bold text-white">{user?._count?.conceptMasteries ?? 0}</p>
            <p className="text-[11px] text-slate-500 mt-1">Structured knowledge graph</p>
          </div>

          <div className="glass-card rounded-xl p-5 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Quiz Accuracy</span>
              <Target className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {user?._count?.quizAttempts ? `${user._count.quizAttempts} attempts` : '—'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Adaptive evaluations</p>
          </div>

          <div className="glass-card rounded-xl p-5 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Due for Revision</span>
              <Repeat className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-white">{user?._count?.revisionTasks ?? 0}</p>
            <p className="text-[11px] text-slate-500 mt-1">Spaced repetition schedule</p>
          </div>
        </div>

        {/* Recent Lectures Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Recent Lectures
              </h2>
              <p className="text-xs text-slate-400">Your latest uploaded learning materials</p>
            </div>

            {recentLectures.length > 0 && (
              <Link
                to="/lectures"
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {loadingLectures ? (
            <div className="p-8 text-center glass-panel rounded-2xl border border-slate-800">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading recent lectures...</p>
            </div>
          ) : recentLectures.length === 0 ? (
            <div className="glass-panel rounded-2xl p-8 text-center border border-slate-800">
              <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-300">No lectures yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Paste a YouTube link to extract transcript captions and start your learning loop.
              </p>
              <Link
                to="/lecture/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add First Lecture</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentLectures.map((lecture) => (
                <Link
                  key={lecture.id}
                  to={`/lecture/${lecture.id}`}
                  className="glass-panel rounded-xl p-4 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between group"
                >
                  <div className="space-y-1.5 pr-4 truncate">
                    <div className="flex items-center gap-2">
                      {lecture.status === 'COMPLETED' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> Ready
                        </span>
                      ) : lecture.status === 'PROCESSING' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-400">
                          <Loader2 className="w-3 h-3 animate-spin" /> Processing
                        </span>
                      ) : lecture.status === 'FAILED' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-400">
                          <AlertCircle className="w-3 h-3" /> Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}

                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" />
                        {new Date(lecture.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition truncate">
                      {lecture.title}
                    </h3>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
