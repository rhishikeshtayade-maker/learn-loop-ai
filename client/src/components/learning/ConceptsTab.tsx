import React from 'react';
import type { Concept } from '../../types/lecture';
import { BookOpen, Sparkles, Clock } from 'lucide-react';

interface ConceptsTabProps {
  concepts: Concept[];
}

export const ConceptsTab: React.FC<ConceptsTabProps> = ({ concepts }) => {
  if (concepts.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-slate-400 border border-slate-800">
        <BookOpen className="w-8 h-8 text-slate-500 mx-auto mb-2" />
        <p className="text-sm font-semibold">No concepts generated yet.</p>
      </div>
    );
  }

  const getImportanceBadge = (importance?: string) => {
    switch (importance) {
      case 'HIGH':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">HIGH IMPORTANCE</span>;
      case 'LOW':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">LOW IMPORTANCE</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">MEDIUM IMPORTANCE</span>;
    }
  };

  const formatSeconds = (sec?: number | null) => {
    if (sec === null || sec === undefined) return null;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            Extracted Key Concepts ({concepts.length})
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Grounded concepts extracted from lecture transcript.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {concepts.map((concept, index) => (
          <div key={concept.id || index} className="glass-card rounded-2xl p-6 border border-slate-800/80 hover:border-slate-700 transition">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center">
                  {index + 1}
                </span>
                <h3 className="text-base font-bold text-white tracking-tight">{concept.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                {formatSeconds(concept.timestamp_start || concept.timestampStart) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300">
                    <Clock className="w-3 h-3" />
                    {formatSeconds(concept.timestamp_start || concept.timestampStart)}
                  </span>
                )}
                {getImportanceBadge(concept.importance)}
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">{concept.description}</p>

            {(concept.simple_explanation || concept.detailed_explanation) && (
              <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
                {concept.simple_explanation && (
                  <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                    <p className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" /> Simple Explanation
                    </p>
                    <p className="text-xs text-slate-300">{concept.simple_explanation}</p>
                  </div>
                )}
                {concept.detailed_explanation && (
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">In-Depth Explanation</p>
                    <p className="text-xs text-slate-300 leading-relaxed">{concept.detailed_explanation}</p>
                  </div>
                )}
                {concept.example && (
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                    <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-1">Example</p>
                    <p className="text-xs text-slate-300">{concept.example}</p>
                  </div>
                )}
                {concept.common_misconception && (
                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                    <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider mb-1">Common Misconception</p>
                    <p className="text-xs text-slate-300">{concept.common_misconception}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
