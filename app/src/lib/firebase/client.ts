/**
 * Firebase Client — Firestore + Firebase Auth
 * Replaces GAS client with same export interface
 *
 * Auth email convention: ${username}@hr-system.app
 * This allows username-based login UI while using Firebase Auth
 */

import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  getAuth,
  type User as FbUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { auth, db, isFirebaseConfigured, FIREBASE_CONFIG } from './config';
import type {
  Responsibility, User, DropdownLists, AuditEntry,
} from '@/types';

// ─── Mode Detection ──────────────────────────────────────────
export function isLocalMode(): boolean {
  return !isFirebaseConfigured;
}

// ─── localStorage Helpers ────────────────────────────────────
function getLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function setLocal<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── Firebase email convention ───────────────────────────────
function toFirebaseEmail(username: string): string {
  return `${username.toLowerCase().trim()}@hr-system.app`;
}

// ─── Current user cache ──────────────────────────────────────
let _currentUser: User | null = null;

function getCachedUser(): User | null {
  if (_currentUser) return _currentUser;
  const raw = localStorage.getItem('fb_user');
  return raw ? JSON.parse(raw) : null;
}

function setCachedUser(user: User | null) {
  _currentUser = user;
  if (user) {
    localStorage.setItem('fb_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('fb_user');
  }
}

export function getCurrentUser(): User | null {
  return getCachedUser();
}

// ─── Auth State Listener ─────────────────────────────────────
export function subscribeToAuthState(
  cb: (user: User | null) => void
): () => void {
  if (!auth) {
    cb(getCachedUser());
    return () => {};
  }
  return onAuthStateChanged(auth, async (fbUser: FbUser | null) => {
    if (!fbUser) {
      setCachedUser(null);
      cb(null);
      return;
    }
    // Fetch user profile from Firestore by uid
    try {
      const snapshot = await getDocs(collection(db!, 'users'));
      const userData = snapshot.docs
        .map((d) => d.data() as User)
        .find((u) => u.uid === fbUser.uid);
      if (userData) {
        setCachedUser(userData);
        cb(userData);
      } else {
        cb(null);
      }
    } catch (e) {
      console.error('Failed to load user profile:', e);
      cb(null);
    }
  });
}

// ─── Login / Logout ──────────────────────────────────────────
export async function loginUser(
  username: string,
  password: string,
): Promise<{ success: boolean; user?: User; sessionToken?: string; error?: string }> {
  if (isLocalMode()) {
    return localLogin(username, password);
  }
  try {
    const email = toFirebaseEmail(username);
    const cred = await signInWithEmailAndPassword(auth!, email, password);

    // Fetch user profile from Firestore
    const snapshot = await getDocs(collection(db!, 'users'));
    const userData = snapshot.docs
      .map((d) => d.data() as User)
      .find((u) => u.username === username.trim());

    if (!userData) {
      await signOut(auth!);
      return { success: false, error: 'لم يتم العثور على بيانات المستخدم' };
    }

    // Patch uid onto user (update in Firestore if needed)
    if (!userData.uid) {
      const userDoc = snapshot.docs.find((d) => (d.data() as User).username === username.trim());
      if (userDoc) {
        await updateDoc(doc(db!, 'users', userDoc.id), { uid: cred.user.uid });
      }
    }

    const user = { ...userData, uid: cred.user.uid };
    setCachedUser(user);
    return { success: true, user, sessionToken: cred.user.uid };
  } catch (e: any) {
    const code = e?.code || '';
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
    }
    if (code === 'auth/too-many-requests') {
      return { success: false, error: 'تم تجاوز عدد المحاولات. حاول لاحقاً' };
    }
    console.error('Login error:', e);
    return { success: false, error: 'حدث خطأ أثناء تسجيل الدخول' };
  }
}

function localLogin(username: string, password: string) {
  const users = getLocal<User[]>('users', getDefaultUsers());
  const user = users.find(
    (u) => u.username === username.trim() && u.password === password.trim()
  );
  if (!user) return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
  if (!user.active) return { success: false, error: 'الحساب غير نشط' };
  setCachedUser(user);
  return { success: true, user, sessionToken: 'local_' + user.id };
}

export async function logoutUser(): Promise<void> {
  setCachedUser(null);
  if (auth) {
    try { await signOut(auth); } catch { /* ignore */ }
  }
}

// ─── Create Firebase Auth User (admin only, uses secondary app) ──
async function createFirebaseAuthUser(username: string, password: string): Promise<string | null> {
  if (!isFirebaseConfigured) return null;
  const appName = `temp-create-${Date.now()}`;
  let secondaryApp: any = null;
  try {
    secondaryApp = initializeApp(FIREBASE_CONFIG, appName);
    const secondaryAuth = getAuth(secondaryApp);
    const email = toFirebaseEmail(username);
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    return cred.user.uid;
  } catch (e: any) {
    if (e?.code === 'auth/email-already-in-use') return 'existing';
    console.error('Failed to create Firebase auth user:', e);
    return null;
  } finally {
    if (secondaryApp) {
      try { await deleteApp(secondaryApp); } catch { /* ignore */ }
    }
  }
}

// ─── Responsibilities ────────────────────────────────────────
export async function getResponsibilities(): Promise<Responsibility[]> {
  if (isLocalMode()) return getLocal<Responsibility[]>('responsibilities', []);
  try {
    const q = query(collection(db!, 'responsibilities'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.data().id ?? parseInt(d.id), ...d.data() } as Responsibility));
  } catch (e) {
    console.error('getResponsibilities failed:', e);
    return getLocal<Responsibility[]>('responsibilities', []);
  }
}

export async function createResponsibility(resp: Responsibility): Promise<boolean> {
  if (isLocalMode()) {
    const list = getLocal<Responsibility[]>('responsibilities', []);
    list.push(resp);
    setLocal('responsibilities', list);
    return true;
  }
  try {
    await setDoc(doc(db!, 'responsibilities', String(resp.id)), resp);
    return true;
  } catch (e) { console.error(e); return false; }
}

export async function updateResponsibility(resp: Responsibility): Promise<boolean> {
  if (isLocalMode()) {
    const list = getLocal<Responsibility[]>('responsibilities', []);
    const idx = list.findIndex((r) => r.id === resp.id);
    if (idx >= 0) list[idx] = resp;
    setLocal('responsibilities', list);
    return true;
  }
  try {
    await setDoc(doc(db!, 'responsibilities', String(resp.id)), resp);
    return true;
  } catch (e) { console.error(e); return false; }
}

export async function deleteResponsibility(id: number): Promise<boolean> {
  if (isLocalMode()) {
    setLocal('responsibilities', getLocal<Responsibility[]>('responsibilities', []).filter((r) => r.id !== id));
    return true;
  }
  try {
    await deleteDoc(doc(db!, 'responsibilities', String(id)));
    return true;
  } catch (e) { console.error(e); return false; }
}

// ─── Users ───────────────────────────────────────────────────
export async function getUsers(): Promise<User[]> {
  if (isLocalMode()) return getLocal<User[]>('users', getDefaultUsers());
  try {
    const snap = await getDocs(collection(db!, 'users'));
    const users = snap.docs.map((d) => d.data() as User);
    return users.length > 0 ? users : getDefaultUsers();
  } catch (e) {
    console.error('getUsers failed:', e);
    return getDefaultUsers();
  }
}

export async function updateUser(user: User): Promise<boolean> {
  if (isLocalMode()) {
    const list = getLocal<User[]>('users', getDefaultUsers());
    const idx = list.findIndex((u) => u.id === user.id);
    if (idx >= 0) list[idx] = user;
    setLocal('users', list);
    return true;
  }
  try {
    await setDoc(doc(db!, 'users', String(user.id)), user);
    return true;
  } catch (e) { console.error(e); return false; }
}

export async function addUser(user: User): Promise<boolean> {
  if (isLocalMode()) {
    const list = getLocal<User[]>('users', getDefaultUsers());
    const newId = Math.max(...list.map((u) => u.id), 0) + 1;
    list.push({ ...user, id: newId });
    setLocal('users', list);
    return true;
  }
  try {
    // Create Firebase Auth account (secondary app so admin stays logged in)
    const uid = await createFirebaseAuthUser(user.username, user.password || '123456');
    const userWithUid = { ...user, uid: uid && uid !== 'existing' ? uid : undefined };
    await setDoc(doc(db!, 'users', String(user.id)), userWithUid);
    return true;
  } catch (e) { console.error(e); return false; }
}

// ─── Dropdown Lists / Settings ───────────────────────────────
export async function getDropdownLists(): Promise<DropdownLists> {
  if (isLocalMode()) return getLocal<DropdownLists>('dropdown_lists', getDefaultDropdowns());
  try {
    const snap = await getDoc(doc(db!, 'settings', 'dropdown_lists'));
    if (snap.exists()) return snap.data() as DropdownLists;
    return getDefaultDropdowns();
  } catch (e) {
    console.error('getDropdownLists failed:', e);
    return getDefaultDropdowns();
  }
}

export async function saveDropdownLists(lists: DropdownLists): Promise<boolean> {
  if (isLocalMode()) { setLocal('dropdown_lists', lists); return true; }
  try {
    await setDoc(doc(db!, 'settings', 'dropdown_lists'), lists);
    return true;
  } catch (e) { console.error(e); return false; }
}

// ─── Audit Log ───────────────────────────────────────────────
export async function addAuditLog(entry: AuditEntry): Promise<boolean> {
  if (isLocalMode()) {
    const list = getLocal<AuditEntry[]>('audit_log', []);
    list.push(entry);
    setLocal('audit_log', list);
    return true;
  }
  try {
    await addDoc(collection(db!, 'audit_log'), { ...entry, createdAt: serverTimestamp() });
    return true;
  } catch (e) { console.error(e); return false; }
}

// ─── Seed initial data (first deploy) ────────────────────────
export async function seedInitialUsersToFirebase(users: User[]): Promise<void> {
  if (!db) return;
  try {
    const snap = await getDocs(collection(db, 'users'));
    if (snap.size > 0) return; // Already seeded
    for (const user of users) {
      await createFirebaseAuthUser(user.username, user.password || '123456');
      await setDoc(doc(db, 'users', String(user.id)), user);
    }
  } catch (e) {
    console.warn('Seed failed (may already exist):', e);
  }
}

// ─── Default Data ────────────────────────────────────────────
export function getDefaultUsers(): User[] {
  return [
    {
      id: 1, name: 'محمد العلي', username: 'admin', password: '123456', role: 'admin',
      avatar: 'م ع', email: 'admin@hr.com', department: 'الموارد البشرية', active: true,
      permissions: [
        { module: 'dashboard', actions: ['view', 'create', 'edit', 'delete', 'export', 'import'] },
        { module: 'responsibilities', actions: ['view', 'create', 'edit', 'delete', 'export', 'import'] },
        { module: 'audit', actions: ['view', 'export'] },
        { module: 'settings', actions: ['view', 'edit', 'delete'] },
        { module: 'users', actions: ['view', 'create', 'edit', 'delete'] },
      ],
    },
    {
      id: 2, name: 'فاطمة الزهراني', username: 'reviewer', password: '123456', role: 'reviewer',
      avatar: 'ف ز', email: 'reviewer@hr.com', department: 'الموارد البشرية', active: true,
      permissions: [
        { module: 'dashboard', actions: ['view'] },
        { module: 'responsibilities', actions: ['view', 'edit', 'export'] },
        { module: 'audit', actions: ['view', 'export'] },
        { module: 'settings', actions: ['view', 'edit'] },
        { module: 'users', actions: ['view'] },
      ],
    },
    {
      id: 3, name: 'سارة أحمد', username: 'sarah', password: '123456', role: 'specialist',
      avatar: 'س أ', email: 'sarah@hr.com', department: 'الموارد البشرية', active: true,
      permissions: [
        { module: 'dashboard', actions: ['view'] },
        { module: 'responsibilities', actions: ['view', 'edit', 'export'] },
      ],
    },
    {
      id: 4, name: 'خالد العمري', username: 'khaled', password: '123456', role: 'specialist',
      avatar: 'خ ع', email: 'khaled@hr.com', department: 'الموارد البشرية', active: true,
      permissions: [
        { module: 'dashboard', actions: ['view'] },
        { module: 'responsibilities', actions: ['view', 'edit', 'export'] },
      ],
    },
    {
      id: 5, name: 'نورة الفهد', username: 'noura', password: '123456', role: 'specialist',
      avatar: 'ن ف', email: 'noura@hr.com', department: 'الموارد البشرية', active: true,
      permissions: [
        { module: 'dashboard', actions: ['view'] },
        { module: 'responsibilities', actions: ['view', 'edit', 'export'] },
      ],
    },
    {
      id: 6, name: 'عبدالله السالم', username: 'viewer', password: '123456', role: 'viewer',
      avatar: 'ع س', email: 'viewer@hr.com', department: 'الموارد البشرية', active: true,
      permissions: [
        { module: 'dashboard', actions: ['view'] },
        { module: 'responsibilities', actions: ['view'] },
      ],
    },
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
