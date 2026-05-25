import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function AuditPage() {
  const { data } = useApp();

  const allLogs = data.flatMap((r) =>
    (r.auditLog || []).map((log) => ({
      ...log,
      responsibility: r.name,
    }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <Clock className="w-5 h-5 text-emerald-400" />
          <h2 className="text-white font-bold">سجل التدقيق</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-right text-slate-500 text-xs font-bold py-3 px-4">التاريخ</th>
                <th className="text-right text-slate-500 text-xs font-bold py-3 px-4">المستخدم</th>
                <th className="text-right text-slate-500 text-xs font-bold py-3 px-4">الإجراء</th>
                <th className="text-right text-slate-500 text-xs font-bold py-3 px-4">المسؤولية</th>
                <th className="text-right text-slate-500 text-xs font-bold py-3 px-4">التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {allLogs.length > 0 ? (
                allLogs.map((log, i) => (
                  <motion.tr
                    key={`${log.id}-${i}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-4 text-slate-400 text-sm">{log.date}</td>
                    <td className="py-3 px-4 text-white text-sm font-medium">{log.user}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${
                          log.action === 'إنشاء'
                            ? 'bg-emerald-600/20 text-emerald-400'
                            : log.action === 'تحديث'
                            ? 'bg-blue-600/20 text-blue-400'
                            : 'bg-amber-600/20 text-amber-400'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-sm">{log.responsibility}</td>
                    <td className="py-3 px-4 text-slate-400 text-sm">{log.details}</td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-medium">لا توجد سجلات تدقيق</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
