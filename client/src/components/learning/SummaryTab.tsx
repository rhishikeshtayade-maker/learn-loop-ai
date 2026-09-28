import React from 'react';
import type { SummaryData } from '../../types/lecture';
import { FileText, CheckCircle2, BookOpen, AlertCircle, HelpCircle, Layers } from 'lucide-react';

interface SummaryTabProps {
  summary: SummaryData | string | null;
}

export const SummaryTab: React.FC<SummaryTabProps> = ({ summary }) => {
  if (!summary) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-slate-400 border border-slate-800">
        <FileText className="w-8 h-8 text-slate-500 mx-auto mb-2" />
        <p className="text-sm font-semibold">No lecture summary generated yet.</p>
      </div>
    );
  }

  const data: SummaryData = typeof summary === 'string' ? JSON.parse(summary) : summary;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-400" />
          Structured Lecture Summary
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Comprehensive synthesis of key concepts, definitions, rules, and takeaways.
        </p>
      </div>

      {/* Overview Section */}
      {data.overview && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800/80 bg-indigo-950/10">
          <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-400" /> Executive Overview
          </h3>
          <p className="text-xs text-slate-200 leading-relaxed">{data.overview}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Key Takeaways */}
        {data.keyTakeaways && data.keyTakeaways.length > 0 && (
          <div className="glass-card rounded-2xl p-6 border border-slate-800/80">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Key Takeaways
            </h3>
            <ul className="space-y-2">
              {data.keyTakeaways.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Important Definitions */}
        {data.importantDefinitions && data.importantDefinitions.length > 0 && (
          <div className="glass-card rounded-2xl p-6 border border-slate-800/80">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" /> Important Definitions
            </h3>
            <ul className="space-y-2">
              {data.importantDefinitions.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Important Facts */}
        {data.importantFacts && data.importantFacts.length > 0 && (
          <div className="glass-card rounded-2xl p-6 border border-slate-800/80">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" /> Important Facts
            </h3>
            <ul className="space-y-2">
              {data.importantFacts.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-1.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Formulas / Rules */}
        {data.formulasOrRules && data.formulasOrRules.length > 0 && (
          <div className="glass-card rounded-2xl p-6 border border-slate-800/80">
            <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4" /> Formulas & Rules
            </h3>
            <ul className="space-y-2">
              {data.formulasOrRules.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 mt-1.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Prerequisites */}
      {data.prerequisites && data.prerequisites.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800/80">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Prerequisites</h3>
          <div className="flex flex-wrap gap-2">
            {data.prerequisites.map((p, idx) => (
              <span key={idx} className="px-3 py-1 rounded-lg bg-slate-800 text-xs text-slate-300 border border-slate-700">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
