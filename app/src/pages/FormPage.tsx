import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronLeft, Check, FileText, Workflow, ListChecks,
  ShieldCheck, Clock, BarChart3,
  Save, X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { IMPACT_DATA, STEP_LABELS } from '@/data/constants';
import type { Responsibility, Step } from '@/types';
import { enrichResponsibility } from '@/data/demoData';
import WorkflowBuilder from '@/components/workflow/WorkflowBuilder';
import { createEmptyStep } from '@/components/workflow/cardConfig';

const stepIcons = [FileText, Workflow, ListChecks, ShieldCheck, Clock, BarChart3];

const emptyResp: Omit<Responsibility, 'weight' | 'burden' | 'completionPercentage' | 'documentationStatus' | 'createdAt' | 'updatedAt' | 'createdBy' | 'auditLog' | 'active' | 'finalGrade'> = {
  id: 0, ownerName: '', name: '', category: '', categoryDescription: '', description: '',
  requestChannel: '', procedureType: '', usedChannels: [], steps: [],
  needsReview: false, reviewers: [], needsApproval: false, approvers: [],
  needsFollowUp: false, followUpMethods: [],
  completionTime: { type: 'تنفيذ الطلب', duration: { value: 1, unit: 'يوم' } },
  avgMonthlyRequests: 0, impact: 'medium', kpi: '', notes: '',
};

export default function FormPage() {
  const { selectedId, data, currentUser, navigate, addResponsibility, updateResponsibility, showToast, dropdownLists, users } = useApp();
  const isAdmin = currentUser?.role === 'admin';
  const isReviewer = currentUser?.role === 'reviewer';
  const isSpecialist = currentUser?.role === 'specialist';
  const canEditDocStatus = isAdmin || isReviewer;
  const activeUsers = users.filter((u) => u.active);
  const isEdit = !!selectedId;
  const respData = isEdit ? data.find((x) => x.id === selectedId) : null;

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ ...emptyResp });
  const [docStatus, setDocStatus] = useState<'مكتمل' | 'جاري' | 'ناقص' | 'مسودة'>('مسودة');
  const [tempReviewer, setTempReviewer] = useState('');
  const [tempApprover, setTempApprover] = useState('');
  const [tempFollowUp, setTempFollowUp] = useState('');
  // Master toggle for review/approval section visibility
  const [needsReviewApproval, setNeedsReviewApproval] = useState(() => {
    if (isEdit && respData) {
      return respData.needsReview || respData.needsApproval || respData.needsFollowUp;
    }
    return false; // Hidden by default
  });

  // Force reset when NOT in edit mode - with default values from settings
  useEffect(() => {
    if (!isEdit) {
      // Find first visible step
      const firstVisible = visibleSteps.length > 0 ? visibleSteps[0] : 1;
      setForm({ ...emptyResp, impact: defaultImpact as any });
      setDocStatus(defaultDocStatus);
      setStep(firstVisible);
      setTempReviewer('');
      setTempApprover('');
      setTempFollowUp('');
    }
  }, [isEdit]);

  useEffect(() => {
    if (isEdit && isSpecialist && respData && respData.documentationStatus !== 'مسودة') {
      showToast('لا يمكنك تعديل مسؤولية ليست بصيغة مسودة', 'error');
      navigate('responsibilities');
    }
  }, [selectedId, currentUser]);

  useEffect(() => {
    if (isEdit) {
      const r = data.find((x) => x.id === selectedId);
      if (r) {
        setForm({
          id: r.id, ownerName: r.ownerName, name: r.name, category: r.category,
          categoryDescription: r.categoryDescription || '', description: r.description,
          requestChannel: r.requestChannel, procedureType: r.procedureType,
          usedChannels: [...r.usedChannels], steps: r.steps.map((s) => ({ ...s })),
          needsReview: r.needsReview, reviewers: [...r.reviewers],
          needsApproval: r.needsApproval, approvers: [...r.approvers],
          needsFollowUp: r.needsFollowUp, followUpMethods: [...r.followUpMethods],
          completionTime: { type: r.completionTime.type, duration: { ...r.completionTime.duration } },
          avgMonthlyRequests: r.avgMonthlyRequests, impact: r.impact, kpi: r.kpi || '', notes: r.notes || '',
        });
        setDocStatus(r.documentationStatus);
      }
    }
  }, [isEdit, selectedId, data]);

  // Read step visibility from localStorage
  const stepVisibility: Record<number, boolean> = (() => {
    try { const saved = localStorage.getItem('stepVisibility'); if (saved) return JSON.parse(saved); } catch { /* ignore */ }
    return { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true };
  })();
  const visibleSteps = [1,2,3,4,5,6].filter(s => stepVisibility[s] !== false);

  // Read default impact from localStorage
  const defaultImpact = localStorage.getItem('defaultImpact') || 'medium';
  const defaultDocStatus = (localStorage.getItem('defaultDocStatus') as any) || 'مسودة';

  const enriched = enrichResponsibility(form);
  const updateField = (field: string, value: unknown) => setForm((prev) => ({ ...prev, [field]: value }));
  const toggleChannel = (ch: string) => setForm((prev) => ({ ...prev, usedChannels: prev.usedChannels.includes(ch) ? prev.usedChannels.filter((c) => c !== ch) : [...prev.usedChannels, ch] }));

  // Migrate old steps to new 5-type system
  const migrateSteps = (steps: Step[]): Step[] => {
    return steps.map((s) => {
      if (!s.cardType) {
        return { ...createEmptyStep('process', s.id), name: s.name, description: s.description, channel: s.channel, actionType: s.actionType || 'تنفيذ', notes: s.notes };
      }
      // Migrate legacy card types to new 4-type system
      const legacyMap: Record<string, string> = {
        start: 'start', action: 'process', verify: 'process', review: 'process',
        approval: 'process', send: 'process', distribute: 'process', followup: 'process',
        archive: 'process', notify: 'process', condition: 'condition', decision: 'condition',
        end: 'end',
      };
      const actionTypeMap: Record<string, string> = {
        verify: 'تحقق', review: 'مراجعة', approval: 'موافقة', send: 'إرسال',
        distribute: 'توزيع', followup: 'متابعة', archive: 'أرشفة', notify: 'إشعار',
      };
      const newCardType = (legacyMap[s.cardType] || 'process') as any;
      const newActionType = actionTypeMap[s.cardType] || s.actionType || 'تنفيذ';
      return {
        ...s,
        cardType: newCardType,
        actionType: s.cardType === 'process' ? s.actionType : newActionType,
        x: s.x || 100 + Math.random() * 300,
        y: s.y || 100 + Math.random() * 200,
        nextIds: s.nextIds || [],
        conditionQuestion: s.conditionQuestion || '',
        conditionType: 'yes_no',
        conditionOptions: s.conditionOptions || (newCardType === 'condition' ? [
          { id: 'yes', label: 'نعم', nextId: null },
          { id: 'no', label: 'لا', nextId: null },
        ] : []),
        sourceType: s.sourceType || '',
        finalStatus: s.finalStatus || 'مكتمل',
        notifyRequester: s.notifyRequester ?? true,
        archive: s.archive || false,
        archiveLocation: s.archiveLocation || '',
      };
    });
  };

  const addReviewer = () => { if (!tempReviewer) return; setForm((prev) => ({ ...prev, reviewers: [...prev.reviewers, tempReviewer] })); setTempReviewer(''); };
  const addApprover = () => { if (!tempApprover) return; setForm((prev) => ({ ...prev, approvers: [...prev.approvers, tempApprover] })); setTempApprover(''); };
  const addFollowUp = () => { if (!tempFollowUp) return; setForm((prev) => ({ ...prev, followUpMethods: [...prev.followUpMethods, tempFollowUp] })); setTempFollowUp(''); };

  const submit = () => {
    if (!currentUser?.active) { showToast('حسابك غير نشط - لا يمكنك إجراء أي عملية', 'error'); return; }
    const finalStatus = isSpecialist ? 'مسودة' : docStatus;
    const finalData = { ...enriched, documentationStatus: finalStatus };
    if (isEdit) { updateResponsibility(finalData); showToast('تم التحديث بنجاح'); }
    else { finalData.id = Math.max(...data.map((r) => r.id), 0) + 1; addResponsibility(finalData); showToast('تمت الإضافة بنجاح'); }
    navigate('responsibilities');
  };

  const renderStepContent = () => {
    switch (step) {
      case 1: return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-slate-400 text-sm font-medium mb-2">اسم صاحب المسؤولية <span className="text-red-400">*</span></label>
              <select value={form.ownerName} onChange={(e) => updateField('ownerName', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-emerald-600">
                <option value="">اختر المستخدم</option>{activeUsers.filter((u) => u.role !== 'admin').map((u) => <option key={u.id} value={u.name}>{u.name} {!u.active ? '(غير نشط)' : ''}</option>)}</select></div>
            <div><label className="block text-slate-400 text-sm font-medium mb-2">اسم المسؤولية <span className="text-red-400">*</span></label>
              <input type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="مثال: معالجة طلبات بدل السكن" className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-600" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-slate-400 text-sm font-medium mb-2">التصنيف <span className="text-red-400">*</span></label>
              <select value={form.category} onChange={(e) => updateField('category', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-emerald-600">
                <option value="">اختر</option>{dropdownLists.categories.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            {form.category === 'أخرى' && <div><label className="block text-slate-400 text-sm font-medium mb-2">وصف التصنيف <span className="text-red-400">*</span></label>
              <input type="text" value={form.categoryDescription} onChange={(e) => updateField('categoryDescription', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-emerald-600" /></div>}
          </div>
          <div><label className="block text-slate-400 text-sm font-medium mb-2">وصف المسؤولية <span className="text-red-400">*</span></label>
            <textarea rows={3} value={form.description} onChange={(e) => updateField('description', e.target.value)} placeholder="أدخل وصفاً مفصلاً..." className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-600 resize-y" /></div>
        </div>);
      case 2: return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-slate-400 text-sm font-medium mb-2">قناة الطلب <span className="text-red-400">*</span></label>
              <select value={form.requestChannel} onChange={(e) => updateField('requestChannel', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-emerald-600">
                <option value="">اختر</option>{dropdownLists.channels.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="block text-slate-400 text-sm font-medium mb-2">نوع الإجراء <span className="text-red-400">*</span></label>
              <select value={form.procedureType} onChange={(e) => updateField('procedureType', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-emerald-600">
                <option value="">اختر</option>{dropdownLists.procedureTypes.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          <div><label className="block text-slate-400 text-sm font-medium mb-3">القنوات المستخدمة <span className="text-red-400">*</span></label>
            <div className="flex flex-wrap gap-2">{dropdownLists.channels.map((ch) => (
              <button key={ch} onClick={() => toggleChannel(ch)} className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${form.usedChannels.includes(ch) ? 'bg-emerald-600/20 border-emerald-600 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                {form.usedChannels.includes(ch) && <Check className="inline w-3 h-3 ml-1" />}{ch}</button>))}</div></div>
        </div>);
      case 3: return (
        <WorkflowBuilder
          steps={migrateSteps(form.steps)}
          onChange={(newSteps) => updateField('steps', migrateSteps(newSteps))}
          channels={dropdownLists.channels}
          users={users.filter((u) => u.active).map((u) => u.name)}
          respName={form.name}
          respOwner={form.ownerName}
          respDesc={form.description}
          respChannel={form.requestChannel}
        />);
      case 4: return (
        <div className="space-y-6">
          {/* Master toggle - hidden by default */}
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
            <label className="flex items-center gap-3">
              <div onClick={() => setNeedsReviewApproval(!needsReviewApproval)} className={`relative w-14 h-8 rounded-full cursor-pointer transition-colors ${needsReviewApproval ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                <div className={`absolute top-0.5 w-7 h-7 rounded-full bg-white shadow-md transition-transform ${needsReviewApproval ? 'left-[30px]' : 'left-0.5'}`} /></div>
              <div>
                <span className="text-white font-bold text-sm">هل تحتاج هذه العملية إلى مراجعة أو موافقة؟</span>
                <p className="text-slate-500 text-xs mt-0.5">فعّل هذا الخيار إذا كانت العملية تتطلب مراجعة أو موافقة أو متابعة</p>
              </div>
            </label>
          </div>

          {/* Review/Approval/FollowUp sections - only shown when master toggle is ON */}
          {needsReviewApproval && (
            <div className="space-y-6">
              {[
                { field: 'needsReview', label: 'يحتاج مراجعة', list: form.reviewers, remove: (i: number) => updateField('reviewers', form.reviewers.filter((_, idx) => idx !== i)), add: addReviewer, temp: tempReviewer, setTemp: setTempReviewer, badgeBg: 'bg-blue-600/20', badgeText: 'text-blue-400', btnBg: 'bg-blue-600' },
                { field: 'needsApproval', label: 'يحتاج موافقة', list: form.approvers, remove: (i: number) => updateField('approvers', form.approvers.filter((_, idx) => idx !== i)), add: addApprover, temp: tempApprover, setTemp: setTempApprover, badgeBg: 'bg-purple-600/20', badgeText: 'text-purple-400', btnBg: 'bg-purple-600' },
                { field: 'needsFollowUp', label: 'يحتاج متابعة', list: form.followUpMethods, remove: (i: number) => updateField('followUpMethods', form.followUpMethods.filter((_, idx) => idx !== i)), add: addFollowUp, temp: tempFollowUp, setTemp: setTempFollowUp, badgeBg: 'bg-amber-600/20', badgeText: 'text-amber-400', btnBg: 'bg-amber-600' },
              ].map((section) => (
                <div key={section.field}>
                  <label className="flex items-center gap-3 mb-4">
                    <div onClick={() => updateField(section.field, !form[section.field as keyof typeof form])} className={`relative w-12 h-7 rounded-full cursor-pointer transition-colors ${form[section.field as keyof typeof form] ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                      <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${form[section.field as keyof typeof form] ? 'left-[26px]' : 'left-0.5'}`} /></div>
                    <span className="text-white font-medium text-sm">{section.label}</span>
                  </label>
                  {form[section.field as keyof typeof form] && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">{section.list.map((r, i) => (
                        <span key={i} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg ${section.badgeBg} ${section.badgeText} text-sm`}>{r}<button onClick={() => section.remove(i)}><X className="w-3 h-3" /></button></span>))}</div>
                      <div className="flex items-center gap-2">
                        <input type="text" value={section.temp} onChange={(e) => section.setTemp(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && section.add()} placeholder="أدخل اسم..." className="flex-1 bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-600" />
                        <button onClick={section.add} className={`px-4 py-2.5 rounded-xl ${section.btnBg} text-white text-sm font-bold hover:opacity-90`}>إضافة</button>
                      </div>
                    </div>)}
                </div>))}
            </div>
          )}
        </div>);
      case 5: return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-slate-400 text-sm font-medium mb-2">نوع الإنجاز</label>
              <select value={form.completionTime.type} onChange={(e) => updateField('completionTime', { ...form.completionTime, type: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-emerald-600">
                {dropdownLists.completionTypes.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className="block text-slate-400 text-sm font-medium mb-2">المدة</label>
              <input type="number" min={1} value={form.completionTime.duration.value} onChange={(e) => updateField('completionTime', { ...form.completionTime, duration: { ...form.completionTime.duration, value: parseInt(e.target.value) || 0 } })} className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-emerald-600" /></div>
            <div><label className="block text-slate-400 text-sm font-medium mb-2">الوحدة</label>
              <select value={form.completionTime.duration.unit} onChange={(e) => updateField('completionTime', { ...form.completionTime, duration: { ...form.completionTime.duration, unit: e.target.value } })} className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-emerald-600">
                {dropdownLists.durationUnits.map((u) => <option key={u} value={u}>{u}</option>)}</select></div>
          </div>
          <div><label className="block text-slate-400 text-sm font-medium mb-2">متوسط الطلبات الشهرية</label>
            <input type="number" min={0} value={form.avgMonthlyRequests} onChange={(e) => updateField('avgMonthlyRequests', parseInt(e.target.value) || 0)} className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-emerald-600" /></div>
          <div><label className="block text-slate-400 text-sm font-medium mb-2">التأثير</label>
            <div className="flex flex-wrap gap-3">{Object.entries(IMPACT_DATA).map(([key, val]) => (
              <button key={key} onClick={() => updateField('impact', key)} className={`px-5 py-2.5 rounded-xl text-sm font-bold border transition-all ${form.impact === key ? 'bg-emerald-600/20 border-emerald-600 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                {form.impact === key && <Check className="inline w-3 h-3 ml-1" />}{val.label}</button>))}</div></div>
          <div><label className="block text-slate-400 text-sm font-medium mb-2">مؤشر الأداء (KPI) <span className="text-red-400">*</span></label>
            <input type="text" value={form.kpi} onChange={(e) => updateField('kpi', e.target.value)} placeholder="مثال: نسبة إنجاز الطلبات في الموعد المحدد" className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-600" /></div>
          <div><label className="block text-slate-400 text-sm font-medium mb-2">ملاحظات</label>
            <textarea rows={3} value={form.notes} onChange={(e) => updateField('notes', e.target.value)} placeholder="أي ملاحظات..." className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-600 resize-y" /></div>
        </div>);
      case 6: return (
        <div className="space-y-5">
          {/* حذف نسبة الاكتمال والحالة التلقائية - عرض الوزن والعبء والدرجة النهائية فقط */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <div className="text-emerald-400 font-black text-2xl">{enriched.weight}</div>
              <div className="text-slate-500 text-xs font-medium mt-1">الوزن (من 5)</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <div className="text-amber-400 font-black text-2xl">{enriched.burden}</div>
              <div className="text-slate-500 text-xs font-medium mt-1">العبء (من 5)</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-600/20 to-teal-600/20 border border-emerald-600/50 rounded-xl p-4 text-center">
              <div className="text-emerald-400 font-black text-2xl">{enriched.finalGrade}</div>
              <div className="text-emerald-500 text-xs font-medium mt-1">الدرجة النهائية (من 5)</div>
            </div>
          </div>

          <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
            <h4 className="text-white font-bold text-sm mb-3">حالة التوثيق</h4>
            {canEditDocStatus ? (
              <div className="flex flex-wrap gap-2">{(['مسودة', 'ناقص', 'جاري', 'مكتمل'] as const).map((s) => (
                <button key={s} onClick={() => setDocStatus(s)} className={`px-5 py-2.5 rounded-xl text-sm font-bold border transition-all ${docStatus === s ? s === 'مكتمل' ? 'bg-emerald-600/20 border-emerald-600 text-emerald-400' : s === 'جاري' ? 'bg-amber-600/20 border-amber-600 text-amber-400' : 'bg-red-600/20 border-red-600 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                  {docStatus === s && <Check className="inline w-3 h-3 ml-1" />}{s}</button>))}</div>
            ) : (<div className="text-slate-400 text-sm">أنت أخصائي - سيتم حفظها كـ <span className="text-emerald-400 font-bold">مسودة</span> تلقائياً</div>)}
          </div>

          <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 space-y-4">
            <h4 className="text-emerald-400 font-bold text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4" /> تفاصيل درجات التقييم (مقياس 5)</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-sm flex-shrink-0">وزن</div>
                <div>
                  <p className="text-white font-semibold">درجة الأهمية والتأثير ({enriched.weight} من 5)</p>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                    <span className="text-emerald-400">• تأثير المسؤولية:</span> {IMPACT_DATA[form.impact]?.label} (درجة {IMPACT_DATA[form.impact]?.score} من 4)<br />
                    <span className="text-emerald-400">• حجم العمل:</span> {form.avgMonthlyRequests} طلب/شهر<br />
                    <span className="text-slate-500">الوزن = (التأثير + حجم العمل) ÷ 2</span><br />
                    كلما ارتفع التأثير وكثر الطلبات، ارتفع الوزن.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center font-bold text-sm flex-shrink-0">عبء</div>
                <div>
                  <p className="text-white font-semibold">درجة التعقيد والجهد ({enriched.burden} من 5)</p>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                    <span className="text-amber-400">• تعقيد القنوات:</span> {form.usedChannels.length} قنوات<br />
                    <span className="text-amber-400">• تعقيد الخطوات:</span> {form.steps.filter(s => s.cardType !== 'start' && s.cardType !== 'end').length} خطوات (بدون بداية ونهاية)<br />
                    <span className="text-amber-400">• تعقيد المدة:</span> {form.completionTime.duration.value} {form.completionTime.duration.unit}<br />
                    <span className="text-slate-500">العبء = (القنوات + الخطوات + المدة) ÷ 3</span><br />
                    كلما زادت العوامل، زاد العبء.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-emerald-800/20 rounded-lg border border-emerald-600/30">
                <div className="w-10 h-10 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-sm flex-shrink-0">ت</div>
                <div>
                  <p className="text-white font-semibold">الدرجة النهائية ({enriched.finalGrade} من 5)</p>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                    <span className="text-emerald-400">تقييم شامل</span> يجمع الوزن (الأهمية) والعبء (التعقيد).<br />
                    <span className="text-slate-500">الدرجة = (الوزن + العبء) ÷ 2</span><br />
                    {enriched.finalGrade <= 2 ? (<span className="text-green-400">• بسيطة:</span>) : enriched.finalGrade <= 3 ? (<span className="text-blue-400">• متوسطة:</span>) : enriched.finalGrade <= 4 ? (<span className="text-amber-400">• معقدة:</span>) : (<span className="text-red-400">• حرجة:</span>)}
                    {' '}المسؤولية {enriched.finalGrade <= 2 ? 'بسيطة نسبياً' : enriched.finalGrade <= 3 ? 'متوسطة التعقيد' : enriched.finalGrade <= 4 ? 'معقدة وتتطلب جهد كبير' : 'حرجة جداً وتتطلب اهتمام خاص'}.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>);
      default: return null;
    }
  };

  // Compute effective step index for progress
  const effectiveStepIndex = visibleSteps.indexOf(step);
  const totalVisible = visibleSteps.length;

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
      {/* شريط نسبة الاكتمال فوق الخطوات */}
      <div className="mb-4 bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-400 text-xs font-medium">نسبة اكتمال البيانات</span>
          <span className="text-emerald-400 text-sm font-bold">{enriched.completionPercentage}%</span>
        </div>
        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full transition-all duration-500"
            style={{ width: `${enriched.completionPercentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
          <span>{enriched.completionPercentage < 30 ? 'مسودة' : enriched.completionPercentage < 60 ? 'ناقص' : enriched.completionPercentage < 90 ? 'جاري' : 'مكتمل'}</span>
          <span>الحالة: {enriched.documentationStatus}</span>
        </div>
      </div>

      <div className="mb-8">
        <div className="relative">
          <div className="absolute top-5 left-8 right-8 h-0.5 bg-slate-800" />
          <div className="absolute top-5 left-8 h-0.5 bg-gradient-to-r from-emerald-600 to-teal-600 transition-all duration-500" style={{ width: totalVisible > 1 ? `${(effectiveStepIndex / (totalVisible - 1)) * 100}%` : '0%', right: '32px' }} />
          <div className="relative flex justify-between">
            {STEP_LABELS.filter(s => stepVisibility[s.id] !== false).map((s, i) => {
              const Icon = stepIcons[i];
              const isActive = step === s.id;
              const isDone = effectiveStepIndex > i;
              return (
                <button key={s.id} onClick={() => setStep(s.id)} className="flex flex-col items-center gap-2 group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/30 scale-110' : isDone ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/50' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                    {isDone ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs font-medium transition-colors ${isActive ? 'text-emerald-400' : isDone ? 'text-emerald-500' : 'text-slate-600'}`}>{s.label}</span>
                </button>);
            })}
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
            <h3 className="text-white font-bold text-lg mb-1">{STEP_LABELS[step - 1].label}</h3>
            <p className="text-slate-400 text-sm mb-5">الخطوة {step} من 6</p>
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation + Save */}
        <div className="flex items-center justify-between mt-8 pt-5 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <button onClick={() => { const idx = visibleSteps.indexOf(step); if (idx > 0) setStep(visibleSteps[idx - 1]); }} disabled={effectiveStepIndex <= 0} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 disabled:opacity-30 transition-colors">
              <ChevronRight className="w-4 h-4" />السابق</button>
            {effectiveStepIndex < totalVisible - 1 ? (
              <button onClick={() => { const idx = visibleSteps.indexOf(step); if (idx < visibleSteps.length - 1) setStep(visibleSteps[idx + 1]); }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold hover:shadow-lg transition-all">
                التالي<ChevronLeft className="w-4 h-4" /></button>
            ) : null}
          </div>
          {/* زر الحفظ يظهر في جميع الخطوات */}
          <button onClick={submit} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold hover:shadow-lg transition-all">
            <Save className="w-4 h-4" />{isEdit ? 'حفظ التعديلات' : 'حفظ المسؤولية'}</button>
        </div>
      </div>
    </motion.div>
  );
}
