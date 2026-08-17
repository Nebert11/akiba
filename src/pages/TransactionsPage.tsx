import { useState, useMemo } from 'react';
import {
  ArrowUpRight, ArrowDownRight, ArrowLeftRight, RotateCcw, Sliders,
  Plus, Search, Trash2, X,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, formatDate, monthKey } from '@/lib/format';
import { calculateFee, PROVIDER_LABELS, TRANSACTION_TYPE_LABELS } from '@/lib/fees';
import type { TransactionType } from '@/types';

const TX_TYPES: { value: TransactionType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'expense', label: 'Expense', icon: ArrowUpRight },
  { value: 'income', label: 'Income', icon: ArrowDownRight },
  { value: 'transfer', label: 'Transfer', icon: ArrowLeftRight },
  { value: 'refund', label: 'Refund', icon: RotateCcw },
  { value: 'adjustment', label: 'Adjustment', icon: Sliders },
];

export function TransactionsPage() {
  const { transactions, categories, accounts, feeRules, addTransaction, deleteTransaction } = useData();
  const { profile } = useAuth();
  const currency = profile?.currency || 'KES';

  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>(monthKey(new Date()));

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [feeProvider, setFeeProvider] = useState('cash');
  const [feeTxType, setFeeTxType] = useState('purchase');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const feePreview = useMemo(() => {
    const amt = parseFloat(amount) || 0;
    return calculateFee(amt, feeProvider, feeTxType, feeRules);
  }, [amount, feeProvider, feeTxType, feeRules]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (monthKey(t.transaction_date) !== filterMonth) return false;
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [transactions, filterType, filterMonth, search]);

  const monthOptions = useMemo(() => {
    const months: { value: string; label: string }[] = [];
    const seen = new Set<string>();
    for (const t of transactions) {
      const mk = monthKey(t.transaction_date);
      if (!seen.has(mk)) {
        seen.add(mk);
        months.push({
          value: mk,
          label: new Date(mk + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        });
      }
    }
    if (!seen.has(monthKey(new Date()))) {
      months.unshift({
        value: monthKey(new Date()),
        label: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      });
    }
    return months;
  }, [transactions]);

  function resetForm() {
    setType('expense');
    setAmount('');
    setCategoryId('');
    setAccountId('');
    setToAccountId('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setFeeProvider('cash');
    setFeeTxType('purchase');
    setNotes('');
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError('Please enter a valid amount'); return; }
    if (!description.trim()) { setError('Please enter a description'); return; }
    if ((type === 'expense' || type === 'income') && !accountId) { setError('Please select an account'); return; }
    if (type === 'transfer' && (!accountId || !toAccountId)) { setError('Please select both source and destination accounts'); return; }
    if (type === 'transfer' && accountId === toAccountId) { setError('Source and destination accounts must be different'); return; }

    setSaving(true);
    const fee = type === 'transfer' || type === 'expense' ? feePreview.fee : 0;
    const total = amt + fee;

    const { error: txError } = await addTransaction({
      type,
      amount: amt,
      category_id: categoryId || null,
      account_id: accountId || null,
      to_account_id: type === 'transfer' ? toAccountId || null : null,
      description: description.trim(),
      transaction_date: date,
      payment_method: feeProvider,
      fee_amount: fee,
      total_amount: total,
      notes: notes.trim() || null,
    });

    setSaving(false);
    if (txError) {
      setError(txError);
    } else {
      resetForm();
      setModalOpen(false);
    }
  }

  const availableFeeTxTypes = useMemo(() => {
    const types = feeRules.filter((r) => r.provider === feeProvider).map((r) => r.transaction_type);
    return [...new Set(types)];
  }, [feeRules, feeProvider]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
          <p className="mt-1 text-sm text-slate-500">Record and track all your financial activity</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> Add Transaction
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input placeholder="Search description..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">All types</option>
              {TX_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
            <Select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
              {monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-slate-400">No transactions found for this filter</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filtered.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/50 transition group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      t.type === 'income' ? 'bg-emerald-50 text-emerald-600' :
                      t.type === 'transfer' ? 'bg-blue-50 text-blue-600' :
                      t.type === 'refund' ? 'bg-purple-50 text-purple-600' :
                      t.type === 'adjustment' ? 'bg-slate-100 text-slate-600' :
                      'bg-red-50 text-red-600'
                    }`}>
                      {(() => {
                        const txType = TX_TYPES.find((tt) => tt.value === t.type);
                        return txType ? <txType.icon className="h-5 w-5" /> : null;
                      })()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{t.description}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{t.category?.name || 'Uncategorized'}</span>
                        {t.account && <><span>·</span><span>{t.account.name}</span></>}
                        <span>·</span>
                        <span>{formatDate(t.transaction_date)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${
                        t.type === 'income' || t.type === 'refund' ? 'text-emerald-600' :
                        t.type === 'transfer' || t.type === 'adjustment' ? 'text-slate-700' :
                        'text-slate-900'
                      }`}>
                        {t.type === 'income' || t.type === 'refund' ? '+' : t.type === 'transfer' ? '' : '-'}
                        {formatCurrency(t.amount, currency)}
                      </p>
                      {t.fee_amount > 0 && <p className="text-xs text-orange-500">+{formatCurrency(t.fee_amount, currency)} fee</p>}
                    </div>
                    <button
                      onClick={() => deleteTransaction(t.id)}
                      className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Transaction" className="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Type</label>
            <div className="grid grid-cols-5 gap-2">
              {TX_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 text-xs font-medium transition ${
                    type === t.value ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Amount" type="number" step="0.01" required placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Input label="Date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <Input label="Description" required placeholder="e.g. Lunch at Java House" value={description} onChange={(e) => setDescription(e.target.value)} />

          <div className="grid gap-4 sm:grid-cols-2">
            {type !== 'transfer' && (
              <Select label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Uncategorized</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            )}
            <Select label={type === 'transfer' ? 'From Account' : 'Account'} value={accountId} onChange={(e) => setAccountId(e.target.value)} required={type !== 'adjustment'}>
              <option value="">Select account</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </div>

          {type === 'transfer' && (
            <Select label="To Account" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} required>
              <option value="">Select destination</option>
              {accounts.filter((a) => a.id !== accountId).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          )}

          {(type === 'expense' || type === 'transfer') && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">Transaction Fee</p>
                {feePreview.fee > 0 ? <Badge color="#f97316">{formatCurrency(feePreview.fee, currency)}</Badge> : <Badge color="#10b981">No fee</Badge>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  label="Provider"
                  value={feeProvider}
                  onChange={(e) => {
                    setFeeProvider(e.target.value);
                    const types = feeRules.filter((r) => r.provider === e.target.value).map((r) => r.transaction_type);
                    if (types.length > 0 && !types.includes(feeTxType)) setFeeTxType(types[0]);
                  }}
                >
                  {Object.entries(PROVIDER_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </Select>
                <Select label="Transaction Type" value={feeTxType} onChange={(e) => setFeeTxType(e.target.value)}>
                  {availableFeeTxTypes.length === 0 ? <option value="purchase">Purchase</option> :
                    availableFeeTxTypes.map((t) => <option key={t} value={t}>{TRANSACTION_TYPE_LABELS[t] || t}</option>)}
                </Select>
              </div>
              {feePreview.fee > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                  <span className="text-slate-500">Total deduction</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(feePreview.total, currency)}</span>
                </div>
              )}
            </div>
          )}

          <Textarea label="Notes (optional)" placeholder="Add any additional details..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />

          {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">{error}</div>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}><X className="h-4 w-4" /> Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Transaction'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
