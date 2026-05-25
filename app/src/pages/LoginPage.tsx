import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, LogIn, User, Lock, Moon, Sun, Loader2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getRoleLabel, INITIAL_USERS } from '@/data/users';

export default function LoginPage() {
  const { loginWithCredentials, toggleDarkMode, darkMode } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setErrorMsg('');
    if (!username.trim() || !password.trim()) {
      setErrorMsg('أدخل اسم المستخدم وكلمة المرور');
      return;
    }
    setIsLoading(true);
    try {
      const result = await loginWithCredentials(username.trim(), password.trim());
      if (!result.success) {
        setErrorMsg(result.error || 'اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch {
      setErrorMsg('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg('');
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950' : 'bg-gradient-to-br from-gray-100 via-gray-50 to-white'}`}>
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <button onClick={toggleDarkMode} className={`absolute top-6 left-6 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${darkMode ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-white text-slate-700 border border-gray-200 shadow-sm'}`}>
        {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </button>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200 }} className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Shield className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>نظام إدارة المسؤوليات</h1>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>HR Responsibility Management System</p>
        </div>

        <div className={`rounded-2xl p-6 shadow-2xl ${darkMode ? 'bg-slate-900/60 border border-slate-800 backdrop-blur-xl' : 'bg-white border border-gray-200 shadow-xl'}`}>
          <h2 className={`text-lg font-semibold mb-1 text-center ${darkMode ? 'text-white' : 'text-slate-800'}`}>تسجيل الدخول</h2>
          <p className={`text-sm mb-5 text-center ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>أدخل بيانات حسابك</p>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium text-center">{errorMsg}</div>
          )}

          <div className="space-y-4">
            <div className="relative">
              <User className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`} />
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="اسم المستخدم"
                disabled={isLoading}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className={`w-full border rounded-xl py-3 pr-10 pl-4 text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-600 transition-colors disabled:opacity-50 ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-600' : 'bg-gray-50 border-gray-300 text-slate-800 placeholder-gray-400'}`} />
            </div>
            <div className="relative">
              <Lock className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`} />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور"
                disabled={isLoading}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className={`w-full border rounded-xl py-3 pr-10 pl-12 text-sm focus:outline-none focus:border-emerald-600 transition-colors disabled:opacity-50 ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-600' : 'bg-gray-50 border-gray-300 text-slate-800 placeholder-gray-400'}`} />
              <button onClick={() => setShowPassword(!showPassword)} className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs ${darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}>{showPassword ? 'إخفاء' : 'إظهار'}</button>
            </div>
          </div>

          <motion.button
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full mt-5 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-base transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            {isLoading ? 'جاري الدخول...' : 'دخول النظام'}
          </motion.button>

          <div className="mt-5 pt-4 border-t border-slate-800">
            <p className={`text-xs mb-3 text-center ${darkMode ? 'text-slate-600' : 'text-gray-400'}`}>تسجيل سريع</p>
            <div className="grid grid-cols-3 gap-2">
              {INITIAL_USERS.map((u) => (
                <button key={u.id} onClick={() => fillCredentials(u.username, u.password)}
                  disabled={isLoading}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all text-right text-xs relative ${!u.active ? 'opacity-50' : ''} ${username === u.username ? 'border-emerald-600 bg-emerald-600/10 text-emerald-500' : darkMode ? 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600' : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'}`}>
                  {!u.active && <span className="absolute -top-1.5 -left-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">غير نشط</span>}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0 ${u.role === 'admin' ? 'bg-gradient-to-br from-amber-500 to-orange-600' : u.role === 'reviewer' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : u.role === 'viewer' ? 'bg-gradient-to-br from-slate-500 to-slate-600' : 'bg-gradient-to-br from-emerald-500 to-teal-600'}`}>{u.avatar}</div>
                  <div>
                    <div className="font-semibold text-xs">{u.username}</div>
                    <div className={`text-[10px] ${darkMode ? 'opacity-70' : 'text-gray-400'}`}>{getRoleLabel(u.role)}</div>
                  </div>
                </button>
              ))}
            </div>
            <p className={`text-[10px] mt-2 text-center ${darkMode ? 'text-slate-600' : 'text-gray-400'}`}>كلمة المرور الافتراضية: 123456</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
