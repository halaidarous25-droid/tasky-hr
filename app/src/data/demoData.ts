import type { Responsibility, AuditEntry, Step } from '@/types';
import { createEmptyStep } from '@/components/workflow/cardConfig';

// Migrate old-format steps (without cardType) to new workflow format
function migrateOldSteps(steps: Array<{ id: number; name: string; description: string; channel: string; actionType: string; notes: string }>): Step[] {
  return steps.map((s) => ({ ...createEmptyStep('process', s.id), name: s.name, description: s.description, channel: s.channel, actionType: s.actionType || 'تنفيذ', notes: s.notes }));
}

/* ============ حساب الوزن (الأهمية الاستراتيجية) ============
   الوزن = مدى أهمية المسؤولية وأثرها على المنظمة (1-5)
   يعتمد على أربعة محاور:
   1. درجة التأثير التنظيمي (40%): أثرها على عمليات المنظمة
   2. حجم الطلبات الشهرية (25%): الحجم التشغيلي الفعلي
   3. ضغط مستوى الخدمة SLA (20%): الحساسية الزمنية للتنفيذ
   4. تنوع قنوات الاستلام (15%): اتساع نطاق الخدمة
*/
function calcWeight(
  impact: string,
  avgMonthlyRequests: number,
  usedChannels: string[],
  slaHours?: number
): number {
  // 1. درجة التأثير (40%)
  const impactMap: Record<string, number> = { low: 1, medium: 2.5, high: 3.8, critical: 5 };
  const impactScore = impactMap[impact] ?? 2;

  // 2. حجم الطلبات الشهرية (25%)
  const vol = avgMonthlyRequests;
  const volumeScore =
    vol === 0 ? 1
    : vol <= 5  ? 1.5
    : vol <= 15 ? 2.5
    : vol <= 35 ? 3.2
    : vol <= 70 ? 4
    : vol <= 120 ? 4.6
    : 5;

  // 3. حساسية مستوى الخدمة SLA (20%)
  const slaScore =
    !slaHours      ? 1.5
    : slaHours <= 4  ? 5
    : slaHours <= 24 ? 4
    : slaHours <= 72 ? 3
    : slaHours <= 168 ? 2
    : 1.5;

  // 4. تنوع القنوات - نطاق الخدمة (15%)
  const chCount = usedChannels.length;
  const channelDiversityScore = Math.min(5, 1 + (chCount - 1) * 0.8);

  const raw = impactScore * 0.40 + volumeScore * 0.25 + slaScore * 0.20 + channelDiversityScore * 0.15;
  return Math.min(5, Math.max(1, Math.round(raw * 10) / 10));
}

/* ============ حساب العبء التشغيلي ============
   العبء = مدى تعقيد وكثافة تنفيذ المسؤولية (1-5)
   يعتمد على خمسة محاور:
   1. تعقيد مسار العمل (35%): عدد الخطوات والتفرعات والشروط
   2. المدة الزمنية للإنجاز (25%): الوقت المستغرق فعلياً
   3. تعدد القنوات والأنظمة (20%): عدد الأنظمة المشاركة
   4. نوع الإجراء (10%): يدوي/نظامي/مختلط
   5. تعقيد الملاحظات والمتطلبات (10%): اشتراطات خاصة
*/
function calcBurden(
  usedChannels: string[],
  steps: Responsibility['steps'],
  duration: { value: number; unit: string },
  notes?: string,
  procedureType?: string
): number {
  // 1. تعقيد مسار العمل (35%)
  const processSteps   = steps.filter(s => s.cardType === 'process').length;
  const conditionSteps = steps.filter(s => s.cardType === 'condition').length;
  const mandatorySteps = steps.filter(s => s.isMandatory).length;
  const hasApprovals   = steps.some(s => s.actionType === 'موافقة') ? 0.6 : 0;
  const hasReviews     = steps.some(s => s.actionType === 'مراجعة') ? 0.4 : 0;
  const hasFollowup    = steps.some(s => s.actionType === 'متابعة') ? 0.3 : 0;
  const workflowRaw    = 1 + processSteps * 0.35 + conditionSteps * 0.9 + mandatorySteps * 0.2 + hasApprovals + hasReviews + hasFollowup;
  const workflowScore  = Math.min(5, workflowRaw);

  // 2. المدة الزمنية بالدقائق (25%)
  let minutes = duration.value;
  if (duration.unit === 'ساعة') minutes *= 60;
  else if (duration.unit === 'يوم') minutes *= 480;
  else if (duration.unit === 'أسبوع') minutes *= 2400;
  const durationScore =
    minutes <= 15  ? 1
    : minutes <= 60  ? 1.8
    : minutes <= 240 ? 2.8
    : minutes <= 960 ? 3.8
    : minutes <= 2880 ? 4.5
    : 5;

  // 3. تعدد القنوات (20%)
  const chLen = usedChannels.length;
  const channelScore = Math.min(5, 1 + (chLen - 1) * 0.85);

  // 4. نوع الإجراء (10%)
  const typeMap: Record<string, number> = { 'آلي': 1, 'نظامي': 2, 'نظامي/يدوي': 3.5, 'يدوي': 4.5 };
  const typeScore = typeMap[procedureType ?? ''] ?? 2.5;

  // 5. تعقيد الملاحظات (10%)
  const nLen = notes?.length ?? 0;
  const notesScore = nLen === 0 ? 1 : nLen < 40 ? 2 : nLen < 120 ? 3 : nLen < 250 ? 4 : 5;

  const raw = workflowScore * 0.35 + durationScore * 0.25 + channelScore * 0.20 + typeScore * 0.10 + notesScore * 0.10;
  return Math.min(5, Math.max(1, Math.round(raw * 10) / 10));
}

/* ============ حساب الدرجة النهائية ============
   الدرجة النهائية = تقييم شامل متوازن يجمع ثلاثة محاور:
   - الوزن (الأهمية الاستراتيجية): 45%
   - العبء (التعقيد التشغيلي):      35%
   - جودة التوثيق والاكتمال:         20%

   مقياس القرار:
   1.0 - 2.0: مسؤولية بسيطة — تأثير وتعقيد محدودان
   2.1 - 3.0: مسؤولية متوسطة — تحتاج تخطيطاً منتظماً
   3.1 - 4.0: مسؤولية معقدة — تتطلب إدارة دقيقة ومتابعة
   4.1 - 5.0: مسؤولية حرجة — أولوية قصوى ومتابعة مستمرة
*/
function calcFinalGrade(weight: number, burden: number, completionPct: number): number {
  const docScore = (completionPct / 100) * 5;
  const raw = weight * 0.45 + burden * 0.35 + docScore * 0.20;
  return Math.min(5, Math.max(1, Math.round(raw * 10) / 10));
}

/* ============ حساب نسبة الاكتمال ============
   0-100% بناءً على اكتمال الحقول المطلوبة
*/
function calcCompletion(r: Partial<Responsibility>): number {
  let sc = 0;
  // البيانات الأساسية (20 نقطة)
  if (r.ownerName) sc += 5;
  if (r.name && r.name.length > 2) sc += 5;
  if (r.category && (r.category !== 'أخرى' || (r.categoryDescription && r.categoryDescription.length > 2))) sc += 5;
  if (r.description && r.description.length > 5) sc += 5;
  // القنوات والإجراء (20 نقطة)
  if (r.requestChannel) sc += 5;
  if (r.procedureType) sc += 5;
  if (r.usedChannels && r.usedChannels.length > 0) sc += 5;
  if (r.steps && r.steps.length > 0) sc += 5;
  // خطوات العمل (20 نقطة)
  if (r.steps && r.steps.length > 0) {
    let completeSteps = 0;
    r.steps.forEach((s) => { if (s.name && s.description) completeSteps++; });
    sc += Math.min(18, Math.ceil((completeSteps / r.steps.length) * 18));
    const allComplete = r.steps.every((s) => s.name && s.description && s.channel);
    if (allComplete) sc += 2;
  }
  // المراجعة والموافقة (15 نقطة)
  if (!r.needsReview || (r.needsReview && r.reviewers && r.reviewers.length > 0)) sc += 5;
  if (!r.needsApproval || (r.needsApproval && r.approvers && r.approvers.length > 0)) sc += 5;
  if (!r.needsFollowUp || (r.needsFollowUp && r.followUpMethods && r.followUpMethods.length > 0)) sc += 5;
  // المدة والمؤشرات (15 نقطة)
  if (r.completionTime && r.completionTime.duration && r.completionTime.duration.value && r.completionTime.duration.value > 0) sc += 5;
  if (r.avgMonthlyRequests !== undefined && r.avgMonthlyRequests >= 0) sc += 5;
  if (r.impact) sc += 5;
  // KPI وملاحظات (10 نقاط)
  if (r.kpi && r.kpi.length > 2) sc += 5;
  if (r.notes && r.notes.length > 3) sc += 5;
  return Math.min(100, Math.round(sc));
}

// Old-format step for demo data (gets migrated in enrichResponsibility)
interface OldStep { id: number; name: string; description: string; channel: string; actionType: string; notes: string; }
type RawResponsibility = Omit<Responsibility, 'weight' | 'burden' | 'completionPercentage' | 'documentationStatus' | 'createdAt' | 'updatedAt' | 'createdBy' | 'auditLog' | 'active' | 'finalGrade' | 'steps'> & { steps: OldStep[] };

const rawData: RawResponsibility[] = [
  { id: 1, ownerName: 'سارة أحمد', name: 'معالجة طلبات بدل السكن', category: 'البدلات والمكافآت', categoryDescription: '', description: 'استقبال ومراجعة ومعالجة طلبات بدل السكن للموظفين المستحقين وفقاً للسياسة الداخلية', requestChannel: 'اوركل', procedureType: 'تنفيذ', usedChannels: ['اوركل', 'ايميل'], steps: [{ id: 1, name: 'استلام الطلب', description: 'استلام الطلب من النظام', channel: 'اوركل', actionType: 'تنفيذ', notes: '' }, { id: 2, name: 'التحقق من المستندات', description: 'التحقق من عقد الإيجار والهوية', channel: 'ايميل', actionType: 'مراجعة', notes: '' }, { id: 3, name: 'إصدار القرار', description: 'إصدار القرار وتحديث الراتب', channel: 'اوركل', actionType: 'تنفيذ', notes: '' }], needsReview: true, reviewers: ['مدير الخدمات'], needsApproval: true, approvers: ['مدير الموارد البشرية'], needsFollowUp: true, followUpMethods: ['تقرير شهري'], completionTime: { type: 'تنفيذ الطلب', duration: { value: 3, unit: 'يوم' } }, avgMonthlyRequests: 45, impact: 'medium', kpi: 'نسبة إنجاز الطلبات في الموعد المحدد', notes: 'يتطلب التحقق من صحة العقود بشكل دوري' },
  { id: 2, ownerName: 'خالد العمري', name: 'إصدار عقود العمل', category: 'العقود', categoryDescription: '', description: 'إعداد وإصدار عقود العمل للموظفين الجدد والتجديد السنوي', requestChannel: 'أي سي تي اس', procedureType: 'تنفيذ', usedChannels: ['أي سي تي اس', 'ايميل', 'اعتماد'], steps: [{ id: 1, name: 'استلام البيانات', description: 'استلام بيانات الموظف من التعيين', channel: 'أي سي تي اس', actionType: 'تنفيذ', notes: '' }, { id: 2, name: 'صياغة العقد', description: 'صياغة العقد حسب البيانات', channel: 'ايميل', actionType: 'تنفيذ', notes: '' }, { id: 3, name: 'المراجعة القانونية', description: 'مراجعة العقد من القسم القانوني', channel: 'اعتماد', actionType: 'مراجعة', notes: '' }, { id: 4, name: 'اعتماد العقد', description: 'اعتماد العقد النهائي', channel: 'اعتماد', actionType: 'موافقة', notes: '' }], needsReview: true, reviewers: ['القسم القانوني'], needsApproval: true, approvers: ['مدير الموارد البشرية', 'المدير العام'], needsFollowUp: true, followUpMethods: ['تتبع توقيع العقد'], completionTime: { type: 'الموافقة على الطلب', duration: { value: 5, unit: 'يوم' } }, avgMonthlyRequests: 12, impact: 'high', kpi: 'نسبة العقود المنجزة دون أخطاء', notes: 'يتطلب التنسيق مع القسم القانوني' },
  { id: 3, ownerName: 'نورة الفهد', name: 'معالجة إجازات الموظفين', category: 'الإجازات', categoryDescription: '', description: 'معالجة طلبات الإجازات السنوية والمرضية والطارئة عبر النظام', requestChannel: 'اوركل', procedureType: 'تنفيذ', usedChannels: ['اوركل', 'هيلب ديسك'], steps: [{ id: 1, name: 'استلام الطلب', description: 'استلام طلب الإجازة', channel: 'اوركل', actionType: 'تنفيذ', notes: '' }, { id: 2, name: 'التحقق من الرصيد', description: 'التحقق من رصيد الإجازات المتاح', channel: 'اوركل', actionType: 'مراجعة', notes: '' }, { id: 3, name: 'موافقة المدير', description: 'إرسال الطلب للمدير المباشر', channel: 'اوركل', actionType: 'موافقة', notes: '' }], needsReview: false, reviewers: [], needsApproval: true, approvers: ['المدير المباشر'], needsFollowUp: false, followUpMethods: [], completionTime: { type: 'تنفيذ الطلب', duration: { value: 1, unit: 'يوم' } }, avgMonthlyRequests: 120, impact: 'medium', kpi: 'متوسط وقت معالجة طلب الإجازة', notes: 'يتطلب الربط مع نظام الحضور' },
  { id: 4, ownerName: 'سارة أحمد', name: 'إعداد تقرير الرواتب الشهري', category: 'الرواتب والتأمينات', categoryDescription: '', description: 'إعداد ومراجعة وإصدار تقرير الرواتب الشهري للموظفين', requestChannel: 'اوركل', procedureType: 'مراجعة', usedChannels: ['اوركل', 'ايميل', 'بنك التنمية'], steps: [{ id: 1, name: 'استخراج البيانات', description: 'استخراج بيانات الحضور والانصراف', channel: 'اوركل', actionType: 'تنفيذ', notes: '' }, { id: 2, name: 'حساب الاستحقاقات', description: 'حساب الراتب والبدلات والخصومات', channel: 'اوركل', actionType: 'تنفيذ', notes: '' }, { id: 3, name: 'المراجعة المالية', description: 'مراجعة القسم المالي', channel: 'ايميل', actionType: 'مراجعة', notes: '' }, { id: 4, name: 'التحويل البنكي', description: 'إصدار أوامر التحويل', channel: 'بنك التنمية', actionType: 'تنفيذ', notes: '' }], needsReview: true, reviewers: ['المدير المالي'], needsApproval: true, approvers: ['المدير العام'], needsFollowUp: true, followUpMethods: ['تقرير تحليلي'], completionTime: { type: 'إرسال الطلب', duration: { value: 2, unit: 'يوم' } }, avgMonthlyRequests: 1, impact: 'critical', kpi: 'دقة التقرير المالية', notes: 'حرج جداً ويتطلب دقة عالية' },
  { id: 5, ownerName: 'خالد العمري', name: 'أرشفة ملفات الموظفين', category: 'الأرشفة والتقارير', categoryDescription: '', description: 'أرشفة وتوثيق ملفات الموظفين إلكترونياً وورقياً', requestChannel: 'هيلب ديسك', procedureType: 'توزيع', usedChannels: ['هيلب ديسك', 'ايميل'], steps: [{ id: 1, name: 'استلام الملف', description: 'استلام الملف الجديد', channel: 'هيلب ديسك', actionType: 'تنفيذ', notes: '' }, { id: 2, name: 'الفهرسة', description: 'فهرسة المستندات', channel: 'ايميل', actionType: 'تنفيذ', notes: '' }], needsReview: false, reviewers: [], needsApproval: false, approvers: [], needsFollowUp: true, followUpMethods: ['جرد نصف سنوي'], completionTime: { type: 'تنفيذ الطلب', duration: { value: 4, unit: 'ساعة' } }, avgMonthlyRequests: 30, impact: 'low', kpi: 'نسبة الملفات المؤرشفة', notes: '' },
  { id: 6, ownerName: 'نورة الفهد', name: 'إصدار التعاريف الوظيفية', category: 'التعاريف', categoryDescription: '', description: 'إصدار تعاريف الراتب والتعريف الوظيفي للموظفين', requestChannel: 'رابط التعاريف', procedureType: 'تنفيذ', usedChannels: ['رابط التعاريف', 'ايميل', 'القوسي'], steps: [{ id: 1, name: 'استلام الطلب', description: 'استلام الطلب عبر الرابط', channel: 'رابط التعاريف', actionType: 'تنفيذ', notes: '' }, { id: 2, name: 'التحقق', description: 'التحقق من بيانات الموظف', channel: 'القوسي', actionType: 'مراجعة', notes: '' }, { id: 3, name: 'إصدار التعريف', description: 'طباعة وتوقيع التعريف', channel: 'ايميل', actionType: 'تنفيذ', notes: '' }], needsReview: true, reviewers: ['مدير القسم'], needsApproval: false, approvers: [], needsFollowUp: false, followUpMethods: [], completionTime: { type: 'تنفيذ الطلب', duration: { value: 1, unit: 'ساعة' } }, avgMonthlyRequests: 25, impact: 'medium', kpi: 'متوسط وقت الإصدار', notes: '' },
  { id: 7, ownerName: 'سارة أحمد', name: 'تسجيل التذاكر الطبية', category: 'التذاكر', categoryDescription: '', description: 'تسجيل ومعالجة طلبات التذاكر الطبية للموظفين وأسرهم', requestChannel: 'منصة السانق', procedureType: 'تنفيذ', usedChannels: ['منصة السانق', 'اوركل', 'ايميل'], steps: [{ id: 1, name: 'استلام الطلب', description: 'استلام عبر المنصة', channel: 'منصة السانق', actionType: 'تنفيذ', notes: '' }, { id: 2, name: 'التحقق الطبي', description: 'التحقق من التقرير الطبي', channel: 'ايميل', actionType: 'مراجعة', notes: '' }, { id: 3, name: 'الاعتماد', description: 'اعتماد التكلفة', channel: 'اوركل', actionType: 'موافقة', notes: '' }], needsReview: true, reviewers: ['الجهة الطبية'], needsApproval: true, approvers: ['مدير الخدمات'], needsFollowUp: true, followUpMethods: ['تقرير استخدام'], completionTime: { type: 'الموافقة على الطلب', duration: { value: 2, unit: 'يوم' } }, avgMonthlyRequests: 60, impact: 'high', kpi: 'نسبة الطلبات المعالجة', notes: 'يتطلب التنسيق مع الجهات الطبية' },
  { id: 8, ownerName: 'خالد العمري', name: 'معالجة نهاية الخدمة', category: 'نهاية العلاقة الوظيفية', categoryDescription: '', description: 'معالجة إجراءات نهاية الخدمة والمستحقات النهائية', requestChannel: 'اوركل', procedureType: 'تنفيذ', usedChannels: ['اوركل', 'أي سي تي اس', 'ايميل', 'اعتماد'], steps: [{ id: 1, name: 'استلام الإشعار', description: 'استلام إشعار نهاية الخدمة', channel: 'اوركل', actionType: 'تنفيذ', notes: '' }, { id: 2, name: 'حساب المستحقات', description: 'حساب الراتب والإجازات والبدلات', channel: 'أي سي تي اس', actionType: 'تنفيذ', notes: '' }, { id: 3, name: 'مراجعة الحسابات', description: 'مراجعة القسم المالي', channel: 'ايميل', actionType: 'مراجعة', notes: '' }, { id: 4, name: 'اعتماد الصرف', description: 'اعتماد صرف المستحقات', channel: 'اعتماد', actionType: 'موافقة', notes: '' }], needsReview: true, reviewers: ['المالية', 'القانونية'], needsApproval: true, approvers: ['المدير العام'], needsFollowUp: true, followUpMethods: ['تقرير ختامي'], completionTime: { type: 'الموافقة على الطلب', duration: { value: 7, unit: 'يوم' } }, avgMonthlyRequests: 3, impact: 'critical', kpi: 'دقة حساب المستحقات', notes: 'إجراء حساس ويتطلب دقة قصوى' },
  { id: 9, ownerName: 'نورة الفهد', name: 'تقييم الأداء السنوي', category: 'التقييم والأداء', categoryDescription: '', description: 'تنظيم وتفعيل عملية تقييم الأداء السنوي للموظفين', requestChannel: 'اوركل', procedureType: 'توزيع', usedChannels: ['اوركل', 'ايميل'], steps: [{ id: 1, name: 'إعداد النماذج', description: 'إعداد نماذج التقييم', channel: 'اوركل', actionType: 'تنفيذ', notes: '' }, { id: 2, name: 'توزيع النماذج', description: 'توزيع على المديرين', channel: 'ايميل', actionType: 'توزيع', notes: '' }, { id: 3, name: 'جمع النتائج', description: 'جمع النماذج المكتملة', channel: 'اوركل', actionType: 'تنفيذ', notes: '' }], needsReview: true, reviewers: ['مدير التطوير'], needsApproval: true, approvers: ['مدير الموارد البشرية'], needsFollowUp: true, followUpMethods: ['متابعة تنفيذ الخطط'], completionTime: { type: 'إرسال الطلب', duration: { value: 15, unit: 'يوم' } }, avgMonthlyRequests: 1, impact: 'high', kpi: 'نسبة إنجاز التقييم', notes: 'يتم مرة سنوياً' },
  { id: 10, ownerName: 'سارة أحمد', name: 'تغيير المسميات الوظيفية', category: 'تعيين وتغيير الوظائف', categoryDescription: '', description: 'معالجة طلبات تغيير المسمى الوظيفي والترقيات', requestChannel: 'أي سي تي اس', procedureType: 'تنفيذ', usedChannels: ['أي سي تي اس', 'اعتماد', 'ايميل'], steps: [{ id: 1, name: 'استلام الطلب', description: 'استلام الطلب والمستندات', channel: 'أي سي تي اس', actionType: 'تنفيذ', notes: '' }, { id: 2, name: 'التحقق من الشروط', description: 'التحقق من استيفاء الشروط', channel: 'ايميل', actionType: 'مراجعة', notes: '' }, { id: 3, name: 'اعتماد التغيير', description: 'اعتماد التغيير النهائي', channel: 'اعتماد', actionType: 'موافقة', notes: '' }], needsReview: true, reviewers: ['لجنة الترقيات'], needsApproval: true, approvers: ['المدير العام'], needsFollowUp: false, followUpMethods: [], completionTime: { type: 'الموافقة على الطلب', duration: { value: 10, unit: 'يوم' } }, avgMonthlyRequests: 5, impact: 'high', kpi: 'متوسط وقت معالجة الترقية', notes: '' },
  { id: 11, ownerName: 'خالد العمري', name: 'تسجيل التأمينات الاجتماعية', category: 'الرواتب والتأمينات', categoryDescription: '', description: 'تسجيل وتحديث بيانات التأمينات الاجتماعية للموظفين', requestChannel: 'بنك التنمية', procedureType: 'تنفيذ', usedChannels: ['بنك التنمية', 'اوركل'], steps: [{ id: 1, name: 'استلام البيانات', description: 'استلام البيانات الجديدة', channel: 'اوركل', actionType: 'تنفيذ', notes: '' }, { id: 2, name: 'التحديث في النظام', description: 'تحديث بيانات التأمين', channel: 'بنك التنمية', actionType: 'تنفيذ', notes: '' }], needsReview: false, reviewers: [], needsApproval: false, approvers: [], needsFollowUp: true, followUpMethods: ['تقرير شهري'], completionTime: { type: 'تنفيذ الطلب', duration: { value: 2, unit: 'ساعة' } }, avgMonthlyRequests: 20, impact: 'medium', kpi: 'دقة البيانات المسجلة', notes: '' },
  { id: 12, ownerName: 'نورة الفهد', name: 'تنسيق برامج التدريب', category: 'أخرى', categoryDescription: 'التدريب والتطوير', description: 'تنسيق وتنظيم برامج التدريب الداخلية والخارجية للموظفين', requestChannel: 'هيلب ديسك', procedureType: 'توزيع', usedChannels: ['هيلب ديسك', 'ايميل', 'منصة السانق'], steps: [{ id: 1, name: 'تحديد الاحتياج', description: 'تحديد الاحتياجات التدريبية', channel: 'هيلب ديسك', actionType: 'تنفيذ', notes: '' }, { id: 2, name: 'البحث عن برامج', description: 'البحث عن مزودي التدريب', channel: 'منصة السانق', actionType: 'تنفيذ', notes: '' }, { id: 3, name: 'التنسيق', description: 'التنسيق مع الجهات', channel: 'ايميل', actionType: 'توزيع', notes: '' }], needsReview: true, reviewers: ['مدير التطوير'], needsApproval: true, approvers: ['مدير الموارد البشرية'], needsFollowUp: true, followUpMethods: ['تقييم البرنامج'], completionTime: { type: 'إرسال الطلب', duration: { value: 5, unit: 'يوم' } }, avgMonthlyRequests: 4, impact: 'medium', kpi: 'نسبة الموظفين المدربين', notes: 'يتطلب التنسيق مع جهات خارجية' },
];

function generateAuditLog(respName: string, owner: string): AuditEntry[] {
  const actions = [
    { action: 'إنشاء', details: `تم إنشاء المسؤولية "${respName}"` },
    { action: 'تحديث', details: 'تم تحديث نسبة الاكتمال' },
    { action: 'مراجعة', details: 'تمت مراجعة الخطوات' },
    { action: 'تحديث', details: 'تم تحديث المؤشرات' },
  ];
  return actions.map((a, i) => ({
    id: `audit-${Math.random().toString(36).substr(2, 9)}`,
    date: new Date(Date.now() - i * 86400000 * 3).toLocaleDateString('ar-SA'),
    user: i === 0 ? owner : ['محمد العلي', 'فاطمة الزهراني', 'سارة أحمد'][i % 3],
    action: a.action,
    details: a.details,
  }));
}

export function enrichResponsibility(r: RawResponsibility): Responsibility {
  // Migrate steps first
  const migratedSteps = migrateOldSteps(r.steps);
  const enrichedR = { ...r, steps: migratedSteps } as Responsibility;
  const w = calcWeight(r.impact, r.avgMonthlyRequests, r.usedChannels);
  const b = calcBurden(r.usedChannels, migratedSteps, r.completionTime.duration, r.notes, r.procedureType);
  const c = calcCompletion(enrichedR);
  const fg = calcFinalGrade(w, b, c);
  const now = new Date().toLocaleDateString('ar-SA');
  return {
    ...r,
    steps: migratedSteps,
    weight: w,
    burden: b,
    completionPercentage: c,
    documentationStatus: c >= 90 ? 'مكتمل' : c >= 60 ? 'جاري' : c >= 30 ? 'ناقص' : 'مسودة',
    active: true,
    createdAt: now,
    updatedAt: now,
    createdBy: r.ownerName,
    auditLog: generateAuditLog(r.name, r.ownerName),
    finalGrade: fg,
  };
}

export const INITIAL_DATA: Responsibility[] = rawData.map(enrichResponsibility);
