import { Bell, Search, Moon, Sun, Menu } from 'lucide-react';
import { useApp } from '@/context/AppContext';

const pageTitles: Record<string, string> = {
  dashboard: 'لوحة التحكم',
  responsibilities: 'المسؤوليات',
  form: 'نموذج المسؤولية',
  view: 'تفاصيل المسؤولية',
  audit: 'سجل التدقيق',
  settings: 'الإعدادات',
  users: 'المستخدمون',
};

export default function Topbar() {
  const { currentPage, toggleDarkMode, darkMode, toggleSidebar, currentUser } = useApp();

  return (
    <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={toggleSidebar} className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors border border-slate-700">
            <Menu className="w-4 h-4" />
          </button>
          <h1 className="text-white font-bold text-lg">{pageTitles[currentPage] || ''}</h1>
          {currentUser && !currentUser.active && (
            <span className="px-3 py-1 rounded-lg bg-red-600/20 text-red-400 text-xs font-bold flex items-center gap-1">
              غير نشط
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleDarkMode} className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <div className="hidden md:flex items-center bg-slate-800 rounded-xl px-3 py-2 border border-slate-700">
            <Search className="w-4 h-4 text-slate-500 ml-2" />
            <span className="text-slate-400 text-sm">Ctrl+K للبحث</span>
          </div>
          <button className="relative w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-0.5 -left-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">2</span>
          </button>
        </div>
      </div>
    </header>
  );
}
