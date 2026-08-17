import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, ArrowLeft, SkipForward } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import type { IncomeFrequency } from '@/types';

const STEPS = ['Profile', 'Income', 'Goals', 'Fixed Expenses', 'Debts'];

export function OnboardingPage() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [currency, setCurrency] = useState('KES');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [incomeFrequency, setIncomeFrequency] = useState<IncomeFrequency>('monthly');
  const [existingSavings, setExistingSavings] = useState('');
  const [savingsTargetPct, setSavingsTargetPct] = useState('20');
  const [financialGoals, setFinancialGoals] = useState('');
  const [fixedExpenses, setFixedExpenses] = useState<{ name: string; amount: string }[]>([{ name: 'Rent', amount: '' }]);
  const [debts, setDebts] = useState<{ name: string; amount: string }[]>([]);

  function next() {
    if (step < STEPS.length - 1) setStep(step + 1);
  }
  function prev() {
    if (step > 0) setStep(step - 1);
  }

  async function finish() {
    if (!user) return;
    setSaving(true);

    const fixedObj: Record<string, number> = {};
    for (const fe of fixedExpenses) {
      if (fe.name && fe.amount) fixedObj[fe.name] = parseFloat(fe.amount);
    }

    const debtObj: Record<string, number> = {};
    for (const d of debts) {
      if (d.name && d.amount) debtObj[d.name] = parseFloat(d.amount);
    }

    const { error } = await supabase.from('profiles').upsert({
      user_id: user.id,
      full_name: fullName,
      currency,
      monthly_income: parseFloat(monthlyIncome) || 0,
      income_frequency: incomeFrequency,
      existing_savings: parseFloat(existingSavings) || 0,
      savings_target_pct: parseFloat(savingsTargetPct) || 20,
      financial_goals: financialGoals,
      fixed_expenses: fixedObj,
      debts: debtObj,
      onboarding_complete: true,
    });

    setSaving(false);
    if (error) {
      console.error(error);
      return;
    }
    await refreshProfile();
    navigate('/dashboard');
  }

  async function skip() {
    if (!user) return;
    setSaving(true);
    await supabase.from('profiles').upsert({
      user_id: user.id,
      full_name: fullName,
      currency,
      monthly_income: parseFloat(monthlyIncome) || 0,
      income_frequency: incomeFrequency,
      existing_savings: parseFloat(existingSavings) || 0,
      savings_target_pct: parseFloat(savingsTargetPct) || 20,
      financial_goals: financialGoals,
      onboarding_complete: true,
    });
    setSaving(false);
    await refreshProfile();
    navigate('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100 py-8 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <img
            src="/logo.png"
            alt="Akiba"
            className="mx-auto mb-3 h-14 w-auto max-w-[200px] object-contain sm:h-16"
          />
          <h1 className="text-2xl font-bold text-slate-900">Let's set up your profile</h1>
          <p className="mt-1 text-sm text-slate-500">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
        </div>

        <div className="mb-6 flex gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-emerald-500' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {step === 0 && (
            <div className="space-y-4">
              <Input
                label="Full Name"
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <Select label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="KES">KES — Kenyan Shilling</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="UGX">UGX — Ugandan Shilling</option>
                <option value="TZS">TZS — Tanzanian Shilling</option>
              </Select>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <Input
                label="Monthly Income"
                type="number"
                placeholder="25000"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                hint="Your average monthly income"
              />
              <Select
                label="Income Frequency"
                value={incomeFrequency}
                onChange={(e) => setIncomeFrequency(e.target.value as IncomeFrequency)}
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="irregular">Irregular</option>
              </Select>
              <Input
                label="Existing Savings"
                type="number"
                placeholder="5000"
                value={existingSavings}
                onChange={(e) => setExistingSavings(e.target.value)}
                hint="How much do you currently have saved?"
              />
              <Input
                label="Savings Target (%)"
                type="number"
                min="0"
                max="100"
                placeholder="20"
                value={savingsTargetPct}
                onChange={(e) => setSavingsTargetPct(e.target.value)}
                hint="What percentage of income do you want to save?"
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Textarea
                label="Financial Goals"
                placeholder="e.g. Build an emergency fund, save for school fees, pay off debt..."
                value={financialGoals}
                onChange={(e) => setFinancialGoals(e.target.value)}
                rows={4}
              />
              <p className="text-sm text-slate-500">
                You can create specific savings goals with targets and deadlines later in the app.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500 mb-4">
                Add your typical fixed monthly expenses. These will be used to generate your budget.
              </p>
              {fixedExpenses.map((fe, i) => (
                <div key={i} className="flex gap-3">
                  <Input
                    placeholder="Expense name (e.g. Rent)"
                    value={fe.name}
                    onChange={(e) => {
                      const copy = [...fixedExpenses];
                      copy[i].name = e.target.value;
                      setFixedExpenses(copy);
                    }}
                  />
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={fe.amount}
                    onChange={(e) => {
                      const copy = [...fixedExpenses];
                      copy[i].amount = e.target.value;
                      setFixedExpenses(copy);
                    }}
                    className="w-32"
                  />
                  <button
                    type="button"
                    onClick={() => setFixedExpenses(fixedExpenses.filter((_, idx) => idx !== i))}
                    className="rounded-xl px-3 text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
                  >
                    ×
                  </button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFixedExpenses([...fixedExpenses, { name: '', amount: '' }])}
              >
                + Add expense
              </Button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500 mb-4">
                Optional: Add any debts you're paying off. These will be factored into your budget.
              </p>
              {debts.length === 0 && (
                <p className="text-sm text-slate-400 italic">No debts added. You can skip this step.</p>
              )}
              {debts.map((d, i) => (
                <div key={i} className="flex gap-3">
                  <Input
                    placeholder="Debt name (e.g. Student Loan)"
                    value={d.name}
                    onChange={(e) => {
                      const copy = [...debts];
                      copy[i].name = e.target.value;
                      setDebts(copy);
                    }}
                  />
                  <Input
                    type="number"
                    placeholder="Monthly payment"
                    value={d.amount}
                    onChange={(e) => {
                      const copy = [...debts];
                      copy[i].amount = e.target.value;
                      setDebts(copy);
                    }}
                    className="w-40"
                  />
                  <button
                    type="button"
                    onClick={() => setDebts(debts.filter((_, idx) => idx !== i))}
                    className="rounded-xl px-3 text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
                  >
                    ×
                  </button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDebts([...debts, { name: '', amount: '' }])}
              >
                + Add debt
              </Button>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <div>
              {step > 0 && (
                <Button variant="ghost" size="sm" onClick={prev}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {step < STEPS.length - 1 && (
                <Button variant="ghost" size="sm" onClick={skip}>
                  <SkipForward className="h-4 w-4" /> Skip
                </Button>
              )}
              {step < STEPS.length - 1 ? (
                <Button size="sm" onClick={next}>
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button size="sm" onClick={finish} disabled={saving}>
                  <Check className="h-4 w-4" /> {saving ? 'Saving...' : 'Complete'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
