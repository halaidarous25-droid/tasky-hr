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

/*
  كل قالب يحتوي على:
  - بطاقة بداية واحدة
  - خطوات إجراء واقعية مع وصف وقناة وجهة مسؤولة
  - نقاط تفرع مرتبطة (conditionOptions.nextId محدد)
  - بطاقات نهاية بحالات مختلفة
  - nextIds مربوطة بشكل صحيح بين الخطوات
*/
export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [

  // ────────────────────────────────────────────────────────────
  //  1. طلب إجازة
  // ────────────────────────────────────────────────────────────
  {
    id: 'leave_request',
    name: 'طلب إجازة',
    desc: 'إجراء معالجة طلبات الإجازة السنوية والمرضية والطارئة',
    steps: [
      buildStep('start',     1001, {
        name: 'استلام طلب الإجازة',
        description: 'يقدّم الموظف طلب الإجازة عبر نظام أوركل مع تحديد نوع الإجازة والتواريخ المطلوبة',
        sourceType: 'الموظف رافع الطلب', channel: 'Oracle', assignee: 'الموظف',
        isMandatory: true, x: 300, y: 50, nextIds: [1002],
      }),
      buildStep('process',   1002, {
        name: 'التحقق من رصيد الإجازات',
        description: 'يتحقق النظام آلياً من رصيد الإجازات المتاح للموظف ومدى كفايته للطلب المقدَّم',
        channel: 'Oracle', assignee: 'النظام الآلي', actionType: 'تحقق',
        isMandatory: true, x: 300, y: 170, nextIds: [1003],
      }),
      buildStep('condition', 1003, {
        name: 'هل الرصيد كافٍ؟',
        description: 'التحقق من توفر رصيد إجازات كافٍ يغطي مدة الطلب',
        conditionQuestion: 'هل رصيد إجازات الموظف كافٍ لتغطية الطلب؟',
        assignee: 'النظام الآلي', conditionType: 'yes_no',
        conditionOptions: [
          { id: 'yes', label: 'نعم — رصيد كافٍ', nextId: 1004 },
          { id: 'no',  label: 'لا — رصيد غير كافٍ', nextId: 1007 },
        ],
        isMandatory: true, x: 300, y: 290, nextIds: [],
      }),
      buildStep('process',   1004, {
        name: 'إرسال الطلب للمدير المباشر',
        description: 'يُحال الطلب تلقائياً للمدير المباشر للموظف للموافقة أو الرفض عبر النظام',
        channel: 'Oracle', assignee: 'المدير المباشر', actionType: 'موافقة',
        isMandatory: true, x: 100, y: 410, nextIds: [1005],
      }),
      buildStep('condition', 1005, {
        name: 'موافقة المدير المباشر',
        description: 'اتخاذ المدير قرار الموافقة أو الرفض وفقاً لمتطلبات العمل وجداول الدوام',
        conditionQuestion: 'هل وافق المدير المباشر على طلب الإجازة؟',
        assignee: 'المدير المباشر', conditionType: 'yes_no',
        conditionOptions: [
          { id: 'yes', label: 'موافقة', nextId: 1006 },
          { id: 'no',  label: 'رفض',    nextId: 1007 },
        ],
        isMandatory: true, x: 100, y: 530, nextIds: [],
      }),
      buildStep('process',   1006, {
        name: 'تحديث رصيد الإجازة في النظام',
        description: 'يُحدَّث رصيد الإجازات آلياً في نظام أوركل ويُصدَر قرار الإجازة الرسمي',
        channel: 'Oracle', assignee: 'النظام الآلي', actionType: 'تحديث نظام',
        isMandatory: true, x: 100, y: 650, nextIds: [1009],
      }),
      buildStep('process',   1007, {
        name: 'إشعار الموظف بالرفض',
        description: 'يُرسَل إشعار رسمي للموظف يُبيّن سبب رفض الطلب مع توضيح إمكانية إعادة التقديم',
        channel: 'Oracle', assignee: 'النظام الآلي', actionType: 'إشعار',
        isMandatory: true, x: 500, y: 410, nextIds: [1008],
      }),
      buildStep('end',       1008, {
        name: 'إنهاء — مرفوض',
        description: 'أُغلق الطلب بحالة مرفوض',
        finalStatus: 'مرفوض', notifyRequester: true,
        x: 500, y: 530, nextIds: [],
      }),
      buildStep('process',   1009, {
        name: 'إشعار الموظف بالموافقة',
        description: 'يُرسَل إشعار للموظف بتأكيد الموافقة على الإجازة مع تفاصيل مدتها وتواريخها',
        channel: 'Oracle', assignee: 'النظام الآلي', actionType: 'إشعار',
        isMandatory: true, x: 100, y: 770, nextIds: [1010],
      }),
      buildStep('end',       1010, {
        name: 'إنهاء — مكتمل',
        description: 'اكتملت معالجة طلب الإجازة بنجاح',
        finalStatus: 'مكتمل', notifyRequester: true,
        x: 100, y: 890, nextIds: [],
      }),
    ],
  },

  // ────────────────────────────────────────────────────────────
  //  2. استحقاقات موظف جديد
  // ────────────────────────────────────────────────────────────
  {
    id: 'new_employee',
    name: 'استحقاقات موظف جديد',
    desc: 'إجراء تسجيل واستحقاقات الموظف الجديد عند المباشرة',
    steps: [
      buildStep('start',     2001, {
        name: 'استلام ملف الموظف الجديد',
        description: 'يُحال ملف الموظف من قسم التوظيف إلى خدمات الموارد البشرية مع كافة الوثائق المطلوبة',
        sourceType: 'إدارة أخرى', channel: 'ICTS', assignee: 'قسم التوظيف',
        isMandatory: true, x: 300, y: 50, nextIds: [2002],
      }),
      buildStep('process',   2002, {
        name: 'مراجعة اكتمال الوثائق',
        description: 'يراجع الأخصائي جميع الوثائق المطلوبة: الهوية الوطنية، المؤهل العلمي، عقد العمل، صور شخصية',
        channel: 'ICTS', assignee: 'أخصائي HR', actionType: 'مراجعة',
        isMandatory: true, x: 300, y: 170, nextIds: [2003],
      }),
      buildStep('condition', 2003, {
        name: 'هل الوثائق مكتملة؟',
        description: 'التأكد من اكتمال جميع الوثائق الرسمية المطلوبة لإتمام التسجيل',
        conditionQuestion: 'هل جميع الوثائق المطلوبة موجودة وصحيحة؟',
        assignee: 'أخصائي HR', conditionType: 'yes_no',
        conditionOptions: [
          { id: 'yes', label: 'مكتملة', nextId: 2004 },
          { id: 'no',  label: 'ناقصة',  nextId: 2008 },
        ],
        isMandatory: true, x: 300, y: 290, nextIds: [],
      }),
      buildStep('process',   2004, {
        name: 'تسجيل الموظف في النظام',
        description: 'إنشاء ملف الموظف في نظام أوركل وتعبئة جميع بياناته الشخصية والوظيفية والبنكية',
        channel: 'Oracle', assignee: 'أخصائي HR', actionType: 'تنفيذ',
        isMandatory: true, x: 100, y: 410, nextIds: [2005],
      }),
      buildStep('process',   2005, {
        name: 'إضافة الموظف في مسير الرواتب',
        description: 'ربط الموظف بمسير الرواتب المعتمد وتحديد مكونات الراتب والبدلات المستحقة',
        channel: 'Oracle', assignee: 'أخصائي الرواتب', actionType: 'تحديث نظام',
        isMandatory: true, x: 100, y: 530, nextIds: [2006],
      }),
      buildStep('process',   2006, {
        name: 'تسجيل في التأمينات الاجتماعية',
        description: 'رفع بيانات التسجيل في منظومة التأمينات الاجتماعية وفق الأنظمة المعمول بها',
        channel: 'GOSI / القوسي', assignee: 'أخصائي HR', actionType: 'تنفيذ',
        isMandatory: true, x: 100, y: 650, nextIds: [2007],
      }),
      buildStep('process',   2007, {
        name: 'إشعار الموظف ببدء العمل',
        description: 'إرسال بريد ترحيبي رسمي يتضمن معلومات الدوام وإجراءات أول يوم عمل وبيانات الدخول للأنظمة',
        channel: 'Email', assignee: 'HR Services', actionType: 'إشعار',
        isMandatory: true, x: 100, y: 770, nextIds: [2010],
      }),
      buildStep('process',   2008, {
        name: 'طلب استكمال الوثائق الناقصة',
        description: 'إخطار الموظف أو جهة التوظيف بالوثائق الناقصة وإمهالهم مدة محددة لاستكمالها',
        channel: 'Email', assignee: 'HR Services', actionType: 'إرسال',
        isMandatory: true, x: 500, y: 410, nextIds: [2009],
      }),
      buildStep('end',       2009, {
        name: 'إنهاء — معاد للتعديل',
        description: 'تم تعليق إجراء التسجيل لحين استكمال الوثائق المطلوبة',
        finalStatus: 'معاد للتعديل', notifyRequester: true,
        x: 500, y: 530, nextIds: [],
      }),
      buildStep('end',       2010, {
        name: 'إنهاء — مكتمل',
        description: 'اكتملت جميع إجراءات تسجيل الموظف الجديد بنجاح',
        finalStatus: 'مكتمل', notifyRequester: true,
        x: 100, y: 890, nextIds: [],
      }),
    ],
  },

  // ────────────────────────────────────────────────────────────
  //  3. إصدار خطاب راتب / تعريف
  // ────────────────────────────────────────────────────────────
  {
    id: 'salary_letter',
    name: 'إصدار خطاب راتب',
    desc: 'إجراء إصدار خطاب التعريف بالراتب وخطاب التعريف الوظيفي',
    steps: [
      buildStep('start',     3001, {
        name: 'تقديم طلب الخطاب',
        description: 'يتقدم الموظف بطلب إصدار خطاب الراتب أو التعريف الوظيفي مع تحديد الجهة الموجَّه إليها',
        sourceType: 'الموظف رافع الطلب', channel: 'منصة اعتماد', assignee: 'الموظف',
        isMandatory: true, x: 300, y: 50, nextIds: [3002],
      }),
      buildStep('process',   3002, {
        name: 'التحقق من بيانات الموظف',
        description: 'التحقق من صحة وسلامة بيانات الموظف في النظام وتحديد نوع الخطاب المطلوب والجهة المستلِمة',
        channel: 'Oracle', assignee: 'HR Services', actionType: 'تحقق',
        isMandatory: true, x: 300, y: 170, nextIds: [3003],
      }),
      buildStep('condition', 3003, {
        name: 'هل الموظف لا يزال في الخدمة؟',
        description: 'التأكد من أن الموظف لا يزال على رأس عمله وأن بياناته محدَّثة في النظام',
        conditionQuestion: 'هل الموظف لا يزال في الخدمة وبياناته محدَّثة؟',
        assignee: 'HR Services', conditionType: 'yes_no',
        conditionOptions: [
          { id: 'yes', label: 'نعم — في الخدمة',     nextId: 3004 },
          { id: 'no',  label: 'لا — انتهت خدمته', nextId: 3007 },
        ],
        isMandatory: true, x: 300, y: 290, nextIds: [],
      }),
      buildStep('process',   3004, {
        name: 'توليد الخطاب آلياً',
        description: 'يُولِّد النظام الخطاب الرسمي بصيغته المعتمدة مع تعبئة جميع البيانات المطلوبة تلقائياً',
        channel: 'Oracle', assignee: 'النظام الآلي', actionType: 'تنفيذ',
        isMandatory: true, x: 100, y: 410, nextIds: [3005],
      }),
      buildStep('process',   3005, {
        name: 'مراجعة الخطاب واعتماده',
        description: 'يراجع مدير خدمات الموارد البشرية الخطاب للتأكد من دقة محتواه قبل الإرسال',
        channel: 'منصة اعتماد', assignee: 'مدير HR', actionType: 'موافقة',
        isMandatory: true, x: 100, y: 530, nextIds: [3006],
      }),
      buildStep('process',   3006, {
        name: 'إرسال الخطاب للموظف',
        description: 'إرسال الخطاب المعتمد بصيغة PDF للموظف عبر البريد الرسمي مع إشعار باستلامه',
        channel: 'Email', assignee: 'HR Services', actionType: 'إرسال',
        isMandatory: true, x: 100, y: 650, nextIds: [3009],
      }),
      buildStep('process',   3007, {
        name: 'إخطار الموظف بالرفض',
        description: 'إبلاغ الموظف بعدم انطباق الشروط مع توضيح السبب والإجراءات البديلة المتاحة',
        channel: 'Email', assignee: 'HR Services', actionType: 'إشعار',
        isMandatory: true, x: 500, y: 410, nextIds: [3008],
      }),
      buildStep('end',       3008, {
        name: 'إنهاء — مرفوض',
        description: 'رُفض الطلب لعدم انطباق الشروط',
        finalStatus: 'مرفوض', notifyRequester: true,
        x: 500, y: 530, nextIds: [],
      }),
      buildStep('end',       3009, {
        name: 'إنهاء — مكتمل',
        description: 'صدر الخطاب وأُرسل للموظف بنجاح',
        finalStatus: 'مكتمل', notifyRequester: true, archive: true,
        x: 100, y: 770, nextIds: [],
      }),
    ],
  },

  // ────────────────────────────────────────────────────────────
  //  4. معالجة نهاية الخدمة
  // ────────────────────────────────────────────────────────────
  {
    id: 'end_of_service',
    name: 'نهاية الخدمة',
    desc: 'إجراء معالجة مستحقات نهاية الخدمة والإجراءات الختامية',
    steps: [
      buildStep('start',     4001, {
        name: 'استلام إشعار إنهاء الخدمة',
        description: 'يرد إشعار رسمي بإنهاء خدمة الموظف سواء بالاستقالة أو انتهاء العقد أو الإنهاء',
        sourceType: 'إدارة الموارد البشرية', channel: 'ICTS', assignee: 'HR Services',
        isMandatory: true, x: 350, y: 50, nextIds: [4002],
      }),
      buildStep('process',   4002, {
        name: 'استيفاء نموذج التخليص',
        description: 'يستكمل الموظف نموذج التخليص من جميع الإدارات: المالية، تقنية المعلومات، الأمن، مكتبة وغيرها',
        channel: 'ICTS', assignee: 'الموظف', actionType: 'تنفيذ',
        isMandatory: true, x: 350, y: 170, nextIds: [4003],
      }),
      buildStep('process',   4003, {
        name: 'حساب المستحقات النهائية',
        description: 'احتساب جميع المستحقات: مكافأة نهاية الخدمة، الراتب المتبقي، رصيد الإجازات، والبدلات المستحقة',
        channel: 'Oracle', assignee: 'أخصائي الرواتب', actionType: 'تنفيذ',
        isMandatory: true, x: 350, y: 290, nextIds: [4004],
      }),
      buildStep('condition', 4004, {
        name: 'هل توجد خصومات أو استرداد؟',
        description: 'التحقق من وجود مديونيات أو مبالغ مستردة أو خصومات تستوجب المعالجة قبل صرف المستحقات',
        conditionQuestion: 'هل توجد مبالغ مستردة أو خصومات على الموظف؟',
        assignee: 'أخصائي الرواتب', conditionType: 'yes_no',
        conditionOptions: [
          { id: 'yes', label: 'نعم — توجد خصومات', nextId: 4005 },
          { id: 'no',  label: 'لا — لا توجد',        nextId: 4006 },
        ],
        isMandatory: true, x: 350, y: 410, nextIds: [],
      }),
      buildStep('process',   4005, {
        name: 'تسوية الخصومات والمديونيات',
        description: 'معالجة وتسوية جميع المبالغ المستردة والخصومات قبل إجراء الصرف النهائي',
        channel: 'Oracle', assignee: 'أخصائي الرواتب', actionType: 'تنفيذ',
        isMandatory: true, x: 550, y: 530, nextIds: [4006],
      }),
      buildStep('process',   4006, {
        name: 'مراجعة الحسابات وطلب الاعتماد',
        description: 'يراجع المدير المالي الحسابات النهائية ويطلب اعتماد الصرف من المدير العام',
        channel: 'منصة اعتماد', assignee: 'المدير المالي', actionType: 'موافقة',
        isMandatory: true, x: 150, y: 530, nextIds: [4007],
      }),
      buildStep('process',   4007, {
        name: 'صرف المستحقات بالتحويل البنكي',
        description: 'إصدار أوامر التحويل البنكي للمستحقات المعتمدة وإرسال كشف مفصَّل للموظف',
        channel: 'بنك التنمية', assignee: 'القسم المالي', actionType: 'تنفيذ',
        isMandatory: true, x: 150, y: 650, nextIds: [4008],
      }),
      buildStep('process',   4008, {
        name: 'أرشفة الملف وإغلاق الحساب',
        description: 'أرشفة ملف الموظف إلكترونياً، إغلاق حسابه في الأنظمة، وإصدار شهادة الخبرة',
        channel: 'Oracle', assignee: 'HR Services', actionType: 'أرشفة',
        isMandatory: true, x: 150, y: 770, nextIds: [4009],
      }),
      buildStep('end',       4009, {
        name: 'إنهاء — مكتمل',
        description: 'اكتملت جميع إجراءات نهاية الخدمة وصُرفت المستحقات',
        finalStatus: 'مكتمل', notifyRequester: true, archive: true,
        x: 150, y: 890, nextIds: [],
      }),
    ],
  },
];
