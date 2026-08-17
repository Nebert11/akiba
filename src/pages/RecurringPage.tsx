import { useState, useMemo } from 'react';
import { Plus, Trash2, X, Repeat, Check } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, formatDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { TransactionType, Frequency } from '@/types';

const FREQ_LABELS: Record<Frequency, string> = {
  daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly',
};

export function RecurringPage() {
  const { recurringTransactions, categories, accounts, addRecurring, deleteRecurring, addTransaction } = useData();
  const { profile } = useAuth();
  const currency = profile?.currency || 'KES';

  const [modalOpen, setModalOpen] = useState(false);
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [nextDate, setNextDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingId, setRecordingId] = useState<string | null>(null);

  const sortedRecurring = useMemo(() => {
    return [...recurringTransactions].sort((a, b) => new Date(a.next_date).getTime() - new Date(b.next_date).getTime());
  }, [recurringTransactions]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    if (!description.trim()) { setError('Enter a description'); return; }
    if (!nextDate) { setError('Select a next date'); return; }
    setSaving(true);
    const { error } = await addRecurring({
      type, amount: amt, category_id: categoryId || null, account_id: accountId || null,
      description: description.trim(), frequency, next_date: nextDate, active: true,
    });
    setSaving(false);
    if (error) { setError(error); }
    else {
      setType('expense'); setAmount(''); setCategoryId(''); setAccountId('');
      setDescription(''); setFrequency('monthly'); setNextDate('');
      setModalOpen(false);
    }
  }

  async function handleRecord(rec: typeof recurringTransactions[0]) {
    setRecordingId(rec.id);
    await addTransaction({
      type: rec.type, amount: rec.amount, category_id: rec.category_id, account_id: rec.account_id,
      description: rec.description, transaction_date: new Date().toISOString().split('T')[0],
      fee_amount: 0, total_amount: rec.amount, is_recurring: true, recurring_id: rec.id,
    });
    const next = new Date(rec.next_date);
    switch (rec.frequency) {
      case 'daily': next.setDate(next.getDate() + 1); break;
      case 'weekly': next.setDate(next.getDate() + 7); break;
      case 'monthly': next.setMonth(next.getMonth() + 1); break;
      case 'yearly': next.setFullYear(next.getFullYear() + 1); break;
    }
    await supabase.from('recurring_transactions').update({ next_date: next.toISOString().split('T')[0] }).eq('id', rec.id);
    setRecordingId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recurring Transactions</h1>
          <p className="mt-1 text-sm text-slate-500">Automate rent, subscriptions, salary, and other regular payments</p>
        </div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Add Recurring</Button>
      </div>

      {sortedRecurring.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
              <Repeat className="h-7 w-7 text-emerald-600" />
            </div>
            <p className="text-sm text-slate-400">No recurring transactions yet. Add rent, subscriptions, or salary to automate tracking.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedRecurring.map((r) => {
            const isOverdue = new Date(r.next_date) < new Date();
            return (
              <Card key={r.id} className="group">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        r.type === 'income' ? 'bg-emerald-50 text-emerald-600' :
                        r.type === 'transfer' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'
                      }`}>
                        <Repeat className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{r.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge>{FREQ_LABELS[r.frequency]}</Badge>
                          <span className="text-xs text-slate-400">{r.category?.name || 'Uncategorized'}</span>
                          {r.account && <span className="text-xs text-slate-400">· {r.account.name}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${r.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                          {r.type === 'income' ? '+' : '-'}{formatCurrency(r.amount, currency)}
                        </p>
                        <p className={`text-xs ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
                          {isOverdue ? 'Overdue: ' : 'Next: '}{formatDate(r.next_date)}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleRecord(r)} disabled={recordingId === r.id}>
                        <Check className="h-4 w-4" /> {recordingId === r.id ? 'Recording...' : 'Record'}
                      </Button>
                      <button onClick={() => deleteRecurring(r.id)}
                        className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition opacity-0 group-hover:opacity-100">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Recurring Transaction">
        <form onSubmit={handleAdd} className="space-y-4">
          <Select label="Type" value={type} onChange={(e) => setType(e.target.value as TransactionType)}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="transfer">Transfer</option>
          </Select>
          <Input label="Description" required placeholder="e.g. Monthly Rent, Netflix Subscription" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Amount" type="number" step="0.01" required placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Select label="Frequency" value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Uncategorized</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select label="Account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Select account</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </div>
          <Input label="Next Date" type="date" required value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
          {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}><X className="h-4 w-4" /> Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Adding...' : 'Add Recurring'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
