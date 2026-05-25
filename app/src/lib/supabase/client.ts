import { createClient } from '@supabase/supabase-js';
import type { Responsibility, User, DropdownLists, AuditEntry, Step, CompletionTime } from '@/types';

// ─── Supabase Configuration ──────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// ─── Fallback: LocalStorage mode ─────────────────────────
let useLocalMode = !SUPABASE_URL || !SUPABASE_ANON_KEY;

let _supabase: ReturnType<typeof createClient> | null = null;

if (!useLocalMode) {
  try {
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  } catch (e) {
    console.warn('Supabase init failed, falling back to localStorage', e);
    useLocalMode = true;
  }
}

// Safe accessor - throws with clear message if called in local mode
function sb(): any {
  if (!_supabase) throw new Error('Supabase not initialized - running in localStorage mode');
  return _supabase;
}

export function isLocalMode(): boolean { return useLocalMode; }

// ─── LocalStorage Helpers ────────────────────────────────
function getLocal<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
function setLocal<T>(key: string, value: T) { localStorage.setItem(key, JSON.stringify(value)); }

// ─── Responsibility CRUD ─────────────────────────────────
export async function getResponsibilities(): Promise<Responsibility[]> {
  if (isLocalMode()) return getLocal<Responsibility[]>('responsibilities', []);
  try {
    const { data, error } = await sb().from('responsibilities').select('*').order('created_at', { ascending: false });
    if (error) { console.error(error); return getLocal<Responsibility[]>('responsibilities', []); }
    return (data || []).map(fromDbRow);
  } catch (e) { console.error(e); return getLocal<Responsibility[]>('responsibilities', []); }
}

export async function createResponsibility(resp: Responsibility): Promise<boolean> {
  if (isLocalMode()) { const list = getLocal<Responsibility[]>('responsibilities', []); list.push(resp); setLocal('responsibilities', list); return true; }
  try {
    const { error } = await sb().from('responsibilities').insert(toDbRow(resp) as any);
    if (error) console.error(error);
    return !error;
  } catch (e) { console.error(e); return false; }
}

export async function updateResponsibility(resp: Responsibility): Promise<boolean> {
  if (isLocalMode()) { const list = getLocal<Responsibility[]>('responsibilities', []); const idx = list.findIndex(r => r.id === resp.id); if (idx >= 0) list[idx] = resp; setLocal('responsibilities', list); return true; }
  try {
    const { error } = await sb().from('responsibilities').update(toDbRow(resp) as any).eq('id', resp.id);
    if (error) console.error(error);
    return !error;
  } catch (e) { console.error(e); return false; }
}

export async function deleteResponsibility(id: number): Promise<boolean> {
  if (isLocalMode()) { const list = getLocal<Responsibility[]>('responsibilities', []); setLocal('responsibilities', list.filter(r => r.id !== id)); return true; }
  try {
    const { error } = await sb().from('responsibilities').delete().eq('id', id);
    if (error) console.error(error);
    return !error;
  } catch (e) { console.error(e); return false; }
}

// ─── Users ───────────────────────────────────────────────
export async function getUsers(): Promise<User[]> {
  if (isLocalMode()) return getLocal<User[]>('users', getDefaultUsers());
  try {
    const { data, error } = await sb().from('users').select('*');
    if (error) { console.error(error); return getDefaultUsers(); }
    return (data as User[]) || getDefaultUsers();
  } catch (e) { console.error(e); return getDefaultUsers(); }
}

export async function updateUser(user: User): Promise<boolean> {
  if (isLocalMode()) { const list = getLocal<User[]>('users', getDefaultUsers()); const idx = list.findIndex(u => u.id === user.id); if (idx >= 0) list[idx] = user; setLocal('users', list); return true; }
  try {
    const { error } = await sb().from('users').update(user as any).eq('id', user.id);
    if (error) console.error(error);
    return !error;
  } catch (e) { console.error(e); return false; }
}

// ─── Dropdown Lists ──────────────────────────────────────
export async function getDropdownLists(): Promise<DropdownLists> {
  if (isLocalMode()) return getLocal<DropdownLists>('dropdown_lists', getDefaultDropdowns());
  try {
    const { data, error } = await sb().from('settings').select('*').eq('key', 'dropdown_lists').single();
    if (error || !data) { console.error(error); return getDefaultDropdowns(); }
    return (data as { value: DropdownLists }).value || getDefaultDropdowns();
  } catch (e) { console.error(e); return getDefaultDropdowns(); }
}

export async function saveDropdownLists(lists: DropdownLists): Promise<boolean> {
  if (isLocalMode()) { setLocal('dropdown_lists', lists); return true; }
  try {
    const { error } = await sb().from('settings').upsert({ key: 'dropdown_lists', value: lists, updated_at: new Date().toISOString() } as any);
    if (error) console.error(error);
    return !error;
  } catch (e) { console.error(e); return false; }
}

// ─── Audit Log ───────────────────────────────────────────
export async function addAuditLog(entry: AuditEntry): Promise<boolean> {
  if (isLocalMode()) { const list = getLocal<AuditEntry[]>('audit_log', []); list.push(entry); setLocal('audit_log', list); return true; }
  try {
    const { error } = await sb().from('audit_log').insert(entry as any);
    if (error) console.error(error);
    return !error;
  } catch (e) { console.error(e); return false; }
}

// ─── Row mappers ─────────────────────────────────────────
function toDbRow(resp: Responsibility): Record<string, unknown> {
  return {
    id: resp.id,
    owner_name: resp.ownerName,
    name: resp.name,
    category: resp.category,
    category_description: resp.categoryDescription,
    description: resp.description,
    request_channel: resp.requestChannel,
    procedure_type: resp.procedureType,
    used_channels: resp.usedChannels,
    steps: resp.steps,
    needs_review: resp.needsReview,
    reviewers: resp.reviewers,
    needs_approval: resp.needsApproval,
    approvers: resp.approvers,
    needs_follow_up: resp.needsFollowUp,
    follow_up_methods: resp.followUpMethods,
    completion_time: resp.completionTime,
    avg_monthly_requests: resp.avgMonthlyRequests,
    impact: resp.impact,
    kpi: resp.kpi,
    notes: resp.notes,
    weight: resp.weight,
    burden: resp.burden,
    completion_percentage: resp.completionPercentage,
    documentation_status: resp.documentationStatus,
    active: resp.active,
    created_at: resp.createdAt,
    updated_at: resp.updatedAt,
    created_by: resp.createdBy,
    audit_log: resp.auditLog,
    final_grade: resp.finalGrade,
  };
}

function fromDbRow(row: Record<string, unknown>): Responsibility {
  return {
    id: row.id as number,
    ownerName: (row.owner_name as string) || '',
    name: (row.name as string) || '',
    category: (row.category as string) || '',
    categoryDescription: (row.category_description as string) || '',
    description: (row.description as string) || '',
    requestChannel: (row.request_channel as string) || '',
    procedureType: (row.procedure_type as string) || '',
    usedChannels: (row.used_channels as string[]) || [],
    steps: (row.steps as Step[]) || [],
    needsReview: (row.needs_review as boolean) || false,
    reviewers: (row.reviewers as string[]) || [],
    needsApproval: (row.needs_approval as boolean) || false,
    approvers: (row.approvers as string[]) || [],
    needsFollowUp: (row.needs_follow_up as boolean) || false,
    followUpMethods: (row.follow_up_methods as string[]) || [],
    completionTime: (row.completion_time as CompletionTime) || { type: '', duration: { value: 0, unit: '' } },
    avgMonthlyRequests: (row.avg_monthly_requests as number) || 0,
    impact: (row.impact as 'low' | 'medium' | 'high' | 'critical') || 'medium',
    kpi: (row.kpi as string) || '',
    notes: (row.notes as string) || '',
    weight: (row.weight as number) || 0,
    burden: (row.burden as number) || 0,
    completionPercentage: (row.completion_percentage as number) || 0,
    documentationStatus: (row.documentation_status as 'مكتمل' | 'جاري' | 'ناقص' | 'مسودة') || 'مسودة',
    active: (row.active as boolean) ?? true,
    createdAt: (row.created_at as string) || new Date().toISOString(),
    updatedAt: (row.updated_at as string) || new Date().toISOString(),
    createdBy: (row.created_by as string) || '',
    auditLog: (row.audit_log as AuditEntry[]) || [],
    finalGrade: (row.final_grade as number) || 0,
  };
}

// ─── Defaults ────────────────────────────────────────────
export function getDefaultUsers(): User[] {
  return [
    { id: 1, name: 'المدير', username: 'admin', password: '123456', role: 'admin', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', email: 'admin@hr.gov.sa', department: 'HR Services', active: true, permissions: [{ module: 'responsibilities', actions: ['view','create','edit','delete'] }, { module: 'workflow', actions: ['view','edit','delete'] }, { module: 'settings', actions: ['view','edit'] }, { module: 'permissions', actions: ['view','edit'] }] },
    { id: 2, name: 'أحمد محمد', username: 'ahmed', password: '123456', role: 'specialist', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ahmed', email: 'ahmed@hr.gov.sa', department: 'HR Services', active: true, permissions: [{ module: 'responsibilities', actions: ['view','create','edit'] }, { module: 'workflow', actions: ['view','edit'] }] },
    { id: 3, name: 'سارة عبدالله', username: 'sarah', password: '123456', role: 'reviewer', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah', email: 'sarah@hr.gov.sa', department: 'HR Services', active: true, permissions: [{ module: 'responsibilities', actions: ['view','edit'] }] },
    { id: 4, name: 'خالد العلي', username: 'khalid', password: '123456', role: 'viewer', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=khalid', email: 'khalid@hr.gov.sa', department: 'Finance', active: true, permissions: [{ module: 'responsibilities', actions: ['view'] }] },
  ];
}

export function getDefaultDropdowns(): DropdownLists {
  return {
    categories: ['خدمات الموظفين', 'الرواتب', 'التعويضات', 'العلاقات', 'التوظيف', 'التدريب', 'أخرى'],
    channels: ['Oracle', 'Email', 'Help Desk', 'ICTS', 'منصة اعتماد', 'GOSI / القوسي', 'رابط إلكتروني', 'منصة السانق', 'بنك التنمية', 'نظام داخلي'],
    procedureTypes: ['نظامي', 'يدوي', 'نظامي/يدوي', 'آلي'],
    actionTypes: ['استلام', 'مراجعة', 'تحقق', 'تنفيذ', 'إرسال', 'إشعار', 'أرشفة', 'تحديث نظام', 'متابعة', 'موافقة'],
    completionTypes: ['نظامي', 'يدوي', 'نظامي/يدوي'],
    durationUnits: ['دقيقة', 'ساعة', 'يوم', 'أسبوع'],
    docStatuses: ['مكتمل', 'جاري', 'ناقص', 'مسودة'],
  };
}

// ─── Auto-migrate from old localStorage data ────────────
export function migrateOldDataIfNeeded() {
  const oldData = localStorage.getItem('responsibilities');
  if (oldData) {
    try {
      const parsed = JSON.parse(oldData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setLocal('responsibilities_backup_' + Date.now(), parsed);
        console.log('Old data backed up. Set VITE_SUPABASE_URL to migrate to cloud.');
      }
    } catch { /* ignore */ }
  }
}

// Run migration check
migrateOldDataIfNeeded();
