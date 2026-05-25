import type { Step, CardType } from '@/types';

// ─── Card Config (4 types only) ───────────────────────────
export interface CardConfig {
  label: string; shortLabel: string;
  color: string; bg: string; border: string;
  icon: string; desc: string;
  weight: number;
  bpmnShape: string;
  fields: string[];
}

export const CARD_CONFIG: Record<CardType, CardConfig> = {
  start: {
    label: 'بداية', shortLabel: 'بداية', color: 'text-emerald-400',
    bg: 'bg-emerald-500/15', border: 'border-emerald-600/40',
    icon: 'Play', desc: 'بداية العملية', weight: 0.1,
    bpmnShape: 'terminator',
    fields: ['name','description','sourceType','channel','assignee','notes'],
  },
  process: {
    label: 'إجراء', shortLabel: 'إجراء', color: 'text-blue-400',
    bg: 'bg-blue-500/15', border: 'border-blue-600/40',
    icon: 'Settings', desc: 'خطوة عمل', weight: 0.7,
    bpmnShape: 'process',
    fields: ['name','description','channel','actionType','assignee','notes'],
  },
  condition: {
    label: 'شرط', shortLabel: 'شرط', color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-500/15', border: 'border-fuchsia-600/40',
    icon: 'GitBranch', desc: 'شرط مع خيارات', weight: 1.0,
    bpmnShape: 'decision',
    fields: ['name','description','conditionQuestion','conditionType','conditionOptions','assignee','channel','notes'],
  },
  end: {
    label: 'نهاية', shortLabel: 'نهاية', color: 'text-red-400',
    bg: 'bg-red-500/15', border: 'border-red-600/40',
    icon: 'Flag', desc: 'نهاية العملية', weight: 0.1,
    bpmnShape: 'terminator',
    fields: ['name','description','finalStatus','notifyRequester','archive','archiveLocation','notes'],
  },
};

// ─── Palette (4 types) ────────────────────────────────────
export const ELEMENT_PALETTE: { type: CardType; section: string }[] = [
  { type: 'start', section: 'terminators' },
  { type: 'end', section: 'terminators' },
  { type: 'process', section: 'process' },
  { type: 'condition', section: 'condition' },
];

export const PALETTE_SECTIONS: Record<string, { label: string }> = {
  terminators: { label: 'بداية / نهاية' },
  process: { label: 'إجراء' },
  condition: { label: 'شرط' },
};

// ─── Dropdown Options ─────────────────────────────────────
export const HR_CHANNELS = ['Oracle','Email','Help Desk','ICTS','منصة اعتماد','GOSI / القوسي','رابط إلكتروني','منصة السانق','بنك التنمية','نظام داخلي','أخرى'];
export const ACTION_TYPES = ['استلام','مراجعة','تحقق','تنفيذ','إرسال','إشعار','أرشفة','تحديث نظام','متابعة','موافقة'];
export const SOURCE_TYPES = ['الموظف رافع الطلب','المدير المباشر','إدارة الموارد البشرية','إدارة أخرى','جهة خارجية','نظام آلي','أخرى'];
export const PERFORMER_OPTIONS = ['صاحب المسؤولية','أخصائي HR','المدير المباشر','مدير HR','موظف محدد','فريق HR','دور وظيفي','إدارة أخرى','نظام آلي'];
export const FINAL_STATUSES = ['مكتمل','مرفوض','معاد للتعديل','مغلق','مؤرشف'];

// ─── Empty Step Factory ───────────────────────────────────
export function createEmptyStep(cardType: CardType, id: number): Step {
  return {
    id,
    name: '',
    description: '',
    channel: '',
    actionType: cardType === 'process' ? 'تنفيذ' : '',
    notes: '',
    cardType,
    assignee: '',
    isMandatory: true,
    x: 100 + Math.random() * 200,
    y: 100 + Math.random() * 100,
    nextIds: [],
    conditionQuestion: '',
    conditionType: 'yes_no',
    conditionOptions: cardType === 'condition' ? [
      { id: 'yes', label: 'نعم', nextId: null },
      { id: 'no', label: 'لا', nextId: null },
    ] : [],
    sourceType: '',
    finalStatus: 'مكتمل',
    notifyRequester: true,
    archive: false,
    archiveLocation: '',
  };
}

// ─── Smart Burden Calculator (no duration) ────────────────
export interface BurdenResult {
  score: number; label: string; reason: string;
}

export function calculateSmartBurden(steps: Step[]): BurdenResult {
  const workSteps = steps.filter(s => s.cardType !== 'start' && s.cardType !== 'end');
  const n = workSteps.length;
  if (n === 0) return { score: 1, label: 'منخفض جداً', reason: 'لا توجد خطوات' };
  let totalWeight = 0;
  let conditionCount = 0;
  let channelSet = new Set<string>();
  for (const s of steps) {
    if (s.cardType === 'start' || s.cardType === 'end') continue;
    totalWeight += CARD_CONFIG[s.cardType].weight;
    if (s.cardType === 'condition') conditionCount++;
    if (s.channel) channelSet.add(s.channel);
  }
  const avgWeight = totalWeight / n;
  const raw = (avgWeight * 2) + Math.min(1.5, channelSet.size * 0.3) + Math.min(1.5, conditionCount * 0.5);
  const score = Math.min(5, Math.max(1, Math.round(raw * 10) / 10));
  let label = 'متوسط';
  if (score <= 1.5) label = 'منخفض جداً';
  else if (score <= 2.5) label = 'منخفض';
  else if (score <= 3.5) label = 'متوسط';
  else if (score <= 4.5) label = 'عالي';
  else label = 'حرج';
  return { score, label, reason: `${n} خطوة${conditionCount ? `، ${conditionCount} شرط` : ''}${channelSet.size ? `، ${channelSet.size} قنوات` : ''}` };
}

// ─── Workflow Validator ───────────────────────────────────
export interface ValidationResult { isValid: boolean; errors: string[]; warnings: string[] }

export function validateWorkflow(steps: Step[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (steps.length === 0) return { isValid: false, errors: ['الـ Workflow فارغ'], warnings: [] };
  if (!steps.some(s => s.cardType === 'start')) errors.push('يجب إضافة بداية');
  const endCount = steps.filter(s => s.cardType === 'end').length;
  if (endCount === 0) errors.push('يجب إضافة نهاية واحدة على الأقل');
  for (const s of steps) {
    if (!s.name && s.cardType !== 'start' && s.cardType !== 'end') {
      warnings.push(`${CARD_CONFIG[s.cardType]?.shortLabel || 'بطاقة'} بدون اسم`);
    }
    if (s.cardType === 'condition') {
      if (!s.conditionQuestion) warnings.push(`شرط "${s.name || 'بدون اسم'}" بدون سؤال`);
      const unlinked = s.conditionOptions.filter(o => !o.nextId && o.label);
      if (unlinked.length > 0) {
        warnings.push(`خيارات غير مربوطة في "${s.name || 'شرط'}": ${unlinked.map(o => o.label).join('، ')}`);
      }
    }
  }
  return { isValid: errors.length === 0, errors, warnings };
}

// ─── Templates ────────────────────────────────────────────
export interface WorkflowTemplate {
  id: string; name: string; desc: string; steps: Step[];
}

function buildStep(cardType: CardType, id: number, overrides: Partial<Step> = {}): Step {
  return { ...createEmptyStep(cardType, id), ...overrides, cardType };
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'allowance',
    name: 'طلب بدل',
    desc: 'عملية طلب بدل للموظف',
    steps: [
      buildStep('start', 1001, { name: 'استلام طلب البدل', x: 400, y: 50, sourceType: 'الموظف رافع الطلب', channel: 'Help Desk', assignee: 'الموظف' }),
      buildStep('process', 1002, { name: 'تسجيل الطلب', x: 400, y: 160, channel: 'Help Desk', assignee: 'HR Services', actionType: 'استلام' }),
      buildStep('condition', 1003, { name: 'التحقق من الطلب', x: 400, y: 270, conditionQuestion: 'هل الطلب مكتمل ومستحق؟', assignee: 'أخصائي HR', conditionType: 'yes_no' }),
      buildStep('process', 1004, { name: 'إشعار بالرفض', x: 650, y: 380, assignee: 'HR Services', actionType: 'إشعار' }),
      buildStep('end', 1005, { name: 'إغلاق (رفض)', x: 650, y: 490, finalStatus: 'مرفوض' }),
      buildStep('process', 1006, { name: 'الموافقة على البدل', x: 150, y: 380, assignee: 'صاحب الصلاحية', actionType: 'موافقة' }),
      buildStep('process', 1007, { name: 'تحديث الرواتب', x: 150, y: 490, channel: 'Oracle', assignee: 'الرواتب', actionType: 'تحديث نظام' }),
      buildStep('process', 1008, { name: 'إشعار الموظف', x: 400, y: 490, assignee: 'HR Services', actionType: 'إشعار' }),
      buildStep('end', 1009, { name: 'مكتمل', x: 400, y: 600, finalStatus: 'مكتمل', notifyRequester: true }),
    ],
  },
  {
    id: 'new_employee',
    name: 'موظف جديد',
    desc: 'عملية استقبال موظف جديد',
    steps: [
      buildStep('start', 2001, { name: 'استلام بيانات الموظف', x: 400, y: 50, channel: 'Oracle', assignee: 'التوظيف' }),
      buildStep('process', 2002, { name: 'استلام الملف', x: 400, y: 160, channel: 'Oracle', assignee: 'HR Services', actionType: 'استلام' }),
      buildStep('condition', 2003, { name: 'هل الملف مكتمل؟', x: 400, y: 270, conditionQuestion: 'هل ملف الموظف مكتمل؟', assignee: 'أخصائي HR' }),
      buildStep('process', 2004, { name: 'إعادة لاستكمال', x: 650, y: 270, assignee: 'HR Services', actionType: 'إرسال' }),
      buildStep('process', 2005, { name: 'تسجيل الموظف', x: 150, y: 380, channel: 'Oracle', assignee: 'أخصائي HR', actionType: 'تنفيذ' }),
      buildStep('condition', 2006, { name: 'هل تمت المباشرة؟', x: 150, y: 490, conditionQuestion: 'هل الموظف باشر فعلياً؟', assignee: 'أخصائي HR' }),
      buildStep('process', 2007, { name: 'متابعة المباشرة', x: 400, y: 600, assignee: 'HR Services', actionType: 'متابعة' }),
      buildStep('process', 2008, { name: 'إضافة في الرواتب', x: 150, y: 710, channel: 'Oracle', assignee: 'الرواتب', actionType: 'تحديث نظام' }),
      buildStep('end', 2009, { name: 'مكتمل', x: 150, y: 820, finalStatus: 'مكتمل' }),
    ],
  },
  {
    id: 'certificate',
    name: 'خطاب تعريف',
    desc: 'إصدار خطاب تعريف للموظف',
    steps: [
      buildStep('start', 3001, { name: 'تقديم طلب التعريف', x: 300, y: 50, channel: 'Help Desk', assignee: 'الموظف' }),
      buildStep('process', 3002, { name: 'التحقق من البيانات', x: 300, y: 160, channel: 'Oracle', assignee: 'HR Services', actionType: 'تحقق' }),
      buildStep('condition', 3003, { name: 'هل البيانات صحيحة؟', x: 300, y: 270, conditionQuestion: 'هل بيانات الموظف صحيحة؟', assignee: 'HR Services' }),
      buildStep('process', 3004, { name: 'إصدار التعريف', x: 100, y: 380, channel: 'Oracle', assignee: 'النظام', actionType: 'تنفيذ' }),
      buildStep('process', 3005, { name: 'إرسال التعريف', x: 100, y: 490, channel: 'Email', assignee: 'النظام', actionType: 'إرسال' }),
      buildStep('end', 3006, { name: 'مكتمل', x: 100, y: 600, finalStatus: 'مكتمل' }),
      buildStep('process', 3007, { name: 'إعادة للتصحيح', x: 500, y: 380, assignee: 'HR Services', actionType: 'إرسال' }),
      buildStep('end', 3008, { name: 'مغلق', x: 500, y: 490, finalStatus: 'مغلق' }),
    ],
  },
  {
    id: 'deduction',
    name: 'خصم من الراتب',
    desc: 'عملية خصم من راتب الموظف',
    steps: [
      buildStep('start', 4001, { name: 'استلام طلب الخصم', x: 400, y: 50, channel: 'Help Desk', assignee: 'الجهة الطالبة' }),
      buildStep('process', 4002, { name: 'مراجعة سبب الخصم', x: 400, y: 160, channel: 'Help Desk', assignee: 'HR Services', actionType: 'مراجعة' }),
      buildStep('condition', 4003, { name: 'هل الخصم معتمد؟', x: 400, y: 270, conditionQuestion: 'هل الخصم معتمد ومسموح؟', assignee: 'أخصائي HR' }),
      buildStep('process', 4004, { name: 'موافقة الخصم', x: 150, y: 380, assignee: 'صاحب الصلاحية', actionType: 'موافقة' }),
      buildStep('process', 4005, { name: 'تحديث الرواتب', x: 150, y: 490, channel: 'Oracle', assignee: 'الرواتب', actionType: 'تحديث نظام' }),
      buildStep('process', 4006, { name: 'إشعار الموظف', x: 150, y: 600, assignee: 'HR Services', actionType: 'إشعار' }),
      buildStep('end', 4007, { name: 'مكتمل', x: 150, y: 710, finalStatus: 'مكتمل' }),
      buildStep('end', 4008, { name: 'مغلق', x: 650, y: 380, finalStatus: 'مغلق' }),
    ],
  },
];
