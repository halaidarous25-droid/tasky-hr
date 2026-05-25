import { useMemo } from 'react';
import { BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';
import type { Step } from '@/types';
import { CARD_CONFIG } from './cardConfig';

interface Props {
  steps: Step[];
}

export default function WorkflowAnalyticsPanel({ steps }: Props) {
  const stats = useMemo(() => {
    const byType: Record<string, number> = {};
    const byAssignee: Record<string, number> = {};
    const byChannel: Record<string, number> = {};
    let conditionCount = 0;
    let endCount = 0;
    let connectionCount = 0;

    for (const s of steps) {
      const cfg = CARD_CONFIG[s.cardType];
      byType[cfg.shortLabel] = (byType[cfg.shortLabel] || 0) + 1;
      if (s.assignee) byAssignee[s.assignee] = (byAssignee[s.assignee] || 0) + 1;
      if (s.channel) byChannel[s.channel] = (byChannel[s.channel] || 0) + 1;
      if (s.cardType === 'condition') conditionCount++;
      if (s.cardType === 'end') endCount++;
      connectionCount += s.nextIds.length;
      for (const opt of s.conditionOptions || []) {
        if (opt.nextId) connectionCount++;
      }
    }

    return { byType, byAssignee, byChannel, conditionCount, endCount, connectionCount };
  }, [steps]);

  const typeColors: Record<string, string> = {
    'بداية': 'text-emerald-400',
    'إجراء': 'text-blue-400',
    'شرط': 'text-fuchsia-400',
    'نهاية': 'text-red-400',
  };

  return (
    <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-4 shadow-xl backdrop-blur-sm space-y-4" dir="rtl">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="w-4 h-4 text-blue-400" />
        <h4 className="text-white font-bold text-xs">تحليل الـ Workflow</h4>
      </div>

      {/* By Type */}
      <div>
        <h5 className="text-slate-500 text-[10px] font-bold mb-2">حسب النوع</h5>
        <div className="space-y-1">
          {Object.entries(stats.byType).map(([type, count]) => (
            <div key={type} className="flex items-center gap-2">
              <span className={`text-[10px] font-bold w-8 ${typeColors[type] || 'text-slate-400'}`}>{type}</span>
              <div className="flex-1 bg-slate-800 rounded-full h-3 overflow-hidden">
                <div className={`h-full rounded-full ${typeColors[type] ? typeColors[type].replace('text-', 'bg-') : 'bg-slate-600'}`}
                  style={{ width: `${Math.min(100, (count / steps.length) * 100)}%`, opacity: 0.7 }} />
              </div>
              <span className="text-slate-400 text-[10px] w-4 text-left">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* By Assignee */}
      {Object.keys(stats.byAssignee).length > 0 && (
        <div>
          <h5 className="text-slate-500 text-[10px] font-bold mb-2">حسب المسؤول</h5>
          <div className="space-y-1">
            {Object.entries(stats.byAssignee).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
              <div key={name} className="flex items-center gap-2">
                <span className="text-slate-400 text-[10px] truncate flex-1">{name}</span>
                <span className="text-slate-500 text-[10px]">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By Channel */}
      {Object.keys(stats.byChannel).length > 0 && (
        <div>
          <h5 className="text-slate-500 text-[10px] font-bold mb-2">حسب القناة</h5>
          <div className="space-y-1">
            {Object.entries(stats.byChannel).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
              <div key={name} className="flex items-center gap-2">
                <span className="text-slate-400 text-[10px] truncate flex-1">{name}</span>
                <span className="text-slate-500 text-[10px]">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-700">
        <TrendingUp className="w-3 h-3 text-emerald-400" />
        <span className="text-slate-400 text-[10px]">{stats.connectionCount} رابط</span>
        <span className="text-slate-600 mx-1">|</span>
        <AlertTriangle className="w-3 h-3 text-amber-400" />
        <span className="text-slate-400 text-[10px]">{stats.conditionCount} شرط</span>
        <span className="text-slate-600 mx-1">|</span>
        <span className="text-slate-400 text-[10px]">{stats.endCount} نهاية</span>
      </div>
    </div>
  );
}
