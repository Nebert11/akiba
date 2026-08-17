import { useState, useMemo } from 'react';
import {
  Smartphone, Building2, Wallet, CreditCard, CircleDollarSign,
  Plus, Trash2, ArrowLeftRight, X,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency } from '@/lib/format';
import { ACCOUNT_TYPE_META } from '@/lib/constants';
import type { AccountType } from '@/types';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Smartphone, Building2, Wallet, CreditCard, CircleDollarSign,
};

export function AccountsPage() {
  const { accounts, transactions, addAccount, deleteAccount, addTransaction } = useData();
  const { profile } = useAuth();
  const currency = profile?.currency || 'KES';

  const [modalOpen, setModalOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('mpesa');
  const [openingBalance, setOpeningBalance] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDesc, setTransferDesc] = useState('');

  const accountBalances = useMemo(() => {
    const balances = new Map<string, number>();
    for (const a of accounts) balances.set(a.id, a.opening_balance);
    for (const t of transactions) {
      if (t.account_id) {
        const cur = balances.get(t.account_id) || 0;
        if (t.type === 'expense') balances.set(t.account_id, cur - t.total_amount);
        else if (t.type === 'income') balances.set(t.account_id, cur + t.amount);
        else if (t.type === 'transfer') balances.set(t.account_id, cur - t.total_amount);
        else if (t.type === 'refund') balances.set(t.account_id, cur + t.amount);
        else if (t.type === 'adjustment') balances.set(t.account_id, cur + t.amount);
      }
      if (t.to_account_id) {
        const cur = balances.get(t.to_account_id) || 0;
        balances.set(t.to_account_id, cur + t.amount);
      }
    }
    return balances;
  }, [accounts, transactions]);

  const totalBalance = useMemo(() => Array.from(accountBalances.values()).reduce((a, b) => a + b, 0), [accountBalances]);

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('Please enter an account name'); return; }
    setSaving(true);
    const { error } = await addAccount({
      name: name.trim(),
      account_type: accountType,
      opening_balance: parseFloat(openingBalance) || 0,
      currency,
    });
    setSaving(false);
    if (error) { setError(error); }
    else {
      setName(''); setOpeningBalance(''); setAccountType('mpesa');
      setModalOpen(false);
    }
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(transferAmount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    if (fromAccount === toAccount) { setError('Select different accounts'); return; }
    setSaving(true);
    const { error: txError } = await addTransaction({
      type: 'transfer',
      amount: amt,
      account_id: fromAccount,
      to_account_id: toAccount,
      description: transferDesc || 'Account Transfer',
      transaction_date: new Date().toISOString().split('T')[0],
      fee_amount: 0,
      total_amount: amt,
    });
    setSaving(false);
    if (txError) { setError(txError); }
    else {
      setFromAccount(''); setToAccount(''); setTransferAmount(''); setTransferDesc('');
      setTransferOpen(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Accounts & Wallets</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your M-Pesa, bank, cash, and card accounts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTransferOpen(true)}>
            <ArrowLeftRight className="h-4 w-4" /> Transfer
          </Button>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> Add Account
          </Button>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300">Total Balance Across All Accounts</p>
              <p className="mt-2 text-3xl font-bold">{formatCurrency(totalBalance, currency)}</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
              <Wallet className="h-7 w-7 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-16 text-center">
              <p className="text-sm text-slate-400">No accounts yet. Add one to get started.</p>
            </CardContent>
          </Card>
        ) : (
          accounts.map((a) => {
            const meta = ACCOUNT_TYPE_META[a.account_type];
            const Icon = ICON_MAP[meta.icon] || CircleDollarSign;
            const balance = accountBalances.get(a.id) || 0;
            return (
              <Card key={a.id} className="group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${meta.color}15` }}>
                        <Icon className="h-5 w-5" style={{ color: meta.color }} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{a.name}</p>
                        <p className="text-xs text-slate-400">{meta.label}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteAccount(a.id)}
                      className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs text-slate-400">Current Balance</p>
                    <p className={`text-2xl font-bold ${balance >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                      {formatCurrency(balance, currency)}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-xs text-slate-400">
                    <span>Opening: {formatCurrency(a.opening_balance, currency)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Account">
        <form onSubmit={handleAddAccount} className="space-y-4">
          <Input label="Account Name" placeholder="e.g. M-Pesa, Equity Bank, Cash Wallet" required value={name} onChange={(e) => setName(e.target.value)} />
          <Select label="Account Type" value={accountType} onChange={(e) => setAccountType(e.target.value as AccountType)}>
            {Object.entries(ACCOUNT_TYPE_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
          </Select>
          <Input label="Opening Balance" type="number" step="0.01" placeholder="0.00" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} hint="How much is currently in this account?" />
          {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}><X className="h-4 w-4" /> Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Adding...' : 'Add Account'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={transferOpen} onClose={() => setTransferOpen(false)} title="Transfer Between Accounts">
        <form onSubmit={handleTransfer} className="space-y-4">
          <p className="text-sm text-slate-500">
            Transfers between accounts are not counted as expenses. They simply move money from one wallet to another.
          </p>
          <Select label="From Account" value={fromAccount} onChange={(e) => setFromAccount(e.target.value)} required>
            <option value="">Select source</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          <Select label="To Account" value={toAccount} onChange={(e) => setToAccount(e.target.value)} required>
            <option value="">Select destination</option>
            {accounts.filter((a) => a.id !== fromAccount).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          <Input label="Amount" type="number" step="0.01" required placeholder="0.00" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} />
          <Input label="Description (optional)" placeholder="e.g. Move savings to bank" value={transferDesc} onChange={(e) => setTransferDesc(e.target.value)} />
          {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setTransferOpen(false)}><X className="h-4 w-4" /> Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Transferring...' : 'Transfer'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
