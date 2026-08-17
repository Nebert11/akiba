import { useState, useMemo } from 'react';
import { Plus, Trash2, X, Target, TrendingUp } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Progress } from '@/components/ui/Progress';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, formatPercent, formatDate } from '@/lib/format';

export function GoalsPage() {
  const { savingsGoals, addSavingsGoal, updateSavingsGoal, deleteSavingsGoal } = useData();
  const { profile } = useAuth();
  const currency = profile?.currency || 'KES';

  const [modalOpen, setModalOpen] = useState(false);
  const [contributeOpen, setContributeOpen] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [contribution, setContribution] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goalsWithMeta = useMemo(() => {
    return savingsGoals.map((g) => {
      const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
      const remaining = g.target_amount - g.current_amount;
      let monthsLeft = 0;
      let monthlyRequired = 0;
      let projectedDate: string | null = null;

      if (g.deadline) {
        const dl = new Date(g.deadline);
        monthsLeft = Math.max(1, Math.round((dl.getTime() - new Date().getTime()) / (30 * 86400000)));
        monthlyRequired = remaining / monthsLeft;
      }

      if (g.current_amount > 0 && remaining > 0) {
        const avgMonthly = g.current_amount / Math.max(1, Math.round((new Date().getTime() - new Date(g.created_at).getTime()) / (30 * 86400000)));
        if (avgMonthly > 0) {
          const monthsToComplete = remaining / avgMonthly;
          const projected = new Date();
          projected.setMonth(projected.getMonth() + Math.ceil(monthsToComplete));
          projectedDate = projected.toISOString().split('T')[0];
        }
      }

      return { ...g, pct, remaining, monthsLeft, monthlyRequired, projectedDate };
    });
  }, [savingsGoals]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('Please enter a goal name'); return; }
    const target = parseFloat(targetAmount);
    if (!target || target <= 0) { setError('Please enter a valid target amount'); return; }
    setSaving(true);
    const { error } = await addSavingsGoal({
      name: name.trim(),
      target_amount: target,
      current_amount: parseFloat(currentAmount) || 0,
      deadline: deadline || null,
    });
    setSaving(false);
    if (error) { setError(error); }
    else {
      setName(''); setTargetAmount(''); setCurrentAmount(''); setDeadline('');
      setModalOpen(false);
    }
  }

  async function handleContribute(goalId: string) {
    const amt = parseFloat(contribution);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    const goal = savingsGoals.find((g) => g.id === goalId);
    if (!goal) return;
    setSaving(true);
    const { error } = await updateSavingsGoal(goalId, { current_amount: goal.current_amount + amt });
    setSaving(false);
    if (error) { setError(error); }
    else { setContribution(''); setContributeOpen(null); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Savings Goals</h1>
          <p className="mt-1 text-sm text-slate-500">Track your progress toward financial milestones</p>
        </div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> New Goal</Button>
      </div>

      {goalsWithMeta.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
              <Target className="h-7 w-7 text-emerald-600" />
            </div>
            <p className="text-sm text-slate-400">No savings goals yet. Create one to start tracking your progress.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goalsWithMeta.map((g) => (
            <Card key={g.id} className="group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                      <Target className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{g.name}</p>
                      <p className="text-xs text-slate-400">{formatPercent(g.pct)} complete</p>
                    </div>
                  </div>
                  <button onClick={() => deleteSavingsGoal(g.id)} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition opacity-0 group-hover:opacity-100">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4">
                  <Progress value={g.pct} />
                  <div className="mt-2 flex justify-between text-xs text-slate-400">
                    <span>{formatCurrency(g.current_amount, currency)}</span>
                    <span>{formatCurrency(g.target_amount, currency)}</span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-slate-400">Remaining</p>
                    <p className="font-medium text-slate-700">{formatCurrency(g.remaining, currency)}</p>
                  </div>
                  {g.deadline && (
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-slate-400">Deadline</p>
                      <p className="font-medium text-slate-700">{formatDate(g.deadline)}</p>
                    </div>
                  )}
                  {g.monthlyRequired > 0 && (
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-slate-400">Monthly needed</p>
                      <p className="font-medium text-slate-700">{formatCurrency(g.monthlyRequired, currency)}</p>
                    </div>
                  )}
                  {g.projectedDate && (
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-slate-400">Projected completion</p>
                      <p className="font-medium text-slate-700">{formatDate(g.projectedDate)}</p>
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => setContributeOpen(g.id)}>
                  <TrendingUp className="h-4 w-4" /> Add Contribution
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Savings Goal">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input label="Goal Name" placeholder="e.g. Emergency Fund" required value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Target Amount" type="number" step="0.01" required placeholder="30000" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
            <Input label="Current Amount" type="number" step="0.01" placeholder="0" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} />
          </div>
          <Input label="Deadline (optional)" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} hint="When do you want to reach this goal?" />
          {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}><X className="h-4 w-4" /> Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Goal'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={contributeOpen !== null} onClose={() => setContributeOpen(null)} title="Add Contribution">
        <form onSubmit={(e) => { e.preventDefault(); if (contributeOpen) handleContribute(contributeOpen); }} className="space-y-4">
          <Input label="Contribution Amount" type="number" step="0.01" required placeholder="0.00" value={contribution} onChange={(e) => setContribution(e.target.value)} autoFocus />
          {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setContributeOpen(null)}><X className="h-4 w-4" /> Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Adding...' : 'Add'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
