import React, { useState } from 'react';
import type { Flashcard } from '../../types/lecture';
import { CreditCard, ChevronLeft, ChevronRight, Sparkles, CheckCircle2, XCircle, Check, HelpCircle } from 'lucide-react';

interface FlashcardsTabProps {
  flashcards: Flashcard[];
}

export const FlashcardsTab: React.FC<FlashcardsTabProps> = ({ flashcards }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Per-card user selections & submission state
  // selectedOptions: cardKey -> optionIndex (0|1|2|3)
  const [selectedOptions, setSelectedOptions] = useState<Record<string | number, number>>({});
  // checkedCards: cardKey -> boolean (true after user clicks "Check Answer")
  const [checkedCards, setCheckedCards] = useState<Record<string | number, boolean>>({});

  // Legacy flip state
  const [isLegacyFlipped, setIsLegacyFlipped] = useState(false);

  if (flashcards.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-slate-400 border border-slate-800">
        <CreditCard className="w-8 h-8 text-slate-500 mx-auto mb-2" />
        <p className="text-sm font-semibold">No flashcards generated yet.</p>
      </div>
    );
  }

  const current = flashcards[currentIndex];
  const cardKey = current.id || currentIndex;

  const handleNext = () => {
    setIsLegacyFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % flashcards.length);
  };

  const handlePrev = () => {
    setIsLegacyFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
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

  // Determine correct answer index
  const correctAnsIndex =
    typeof current.correct_answer === 'number'
      ? current.correct_answer
      : typeof current.correctAnswer === 'number'
      ? current.correctAnswer
      : null;

  // Valid MCQ check
  const isMcq =
    Array.isArray(current.options) &&
    current.options.length === 4 &&
    correctAnsIndex !== null;

  const selectedOpt = selectedOptions[cardKey];
  const isChecked = checkedCards[cardKey] === true;

  const handleSelectOption = (optIdx: number) => {
    if (isChecked) return; // Locked after checking
    setSelectedOptions((prev) => ({
      ...prev,
      [cardKey]: optIdx,
    }));
  };

  const handleCheckAnswer = () => {
    if (selectedOpt === undefined || isChecked) return;
    setCheckedCards((prev) => ({
      ...prev,
      [cardKey]: true,
    }));
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            Active Recall Flashcards ({flashcards.length})
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isMcq
              ? 'Select an option and check your answer for instant feedback.'
              : 'Classic active recall card.'}
          </p>
        </div>
        <span className="text-xs font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
          Card {currentIndex + 1} / {flashcards.length}
        </span>
      </div>

      {isMcq ? (
        /* Multiple Choice Flashcard view */
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
          {/* Top Meta */}
          <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-800/80 pb-4">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-indigo-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              QUESTION {currentIndex + 1}
            </span>
            {getDifficultyBadge(current.difficulty)}
          </div>

          {/* Question Text */}
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed">
              {current.question}
            </h3>
          </div>

          {/* MCQ Options */}
          <div className="space-y-3 pt-2">
            {current.options!.map((option, optIdx) => {
              const optionLetter = String.fromCharCode(65 + optIdx);
              const isSelectedOption = selectedOpt === optIdx;
              const isCorrectOption = correctAnsIndex === optIdx;

              let optionStyle =
                'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700 hover:text-white cursor-pointer';
              let badgeStyle = 'bg-slate-800 text-slate-400 border-slate-700';

              if (isChecked) {
                if (isCorrectOption) {
                  optionStyle =
                    'bg-emerald-500/15 border-emerald-500/80 text-emerald-200 shadow-lg shadow-emerald-500/10 font-semibold';
                  badgeStyle = 'bg-emerald-500 text-white border-emerald-400';
                } else if (isSelectedOption) {
                  optionStyle =
                    'bg-rose-500/15 border-rose-500/80 text-rose-200 shadow-lg shadow-rose-500/10 font-semibold';
                  badgeStyle = 'bg-rose-500 text-white border-rose-400';
                } else {
                  optionStyle = 'bg-slate-900/30 border-slate-800/40 text-slate-500 opacity-50 cursor-not-allowed';
                  badgeStyle = 'bg-slate-800/40 text-slate-600 border-slate-800';
                }
              } else if (isSelectedOption) {
                optionStyle =
                  'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/10 font-semibold';
                badgeStyle = 'bg-indigo-600 text-white border-indigo-400';
              }

              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => handleSelectOption(optIdx)}
                  disabled={isChecked}
                  aria-label={`Option ${optionLetter}: ${option}`}
                  className={`w-full p-4 rounded-2xl border text-left text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-between gap-3 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${optionStyle}`}
                >
                  <div className="flex items-center gap-3.5">
                    <span
                      className={`w-7 h-7 rounded-xl text-xs font-bold flex items-center justify-center border shrink-0 transition-colors ${badgeStyle}`}
                    >
                      {optionLetter}
                    </span>
                    <span className="leading-snug">{option}</span>
                  </div>

                  {/* Icon & Badge indicator */}
                  {isChecked ? (
                    <div className="flex items-center gap-2 shrink-0">
                      {isCorrectOption && (
                        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                          <span className="hidden sm:inline bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-lg text-[10px]">
                            {isSelectedOption ? 'CORRECT' : 'CORRECT ANSWER'}
                          </span>
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        </div>
                      )}
                      {isSelectedOption && !isCorrectOption && (
                        <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold">
                          <span className="hidden sm:inline bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-lg text-[10px]">
                            YOUR ANSWER
                          </span>
                          <XCircle className="w-5 h-5 text-rose-400" />
                        </div>
                      )}
                    </div>
                  ) : (
                    isSelectedOption && (
                      <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    )
                  )}
                </button>
              );
            })}
          </div>

          {/* Action Button: Check Answer (Before checking) */}
          {!isChecked && (
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleCheckAnswer}
                disabled={selectedOpt === undefined}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
              >
                <Check className="w-4 h-4" /> Check Answer
              </button>
            </div>
          )}

          {/* Feedback & Explanation Section (After checking) */}
          {isChecked && (
            <div className="pt-4 border-t border-slate-800/80 space-y-4 animate-in fade-in duration-300">
              {/* Correct / Incorrect Banner */}
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3 ${
                  selectedOpt === correctAnsIndex
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {selectedOpt === correctAnsIndex ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-xs sm:text-sm font-bold">
                    {selectedOpt === correctAnsIndex
                      ? '✓ Correct! Great job.'
                      : `✕ Incorrect. The correct answer is Option ${String.fromCharCode(
                          65 + correctAnsIndex!
                        )}: ${current.options![correctAnsIndex!]}`}
                  </h4>
                </div>
              </div>

              {/* Explanation box */}
              {current.explanation && (
                <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 bg-slate-900/80 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    Explanation
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {current.explanation}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="w-full text-center text-[11px] text-slate-500 pt-2">
            LearnLoop Flashcards
          </div>
        </div>
      ) : (
        /* Legacy Flashcard Fallback (Step 12) */
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-300 text-xs flex items-center gap-2">
            <HelpCircle className="w-4 h-4 shrink-0 text-indigo-400" />
            <span>This flashcard uses the classic recall format.</span>
          </div>

          <div className="min-h-[160px] flex flex-col justify-center items-center text-center p-4">
            {!isLegacyFlipped ? (
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                  QUESTION
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed">
                  {current.question}
                </h3>
              </div>
            ) : (
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                  ANSWER
                </span>
                <p className="text-base sm:text-lg font-semibold text-emerald-300 leading-relaxed">
                  {current.answer}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setIsLegacyFlipped(!isLegacyFlipped)}
              className="px-5 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-semibold text-indigo-300 rounded-xl flex items-center gap-2 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isLegacyFlipped ? 'Show Question' : 'Reveal Answer'}
            </button>
          </div>
        </div>
      )}

      {/* Navigation Controls */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={handlePrev}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 rounded-xl flex items-center gap-1.5 transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 rounded-xl flex items-center gap-1.5 transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
