import React from 'react';
import { Link } from 'react-router-dom';
import { Network, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Lecture } from '../../types/lecture';

interface KnowledgeGraphCardProps {
  recentLectures: Lecture[];
  conceptsCount: number;
  weakCount: number;
}

export const KnowledgeGraphCard: React.FC<KnowledgeGraphCardProps> = ({
  recentLectures,
  conceptsCount,
  weakCount,
}) => {
  const latestLecture = recentLectures && recentLectures.length > 0 ? recentLectures[0] : null;
  const targetLink = latestLecture ? `/lecture/${latestLecture.id}?tab=graph` : '/lectures';

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 hover:border-slate-700/80 transition relative overflow-hidden group">
      {/* Ambient gradient glow in background */}
      <div className="absolute -top-16 -right-16 w-56 h-56 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-600/20 transition-all duration-500"></div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
        {/* Left Side Info */}
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/10">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                🧠 AI Knowledge Discovery Graph
              </h3>
              <p className="text-xs text-slate-400">
                Explore how your concepts connect and discover what to learn next.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1 text-xs">
            <span className="px-2.5 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 font-semibold">
              <strong className="text-white">{conceptsCount}</strong> Concepts Mapped
            </span>
            {weakCount > 0 ? (
              <span className="px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>{weakCount} Needs Attention</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Balanced Foundation</span>
              </span>
            )}
          </div>
        </div>

        {/* Right Side Visual Preview & Action Button */}
        <div className="flex flex-col sm:items-end justify-between gap-4 shrink-0">
          {/* Mini Interactive Preview Dots */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800/80">
            <div className="flex items-center -space-x-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-slate-950"></span>
              <span className="w-3.5 h-3.5 rounded-full bg-indigo-400 ring-2 ring-slate-950"></span>
              <span className="w-3.5 h-3.5 rounded-full bg-purple-400 ring-2 ring-slate-950"></span>
              {weakCount > 0 && (
                <span className="w-3.5 h-3.5 rounded-full bg-rose-400 ring-2 ring-slate-950 animate-pulse"></span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              {latestLecture ? `Latest: ${latestLecture.title.slice(0, 24)}...` : 'Connected Knowledge'}
            </span>
          </div>

          <Link
            to={targetLink}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition group-hover:shadow-indigo-600/30"
          >
            <span>Explore Knowledge Graph</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
};
