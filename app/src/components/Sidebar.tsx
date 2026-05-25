import { motion } from 'framer-motion';
import { LayoutDashboard, ClipboardList, Clock, Settings, LogOut, Shield, Menu, X, Users, ChevronRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getRoleLabel, hasPermission } from '@/data/users';
import type { AppPage } from '@/types';
import { useState } from 'react';

const navItems: { id: AppPage; label: string; icon: React.ReactNode; perm: { module: string; action: string } }[] = [
  { id: 'dashboard', label: 'الداشبورد', icon: <LayoutDashboard className="w-5 h-5" />, perm: { module: 'dashboard', action: 'view' } },
  { id: 'responsibilities', label: 'المسؤوليات', icon: <ClipboardList className="w-5 h-5" />, perm: { module: 'responsibilities', action: 'view' } },
  { id: 'audit', label: 'سجل التدقيق', icon: <Clock className="w-5 h-5" />, perm: { module: 'audit', action: 'view' } },
];

export default function Sidebar() {
  const { currentUser, currentPage, navigate, logout, sidebarCollapsed, toggleSidebar } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!currentUser) return null;

  const canManageUsers = hasPermission(currentUser, 'users', 'view');
  const canViewSettings = hasPermission(currentUser, 'settings', 'view');
  const isCollapsed = sidebarCollapsed;

  const NavButton = ({ id, label, icon, active }: { id: AppPage; label: string; icon: React.ReactNode; active: boolean }) => (
    <button onClick={() => { navigate(id); setMobileOpen(false); }}
      className={`w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 ${active ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'} ${isCollapsed ? 'justify-center px-3 py-3' : 'px-4 py-3'}`}
      title={isCollapsed ? label : undefined}
    >
      {icon}
      {!isCollapsed && <span>{label}</span>}
    </button>
  );

  return (
    <>
      <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden fixed top-4 right-4 z-[110] w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
      {mobileOpen && <div className="lg:hidden fixed inset-0 bg-black/50 z-[90]" onClick={() => setMobileOpen(false)} />}

      {/* Toggle button for desktop */}
      <button onClick={toggleSidebar} className="hidden lg:flex fixed z-[110] items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 transition-all"
        style={{ right: isCollapsed ? '66px' : '282px', top: '24px' }}>
        <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
      </button>

      <motion.aside
        initial={{ x: 0 }}
        className={`fixed right-0 top-0 bottom-0 bg-slate-900 border-l border-slate-800 z-[100] flex flex-col transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-72'} ${mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
        <div className={`p-6 border-b border-slate-800 flex items-center gap-3 ${isCollapsed ? 'justify-center p-4' : ''}`}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div>
              <div className="text-white font-bold text-sm">نظام المسؤوليات</div>
              <div className="text-slate-500 text-xs">HR</div>
            </div>
          )}
        </div>

        <nav className={`flex-1 p-3 space-y-1 overflow-y-auto ${isCollapsed ? 'p-2' : 'p-3'}`}>
          {navItems.filter((item) => hasPermission(currentUser, item.perm.module, item.perm.action)).map((item) => (
            <NavButton key={item.id} id={item.id} label={item.label} icon={item.icon} active={currentPage === item.id} />
          ))}

          {canManageUsers && (
            <NavButton id="users" label="المستخدمون" icon={<Users className="w-5 h-5" />} active={currentPage === 'users'} />
          )}

          {canViewSettings && (
            <NavButton id="settings" label="الإعدادات" icon={<Settings className="w-5 h-5" />} active={currentPage === 'settings'} />
          )}
        </nav>

        <div className={`p-4 border-t border-slate-800 ${isCollapsed ? 'p-2' : 'p-4'}`}>
          <div className={`flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl mb-3 ${isCollapsed ? 'justify-center p-2' : ''}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${currentUser.role === 'admin' ? 'bg-gradient-to-br from-amber-500 to-orange-600' : currentUser.role === 'reviewer' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : currentUser.role === 'viewer' ? 'bg-gradient-to-br from-slate-500 to-slate-600' : 'bg-gradient-to-br from-emerald-500 to-teal-600'}`}>
              {currentUser.avatar}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold text-sm truncate">{currentUser.name}</div>
                <div className="text-slate-400 text-xs flex items-center gap-1">
                  {getRoleLabel(currentUser.role)}
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${currentUser.active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className={currentUser.active ? 'text-emerald-500' : 'text-red-500'}>{currentUser.active ? 'نشط' : 'غير نشط'}</span>
                </div>
              </div>
            )}
          </div>
          <button onClick={logout} className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors ${isCollapsed ? 'px-2' : ''}`}>
            <LogOut className="w-4 h-4" />
            {!isCollapsed && <span>تسجيل الخروج</span>}
          </button>
        </div>
      </motion.aside>
    </>
  );
}
