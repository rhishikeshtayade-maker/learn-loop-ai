import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { lectureService } from '../services/lecture.service';
import type { Lecture } from '../types/lecture';
import {
  BookOpen,
  Brain,
  Target,
  PlusCircle,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Award,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Check,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { KnowledgeGraphCard } from '../components/dashboard/KnowledgeGraphCard';


interface DashboardStats {
  totalLectures: number;
  quizzesAttempted: number;
  averageScore: number;
  conceptsMastered: number;
}

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

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<DashboardStats>({
    totalLectures: 0,
    quizzesAttempted: 0,
    averageScore: 0,
    conceptsMastered: 0,
  });
  const [mastery, setMastery] = useState<MasteryItem[]>([]);
  const [weakConcepts, setWeakConcepts] = useState<MasteryItem[]>([]);
  const [revisionTasks, setRevisionTasks] = useState<RevisionTaskItem[]>([]);
  const [upcomingReviews, setUpcomingReviews] = useState<MasteryItem[]>([]);
  const [recentLectures, setRecentLectures] = useState<Lecture[]>([]);
  const [masteryTab, setMasteryTab] = useState<'all' | 'strong' | 'developing' | 'needsReview'>('all');

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await lectureService.getDashboardData();
      if (res && res.success) {
        setStats(res.stats);
        setMastery(res.mastery || []);
        setWeakConcepts(res.weakConcepts || []);
        setRevisionTasks(res.revisionTasks || []);
        setUpcomingReviews(res.upcomingReviews || []);
        setRecentLectures(res.recentLectures || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Categorize concept mastery records
  const strongConcepts = mastery.filter((m) => m.mastery_score >= 80);
  const developingConcepts = mastery.filter((m) => m.mastery_score >= 60 && m.mastery_score < 80);
  const needsReviewConcepts = mastery.filter((m) => m.mastery_score < 60);

  const getFilteredMastery = () => {
    if (masteryTab === 'strong') return strongConcepts;
    if (masteryTab === 'developing') return developingConcepts;
    if (masteryTab === 'needsReview') return needsReviewConcepts;
    return mastery;
  };

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
        {/* Welcome Banner */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Phase 7: Adaptive Student Dashboard</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Welcome back, {user?.name || 'Student'} 👋
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                Here's your learning progress and what to focus on next.
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              <button
                onClick={fetchDashboard}
                disabled={loading}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition"
                title="Refresh Dashboard"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
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

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchDashboard}
              className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[11px] font-semibold rounded-lg transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* 1. Learning Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-5 border border-slate-800/80 hover:border-slate-700/80 transition">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Total Lectures</span>
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{loading ? '—' : stats.totalLectures}</p>
            <p className="text-[11px] text-slate-500 mt-1">Ingested & active</p>
          </div>

          <div className="glass-card rounded-xl p-5 border border-slate-800/80 hover:border-slate-700/80 transition">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Quizzes Attempted</span>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{loading ? '—' : stats.quizzesAttempted}</p>
            <p className="text-[11px] text-slate-500 mt-1">Evaluations completed</p>
          </div>

          <div className="glass-card rounded-xl p-5 border border-slate-800/80 hover:border-slate-700/80 transition">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Average Quiz Score</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">
              {loading ? '—' : stats.quizzesAttempted > 0 ? `${stats.averageScore}%` : 'N/A'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Overall accuracy rate</p>
          </div>

          <div className="glass-card rounded-xl p-5 border border-slate-800/80 hover:border-slate-700/80 transition">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Concepts Mastered</span>
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Brain className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{loading ? '—' : stats.conceptsMastered}</p>
            <p className="text-[11px] text-slate-500 mt-1">Mastery score ≥ 80%</p>
          </div>
        </div>

        {/* AI Knowledge Discovery Graph Preview Card */}
        <KnowledgeGraphCard
          recentLectures={recentLectures}
          conceptsCount={mastery.length}
          weakCount={weakConcepts.length}
        />

        {/* Grid Container for Weak Concepts & Revision Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 2. Weak Concepts ("Needs Review") */}
          <section className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Needs Review (Weak Concepts)
                  </h2>
                  <p className="text-xs text-slate-400">Concepts with mastery score below 60%</p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-300 font-semibold border border-rose-500/20">
                {weakConcepts.length} Weak
              </span>
            </div>

            {loading ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                Analyzing concept mastery...
              </div>
            ) : weakConcepts.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-200">You're all caught up! 🎉</p>
                <p className="text-[11px] text-slate-400">
                  No concepts currently need review. Complete quizzes to track your progress.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {weakConcepts.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-slate-900/60 border border-rose-500/20 hover:border-rose-500/40 transition flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-200 truncate">
                          {item.concept_name}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                          {Math.round(item.mastery_score)}%
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 flex items-center gap-3">
                        <span>{item.incorrect_count} incorrect answers</span>
                        <span>•</span>
                        <span>Targeted revision recommended</span>
                      </p>
                    </div>

                    <Link
                      to={item.lecture_id ? `/lecture/${item.lecture_id}` : '/lectures'}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                    >
                      <span>Review Concept</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 3. Revision Tasks */}
          <section className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Pending Revision Tasks
                  </h2>
                  <p className="text-xs text-slate-400">Spaced repetition schedule for retention</p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/20">
                {revisionTasks.length} Pending
              </span>
            </div>

            {loading ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                Fetching revision tasks...
              </div>
            ) : revisionTasks.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 text-center space-y-2">
                <Sparkles className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-200">You're all caught up! 🎉</p>
                <p className="text-[11px] text-slate-400">
                  No pending revision tasks right now. Great job keeping your learning loop active.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {revisionTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-200 truncate">
                          {task.concept_name}
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          {task.task_type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {formatReviewDate(task.scheduled_for)}
                        </span>
                        <span>•</span>
                        <span>Mastery: {Math.round(task.mastery_score)}%</span>
                      </div>
                    </div>

                    <Link
                      to={task.lecture_id ? `/lecture/${task.lecture_id}` : '/lectures'}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                    >
                      <span>Start Task</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* 4. Concept Mastery Overview */}
        <section className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Concept Mastery Breakdown
                </h2>
                <p className="text-xs text-slate-400">Personalized knowledge graph by mastery level</p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs font-medium">
              <button
                onClick={() => setMasteryTab('all')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  masteryTab === 'all'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({mastery.length})
              </button>
              <button
                onClick={() => setMasteryTab('strong')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  masteryTab === 'strong'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Strong ({strongConcepts.length})
              </button>
              <button
                onClick={() => setMasteryTab('developing')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  masteryTab === 'developing'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Developing ({developingConcepts.length})
              </button>
              <button
                onClick={() => setMasteryTab('needsReview')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  masteryTab === 'needsReview'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Needs Review ({needsReviewConcepts.length})
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
              Loading concept mastery graph...
            </div>
          ) : getFilteredMastery().length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-900/50 border border-slate-800 text-center space-y-2">
              <Brain className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No concepts found in this tier</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {mastery.length === 0
                  ? 'Complete a quiz to start building your concept mastery.'
                  : 'No concepts match the selected category filter.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getFilteredMastery().map((item) => {
                const score = Math.round(item.mastery_score);
                const isStrong = score >= 80;
                const isDeveloping = score >= 60 && score < 80;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs font-bold text-slate-200 line-clamp-1">
                        {item.concept_name}
                      </h3>
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

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          isStrong ? 'bg-emerald-500' : isDeveloping ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.max(5, score)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>
                        {item.correct_count} correct / {item.incorrect_count} incorrect
                      </span>
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
        </section>

        {/* 5. Upcoming Reviews & 6. Recent Lectures Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Reviews */}
          <section className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Upcoming Reviews
                  </h2>
                  <p className="text-xs text-slate-400">Ordered by earliest next review date</p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                Loading review schedule...
              </div>
            ) : upcomingReviews.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 text-center space-y-2">
                <Check className="w-8 h-8 text-blue-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-200">No scheduled reviews</p>
                <p className="text-[11px] text-slate-400">
                  Complete lecture quizzes to populate your review timeline.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {upcomingReviews.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 truncate">
                      <p className="font-semibold text-slate-200 truncate">{item.concept_name}</p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>Mastery: {Math.round(item.mastery_score)}%</span>
                        <span>•</span>
                        <span className="text-indigo-300 font-medium">
                          {formatReviewDate(item.next_review_at)}
                        </span>
                      </p>
                    </div>

                    <Link
                      to={item.lecture_id ? `/lecture/${item.lecture_id}` : '/lectures'}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                      title="Open Lecture"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Lectures */}
          <section className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Recent Lectures
                  </h2>
                  <p className="text-xs text-slate-400">Your latest uploaded materials</p>
                </div>
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

            {loading ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                Loading lectures...
              </div>
            ) : recentLectures.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 text-center space-y-3">
                <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-300">
                  Start learning by adding your first lecture.
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
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {recentLectures.map((lecture) => (
                  <Link
                    key={lecture.id}
                    to={`/lecture/${lecture.id}`}
                    className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between group"
                  >
                    <div className="space-y-1 truncate pr-2">
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

                        <span className="text-[10px] text-slate-500">
                          {new Date(lecture.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition truncate">
                        {lecture.title}
                      </h3>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
