interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const statusMap: Record<string, { bg: string; text: string; label: string }> = {
  مكتمل: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'مكتمل' },
  جاري: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'جاري' },
  ناقص: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'ناقص' },
  مسودة: { bg: 'bg-slate-500/15', text: 'text-slate-400', label: 'مسودة' },
};

const impactMap: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'منخفض' },
  medium: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'متوسط' },
  high: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'عالي' },
  critical: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'حرج' },
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const style = statusMap[status] || impactMap[status] || { bg: 'bg-slate-500/15', text: 'text-slate-400', label: status };
  const sizeClass = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';
  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${style.bg} ${style.text} ${sizeClass}`}>
      {style.label}
    </span>
  );
}
