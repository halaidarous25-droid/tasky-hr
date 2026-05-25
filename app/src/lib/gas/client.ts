/**
 * ============================================================
 * src/lib/gas/client.ts
 * Google Apps Script API Client for React Frontend
 * ============================================================
 * 
 * This file replaces src/lib/supabase/client.ts
 * It provides the same API interface but connects to Google Apps Script
 * 
 * INSTALLATION:
 * 1. Copy this file to: src/lib/gas/client.ts
 * 2. In src/context/AppContext.tsx, change the import from:
 *      @/lib/supabase/client
 *    to:
 *      @/lib/gas/client
 * 3. Add to your .env file:
 *      VITE_GAS_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
 * 4. Rebuild: npm run build
 */

import type {
  Responsibility, User, DropdownLists, AuditEntry,
  Step, CompletionTime
} from '@/types';

// ─── Configuration ──────────────────────────────────────────
// Auto-detect GAS URL: if running inside GAS HtmlService, use the page's
// own origin + path (same URL serves both frontend and API).
// Otherwise fall back to env var or local mode.
function detectGasUrl(): string {
  if (import.meta.env.VITE_GAS_URL) return import.meta.env.VITE_GAS_URL;
  // When served by GAS, the URL looks like:
  //   https://script.google.com/macros/s/SCRIPT_ID/exec
  if (typeof window !== 'undefined' && window.location.hostname === 'script.google.com') {
    return window.location.href.split('?')[0];
  }
  return 'LOCAL'; // triggers localStorage fallback
}
const GAS_URL = detectGasUrl();
const API_TIMEOUT = 30000; // 30 seconds

// ─── Internal: Generic API Call ─────────────────────────────
async function apiCall(
  action: string,
  payload?: Record<string, any>
): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    // Always use GET to avoid CORS/redirect issues with GAS POST
    // Write operations pass payload as ?data=<encoded-JSON>
    const params = new URLSearchParams({ action });
    if (payload) {
      params.set('data', encodeURIComponent(JSON.stringify(payload)));
    }

    const response = await fetch(`${GAS_URL}?${params.toString()}`, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result;

  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please try again');
    }
    console.warn('API call failed, using localStorage fallback:', error.message);
    return null;
  }
}

// ─── Session Management ─────────────────────────────────────
let _sessionToken: string | null = localStorage.getItem('gas_session_token');

function getSessionToken(): string | null {
  return _sessionToken;
}

function setSessionToken(token: string | null) {
  _sessionToken = token;
  if (token) {
    localStorage.setItem('gas_session_token', token);
  } else {
    localStorage.removeItem('gas_session_token');
  }
}

function getStoredUser(): User | null {
  const raw = localStorage.getItem('gas_user');
  return raw ? JSON.parse(raw) : null;
}

function setStoredUser(user: User | null) {
  if (user) {
    localStorage.setItem('gas_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('gas_user');
  }
}

// ─── Check if using localStorage fallback mode ──────────────
export function isLocalMode(): boolean {
  return !GAS_URL || GAS_URL === 'LOCAL' || GAS_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL';
}

// ═════════════════════════════════════════════════════════════
// AUTH
// ═════════════════════════════════════════════════════════════

export async function loginUser(
  username: string,
  password: string
): Promise<{ success: boolean; user?: User; sessionToken?: string; error?: string }> {
  // If no GAS URL, fall back to local users
  if (isLocalMode()) {
    return localLoginUser(username, password);
  }

  const result = await apiCall('login', { username, password });
  if (!result) return localLoginUser(username, password);

  if (result.success && result.sessionToken) {
    setSessionToken(result.sessionToken);
    setStoredUser(result.user as User);
  }
  return result;
}

export function logoutUser(): void {
  setSessionToken(null);
  setStoredUser(null);
  localStorage.removeItem('gas_session_token');
  localStorage.removeItem('gas_user');
}

export function getCurrentUser(): User | null {
  return getStoredUser();
}

// ─── LocalStorage fallback for login ────────────────────────
function localLoginUser(username: string, password: string) {
  const users = getLocal<User[]>('users', getDefaultUsers());
  const user = users.find(
    (u) => u.username === username.trim() && u.password === password.trim()
  );
  if (!user) {
    return { success: false, error: 'Invalid username or password' };
  }
  if (!user.active) {
    return { success: false, error: 'Account is inactive' };
  }
  setStoredUser(user);
  return { success: true, user, sessionToken: 'local_' + user.id };
}

// ═════════════════════════════════════════════════════════════
// RESPONSIBILITIES CRUD
// ═════════════════════════════════════════════════════════════

export async function getResponsibilities(): Promise<Responsibility[]> {
  if (isLocalMode()) {
    return getLocal<Responsibility[]>('responsibilities', []);
  }
  const result = await apiCall('getResponsibilities');
  if (!result || !result.success) return getLocal<Responsibility[]>('responsibilities', []);
  return (result.data || []).map(fromGasRow);
}

export async function createResponsibility(resp: Responsibility): Promise<boolean> {
  if (isLocalMode()) {
    const list = getLocal<Responsibility[]>('responsibilities', []);
    list.push(resp);
    setLocal('responsibilities', list);
    return true;
  }
  const result = await apiCall('addResponsibility', {
    payload: toGasRow(resp),
    user: getCurrentUser(),
  });
  return result?.success || false;
}

export async function updateResponsibility(resp: Responsibility): Promise<boolean> {
  if (isLocalMode()) {
    const list = getLocal<Responsibility[]>('responsibilities', []);
    const idx = list.findIndex((r) => r.id === resp.id);
    if (idx >= 0) list[idx] = resp;
    setLocal('responsibilities', list);
    return true;
  }
  const result = await apiCall('updateResponsibility', {
    payload: toGasRow(resp),
    user: getCurrentUser(),
  });
  return result?.success || false;
}

export async function deleteResponsibility(id: number): Promise<boolean> {
  if (isLocalMode()) {
    const list = getLocal<Responsibility[]>('responsibilities', []);
    setLocal(
      'responsibilities',
      list.filter((r) => r.id !== id)
    );
    return true;
  }
  const result = await apiCall('deleteResponsibility', {
    id,
    user: getCurrentUser(),
  });
  return result?.success || false;
}

// ═════════════════════════════════════════════════════════════
// USERS
// ═════════════════════════════════════════════════════════════

export async function getUsers(): Promise<User[]> {
  if (isLocalMode()) {
    return getLocal<User[]>('users', getDefaultUsers());
  }
  const result = await apiCall('getUsers');
  if (!result || !result.success) return getDefaultUsers();
  return (result.data || []) as User[];
}

export async function updateUser(user: User): Promise<boolean> {
  if (isLocalMode()) {
    const list = getLocal<User[]>('users', getDefaultUsers());
    const idx = list.findIndex((u) => u.id === user.id);
    if (idx >= 0) list[idx] = user;
    setLocal('users', list);
    return true;
  }
  const result = await apiCall('updateUser', {
    payload: user,
    user: getCurrentUser(),
  });
  return result?.success || false;
}

export async function addUser(user: User): Promise<boolean> {
  if (isLocalMode()) {
    const list = getLocal<User[]>('users', getDefaultUsers());
    const newId = Math.max(...list.map((u) => u.id), 0) + 1;
    list.push({ ...user, id: newId });
    setLocal('users', list);
    return true;
  }
  const result = await apiCall('addUser', {
    payload: user,
    user: getCurrentUser(),
  });
  return result?.success || false;
}

// ═════════════════════════════════════════════════════════════
// DROPDOWN LISTS / SETTINGS
// ═════════════════════════════════════════════════════════════

export async function getDropdownLists(): Promise<DropdownLists> {
  if (isLocalMode()) {
    return getLocal<DropdownLists>('dropdown_lists', getDefaultDropdowns());
  }
  const result = await apiCall('getDropdownLists');
  if (!result || !result.success) return getDefaultDropdowns();
  return result.lists || getDefaultDropdowns();
}

export async function saveDropdownLists(lists: DropdownLists): Promise<boolean> {
  if (isLocalMode()) {
    setLocal('dropdown_lists', lists);
    return true;
  }
  const result = await apiCall('updateDropdownLists', {
    lists,
    user: getCurrentUser(),
  });
  return result?.success || false;
}

// ═════════════════════════════════════════════════════════════
// AUDIT LOG
// ═════════════════════════════════════════════════════════════

export async function addAuditLog(entry: AuditEntry): Promise<boolean> {
  if (isLocalMode()) {
    const list = getLocal<AuditEntry[]>('audit_log', []);
    list.push(entry);
    setLocal('audit_log', list);
    return true;
  }
  const result = await apiCall('addAuditEntry', { entry });
  return result?.success || false;
}

export async function getAuditLog(
  limit?: number,
  offset?: number
): Promise<AuditEntry[]> {
  if (isLocalMode()) {
    return getLocal<AuditEntry[]>('audit_log', []);
  }
  const result = await apiCall('getAuditLog', { limit, offset });
  if (!result || !result.success) return [];
  return result.data || [];
}

// ═════════════════════════════════════════════════════════════
// ATTACHMENTS
// ═════════════════════════════════════════════════════════════

export async function uploadAttachment(
  file: File,
  relatedTable: string,
  relatedId: number
): Promise<{ success: boolean; attachment?: any; error?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const currentUser = getCurrentUser();

      if (isLocalMode()) {
        resolve({
          success: true,
          attachment: {
            id: 'local_' + Date.now(),
            fileName: file.name,
            fileType: file.type,
            driveUrl: reader.result as string,
          },
        });
        return;
      }

      const result = await apiCall('uploadAttachment', {
        file: base64,
        fileName: file.name,
        fileType: file.type,
        relatedTable,
        relatedId,
        uploadedBy: currentUser?.name || 'unknown',
        description: '',
      });
      resolve(
        result || {
          success: false,
          error: 'Upload failed - no response from server',
        }
      );
    };
    reader.onerror = () =>
      resolve({ success: false, error: 'Failed to read file' });
    reader.readAsDataURL(file);
  });
}

export async function getAttachments(
  relatedTable: string,
  relatedId: number
): Promise<any[]> {
  if (isLocalMode()) return [];
  const result = await apiCall('getAttachments', { relatedTable, relatedId });
  return result?.data || [];
}

export async function deleteAttachment(id: string): Promise<boolean> {
  if (isLocalMode()) return true;
  const result = await apiCall('deleteAttachment', {
    id,
    user: getCurrentUser(),
  });
  return result?.success || false;
}

// ═════════════════════════════════════════════════════════════
// STATS
// ═════════════════════════════════════════════════════════════

export async function getStats(): Promise<any> {
  if (isLocalMode()) return null;
  const result = await apiCall('getStats');
  return result?.stats || null;
}

// ═════════════════════════════════════════════════════════════
// PERMISSIONS
// ═════════════════════════════════════════════════════════════

export async function getPermissions(role?: string): Promise<any[]> {
  if (isLocalMode()) return [];
  const result = await apiCall('getPermissions', { role });
  return result?.data || [];
}

// ═════════════════════════════════════════════════════════════
// BACKUP
// ═════════════════════════════════════════════════════════════

export async function triggerBackup(): Promise<any> {
  if (isLocalMode()) return { success: false, error: 'Not available in local mode' };
  return await apiCall('createBackup');
}

// ═════════════════════════════════════════════════════════════
// ROW MAPPERS
// ═════════════════════════════════════════════════════════════

function toGasRow(resp: Responsibility): Record<string, any> {
  return {
    id: resp.id,
    ownerName: resp.ownerName,
    name: resp.name,
    category: resp.category,
    categoryDescription: resp.categoryDescription,
    description: resp.description,
    requestChannel: resp.requestChannel,
    procedureType: resp.procedureType,
    usedChannels: resp.usedChannels,
    steps: resp.steps,
    needsReview: resp.needsReview,
    reviewers: resp.reviewers,
    needsApproval: resp.needsApproval,
    approvers: resp.approvers,
    needsFollowUp: resp.needsFollowUp,
    followUpMethods: resp.followUpMethods,
    completionTime: resp.completionTime,
    avgMonthlyRequests: resp.avgMonthlyRequests,
    impact: resp.impact,
    kpi: resp.kpi,
    notes: resp.notes,
    weight: resp.weight,
    burden: resp.burden,
    completionPercentage: resp.completionPercentage,
    documentationStatus: resp.documentationStatus,
    active: resp.active,
    createdAt: resp.createdAt,
    updatedAt: resp.updatedAt,
    createdBy: resp.createdBy,
    auditLog: resp.auditLog,
    finalGrade: resp.finalGrade,
  };
}

function fromGasRow(row: Record<string, any>): Responsibility {
  return {
    id: row.id || 0,
    ownerName: row.ownerName || '',
    name: row.name || '',
    category: row.category || '',
    categoryDescription: row.categoryDescription || '',
    description: row.description || '',
    requestChannel: row.requestChannel || '',
    procedureType: row.procedureType || '',
    usedChannels: safeJsonParse(row.usedChannels, []),
    steps: safeJsonParse(row.steps, []),
    needsReview: row.needsReview || false,
    reviewers: safeJsonParse(row.reviewers, []),
    needsApproval: row.needsApproval || false,
    approvers: safeJsonParse(row.approvers, []),
    needsFollowUp: row.needsFollowUp || false,
    followUpMethods: safeJsonParse(row.followUpMethods, []),
    completionTime: safeJsonParse(row.completionTime, {
      type: '',
      duration: { value: 0, unit: '' },
    }),
    avgMonthlyRequests: row.avgMonthlyRequests || 0,
    impact: row.impact || 'medium',
    kpi: row.kpi || '',
    notes: row.notes || '',
    weight: row.weight || 0,
    burden: row.burden || 0,
    completionPercentage: row.completionPercentage || 0,
    documentationStatus: row.documentationStatus || 'مسودة',
    active: row.active ?? true,
    createdAt: row.createdAt || new Date().toISOString(),
    updatedAt: row.updatedAt || new Date().toISOString(),
    createdBy: row.createdBy || '',
    auditLog: safeJsonParse(row.auditLog, []),
    finalGrade: row.finalGrade || 0,
  };
}

// ═════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════

function safeJsonParse(val: any, fallback: any): any {
  if (!val) return fallback;
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function getLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── Default Data ───────────────────────────────────────────

export function getDefaultUsers(): User[] {
  return [
    {
      id: 1,
      name: 'المدير',
      username: 'admin',
      password: '123456',
      role: 'admin',
      email: 'admin@hr.gov.sa',
      department: 'HR Services',
      active: true,
      permissions: [
        { module: 'responsibilities', actions: ['view', 'create', 'edit', 'delete'] },
        { module: 'workflow', actions: ['view', 'edit', 'delete'] },
        { module: 'settings', actions: ['view', 'edit'] },
        { module: 'permissions', actions: ['view', 'edit'] },
      ],
      avatar: '',
    },
    {
      id: 2,
      name: 'أحمد محمد',
      username: 'ahmed',
      password: '123456',
      role: 'specialist',
      email: 'ahmed@hr.gov.sa',
      department: 'HR Services',
      active: true,
      permissions: [
        { module: 'responsibilities', actions: ['view', 'create', 'edit'] },
        { module: 'workflow', actions: ['view', 'edit'] },
      ],
      avatar: '',
    },
    {
      id: 3,
      name: 'سارة عبدالله',
      username: 'sarah',
      password: '123456',
      role: 'reviewer',
      email: 'sarah@hr.gov.sa',
      department: 'HR Services',
      active: true,
      permissions: [
        { module: 'responsibilities', actions: ['view', 'edit'] },
      ],
      avatar: '',
    },
    {
      id: 4,
      name: 'خالد العلي',
      username: 'khalid',
      password: '123456',
      role: 'viewer',
      email: 'khalid@hr.gov.sa',
      department: 'Finance',
      active: true,
      permissions: [{ module: 'responsibilities', actions: ['view'] }],
      avatar: '',
    },
  ];
}

export function getDefaultDropdowns(): DropdownLists {
  return {
    categories: [
      'خدمات الموظفين',
      'الرواتب',
      'التعويضات',
      'العلاقات',
      'التوظيف',
      'التدريب',
      'أخرى',
    ],
    channels: [
      'Oracle',
      'Email',
      'Help Desk',
      'ICTS',
      'منصة اعتماد',
      'GOSI / القوسي',
      'رابط إلكتروني',
      'منصة السانق',
      'بنك التنمية',
      'نظام داخلي',
    ],
    procedureTypes: ['نظامي', 'يدوي', 'نظامي/يدوي', 'آلي'],
    actionTypes: [
      'استلام',
      'مراجعة',
      'تحقق',
      'تنفيذ',
      'إرسال',
      'إشعار',
      'أرشفة',
      'تحديث نظام',
      'متابعة',
      'موافقة',
    ],
    completionTypes: ['نظامي', 'يدوي', 'نظامي/يدوي'],
    durationUnits: ['دقيقة', 'ساعة', 'يوم', 'أسبوع'],
    docStatuses: ['مكتمل', 'جاري', 'ناقص', 'مسودة'],
  };
}

// Auto-migrate old data
const oldData = localStorage.getItem('responsibilities');
if (oldData) {
  try {
    const parsed = JSON.parse(oldData);
    if (Array.isArray(parsed) && parsed.length > 0) {
      console.log('📦 Local data available. Set VITE_GAS_URL to connect to cloud.');
    }
  } catch {
    /* ignore */
  }
}