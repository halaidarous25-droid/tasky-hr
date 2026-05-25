import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Filter, ChevronUp, ChevronDown, Edit2, Trash2, Eye, Download, Upload, ClipboardList, ToggleLeft, ToggleRight, AlertTriangle, AlertOctagon, TrendingUp, Zap, Award } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { hasPermission } from '@/data/users';
import { enrichResponsibility } from '@/data/demoData';
import ProgressRing from '@/components/ProgressRing';
import StatusBadge from '@/components/StatusBadge';

const impactIcons: Record<string, { icon: React.ElementType; color: string; bg: string; shortLabel: string }> = {
  low: { icon: Zap, color: 'text-green-400', bg: 'bg-green-500/15', shortLabel: 'منخفض' },
  medium: { icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/15', shortLabel: 'متوسط' },
  high: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/15', shortLabel: 'عالي' },
  critical: { icon: AlertOctagon, color: 'text-red-400', bg: 'bg-red-500/15', shortLabel: 'حرج' },
};

const finalGradeConfig: Record<number, { color: string; bg: string; label: string }> = {
  1: { color: 'text-green-400', bg: 'bg-green-500/15', label: 'بسيطة' },
  2: { color: 'text-blue-400', bg: 'bg-blue-500/15', label: 'متوسطة' },
  3: { color: 'text-amber-400', bg: 'bg-amber-500/15', label: 'معقدة' },
  4: { color: 'text-orange-400', bg: 'bg-orange-500/15', label: 'حرجة' },
  5: { color: 'text-red-400', bg: 'bg-red-500/15', label: 'حرجة جداً' },
};

function getFinalGradeStyle(grade: number) {
  const g = Math.round(grade);
  return finalGradeConfig[g] || finalGradeConfig[3];
}

export default function ResponsibilitiesPage() {
  const { data, currentUser, navigate, setFilters, resetFilters, filters, deleteResponsibility, toggleResponsibilityActive, showToast, addResponsibility, dropdownLists } = useApp();
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = currentUser?.role === 'admin';
  const isReviewer = currentUser?.role === 'reviewer';
  const isSpecialist = currentUser?.role === 'specialist';
  const canDelete = hasPermission(currentUser, 'responsibilities', 'delete');
  const canImport = hasPermission(currentUser, 'responsibilities', 'import');

  const list = isAdmin || isReviewer ? data : data.filter((r) => r.ownerName === currentUser?.name);
  const filtered = list.filter((r) => {
    if (filters.search && !r.name.includes(filters.search) && !r.ownerName.includes(filters.search)) return false;
    if (filters.owner && r.ownerName !== filters.owner) return false;
    if (filters.category && r.category !== filters.category) return false;
    if (filters.channel && !r.usedChannels.includes(filters.channel)) return false;
    if (filters.impact && r.impact !== filters.impact) return false;
    if (filters.status && r.documentationStatus !== filters.status) return false;
    return true;
  });

  const owners = [...new Set(data.map((r) => r.ownerName))];
  const canEdit = (r: typeof data[0]) => isAdmin || isReviewer || (isSpecialist && r.documentationStatus === 'مسودة');

  const downloadTemplate = () => {
    const csv = '\uFEFFاسم صاحب المسؤولية,اسم المسؤولية,تصنيف المسؤولية,التأثير\n' +
      'سارة أحمد,مثال: معالجة طلبات,' + (dropdownLists.categories[0] || '') + ',متوسط\n' +
      'ملاحظة: التأثير يمكن أن يكون (منخفض / متوسط / عالي / حرج)\n' +
      'التصنيفات المتاحة: ' + dropdownLists.categories.join('، ');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'نموذج_مسؤوليات.csv';
    a.click();
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim());
        if (lines.length < 2) { showToast('الملف فارغ', 'error'); return; }
        let added = 0;
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim());
          if (cols.length < 4 || !cols[0] || !cols[1]) continue;
          if (cols[0].startsWith('ملاحظة') || cols[0].startsWith('التصنيفات')) continue;
          const impact = (cols[3] || 'متوسط') === 'حرج' ? 'critical' : (cols[3] || 'متوسط') === 'عالي' ? 'high' : (cols[3] || 'متوسط') === 'متوسط' ? 'medium' : 'low';
          const id = Math.max(...data.map((r) => r.id), 0) + 1 + added;
          const enriched = enrichResponsibility({ id, ownerName: cols[0], name: cols[1], category: cols[2] || dropdownLists.categories[0] || 'أخرى', categoryDescription: '', description: '', requestChannel: '', procedureType: '', usedChannels: [], steps: [], needsReview: false, reviewers: [], needsApproval: false, approvers: [], needsFollowUp: false, followUpMethods: [], completionTime: { type: dropdownLists.completionTypes[0] || 'تنفيذ الطلب', duration: { value: 1, unit: dropdownLists.durationUnits[2] || 'يوم' } }, avgMonthlyRequests: 0, impact: impact as 'low' | 'medium' | 'high' | 'critical', kpi: '', notes: '' });
          enriched.documentationStatus = 'مسودة'; enriched.completionPercentage = 0;
          addResponsibility(enriched); added++;
        }
        showToast(`تم استيراد ${added} مسؤولية`);
      } catch { showToast('خطأ في قراءة الملف', 'error'); }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const handleDelete = (id: number) => {
    if (!currentUser?.active) { showToast('حسابك غير نشط - لا يمكنك إجراء أي عملية', 'error'); return; }
    deleteResponsibility(id); setDeleteId(null); showToast('تم الحذف بنجاح');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-slate-400 text-sm">إجمالي: <span className="text-white font-bold">{filtered.filter(r => r.active).length}</span> مسؤولية نشطة</div>
        <div className="flex items-center gap-2 flex-wrap">
          {(isAdmin || isReviewer) && (
            <>
              <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-medium border border-slate-700 hover:bg-slate-700 transition-colors">
                <Download className="w-4 h-4" /><span>تنزيل نموذج</span></button>
              {canImport && (
                <>
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-medium border border-slate-700 hover:bg-slate-700 transition-colors">
                    <Upload className="w-4 h-4" /><span>تحميل من Excel</span></button>
                  <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
                </>)}
            </>)}
          {(isAdmin || isReviewer) && (
            <button onClick={() => navigate('form', null)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold hover:shadow-lg hover:shadow-emerald-900/30 transition-all">
              <Plus className="w-4 h-4" /> إضافة مسؤولية</button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type="text" placeholder="بحث..." value={filters.search} onChange={(e) => setFilters({ search: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pr-10 pl-4 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-600" />
          </div>
          <button onClick={() => setShowFiltersPanel(!showFiltersPanel)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-medium border border-slate-700 hover:bg-slate-700 transition-colors">
            <Filter className="w-4 h-4" /><span>فلترة</span>{showFiltersPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
        </div>
        {showFiltersPanel && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="flex flex-wrap gap-3 pt-2">
            <select value={filters.owner} onChange={(e) => setFilters({ owner: e.target.value })} className="bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:border-emerald-600"><option value="">كل الصاحبين</option>{owners.map((o) => <option key={o} value={o}>{o}</option>)}</select>
            <select value={filters.category} onChange={(e) => setFilters({ category: e.target.value })} className="bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:border-emerald-600"><option value="">كل التصنيفات</option>{dropdownLists.categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
            <select value={filters.impact} onChange={(e) => setFilters({ impact: e.target.value })} className="bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:border-emerald-600"><option value="">كل التأثيرات</option><option value="low">منخفض</option><option value="medium">متوسط</option><option value="high">عالي</option><option value="critical">حرج</option></select>
            <select value={filters.status} onChange={(e) => setFilters({ status: e.target.value })} className="bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:border-emerald-600"><option value="">كل الحالات</option>{dropdownLists.docStatuses.map((s) => <option key={s} value={s}>{s}</option>)}</select>
            <button onClick={resetFilters} className="px-4 py-2 rounded-xl text-slate-400 text-sm hover:text-white transition-colors">إعادة تعيين</button>
          </motion.div>)}
      </div>

      {/* Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-800/50 border-b border-slate-800">
              <th className="text-right text-slate-500 text-xs font-bold py-3.5 px-4">المسؤولية</th>
              <th className="text-right text-slate-500 text-xs font-bold py-3.5 px-4">الصاحب</th>
              <th className="text-right text-slate-500 text-xs font-bold py-3.5 px-4 hidden md:table-cell">التصنيف</th>
              <th className="text-center text-slate-500 text-xs font-bold py-3.5 px-4 hidden lg:table-cell">التأثير</th>
              <th className="text-center text-slate-500 text-xs font-bold py-3.5 px-4 hidden lg:table-cell">الوزن</th>
              <th className="text-center text-slate-500 text-xs font-bold py-3.5 px-4 hidden lg:table-cell">العبء</th>
              <th className="text-center text-slate-500 text-xs font-bold py-3.5 px-4 hidden lg:table-cell">الدرجة النهائية</th>
              <th className="text-center text-slate-500 text-xs font-bold py-3.5 px-4">الاكتمال</th>
              <th className="text-center text-slate-500 text-xs font-bold py-3.5 px-4">الحالة</th>
              <th className="text-center text-slate-500 text-xs font-bold py-3.5 px-4">نشط</th>
              <th className="text-center text-slate-500 text-xs font-bold py-3.5 px-4">إجراءات</th>
            </tr></thead>
            <tbody>
              {filtered.map((r) => {
                const impData = impactIcons[r.impact];
                const ImpIcon = impData?.icon || Zap;
                return (
                  <tr key={r.id} className={`border-b border-slate-800/50 transition-colors ${!r.active ? 'opacity-40' : 'hover:bg-slate-800/30'}`}>
                    <td className="py-3.5 px-4"><div className="text-white font-semibold text-sm">{r.name}</div></td>
                    <td className="py-3.5 px-4 text-slate-400 text-sm">{r.ownerName}</td>
                    <td className="py-3.5 px-4 text-slate-400 text-sm hidden md:table-cell">{r.category}</td>
                    <td className="py-3.5 px-4 text-center hidden lg:table-cell">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${impData?.bg || ''} ${impData?.color || ''}`}>
                        <ImpIcon className="w-3.5 h-3.5" />{impData?.shortLabel || r.impact}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center hidden lg:table-cell"><span className="text-emerald-400 font-bold text-sm">{r.weight}</span></td>
                    <td className="py-3.5 px-4 text-center hidden lg:table-cell"><span className="text-amber-400 font-bold text-sm">{r.burden}</span></td>
                    <td className="py-3.5 px-4 text-center hidden lg:table-cell">
                      {(() => { const fg = getFinalGradeStyle(r.finalGrade); return (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${fg.bg} ${fg.color}`}>
                          <Award className="w-3.5 h-3.5" />{r.finalGrade}
                        </span>
                      ); })()}
                    </td>
                    <td className="py-3.5 px-4 text-center"><ProgressRing percentage={r.completionPercentage} size={40} strokeWidth={3} /></td>
                    <td className="py-3.5 px-4 text-center"><StatusBadge status={r.documentationStatus} size="sm" /></td>
                    <td className="py-3.5 px-4 text-center">
                      {(isAdmin || isReviewer) ? (
                        <button onClick={() => { if (!currentUser?.active) { showToast('حسابك غير نشط - لا يمكنك إجراء أي عملية', 'error'); return; } toggleResponsibilityActive(r.id); showToast(r.active ? 'تم إلغاء التنشيط' : 'تم التنشيط'); }}>
                          {r.active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-slate-600" />}
                        </button>) : (<span className={`text-xs ${r.active ? 'text-emerald-500' : 'text-slate-600'}`}>{r.active ? 'نعم' : 'لا'}</span>)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => navigate('view', r.id)} className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 flex items-center justify-center transition-colors" title="عرض"><Eye className="w-3.5 h-3.5" /></button>
                        {canEdit(r) && (
                          <button onClick={() => navigate('form', r.id)} className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-blue-400 hover:bg-slate-700 flex items-center justify-center transition-colors" title="تعديل"><Edit2 className="w-3.5 h-3.5" /></button>
                        )}
                        {canDelete && (
                          <button onClick={() => setDeleteId(r.id)} className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 flex items-center justify-center transition-colors" title="حذف"><Trash2 className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-500"><ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="font-medium">لا توجد مسؤوليات</p></div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
        <h4 className="text-white font-bold text-sm mb-3">مفتاح التأثير والتقييم</h4>
        <div className="flex flex-wrap gap-4 text-xs">
          {Object.entries(impactIcons).map(([key, val]) => {
            const V = val.icon;
            return (
              <div key={key} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${val.bg}`}>
                <V className={`w-4 h-4 ${val.color}`} />
                <span className={val.color}><strong>{val.shortLabel}</strong>: {key === 'low' ? 'تأثير محدود' : key === 'medium' ? 'تأثير متوسط' : key === 'high' ? 'تأثير كبير' : 'تأثير حرج'}</span>
              </div>
            );
          })}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/15">
            <span className="text-emerald-400 font-bold">الوزن</span><span className="text-slate-400">= الأهمية (تأثير + حجم عمل)</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/15">
            <span className="text-amber-400 font-bold">العبء</span><span className="text-slate-400">= التعقيد (قنوات + خطوات + مدة)</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/15">
            <Award className="w-4 h-4 text-emerald-400" /><span className="text-emerald-400 font-bold">الدرجة النهائية</span><span className="text-slate-400">= (الوزن + العبء) ÷ 2</span>
          </div>
        </div>
      </div>

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setDeleteId(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-2">تأكيد الحذف</h3>
            <p className="text-slate-400 text-sm mb-5">هل أنت متأكد من حذف "{data.find((r) => r.id === deleteId)?.name}"؟</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors">إلغاء</button>
              <button onClick={() => handleDelete(deleteId)} className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors">تأكيد الحذف</button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
