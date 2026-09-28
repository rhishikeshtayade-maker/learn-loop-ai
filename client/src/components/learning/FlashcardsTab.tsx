import React, { useState } from 'react';
import type { Flashcard } from '../../types/lecture';
import { CreditCard, ChevronLeft, ChevronRight, RotateCw, Sparkles } from 'lucide-react';

interface FlashcardsTabProps {
  flashcards: Flashcard[];
}

export const FlashcardsTab: React.FC<FlashcardsTabProps> = ({ flashcards }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (flashcards.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-slate-400 border border-slate-800">
        <CreditCard className="w-8 h-8 text-slate-500 mx-auto mb-2" />
        <p className="text-sm font-semibold">No flashcards generated yet.</p>
      </div>
    );
  }

  const current = flashcards[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % flashcards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  const getDifficultyBadge = (difficulty?: string) => {
    switch (difficulty) {
      case 'HARD':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">HARD</span>;
      case 'EASY':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">EASY</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">MEDIUM</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            Active Recall Flashcards ({flashcards.length})
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Click to flip card and test your memory.
          </p>
        </div>
        <span className="text-xs font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
          Card {currentIndex + 1} / {flashcards.length}
        </span>
      </div>

      {/* Interactive Card */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="glass-panel rounded-3xl p-8 sm:p-12 min-h-[300px] border border-slate-800 cursor-pointer flex flex-col justify-between items-center text-center relative overflow-hidden transition-all duration-300 hover:border-slate-700 shadow-2xl"
      >
        <div className="w-full flex items-center justify-between text-xs text-slate-500 mb-4">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-indigo-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            {isFlipped ? 'ANSWER SIDE' : 'QUESTION SIDE'}
          </span>
          {getDifficultyBadge(current.difficulty)}
        </div>

        {/* Content */}
        <div className="my-auto max-w-xl">
          {!isFlipped ? (
            <div>
              <p className="text-base sm:text-lg font-bold text-white leading-relaxed">{current.question}</p>
              <p className="text-[11px] text-slate-500 mt-4 flex items-center justify-center gap-1">
                <RotateCw className="w-3 h-3" /> Click card to reveal answer
              </p>
            </div>
          ) : (
            <div>
              <p className="text-base sm:text-lg font-semibold text-emerald-300 leading-relaxed">{current.answer}</p>
              <p className="text-[11px] text-slate-500 mt-4 flex items-center justify-center gap-1">
                <RotateCw className="w-3 h-3" /> Click card to view question
              </p>
            </div>
          )}
        </div>

        {/* Bottom indicator */}
        <div className="w-full text-center text-[11px] text-slate-500 pt-4 border-t border-slate-800/60">
          LearnLoop Flashcards
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={handlePrev}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 rounded-xl flex items-center gap-1.5 transition"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        <button
          onClick={() => setIsFlipped(!isFlipped)}
          className="px-5 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-semibold text-indigo-300 rounded-xl flex items-center gap-1.5 transition"
        >
          <RotateCw className="w-3.5 h-3.5" /> Flip Card
        </button>

        <button
          onClick={handleNext}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 rounded-xl flex items-center gap-1.5 transition"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
