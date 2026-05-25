import type { User, Permission } from '@/types';

export const INITIAL_USERS: User[] = [
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

export function hasPermission(
  user: { role: string; permissions: Permission[] } | null,
  module: string,
  action: string
): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const perm = user.permissions.find((p) => p.module === module);
  if (!perm) return false;
  return perm.actions.includes(action as never);
}

export function getRoleLabel(role: string): string {
  switch (role) {
    case 'admin': return 'مدير النظام';
    case 'reviewer': return 'مراجع';
    case 'specialist': return 'أخصائي';
    case 'viewer': return 'مشاهد';
    default: return role;
  }
}
