import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { QuizQuestion } from '../../types/lecture';
import { lectureService } from '../../services/lecture.service';
import {
  HelpCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Play,
  Send,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface QuizTabProps {
  questions: QuizQuestion[];
  lectureId?: string;
}

export const QuizTab: React.FC<QuizTabProps> = ({ questions, lectureId }) => {
  const navigate = useNavigate();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (questions.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-slate-400 border border-slate-800">
        <HelpCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
        <p className="text-sm font-semibold">No quiz questions generated yet.</p>
      </div>
    );
  }

  const handleStartQuiz = async () => {
    if (!lectureId) {
      setError('Lecture ID is missing');
      return;
    }
    setStarting(true);
    setError(null);
    try {
      const res = await lectureService.startQuizAttempt(lectureId);
      if (res.success && res.attempt?.id) {
        setAttemptId(res.attempt.id);
      } else {
        setError('Failed to start quiz attempt');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to start quiz');
    } finally {
      setStarting(false);
    }
  };

  const current = questions[currentIndex];
  const selected = selectedAnswers[current?.id];
  const answeredCount = Object.keys(selectedAnswers).length;
  const isAllAnswered = answeredCount === questions.length;

  const handleSelectOption = (optIndex: number) => {
    if (!current) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [current.id]: optIndex,
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!attemptId) return;
    if (!isAllAnswered) {
      setError('Please answer all questions before submitting.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const answersPayload = questions.map((q) => ({
      questionId: q.id,
      selectedAnswer: selectedAnswers[q.id],
    }));

    try {
      const res = await lectureService.submitQuizAttempt(attemptId, answersPayload);
      if (res.success && res.result?.attemptId) {
        navigate(`/quiz-attempts/${res.result.attemptId}/result`);
      } else {
        setError('Failed to submit quiz attempt.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to submit quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  const getDifficultyBadge = (difficulty?: string) => {
    switch (difficulty) {
      case 'HARD':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            HARD
          </span>
        );
      case 'EASY':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            EASY
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            MEDIUM
          </span>
        );
    }
  };

  // 1. Initial view before starting quiz
  if (!attemptId) {
    return (
      <div className="glass-card rounded-2xl p-8 sm:p-12 text-center border border-slate-800 max-w-2xl mx-auto space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
          <HelpCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Lecture Quiz Ready</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Test your understanding with {questions.length} multiple choice questions generated directly from this lecture.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleStartQuiz}
          disabled={starting}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 inline-flex items-center gap-2 transition disabled:opacity-50"
        >
          {starting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Starting Attempt...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Start Quiz
            </>
          )}
        </button>
      </div>
    );
  }

  // 2. Active Quiz view
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Quiz Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-400" />
            Lecture Quiz ({questions.length} Questions)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Answer all questions before submitting for instant grading.
          </p>
        </div>
        <span className="text-xs font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
          Question {currentIndex + 1} / {questions.length}
        </span>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Question Card */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-800/80">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
            Question {currentIndex + 1}
          </span>
          {getDifficultyBadge(current?.difficulty)}
        </div>

        <h3 className="text-base font-bold text-white mb-6 leading-snug">
          {current?.question}
        </h3>

        {/* Options */}
        <div className="space-y-3">
          {current?.options.map((option, optIdx) => {
            const isSelected = selected === optIdx;
            return (
              <button
                key={optIdx}
                onClick={() => handleSelectOption(optIdx)}
                className={`w-full p-4 rounded-xl border text-left text-xs font-medium transition flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/10'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-lg text-[11px] font-bold flex items-center justify-center border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-400'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {String.fromCharCode(65 + optIdx)}
                  </span>
                  <span>{option}</span>
                </div>
                {isSelected && <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation & Submit Controls */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0 || submitting}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 rounded-xl flex items-center gap-1.5 transition disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        <span className="text-xs text-slate-500 font-medium">
          {answeredCount} of {questions.length} answered
        </span>

        {currentIndex < questions.length - 1 ? (
          <button
            onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
            disabled={submitting}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 rounded-xl flex items-center gap-1.5 transition disabled:opacity-40"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmitQuiz}
            disabled={!isAllAnswered || submitting}
            title={!isAllAnswered ? 'Please answer all questions to submit' : ''}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Submit Quiz
              </>
            )}
          </button>
        )}
      </div>

      {/* Progress Footer submit prompt if not all answered */}
      {!isAllAnswered && (
        <p className="text-[11px] text-center text-amber-400/80 font-medium">
          ⚠️ Please answer all {questions.length} questions before submitting your quiz.
        </p>
      )}
    </div>
  );
};
