import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { QuizQuestion } from '../../types/lecture';
import { lectureService } from '../../services/lecture.service';
import {
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Play,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react';

interface QuizTabProps {
  questions: QuizQuestion[];
  lectureId?: string;
}

interface CheckResult {
  isCorrect: boolean;
  correctAnswerText: string;
  explanation: string;
}

export const QuizTab: React.FC<QuizTabProps> = ({ questions, lectureId }) => {
  const navigate = useNavigate();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [checkedResults, setCheckedResults] = useState<Record<string, CheckResult>>({});
  const [starting, setStarting] = useState(false);
  const [checking, setChecking] = useState(false);
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
  const currentAnswer = selectedAnswers[current?.id] || '';
  const currentResult = checkedResults[current?.id];

  const answeredCount = Object.keys(selectedAnswers).filter(
    (id) => selectedAnswers[id] && selectedAnswers[id].trim() !== ''
  ).length;
  const isAllAnswered = answeredCount === questions.length;

  const handleCheckAnswer = async () => {
    if (!lectureId || !current?.id) return;
    if (!currentAnswer.trim()) {
      setError('Please type or select an answer before checking.');
      return;
    }

    setChecking(true);
    setError(null);
    try {
      const res = await lectureService.checkQuizAnswer(lectureId, current.id, currentAnswer);
      if (res.success) {
        setCheckedResults((prev) => ({
          ...prev,
          [current.id]: {
            isCorrect: res.isCorrect,
            correctAnswerText: res.correctAnswerText,
            explanation: res.explanation,
          },
        }));
      } else {
        setError('Failed to check answer.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to check answer.');
    } finally {
      setChecking(false);
    }
  };

  const handleSelectOption = (opt: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [current.id]: opt,
    }));
    // Clear previous check result when changing answer
    if (checkedResults[current.id]) {
      setCheckedResults((prev) => {
        const copy = { ...prev };
        delete copy[current.id];
        return copy;
      });
    }
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
      selectedAnswer: selectedAnswers[q.id] || '',
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
            Test your understanding with {questions.length} questions generated directly from this lecture. You can check your answer after each question!
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
            Answer questions, check your answers instantly, and submit when ready.
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
      <div className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-800/80 space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
            Question {currentIndex + 1}
          </span>
          {getDifficultyBadge(current?.difficulty)}
        </div>

        <h3 className="text-base font-bold text-white leading-snug">
          {current?.question}
        </h3>

        {/* Quick-Pick Option Chips (if options exist) */}
        {current?.options && current.options.length > 0 && (
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Quick Options (Click to select or type below):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {current.options.map((option, idx) => {
                const isSelected = currentAnswer.trim().toLowerCase() === option.trim().toLowerCase();
                const letter = String.fromCharCode(65 + idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectOption(option)}
                    className={`text-left p-3 rounded-xl border text-xs font-medium transition flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-sm shadow-indigo-500/10'
                        : 'bg-slate-900/60 hover:bg-slate-800/70 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {letter}
                    </span>
                    <span className="leading-snug break-words">{option}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Typed Answer Input */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Your Answer:
          </label>
          <textarea
            value={currentAnswer}
            onChange={(e) => {
              setSelectedAnswers((prev) => ({
                ...prev,
                [current?.id]: e.target.value,
              }));
              if (checkedResults[current?.id]) {
                setCheckedResults((prev) => {
                  const copy = { ...prev };
                  delete copy[current?.id];
                  return copy;
                });
              }
            }}
            placeholder="Type your answer or formula here (e.g., F = q(v × B))..."
            className="w-full p-3.5 rounded-xl border border-slate-800 bg-slate-900/80 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition"
            rows={3}
          />
        </div>

        {/* Check Answer Button & Status */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleCheckAnswer}
            disabled={!currentAnswer.trim() || checking}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 inline-flex items-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {checking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking Answer...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-indigo-200" />
                Check Answer
              </>
            )}
          </button>
        </div>

        {/* Checked Result Banner */}
        {currentResult && (
          <div
            className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${
              currentResult.isCorrect
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {currentResult.isCorrect ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-2 text-xs flex-1">
                <div className="font-bold text-sm flex items-center justify-between">
                  <span>
                    {currentResult.isCorrect ? '✅ Correct! Excellent understanding.' : '❌ Not quite right.'}
                  </span>
                </div>

                {!currentResult.isCorrect && currentResult.correctAnswerText && (
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-rose-500/20">
                    <span className="text-slate-400 font-medium">Correct Answer: </span>
                    <span className="text-white font-semibold">{currentResult.correctAnswerText}</span>
                  </div>
                )}

                {currentResult.explanation && (
                  <div className="text-slate-300 leading-relaxed bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/60">
                    <span className="text-slate-400 font-semibold block mb-0.5">Explanation:</span>
                    <span>{currentResult.explanation}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
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
