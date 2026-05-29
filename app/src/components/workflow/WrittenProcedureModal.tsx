import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Copy, Check, LayoutTemplate } from 'lucide-react';
import type { Step } from '@/types';
import { CARD_CONFIG } from './cardConfig';

const ICON_EMOJI: Record<string, string> = { start: '▶', process: '⚙', condition: '◈', end: '🏁' };
const COLOR_HEX: Record<string, string> = {
  'text-emerald-400': '#34d399', 'text-blue-400': '#60a5fa',
  'text-fuchsia-400': '#e879f9', 'text-red-400': '#f87171',
};

interface Props {
  steps: Step[];
  respName: string;
  respOwner?: string; // kept for backward compatibility, not rendered
  respDesc: string;
  respChannel: string;
  open: boolean;
  onClose: () => void;
}

// ─── Generate SVG Flowchart ──────────────────────────────
function generateFlowchartSVG(steps: Step[]): string {
  if (steps.length === 0) return '<div style="text-align:center;color:#64748b;padding:40px;">لا توجد بطاقات</div>';

  const CARD_W = 160, CARD_H = 60;
  const PADDING = 40;

  const minX = Math.min(...steps.map(s => s.x));
  const minY = Math.min(...steps.map(s => s.y));
  const maxX = Math.max(...steps.map(s => s.x + CARD_W));
  const maxY = Math.max(...steps.map(s => s.y + CARD_H));

  const svgW = maxX - minX + PADDING * 2;
  const svgH = maxY - minY + PADDING * 2;
  const ox = PADDING - minX;
  const oy = PADDING - minY;

  const connections: { x1: number; y1: number; x2: number; y2: number; label: string }[] = [];
  for (const s of steps) {
    const sx = s.x + CARD_W / 2 + ox;
    const sy = s.y + CARD_H + oy;
    for (const nid of s.nextIds) {
      const t = steps.find(x => x.id === nid);
      if (t) connections.push({ x1: sx, y1: sy, x2: t.x + CARD_W / 2 + ox, y2: t.y + oy, label: '' });
    }
    for (const opt of s.conditionOptions || []) {
      if (opt.nextId) {
        const t = steps.find(x => x.id === opt.nextId);
        if (t) connections.push({ x1: sx, y1: sy, x2: t.x + CARD_W / 2 + ox, y2: t.y + oy, label: opt.label });
      }
    }
  }

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" style="background:#0f172a;font-family:Cairo,sans-serif;">`;
  svg += `<defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.5" fill="#334155" opacity="0.3"/></pattern></defs>`;
  svg += `<rect width="100%" height="100%" fill="url(#grid)"/>`;
  svg += `<defs><marker id="a" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#64748b"/></marker></defs>`;

  for (const c of connections) {
    const midY = c.y1 + (c.y2 - c.y1) / 2;
    if (c.y2 > c.y1) {
      svg += `<path d="M${c.x1},${c.y1} L${c.x1},${c.y1 + 20} L${c.x2},${c.y1 + 20} L${c.x2},${c.y2}" stroke="#475569" stroke-width="2" fill="none" marker-end="url(#a)" opacity="0.8"/>`;
    } else {
      svg += `<path d="M${c.x1},${c.y1} L${c.x1},${midY} L${c.x2},${midY} L${c.x2},${c.y2}" stroke="#475569" stroke-width="2" fill="none" marker-end="url(#a)" opacity="0.8"/>`;
    }
    if (c.label) {
      svg += `<text x="${(c.x1 + c.x2) / 2}" y="${midY - 4}" text-anchor="middle" fill="#94a3b8" font-size="8" font-weight="bold">${c.label}</text>`;
    }
  }

  for (const s of steps) {
    const cfg = CARD_CONFIG[s.cardType];
    const color = COLOR_HEX[cfg.color] || '#94a3b8';
    const x = s.x + ox, y = s.y + oy;
    const emoji = ICON_EMOJI[s.cardType] || '●';
    const isEnd = s.cardType === 'end';
    const isCondition = s.cardType === 'condition';
    const isStart = s.cardType === 'start';
    const radius = isStart || isEnd ? CARD_H / 2 : isCondition ? 4 : 8;

    svg += `<g>`;
    svg += `<rect x="${x}" y="${y}" width="${CARD_W}" height="${CARD_H}" rx="${radius}" fill="#1e293b" stroke="${color}" stroke-width="1.5" opacity="0.95"/>`;
    svg += `<text x="${x + 12}" y="${y + 22}" font-size="12">${emoji}</text>`;
    svg += `<rect x="${x + 28}" y="${y + 10}" width="${cfg.shortLabel.length * 7 + 6}" height="14" rx="3" fill="${color}20" stroke="${color}60" stroke-width="0.5"/>`;
    svg += `<text x="${x + 31}" y="${y + 21}" fill="${color}" font-size="7" font-weight="bold">${cfg.shortLabel}</text>`;
    const name = (s.name || cfg.label).substring(0, 20);
    svg += `<text x="${x + 8}" y="${y + 42}" fill="#e2e8f0" font-size="9" font-weight="bold">${name}</text>`;
    if (s.assignee) {
      svg += `<text x="${x + 8}" y="${y + 55}" fill="#64748b" font-size="7">👤 ${s.assignee.substring(0, 15)}</text>`;
    }
    svg += `</g>`;
  }

  svg += `</svg>`;
  return svg;
}

// ─── Generate Formal Procedure Document ─────────────────
function generateNarrative(steps: Step[], respName: string, respDesc: string, respChannel: string): string {
  const parties = new Set<string>();
  const channels = new Set<string>();
  const endStatuses: string[] = [];

  for (const s of steps) {
    if (s.assignee) parties.add(s.assignee);
    if (s.channel) channels.add(s.channel);
    if (s.cardType === 'end' && s.finalStatus) endStatuses.push(s.finalStatus);
  }

  const now = new Date().toLocaleDateString('ar-SA');
  const lines: string[] = [];

  lines.push(`══════════════════════════════════════════════════════════`);
  lines.push(`    وثيقة إجراء تشغيلي — Departmental Standard Operating Procedure`);
  lines.push(`══════════════════════════════════════════════════════════`);
  lines.push(`  تاريخ الإصدار: ${now}`);
  lines.push('');

  // أولاً: عنوان الإجراء
  lines.push(`أولاً: عنوان الإجراء`);
  lines.push(`─────────────────────────────────────────────`);
  lines.push(`${respName}`);
  lines.push('');

  // ثانياً: الهدف من الإجراء
  lines.push(`ثانياً: الهدف من الإجراء`);
  lines.push(`─────────────────────────────────────────────`);
  lines.push(
    respDesc ||
    `يهدف هذا الإجراء إلى توحيد وتنظيم آلية تنفيذ "${respName}" داخل الوحدة التنظيمية المختصة، ` +
    `بما يضمن الكفاءة التشغيلية وجودة مخرجات العمل والالتزام بالمعايير المؤسسية المعتمدة.`
  );
  lines.push('');

  // ثالثاً: نطاق التطبيق
  lines.push(`ثالثاً: نطاق التطبيق`);
  lines.push(`─────────────────────────────────────────────`);
  lines.push(
    `يُطبَّق هذا الإجراء على جميع الموظفين والأطراف ذات العلاقة المنوط بهم تنفيذ أو مراجعة أو اعتماد ` +
    `إجراء "${respName}" في الوحدة التنظيمية المعنية.`
  );
  if (respChannel) lines.push(`قناة استقبال الطلب المعتمدة: ${respChannel}`);
  lines.push('');

  // رابعاً: الأطراف المشاركة
  lines.push(`رابعاً: الأطراف المشاركة في تنفيذ الإجراء`);
  lines.push(`─────────────────────────────────────────────`);
  const partyList = [...parties];
  if (partyList.length > 0) {
    partyList.forEach((p, i) => lines.push(`${i + 1}. ${p}`));
  } else {
    lines.push('1. أخصائي خدمات الموارد البشرية');
    lines.push('2. المدير المباشر / جهة الاعتماد');
  }
  lines.push('');

  // خامساً: القنوات والأنظمة
  lines.push(`خامساً: الأنظمة والقنوات التشغيلية المستخدمة`);
  lines.push(`─────────────────────────────────────────────`);
  const channelList = [...channels];
  if (channelList.length > 0) {
    channelList.forEach((ch, i) => lines.push(`${i + 1}. ${ch}`));
  } else if (respChannel) {
    lines.push(`1. ${respChannel}`);
  } else {
    lines.push('1. نظام الموارد البشرية');
  }
  lines.push('');

  // سادساً: خطوات الإجراء
  lines.push(`سادساً: خطوات تنفيذ الإجراء`);
  lines.push(`─────────────────────────────────────────────`);
  lines.push('يوضح الجدول التالي التسلسل الزمني لخطوات تنفيذ الإجراء:');
  lines.push('');
  let stepNum = 1;
  function writeSteps(list: Step[], indent = '') {
    for (const s of list) {
      const cfg = CARD_CONFIG[s.cardType];
      const stepTypeLabel =
        s.cardType === 'start' ? '[بداية]' :
        s.cardType === 'end' ? '[نهاية]' :
        s.cardType === 'condition' ? '[شرط]' : '[إجراء]';
      lines.push(`${indent}${stepNum}. ${stepTypeLabel} ${s.name || cfg.label}`);
      if (s.description) lines.push(`${indent}   • الوصف: ${s.description}`);
      if (s.assignee) lines.push(`${indent}   • المسؤول عن التنفيذ: ${s.assignee}`);
      if (s.channel) lines.push(`${indent}   • النظام / القناة المستخدمة: ${s.channel}`);
      if (s.actionType) lines.push(`${indent}   • نوع الإجراء: ${s.actionType}`);
      if (s.isMandatory) lines.push(`${indent}   • ملاحظة: خطوة إلزامية لا يجوز تجاوزها`);
      stepNum++;
      if (s.cardType === 'condition' && s.conditionOptions.length > 0) {
        lines.push('');
        for (const opt of s.conditionOptions) {
          lines.push(`${indent}   ◆ حالة "${opt.label}":`);
          if (opt.nextId) {
            const target = steps.find(x => x.id === opt.nextId);
            if (target) writeSteps([target], indent + '      ');
          } else {
            lines.push(`${indent}      (غير مربوط)`);
          }
        }
        lines.push('');
      }
      for (const nid of s.nextIds) {
        const target = steps.find(x => x.id === nid);
        if (target && !list.includes(target)) writeSteps([target], indent);
      }
    }
  }
  writeSteps(steps.filter(s => s.cardType === 'start'));
  lines.push('');

  // سابعاً: التفرعات والاشتراطات
  const conditions = steps.filter(s => s.cardType === 'condition');
  if (conditions.length > 0) {
    lines.push(`سابعاً: نقاط التفرع والاشتراطات`);
    lines.push(`─────────────────────────────────────────────`);
    lines.push('تتضمن آلية تنفيذ هذا الإجراء نقاط تحقق وتفرع وفق الاشتراطات الآتية:');
    lines.push('');
    for (const c of conditions) {
      lines.push(`◈ نقطة التحقق: ${c.conditionQuestion || c.name}`);
      for (const opt of c.conditionOptions) {
        const target = steps.find(s => s.id === opt.nextId);
        lines.push(`     • ${opt.label}  →  ${target ? target.name : 'غير مربوط'}`);
      }
      lines.push('');
    }
  }

  // ثامناً: حالات إنهاء الإجراء
  if (endStatuses.length > 0) {
    const sectionNum = conditions.length > 0 ? 'ثامناً' : 'سابعاً';
    lines.push(`${sectionNum}: حالات إنهاء الإجراء`);
    lines.push(`─────────────────────────────────────────────`);
    lines.push('يُختتم تنفيذ الإجراء بإحدى الحالات الآتية:');
    [...new Set(endStatuses)].forEach((status, i) => lines.push(`${i + 1}. ${status}`));
    lines.push('');
  }

  // ملاحظات تشغيلية
  const notes = steps.filter(s => s.notes).map(s => s.notes);
  if (notes.length > 0) {
    lines.push(`تاسعاً: ملاحظات واشتراطات تشغيلية`);
    lines.push(`─────────────────────────────────────────────`);
    lines.push('تُراعى الملاحظات الآتية عند تنفيذ هذا الإجراء:');
    notes.forEach((n, i) => lines.push(`${i + 1}. ${n}`));
    lines.push('');
  }

  lines.push('══════════════════════════════════════════════════════════');
  lines.push('✓ صدرت هذه الوثيقة من نظام إدارة المسؤوليات والإجراءات.');
  lines.push(`  تاريخ الإصدار: ${now}`);
  return lines.join('\n');
}

export default function WrittenProcedureModal({ steps, respName, respDesc, respChannel, open, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const text = generateNarrative(steps, respName, respDesc, respChannel);
  const svgHtml = generateFlowchartSVG(steps);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const now = new Date().toLocaleDateString('ar-SA');
    printWindow.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>وثيقة إجراء: ${respName}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Cairo',sans-serif;background:#fff;color:#1e293b;padding:48px 52px;direction:rtl;line-height:1.9;font-size:13px}
  .header{text-align:center;margin-bottom:32px;padding-bottom:22px;border-bottom:3px solid #059669}
  .header .logo-row{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:10px}
  .header .logo-box{width:48px;height:48px;background:linear-gradient(135deg,#059669,#0d9488);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:900}
  .header h1{color:#059669;font-size:22px;font-weight:900;margin-bottom:4px}
  .header .doc-subtitle{font-size:15px;font-weight:700;color:#0f172a;margin-bottom:12px}
  .header .meta{display:flex;justify-content:center;gap:28px;font-size:12px;color:#475569;flex-wrap:wrap}
  .header .meta span strong{color:#0f172a}
  .section{margin-bottom:28px;page-break-inside:avoid}
  .section h2{color:#059669;font-size:14px;font-weight:800;margin-bottom:12px;padding:7px 14px;border-right:5px solid #059669;background:#f0fdf4;border-radius:0 8px 8px 0}
  .text-content{background:#f8fafc;border-radius:10px;padding:22px 26px;white-space:pre-wrap;line-height:2.1;font-size:13px;color:#334155;border:1px solid #e2e8f0}
  .chart-container{background:#0f172a;border-radius:12px;padding:16px;overflow-x:auto;text-align:center;margin:12px 0}
  .footer{margin-top:40px;padding-top:18px;border-top:2px solid #e2e8f0;display:flex;justify-content:space-between;align-items:flex-end;font-size:11px;color:#94a3b8}
  .sig-box{border-top:1px solid #cbd5e1;width:160px;text-align:center;padding-top:6px;color:#64748b;font-size:12px}
  @media print{body{padding:20px}.chart-container{background:#0f172a}}
</style>
</head>
<body>
  <div class="header">
    <div class="logo-row"><div class="logo-box">HR</div></div>
    <h1>نظام إدارة المسؤوليات والإجراءات</h1>
    <div class="doc-subtitle">وثيقة إجراء تشغيلي — Standard Operating Procedure</div>
    <div class="meta">
      <span>اسم الإجراء: <strong>${respName}</strong></span>
      <span>القناة: <strong>${respChannel || 'غير محدد'}</strong></span>
      <span>تاريخ الإصدار: <strong>${now}</strong></span>
    </div>
  </div>
  <div class="section"><h2>مخطط سير الإجراء</h2><div class="chart-container">${svgHtml}</div></div>
  <div class="section"><h2>نص الإجراء التشغيلي</h2><div class="text-content">${text.replace(/\n/g, '<br>')}</div></div>
  <div class="footer">
    <div>
      <div>نظام إدارة المسؤوليات والإجراءات</div>
      <div>تاريخ الطباعة: ${now}</div>
    </div>
    <div style="display:flex;gap:36px">
      <div class="sig-box">المراجع</div>
      <div class="sig-box">المعتمد</div>
    </div>
  </div>
  <script>window.onload=()=>setTimeout(()=>window.print(),500);</script>
</body>
</html>`);
    printWindow.document.close();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4" onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="text-white font-bold text-sm">الإجراء التشغيلي الرسمي</h3>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs hover:bg-slate-700">
                  <LayoutTemplate className="w-3.5 h-3.5" />طباعة
                </button>
                <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs hover:bg-slate-700">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}{copied ? 'تم النسخ' : 'نسخ'}
                </button>
                <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Flowchart Section */}
            <div className="border-b border-slate-800 p-4">
              <h4 className="text-emerald-400 text-xs font-bold mb-3 flex items-center gap-2">
                <LayoutTemplate className="w-3.5 h-3.5" />مخطط سير الإجراء
              </h4>
              <div className="bg-slate-950 rounded-xl p-3 overflow-x-auto flex justify-center" dangerouslySetInnerHTML={{ __html: svgHtml }} />
            </div>

            {/* Narrative Text */}
            <div className="flex-1 overflow-y-auto p-5">
              <h4 className="text-blue-400 text-xs font-bold mb-3">نص الإجراء التشغيلي الرسمي</h4>
              <pre className="text-slate-300 text-sm leading-loose whitespace-pre-wrap font-[Cairo,sans-serif]">{text}</pre>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
