import { useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Shield, Clock, ListChecks, Edit2, AlertTriangle, AlertOctagon, TrendingUp, Zap } from 'lucide-react';
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

  const handlePrintPDF = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const now = new Date().toLocaleDateString('ar-SA');

    // Build sections manually for a professional PDF output
    const stepsRows = r.steps.map((s, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td><strong>${s.name || '—'}</strong></td>
        <td>${s.description || '—'}</td>
        <td>${s.channel || '—'}</td>
        <td>${s.actionType || '—'}</td>
        ${s.isMandatory !== undefined ? `<td style="text-align:center">${s.isMandatory ? '✓' : '—'}</td>` : '<td>—</td>'}
      </tr>`).join('');

    const reviewSection = r.needsReview
      ? `<div class="info-row"><span class="info-label">جهات المراجعة:</span><span class="info-value">${r.reviewers.join('، ')}</span></div>` : '';
    const approvalSection = r.needsApproval
      ? `<div class="info-row"><span class="info-label">جهات الاعتماد:</span><span class="info-value">${r.approvers.join('، ')}</span></div>` : '';
    const followUpSection = r.needsFollowUp
      ? `<div class="info-row"><span class="info-label">آليات المتابعة:</span><span class="info-value">${r.followUpMethods.join('، ')}</span></div>` : '';
    const notesSection = r.notes
      ? `<div class="info-row full"><span class="info-label">ملاحظات وإشتراطات خاصة:</span><span class="info-value" style="margin-top:4px;display:block">${r.notes}</span></div>` : '';

    printWindow.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>وثيقة إجراء - ${r.name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Cairo', sans-serif; background: #fff; color: #1e293b; padding: 48px 52px; line-height: 1.9; font-size: 13px; }

  /* ── Header ── */
  .header { text-align: center; padding-bottom: 28px; margin-bottom: 36px; border-bottom: 3px solid #059669; }
  .header .logo-line { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 10px; }
  .header .logo-box { width: 52px; height: 52px; background: linear-gradient(135deg, #059669, #0d9488); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
  .header .logo-box span { color: #fff; font-size: 22px; font-weight: 900; }
  .header h1 { color: #059669; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 4px; }
  .header .doc-title { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 14px; }
  .header .meta-row { display: flex; justify-content: center; gap: 36px; font-size: 12px; color: #475569; flex-wrap: wrap; }
  .header .meta-row span strong { color: #0f172a; }

  /* ── Sections ── */
  .section { margin-bottom: 32px; page-break-inside: avoid; }
  .section-title { color: #059669; font-weight: 900; font-size: 15px; border-right: 5px solid #059669; padding: 8px 14px; margin-bottom: 16px; background: #f0fdf4; border-radius: 0 8px 8px 0; }

  /* ── Info rows ── */
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
  .info-row { display: flex; align-items: flex-start; gap: 8px; padding: 9px 12px; border-bottom: 1px solid #f1f5f9; }
  .info-row.full { grid-column: span 2; flex-direction: column; }
  .info-label { color: #64748b; font-size: 12px; font-weight: 700; min-width: 150px; white-space: nowrap; }
  .info-value { font-weight: 600; font-size: 13px; color: #0f172a; flex: 1; }

  /* ── Steps table ── */
  .steps-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12.5px; }
  .steps-table thead tr { background: linear-gradient(135deg, #059669, #0d9488); }
  .steps-table th { color: white; padding: 11px 12px; text-align: right; font-weight: 700; }
  .steps-table tr:nth-child(even) td { background: #f8fafc; }
  .steps-table td { border-bottom: 1px solid #e2e8f0; padding: 10px 12px; vertical-align: top; }
  .steps-table td.num { background: #ecfdf5; color: #059669; font-weight: 900; text-align: center; width: 36px; }

  /* ── Goal box ── */
  .goal-box { background: linear-gradient(135deg, #ecfdf5, #d1fae5); border: 1px solid #a7f3d0; border-radius: 12px; padding: 20px 24px; margin-bottom: 28px; }
  .goal-box h3 { color: #065f46; font-size: 14px; font-weight: 900; margin-bottom: 8px; }
  .goal-box p { color: #047857; font-size: 13px; line-height: 2; }

  /* ── Badges ── */
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; }
  .badge-green  { background: #d1fae5; color: #065f46; }
  .badge-amber  { background: #fef3c7; color: #92400e; }
  .badge-red    { background: #fee2e2; color: #991b1b; }
  .badge-blue   { background: #dbeafe; color: #1e40af; }
  .badge-gray   { background: #f1f5f9; color: #475569; }

  /* ── KPI box ── */
  .kpi-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; margin-top: 8px; }
  .kpi-box .kpi-label { font-size: 11px; color: #64748b; font-weight: 700; margin-bottom: 4px; }
  .kpi-box .kpi-value { font-size: 14px; color: #059669; font-weight: 800; }

  /* ── Footer ── */
  .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; color: #94a3b8; }
  .footer .sig-box { border-top: 1px solid #cbd5e1; width: 180px; text-align: center; padding-top: 6px; }

  @media print { body { padding: 0; } .section { page-break-inside: avoid; } }
</style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div class="logo-line">
      <div class="logo-box"><span>HR</span></div>
    </div>
    <h1>نظام إدارة المسؤوليات والإجراءات</h1>
    <div class="doc-title">وثيقة توصيف الإجراء الوظيفي</div>
    <div class="meta-row">
      <span>رقم الوثيقة: <strong>RESP-${String(r.id).padStart(4, '0')}</strong></span>
      <span>تاريخ الإصدار: <strong>${now}</strong></span>
      <span>حالة التوثيق: <strong style="color:#059669">${r.documentationStatus}</strong></span>
      <span>التأثير: <strong>${imp.label}</strong></span>
    </div>
  </div>

  <!-- GOAL -->
  <div class="goal-box">
    <h3>هدف الإجراء وأهميته</h3>
    <p>${r.description}</p>
  </div>

  <!-- SECTION 1: بيانات الإجراء الأساسية -->
  <div class="section">
    <div class="section-title">أولاً: بيانات الإجراء الأساسية</div>
    <div class="info-grid">
      <div class="info-row"><span class="info-label">اسم الإجراء:</span><span class="info-value">${r.name}</span></div>
      <div class="info-row"><span class="info-label">تصنيف الإجراء:</span><span class="info-value">${r.category}${r.categoryDescription ? ' — ' + r.categoryDescription : ''}</span></div>
      <div class="info-row"><span class="info-label">نوع الإجراء:</span><span class="info-value">${r.procedureType}</span></div>
      <div class="info-row"><span class="info-label">قناة استقبال الطلب:</span><span class="info-value">${r.requestChannel}</span></div>
      <div class="info-row"><span class="info-label">الأنظمة والقنوات المستخدمة:</span><span class="info-value">${r.usedChannels.join('، ')}</span></div>
      <div class="info-row"><span class="info-label">حالة التوثيق:</span><span class="info-value">${r.documentationStatus}</span></div>
    </div>
  </div>

  <!-- SECTION 2: المؤشرات التشغيلية -->
  <div class="section">
    <div class="section-title">ثانياً: المؤشرات التشغيلية والأداء</div>
    <div class="info-grid">
      <div class="info-row"><span class="info-label">المدة الزمنية للإنجاز:</span><span class="info-value">${r.completionTime.duration.value} ${r.completionTime.duration.unit} (${r.completionTime.type})</span></div>
      <div class="info-row"><span class="info-label">متوسط الطلبات الشهرية:</span><span class="info-value">${r.avgMonthlyRequests} طلب / شهر</span></div>
      <div class="info-row"><span class="info-label">مستوى التأثير التنظيمي:</span><span class="info-value">${imp.label}</span></div>
      <div class="info-row"><span class="info-label">عدد خطوات الإجراء:</span><span class="info-value">${r.steps.length} خطوة</span></div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">مؤشر الأداء الرئيسي (KPI):</div>
      <div class="kpi-value">${r.kpi || 'لم يُحدد'}</div>
    </div>
    ${notesSection}
  </div>

  <!-- SECTION 3: خطوات تنفيذ الإجراء -->
  <div class="section">
    <div class="section-title">ثالثاً: خطوات تنفيذ الإجراء</div>
    <p style="color:#475569;font-size:12px;margin-bottom:12px;">يوضح الجدول التالي التسلسل الزمني لخطوات تنفيذ الإجراء، مع تحديد القناة التنفيذية ونوع الإجراء في كل مرحلة.</p>
    <table class="steps-table">
      <thead>
        <tr>
          <th style="width:36px">#</th>
          <th>الخطوة</th>
          <th>وصف الإجراء</th>
          <th>القناة / النظام</th>
          <th>نوع الإجراء</th>
          <th style="width:70px;text-align:center">إلزامي</th>
        </tr>
      </thead>
      <tbody>${stepsRows}</tbody>
    </table>
  </div>

  <!-- SECTION 4: المراجعة والاعتماد -->
  <div class="section">
    <div class="section-title">رابعاً: مسار المراجعة والاعتماد</div>
    <p style="color:#475569;font-size:12px;margin-bottom:12px;">تُحدد هذه الفقرة الجهات المختصة بمراجعة واعتماد ومتابعة تنفيذ الإجراء ضمن الهيكل التنظيمي المعتمد.</p>
    <div class="info-grid">
      <div class="info-row">
        <span class="info-label">يستلزم مراجعة رسمية:</span>
        <span class="info-value">${r.needsReview ? 'نعم' : 'لا'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">يستلزم اعتماداً رسمياً:</span>
        <span class="info-value">${r.needsApproval ? 'نعم' : 'لا'}</span>
      </div>
      ${reviewSection}
      ${approvalSection}
      <div class="info-row">
        <span class="info-label">يستلزم متابعة دورية:</span>
        <span class="info-value">${r.needsFollowUp ? 'نعم' : 'لا'}</span>
      </div>
      ${followUpSection}
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div>
      <div>تم إعداد هذه الوثيقة بواسطة نظام إدارة المسؤوليات</div>
      <div>تاريخ الطباعة: ${now} | رقم المرجع: RESP-${String(r.id).padStart(4, '0')}</div>
    </div>
    <div style="display:flex;gap:40px">
      <div class="sig-box">المراجع</div>
      <div class="sig-box">المعتمد</div>
    </div>
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

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoSection title="البيانات الأساسية" icon={FileText}>
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
