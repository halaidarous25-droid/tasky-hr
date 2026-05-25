import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase, CheckCircle, AlertTriangle,
  BarChart3, Activity, Layers, Users,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell,
} from 'recharts';
import { useApp } from '@/context/AppContext';
import type { Responsibility } from '@/types';

const PIE_COLORS = ['#10b981', '#3b82f6', '#ef4444', '#94a3b8'];

export default function DashboardPage() {
  const { data: responsibilities } = useApp();

  const stats = useMemo(() => {
    const total = responsibilities.length;
    const complete = responsibilities.filter((r: Responsibility) => r.documentationStatus === 'مكتمل').length;
    const incomplete = total - complete;
    const highImpact = responsibilities.filter((r: Responsibility) => r.impact === 'high' || r.impact === 'critical').length;
    const topCategories = getTopItems(responsibilities, 'category', 5);
    const topChannels = getTopItems(responsibilities, 'requestChannel', 5);

    return { total, complete, incomplete, highImpact, topCategories, topChannels };
  }, [responsibilities]);

  // Most impactful responsibilities
  const impactfulResponsibilities = useMemo(() => {
    return [...responsibilities]
      .filter((r: Responsibility) => r.active)
      .sort((a: Responsibility, b: Responsibility) => {
        const impactOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        const diff = (impactOrder[b.impact] || 0) - (impactOrder[a.impact] || 0);
        if (diff !== 0) return diff;
        return (b.completionPercentage || 0) - (a.completionPercentage || 0);
      })
      .slice(0, 8);
  }, [responsibilities]);

  const impactData = useMemo(() => {
    const map: Record<string, number> = { 'حرج': 0, 'عالي': 0, 'متوسط': 0, 'منخفض': 0 };
    responsibilities.forEach((r: Responsibility) => {
      const label = r.impact === 'critical' ? 'حرج' : r.impact === 'high' ? 'عالي' : r.impact === 'medium' ? 'متوسط' : 'منخفض';
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [responsibilities]);

  const statusData = useMemo(() => [
    { name: 'مكتمل', value: stats.complete },
    { name: 'غير مكتمل', value: stats.incomplete },
  ], [stats]);

  // Only 4 stat cards (removed: avg completion % and needs review)
  const statCards = [
    { label: 'إجمالي المسؤوليات', value: stats.total, icon: Briefcase, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-600/20' },
    { label: 'مكتملة', value: stats.complete, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-600/20' },
    { label: 'غير مكتملة', value: stats.incomplete, icon: Layers, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-600/20' },
    { label: 'أثر عالي / حرج', value: stats.highImpact, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-600/20' },
  ];

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-black text-white">لوحة المراقبة</h1>
          <p className="text-slate-500 text-sm mt-0.5">نظرة شاملة على مسؤوليات HR Services</p>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-400 text-xs font-medium">محدث</span>
        </div>
      </div>

      {/* Stat Cards - 4 per row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`${s.bg} border ${s.border} rounded-xl p-3`}>
            <s.icon className={`w-4 h-4 ${s.color} mb-2`} />
            <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-slate-500 text-[10px] mt-0.5">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Row 1: Categories + Impact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <h3 className="text-white text-xs font-bold">أكثر التصنيفات</h3>
          </div>
          <div style={{ width: '100%', height: 160 }}>
            <ResponsiveContainer><BarChart data={stats.topCategories} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" tick={{ fontSize: 9, fill: '#64748b' }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#94a3b8' }} width={80} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart></ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-white text-xs font-bold">توزيع الأثر</h3>
          </div>
          <div className="flex items-center gap-4">
            <div style={{ width: 140, height: 140 }}>
              <ResponsiveContainer><PieChart>
                <Pie data={impactData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3} dataKey="value">
                  {impactData.map((_, i) => <Cell key={i} fill={['#ef4444', '#f59e0b', '#3b82f6', '#94a3b8'][i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }} />
              </PieChart></ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1">
              {impactData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#94a3b8'][i] }} />
                  <span className="text-slate-400 text-[10px]">{item.name}</span>
                  <span className="text-slate-500 text-[10px] mr-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Row 2: Status + Channels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <h3 className="text-white text-xs font-bold">حالة التوثيق</h3>
          </div>
          <div className="flex items-center gap-4">
            <div style={{ width: 140, height: 140 }}>
              <ResponsiveContainer><PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3} dataKey="value">
                  {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }} />
              </PieChart></ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1">
              {statusData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                  <span className="text-slate-400 text-[10px]">{item.name}</span>
                  <span className="text-slate-500 text-[10px] mr-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-purple-400" />
            <h3 className="text-white text-xs font-bold">أكثر القنوات استخداماً</h3>
          </div>
          <div className="space-y-1.5">
            {stats.topChannels.map((ch, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-slate-500 text-[10px] w-3">{i + 1}.</span>
                <div className="flex-1 bg-slate-800/50 rounded-full h-5 overflow-hidden relative">
                  <div className="absolute top-0 right-0 h-full bg-purple-600/30 rounded-full" style={{ width: `${Math.max(15, (ch.count / (stats.topChannels[0]?.count || 1)) * 100)}%` }} />
                  <span className="absolute inset-0 flex items-center pr-2 text-[10px] text-slate-300 z-10">{ch.name}</span>
                </div>
                <span className="text-slate-500 text-[10px] w-4 text-left">{ch.count}</span>
              </div>
            ))}
            {stats.topChannels.length === 0 && <p className="text-slate-600 text-xs text-center py-4">لا توجد بيانات</p>}
          </div>
        </motion.div>
      </div>

      {/* Most Impactful Responsibilities */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
        className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h3 className="text-white text-xs font-bold">المسؤوليات الأكثر تأثيراً</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400">
                <th className="text-right pb-2 font-medium">الاسم</th>
                <th className="text-right pb-2 font-medium">الفئة</th>
                <th className="text-right pb-2 font-medium">التأثير</th>
                <th className="text-right pb-2 font-medium">نسبة الاكتمال</th>
              </tr>
            </thead>
            <tbody>
              {impactfulResponsibilities.map((r: Responsibility) => (
                <tr key={r.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="py-2 text-white font-medium">{r.name}</td>
                  <td className="py-2 text-slate-400">{r.category}</td>
                  <td className="py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      r.impact === 'critical' ? 'bg-red-600/20 text-red-400'
                        : r.impact === 'high' ? 'bg-amber-600/20 text-amber-400'
                          : r.impact === 'medium' ? 'bg-blue-600/20 text-blue-400'
                            : 'bg-slate-600/20 text-slate-400'
                    }`}>{r.impact === 'critical' ? 'حرج' : r.impact === 'high' ? 'عالي' : r.impact === 'medium' ? 'متوسط' : 'منخفض'}</span>
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full rounded-full ${
                          (r.completionPercentage || 0) >= 80 ? 'bg-emerald-500'
                            : (r.completionPercentage || 0) >= 50 ? 'bg-blue-500'
                              : (r.completionPercentage || 0) >= 20 ? 'bg-amber-500'
                                : 'bg-red-500'
                        }`} style={{ width: `${r.completionPercentage || 0}%` }} />
                      </div>
                      <span className="text-slate-400 text-[9px]">{r.completionPercentage || 0}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {impactfulResponsibilities.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-center text-slate-600">لا توجد مسؤوليات مسجلة</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

function getTopItems(list: any[], field: string, limit: number) {
  const map: Record<string, number> = {};
  list.forEach((r: any) => { const val = r[field]; if (val) map[val] = (map[val] || 0) + 1; });
  return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, limit);
}
