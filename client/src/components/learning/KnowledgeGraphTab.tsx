import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type {
  KnowledgeGraphData,
  KnowledgeGraphNode,
  KnowledgeGraphEdge,
} from '../../types/lecture';
import { lectureService } from '../../services/lecture.service';
import { ConceptDetailPanel } from './ConceptDetailPanel';
import {
  Network,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ArrowRight,
  GitBranch,
} from 'lucide-react';

interface KnowledgeGraphTabProps {
  lectureId: string;
}

interface NodePosition {
  x: number;
  y: number;
}

export const KnowledgeGraphTab: React.FC<KnowledgeGraphTabProps> = ({ lectureId }) => {
  const [data, setData] = useState<KnowledgeGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'prereq' | 'gaps' | 'weak'>('all');

  // Canvas pan & zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Node drag state
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>({});
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [nodeDragOffset, setNodeDragOffset] = useState({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Hierarchical Floating Tree Diagram Layout
  const initializeLayout = useCallback((nodes: KnowledgeGraphNode[], edges: KnowledgeGraphEdge[]) => {
    const positions: Record<string, NodePosition> = {};
    const count = nodes.length;
    if (count === 0) return;

    // 1. Calculate incoming prerequisite / hierarchy in-degree
    const inDegree: Record<string, number> = {};
    const childrenMap: Record<string, string[]> = {};
    const parentsMap: Record<string, string[]> = {};

    nodes.forEach((n) => {
      inDegree[n.id] = 0;
      childrenMap[n.id] = [];
      parentsMap[n.id] = [];
    });

    edges.forEach((e) => {
      // Directed tree hierarchy: PREREQUISITE (source -> target), LEADS_TO (source -> target), PART_OF (target -> source or source -> target)
      if (e.relationshipType === 'PREREQUISITE' || e.relationshipType === 'LEADS_TO') {
        inDegree[e.target] = (inDegree[e.target] || 0) + 1;
        childrenMap[e.source]?.push(e.target);
        parentsMap[e.target]?.push(e.source);
      } else if (e.relationshipType === 'PART_OF') {
        inDegree[e.source] = (inDegree[e.source] || 0) + 1;
        childrenMap[e.target]?.push(e.source);
        parentsMap[e.source]?.push(e.target);
      }
    });

    // 2. Identify roots and calculate level depths
    const nodeLevels: Record<string, number> = {};
    const roots = nodes.filter((n) => inDegree[n.id] === 0);

    // Nodes that have outgoing edges are primary tree roots
    const activeRoots = roots.filter((r) => (childrenMap[r.id] || []).length > 0);
    // Nodes that have no edges at all (isolated)
    const isolatedNodes = roots.filter((r) => (childrenMap[r.id] || []).length === 0);

    const queue: Array<{ id: string; level: number }> = [];
    const visited = new Set<string>();

    if (activeRoots.length > 0) {
      activeRoots.forEach((r) => {
        nodeLevels[r.id] = 0;
        visited.add(r.id);
        queue.push({ id: r.id, level: 0 });
      });
    } else if (roots.length > 0) {
      roots.forEach((r) => {
        nodeLevels[r.id] = 0;
        visited.add(r.id);
        queue.push({ id: r.id, level: 0 });
      });
    } else if (nodes.length > 0) {
      // Cycle fallback: start from node 0
      nodeLevels[nodes[0].id] = 0;
      visited.add(nodes[0].id);
      queue.push({ id: nodes[0].id, level: 0 });
    }

    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      const children = childrenMap[id] || [];
      for (const childId of children) {
        const nextLevel = level + 1;
        if (!visited.has(childId)) {
          visited.add(childId);
          nodeLevels[childId] = nextLevel;
          queue.push({ id: childId, level: nextLevel });
        } else {
          // If already visited, keep deepest level to respect prerequisites
          if (nextLevel > (nodeLevels[childId] || 0)) {
            nodeLevels[childId] = nextLevel;
            queue.push({ id: childId, level: nextLevel });
          }
        }
      }
    }

    // Place remaining unvisited nodes
    isolatedNodes.forEach((n, idx) => {
      if (!visited.has(n.id)) {
        nodeLevels[n.id] = idx % 2 === 0 ? 0 : 1;
      }
    });

    nodes.forEach((n) => {
      if (nodeLevels[n.id] === undefined) {
        nodeLevels[n.id] = 0;
      }
    });

    // 3. Group nodes by level
    const levels: Record<number, KnowledgeGraphNode[]> = {};
    nodes.forEach((n) => {
      const lvl = nodeLevels[n.id];
      if (!levels[lvl]) levels[lvl] = [];
      levels[lvl].push(n);
    });

    // 4. Calculate spacious floating positions
    const cardWidth = 220;
    const cardGapX = 50;
    const levelSpacingY = 165;
    const canvasCenterX = 520;
    const startY = 80;

    const sortedLevelKeys = Object.keys(levels)
      .map(Number)
      .sort((a, b) => a - b);

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    sortedLevelKeys.forEach((lvl) => {
      const levelNodes = levels[lvl];
      const countInLevel = levelNodes.length;

      // If count is very wide (e.g. > 4), stagger into 2 sub-rows for a balanced tree appearance
      const maxPerRow = 4;
      const isMultiRow = countInLevel > maxPerRow;

      levelNodes.forEach((node, idx) => {
        let rowInLevel = 0;
        let colInLevel = idx;
        let rowCount = countInLevel;

        if (isMultiRow) {
          rowInLevel = Math.floor(idx / 3);
          colInLevel = idx % 3;
          rowCount = Math.min(3, countInLevel - rowInLevel * 3);
        }

        const totalRowWidth = rowCount * cardWidth + (rowCount - 1) * cardGapX;
        const rowStartX = canvasCenterX - totalRowWidth / 2 + cardWidth / 2;

        const posX = rowStartX + colInLevel * (cardWidth + cardGapX);
        const posY =
          startY + lvl * levelSpacingY + rowInLevel * 105 + (idx % 2 === 1 ? 10 : -10);

        positions[node.id] = { x: posX, y: posY };

        minX = Math.min(minX, posX - cardWidth / 2);
        maxX = Math.max(maxX, posX + cardWidth / 2);
        minY = Math.min(minY, posY - 40);
        maxY = Math.max(maxY, posY + 40);
      });
    });

    setNodePositions(positions);

    // Auto-fit tree nicely in view
    if (minX !== Infinity && maxX !== -Infinity) {
      const treeWidth = maxX - minX;
      const treeHeight = maxY - minY;
      const viewWidth = 920;
      const viewHeight = 580;

      const fitZoom = Math.min(
        1.0,
        Math.max(0.6, Math.min(viewWidth / (treeWidth + 120), viewHeight / (treeHeight + 100)))
      );
      const fitPanX = (viewWidth - (minX + maxX) * fitZoom) / 2;
      const fitPanY = 40;

      setZoom(fitZoom);
      setPan({ x: fitPanX, y: fitPanY });
    }
  }, []);

  const fetchGraphData = useCallback(async () => {
    if (!lectureId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await lectureService.getKnowledgeGraph(lectureId);
      if (res && res.success) {
        setData(res);
        if (res.nodes.length > 0) {
          initializeLayout(res.nodes, res.edges);
        }
      } else {
        setError('Failed to load knowledge graph.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load knowledge graph.');
    } finally {
      setLoading(false);
    }
  }, [lectureId, initializeLayout]);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  // Zoom handlers
  const handleZoomIn = () => setZoom((z) => Math.min(2.5, z + 0.15));
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, z - 0.15));
  const handleResetZoom = () => {
    if (data && data.nodes.length > 0) {
      initializeLayout(data.nodes, data.edges);
    } else {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  };

  // Canvas mouse interaction (Pan & Drag)
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target === svgRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    } else if (draggingNodeId && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const svgX = (e.clientX - rect.left - pan.x) / zoom;
      const svgY = (e.clientY - rect.top - pan.y) / zoom;
      setNodePositions((prev) => ({
        ...prev,
        [draggingNodeId]: {
          x: svgX - nodeDragOffset.x,
          y: svgY - nodeDragOffset.y,
        },
      }));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((z) => Math.min(2.5, Math.max(0.4, z * zoomFactor)));
  };

  // Node Drag start
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const pos = nodePositions[nodeId] || { x: 0, y: 0 };
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseSvgX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseSvgY = (e.clientY - rect.top - pan.y) / zoom;

    setDraggingNodeId(nodeId);
    setNodeDragOffset({
      x: mouseSvgX - pos.x,
      y: mouseSvgY - pos.y,
    });
  };

  // Filtered nodes and edges
  const filteredData = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };

    let nodes = data.nodes;
    let edges = data.edges;

    if (filterMode === 'prereq') {
      edges = edges.filter((e) => e.relationshipType === 'PREREQUISITE');
      const activeIds = new Set(edges.flatMap((e) => [e.source, e.target]));
      nodes = nodes.filter((n) => activeIds.has(n.id));
    } else if (filterMode === 'gaps') {
      const gapConceptIds = new Set(
        data.knowledgeGaps.flatMap((g) => [g.sourceConceptId, g.targetConceptId])
      );
      nodes = nodes.filter((n) => gapConceptIds.has(n.id));
      edges = edges.filter(
        (e) => gapConceptIds.has(e.source) && gapConceptIds.has(e.target)
      );
    } else if (filterMode === 'weak') {
      const weakIds = new Set(nodes.filter((n) => n.masteryStatus === 'weak').map((n) => n.id));
      nodes = nodes.filter((n) => weakIds.has(n.id));
      edges = edges.filter((e) => weakIds.has(e.source) || weakIds.has(e.target));
    }

    return { nodes, edges };
  }, [data, filterMode]);

  const selectedNode = useMemo(() => {
    if (!data || !selectedNodeId) return null;
    return data.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [data, selectedNodeId]);

  // Set of connected nodes for highlighting
  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId || !data) return new Set<string>();
    const set = new Set<string>([selectedNodeId]);
    data.edges.forEach((e) => {
      if (e.source === selectedNodeId) set.add(e.target);
      if (e.target === selectedNodeId) set.add(e.source);
    });
    return set;
  }, [selectedNodeId, data]);

  // Knowledge gap source concepts for pulsing border
  const gapSourceIds = useMemo(() => {
    if (!data) return new Set<string>();
    return new Set(data.knowledgeGaps.map((g) => g.sourceConceptId));
  }, [data]);

  // Status color helper
  const getNodeBorderColor = (status: string, isSelected: boolean, isGap: boolean) => {
    if (isGap) return '#f43f5e'; // Rose
    if (isSelected) return '#818cf8'; // Indigo
    switch (status) {
      case 'strong':
        return '#10b981'; // Emerald
      case 'developing':
        return '#f59e0b'; // Amber
      case 'weak':
        return '#f43f5e'; // Rose
      default:
        return '#475569'; // Slate
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-16 text-center border border-slate-800 space-y-4 max-w-xl mx-auto my-8">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-400 mx-auto" />
        <h3 className="text-base font-bold text-white">Synthesizing Knowledge Tree...</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Gemini is analyzing prerequisite branches, hierarchical relationships, and knowledge gaps from this lecture.
        </p>
      </div>
    );
  }

  // 2. Error State
  if (error || !data) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center border border-rose-500/20 max-w-lg mx-auto my-8 space-y-4">
        <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
        <h3 className="text-base font-bold text-white">Knowledge Tree Unavailable</h3>
        <p className="text-xs text-slate-400">{error || 'Could not load tree diagram for this lecture.'}</p>
        <button
          onClick={fetchGraphData}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition inline-flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry Loading Tree
        </button>
      </div>
    );
  }

  // 3. Empty State: No concepts
  if (data.nodes.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center border border-slate-800 max-w-lg mx-auto my-8 space-y-3">
        <Network className="w-10 h-10 text-slate-500 mx-auto mb-2" />
        <h3 className="text-base font-bold text-white">No Concepts Extracted Yet</h3>
        <p className="text-xs text-slate-400">
          Process this lecture with AI to extract concepts and generate your interactive floating tree diagram.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Banner & Stats Summary */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Knowledge Discovery Tree
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Floating 2D Diagram
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Hierarchical floating tree of lecture concepts, prerequisite branches, and knowledge gaps.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5">
            <span className="text-white font-bold">{data.stats.totalConcepts}</span> Concepts
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5">
            <span className="text-white font-bold">{data.stats.totalRelationships}</span> Branch Links
          </div>
          {data.stats.knowledgeGapCount > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1.5 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>{data.stats.knowledgeGapCount} Knowledge Gap{data.stats.knowledgeGapCount > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* Knowledge Gap Alert Callout (If Gaps Detected) */}
      {data.knowledgeGaps.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/30 via-slate-900/60 to-slate-900/40 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                Knowledge Gap Detected
                <span className="text-[10px] font-bold text-rose-400">Action Recommended</span>
              </h4>
              <p className="text-[11px] text-slate-300">
                {data.knowledgeGaps[0].reason}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedNodeId(data.knowledgeGaps[0].sourceConceptId);
            }}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition inline-flex items-center justify-center gap-1.5 shrink-0"
          >
            <span>Inspect Gap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Tree Diagram Area + Detail Panel */}
      <div className="relative flex flex-col lg:flex-row gap-4 h-[670px] w-full">
        {/* SVG Interactive Canvas Container */}
        <div className="relative flex-1 glass-panel border border-slate-800 rounded-3xl overflow-hidden bg-slate-950/70 shadow-inner flex flex-col">
          {/* Controls & Filter Bar */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-xl">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-xl transition ${
                filterMode === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Concepts
            </button>
            <button
              onClick={() => setFilterMode('prereq')}
              className={`px-3 py-1 text-xs font-semibold rounded-xl transition ${
                filterMode === 'prereq'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Prerequisites
            </button>
            {data.knowledgeGaps.length > 0 && (
              <button
                onClick={() => setFilterMode('gaps')}
                className={`px-3 py-1 text-xs font-semibold rounded-xl transition ${
                  filterMode === 'gaps'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-rose-400 hover:text-rose-300'
                }`}
              >
                Gaps ({data.knowledgeGaps.length})
              </button>
            )}
            <button
              onClick={() => setFilterMode('weak')}
              className={`px-3 py-1 text-xs font-semibold rounded-xl transition ${
                filterMode === 'weak'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Weak ({data.stats.weakCount})
            </button>
          </div>

          {/* Zoom & View Controls */}
          <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-xl">
            <button
              onClick={handleZoomIn}
              title="Zoom In"
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              title="Zoom Out"
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              title="Center & Reset View"
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Legend Bottom Left */}
          <div className="absolute bottom-4 left-4 z-20 hidden sm:flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-800 text-[11px] text-slate-300 shadow-lg">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span>Strong (≥71%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span>Developing</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
              <span>Weak (≤40%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
              <span>Untested</span>
            </div>
          </div>

          {/* SVG Canvas */}
          <svg
            ref={svgRef}
            className="w-full h-full cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
          >
            <defs>
              {/* Floating Tree Diagram CSS animations */}
              <style>{`
                @keyframes floatCard1 {
                  0%, 100% { transform: translateY(0px); }
                  50% { transform: translateY(-7px); }
                }
                @keyframes floatCard2 {
                  0%, 100% { transform: translateY(0px); }
                  50% { transform: translateY(6px); }
                }
                @keyframes floatCard3 {
                  0%, 100% { transform: translateY(0px); }
                  50% { transform: translateY(-5px); }
                }
                .floating-card-0 {
                  animation: floatCard1 5.2s ease-in-out infinite;
                }
                .floating-card-1 {
                  animation: floatCard2 6.4s ease-in-out infinite;
                }
                .floating-card-2 {
                  animation: floatCard3 5.8s ease-in-out infinite;
                }
              `}</style>

              {/* Card Gradients */}
              <linearGradient id="card-bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0f172a" stopOpacity="0.94" />
                <stop offset="100%" stopColor="#1e293b" stopOpacity="0.94" />
              </linearGradient>

              <linearGradient id="card-bg-selected" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.96" />
                <stop offset="100%" stopColor="#312e81" stopOpacity="0.96" />
              </linearGradient>

              <linearGradient id="card-bg-gap" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4c0519" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#1e293b" stopOpacity="0.95" />
              </linearGradient>

              {/* Drop Shadow filter for floating cards */}
              <filter id="card-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#020617" floodOpacity="0.6" />
              </filter>

              {/* Arrow markers for tree branches */}
              <marker
                id="arrow-default"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#475569" />
              </marker>
              <marker
                id="arrow-prereq"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#6366f1" />
              </marker>
              <marker
                id="arrow-leads"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#38bdf8" />
              </marker>
              <marker
                id="arrow-gap"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="8"
                markerHeight="8"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f43f5e" />
              </marker>
              <marker
                id="arrow-active"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="8"
                markerHeight="8"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#c084fc" />
              </marker>

              {/* Grid pattern background */}
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
              </pattern>
            </defs>

            {/* Background Grid */}
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Viewport Transform Group */}
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* TREE BRANCH EDGES */}
              {filteredData.edges.map((edge) => {
                const srcPos = nodePositions[edge.source];
                const tgtPos = nodePositions[edge.target];
                if (!srcPos || !tgtPos) return null;

                const isConnected =
                  selectedNodeId &&
                  (edge.source === selectedNodeId || edge.target === selectedNodeId);
                const isPrereq = edge.relationshipType === 'PREREQUISITE';
                const isGapEdge =
                  gapSourceIds.has(edge.source) && edge.relationshipType === 'PREREQUISITE';

                // Connecting anchors: bottom of parent card, top of child card
                const CARD_H_HALF = 38;
                const startX = srcPos.x;
                const startY = srcPos.y + CARD_H_HALF;
                const endX = tgtPos.x;
                const endY = tgtPos.y - CARD_H_HALF;

                let pathD = '';
                let midLabelX = (startX + endX) / 2;
                let midLabelY = (startY + endY) / 2;

                if (endY > startY + 15) {
                  // Standard downward tree branch: smooth vertical cubic bezier
                  const deltaY = endY - startY;
                  const c1x = startX;
                  const c1y = startY + deltaY * 0.45;
                  const c2x = endX;
                  const c2y = endY - deltaY * 0.45;
                  pathD = `M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`;
                  midLabelX = (c1x + c2x) / 2;
                  midLabelY = (c1y + c2y) / 2;
                } else {
                  // Cross-link or horizontal connection
                  const archOffset = Math.abs(endX - startX) > 100 ? 50 : 35;
                  const midX = (startX + endX) / 2;
                  const midY = Math.min(srcPos.y, tgtPos.y) - archOffset;
                  pathD = `M ${srcPos.x} ${srcPos.y - CARD_H_HALF} Q ${midX} ${midY} ${tgtPos.x} ${tgtPos.y - CARD_H_HALF}`;
                  midLabelX = midX;
                  midLabelY = midY;
                }

                let strokeColor = '#334155'; // Slate-700
                let strokeWidth = 2;
                let strokeDash: string | undefined = undefined;
                let markerId = 'url(#arrow-default)';

                if (isGapEdge) {
                  strokeColor = '#f43f5e';
                  strokeWidth = 2.5;
                  strokeDash = '6,4';
                  markerId = 'url(#arrow-gap)';
                } else if (isConnected) {
                  strokeColor = '#a855f7'; // Purple-500
                  strokeWidth = 3;
                  markerId = 'url(#arrow-active)';
                } else if (isPrereq) {
                  strokeColor = '#6366f1'; // Indigo-500
                  strokeWidth = 2.2;
                  markerId = 'url(#arrow-prereq)';
                } else if (edge.relationshipType === 'LEADS_TO') {
                  strokeColor = '#38bdf8'; // Sky-400
                  strokeWidth = 2;
                  markerId = 'url(#arrow-leads)';
                }

                return (
                  <g key={edge.id} className="transition-all duration-300">
                    {/* Background branch glow for active/prerequisite branches */}
                    {(isConnected || isGapEdge || isPrereq) && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth + 4}
                        strokeOpacity="0.25"
                        strokeLinecap="round"
                      />
                    )}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={strokeDash}
                      strokeLinecap="round"
                      markerEnd={markerId}
                      opacity={selectedNodeId && !isConnected ? 0.2 : 0.85}
                    />
                    {/* Midpoint relationship badge pill */}
                    <g transform={`translate(${midLabelX}, ${midLabelY})`} className="pointer-events-none">
                      <rect
                        x="-36"
                        y="-9"
                        width="72"
                        height="18"
                        rx="9"
                        fill="#090d16"
                        stroke={isGapEdge ? '#f43f5e' : isConnected ? '#c084fc' : '#1e293b'}
                        strokeWidth="1"
                        opacity={selectedNodeId && !isConnected ? 0.3 : 0.95}
                      />
                      <text
                        y="3.5"
                        textAnchor="middle"
                        fill={isGapEdge ? '#fb7185' : isConnected ? '#e9d5ff' : '#94a3b8'}
                        fontSize="8.5"
                        fontWeight="700"
                        letterSpacing="0.4"
                      >
                        {edge.relationshipType.replace('_', ' ')}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* FLOATING TREE NODE CARDS */}
              {filteredData.nodes.map((node, nodeIdx) => {
                const pos = nodePositions[node.id] || { x: 400, y: 300 };
                const isSelected = selectedNodeId === node.id;
                const isConnected = connectedNodeIds.has(node.id);
                const isKnowledgeGapSource = gapSourceIds.has(node.id);
                const isDragging = draggingNodeId === node.id;

                const borderColor = getNodeBorderColor(
                  node.masteryStatus,
                  isSelected,
                  isKnowledgeGapSource
                );

                const opacity = selectedNodeId && !isConnected ? 0.35 : 1.0;
                const floatClass = isDragging ? '' : `floating-card-${nodeIdx % 3}`;

                // Mastery score display
                const masteryText =
                  node.masteryStatus === 'untested'
                    ? 'Untested'
                    : `${Math.round(node.masteryScore)}% Mastery`;

                const masteryDotColor =
                  node.masteryStatus === 'strong'
                    ? '#10b981'
                    : node.masteryStatus === 'developing'
                    ? '#f59e0b'
                    : node.masteryStatus === 'weak'
                    ? '#f43f5e'
                    : '#64748b';

                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    className="cursor-pointer select-none"
                    style={{ opacity }}
                    onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNodeId(node.id);
                    }}
                  >
                    <g className={floatClass}>
                      {/* Outer Glow when selected or knowledge gap */}
                      {isSelected && (
                        <rect
                          x="-114"
                          y="-42"
                          width="228"
                          height="84"
                          rx="20"
                          fill="none"
                          stroke="#818cf8"
                          strokeWidth="2"
                          strokeOpacity="0.5"
                          className="animate-pulse"
                        />
                      )}
                      {isKnowledgeGapSource && (
                        <rect
                          x="-114"
                          y="-42"
                          width="228"
                          height="84"
                          rx="20"
                          fill="none"
                          stroke="#f43f5e"
                          strokeWidth="2"
                          strokeOpacity="0.6"
                          className="animate-ping"
                        />
                      )}

                      {/* Main Floating Glass Card Background */}
                      <rect
                        x="-110"
                        y="-38"
                        width="220"
                        height="76"
                        rx="16"
                        fill={
                          isSelected
                            ? 'url(#card-bg-selected)'
                            : isKnowledgeGapSource
                            ? 'url(#card-bg-gap)'
                            : 'url(#card-bg-gradient)'
                        }
                        stroke={borderColor}
                        strokeWidth={isSelected ? 2.5 : isKnowledgeGapSource ? 2 : 1.5}
                        filter="url(#card-shadow)"
                        className="transition-colors duration-200"
                      />

                      {/* Top Header Row: Importance Badge + Mastery Status */}
                      <g transform="translate(-98, -18)">
                        {/* Importance / Category Pill */}
                        <rect
                          x="0"
                          y="-4"
                          width="52"
                          height="16"
                          rx="8"
                          fill="rgba(99, 102, 241, 0.15)"
                          stroke="rgba(129, 140, 248, 0.3)"
                          strokeWidth="0.8"
                        />
                        <text
                          x="26"
                          y="7.5"
                          fill="#a5b4fc"
                          fontSize="8.5"
                          fontWeight="700"
                          textAnchor="middle"
                          letterSpacing="0.4"
                        >
                          {node.importance || 'CORE'}
                        </text>

                        {/* Mastery Status Pill */}
                        <g transform="translate(62, -2)">
                          <circle cx="4" cy="5.5" r="3" fill={masteryDotColor} />
                          <text
                            x="12"
                            y="9"
                            fill={masteryDotColor}
                            fontSize="9"
                            fontWeight="700"
                          >
                            {masteryText}
                          </text>
                        </g>
                      </g>

                      {/* Knowledge Gap Beacon if detected */}
                      {isKnowledgeGapSource && (
                        <g transform="translate(88, -24)">
                          <circle cx="0" cy="0" r="7" fill="#f43f5e" className="animate-ping opacity-60" />
                          <circle cx="0" cy="0" r="4" fill="#f43f5e" />
                        </g>
                      )}

                      {/* Concept Title (Crisp, High-contrast, Bold) */}
                      <text
                        x="-98"
                        y="15"
                        fill="#f8fafc"
                        fontSize="12.5"
                        fontWeight="700"
                        className="pointer-events-none drop-shadow-sm font-sans"
                      >
                        {node.name.length > 22 ? `${node.name.slice(0, 20)}...` : node.name}
                        <title>{node.name}</title>
                      </text>

                      {/* Bottom Subtitle / Tree Branch Indicator */}
                      <g transform="translate(-98, 28)">
                        <text
                          x="0"
                          y="0"
                          fill="#64748b"
                          fontSize="9"
                          fontWeight="500"
                          className="pointer-events-none"
                        >
                          Click to inspect prerequisites & discover
                        </text>
                      </g>
                    </g>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Bottom helper tip */}
          <div className="absolute bottom-4 right-4 z-20 text-[10px] text-slate-500 bg-slate-900/60 px-2.5 py-1 rounded-xl pointer-events-none">
            Drag canvas to pan • Scroll to zoom • Drag floating cards to reposition
          </div>
        </div>

        {/* Slide-over Detail Panel on Right */}
        {selectedNode && (
          <ConceptDetailPanel
            node={selectedNode}
            allNodes={data.nodes}
            edges={data.edges}
            knowledgeGaps={data.knowledgeGaps}
            lectureId={lectureId}
            onClose={() => setSelectedNodeId(null)}
            onSelectNode={(nodeId) => setSelectedNodeId(nodeId)}
          />
        )}
      </div>
    </div>
  );
};
