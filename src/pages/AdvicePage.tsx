import { useMemo } from 'react';
import { Lightbulb, AlertTriangle, TrendingUp, TrendingDown, Info, ShieldCheck } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { monthKey } from '@/lib/format';
import { generateAdvice, getMonthlyCategoryStats } from '@/lib/finance';
import type { WarningLevel } from '@/types';

const SEVERITY_CONFIG: Record<WarningLevel, { icon: React.ComponentType<{ className?: string }>; bg: string; text: string }> = {
  green: { icon: Lightbulb, bg: 'bg-emerald-50', text: 'text-emerald-600' },
  yellow: { icon: AlertTriangle, bg: 'bg-amber-50', text: 'text-amber-600' },
  orange: { icon: AlertTriangle, bg: 'bg-orange-50', text: 'text-orange-600' },
  red: { icon: AlertTriangle, bg: 'bg-red-50', text: 'text-red-600' },
};

export function AdvicePage() {
  const { transactions, categories, budgets } = useData();
  const { profile } = useAuth();
  const now = new Date();
  const mk = monthKey(now);

  const advice = useMemo(() => {
    if (!profile) return [];
    const currentBudget = budgets.find((b) => monthKey(b.month_date) === mk);
    return generateAdvice(transactions, categories, currentBudget || null, profile);
  }, [transactions, categories, budgets, profile, mk]);

  const stats = useMemo(() => getMonthlyCategoryStats(transactions, categories), [transactions, categories]);

  const overspendPatterns = useMemo(() => {
    const patterns: { category: string; count: number; total: number }[] = [];
    for (const stat of stats) {
      let overspendCount = 0;
      for (const m of stat.months.slice(-4)) {
        const budget = budgets.find((b) => monthKey(b.month_date) === m.month);
        const budgeted = budget?.budget_categories?.find((bc) => bc.category_id === stat.category_id)?.planned_amount;
        if (budgeted && m.spent > budgeted) overspendCount++;
      }
      if (overspendCount >= 2) patterns.push({ category: stat.category_name, count: overspendCount, total: 4 });
    }
    return patterns;
  }, [stats, budgets]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Financial Advice</h1>
        <p className="mt-1 text-sm text-slate-500">Personalized, data-driven recommendations based on your actual financial activity.</p>
      </div>

      <Card className="bg-blue-50 border-blue-100">
        <CardContent className="p-4 flex gap-3">
          <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            This advice is generated from your spending patterns and is for informational purposes only. It is not professional financial or investment advice.
          </p>
        </CardContent>
      </Card>

      {advice.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
              <Lightbulb className="h-7 w-7 text-emerald-600" />
            </div>
            <p className="text-sm text-slate-400">No advice available yet. Add transactions and create a budget to get personalized financial insights.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {advice.map((a) => {
            const config = SEVERITY_CONFIG[a.severity];
            const Icon = config.icon;
            return (
              <Card key={a.id}>
                <CardContent className="p-5">
                  <div className="flex gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.bg}`}>
                      <Icon className={`h-5 w-5 ${config.text}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-slate-900">{a.title}</p>
                        <Badge level={a.severity}>{a.severity}</Badge>
                      </div>
                      <p className="text-sm text-slate-600">{a.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {overspendPatterns.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Repeated Overspending Patterns</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {overspendPatterns.map((p, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-orange-100 bg-orange-50/50 p-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0" />
                <p className="text-sm text-slate-700">
                  You exceeded your <span className="font-medium">{p.category}</span> budget in{' '}
                  <span className="font-medium text-orange-700">{p.count} of the last {p.total} months</span>.
                  Consider reviewing this category or adjusting your budget to be more realistic.
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Spending Trends (6 months)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {stats.filter((s) => s.average > 0).map((s) => (
            <div key={s.category_id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
              <div className="flex items-center gap-3">
                {s.trend === 'increasing' ? <TrendingUp className="h-5 w-5 text-red-500" /> :
                 s.trend === 'decreasing' ? <TrendingDown className="h-5 w-5 text-emerald-500" /> :
                 <Info className="h-5 w-5 text-slate-400" />}
                <div>
                  <p className="text-sm font-medium text-slate-900">{s.category_name}</p>
                  <p className="text-xs text-slate-400">Avg: {Math.round(s.average).toLocaleString('en-KE')} KES · Current: {Math.round(s.current).toLocaleString('en-KE')} KES</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-medium ${s.pct_change > 0 ? 'text-red-600' : s.pct_change < 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {s.pct_change > 0 ? '+' : ''}{Math.round(s.pct_change)}%
                </p>
                <p className="text-xs text-slate-400 capitalize">{s.trend}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
