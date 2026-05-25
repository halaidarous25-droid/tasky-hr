import { useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Shield, Clock, ListChecks, BarChart3, Edit2, AlertTriangle, AlertOctagon, TrendingUp, Zap, Award } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { IMPACT_DATA } from '@/data/constants';
import ProgressRing from '@/components/ProgressRing';
import StatusBadge from '@/components/StatusBadge';

const impactIcons: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  low: { icon: Zap, color: 'text-green-400', bg: 'bg-green-500/15' },
  medium: { icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/15' },
  high: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/15' },
  critical: { icon: AlertOctagon, color: 'text-red-400', bg: 'bg-red-500/15' },
};

export default function ViewPage() {
  const { selectedId, data, currentUser, navigate } = useApp();
  const printRef = useRef<HTMLDivElement>(null);
  const r = data.find((x) => x.id === selectedId);

  if (!r) return <div className="text-center py-16 text-slate-500"><FileText className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="font-medium">المسؤولية غير موجودة</p></div>;

  const isAdmin = currentUser?.role === 'admin';
  const isReviewer = currentUser?.role === 'reviewer';
  const isSpecialist = currentUser?.role === 'specialist';
  const canEdit = isAdmin || isReviewer || (isSpecialist && r.documentationStatus === 'مسودة');
  const showAuditLog = isAdmin || isReviewer;
  const imp = IMPACT_DATA[r.impact] || { label: '', color: '', score: 0 };
  const ImpIcon = impactIcons[r.impact]?.icon || Zap;

  // Weight breakdown
  let volumeScore = 1;
  if (r.avgMonthlyRequests >= 101) volumeScore = 5;
  else if (r.avgMonthlyRequests >= 61) volumeScore = 4;
  else if (r.avgMonthlyRequests >= 31) volumeScore = 3;
  else if (r.avgMonthlyRequests >= 11) volumeScore = 2;
  else if (r.avgMonthlyRequests >= 1) volumeScore = 1;

  // Burden breakdown
  const chLen = r.usedChannels.length;
  const channelScore = chLen >= 7 ? 5 : chLen >= 5 ? 4 : chLen >= 3 ? 3 : chLen >= 2 ? 2 : 1;
  const stLen = r.steps.length;
  const stepScore = stLen >= 9 ? 5 : stLen >= 7 ? 4 : stLen >= 5 ? 3 : stLen >= 3 ? 2 : 1;
  let dm = 0;
  if (r.completionTime.duration.unit === 'دقيقة') dm = r.completionTime.duration.value;
  else if (r.completionTime.duration.unit === 'ساعة') dm = r.completionTime.duration.value * 60;
  else if (r.completionTime.duration.unit === 'يوم') dm = r.completionTime.duration.value * 480;
  const durationScore = dm >= 2880 ? 5 : dm >= 1440 ? 4 : dm >= 480 ? 3 : dm >= 120 ? 2 : dm >= 30 ? 1.5 : 1;

  const handlePrintPDF = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const content = printRef.current.innerHTML;
    const now = new Date().toLocaleDateString('ar-SA');
    printWindow.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>تقرير إجراء - ${r.name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Cairo', sans-serif; background: #fff; color: #1e293b; padding: 40px; line-height: 1.8; }
  .header { text-align: center; border-bottom: 4px double #059669; padding-bottom: 25px; margin-bottom: 35px; }
  .header h1 { color: #059669; font-size: 26px; font-weight: 800; margin-bottom: 8px; }
  .header .subtitle { color: #64748b; font-size: 14px; }
  .header .meta { display: flex; justify-content: center; gap: 30px; margin-top: 15px; font-size: 13px; color: #475569; }
  .section { margin-bottom: 30px; page-break-inside: avoid; }
  .section-title { color: #059669; font-weight: 800; font-size: 17px; border-right: 5px solid #059669; padding-right: 12px; margin-bottom: 18px; display: flex; align-items: center; gap: 8px; }
  .section-title svg, .section-title .icon { width: 20px; height: 20px; }
  .info-row { display: flex; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
  .info-row.full { flex-direction: column; }
  .info-label { color: #64748b; font-size: 13px; font-weight: 600; min-width: 140px; }
  .info-value { font-weight: 700; font-size: 14px; color: #0f172a; flex: 1; }
  .steps-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  .steps-table th { background: linear-gradient(135deg, #059669, #0d9488); color: white; padding: 12px; text-align: right; font-size: 13px; font-weight: 700; }
  .steps-table td { border-bottom: 1px solid #e2e8f0; padding: 12px; font-size: 13px; }
  .steps-table td.num { background: #ecfdf5; color: #059669; font-weight: 800; text-align: center; width: 40px; }
  .score-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
  .score-card { background: linear-gradient(135deg, #f8fafc, #f1f5f9); border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; text-align: center; }
  .score-card .score-value { font-size: 28px; font-weight: 900; color: #059669; }
  .score-card .score-label { font-size: 12px; color: #64748b; margin-top: 5px; }
  .score-card.burden .score-value { color: #d97706; }
  .detail-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; margin-top: 12px; }
  .detail-box h5 { font-size: 13px; color: #059669; font-weight: 700; margin-bottom: 10px; }
  .detail-box.burden h5 { color: #d97706; }
  .detail-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
  .detail-row .label { color: #64748b; }
  .detail-row .value { font-weight: 700; }
  .detail-row.total { border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 8px; }
  .detail-row.total .label, .detail-row.total .value { color: #059669; font-weight: 800; }
  .detail-row.total.burden .label, .detail-row.total.burden .value { color: #d97706; }
  .badge { display: inline-block; padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; }
  .badge-green { background: #d1fae5; color: #065f46; }
  .badge-amber { background: #fef3c7; color: #92400e; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .badge-blue { background: #dbeafe; color: #1e40af; }
  .badge-gray { background: #f1f5f9; color: #475569; }
  .goal-box { background: linear-gradient(135deg, #ecfdf5, #d1fae5); border: 1px solid #a7f3d0; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
  .goal-box h3 { color: #065f46; font-size: 15px; font-weight: 800; margin-bottom: 8px; }
  .goal-box p { color: #047857; font-size: 13px; line-height: 2; }
  .print-only { display: block !important; }
  @media print { body { padding: 0; } .no-print { display: none !important; } .section { page-break-inside: avoid; } }
</style>
</head>
<body>
  <div class="header">
    <h1>تقرير إجراءات وأنظمة المسؤولية</h1>
    <p class="subtitle">Departmental Policy & Procedures System</p>
    <div class="meta">
      <span>رقم الملف: <strong>RESP-${String(r.id).padStart(4, '0')}</strong></span>
      <span>التاريخ: <strong>${now}</strong></span>
      <span>الحالة: <strong style="color:#059669">${r.documentationStatus}</strong></span>
    </div>
  </div>
  ${content}
  <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#94a3b8;">
    تم إنشاء هذا التقرير بواسطة نظام إدارة المسؤوليات | ${now}
  </div>
</body>
</html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('responsibilities')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors border border-slate-700">
          <ArrowLeft className="w-4 h-4" />العودة</button>
        <div className="flex gap-2">
          {canEdit && (
            <button onClick={() => navigate('form', r.id)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors">
              <Edit2 className="w-4 h-4" />تعديل</button>
          )}
          <button onClick={handlePrintPDF} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors border border-slate-700">
            <FileText className="w-4 h-4" />طباعة / PDF</button>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div ref={printRef}>
          {/* Title */}
          <div className="text-center border-b border-slate-800 pb-6 mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-black text-white">{r.name}</h1>
            <div className="flex items-center justify-center gap-4 mt-3 flex-wrap">
              <span className="text-slate-400 text-sm">رقم: <strong className="text-emerald-400">RESP-{String(r.id).padStart(4, '0')}</strong></span>
              <span className="text-slate-700">|</span>
              <span className="text-slate-400 text-sm">التاريخ: <strong className="text-white">{new Date().toLocaleDateString('ar-SA')}</strong></span>
              <span className="text-slate-700">|</span>
              <span className="text-slate-400 text-sm">الصاحب: <strong className="text-white">{r.ownerName}</strong></span>
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
              <StatusBadge status={r.documentationStatus} />
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${impactIcons[r.impact]?.bg || ''} ${impactIcons[r.impact]?.color || ''}`}>
                <ImpIcon className="w-3.5 h-3.5" />التأثير: {imp.label}</span>
              {r.active ? <span className="inline-flex px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 text-xs font-bold">نشط</span> : <span className="inline-flex px-2.5 py-1 rounded-lg bg-red-600/20 text-red-400 text-xs font-bold">غير نشط</span>}
            </div>
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between bg-slate-800/50 rounded-xl p-4 mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <ProgressRing percentage={r.completionPercentage} size={56} strokeWidth={4} />
              <div>
                <div className="text-white font-bold text-sm">نسبة اكتمال الملف</div>
                <div className="text-slate-400 text-xs">{r.documentationStatus === 'مكتمل' ? 'ملف مكتمل وموثق' : r.documentationStatus === 'جاري' ? 'جاري التوثيق' : r.documentationStatus === 'ناقص' ? 'ملف ناقص' : 'مسودة'}</div>
              </div>
            </div>
            <StatusBadge status={r.documentationStatus} />
          </div>

          {/* Goal section for PDF */}
          <div className="hidden print-only" style={{ display: 'none' }}>
            <div className="goal-box">
              <h3>هدف المسؤولية</h3>
              <p>{r.description}</p>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoSection title="البيانات الأساسية" icon={FileText}>
              <InfoRow label="الصاحب" value={r.ownerName} />
              <InfoRow label="التصنيف" value={r.category} />
              {r.categoryDescription && <InfoRow label="وصف التصنيف" value={r.categoryDescription} />}
              <InfoRow label="الوصف" value={r.description} full />
            </InfoSection>

            <InfoSection title="القنوات والإجراء" icon={Shield}>
              <InfoRow label="قناة الطلب" value={r.requestChannel} />
              <InfoRow label="نوع الإجراء" value={r.procedureType} />
              <InfoRow label="القنوات المستخدمة" value={r.usedChannels.join('، ')} />
            </InfoSection>

            <InfoSection title="خطوات العمل" icon={ListChecks}>
              <div className="space-y-3">
                {r.steps.map((s, i) => (
                  <div key={s.id} className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-md bg-emerald-600/20 text-emerald-400 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                      <span className="text-white font-semibold text-sm">{s.name}</span>
                    </div>
                    <p className="text-slate-400 text-sm mr-8">{s.description}</p>
                    <div className="text-slate-500 text-xs mr-8 mt-1">القناة: {s.channel || '—'} | النوع: {s.actionType}</div>
                  </div>
                ))}
              </div>
            </InfoSection>

            <InfoSection title="المراجعة والموافقة" icon={Shield}>
              <InfoRow label="يحتاج مراجعة" value={r.needsReview ? 'نعم' : 'لا'} />
              {r.needsReview && <InfoRow label="المراجعون" value={r.reviewers.join('، ')} />}
              <InfoRow label="يحتاج موافقة" value={r.needsApproval ? 'نعم' : 'لا'} />
              {r.needsApproval && <InfoRow label="المعتمدون" value={r.approvers.join('، ')} />}
              <InfoRow label="يحتاج متابعة" value={r.needsFollowUp ? 'نعم' : 'لا'} />
              {r.needsFollowUp && <InfoRow label="طرق المتابعة" value={r.followUpMethods.join('، ')} />}
            </InfoSection>

            <InfoSection title="المدة والمؤشرات" icon={Clock}>
              <InfoRow label="نوع الإنجاز" value={r.completionTime.type} />
              <InfoRow label="المدة" value={`${r.completionTime.duration.value} ${r.completionTime.duration.unit}`} />
              <InfoRow label="متوسط الطلبات الشهرية" value={String(r.avgMonthlyRequests)} />
              <InfoRow label="التأثير" value={imp.label} />
              <InfoRow label="KPI" value={r.kpi} />
              {r.notes && <InfoRow label="ملاحظات" value={r.notes} full />}
            </InfoSection>

            <InfoSection title="التحليل والتقييم" icon={BarChart3}>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <div className="text-emerald-400 font-black text-xl">{r.weight}</div>
                  <div className="text-slate-500 text-xs font-medium mt-1">الوزن (من 5)</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <div className="text-amber-400 font-black text-xl">{r.burden}</div>
                  <div className="text-slate-500 text-xs font-medium mt-1">العبء (من 5)</div>
                </div>
                <div className="bg-emerald-600/10 border border-emerald-600/30 rounded-lg p-3 text-center">
                  <div className="text-emerald-400 font-black text-xl flex items-center justify-center gap-1"><Award className="w-5 h-5" />{r.finalGrade}</div>
                  <div className="text-emerald-500 text-xs font-medium mt-1">الدرجة النهائية (من 5)</div>
                </div>
              </div>

              <div className="bg-slate-800/30 rounded-lg p-3 mb-3">
                <h5 className="text-emerald-400 font-bold text-xs mb-2">تفاصيل الوزن</h5>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-slate-500">درجة التأثير ({imp.label}):</span><span className="text-white">{imp.score} من 4</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">حجم العمل ({r.avgMonthlyRequests} طلب/شهر):</span><span className="text-white">{volumeScore} من 5</span></div>
                  <div className="flex justify-between border-t border-slate-700/50 pt-1 mt-1"><span className="text-emerald-400 font-bold">الوزن النهائي:</span><span className="text-emerald-400 font-bold">{r.weight} من 5</span></div>
                </div>
                <p className="text-slate-500 text-[10px] mt-2">الوزن يعكس أهمية المسؤولية. كلما ارتفع، زاد تأثيرها على المنظمة.</p>
              </div>

              <div className="bg-slate-800/30 rounded-lg p-3">
                <h5 className="text-amber-400 font-bold text-xs mb-2">تفاصيل العبء</h5>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-slate-500">تعقيد القنوات ({r.usedChannels.length}):</span><span className="text-white">{channelScore} من 5</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">تعقيد الخطوات ({r.steps.length}):</span><span className="text-white">{stepScore} من 5</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">تعقيد المدة ({r.completionTime.duration.value} {r.completionTime.duration.unit}):</span><span className="text-white">{durationScore} من 5</span></div>
                  <div className="flex justify-between border-t border-slate-700/50 pt-1 mt-1"><span className="text-amber-400 font-bold">العبء النهائي:</span><span className="text-amber-400 font-bold">{r.burden} من 5</span></div>
                </div>
                <p className="text-slate-500 text-[10px] mt-2">العبء يعكس صعوبة التنفيذ. كلما ارتفع، زاد الجهد المطلوب.</p>
              </div>

              <div className="bg-emerald-600/10 border border-emerald-600/30 rounded-lg p-3 mt-3">
                <h5 className="text-emerald-400 font-bold text-xs mb-2 flex items-center gap-1"><Award className="w-3.5 h-3.5" />الدرجة النهائية</h5>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-slate-500">الوزن:</span><span className="text-white">{r.weight} من 5</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">العبء:</span><span className="text-white">{r.burden} من 5</span></div>
                  <div className="flex justify-between border-t border-emerald-700/30 pt-1 mt-1"><span className="text-emerald-400 font-bold">الدرجة النهائية:</span><span className="text-emerald-400 font-bold">{r.finalGrade} من 5</span></div>
                </div>
                <p className="text-slate-500 text-[10px] mt-2">
                  {r.finalGrade <= 2 ? 'مسؤولية بسيطة: تأثير وتعقيد محدودان.' : r.finalGrade <= 3 ? 'مسؤولية متوسطة: تحتاج لاهتمام وتخطيط.' : r.finalGrade <= 4 ? 'مسؤولية معقدة: تتطلب جهد كبير وإدارة دقيقة.' : 'مسؤولية حرجة جداً: أولوية قصوى وتحتاج متابعة مستمرة.'}
                </p>
              </div>
            </InfoSection>
          </div>

          {/* Audit Log - Admin/Reviewer only */}
          {showAuditLog && (
            <div className="mt-6 pt-6 border-t border-slate-800">
              <h3 className="text-white font-bold text-sm mb-4">سجل التدقيق</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-slate-800">
                    <th className="text-right text-slate-500 text-xs font-bold py-2 px-3">التاريخ</th>
                    <th className="text-right text-slate-500 text-xs font-bold py-2 px-3">المستخدم</th>
                    <th className="text-right text-slate-500 text-xs font-bold py-2 px-3">الإجراء</th>
                    <th className="text-right text-slate-500 text-xs font-bold py-2 px-3">التفاصيل</th>
                  </tr></thead>
                  <tbody>
                    {r.auditLog?.map((log) => (
                      <tr key={log.id} className="border-b border-slate-800/50">
                        <td className="py-2 px-3 text-slate-400 text-sm">{log.date}</td>
                        <td className="py-2 px-3 text-white text-sm">{log.user}</td>
                        <td className="py-2 px-3"><span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${log.action === 'إنشاء' ? 'bg-emerald-600/20 text-emerald-400' : log.action === 'تحديث' ? 'bg-blue-600/20 text-blue-400' : 'bg-amber-600/20 text-amber-400'}`}>{log.action}</span></td>
                        <td className="py-2 px-3 text-slate-400 text-sm">{log.details}</td>
                      </tr>
                    )) || <tr><td colSpan={4} className="py-6 text-center text-slate-500 text-sm">لا يوجد سجل</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function InfoSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
    <h4 className="text-emerald-400 font-bold text-sm mb-3 flex items-center gap-2"><Icon className="w-4 h-4" />{title}</h4>
    {children}
  </div>;
}

function InfoRow({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return <div className={`py-2 ${full ? '' : 'flex items-center gap-2'}`}>
    <span className="text-slate-500 text-xs font-medium whitespace-nowrap">{label}:</span>
    <span className={`text-white text-sm ${full ? 'block mt-1' : ''}`}>{value || '—'}</span>
  </div>;
}
