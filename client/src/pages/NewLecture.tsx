import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { lectureService } from '../services/lecture.service';
import { Sparkles, Video, ArrowRight, AlertCircle, PlayCircle, Loader2 } from 'lucide-react';

export const NewLecture: React.FC = () => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) {
      setError('Please provide a YouTube video URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const lecture = await lectureService.createLecture(youtubeUrl.trim());
      // Navigate to the lecture page where the user can trigger processing or view it
      navigate(`/lecture/${lecture.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lecture from URL');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSample = (sampleUrl: string) => {
    setYoutubeUrl(sampleUrl);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center max-w-xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Phase 3: Lecture Processing Pipeline</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Add a Lecture
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Paste a YouTube lecture and turn it into an interactive learning experience.
          </p>
        </div>

        {/* Input Card */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-3">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="youtube-url-input" className="block text-xs font-semibold text-slate-200 mb-2">
                YouTube Lecture URL
              </label>
              <div className="relative">
                <Video className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-500" />
                <input
                  id="youtube-url-input"
                  type="text"
                  required
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=zjkBMFhNj_g"
                  className="w-full bg-slate-900/90 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 transition outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Supports standard YouTube videos, youtu.be short links, and YouTube Shorts with closed captions.
              </p>
            </div>

            <button
              id="submit-lecture-button"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validating & Creating Lecture...</span>
                </>
              ) : (
                <>
                  <span>Process Lecture</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Sample Lectures Helper */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <p className="text-xs font-medium text-slate-400 mb-3 flex items-center gap-1.5">
              <PlayCircle className="w-4 h-4 text-indigo-400" />
              <span>Or test with a popular lecture sample:</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleSelectSample('https://www.youtube.com/watch?v=zjkBMFhNj_g')}
                className="text-left p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 transition"
              >
                <p className="text-xs font-semibold text-slate-200">Andrej Karpathy</p>
                <p className="text-[11px] text-slate-400 truncate">Intro to Large Language Models</p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectSample('https://www.youtube.com/watch?v=aircAruvnKk')}
                className="text-left p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 transition"
              >
                <p className="text-xs font-semibold text-slate-200">3Blue1Brown</p>
                <p className="text-[11px] text-slate-400 truncate">Neural Networks & Deep Learning</p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectSample('https://www.youtube.com/watch?v=ZaKGMt9j_5k')}
                className="text-left p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 transition"
              >
                <p className="text-xs font-semibold text-slate-200">MIT OpenCourseWare</p>
                <p className="text-[11px] text-slate-400 truncate">Introduction to Algorithms</p>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NewLecture;
