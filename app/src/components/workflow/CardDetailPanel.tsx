import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Plus, ArrowRight, Trash2 } from 'lucide-react';
import type { Step, ConditionOption } from '@/types';
import {
  CARD_CONFIG, ACTION_TYPES, SOURCE_TYPES,
  FINAL_STATUSES, PERFORMER_OPTIONS, HR_CHANNELS,
} from './cardConfig';

interface Props {
  step: Step | null;
  open: boolean;
  onClose: () => void;
  onSave: (step: Step) => void;
  channels: string[];
  users: string[];
  steps: Step[];
}

export default function CardDetailPanel({ step, open, onClose, onSave, channels: _channels, users, steps }: Props) {
  void _channels;
  const [form, setForm] = useState<Step | null>(null);

  useEffect(() => { if (step) setForm({ ...step }); }, [step]);

  if (!open || !form) return null;

  const cfg = CARD_CONFIG[form.cardType];
  const update = (field: Partial<Step>) => setForm(prev => prev ? { ...prev, ...field } : prev);

  // Condition options management
  const addConditionOption = () => {
    const newOpt: ConditionOption = { id: `opt_${Date.now()}`, label: `خيار ${form.conditionOptions.length + 1}`, nextId: null };
    update({ conditionOptions: [...form.conditionOptions, newOpt] });
  };
  const removeConditionOption = (id: string) => {
    update({ conditionOptions: form.conditionOptions.filter(o => o.id !== id) });
  };
  const updateConditionOption = (id: string, field: Partial<ConditionOption>) => {
    update({ conditionOptions: form.conditionOptions.map(o => o.id === id ? { ...o, ...field } : o) });
  };

  // Field renderers
  const field = (label: string, required: boolean, children: React.ReactNode) => (
    <div className="mb-3">
      <label className="block text-slate-400 text-[11px] font-medium mb-1">{label}{required && <span className="text-red-400 mr-1">*</span>}</label>
      {children}
    </div>
  );

  const textInput = (value: string, onChange: (v: string) => void, placeholder: string, required = false) =>
    field(placeholder, required,
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-xs focus:outline-none focus:border-emerald-600" placeholder={placeholder} />
    );

  const selectInput = (value: string, onChange: (v: string) => void, options: string[], label: string, required = false) =>
    field(label, required,
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-xs focus:outline-none focus:border-emerald-600">
        <option value="">اختر...</option>{options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );

  const textareaInput = (value: string, onChange: (v: string) => void, label: string, rows = 2) =>
    field(label, false,
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-xs focus:outline-none focus:border-emerald-600 resize-y" />
    );

  const toggleInput = (label: string, value: boolean, onChange: (v: boolean) => void) => (
    <div className="mb-3">
      <label className="block text-slate-400 text-[11px] font-medium mb-1">{label}</label>
      <div className="flex items-center gap-2 py-1">
        <button onClick={() => onChange(true)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${value ? 'bg-emerald-600/20 border-emerald-600 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>نعم</button>
        <button onClick={() => onChange(false)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${!value ? 'bg-red-600/20 border-red-600 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>لا</button>
      </div>
    </div>
  );

  // ─── Render fields based on card type ───────────────────
  const renderCardFields = () => {
    const f = cfg.fields;
    return (
      <div className="space-y-0">
        {/* Name - all cards */}
        {f.includes('name') && textInput(form.name, v => update({ name: v }), 'اسم البطاقة', true)}

        {/* Description */}
        {f.includes('description') && textareaInput(form.description, v => update({ description: v }), 'وصف مختصر', 2)}

        {/* Source type - start only */}
        {f.includes('sourceType') && selectInput(form.sourceType, v => update({ sourceType: v }), SOURCE_TYPES, 'مصدر بداية الطلب', true)}

        {/* Channel */}
        {f.includes('channel') && selectInput(form.channel, v => update({ channel: v }), HR_CHANNELS, 'القناة أو النظام')}

        {/* Action type - process only */}
        {f.includes('actionType') && selectInput(form.actionType, v => update({ actionType: v }), ACTION_TYPES, 'نوع الإجراء')}

        {/* Assignee */}
        {f.includes('assignee') && (
          <div className="mb-3">
            <label className="block text-slate-400 text-[11px] font-medium mb-1">من يقوم بالإجراء؟</label>
            <select value={form.assignee} onChange={e => update({ assignee: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-xs focus:outline-none focus:border-emerald-600">
              <option value="">اختر...</option>
              <optgroup label="موظفين مسجلين">{users.map(u => <option key={u} value={u}>{u}</option>)}</optgroup>
              <optgroup label="أدوار وظيفية">{PERFORMER_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}</optgroup>
            </select>
          </div>
        )}

        {/* Condition Question */}
        {f.includes('conditionQuestion') && textInput(form.conditionQuestion, v => update({ conditionQuestion: v }), 'السؤال الشرطي', true)}

        {/* Condition Type */}
        {f.includes('conditionType') && (
          <div className="mb-3">
            <label className="block text-slate-400 text-[11px] font-medium mb-1">نوع الإجابة</label>
            <div className="flex items-center gap-2 py-1">
              <button onClick={() => update({ conditionType: 'yes_no' as const, conditionOptions: [
                { id: 'yes', label: 'نعم', nextId: form.conditionOptions.find(o => o.id === 'yes')?.nextId || null },
                { id: 'no', label: 'لا', nextId: form.conditionOptions.find(o => o.id === 'no')?.nextId || null },
              ]})}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${form.conditionType === 'yes_no' ? 'bg-fuchsia-600/20 border-fuchsia-600 text-fuchsia-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>نعم / لا</button>
              <button onClick={() => update({ conditionType: 'multiple' as const })}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${form.conditionType === 'multiple' ? 'bg-fuchsia-600/20 border-fuchsia-600 text-fuchsia-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>خيارات متعددة</button>
            </div>
          </div>
        )}

        {/* Condition Options */}
        {f.includes('conditionOptions') && (
          <div className="mb-3 border border-slate-700 rounded-xl p-3">
            <label className="block text-slate-400 text-[11px] font-medium mb-2">الخيارات</label>
            <div className="space-y-2">
              {form.conditionOptions.map((opt, i) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0 ${
                    i === 0 ? 'bg-emerald-600/20 text-emerald-400' : i === 1 ? 'bg-red-600/20 text-red-400' : 'bg-blue-600/20 text-blue-400'
                  }`}>{i + 1}</span>
                  <input type="text" value={opt.label}
                    onChange={e => updateConditionOption(opt.id, { label: e.target.value })}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded py-1.5 px-2 text-white text-xs focus:outline-none focus:border-emerald-600" />
                  <select value={opt.nextId || ''}
                    onChange={e => updateConditionOption(opt.id, { nextId: e.target.value ? parseInt(e.target.value) : null })}
                    className="bg-slate-800 border border-slate-700 rounded py-1.5 px-2 text-white text-[10px] focus:outline-none focus:border-emerald-600 w-24">
                    <option value="">الخطوة التالية</option>
                    {steps.filter(s => s.id !== form.id).map(s => (
                      <option key={s.id} value={s.id}>{s.name || `بطاقة ${s.id}`}</option>
                    ))}
                  </select>
                  {form.conditionType === 'multiple' && form.conditionOptions.length > 2 && (
                    <button onClick={() => removeConditionOption(opt.id)}
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {form.conditionType === 'multiple' && (
              <button onClick={addConditionOption}
                className="mt-2 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-fuchsia-600/30 text-fuchsia-400 text-[10px] font-bold hover:bg-fuchsia-600/10 transition-colors">
                <Plus className="w-3 h-3" />إضافة خيار
              </button>
            )}
          </div>
        )}

        {/* Direct connections */}
        <div className="mb-3 border border-slate-700 rounded-xl p-3">
          <label className="block text-slate-400 text-[11px] font-medium mb-2">الروابط المباشرة</label>
          {form.nextIds.length > 0 ? (
            <div className="space-y-1">
              {form.nextIds.map(targetId => {
                const target = steps.find(s => s.id === targetId);
                return (
                  <div key={targetId} className="flex items-center justify-between bg-slate-800/50 rounded px-2 py-1">
                    <span className="text-slate-400 text-[10px]">← {target?.name || targetId}</span>
                    <button onClick={() => update({ nextIds: form.nextIds.filter(id => id !== targetId) })}
                      className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-red-400">
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-600 text-[10px]">لا توجد روابط مباشرة</p>
          )}
          <div className="mt-2">
            <select
              onChange={e => {
                const val = parseInt(e.target.value);
                if (val && !form.nextIds.includes(val)) {
                  update({ nextIds: [...form.nextIds, val] });
                }
                e.target.value = '';
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-2 text-white text-[10px] focus:outline-none focus:border-emerald-600"
            >
              <option value="">+ ربط بخطوة...</option>
              {steps.filter(s => s.id !== form.id && !form.nextIds.includes(s.id)).map(s => (
                <option key={s.id} value={s.id}>{s.name || `بطاقة ${s.id}`}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Final status */}
        {f.includes('finalStatus') && selectInput(form.finalStatus, v => update({ finalStatus: v as any }), FINAL_STATUSES, 'الحالة النهائية')}

        {/* Notify requester */}
        {f.includes('notifyRequester') && toggleInput('إشعار صاحب الطلب؟', form.notifyRequester, v => update({ notifyRequester: v }))}

        {/* Archive */}
        {f.includes('archive') && toggleInput('أرشفة؟', form.archive, v => update({ archive: v }))}
        {form.archive && f.includes('archiveLocation') && textInput(form.archiveLocation, v => update({ archiveLocation: v }), 'مكان الأرشفة')}

        {/* Notes */}
        {f.includes('notes') && textareaInput(form.notes, v => update({ notes: v }), 'ملاحظات مختصرة', 2)}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[250]" onClick={onClose} />
          <motion.div
            initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-[400px] max-w-[90vw] bg-slate-900 border-l border-slate-700 shadow-2xl z-[260] flex flex-col"
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b border-slate-800 ${cfg.bg}`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                  <span className="text-[10px] font-black">{cfg.shortLabel}</span>
                </div>
                <div>
                  <div className={`text-sm font-black ${cfg.color}`}>{form.name || cfg.label}</div>
                  <div className="text-slate-500 text-[10px]">{cfg.desc}</div>
                </div>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center">
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4">{renderCardFields()}</div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-900/80 backdrop-blur-sm">
              <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-400 text-xs font-medium hover:bg-slate-700">إلغاء</button>
              <button onClick={() => { if (form) onSave(form); onClose(); }}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700">
                <Save className="w-3.5 h-3.5" />حفظ
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
