import { useState, useCallback } from 'react';
import {
  Play, Settings, GitBranch, Flag,
  Trash2, Copy, Edit3, GripVertical, AlertTriangle,
} from 'lucide-react';
import type { Step } from '@/types';
import { CARD_CONFIG } from './cardConfig';

const ICON_MAP: Record<string, React.ElementType> = {
  Play, Settings, GitBranch, Flag,
};

function BpmnShapeIcon({ shape, color, icon, size = 22 }: { shape: string; color: string; icon: string; size?: number }) {
  const Icon = ICON_MAP[icon] || Settings;
  const baseStyle: React.CSSProperties = {
    width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  };
  switch (shape) {
    case 'terminator':
      return (
        <div className="rounded-full border-[2.5px] flex items-center justify-center" style={{ ...baseStyle, borderRadius: '50%', backgroundColor: `${color}15`, borderColor: `${color}70` }}>
          <Icon className="w-3 h-3" style={{ color }} />
        </div>
      );
    case 'process':
      return (
        <div className="rounded-lg border-[2.5px] flex items-center justify-center" style={{ ...baseStyle, backgroundColor: `${color}15`, borderColor: `${color}70` }}>
          <Icon className="w-3 h-3" style={{ color }} />
        </div>
      );
    case 'decision':
      return (
        <div className="border-[2.5px] flex items-center justify-center rotate-45" style={{ ...baseStyle, width: size * 0.85, height: size * 0.85, backgroundColor: `${color}15`, borderColor: `${color}70` }}>
          <Icon className="w-3 h-3 -rotate-45" style={{ color }} />
        </div>
      );
    default:
      return (
        <div className="rounded border-[2.5px] flex items-center justify-center" style={{ ...baseStyle, backgroundColor: `${color}15`, borderColor: `${color}70` }}>
          <Icon className="w-3 h-3" style={{ color }} />
        </div>
      );
  }
}

interface Props {
  step: Step;
  isConnectingFrom: boolean;
  isConnectingMode: boolean;
  onEdit: (step: Step) => void;
  onDelete: (id: number) => void;
  onDuplicate: (step: Step) => void;
  onDragStart: (e: React.MouseEvent, stepId: number) => void;
  onPortClick: (stepId: number) => void;
  onCanvasClick: () => void;
}

export default function WorkflowCard({
  step, isConnectingFrom, isConnectingMode,
  onEdit, onDelete, onDuplicate, onDragStart, onPortClick, onCanvasClick,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const cfg = CARD_CONFIG[step.cardType];
  const isStart = step.cardType === 'start';
  const isEnd = step.cardType === 'end';
  const isCondition = step.cardType === 'condition';
  const isComplete = step.name && (isStart || isEnd || step.assignee);
  const colorHex = getColorHex(cfg.color);
  const subLabel = step.cardType === 'process' ? step.actionType : null;
  const hasConnections = step.nextIds.length > 0;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-port]')) return;
    if ((e.target as HTMLElement).closest('[data-action]')) return;
    onDragStart(e, step.id);
  }, [onDragStart, step.id]);

  return (
    <div
      data-card={step.id}
      className="absolute"
      style={{ left: step.x, top: step.y, width: 200, zIndex: hovered ? 20 : 10 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-port]')) return;
        if (isConnectingMode && !isConnectingFrom) { onCanvasClick(); }
        else if (!isConnectingMode) { onEdit(step); }
      }}
    >
      {/* Card body */}
      <div
        className={`relative rounded-xl border-2 transition-all duration-150 select-none ${
          isConnectingFrom ? 'ring-2 ring-blue-500 border-blue-500/60 scale-[1.02]' :
          isConnectingMode && !isConnectingFrom ? 'opacity-60 hover:opacity-90 hover:border-emerald-500/60' :
          `${cfg.border} ${cfg.bg} hover:shadow-lg hover:scale-[1.02]`
        } ${!isComplete && !isStart && !isEnd ? 'ring-1 ring-amber-500/20' : ''}`}
        style={{ backgroundColor: `${colorHex}08` }}
      >
        {/* Connection port - top edge (incoming target) */}
        <div
          data-port="target"
          className={`absolute -top-[5px] left-1/2 -translate-x-1/2 w-[10px] h-[10px] rounded-full border-2 z-30 transition-all ${
            isConnectingMode && !isConnectingFrom
              ? 'bg-emerald-500 border-emerald-300 scale-150 shadow-md shadow-emerald-500/40'
              : 'bg-slate-700 border-slate-500 opacity-0'
          }`}
          style={isConnectingMode && !isConnectingFrom ? { opacity: 1 } : undefined}
          onClick={(e) => { e.stopPropagation(); onPortClick(step.id); }}
        />

        {/* Connection port - bottom edge (outgoing source) */}
        {!isEnd && (
          <div
            data-port="source"
            className={`absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-[10px] h-[10px] rounded-full border-2 z-30 transition-all cursor-crosshair ${
              isConnectingFrom
                ? 'bg-blue-500 border-blue-300 scale-150 shadow-md shadow-blue-500/40'
                : hovered
                  ? 'bg-slate-600 border-slate-400 opacity-100'
                  : 'bg-slate-700 border-slate-500 opacity-0'
            }`}
            onClick={(e) => { e.stopPropagation(); onPortClick(step.id); }}
          />
        )}

        {/* Incomplete indicator */}
        {!isComplete && !isStart && !isEnd && (
          <div className="absolute top-0 left-3 right-3 h-0.5 bg-amber-500/50 rounded-full" />
        )}

        <div className="p-2.5">
          {/* Header: drag handle + shape + name + badge */}
          <div className="flex items-center gap-2 mb-1.5">
            <div className="text-slate-500 cursor-grab active:cursor-grabbing flex-shrink-0" onMouseDown={handleMouseDown}>
              <GripVertical className="w-3 h-3" />
            </div>
            <BpmnShapeIcon shape={cfg.bpmnShape} color={colorHex} icon={cfg.icon} />
            <div className="flex-1 min-w-0">
              <div className={`text-[11px] font-bold truncate ${step.name ? 'text-white' : 'text-slate-500'}`}>
                {step.name || `${cfg.label}...`}
              </div>
            </div>
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
              {cfg.shortLabel}
            </span>
            {!isComplete && !isStart && !isEnd && (
              <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
            )}
          </div>

          {/* Sub-label (action type) */}
          {subLabel && (
            <div className="text-[8px] text-slate-500 mr-5 mb-0.5 truncate">
              <span className="bg-slate-800/70 px-1.5 py-0.5 rounded text-slate-400">{subLabel}</span>
            </div>
          )}

          {/* Condition question */}
          {isCondition && step.conditionQuestion && (
            <div className="text-[9px] text-fuchsia-400 mt-1 mr-5 truncate">❓ {step.conditionQuestion}</div>
          )}

          {/* Info: Assignee + Channel */}
          <div className="flex items-center gap-1.5 text-[9px] text-slate-400 mr-5">
            {step.assignee && (
              <span className="truncate flex items-center gap-0.5"><span className="opacity-50">👤</span> {step.assignee}</span>
            )}
            {step.channel && (
              <span className="truncate flex items-center gap-0.5 mr-auto">
                <span className="opacity-50">📡</span>
                <span className="bg-slate-900/40 px-1 py-0.5 rounded">{step.channel}</span>
              </span>
            )}
          </div>

          {/* Connection count */}
          {hasConnections && (
            <div className="mt-1">
              <span className="text-[8px] bg-slate-800 text-slate-400 px-1 rounded">{step.nextIds.length} رابط</span>
            </div>
          )}
        </div>

        {/* Hover actions */}
        {hovered && !isConnectingMode && (
          <div className="absolute -top-2 -left-1 flex items-center gap-0.5 bg-slate-900 border border-slate-700 rounded-lg p-0.5 shadow-xl z-20">
            <button data-action onClick={(e) => { e.stopPropagation(); onEdit(step); }}
              className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors">
              <Edit3 className="w-3 h-3" />
            </button>
            <button data-action onClick={(e) => { e.stopPropagation(); onDuplicate(step); }}
              className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
              <Copy className="w-3 h-3" />
            </button>
            {!isStart && !isEnd && (
              <button data-action onClick={(e) => { e.stopPropagation(); onDelete(step.id); }}
                className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Condition options displayed below card */}
      {isCondition && step.conditionOptions.length > 0 && (
        <div className="mt-2 space-y-1">
          {step.conditionOptions.map((opt, i) => (
            <div key={opt.id} className="flex items-center gap-1.5 mr-4">
              <div className="w-0.5 h-4 bg-slate-700/50" />
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border ${
                i === 0 ? 'bg-emerald-600/10 border-emerald-600/30 text-emerald-400'
                  : i === 1 ? 'bg-red-600/10 border-red-600/30 text-red-400'
                    : 'bg-blue-600/10 border-blue-600/30 text-blue-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-emerald-400' : i === 1 ? 'bg-red-400' : 'bg-blue-400'}`} />
                {opt.label}
                {opt.nextId && <span className="text-slate-600 text-[7px]">→ {opt.nextId}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getColorHex(colorClass: string): string {
  const map: Record<string, string> = {
    'text-emerald-400': '#34d399', 'text-blue-400': '#60a5fa',
    'text-fuchsia-400': '#e879f9', 'text-red-400': '#f87171',
  };
  return map[colorClass] || '#94a3b8';
}
