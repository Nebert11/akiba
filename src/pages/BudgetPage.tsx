import { useState, useMemo } from 'react';
import { Sparkles, Check, X, Info } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { formatCurrency, monthKey } from '@/lib/format';
import { generateBudgetSuggestions, getCategorySpending } from '@/lib/finance';
import { WARNING_COLORS } from '@/lib/constants';
import type { BudgetSuggestion } from '@/types';

export function BudgetPage() {
  const { transactions, categories, budgets, savingsGoals, addBudget } = useData();
  const { profile } = useAuth();
  const currency = profile?.currency || 'KES';
  const now = new Date();
  const mk = monthKey(now);

  const currentBudget = useMemo(() => budgets.find((b) => monthKey(b.month_date) === mk), [budgets, mk]);
  const [suggestions, setSuggestions] = useState<BudgetSuggestion[] | null>(null);
  const [editableAmounts, setEditableAmounts] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const catSpending = useMemo(
    () => getCategorySpending(transactions, categories, currentBudget || null, now),
    [transactions, categories, currentBudget]
  );

  function handleGenerate() {
    if (!profile) return;
    setGenerating(true);
    setTimeout(() => {
      const sugs = generateBudgetSuggestions({ profile, categories, transactions, savingsGoals });
      setSuggestions(sugs);
      const amounts: Record<string, string> = {};
      for (const s of sugs) amounts[s.category_id] = String(s.suggested_amount);
      setEditableAmounts(amounts);
      setGenerating(false);
    }, 300);
  }

  async function saveBudget(status: 'accepted' | 'modified') {
    if (!suggestions || !profile) return;
    setSaving(true);
    setError(null);
    const cats = suggestions.map((s) => ({
      category_id: s.category_id,
      planned_amount: parseFloat(editableAmounts[s.category_id] || String(s.suggested_amount)),
      reason: s.reason,
    }));
    const { error } = await addBudget({
      month_date: now.toISOString().split('T')[0],
      total_income: profile.monthly_income,
      status,
    }, cats);
    setSaving(false);
    if (error) setError(error);
    else setSuggestions(null);
  }

  const totalPlanned = suggestions
    ? suggestions.reduce((sum, s) => sum + parseFloat(editableAmounts[s.category_id] || '0'), 0)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Budget</h1>
        <p className="mt-1 text-sm text-slate-500">Generate an intelligent budget based on your spending history, or manage your current budget.</p>
      </div>

      {!currentBudget && !suggestions && (
        <Card className="bg-gradient-to-br from-emerald-50 to-slate-50 border-emerald-100">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-600/30">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">No budget for this month yet</h2>
            <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
              Let Akiba analyze your income, spending patterns, and savings goals to create a personalized budget plan.
            </p>
            <Button onClick={handleGenerate} disabled={generating} size="lg" className="mt-6">
              <Sparkles className="h-4 w-4" />
              {generating ? 'Analyzing...' : 'Generate Smart Budget'}
            </Button>
          </CardContent>
        </Card>
      )}

      {suggestions && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Suggested Budget Breakdown</CardTitle>
              <Badge color="#10b981">{formatCurrency(totalPlanned, currency)} total</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 flex gap-2">
              <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Each suggestion is based on your actual spending history, fixed expenses, and savings goals. Adjust any amount before accepting.
              </p>
            </div>
            {suggestions.map((s) => (
              <div key={s.category_id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{s.category_name}</p>
                    <p className="text-xs text-slate-500 mt-1">{s.reason}</p>
                  </div>
                  <Input
                    type="number"
                    value={editableAmounts[s.category_id] || ''}
                    onChange={(e) => setEditableAmounts({ ...editableAmounts, [s.category_id]: e.target.value })}
                    className="w-28 text-right"
                  />
                </div>
              </div>
            ))}
            {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">{error}</div>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSuggestions(null)}><X className="h-4 w-4" /> Reject</Button>
              <Button variant="secondary" onClick={() => saveBudget('modified')} disabled={saving}>Modify & Save</Button>
              <Button onClick={() => saveBudget('accepted')} disabled={saving}><Check className="h-4 w-4" /> {saving ? 'Saving...' : 'Accept Budget'}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentBudget && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Budget vs Actual — {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</CardTitle>
                <Badge color="#10b981">{currentBudget.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                      <th className="px-6 py-3 text-left font-medium">Category</th>
                      <th className="px-6 py-3 text-right font-medium">Budget</th>
                      <th className="px-6 py-3 text-right font-medium">Actual</th>
                      <th className="px-6 py-3 text-right font-medium">Difference</th>
                      <th className="px-6 py-3 text-center font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {catSpending.filter((c) => c.budgeted > 0).map((c) => {
                      const diff = c.budgeted - c.spent;
                      const wc = WARNING_COLORS[c.warning_level];
                      return (
                        <tr key={c.category_id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-3.5 font-medium text-slate-900">{c.category_name}</td>
                          <td className="px-6 py-3.5 text-right text-slate-600">{formatCurrency(c.budgeted, currency)}</td>
                          <td className="px-6 py-3.5 text-right text-slate-600">{formatCurrency(c.spent, currency)}</td>
                          <td className={`px-6 py-3.5 text-right font-medium ${diff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {diff >= 0 ? '+' : ''}{formatCurrency(diff, currency)}
                          </td>
                          <td className="px-6 py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${wc.bg} ${wc.text} ${wc.border}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${wc.text.replace('text-', 'bg-')}`} />
                              {wc.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Category Progress</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {catSpending.filter((c) => c.budgeted > 0).map((c) => (
                <div key={c.category_id}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium text-slate-700">{c.category_name}</span>
                    <span className="text-slate-500">{formatCurrency(c.spent, currency)} / {formatCurrency(c.budgeted, currency)}</span>
                  </div>
                  <Progress
                    value={c.pct_consumed}
                    color={c.warning_level === 'red' ? 'bg-red-500' : c.warning_level === 'orange' ? 'bg-orange-500' : c.warning_level === 'yellow' ? 'bg-amber-500' : 'bg-emerald-500'}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
