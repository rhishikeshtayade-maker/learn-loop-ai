import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { lectureService } from '../services/lecture.service';
import type { QuizResultData } from '../types/lecture';
import {
  Trophy,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Loader2,
  AlertCircle,
  BarChart3,
  BookOpen,
} from 'lucide-react';

export const QuizResult: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [result, setResult] = useState<QuizResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResult() {
      if (!attemptId) return;
      try {
        const res = await lectureService.getQuizAttemptResult(attemptId);
        if (res.success && res.result) {
          setResult(res.result);
        } else {
          setError('Failed to load quiz result');
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load quiz result');
      } finally {
        setLoading(false);
      }
    }
    fetchResult();
  }, [attemptId]);

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return 'N/A';
    try {
      return new Date(isoString).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return isoString;
    }
  };

  const calculateDuration = (startIso?: string, endIso?: string) => {
    if (!startIso || !endIso) return null;
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();
    const diffSec = Math.max(0, Math.floor((end - start) / 1000));
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Loading Quiz Results...
          </p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-xl mx-auto px-4 py-16 text-center">
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl w-fit mx-auto mb-4 text-rose-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Quiz Result Unavailable</h2>
          <p className="text-xs text-slate-400 mb-6">{error || 'Result record not found.'}</p>
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

  const score = result.score;
  const isHigh = score >= 80;
  const isMedium = score >= 50 && score < 80;

  const scoreBadgeBg = isHigh
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    : isMedium
    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    : 'bg-rose-500/10 text-rose-400 border-rose-500/20';

  const durationText = calculateDuration(result.startedAt, result.completedAt);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-12 flex flex-col justify-center">
        <div className="glass-card rounded-3xl p-8 sm:p-12 border border-slate-800 text-center relative overflow-hidden space-y-8">
          {/* Header Icon */}
          <div className="w-20 h-20 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-xl shadow-indigo-600/10">
            <Trophy className="w-10 h-10" />
          </div>

          {/* Title & Score */}
          <div className="space-y-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${scoreBadgeBg}`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isHigh ? 'Outstanding Mastery!' : isMedium ? 'Good Effort!' : 'Keep Practicing!'}
            </span>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Quiz Completed
            </h1>

            <div className="pt-4">
              <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-emerald-400">
                {result.score}%
              </span>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">
                Final Score
              </p>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-left">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <span>Correct Answers</span>
              </div>
              <p className="text-lg font-bold text-white">
                {result.correctAnswers} / {result.totalQuestions}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
                <Clock className="w-4 h-4 text-purple-400" />
                <span>Completion Time</span>
              </div>
              <p className="text-lg font-bold text-white">
                {durationText || 'N/A'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>Completed At</span>
              </div>
              <p className="text-xs font-bold text-slate-200 mt-1">
                {formatDateTime(result.completedAt)}
              </p>
            </div>
          </div>

          {/* Return Action */}
          <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-center gap-4">
            {result.lectureId ? (
              <Link
                to={`/lecture/${result.lectureId}`}
                className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 inline-flex items-center justify-center gap-2 transition"
              >
                <ArrowLeft className="w-4 h-4" /> Return to Lecture
              </Link>
            ) : (
              <Link
                to="/lectures"
                className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 inline-flex items-center justify-center gap-2 transition"
              >
                <ArrowLeft className="w-4 h-4" /> Back to All Lectures
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default QuizResult;
