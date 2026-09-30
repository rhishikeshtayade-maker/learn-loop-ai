import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  KnowledgeGraphNode,
  KnowledgeGraphEdge,
  KnowledgeGap,
  ConceptExploration,
} from '../../types/lecture';
import { lectureService } from '../../services/lecture.service';
import {
  X,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  BookOpen,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  Clock,
  ChevronRight,
  Loader2,
  Zap,
} from 'lucide-react';

interface ConceptDetailPanelProps {
  node: KnowledgeGraphNode | null;
  allNodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  knowledgeGaps: KnowledgeGap[];
  lectureId: string;
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
}

export const ConceptDetailPanel: React.FC<ConceptDetailPanelProps> = ({
  node,
  allNodes,
  edges,
  knowledgeGaps,
  lectureId,
  onClose,
  onSelectNode,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'explanations' | 'discovery'>('overview');
  const [exploration, setExploration] = useState<ConceptExploration | null>(null);
  const [loadingExploration, setLoadingExploration] = useState(false);
  const [explorationError, setExplorationError] = useState<string | null>(null);

  if (!node) return null;

  // Connected edges
  const incomingEdges = edges.filter((e) => e.target === node.id);
  const outgoingEdges = edges.filter((e) => e.source === node.id);

  // Group incoming and outgoing
  const prerequisites = incomingEdges.filter((e) => e.relationshipType === 'PREREQUISITE');
  const leadsTo = outgoingEdges.filter((e) => e.relationshipType === 'LEADS_TO' || e.relationshipType === 'PREREQUISITE');
  const relatedEdges = edges.filter(
    (e) =>
      e.relationshipType === 'RELATED_TO' && (e.source === node.id || e.target === node.id)
  );
  const applications = outgoingEdges.filter((e) => e.relationshipType === 'APPLICATION_OF');
  const partOf = outgoingEdges.filter((e) => e.relationshipType === 'PART_OF');

  // Find knowledge gaps where this node is either the weak prerequisite or the hindered concept
  const relevantGaps = knowledgeGaps.filter(
    (g) => g.sourceConceptId === node.id || g.targetConceptId === node.id
  );

  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

  const getMasteryColor = (status: string) => {
    switch (status) {
      case 'strong':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'developing':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'weak':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const handleExploreFurther = async () => {
    if (exploration) {
      setActiveTab('discovery');
      return;
    }

    setLoadingExploration(true);
    setExplorationError(null);
    setActiveTab('discovery');

    try {
      const res = await lectureService.exploreConcept(lectureId, node.id);
      if (res && res.success && res.exploration) {
        setExploration(res.exploration);
      } else {
        setExplorationError('Could not load AI discovery details');
      }
    } catch (err: any) {
      setExplorationError(err?.message || 'Failed to generate discovery data');
    } finally {
      setLoadingExploration(false);
    }
  };

  const handleReviseNow = (_conceptId?: string) => {
    // Navigate to quiz tab to practice and improve mastery
    navigate(`/lecture/${lectureId}?tab=quiz`);
  };

  return (
    <aside className="w-full lg:w-96 glass-panel border border-slate-800 rounded-3xl flex flex-col h-full overflow-hidden shadow-2xl animate-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-start justify-between gap-3 bg-slate-900/60 backdrop-blur-md">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${getMasteryColor(
                node.masteryStatus
              )}`}
            >
              {node.masteryStatus.toUpperCase()}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              {node.importance} Priority
            </span>
          </div>
          <h2 className="text-base font-bold text-white leading-tight truncate" title={node.name}>
            {node.name}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
          aria-label="Close detail panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Mastery Score Banner */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900/90 to-slate-900/50 border-b border-slate-800/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-800/90 border border-slate-700/60 flex items-center justify-center font-black text-xs text-white">
            {node.masteryStatus === 'untested' ? '—' : `${Math.round(node.masteryScore)}%`}
          </div>
          <div>
            <p className="text-xs font-bold text-white">
              {node.masteryStatus === 'untested'
                ? 'Untested Concept'
                : node.masteryStatus === 'strong'
                ? 'Strong Mastery'
                : node.masteryStatus === 'developing'
                ? 'Developing Understanding'
                : 'Needs Revision'}
            </p>
            <p className="text-[10px] text-slate-400">
              {node.attemptsCount > 0 ? `${node.attemptsCount} questions evaluated` : 'Take quiz to evaluate'}
            </p>
          </div>
        </div>

        {node.masteryStatus === 'weak' && (
          <button
            onClick={() => handleReviseNow(node.id)}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] rounded-lg transition inline-flex items-center gap-1 shadow-sm shadow-rose-600/20"
          >
            <Zap className="w-3 h-3" />
            Revise
          </button>
        )}
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-800/80 px-2 bg-slate-950/40 text-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2.5 font-semibold text-center border-b-2 transition ${
            activeTab === 'overview'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Relationships
        </button>
        <button
          onClick={() => setActiveTab('explanations')}
          className={`flex-1 py-2.5 font-semibold text-center border-b-2 transition ${
            activeTab === 'explanations'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Details
        </button>
        <button
          onClick={handleExploreFurther}
          className={`flex-1 py-2.5 font-semibold text-center border-b-2 transition inline-flex items-center justify-center gap-1.5 ${
            activeTab === 'discovery'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-purple-300'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI Explore
        </button>
      </div>

      {/* Panel Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
        {activeTab === 'overview' && (
          <>
            {/* Knowledge Gap Alerts */}
            {relevantGaps.length > 0 && (
              <div className="space-y-3">
                {relevantGaps.map((gap, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-950/40 to-slate-900/80 border border-rose-500/40 space-y-2 shadow-lg"
                  >
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>Knowledge Gap Detected</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">{gap.reason}</p>
                    <div className="pt-1 flex items-center justify-between">
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Est: {gap.recommendedAction.estimatedMinutes} min</span>
                      </div>
                      <button
                        onClick={() => handleReviseNow(gap.recommendedAction.conceptId)}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] rounded-lg shadow-sm transition inline-flex items-center gap-1"
                      >
                        <span>Revise {gap.recommendedAction.conceptName}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Why This Matters */}
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-[11px] uppercase tracking-wider">
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Why This Matters</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {node.keyTakeaway || node.simpleExplanation || node.description}
              </p>
            </div>

            {/* Prerequisites */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Prerequisites (Learn First):
              </span>
              {prerequisites.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">
                  No foundational prerequisites identified for this concept in this lecture.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {prerequisites.map((edge) => {
                    const src = nodeMap.get(edge.source);
                    if (!src) return null;
                    return (
                      <button
                        key={edge.id}
                        type="button"
                        onClick={() => onSelectNode(src.id)}
                        className="w-full text-left p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 transition flex items-center justify-between group"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="font-semibold text-slate-200 group-hover:text-indigo-300 transition truncate">
                            {src.name}
                          </p>
                          {edge.description && (
                            <p className="text-[10px] text-slate-500 truncate">{edge.description}</p>
                          )}
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 border ${getMasteryColor(
                            src.masteryStatus
                          )}`}
                        >
                          {src.masteryStatus === 'untested' ? 'Untested' : `${Math.round(src.masteryScore)}%`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Leads To / Unlocks */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Leads To (Unlocks Next):
              </span>
              {leadsTo.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">
                  Terminal or apex topic in this lecture.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {leadsTo.map((edge) => {
                    const tgt = nodeMap.get(edge.target);
                    if (!tgt) return null;
                    return (
                      <button
                        key={edge.id}
                        type="button"
                        onClick={() => onSelectNode(tgt.id)}
                        className="w-full text-left p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-purple-500/40 transition flex items-center justify-between group"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="font-semibold text-slate-200 group-hover:text-purple-300 transition truncate">
                            {tgt.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {edge.relationshipType === 'PREREQUISITE' ? 'Depends on this concept' : 'Transitions to'}
                          </p>
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 border ${getMasteryColor(
                            tgt.masteryStatus
                          )}`}
                        >
                          {tgt.masteryStatus === 'untested' ? 'Untested' : `${Math.round(tgt.masteryScore)}%`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Related Concepts */}
            {relatedEdges.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Related Concepts:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {relatedEdges.map((edge) => {
                    const otherId = edge.source === node.id ? edge.target : edge.source;
                    const other = nodeMap.get(otherId);
                    if (!other) return null;
                    return (
                      <button
                        key={edge.id}
                        onClick={() => onSelectNode(other.id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[11px] font-medium transition inline-flex items-center gap-1"
                      >
                        <span>{other.name}</span>
                        <ChevronRight className="w-3 h-3 text-slate-500" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Applications */}
            {applications.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Applications:
                </span>
                <div className="space-y-1.5">
                  {applications.map((edge) => {
                    const tgt = nodeMap.get(edge.target);
                    if (!tgt) return null;
                    return (
                      <button
                        key={edge.id}
                        type="button"
                        onClick={() => onSelectNode(tgt.id)}
                        className="w-full text-left p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 transition flex items-center justify-between"
                      >
                        <p className="font-semibold text-slate-200 text-[11px] truncate">{tgt.name}</p>
                        <span className="text-[10px] text-slate-500">Application</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Component / Part of */}
            {partOf.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Part Of:
                </span>
                <div className="space-y-1.5">
                  {partOf.map((edge) => {
                    const tgt = nodeMap.get(edge.target);
                    if (!tgt) return null;
                    return (
                      <button
                        key={edge.id}
                        type="button"
                        onClick={() => onSelectNode(tgt.id)}
                        className="w-full text-left p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 transition flex items-center justify-between"
                      >
                        <p className="font-semibold text-slate-200 text-[11px] truncate">{tgt.name}</p>
                        <span className="text-[10px] text-slate-500">Parent Concept</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Detailed Explanations Tab */}
        {activeTab === 'explanations' && (
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Summary
              </span>
              <p className="text-slate-300 leading-relaxed">{node.description}</p>
            </div>

            {node.detailedExplanation && (
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                  Detailed Explanation
                </span>
                <p className="text-slate-300 leading-relaxed text-[11px]">{node.detailedExplanation}</p>
              </div>
            )}

            {node.example && (
              <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                  Practical Example
                </span>
                <p className="text-slate-300 leading-relaxed text-[11px]">{node.example}</p>
              </div>
            )}

            {node.commonMisconception && (
              <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1.5">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  Common Misconception
                </span>
                <p className="text-slate-300 leading-relaxed text-[11px]">{node.commonMisconception}</p>
              </div>
            )}
          </div>
        )}

        {/* AI Discovery Tab */}
        {activeTab === 'discovery' && (
          <div className="space-y-4">
            {loadingExploration ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400 mx-auto" />
                <p className="text-xs font-semibold">Gemini is synthesizing conceptual insights...</p>
                <p className="text-[10px] text-slate-500">Uncovering cross-domain relationships</p>
              </div>
            ) : explorationError ? (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center space-y-2">
                <p>{explorationError}</p>
                <button
                  onClick={handleExploreFurther}
                  className="px-3 py-1 bg-slate-800 text-white rounded-lg text-[11px]"
                >
                  Retry Discovery
                </button>
              </div>
            ) : exploration ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                {/* Summary */}
                <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-1">
                  <div className="flex items-center gap-1.5 text-purple-300 font-bold text-[11px]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Intuition Summary</span>
                  </div>
                  <p className="text-slate-200 text-[11px] leading-relaxed">{exploration.summary}</p>
                </div>

                {/* Real-world applications */}
                {exploration.realWorldApplications?.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Real-World Applications:
                    </span>
                    <ul className="space-y-1 text-[11px] text-slate-300">
                      {exploration.realWorldApplications.map((app, idx) => (
                        <li key={idx} className="flex items-start gap-2 bg-slate-900/50 p-2 rounded-xl border border-slate-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{app}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggested Questions */}
                {exploration.suggestedQuestions?.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Questions to Test Your Intuition:
                    </span>
                    <ul className="space-y-1.5 text-[11px] text-slate-300">
                      {exploration.suggestedQuestions.map((q, idx) => (
                        <li key={idx} className="flex items-start gap-2 bg-slate-900/70 p-2.5 rounded-xl border border-slate-800">
                          <HelpCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Key Insights */}
                {exploration.keyInsights?.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Deep Insights:
                    </span>
                    <div className="space-y-1 text-[11px] text-slate-300">
                      {exploration.keyInsights.map((insight, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/60">
                          💡 {insight}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Footer Quick Action */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/40 flex items-center justify-between gap-3">
        <button
          onClick={() => handleReviseNow(node.id)}
          className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 inline-flex items-center justify-center gap-1.5 transition"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Practice in Quiz</span>
        </button>
      </div>
    </aside>
  );
};
