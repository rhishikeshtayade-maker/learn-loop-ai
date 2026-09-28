import React, { useState, useMemo } from 'react';
import type { TranscriptSegment } from '../types/lecture';
import { Search, Copy, Check, Clock, ExternalLink } from 'lucide-react';

interface TranscriptViewerProps {
  transcript: string;
  segments?: TranscriptSegment[] | null;
  youtubeUrl: string;
  onSeek?: (seconds: number) => void;
}

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
  transcript,
  segments,
  youtubeUrl,
  onSeek,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const formatTimestamp = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTimestampClick = (seconds: number) => {
    if (onSeek) {
      onSeek(seconds);
    } else {
      // Open in YouTube at timestamp
      const url = new URL(youtubeUrl);
      url.searchParams.set('t', `${Math.floor(seconds)}s`);
      window.open(url.toString(), '_blank', 'noopener,noreferrer');
    }
  };

  // Filter segments based on search
  const filteredSegments = useMemo(() => {
    if (!segments || segments.length === 0) return null;
    if (!searchQuery.trim()) return segments;
    const query = searchQuery.toLowerCase();
    return segments.filter((seg) => seg.text.toLowerCase().includes(query));
  }, [segments, searchQuery]);

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 flex flex-col overflow-hidden">
      {/* Viewer Header / Toolbar */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Lecture Transcript
          </h3>
          <span className="text-[11px] text-slate-400">
            {segments ? `(${segments.length} timestamped segments)` : ''}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Search Filter */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transcript..."
              className="w-full bg-slate-900/90 border border-slate-800 focus:border-indigo-500 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 outline-none transition"
            />
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 transition"
            title="Copy full transcript"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 text-[11px]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[11px]">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Transcript Content Area */}
      <div className="p-6 max-h-[550px] overflow-y-auto space-y-4">
        {filteredSegments && filteredSegments.length > 0 ? (
          filteredSegments.map((seg, idx) => (
            <div
              key={idx}
              className="group flex items-start gap-4 p-2.5 rounded-xl hover:bg-slate-900/60 border border-transparent hover:border-slate-800/60 transition"
            >
              <button
                onClick={() => handleTimestampClick(seg.start)}
                className="shrink-0 px-2.5 py-1 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-[11px] font-mono font-medium flex items-center gap-1 transition"
                title="Click to jump to YouTube timestamp"
              >
                <span>{formatTimestamp(seg.start)}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
              </button>
              <p className="text-xs text-slate-300 leading-relaxed font-sans pt-0.5">
                {seg.text}
              </p>
            </div>
          ))
        ) : filteredSegments && filteredSegments.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No segments matching "{searchQuery}".
          </div>
        ) : (
          /* Formatted Paragraph Fallback */
          <div className="space-y-4 text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line">
            {transcript}
          </div>
        )}
      </div>
    </div>
  );
};

export default TranscriptViewer;
