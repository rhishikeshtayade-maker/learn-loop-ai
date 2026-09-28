import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { TranscriptViewer } from '../components/TranscriptViewer';
import { ConceptsTab } from '../components/learning/ConceptsTab';
import { SummaryTab } from '../components/learning/SummaryTab';
import { FlashcardsTab } from '../components/learning/FlashcardsTab';
import { QuizTab } from '../components/learning/QuizTab';
import { lectureService } from '../services/lecture.service';
import type { Lecture, Concept, SummaryData, Flashcard, QuizQuestion } from '../types/lecture';
import {
  Sparkles,
  Video,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ExternalLink,
  ArrowLeft,
  FileText,
  BookOpen,
  CreditCard,
  HelpCircle,
  Brain,
} from 'lucide-react';

type TabType = 'overview' | 'concepts' | 'summary' | 'flashcards' | 'quiz' | 'transcript';

export const LectureDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [summary, setSummary] = useState<SummaryData | string | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [processingTranscript, setProcessingTranscript] = useState(false);
  const [processingAI, setProcessingAI] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = useCallback(async () => {
    if (!id) return;
    try {
      const data = await lectureService.getLearningContent(id);
      setLecture(data.lecture as Lecture);
      setConcepts(data.concepts || []);
      setSummary(data.lecture.summary || null);
      setFlashcards(data.flashcards || []);
      setQuizQuestions(data.quiz?.questions || []);
    } catch {
      // Fallback single fetch
      try {
        const l = await lectureService.getLectureById(id);
        setLecture(l);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load lecture details');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleProcessTranscript = async () => {
    if (!id) return;
    setProcessingTranscript(true);
    setError(null);
    try {
      const updated = await lectureService.processLecture(id);
      setLecture(updated);
      await fetchContent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcript processing failed');
      await fetchContent();
    } finally {
      setProcessingTranscript(false);
    }
  };

  const handleProcessAI = async () => {
    if (!id) return;
    setProcessingAI(true);
    setError(null);
    try {
      await lectureService.processAI(id);
      await fetchContent();
      setActiveTab('concepts');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI learning content generation failed');
      await fetchContent();
    } finally {
      setProcessingAI(false);
    }
  };

  const formatDuration = (totalSeconds?: number | null): string => {
    if (!totalSeconds) return 'Unknown';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Loading Lecture & Learning Materials...</p>
        </div>
      </div>
    );
  }

  if (error && !lecture) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-xl mx-auto px-4 py-16 text-center">
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl w-fit mx-auto mb-4 text-rose-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Lecture Unavailable</h2>
          <p className="text-xs text-slate-400 mb-6">{error}</p>
          <Link
            to="/lectures"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Lectures
          </Link>
        </div>
      </div>
    );
  }

  const isTranscriptReady = lecture?.status === 'COMPLETED' || lecture?.status === 'AI_COMPLETED';
  const isAICompleted = lecture?.status === 'AI_COMPLETED' || concepts.length > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            to="/lectures"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Lectures
          </Link>
        </div>

        {/* Header Banner */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 mb-8 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
            <div className="space-y-3 max-w-3xl">
              <div className="flex items-center gap-3">
                {lecture?.status === 'AI_COMPLETED' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Learning Material Ready
                  </span>
                )}
                {lecture?.status === 'AI_PROCESSING' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    LearnLoop is understanding your lecture...
                  </span>
                )}
                {lecture?.status === 'COMPLETED' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Transcript Ready
                  </span>
                )}
                {lecture?.status === 'PENDING' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Clock className="w-3.5 h-3.5" />
                    Ready to process transcript
                  </span>
                )}
                {lecture?.status === 'FAILED' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Processing error
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                {lecture?.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <a
                  href={lecture?.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-rose-400 hover:text-rose-300 transition"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Open on YouTube</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                {lecture?.duration ? (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {formatDuration(lecture.duration)}
                  </span>
                ) : null}

                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  {lecture?.createdAt ? new Date(lecture.createdAt).toLocaleDateString() : ''}
                </span>
              </div>
            </div>

            {/* Trigger AI processing button */}
            <div className="shrink-0 flex items-center gap-3">
              {lecture?.status === 'PENDING' && (
                <button
                  onClick={handleProcessTranscript}
                  disabled={processingTranscript}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition"
                >
                  {processingTranscript ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Extract Transcript</span>
                </button>
              )}

              {isTranscriptReady && (
                <button
                  id="generate-ai-materials-button"
                  onClick={handleProcessAI}
                  disabled={processingAI || lecture?.status === 'AI_PROCESSING'}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition disabled:opacity-50"
                >
                  {processingAI || lecture?.status === 'AI_PROCESSING' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Gemini Processing...</span>
                    </>
                  ) : isAICompleted ? (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Regenerate AI Content</span>
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4" />
                      <span>Generate AI Materials</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* AI Processing Status Banner */}
        {(processingAI || lecture?.status === 'AI_PROCESSING') && (
          <div className="mb-8 p-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
            <h3 className="text-sm font-bold text-white mb-1">LearnLoop is understanding your lecture...</h3>
            <p className="text-xs text-slate-400">Gemini AI is analyzing transcript concepts, generating explanations, flashcards, and quiz questions.</p>
          </div>
        )}

        {/* Tabs Navigation Bar */}
        <div className="flex border-b border-slate-800 mb-8 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 text-xs font-semibold border-b-2 flex items-center gap-2 shrink-0 transition ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brain className="w-4 h-4" /> Overview
          </button>

          <button
            onClick={() => setActiveTab('concepts')}
            className={`px-4 py-3 text-xs font-semibold border-b-2 flex items-center gap-2 shrink-0 transition ${
              activeTab === 'concepts'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Concepts
            {concepts.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
                {concepts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-3 text-xs font-semibold border-b-2 flex items-center gap-2 shrink-0 transition ${
              activeTab === 'summary'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" /> Summary
          </button>

          <button
            onClick={() => setActiveTab('flashcards')}
            className={`px-4 py-3 text-xs font-semibold border-b-2 flex items-center gap-2 shrink-0 transition ${
              activeTab === 'flashcards'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-4 h-4" /> Flashcards
            {flashcards.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
                {flashcards.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('quiz')}
            className={`px-4 py-3 text-xs font-semibold border-b-2 flex items-center gap-2 shrink-0 transition ${
              activeTab === 'quiz'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" /> Quiz
            {quizQuestions.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
                {quizQuestions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('transcript')}
            className={`px-4 py-3 text-xs font-semibold border-b-2 flex items-center gap-2 shrink-0 transition ${
              activeTab === 'transcript'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" /> Transcript
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Overview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="glass-card rounded-2xl p-6 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Extracted Concepts</span>
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                </div>
                <p className="text-2xl font-extrabold text-white">{concepts.length}</p>
                <p className="text-[11px] text-slate-500 mt-1">Key educational topics</p>
              </div>

              <div className="glass-card rounded-2xl p-6 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Flashcards</span>
                  <CreditCard className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-2xl font-extrabold text-white">{flashcards.length}</p>
                <p className="text-[11px] text-slate-500 mt-1">Active recall cards</p>
              </div>

              <div className="glass-card rounded-2xl p-6 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Quiz Questions</span>
                  <HelpCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-2xl font-extrabold text-white">{quizQuestions.length}</p>
                <p className="text-[11px] text-slate-500 mt-1">Multiple choice questions</p>
              </div>
            </div>

            {/* Call to action panel */}
            {!isAICompleted && isTranscriptReady && (
              <div className="glass-card rounded-2xl p-8 border border-indigo-500/20 text-center bg-gradient-to-br from-indigo-950/20 to-purple-950/20">
                <Sparkles className="w-10 h-10 text-indigo-400 mx-auto mb-3 animate-bounce" />
                <h3 className="text-base font-bold text-white mb-2">Ready for Gemini AI Transformation</h3>
                <p className="text-xs text-slate-400 max-w-lg mx-auto mb-6">
                  Transform this lecture transcript into structured learning concepts, active-recall flashcards, and a 4-option quiz.
                </p>
                <button
                  onClick={handleProcessAI}
                  disabled={processingAI}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-xl shadow-indigo-600/30 inline-flex items-center gap-2 transition"
                >
                  <Brain className="w-4 h-4" /> Start AI Learning Generation
                </button>
              </div>
            )}

            {/* Quick CTA if AI completed */}
            {isAICompleted && (
              <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Your learning materials are ready!</h3>
                  <p className="text-xs text-slate-400">Explore concepts, study flashcards, or test your knowledge with the quiz.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveTab('concepts')}
                    className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-500 transition"
                  >
                    Explore Concepts
                  </button>
                  <button
                    onClick={() => setActiveTab('quiz')}
                    className="px-4 py-2 bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-700 transition"
                  >
                    Take Quiz
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'concepts' && <ConceptsTab concepts={concepts} />}
        {activeTab === 'summary' && <SummaryTab summary={summary} />}
        {activeTab === 'flashcards' && <FlashcardsTab flashcards={flashcards} />}
        {activeTab === 'quiz' && <QuizTab questions={quizQuestions} lectureId={id} />}
        {activeTab === 'transcript' && (
          <TranscriptViewer
            transcript={lecture?.transcript || ''}
            segments={lecture?.transcriptSegments}
            youtubeUrl={lecture?.youtubeUrl}
          />
        )}
      </main>
    </div>
  );
};

export default LectureDetail;
