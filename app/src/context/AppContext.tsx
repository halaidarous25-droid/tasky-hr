import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User, Responsibility, FilterState, AppPage, DropdownLists } from '@/types';
import { INITIAL_DATA } from '@/data/demoData';
import { INITIAL_USERS } from '@/data/users';
import {
  getResponsibilities, createResponsibility, updateResponsibility as apiUpdateResp,
  deleteResponsibility as apiDeleteResp, getUsers, updateUser as apiUpdateUser,
  addUser as apiAddUser, getDropdownLists, saveDropdownLists,
  isLocalMode, getDefaultDropdowns, loginUser, logoutUser,
  subscribeToAuthState, seedInitialUsersToFirebase,
} from '@/lib/firebase/client';

interface AppState {
  currentUser: User | null;
  currentPage: AppPage;
  selectedId: number | null;
  data: Responsibility[];
  users: User[];
  filters: FilterState;
  toast: { message: string; type: 'success' | 'error' } | null;
  dropdownLists: DropdownLists;
  darkMode: boolean;
  sidebarCollapsed: boolean;
  isLoading: boolean;
  connectionMode: 'local' | 'cloud';
}

interface AppContextType extends AppState {
  login: (user: User) => void;
  loginWithCredentials: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  navigate: (page: AppPage, id?: number | null) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  addResponsibility: (resp: Responsibility) => Promise<void>;
  updateResponsibility: (resp: Responsibility) => Promise<void>;
  deleteResponsibility: (id: number) => Promise<void>;
  toggleResponsibilityActive: (id: number) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  clearToast: () => void;
  setUsers: (users: User[]) => void;
  updateUser: (user: User) => Promise<void>;
  addUser: (user: User) => void;
  updateDropdownLists: (lists: DropdownLists) => Promise<void>;
  resetDropdownDefaults: () => void;
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
}

const defaultFilters: FilterState = {
  search: '', owner: '', category: '', channel: '', impact: '', status: '',
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    currentUser: null,
    currentPage: 'login',
    selectedId: null,
    data: [],
    users: [],
    filters: { ...defaultFilters },
    toast: null,
    dropdownLists: getDefaultDropdowns(),
    darkMode: true,
    sidebarCollapsed: true,
    isLoading: true,
    connectionMode: isLocalMode() ? 'local' : 'cloud',
  });

  // ─── Load all data on mount ──────────────────────────────────
  useEffect(() => {
    async function loadAll() {
      try {
        const [resps, usersList, lists] = await Promise.all([
          getResponsibilities(),
          getUsers(),
          getDropdownLists(),
        ]);

        const finalResps = resps.length > 0 ? resps : INITIAL_DATA;
        const finalUsers = usersList.length > 0 ? usersList : INITIAL_USERS;

        setState(prev => ({
          ...prev,
          data: finalResps,
          users: finalUsers,
          dropdownLists: lists,
          isLoading: false,
          connectionMode: isLocalMode() ? 'local' : 'cloud',
        }));

        // Seed demo data on first cloud deploy
        if (!isLocalMode()) {
          if (resps.length === 0) {
            for (const resp of INITIAL_DATA) {
              await createResponsibility(resp);
            }
          }
          if (usersList.length === 0) {
            await seedInitialUsersToFirebase(INITIAL_USERS);
          }
        }
      } catch (e) {
        console.error('Failed to load data:', e);
        setState(prev => ({ ...prev, data: INITIAL_DATA, users: INITIAL_USERS, isLoading: false, connectionMode: 'local' }));
      }
    }
    loadAll();
  }, []);

  // ─── Firebase Auth state listener (session persistence) ─────
  useEffect(() => {
    const unsubscribe = subscribeToAuthState((user) => {
      if (user) {
        setState(prev => ({
          ...prev,
          currentUser: user,
          currentPage: prev.currentPage === 'login' ? 'dashboard' : prev.currentPage,
        }));
      }
    });
    return unsubscribe;
  }, []);

  // ─── Auth ────────────────────────────────────────────────────
  const login = useCallback((user: User) => {
    setState((prev) => ({ ...prev, currentUser: user, currentPage: 'dashboard' }));
  }, []);

  const loginWithCredentials = useCallback(async (username: string, password: string) => {
    const result = await loginUser(username, password);
    if (result.success && result.user) {
      setState((prev) => ({ ...prev, currentUser: result.user!, currentPage: 'dashboard' }));
    }
    return { success: result.success, error: result.error };
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    setState((prev) => ({ ...prev, currentUser: null, currentPage: 'login' }));
  }, []);

  // ─── Navigation ──────────────────────────────────────────────
  const navigate = useCallback((page: AppPage, id?: number | null) => {
    setState((prev) => ({ ...prev, currentPage: page, selectedId: id !== undefined ? id : prev.selectedId }));
  }, []);

  const setFilters = useCallback((filters: Partial<FilterState>) => {
    setState((prev) => ({ ...prev, filters: { ...prev.filters, ...filters } }));
  }, []);

  const resetFilters = useCallback(() => {
    setState((prev) => ({ ...prev, filters: { ...defaultFilters } }));
  }, []);

  // ─── Responsibilities CRUD ───────────────────────────────────
  const addResponsibility = useCallback(async (resp: Responsibility) => {
    await createResponsibility(resp);
    setState((prev) => ({ ...prev, data: [...prev.data, resp] }));
  }, []);

  const updateResponsibility = useCallback(async (resp: Responsibility) => {
    await apiUpdateResp(resp);
    setState((prev) => ({ ...prev, data: prev.data.map((r) => (r.id === resp.id ? resp : r)) }));
  }, []);

  const deleteResponsibility = useCallback(async (id: number) => {
    await apiDeleteResp(id);
    setState((prev) => ({ ...prev, data: prev.data.filter((r) => r.id !== id) }));
  }, []);

  const toggleResponsibilityActive = useCallback((id: number) => {
    setState((prev) => ({ ...prev, data: prev.data.map((r) => (r.id === id ? { ...r, active: !r.active } : r)) }));
  }, []);

  // ─── Toast ───────────────────────────────────────────────────
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setState((prev) => ({ ...prev, toast: { message, type } }));
    setTimeout(() => { setState((prev) => ({ ...prev, toast: null })); }, 3000);
  }, []);

  const clearToast = useCallback(() => { setState((prev) => ({ ...prev, toast: null })); }, []);

  // ─── Users ───────────────────────────────────────────────────
  const setUsers = useCallback((users: User[]) => { setState((prev) => ({ ...prev, users })); }, []);

  const updateUser = useCallback(async (user: User) => {
    await apiUpdateUser(user);
    setState((prev) => ({ ...prev, users: prev.users.map((u) => (u.id === user.id ? user : u)) }));
  }, []);

  const addUser = useCallback(async (user: User) => {
    const newUser = { ...user, id: Math.max(0, ...state.users.map((u) => u.id)) + 1 };
    await apiAddUser(newUser);
    setState((prev) => ({ ...prev, users: [...prev.users, newUser] }));
  }, [state.users]);

  // ─── Settings ────────────────────────────────────────────────
  const updateDropdownLists = useCallback(async (lists: DropdownLists) => {
    await saveDropdownLists(lists);
    setState((prev) => ({ ...prev, dropdownLists: lists }));
  }, []);

  const resetDropdownDefaults = useCallback(() => {
    const defaults = getDefaultDropdowns();
    setState((prev) => ({ ...prev, dropdownLists: defaults }));
  }, []);

  // ─── UI Prefs ────────────────────────────────────────────────
  const toggleDarkMode = useCallback(() => {
    setState((prev) => ({ ...prev, darkMode: !prev.darkMode }));
  }, []);

  const toggleSidebar = useCallback(() => {
    setState((prev) => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }));
  }, []);

  return (
    <AppContext.Provider value={{
      ...state,
      login, loginWithCredentials, logout, navigate, setFilters, resetFilters,
      addResponsibility, updateResponsibility, deleteResponsibility, toggleResponsibilityActive,
      showToast, clearToast, setUsers, updateUser, addUser,
      updateDropdownLists, resetDropdownDefaults, toggleDarkMode, toggleSidebar,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
