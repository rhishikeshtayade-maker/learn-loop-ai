import React, { useEffect, useState } from 'react';
import { Navbar } from '../components/Navbar';
import { lectureService } from '../services/lecture.service';
import {
  Repeat,
  Brain,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Calendar,
  Clock,
  RefreshCw,
  BookOpen,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface MasteryItem {
  id: string;
  user_id: string;
  concept_id: string;
  concept_name: string;
  lecture_id?: string | null;
  mastery_score: number;
  correct_count: number;
  incorrect_count: number;
  last_reviewed_at: string;
  next_review_at: string;
}

interface RevisionTaskItem {
  id: string;
  user_id: string;
  concept_id: string;
  concept_name: string;
  lecture_id?: string | null;
  task_type: string;
  mastery_score: number;
  content: any;
  scheduled_for: string;
  completed: boolean;
  created_at?: string;
}

export const Revision: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mastery, setMastery] = useState<MasteryItem[]>([]);
  const [weakConcepts, setWeakConcepts] = useState<MasteryItem[]>([]);
  const [revisionTasks, setRevisionTasks] = useState<RevisionTaskItem[]>([]);
  const [activeTab, setActiveTab] = useState<'tasks' | 'weak' | 'all'>('tasks');

  const fetchRevisionData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await lectureService.getDashboardData();
      if (res && res.success) {
        setMastery(res.mastery || []);
        setWeakConcepts(res.weakConcepts || []);
        setRevisionTasks(res.revisionTasks || []);
      }
    } catch (err) {
      console.error('Failed to load revision data:', err);
      setError('Failed to load adaptive revision data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevisionData();
  }, []);

  const formatReviewDate = (dateStr: string) => {
    if (!dateStr) return 'Not scheduled';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 3600 * 24));

    if (diffDays <= 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays <= 7) return `In ${diffDays} days`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Banner */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 mb-3">
                <Repeat className="w-3.5 h-3.5 text-amber-400" />
                <span>Phase 6 Spaced-Repetition System</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Adaptive Revision Hub
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                Review weak concepts, execute scheduled revision tasks, and build long-term memory retention.
              </p>
            </div>

            <button
              onClick={fetchRevisionData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-800 transition shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Tasks</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchRevisionData} className="px-3 py-1 bg-rose-500/20 text-rose-200 text-xs rounded-lg">
              Retry
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
              activeTab === 'tasks'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Scheduled Tasks ({revisionTasks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('weak')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
              activeTab === 'weak'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Needs Review ({weakConcepts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>All Mastery Concepts ({mastery.length})</span>
          </button>
        </div>

        {/* Content Views */}
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Loading Adaptive Revision Data...
            </p>
          </div>
        ) : activeTab === 'tasks' ? (
          /* Scheduled Revision Tasks */
          <div className="space-y-4">
            {revisionTasks.length === 0 ? (
              <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800 max-w-lg mx-auto my-8">
                <Sparkles className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white mb-1">You're all caught up! 🎉</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
                  No scheduled revision tasks right now. Complete quizzes on lectures to discover concept gaps and trigger automated revision schedules.
                </p>
                <Link
                  to="/lectures"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg transition"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Browse Lectures</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {revisionTasks.map((task) => (
                  <div
                    key={task.id}
                    className="glass-panel rounded-2xl p-5 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">{task.concept_name}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          {task.task_type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {formatReviewDate(task.scheduled_for)}
                        </span>
                        <span>•</span>
                        <span>Current Mastery: {Math.round(task.mastery_score)}%</span>
                      </div>
                    </div>

                    <Link
                      to={task.lecture_id ? `/lecture/${task.lecture_id}` : '/lectures'}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition"
                    >
                      <span>Start Targeted Practice</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'weak' ? (
          /* Needs Review Concepts */
          <div className="space-y-4">
            {weakConcepts.length === 0 ? (
              <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800 max-w-lg mx-auto my-8">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white mb-1">No Weak Concepts Found!</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
                  All your evaluated concepts have a mastery score of 60% or higher. Keep up the great work!
                </p>
                <Link
                  to="/lectures"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg transition"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Explore More Lectures</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {weakConcepts.map((item) => (
                  <div
                    key={item.id}
                    className="glass-panel rounded-2xl p-5 border border-rose-500/20 hover:border-rose-500/40 transition space-y-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-white">{item.concept_name}</h3>
                        <p className="text-xs text-slate-400 mt-1">
                          {item.incorrect_count} incorrect answers recorded
                        </p>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 shrink-0">
                        {Math.round(item.mastery_score)}%
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(5, Math.round(item.mastery_score))}%` }}
                      />
                    </div>

                    <Link
                      to={item.lecture_id ? `/lecture/${item.lecture_id}` : '/lectures'}
                      className="inline-flex items-center justify-center gap-2 w-full py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl transition"
                    >
                      <span>Review Concept Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* All Mastery Concepts */
          <div className="space-y-4">
            {mastery.length === 0 ? (
              <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800 max-w-lg mx-auto my-8">
                <Brain className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white mb-1">No Concept Mastery Data</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
                  Complete a lecture quiz to calculate concept mastery and start building your adaptive memory graph.
                </p>
                <Link
                  to="/lectures"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Go to Lectures</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mastery.map((item) => {
                  const score = Math.round(item.mastery_score);
                  const isStrong = score >= 80;
                  const isDeveloping = score >= 60 && score < 80;

                  return (
                    <div
                      key={item.id}
                      className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-200 truncate">{item.concept_name}</h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${
                            isStrong
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                              : isDeveloping
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                          }`}
                        >
                          {isStrong ? 'Strong' : isDeveloping ? 'Developing' : 'Needs Review'} ({score}%)
                        </span>
                      </div>

                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            isStrong ? 'bg-emerald-500' : isDeveloping ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.max(5, score)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{item.correct_count} correct / {item.incorrect_count} incorrect</span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3 h-3" />
                          {formatReviewDate(item.next_review_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Revision;
