import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ZoomIn, ZoomOut, Maximize, Play, Settings, GitBranch,
  Flag, FileText, Plus, Undo2, Redo2,
  AlertCircle, LayoutTemplate, X, ChevronLeft,
  Expand, Shrink, Monitor,
} from 'lucide-react';
import type { Step, CardType } from '@/types';
import {
  CARD_CONFIG, ELEMENT_PALETTE, PALETTE_SECTIONS, createEmptyStep,
  calculateSmartBurden, validateWorkflow, WORKFLOW_TEMPLATES,
} from './cardConfig';
import type { BurdenResult, ValidationResult } from './cardConfig';
import WorkflowCard from './WorkflowCard';
import CardDetailPanel from './CardDetailPanel';
import WrittenProcedureModal from './WrittenProcedureModal';

const ADD_ICONS: Record<string, React.ElementType> = {
  Play, Settings, GitBranch, Flag,
};

interface Props {
  steps: Step[];
  onChange: (steps: Step[]) => void;
  channels: string[];
  users: string[];
  respName: string;
  respOwner: string;
  respDesc: string;
  respChannel: string;
}

interface HistoryState { past: Step[][]; present: Step[]; future: Step[][] }

// ─── Orthogonal (Elbow) path calculator ──────────────────
function getOrthogonalPath(
  x1: number, y1: number, x2: number, y2: number
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;

  // Simple orthogonal: go down from source, then horizontal, then up to target
  const midY = y1 + dy / 2;

  // If target is below source, use a more complex path
  if (y2 > y1) {
    const vGap = 30; // vertical gap
    // Source bottom → down → horizontal → target top
    return `M${x1},${y1} L${x1},${y1 + vGap} L${x2},${y1 + vGap} L${x2},${y2}`;
  }

  // Standard path: source bottom → mid Y → horizontal → target top
  if (Math.abs(dx) < 20) {
    // Almost vertical alignment - straight line
    return `M${x1},${y1} L${x2},${y2}`;
  }

  return `M${x1},${y1} L${x1},${midY} L${x2},${midY} L${x2},${y2}`;
}

export default function WorkflowBuilder({ steps, onChange, channels, users, respName, respOwner, respDesc, respChannel }: Props) {
  const [editingStep, setEditingStep] = useState<Step | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [procedureOpen, setProcedureOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [validationPanel, setValidationPanel] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const [draggingCard, setDraggingCard] = useState<{ id: number; offsetX: number; offsetY: number } | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<number | null>(null);

  // Undo/Redo
  const [history, setHistory] = useState<HistoryState>({ past: [], present: steps, future: [] });
  const prevStepsRef = useRef(steps);

  useEffect(() => {
    if (steps !== prevStepsRef.current && JSON.stringify(steps) !== JSON.stringify(prevStepsRef.current)) {
      setHistory(h => ({ past: [...h.past.slice(-19), prevStepsRef.current], present: steps, future: [] }));
      prevStepsRef.current = steps;
    }
  }, [steps]);

  const undo = () => {
    setHistory(h => {
      if (h.past.length === 0) return h;
      const previous = h.past[h.past.length - 1];
      onChange(previous);
      return { past: h.past.slice(0, -1), present: previous, future: [h.present, ...h.future] };
    });
  };
  const redo = () => {
    setHistory(h => {
      if (h.future.length === 0) return h;
      const next = h.future[0];
      onChange(next);
      return { past: [...h.past, h.present], present: next, future: h.future.slice(1) };
    });
  };

  const smartBurden: BurdenResult = useMemo(() => calculateSmartBurden(steps), [steps]);
  const validation: ValidationResult = useMemo(() => validateWorkflow(steps), [steps]);
  const hasStart = steps.some(s => s.cardType === 'start');

  // ─── Zoom & Pan ──────────────────────────────────────────
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.15, 2.5));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.15, 0.3));
  const handleZoomReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  const handleFit = () => { setZoom(0.7); setPan({ x: 0, y: 0 }); };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1) {
      const target = e.target as HTMLElement;
      if (target.closest('[data-card]') || target.closest('[data-toolbar]') || target.closest('[data-port]')) return;
      setIsPanning(true);
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
    }
    if (draggingCard) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const newX = (e.clientX - rect.left - pan.x - draggingCard.offsetX) / zoom;
      const newY = (e.clientY - rect.top - pan.y - draggingCard.offsetY) / zoom;
      onChange(steps.map(s => s.id === draggingCard.id ? { ...s, x: Math.max(10, newX), y: Math.max(10, newY) } : s));
    }
  };
  const handleCanvasMouseUp = () => { setIsPanning(false); setDraggingCard(null); };
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) { e.preventDefault(); setZoom(z => Math.min(Math.max(z - e.deltaY * 0.002, 0.3), 2.5)); }
  };

  // ─── Card Drag on Canvas ─────────────────────────────────
  const handleCardDragStart = (e: React.MouseEvent, stepId: number) => {
    e.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const step = steps.find(s => s.id === stepId);
    if (!step) return;
    const cardScreenX = step.x * zoom + pan.x;
    const cardScreenY = step.y * zoom + pan.y;
    setDraggingCard({
      id: stepId,
      offsetX: e.clientX - rect.left - cardScreenX,
      offsetY: e.clientY - rect.top - cardScreenY,
    });
  };

  // ─── Connection from card port (click-based) ────────────
  const handlePortClick = (stepId: number) => {
    if (connectingFrom === null) {
      setConnectingFrom(stepId);
    } else if (connectingFrom === stepId) {
      setConnectingFrom(null);
    } else {
      const updated = steps.map(s => {
        if (s.id === connectingFrom) {
          if (s.nextIds.includes(stepId)) {
            return { ...s, nextIds: s.nextIds.filter(id => id !== stepId) };
          }
          return { ...s, nextIds: [...s.nextIds, stepId] };
        }
        return s;
      });
      onChange(updated);
      setConnectingFrom(null);
    }
  };

  // ─── CRUD ───────────────────────────────────────────────
  const addStep = useCallback((type: CardType) => {
    const newStep = createEmptyStep(type, Date.now());
    if (type === 'start') newStep.name = 'بداية العملية';
    else if (type === 'end') newStep.name = 'نهاية العملية';
    else if (type === 'condition') { newStep.name = 'شرط جديد'; newStep.conditionQuestion = 'هل ...؟'; }
    onChange([...steps, newStep]);
  }, [steps, onChange]);

  const updateStep = useCallback((updated: Step) => {
    onChange(steps.map(s => s.id === updated.id ? updated : s));
  }, [steps, onChange]);

  const deleteStep = useCallback((id: number) => {
    onChange(steps.filter(s => s.id !== id).map(s => ({
      ...s,
      nextIds: s.nextIds.filter(nid => nid !== id),
      conditionOptions: s.conditionOptions?.map(o => o.nextId === id ? { ...o, nextId: null } : o) || [],
    })));
  }, [steps, onChange]);

  const duplicateStep = useCallback((step: Step) => {
    const copy = { ...step, id: Date.now(), x: step.x + 30, y: step.y + 30, nextIds: [] };
    const idx = steps.findIndex(s => s.id === step.id);
    if (idx >= 0) { const n = [...steps]; n.splice(idx + 1, 0, copy); onChange(n); }
  }, [steps, onChange]);

  const openEdit = (step: Step) => { setEditingStep(step); setDetailOpen(true); };

  const loadTemplate = (templateId: string) => {
    const tmpl = WORKFLOW_TEMPLATES.find(t => t.id === templateId);
    if (!tmpl) return;
    onChange(tmpl.steps);
    setTemplatePickerOpen(false);
  };

  // ─── SVG Connections (Orthogonal) ───────────────────────
  const connections = useMemo(() => {
    const conns: { from: number; to: number; label: string; path: string }[] = [];
    for (const s of steps) {
      const sx = s.x + 100; // center of 200px card
      const sy = s.y + 75;  // ~bottom of card
      for (const nid of s.nextIds) {
        const t = steps.find(x => x.id === nid);
        if (!t) continue;
        const tx = t.x + 100;
        const ty = t.y; // top of target card
        const path = getOrthogonalPath(sx, sy, tx, ty);
        conns.push({ from: s.id, to: nid, label: '', path });
      }
      for (const opt of s.conditionOptions || []) {
        if (opt.nextId) {
          const t = steps.find(x => x.id === opt.nextId);
          if (!t) continue;
          const tx = t.x + 100;
          const ty = t.y;
          const path = getOrthogonalPath(sx, sy, tx, ty);
          conns.push({ from: s.id, to: opt.nextId, label: opt.label, path });
        }
      }
    }
    return conns;
  }, [steps]);

  const canvasBounds = useMemo(() => {
    if (steps.length === 0) return { w: 1200, h: 700 };
    const maxX = Math.max(...steps.map(s => s.x + 220));
    const maxY = Math.max(...steps.map(s => s.y + 160));
    return { w: Math.max(maxX + 100, 1200), h: Math.max(maxY + 100, 700) };
  }, [steps]);

  const toggleFullScreen = () => {
    if (!isFullScreen) { canvasRef.current?.requestFullscreen?.(); }
    else { document.exitFullscreen?.(); }
    setIsFullScreen(!isFullScreen);
  };

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className={`flex flex-col gap-1.5 ${isFullScreen ? 'fixed inset-0 z-[200] bg-slate-950 p-2' : 'h-full'}`}>
      {/* Top Toolbar */}
      <div data-toolbar className="flex flex-wrap items-center gap-1.5 bg-slate-900/50 border border-slate-800 rounded-xl p-1.5">
        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5 bg-slate-800 rounded-lg p-0.5">
          <button onClick={undo} disabled={history.past.length === 0} className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 transition-all"><Undo2 className="w-4 h-4" /></button>
          <button onClick={redo} disabled={history.future.length === 0} className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 transition-all"><Redo2 className="w-4 h-4" /></button>
        </div>

        {/* Palette Toggle */}
        <button onClick={() => setPaletteOpen(!paletteOpen)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors">
          <Plus className="w-3.5 h-3.5" />بطاقة
        </button>

        {/* Templates */}
        <button onClick={() => setTemplatePickerOpen(!templatePickerOpen)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600/20 text-violet-400 text-xs font-medium border border-violet-600/40 hover:bg-violet-600/30">
          <LayoutTemplate className="w-3.5 h-3.5" />قوالب</button>

        {/* Written Procedure */}
        <button onClick={() => setProcedureOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600/20 text-blue-400 text-xs font-medium border border-blue-600/40 hover:bg-blue-600/30">
          <FileText className="w-3.5 h-3.5" />إجراء مكتوب</button>

        {/* Validation */}
        <button onClick={() => setValidationPanel(!validationPanel)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${validation.isValid ? 'bg-emerald-600/10 text-emerald-400 border-emerald-600/30' : 'bg-amber-600/10 text-amber-400 border-amber-600/30'}`}>
          <AlertCircle className="w-3.5 h-3.5" />
          {validation.isValid ? 'تحقق' : `${validation.errors.length + validation.warnings.length} تحذير`}
        </button>

        <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-slate-800 text-slate-400 text-xs">
          <span>{steps.length} بطاقة</span>
        </div>

        {/* Full Screen */}
        <button onClick={toggleFullScreen}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 text-slate-400 text-xs hover:text-white transition-colors">
          {isFullScreen ? <Shrink className="w-3.5 h-3.5" /> : <Expand className="w-3.5 h-3.5" />}
          {isFullScreen ? 'تصغير' : 'عرض كامل'}
        </button>

        {/* Zoom */}
        <div className="mr-auto flex items-center gap-0.5 bg-slate-800 rounded-lg p-0.5">
          <button onClick={handleZoomOut} className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700"><ZoomOut className="w-4 h-4" /></button>
          <span className="text-slate-400 text-[11px] font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={handleZoomIn} className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700"><ZoomIn className="w-4 h-4" /></button>
          <button onClick={handleFit} className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700" title="Fit"><Maximize className="w-3.5 h-3.5" /></button>
          <button onClick={handleZoomReset} className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 text-[10px] font-bold">100%</button>
        </div>
      </div>

      {/* Main: Palette + Canvas */}
      <div className="flex gap-1.5 flex-1 min-h-0">
        {/* Palette Sidebar */}
        <AnimatePresence>
          {paletteOpen && (
            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 170, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
              className="flex-shrink-0 bg-slate-900/50 border border-slate-800 rounded-xl overflow-y-auto"
              style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {(['terminators', 'process', 'condition'] as const).map(section => {
                const sectionEl = ELEMENT_PALETTE.filter(e => e.section === section);
                if (sectionEl.length === 0) return null;
                const sectionInfo = PALETTE_SECTIONS[section];
                return (
                  <div key={section} className="p-2 border-b border-slate-800 last:border-0">
                    <div className="text-slate-500 text-[10px] font-bold px-2 py-1.5">{sectionInfo.label}</div>
                    {sectionEl.map(({ type }) => {
                      const c = CARD_CONFIG[type];
                      const Icon = ADD_ICONS[c.icon] || Settings;
                      const isDisabled = type === 'start' && hasStart;
                      return (
                        <button key={type} onClick={() => !isDisabled && addStep(type)} disabled={isDisabled}
                          className={`w-full flex items-center gap-2 p-2 rounded-lg text-right transition-all mb-1 text-xs ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-800'}`}>
                          <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${c.bg} ${c.color} border ${c.border}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className={`font-medium ${isDisabled ? 'text-slate-600' : 'text-slate-300'}`}>{c.shortLabel}</div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Canvas */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          {/* Validation Panel */}
          <AnimatePresence>
            {validationPanel && (validation.errors.length > 0 || validation.warnings.length > 0) && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="mb-1.5 bg-slate-900/50 border border-slate-800 rounded-xl p-2.5 max-h-[100px] overflow-y-auto z-10">
                {validation.errors.map((e, i) => (
                  <div key={`e${i}`} className="flex items-center gap-2 text-red-400 text-xs mb-1"><AlertCircle className="w-3 h-3" />{e}</div>
                ))}
                {validation.warnings.map((w, i) => (
                  <div key={`w${i}`} className="flex items-center gap-2 text-amber-400 text-xs mb-1"><AlertCircle className="w-3 h-3" />{w}</div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Template Picker */}
          <AnimatePresence>
            {templatePickerOpen && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="absolute top-0 right-0 z-20 w-80 bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl backdrop-blur-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white font-bold text-sm">قوالب Workflow جاهزة</h4>
                  <button onClick={() => setTemplatePickerOpen(false)} className="w-6 h-6 rounded bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"><X className="w-3 h-3" /></button>
                </div>
                <div className="space-y-2">
                  {WORKFLOW_TEMPLATES.map(tmpl => (
                    <button key={tmpl.id} onClick={() => loadTemplate(tmpl.id)}
                      className="w-full text-right p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-emerald-600/40 hover:bg-slate-800 transition-all group">
                      <div className="flex items-center gap-2">
                        <LayoutTemplate className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="text-white text-xs font-bold group-hover:text-emerald-400 transition-colors">{tmpl.name}</div>
                          <div className="text-slate-500 text-[10px] mt-0.5">{tmpl.desc}</div>
                          <div className="text-slate-600 text-[9px] mt-1">{tmpl.steps.length} خطوة</div>
                        </div>
                        <ChevronLeft className="w-3 h-3 text-slate-600 group-hover:text-emerald-400" />
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Canvas Area */}
          <div
            ref={canvasRef}
            className="flex-1 bg-slate-950/50 border border-slate-800 rounded-xl overflow-hidden relative"
            style={{ cursor: isPanning ? 'grabbing' : draggingCard ? 'grabbing' : connectingFrom !== null ? 'crosshair' : 'grab' }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            onWheel={handleWheel}
          >
            {/* Grid Background */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{ backgroundImage: `radial-gradient(circle, #64748b 1px, transparent 1px)`, backgroundSize: '20px 20px' }} />

            {/* Zoom/Pan Container */}
            <div className="absolute inset-0 overflow-hidden">
              <div style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
                transition: isPanning || draggingCard ? 'none' : 'transform 0.1s ease-out',
                width: canvasBounds.w, height: canvasBounds.h, position: 'relative',
              }}>
                {/* SVG Orthogonal Connection Arrows */}
                {connections.length > 0 && (
                  <svg className="absolute inset-0 z-[5] pointer-events-none" style={{ width: '100%', height: '100%' }}>
                    <defs>
                      <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                        <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
                      </marker>
                    </defs>
                    {connections.map((conn, i) => (
                      <g key={i}>
                        <path
                          d={conn.path}
                          stroke="#475569" strokeWidth="2" fill="none"
                          markerEnd="url(#arrowhead)" opacity="0.8"
                          style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
                        />
                        {conn.label && (
                          <text x={conn.path.includes('L') ? parseCoord(conn.path, 2) : parseCoord(conn.path, 0)}
                                y={parseCoord(conn.path, 1) - 8}
                                textAnchor="middle" fill="#94a3b8" fontSize="9"
                                fontFamily="Cairo,sans-serif" fontWeight="bold">
                            {conn.label}
                          </text>
                        )}
                      </g>
                    ))}
                  </svg>
                )}

                {/* Cards */}
                {steps.map(step => (
                  <WorkflowCard
                    key={step.id}
                    step={step}
                    isConnectingFrom={connectingFrom === step.id}
                    isConnectingMode={connectingFrom !== null}
                    onEdit={openEdit}
                    onDelete={deleteStep}
                    onDuplicate={duplicateStep}
                    onDragStart={handleCardDragStart}
                    onPortClick={handlePortClick}
                    onCanvasClick={() => {
                      if (connectingFrom !== null && connectingFrom !== step.id) { handlePortClick(step.id); }
                    }}
                  />
                ))}

                {/* Empty state */}
                {steps.length === 0 && (
                  <div className="flex flex-col items-center justify-center absolute inset-0">
                    <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
                      <Monitor className="w-8 h-8 text-slate-600" />
                    </div>
                    <h4 className="text-white font-bold text-lg mb-2">مساحة العمل فارغة</h4>
                    <p className="text-slate-500 text-sm mb-4">اختر عنصراً من القائمة الجانبية أو اختر قالباً جاهزاً</p>
                    <div className="flex items-center gap-3">
                      <button onClick={() => addStep('start')} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700">
                        <Play className="w-4 h-4 inline ml-1.5" />بطاقة البداية
                      </button>
                      <button onClick={() => setTemplatePickerOpen(true)} className="px-5 py-2.5 rounded-xl bg-violet-600/20 text-violet-400 text-sm font-medium border border-violet-600/40 hover:bg-violet-600/30">
                        <LayoutTemplate className="w-4 h-4 inline ml-1.5" />قوالب
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Burden Badge */}
            {steps.length > 0 && (
              <div className={`absolute bottom-3 left-3 px-3 py-2 rounded-xl border text-xs ${
                smartBurden.score <= 2 ? 'bg-emerald-600/10 border-emerald-600/30 text-emerald-400'
                  : smartBurden.score <= 3 ? 'bg-blue-600/10 border-blue-600/30 text-blue-400'
                    : smartBurden.score <= 4 ? 'bg-amber-600/10 border-amber-600/30 text-amber-400'
                      : 'bg-red-600/10 border-red-600/30 text-red-400'
              }`}>
                <div className="font-black text-sm">{smartBurden.score} <span className="text-[9px] font-normal">/ 5</span></div>
                <div className="text-[9px]">{smartBurden.label}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Detail Panel */}
      <CardDetailPanel step={editingStep} open={detailOpen}
        onClose={() => { setDetailOpen(false); setEditingStep(null); }}
        onSave={updateStep} channels={channels} users={users} steps={steps} />

      {/* Written Procedure Modal */}
      <WrittenProcedureModal steps={steps} respName={respName} respOwner={respOwner}
        respDesc={respDesc} respChannel={respChannel} open={procedureOpen} onClose={() => setProcedureOpen(false)} />
    </div>
  );
}

// ─── Parse x coordinate from SVG path ───────────────────
function parseCoord(path: string, index: number): number {
  const matches = path.match(/[-+]?[0-9]*\.?[0-9]+/g);
  if (!matches) return 0;
  return parseFloat(matches[index * 2] || '0');
}
