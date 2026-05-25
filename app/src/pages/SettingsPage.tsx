import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, RefreshCw, Check, ChevronDown, ChevronUp,
  Settings, Shield, Users, BookOpen, Trash2, Plus,
  Database, Clock, AlertTriangle, RotateCcw, History,
  Search, ToggleLeft, ToggleRight, Lock, Unlock,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ─── Permission definitions ──────────────────────────────
const PERMISSION_MODULES = [
  { key: 'dashboard', label: 'الشاشة الرئيسية', actions: ['view'] },
  { key: 'responsibilities', label: 'المسؤوليات', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'workflow', label: 'خطوات العمل', actions: ['view', 'edit', 'delete'] },
  { key: 'reports', label: 'التقارير', actions: ['view', 'export'] },
  { key: 'settings', label: 'الإعدادات', actions: ['view', 'edit'] },
  { key: 'dropdowns', label: 'القوائم المنسدلة', actions: ['view', 'edit'] },
  { key: 'permissions', label: 'الصلاحيات', actions: ['view', 'edit'] },
];

const USER_ROLES = [
  { id: 'admin', label: 'Admin', labelAr: 'مدير النظام' },
  { id: 'hr_specialist', label: 'HR Specialist', labelAr: 'أخصائي HR' },
  { id: 'manager', label: 'Manager', labelAr: 'مدير' },
  { id: 'viewer', label: 'Viewer', labelAr: 'مشاهد' },
];

type ListKey = 'categories' | 'channels' | 'actionTypes' | 'completionTypes' | 'durationUnits' | 'docStatuses' | 'procedureTypes';

interface DropdownItem {
  value: string;
  enabled: boolean;
}

export default function SettingsPage() {
  const { dropdownLists, updateDropdownLists, currentUser, data: responsibilities } = useApp();

  // Convert flat lists to DropdownItem[] with enabled status
  const toItems = (arr: string[]): DropdownItem[] => arr.map(v => ({ value: v, enabled: true }));
  const fromItems = (items: DropdownItem[]): string[] => items.filter(i => i.enabled).map(i => i.value);

  const [lists, setLists] = useState<Record<ListKey, DropdownItem[]>>({
    categories: toItems(dropdownLists.categories),
    channels: toItems(dropdownLists.channels),
    actionTypes: toItems(dropdownLists.actionTypes),
    completionTypes: toItems(dropdownLists.completionTypes),
    durationUnits: toItems(dropdownLists.durationUnits),
    docStatuses: toItems(dropdownLists.docStatuses),
    procedureTypes: toItems(dropdownLists.procedureTypes),
  });

  const [activeTab, setActiveTab] = useState('general');
  const [newItems, setNewItems] = useState<Record<string, string>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    categories: true, channels: false, actionTypes: false, completionTypes: false,
    durationUnits: false, docStatuses: false, procedureTypes: false,
  });
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Default state
  const [lastDefaultUpdate, setLastDefaultUpdate] = useState(() => localStorage.getItem('lastDefaultUpdate') || '');
  const [lastDefaultUpdateBy, setLastDefaultUpdateBy] = useState(() => localStorage.getItem('lastDefaultUpdateBy') || '');
  const [showConfirmUpdate, setShowConfirmUpdate] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Permissions state
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, string[]>>>(() => {
    const saved = localStorage.getItem('rolePermissions');
    if (saved) return JSON.parse(saved);
    // Default: admin has all permissions
    const defaults: Record<string, Record<string, string[]>> = {};
    for (const role of USER_ROLES) {
      defaults[role.id] = {};
      for (const mod of PERMISSION_MODULES) {
        defaults[role.id][mod.key] = role.id === 'admin' ? [...mod.actions] : role.id === 'viewer' ? ['view'] : ['view'];
      }
    }
    return defaults;
  });

  const isAdmin = currentUser?.role === 'admin';

  const sections: { key: ListKey; label: string; desc: string }[] = [
    { key: 'categories', label: 'التصنيفات', desc: 'فئات المسؤوليات' },
    { key: 'channels', label: 'القنوات والأنظمة', desc: 'قنوات الطلب والأنظمة المستخدمة' },
    { key: 'actionTypes', label: 'أنواع الإجراءات', desc: 'أنواع الإجراءات داخل بطاقة العمل' },
    { key: 'completionTypes', label: 'أنواع إنجاز العمل', desc: 'طرق إنجاز العمل' },
    { key: 'durationUnits', label: 'وحدات الوقت', desc: 'وحدات قياس الوقت' },
    { key: 'docStatuses', label: 'حالات التوثيق', desc: 'حالات توثيق الإجراء' },
    { key: 'procedureTypes', label: 'أنواع الإجراءات المكتوبة', desc: 'أنواع الإجراءات المكتوبة' },
  ];

  const toggleSection = (key: string) => setExpandedSections(p => ({ ...p, [key]: !p[key] }));

  const removeItem = (section: ListKey, index: number) => {
    setLists(p => ({ ...p, [section]: p[section].filter((_, i) => i !== index) }));
  };

  const toggleItemEnabled = (section: ListKey, index: number) => {
    setLists(p => ({
      ...p,
      [section]: p[section].map((item, i) => i === index ? { ...item, enabled: !item.enabled } : item),
    }));
  };

  const addItem = (section: ListKey) => {
    const val = newItems[section]?.trim();
    if (!val) return;
    if (lists[section].some(i => i.value === val)) return;
    setLists(p => ({ ...p, [section]: [...p[section], { value: val, enabled: true }] }));
    setNewItems(p => ({ ...p, [section]: '' }));
  };

  const handleSave = () => {
    updateDropdownLists({
      categories: fromItems(lists.categories),
      channels: fromItems(lists.channels),
      actionTypes: fromItems(lists.actionTypes),
      completionTypes: fromItems(lists.completionTypes),
      durationUnits: fromItems(lists.durationUnits),
      docStatuses: fromItems(lists.docStatuses),
      procedureTypes: fromItems(lists.procedureTypes),
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleUpdateDefaultState = () => {
    localStorage.setItem('defaultDropdownLists', JSON.stringify(lists));
    const now = new Date().toLocaleString('ar-SA');
    const userName = currentUser?.name || 'غير معروف';
    localStorage.setItem('lastDefaultUpdate', now);
    localStorage.setItem('lastDefaultUpdateBy', userName);
    setLastDefaultUpdate(now);
    setLastDefaultUpdateBy(userName);
    setShowConfirmUpdate(false);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
    updateDropdownLists({
      categories: fromItems(lists.categories),
      channels: fromItems(lists.channels),
      actionTypes: fromItems(lists.actionTypes),
      completionTypes: fromItems(lists.completionTypes),
      durationUnits: fromItems(lists.durationUnits),
      docStatuses: fromItems(lists.docStatuses),
      procedureTypes: fromItems(lists.procedureTypes),
    });
  };

  const toggleRolePermission = (roleId: string, moduleKey: string, action: string) => {
    setRolePermissions(prev => {
      const current = prev[roleId]?.[moduleKey] || [];
      const updated = current.includes(action)
        ? current.filter(a => a !== action)
        : [...current, action];
      const newPerms = {
        ...prev,
        [roleId]: { ...prev[roleId], [moduleKey]: updated },
      };
      localStorage.setItem('rolePermissions', JSON.stringify(newPerms));
      return newPerms;
    });
  };

  const tabs = [
    { id: 'general', label: 'إعدادات عامة', icon: Settings },
    { id: 'dropdowns', label: 'القوائم المنسدلة', icon: BookOpen },
    { id: 'defaultState', label: 'الوضع الافتراضي', icon: Database },
    ...(isAdmin ? [{ id: 'permissions', label: 'الأمن والصلاحيات', icon: Shield }] : []),
  ];

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white">الإعدادات</h1>
          <p className="text-slate-500 text-sm mt-0.5">إدارة القوائم والخيارات والوضع الافتراضي والصلاحيات</p>
        </div>
        <AnimatePresence>
          {saveSuccess && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 text-emerald-400 rounded-lg text-sm font-medium">
              <Check className="w-4 h-4" />تم الحفظ بنجاح
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showSuccessMessage && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg text-sm font-medium">
              <Check className="w-4 h-4" />تم التحديث بنجاح
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900/50 border border-slate-800 rounded-xl p-1 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* ─── Tab: General ──────────────────────────────── */}
      {activeTab === 'general' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-4 max-w-xl">
          <h3 className="text-white font-bold text-sm mb-4">معلومات النظام</h3>
          <div className="space-y-4">
            <div><Label className="text-slate-400 text-xs">اسم النظام</Label>
              <Input value="نظام إدارة المسؤوليات" readOnly className="mt-1 bg-slate-800 border-slate-700 text-white text-sm" /></div>
            <div><Label className="text-slate-400 text-xs">الإصدار</Label>
              <Input value="3.0.0 (Free Canvas Edition)" readOnly className="mt-1 bg-slate-800 border-slate-700 text-white text-sm" /></div>
            <div><Label className="text-slate-400 text-xs">المستخدم الحالي</Label>
              <Input value={currentUser?.name || ''} readOnly className="mt-1 bg-slate-800 border-slate-700 text-white text-sm" /></div>
            <div><Label className="text-slate-400 text-xs">دور المستخدم</Label>
              <Input value={currentUser?.role || ''} readOnly className="mt-1 bg-slate-800 border-slate-700 text-white text-sm" /></div>
            <div><Label className="text-slate-400 text-xs">عدد المسؤوليات</Label>
              <Input value={String(responsibilities.length)} readOnly className="mt-1 bg-slate-800 border-slate-700 text-white text-sm" /></div>
            <div><Label className="text-slate-400 text-xs">آخر تحديث للوضع الافتراضي</Label>
              <div className="mt-1 flex items-center gap-2">
                <Input value={lastDefaultUpdate || 'لم يتم التحديث بعد'} readOnly className="bg-slate-800 border-slate-700 text-white text-sm flex-1" />
                {lastDefaultUpdateBy && <span className="text-slate-500 text-xs">بواسطة: {lastDefaultUpdateBy}</span>}
              </div></div>
          </div>
        </motion.div>
      )}

      {/* ─── Tab: Dropdown Lists (Tags/Hashtags) ───────── */}
      {activeTab === 'dropdowns' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          {sections.map(section => {
            const isExpanded = expandedSections[section.key];
            const items = lists[section.key];
            const search = searchTerms[section.key] || '';
            const filtered = search ? items.filter(i => i.value.toLowerCase().includes(search.toLowerCase())) : items;

            return (
              <div key={section.key} className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <button onClick={() => toggleSection(section.key)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="text-right">
                      <h3 className="text-white font-bold text-sm">{section.label}</h3>
                      <p className="text-slate-500 text-[10px]">{section.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-xs">{items.filter(i => i.enabled).length} مفعل | {items.filter(i => !i.enabled).length} معطل</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-800">
                      <div className="p-4">
                        {/* Search + Add */}
                        <div className="flex gap-2 mb-3">
                          <div className="relative flex-1">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                            <Input
                              value={search}
                              onChange={e => setSearchTerms(p => ({ ...p, [section.key]: e.target.value }))}
                              placeholder="بحث..."
                              className="pr-8 bg-slate-800 border-slate-700 text-white text-sm"
                            />
                          </div>
                          <div className="flex gap-1 flex-1">
                            <Input
                              value={newItems[section.key] || ''}
                              onChange={e => setNewItems(p => ({ ...p, [section.key]: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && addItem(section.key)}
                              placeholder="قيمة جديدة..."
                              className="flex-1 bg-slate-800 border-slate-700 text-white text-sm"
                            />
                            <Button onClick={() => addItem(section.key)} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white px-2">
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Tags / Hashtags */}
                        <div className="flex flex-wrap gap-2">
                          {filtered.map((item, idx) => (
                            <div
                              key={idx}
                              className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                                item.enabled
                                  ? 'bg-blue-600/10 border-blue-600/30 text-blue-400 hover:bg-blue-600/20'
                                  : 'bg-slate-800/50 border-slate-700/50 text-slate-600 line-through'
                              }`}
                            >
                              <span className="text-[10px] opacity-50">#</span>
                              <span>{item.value}</span>
                              {/* Toggle enabled */}
                              <button
                                onClick={() => toggleItemEnabled(section.key, items.indexOf(item))}
                                className="mr-1 text-slate-500 hover:text-white transition-colors"
                                title={item.enabled ? 'تعطيل' : 'تفعيل'}
                              >
                                {item.enabled ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                              </button>
                              {/* Delete */}
                              <button
                                onClick={() => removeItem(section.key, items.indexOf(item))}
                                className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          {filtered.length === 0 && (
                            <p className="text-slate-600 text-sm text-center py-4 w-full">لا توجد عناصر</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setLists({
              categories: toItems(dropdownLists.categories),
              channels: toItems(dropdownLists.channels),
              actionTypes: toItems(dropdownLists.actionTypes),
              completionTypes: toItems(dropdownLists.completionTypes),
              durationUnits: toItems(dropdownLists.durationUnits),
              docStatuses: toItems(dropdownLists.docStatuses),
              procedureTypes: toItems(dropdownLists.procedureTypes),
            })} className="border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800">
              <RefreshCw className="w-4 h-4 ml-2" />استعادة
            </Button>
            <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Save className="w-4 h-4 ml-2" />حفظ التعديلات
            </Button>
          </div>
        </motion.div>
      )}

      {/* ─── Tab: Default State ─────────────────────────── */}
      {activeTab === 'defaultState' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
                <Database className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">تحديث الوضع الافتراضي</h3>
                <p className="text-slate-500 text-xs">اعتماد آخر تعديلات القوائم كإعدادات افتراضية للنظام</p>
              </div>
            </div>

            <div className="bg-slate-800/30 rounded-lg p-4 mb-4 text-xs text-slate-400 space-y-1">
              <p>عند الضغط على "تحديث الوضع الافتراضي"، سيتم حفظ القوائم الحالية كقيم افتراضية وتنعكس على:</p>
              <ul className="list-disc list-inside mr-4 mt-1 space-y-0.5">
                <li>شاشة تصميم العمليات (Workflow)</li>
                <li>تفاصيل البطاقات</li>
                <li>شاشة المسؤوليات</li>
                <li>التقرير المكتوب والتحليلات</li>
              </ul>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>آخر تحديث: {lastDefaultUpdate || 'لم يتم التحديث بعد'}</span>
              </div>
              {lastDefaultUpdateBy && (
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>بواسطة: {lastDefaultUpdateBy}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => setShowConfirmUpdate(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors">
                <Database className="w-4 h-4" />تحديث الوضع الافتراضي
              </button>
              <button onClick={() => {
                const saved = localStorage.getItem('defaultDropdownLists');
                if (saved) { setLists(JSON.parse(saved)); setShowSuccessMessage(true); setTimeout(() => setShowSuccessMessage(false), 3000); }
              }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-slate-400 text-sm font-medium border border-slate-700 hover:text-white hover:bg-slate-700 transition-colors">
                <RotateCcw className="w-4 h-4" />استعادة الوضع السابق
              </button>
            </div>

            <AnimatePresence>
              {showConfirmUpdate && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="mt-4 p-4 bg-amber-600/10 border border-amber-600/30 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-400 text-sm font-bold mb-1">تأكيد التحديث</p>
                      <p className="text-slate-400 text-xs mb-3">هل أنت متأكد من تحديث الوضع الافتراضي؟ سيتم استبدال القيم الافتراضية السابقة.</p>
                      <div className="flex items-center gap-2">
                        <button onClick={handleUpdateDefaultState}
                          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700">نعم، تحديث</button>
                        <button onClick={() => setShowConfirmUpdate(false)}
                          className="px-4 py-2 rounded-lg bg-slate-700 text-slate-400 text-xs hover:text-white">إلغاء</button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Audit Log */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center">
                <History className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">سجل التغييرات</h3>
                <p className="text-slate-500 text-xs">آخر التعديلات على الإعدادات</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-slate-700 text-slate-400">
                  <th className="text-right pb-2 font-medium">التاريخ</th>
                  <th className="text-right pb-2 font-medium">المستخدم</th>
                  <th className="text-right pb-2 font-medium">الإجراء</th>
                </tr></thead>
                <tbody>
                  {lastDefaultUpdate ? (
                    <tr className="border-b border-slate-800/50">
                      <td className="py-2 text-slate-400">{lastDefaultUpdate}</td>
                      <td className="py-2 text-white font-medium">{lastDefaultUpdateBy || 'غير معروف'}</td>
                      <td className="py-2 text-blue-400">تحديث الوضع الافتراضي</td>
                    </tr>
                  ) : (<tr><td colSpan={3} className="py-4 text-center text-slate-600">لا توجد تعديلات مسجلة</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Tab: Permissions (Admin only) ─────────────── */}
      {activeTab === 'permissions' && isAdmin && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-amber-600/10 border border-amber-600/30 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <p className="text-amber-400 text-xs font-bold">هذا القسم متاح فقط لمدير النظام</p>
            </div>
          </div>

          {USER_ROLES.map(role => (
            <div key={role.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">{role.labelAr} <span className="text-slate-500 font-normal">({role.label})</span></h3>
                </div>
              </div>

              <div className="space-y-3">
                {PERMISSION_MODULES.map(mod => (
                  <div key={mod.key} className="bg-slate-800/30 rounded-lg p-3">
                    <div className="text-slate-300 text-xs font-bold mb-2">{mod.label}</div>
                    <div className="flex flex-wrap gap-2">
                      {mod.actions.map(action => {
                        const isGranted = rolePermissions[role.id]?.[mod.key]?.includes(action) || false;
                        return (
                          <button
                            key={action}
                            onClick={() => toggleRolePermission(role.id, mod.key, action)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                              isGranted
                                ? 'bg-emerald-600/15 border-emerald-600/40 text-emerald-400'
                                : 'bg-slate-800 border-slate-700 text-slate-500'
                            }`}
                          >
                            {isGranted ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                            {action === 'view' ? 'عرض' : action === 'create' ? 'إضافة' : action === 'edit' ? 'تعديل' : action === 'delete' ? 'حذف' : action === 'export' ? 'تصدير' : action}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
