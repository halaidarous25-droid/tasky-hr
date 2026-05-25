// ─── User Types ───────────────────────────────────────────
export type UserRole = 'admin' | 'reviewer' | 'specialist' | 'viewer';

export interface User {
  id: number;
  uid?: string;
  name: string;
  username: string;
  password: string;
  role: UserRole;
  avatar: string;
  email: string;
  department: string;
  active: boolean;
  permissions: Permission[];
}

export interface Permission {
  module: string;
  actions: ('view' | 'create' | 'edit' | 'delete' | 'approve' | 'export' | 'import')[];
}

// ─── 4 Core Card Types ────────────────────────────────────
export type CardType = 'start' | 'process' | 'condition' | 'end';

// ─── Condition Option ─────────────────────────────────────
export interface ConditionOption {
  id: string;
  label: string;
  nextId: number | null;
}

// ─── Step ─────────────────────────────────────────────────
export interface Step {
  id: number;
  name: string;
  description: string;
  channel: string;
  actionType: string;
  notes: string;
  // Card type
  cardType: CardType;
  assignee: string;
  isMandatory: boolean;
  // Free canvas position
  x: number;
  y: number;
  // Connections (outgoing arrows)
  nextIds: number[];
  // Condition-specific
  conditionQuestion: string;
  conditionType: 'yes_no' | 'multiple';
  conditionOptions: ConditionOption[];
  // Process-specific
  sourceType: string;
  // End-specific
  finalStatus: string;
  notifyRequester: boolean;
  archive: boolean;
  archiveLocation: string;
}

export interface CompletionTime {
  type: string;
  duration: { value: number; unit: string };
}

export interface Responsibility {
  id: number;
  ownerName: string;
  name: string;
  category: string;
  categoryDescription: string;
  description: string;
  requestChannel: string;
  procedureType: string;
  usedChannels: string[];
  steps: Step[];
  needsReview: boolean;
  reviewers: string[];
  needsApproval: boolean;
  approvers: string[];
  needsFollowUp: boolean;
  followUpMethods: string[];
  completionTime: CompletionTime;
  avgMonthlyRequests: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  kpi: string;
  notes: string;
  weight: number;
  burden: number;
  completionPercentage: number;
  documentationStatus: 'مكتمل' | 'جاري' | 'ناقص' | 'مسودة';
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  auditLog: AuditEntry[];
  finalGrade: number;
}

export interface AuditEntry {
  id: string;
  date: string;
  user: string;
  action: string;
  details: string;
}

export interface DropdownLists {
  categories: string[];
  channels: string[];
  procedureTypes: string[];
  actionTypes: string[];
  completionTypes: string[];
  durationUnits: string[];
  docStatuses: string[];
}

export interface FilterState {
  search: string;
  owner: string;
  category: string;
  channel: string;
  impact: string;
  status: string;
}

export type AppPage = 'login' | 'dashboard' | 'responsibilities' | 'form' | 'view' | 'audit' | 'settings' | 'users';
