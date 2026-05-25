// ===== القيم الافتراضية =====
export const DEFAULT_CATEGORIES = [
  'البدلات والمكافآت', 'الأرشفة والتقارير', 'تعيين وتغيير الوظائف',
  'الرواتب والتأمينات', 'العقود', 'نهاية العلاقة الوظيفية',
  'التقييم والأداء', 'الإجازات', 'التذاكر', 'التعاريف', 'أخرى',
];

export const DEFAULT_CHANNELS = [
  'اوركل', 'ايميل', 'أي سي تي اس', 'هيلب ديسك', 'اعتماد',
  'رابط التعاريف', 'بنك التنمية', 'القوسي', 'منصة السانق',
];

export const DEFAULT_PROCEDURE_TYPES = ['تنفيذ', 'مراجعة', 'توزيع', 'موافقة'];
export const DEFAULT_ACTION_TYPES = ['تنفيذ', 'مراجعة', 'توزيع', 'موافقة'];
export const DEFAULT_COMPLETION_TYPES = ['تنفيذ الطلب', 'مراجعة الطلب', 'إرسال الطلب', 'الموافقة على الطلب'];
export const DEFAULT_DURATION_UNITS = ['دقيقة', 'ساعة', 'يوم'];
export const DEFAULT_DOC_STATUSES = ['مسودة', 'ناقص', 'جاري', 'مكتمل'];

export const IMPACT_DATA: Record<string, { label: string; color: string; score: number }> = {
  low:    { label: 'منخفض', color: 'green', score: 1 },
  medium: { label: 'متوسط',  color: 'blue',  score: 2 },
  high:   { label: 'عالي',   color: 'yellow', score: 3 },
  critical: { label: 'حرج', color: 'red',   score: 4 },
};

export const STEP_LABELS = [
  { id: 1, label: 'البيانات الأساسية', icon: 'FileText' },
  { id: 2, label: 'القنوات والإجراء', icon: 'Workflow' },
  { id: 3, label: 'خطوات العمل', icon: 'ListChecks' },
  { id: 4, label: 'المراجعة والموافقة', icon: 'ShieldCheck' },
  { id: 5, label: 'المدة والمؤشرات', icon: 'Clock' },
  { id: 6, label: 'التحليل والمراجعة', icon: 'BarChart3' },
];

// ===== exported references for backward compat =====
export let CATEGORIES = [...DEFAULT_CATEGORIES];
export let CHANNELS = [...DEFAULT_CHANNELS];
export let ACTION_TYPES = [...DEFAULT_ACTION_TYPES];
export let COMPLETION_TYPES = [...DEFAULT_COMPLETION_TYPES];
export let DURATION_UNITS = [...DEFAULT_DURATION_UNITS];
export let PROCEDURE_TYPES = [...DEFAULT_PROCEDURE_TYPES];
export let DOC_STATUSES = [...DEFAULT_DOC_STATUSES];

export function setCategories(v: string[]) { CATEGORIES = [...v]; }
export function setChannels(v: string[]) { CHANNELS = [...v]; }
export function setActionTypes(v: string[]) { ACTION_TYPES = [...v]; }
export function setCompletionTypes(v: string[]) { COMPLETION_TYPES = [...v]; }
export function setDurationUnits(v: string[]) { DURATION_UNITS = [...v]; }
export function setProcedureTypes(v: string[]) { PROCEDURE_TYPES = [...v]; }
export function setDocStatuses(v: string[]) { DOC_STATUSES = [...v]; }

export function resetAllDefaults() {
  CATEGORIES = [...DEFAULT_CATEGORIES];
  CHANNELS = [...DEFAULT_CHANNELS];
  PROCEDURE_TYPES = [...DEFAULT_PROCEDURE_TYPES];
  ACTION_TYPES = [...DEFAULT_ACTION_TYPES];
  COMPLETION_TYPES = [...DEFAULT_COMPLETION_TYPES];
  DURATION_UNITS = [...DEFAULT_DURATION_UNITS];
  DOC_STATUSES = [...DEFAULT_DOC_STATUSES];
}
