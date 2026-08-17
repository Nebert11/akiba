import { cn } from '@/lib/cn';

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  color?: string;
  showLabel?: boolean;
}

export function Progress({ value, max = 100, className, color, showLabel }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const barColor = color || (pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-orange-500' : pct >= 60 ? 'bg-amber-500' : 'bg-emerald-500');

  return (
    <div className="space-y-1">
      <div className={cn('h-2.5 w-full overflow-hidden rounded-full bg-slate-100', className)}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-right text-xs text-slate-500">{Math.round(pct)}%</p>
      )}
    </div>
  );
}
