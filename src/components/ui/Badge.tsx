import type { WarningLevel } from '@/types';
import { WARNING_COLORS } from '@/lib/constants';
import { cn } from '@/lib/cn';

interface BadgeProps {
  level?: WarningLevel;
  children: React.ReactNode;
  className?: string;
  color?: string;
}

export function Badge({ level, children, className, color }: BadgeProps) {
  if (level) {
    const c = WARNING_COLORS[level];
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border',
          c.bg,
          c.text,
          c.border,
          className
        )}
      >
        <span className={cn('h-1.5 w-1.5 rounded-full', c.text.replace('text-', 'bg-'))} />
        {children}
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        color ? '' : 'bg-slate-100 text-slate-700',
        className
      )}
      style={color ? { backgroundColor: `${color}15`, color } : undefined}
    >
      {children}
    </span>
  );
}
