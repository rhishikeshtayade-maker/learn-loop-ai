import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, ArrowRight, Play, Brain, RefreshCw, BarChart2, BookOpen, Layers } from 'lucide-react';

export const Landing: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
              LearnLoop AI
            </span>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <Link
                to="/dashboard"
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/20 transition flex items-center gap-1.5"
              >
                Go to Dashboard <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-xs font-medium text-slate-300 hover:text-white transition px-3 py-1.5"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/20 transition flex items-center gap-1.5"
                >
                  Get Started Free <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[300px] h-[250px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Powered by Google Gemini 2.5 Flash & Adaptive Spaced Repetition</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
            Turn Every Lecture Into a{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
              Learning Loop.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            LearnLoop AI transforms lectures into concepts, quizzes, revision and personalized learning. Never forget what you watch again.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              to={user ? "/dashboard" : "/register"}
              className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-2 transition"
            >
              Start Free Learning Loop <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to={user ? "/dashboard" : "/login"}
              className="w-full sm:w-auto px-6 py-3 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white text-sm font-semibold rounded-xl border border-slate-800 transition flex items-center justify-center gap-2"
            >
              Explore Sample Lectures
            </Link>
          </div>
        </div>
      </section>

      {/* The Learning Loop Visualization */}
      <section className="py-12 border-y border-slate-900 bg-slate-950/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-xs uppercase tracking-widest text-indigo-400 font-semibold mb-2">The Architecture of Retention</h2>
            <p className="text-2xl font-bold text-white">How the LearnLoop Closed Loop Works</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            <div className="glass-card rounded-xl p-5 border border-slate-800 text-center flex flex-col items-center">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
                <Play className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-bold text-white mb-1">1. Video Ingestion</h3>
              <p className="text-[11px] text-slate-400">Extracts real closed-captions and timestamped transcripts</p>
            </div>

            <div className="glass-card rounded-xl p-5 border border-slate-800 text-center flex flex-col items-center">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-3">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-bold text-white mb-1">2. Concept Extraction</h3>
              <p className="text-[11px] text-slate-400">Gemini structures core educational concepts & summaries</p>
            </div>

            <div className="glass-card rounded-xl p-5 border border-slate-800 text-center flex flex-col items-center">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-bold text-white mb-1">3. Active Recall</h3>
              <p className="text-[11px] text-slate-400">Generates 3D flashcards and concept-grounded MCQs</p>
            </div>

            <div className="glass-card rounded-xl p-5 border border-slate-800 text-center flex flex-col items-center">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
                <BarChart2 className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-bold text-white mb-1">4. Weak Spot Detection</h3>
              <p className="text-[11px] text-slate-400">Scores mastery by concept to pinpoint gaps</p>
            </div>

            <div className="glass-card rounded-xl p-5 border border-slate-800 text-center flex flex-col items-center">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-bold text-white mb-1">5. Adaptive Revision</h3>
              <p className="text-[11px] text-slate-400">Schedules spaced repetition drills until full mastery</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel rounded-2xl p-6 border border-slate-800">
              <BookOpen className="w-6 h-6 text-indigo-400 mb-3" />
              <h3 className="text-sm font-bold text-white mb-1.5">Interactive Concept Maps</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Click any concept to jump directly to the exact second in the lecture video where it was taught.
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-6 border border-slate-800">
              <Brain className="w-6 h-6 text-cyan-400 mb-3" />
              <h3 className="text-sm font-bold text-white mb-1.5">Targeted Diagnostic Quizzes</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Multi-tier difficulty questions rigorously tested for conceptual understanding, not mere memorization.
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-6 border border-slate-800">
              <RefreshCw className="w-6 h-6 text-purple-400 mb-3" />
              <h3 className="text-sm font-bold text-white mb-1.5">Spaced Repetition Engine</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Concepts you struggle with automatically surface for review today, while strong topics are spaced out.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-slate-400">LearnLoop AI</span>
            <span>— Hackathon MVP Edition</span>
          </div>
          <p>© 2026 LearnLoop AI. Built with Google Antigravity & Gemini API.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
