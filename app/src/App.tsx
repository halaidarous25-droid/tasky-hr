import { AppProvider, useApp } from '@/context/AppContext';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import Toast from '@/components/Toast';
import LoginPage from '@/pages/LoginPage';
import { AlertTriangle } from 'lucide-react';
import DashboardPage from '@/pages/DashboardPage';
import ResponsibilitiesPage from '@/pages/ResponsibilitiesPage';
import FormPage from '@/pages/FormPage';
import ViewPage from '@/pages/ViewPage';
import AuditPage from '@/pages/AuditPage';
import SettingsPage from '@/pages/SettingsPage';
import UsersPage from '@/pages/UsersPage';
import './App.css';

function AppContent() {
  const { currentPage, sidebarCollapsed, darkMode, currentUser } = useApp();
  const sidebarW = sidebarCollapsed ? '80px' : '288px';

  if (currentPage === 'login') {
    return (
      <div className={darkMode ? '' : 'light-mode'}>
        <LoginPage />
      </div>
    );
  }

  return (
    <div className={darkMode ? '' : 'light-mode'}>
      <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' : 'bg-gradient-to-br from-gray-100 via-gray-50 to-white'}`}>
        <Sidebar />
        <div className="mr-0 lg:mr-[80px] transition-all duration-300" style={{ ['--sidebar-w' as string]: sidebarW }}>
          <div className="lg:mr-0 transition-all duration-300" style={{ marginRight: `calc(${sidebarW} - 80px)` }}>
            <Topbar />
            {/* Inactive user warning banner */}
            {currentUser && !currentUser.active && (
              <div className="bg-red-600/20 border-b border-red-600/30 px-6 py-2.5 flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-red-400 text-sm font-bold">تحذير: حسابك غير نشط - يمكنك فقط استعراض البيانات ولا يمكنك إجراء أي عملية (إضافة/تعديل/حذف)</span>
              </div>
            )}
            <main className="p-6 max-w-7xl mx-auto">
              {currentPage === 'dashboard' && <DashboardPage />}
              {currentPage === 'responsibilities' && <ResponsibilitiesPage />}
              {currentPage === 'form' && <FormPage />}
              {currentPage === 'view' && <ViewPage />}
              {currentPage === 'audit' && <AuditPage />}
              {currentPage === 'settings' && <SettingsPage />}
              {currentPage === 'users' && <UsersPage />}
            </main>
          </div>
        </div>
        <Toast />
      </div>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
