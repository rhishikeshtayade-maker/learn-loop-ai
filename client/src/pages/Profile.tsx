import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { lectureService } from '../services/lecture.service';
import {
  Mail,
  BookOpen,
  Brain,
  Target,
  Award,
  LogOut,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProfileStats {
  totalLectures: number;
  quizzesAttempted: number;
  averageScore: number;
  conceptsMastered: number;
}

export const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ProfileStats>({
    totalLectures: 0,
    quizzesAttempted: 0,
    averageScore: 0,
    conceptsMastered: 0,
  });

  useEffect(() => {
    const fetchProfileStats = async () => {
      try {
        const res = await lectureService.getDashboardData();
        if (res && res.success) {
          setStats(res.stats);
        }
      } catch (err) {
        console.error('Failed to load profile stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileStats();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Profile Card */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 p-0.5 shadow-xl shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-indigo-400 font-bold text-2xl">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
              </div>
            </div>

            <div className="space-y-1 text-center sm:text-left flex-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 mb-1">
                <ShieldCheck className="w-3 h-3 text-indigo-400" />
                <span>Verified Student Account</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {user?.name || 'Student User'}
              </h1>
              <p className="text-xs text-slate-400 flex items-center justify-center sm:justify-start gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>{user?.email}</span>
              </p>
            </div>

            <button
              onClick={logout}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold rounded-xl transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Learning Performance Overview</span>
          </h2>

          {loading ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
              Loading profile statistics...
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="glass-card rounded-xl p-5 border border-slate-800 text-center space-y-1">
                <BookOpen className="w-5 h-5 text-indigo-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{stats.totalLectures}</p>
                <p className="text-[11px] text-slate-400">Total Lectures</p>
              </div>

              <div className="glass-card rounded-xl p-5 border border-slate-800 text-center space-y-1">
                <Target className="w-5 h-5 text-purple-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{stats.quizzesAttempted}</p>
                <p className="text-[11px] text-slate-400">Quizzes Attempted</p>
              </div>

              <div className="glass-card rounded-xl p-5 border border-slate-800 text-center space-y-1">
                <Award className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">
                  {stats.quizzesAttempted > 0 ? `${stats.averageScore}%` : 'N/A'}
                </p>
                <p className="text-[11px] text-slate-400">Average Score</p>
              </div>

              <div className="glass-card rounded-xl p-5 border border-slate-800 text-center space-y-1">
                <Brain className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{stats.conceptsMastered}</p>
                <p className="text-[11px] text-slate-400">Concepts Mastered</p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              to="/dashboard"
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 transition flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-semibold text-slate-200">Go to Dashboard</p>
                <p className="text-[11px] text-slate-400">View progress & recommended tasks</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-indigo-400" />
            </Link>

            <Link
              to="/revision"
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 transition flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-semibold text-slate-200">Adaptive Revision Hub</p>
                <p className="text-[11px] text-slate-400">Practice weak concepts & scheduled tasks</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
