import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, ToggleLeft, ToggleRight, Upload, X, Download } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getRoleLabel } from '@/data/users';
import type { User } from '@/types';

const emptyUser: Omit<User, 'id' | 'avatar'> = {
  name: '',
  username: '',
  password: '123456',
  role: 'specialist',
  email: '',
  department: 'الموارد البشرية',
  active: true,
  permissions: [],
};

export default function UsersPage() {
  const { users, updateUser, addUser, showToast } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ ...emptyUser });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (!formData.name || !formData.username) {
      showToast('يرجى إدخال الاسم واسم المستخدم', 'error');
      return;
    }
    const perms: User['permissions'] = [];
    if (formData.role === 'admin') {
      perms.push(
        { module: 'dashboard', actions: ['view', 'create', 'edit', 'delete', 'export', 'import'] },
        { module: 'responsibilities', actions: ['view', 'create', 'edit', 'delete', 'export', 'import'] },
        { module: 'audit', actions: ['view', 'export'] },
        { module: 'settings', actions: ['view', 'edit', 'delete'] },
        { module: 'users', actions: ['view', 'create', 'edit', 'delete'] },
      );
    } else if (formData.role === 'reviewer') {
      perms.push(
        { module: 'dashboard', actions: ['view'] },
        { module: 'responsibilities', actions: ['view', 'edit', 'export'] },
        { module: 'audit', actions: ['view', 'export'] },
        { module: 'settings', actions: ['view', 'edit'] },
        { module: 'users', actions: ['view'] },
      );
    } else {
      perms.push(
        { module: 'dashboard', actions: ['view'] },
        { module: 'responsibilities', actions: ['view', 'edit', 'export'] },
        { module: 'audit', actions: ['view'] },
      );
    }
    const userData = {
      ...formData,
      permissions: perms,
      avatar: formData.name.split(' ').map((w) => w[0]).join(' ').slice(0, 4),
    };
    if (editUser) {
      updateUser({ ...editUser, ...userData });
      showToast('تم تحديث المستخدم');
    } else {
      addUser(userData as unknown as User);
      showToast('تم إضافة المستخدم');
    }
    resetForm();
  };

  const resetForm = () => {
    setEditUser(null);
    setFormData({ ...emptyUser });
    setShowForm(false);
  };

  const toggleActive = (user: User) => {
    updateUser({ ...user, active: !user.active });
    showToast(user.active ? 'تم إلغاء تنشيط المستخدم' : 'تم تنشيط المستخدم');
  };

  const downloadTemplate = () => {
    const csv = '\uFEFFاسم الموظف,اسم المستخدم,كلمة المرور,الدور,القسم\nمثال: أحمد,ahmed,123456,أخصائي,الموارد البشرية\nملاحظة: الدور يمكن أن يكون (مدير / مراجع / أخصائي)';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'نموذج_موظفين.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim());
        if (lines.length < 2) { showToast('الملف فارغ', 'error'); return; }
        let added = 0;
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim());
          if (cols.length < 2 || !cols[0] || !cols[1]) continue;
          const name = cols[0];
          const username = cols[1];
          const password = cols[2] || '123456';
          const roleStr = (cols[3] || 'أخصائي').trim();
          const role = roleStr === 'مدير' ? 'admin' : roleStr === 'مراجع' ? 'reviewer' : 'specialist';
          const department = cols[4] || 'الموارد البشرية';
          const avatar = name.split(' ').map((w) => w[0]).join(' ').slice(0, 4);
          const perms: User['permissions'] = role === 'admin'
            ? [{ module: 'dashboard', actions: ['view', 'create', 'edit', 'delete', 'export', 'import'] }, { module: 'responsibilities', actions: ['view', 'create', 'edit', 'delete', 'export', 'import'] }, { module: 'audit', actions: ['view', 'export'] }, { module: 'settings', actions: ['view', 'edit', 'delete'] }, { module: 'users', actions: ['view', 'create', 'edit', 'delete'] }]
            : role === 'reviewer'
            ? [{ module: 'dashboard', actions: ['view'] }, { module: 'responsibilities', actions: ['view', 'edit', 'export'] }, { module: 'audit', actions: ['view', 'export'] }, { module: 'settings', actions: ['view', 'edit'] }, { module: 'users', actions: ['view'] }]
            : [{ module: 'dashboard', actions: ['view'] }, { module: 'responsibilities', actions: ['view', 'edit', 'export'] }, { module: 'audit', actions: ['view'] }];
          addUser({ name, username, password, role: role as User['role'], avatar, email: `${username}@hr.com`, department, active: true, permissions: perms, id: 0 });
          added++;
        }
        showToast(`تم استيراد ${added} موظف`);
      } catch { showToast('خطأ في قراءة الملف', 'error'); }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-slate-400 text-sm">إجمالي المستخدمين: <span className="text-white font-bold">{users.length}</span></div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-medium border border-slate-700 hover:bg-slate-700 transition-colors">
            <Download className="w-4 h-4" /> تنزيل نموذج
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-medium border border-slate-700 hover:bg-slate-700 transition-colors">
            <Upload className="w-4 h-4" /> تحميل من Excel
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold hover:shadow-lg hover:shadow-emerald-900/30 transition-all">
            <Plus className="w-4 h-4" /> إضافة مستخدم
          </button>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-800">
                <th className="text-right text-slate-500 text-xs font-bold py-3.5 px-4">المستخدم</th>
                <th className="text-right text-slate-500 text-xs font-bold py-3.5 px-4 hidden md:table-cell">اسم المستخدم</th>
                <th className="text-right text-slate-500 text-xs font-bold py-3.5 px-4">الدور</th>
                <th className="text-right text-slate-500 text-xs font-bold py-3.5 px-4 hidden lg:table-cell">القسم</th>
                <th className="text-center text-slate-500 text-xs font-bold py-3.5 px-4">الحالة</th>
                <th className="text-center text-slate-500 text-xs font-bold py-3.5 px-4">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs ${u.role === 'admin' ? 'bg-gradient-to-br from-amber-500 to-orange-600' : u.role === 'reviewer' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : u.role === 'viewer' ? 'bg-gradient-to-br from-slate-500 to-slate-600' : 'bg-gradient-to-br from-emerald-500 to-teal-600'}`}>
                        {u.avatar}
                      </div>
                      <div>
                        <div className="text-white font-semibold text-sm">{u.name}</div>
                        <div className="text-slate-500 text-xs">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 text-sm hidden md:table-cell">{u.username}</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${u.role === 'admin' ? 'bg-amber-600/20 text-amber-400' : u.role === 'reviewer' ? 'bg-blue-600/20 text-blue-400' : u.role === 'viewer' ? 'bg-slate-600/20 text-slate-400' : 'bg-emerald-600/20 text-emerald-400'}`}>
                      {getRoleLabel(u.role)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 text-sm hidden lg:table-cell">{u.department}</td>
                  <td className="py-3.5 px-4 text-center">
                    <button onClick={() => toggleActive(u)} className="transition-opacity hover:opacity-80">
                      {u.active ? <ToggleRight className="w-6 h-6 text-emerald-500" /> : <ToggleLeft className="w-6 h-6 text-slate-600" />}
                    </button>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => { setEditUser(u); setFormData({ ...u }); setShowForm(true); }} className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-blue-400 hover:bg-slate-700 flex items-center justify-center transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && resetForm()}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-bold text-lg">{editUser ? 'تعديل مستخدم' : 'إضافة مستخدم'}</h3>
                <button onClick={resetForm} className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-400 text-sm font-medium mb-2">الاسم الكامل</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-emerald-600" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-sm font-medium mb-2">اسم المستخدم</label>
                    <input type="text" value={formData.username} onChange={(e) => setFormData((p) => ({ ...p, username: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-emerald-600" />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm font-medium mb-2">كلمة المرور</label>
                    <input type="text" value={formData.password} onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-emerald-600" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-sm font-medium mb-2">الدور</label>
                    <select value={formData.role} onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value as User['role'] }))} className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-emerald-600">
                      <option value="specialist">أخصائي</option>
                      <option value="reviewer">مراجع</option>
                      <option value="admin">مدير النظام</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm font-medium mb-2">القسم</label>
                    <input type="text" value={formData.department} onChange={(e) => setFormData((p) => ({ ...p, department: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-emerald-600" />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 text-sm font-medium mb-2">البريد الإلكتروني</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-emerald-600" />
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button onClick={handleSave} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm hover:shadow-lg transition-all">
                    {editUser ? 'حفظ التعديلات' : 'إضافة مستخدم'}
                  </button>
                  <button onClick={resetForm} className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 text-sm font-bold hover:bg-slate-700 transition-colors">إلغاء</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
