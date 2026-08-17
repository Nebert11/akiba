import { useState, useEffect } from 'react';
import { User, Save, Plus, Tag } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/format';
import { CATEGORY_COLORS } from '@/lib/constants';

export function SettingsPage() {
  const { profile, refreshProfile, user } = useAuth();
  const { categories, addCategory, transactions } = useData();
  const currency = profile?.currency || 'KES';

  const [fullName, setFullName] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [incomeFrequency, setIncomeFrequency] = useState('monthly');
  const [savingsTargetPct, setSavingsTargetPct] = useState('20');
  const [financialGoals, setFinancialGoals] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(CATEGORY_COLORS[0]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setMonthlyIncome(String(profile.monthly_income));
      setIncomeFrequency(profile.income_frequency);
      setSavingsTargetPct(String(profile.savings_target_pct));
      setFinancialGoals(profile.financial_goals || '');
    }
  }, [profile]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    await supabase.from('profiles').update({
      full_name: fullName,
      monthly_income: parseFloat(monthlyIncome) || 0,
      income_frequency: incomeFrequency,
      savings_target_pct: parseFloat(savingsTargetPct) || 20,
      financial_goals: financialGoals,
    }).eq('user_id', user.id);
    await refreshProfile();
    setSaving(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    await addCategory({ name: newCatName.trim(), color: newCatColor, icon: 'Tag', is_default: false });
    setNewCatName('');
  }

  const categoryUsage = (catId: string) => transactions.filter((t) => t.category_id === catId).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your profile and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-slate-400" />
            <CardTitle>Profile Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              <Input label="Monthly Income" type="number" value={monthlyIncome} onChange={(e) => setMonthlyIncome(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Income Frequency" value={incomeFrequency} onChange={(e) => setIncomeFrequency(e.target.value)}>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="irregular">Irregular</option>
              </Select>
              <Input label="Savings Target (%)" type="number" min="0" max="100" value={savingsTargetPct} onChange={(e) => setSavingsTargetPct(e.target.value)} />
            </div>
            <Textarea label="Financial Goals" value={financialGoals} onChange={(e) => setFinancialGoals(e.target.value)} rows={3} />
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={saving}><Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}</Button>
              {savedMsg && <span className="text-sm text-emerald-600">Saved successfully!</span>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-slate-400" />
            <CardTitle>Categories</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-3">
            <Input placeholder="New category name" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="flex-1" />
            <div className="flex items-center gap-2">
              {CATEGORY_COLORS.slice(0, 6).map((c) => (
                <button key={c} type="button" onClick={() => setNewCatColor(c)}
                  className={`h-8 w-8 rounded-full transition ${newCatColor === c ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <Button type="submit"><Plus className="h-4 w-4" /> Add</Button>
          </form>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color || '#64748b' }} />
                  <span className="text-sm font-medium text-slate-700">{c.name}</span>
                  {c.is_default && <Badge>Default</Badge>}
                </div>
                <span className="text-xs text-slate-400">{categoryUsage(c.id)} txns</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Account Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-400">Email</p>
              <p className="mt-1 text-sm font-medium text-slate-900 truncate">{user?.email}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-400">Currency</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{currency}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-400">Monthly Income</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{formatCurrency(profile?.monthly_income || 0, currency)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
