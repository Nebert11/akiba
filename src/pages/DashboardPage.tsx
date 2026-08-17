import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  Area, AreaChart,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Wallet, PiggyBank,
  ArrowUpRight, ArrowDownRight, AlertTriangle, Lightbulb, Activity,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { formatCurrency, formatPercent, monthKey, monthLabel, relativeTime } from '@/lib/format';
import { getCategorySpending, calculateHealthScore, generateAdvice } from '@/lib/finance';
import { CATEGORY_COLORS } from '@/lib/constants';
import type { MonthlySpending } from '@/types';

export function DashboardPage() {
  const { profile } = useAuth();
  const { transactions, categories, budgets, savingsGoals, recurringTransactions, loading } = useData();

  const now = new Date();
  const mk = monthKey(now);
  const currency = profile?.currency || 'KES';

  const data = useMemo(() => {
    const monthExpenses = transactions.filter(
      (t) => t.type === 'expense' && monthKey(t.transaction_date) === mk
    );
    const monthIncome = transactions.filter(
      (t) => t.type === 'income' && monthKey(t.transaction_date) === mk
    );
    const totalIncome = monthIncome.reduce((a, t) => a + t.amount, 0);
    const totalExpenses = monthExpenses.reduce((a, t) => a + t.amount, 0);
    const totalFees = monthExpenses.reduce((a, t) => a + t.fee_amount, 0);
    const totalSavings = totalIncome - totalExpenses;
    const currentBudget = budgets.find((b) => monthKey(b.month_date) === mk);
    const catSpending = getCategorySpending(transactions, categories, currentBudget || null, now);
    const budgetRemaining = (currentBudget?.total_income || 0) - totalExpenses;
    const healthScore = calculateHealthScore(transactions, categories, currentBudget || null, profile!, savingsGoals);
    const advice = generateAdvice(transactions, categories, currentBudget || null, profile!);

    const last6Months: MonthlySpending[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKey(d);
      const spent = transactions
        .filter((t) => t.type === 'expense' && monthKey(t.transaction_date) === key)
        .reduce((a, t) => a + t.amount, 0);
      const income = transactions
        .filter((t) => t.type === 'income' && monthKey(t.transaction_date) === key)
        .reduce((a, t) => a + t.amount, 0);
      const budget = budgets.find((b) => monthKey(b.month_date) === key);
      last6Months.push({
        month: key,
        label: monthLabel(d).split(' ')[0],
        spent,
        budgeted: budget?.total_income || 0,
        income,
      });
    }

    const pieData = catSpending
      .filter((c) => c.spent > 0)
      .map((c, i) => ({
        name: c.category_name,
        value: c.spent,
        color: c.category_color || CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      }));

    const totalGoalTarget = savingsGoals.reduce((a, g) => a + g.target_amount, 0);
    const totalGoalCurrent = savingsGoals.reduce((a, g) => a + g.current_amount, 0);

    const upcomingRecurring = recurringTransactions
      .filter((r) => r.active && new Date(r.next_date) >= now)
      .sort((a, b) => new Date(a.next_date).getTime() - new Date(b.next_date).getTime())
      .slice(0, 5);

    return {
      totalIncome, totalExpenses, totalFees, totalSavings,
      budgetRemaining, catSpending, healthScore,
      advice: advice.slice(0, 3),
      last6Months, pieData,
      totalGoalTarget, totalGoalCurrent,
      upcomingRecurring,
      recentTransactions: transactions.slice(0, 6),
    };
  }, [transactions, categories, budgets, savingsGoals, recurringTransactions, profile, mk]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
      </div>
    );
  }

  const healthRatingColors: Record<string, string> = {
    excellent: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    good: 'text-blue-600 bg-blue-50 border-blue-200',
    fair: 'text-amber-600 bg-amber-50 border-amber-200',
    poor: 'text-red-600 bg-red-50 border-red-200',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} overview
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Income" value={formatCurrency(data.totalIncome, currency)} icon={TrendingUp} iconColor="text-emerald-600" bg="bg-emerald-50" />
        <StatCard label="Total Expenses" value={formatCurrency(data.totalExpenses, currency)} icon={TrendingDown} iconColor="text-red-600" bg="bg-red-50" />
        <StatCard label="Transaction Fees" value={formatCurrency(data.totalFees, currency)} icon={ArrowUpRight} iconColor="text-orange-600" bg="bg-orange-50" />
        <StatCard label="Net Savings" value={formatCurrency(data.totalSavings, currency)} icon={PiggyBank} iconColor={data.totalSavings >= 0 ? 'text-blue-600' : 'text-red-600'} bg={data.totalSavings >= 0 ? 'bg-blue-50' : 'bg-red-50'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Spending by Category</CardTitle></CardHeader>
          <CardContent>
            {data.pieData.length === 0 ? (
              <EmptyState message="No expenses recorded this month yet" />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={data.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2}>
                      {data.pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatCurrency(Number(value), currency)} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {data.pieData.slice(0, 6).map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-slate-600">{d.name}</span>
                      </div>
                      <span className="font-medium text-slate-900">{formatCurrency(d.value, currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Financial Health Score</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <div className="relative flex h-32 w-32 items-center justify-center">
                <svg className="h-32 w-32 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="42" fill="none"
                    stroke={data.healthScore.score >= 80 ? '#10b981' : data.healthScore.score >= 60 ? '#3b82f6' : data.healthScore.score >= 40 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${(data.healthScore.score / 100) * 264} 264`}
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-bold text-slate-900">{data.healthScore.score}</span>
                  <span className="text-xs text-slate-400">out of 100</span>
                </div>
              </div>
              <div className={`mt-3 rounded-full border px-3 py-1 text-xs font-medium capitalize ${healthRatingColors[data.healthScore.rating]}`}>
                {data.healthScore.rating}
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {data.healthScore.factors.map((f, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">{f.name}</span>
                    <span className="font-medium text-slate-900">{Math.round(f.score)}/100</span>
                  </div>
                  <Progress value={f.score} className="mt-1 h-1.5" />
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-400">
              This is an indicative score based on your financial habits, not an official credit score.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Income vs Expenses (6 months)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.last6Months}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value), currency)} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                <Area type="monotone" dataKey="income" stroke="#10b981" fill="url(#incomeGrad)" strokeWidth={2} name="Income" />
                <Area type="monotone" dataKey="spent" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Savings Goals</CardTitle>
              <Link to="/goals" className="text-xs font-medium text-emerald-600 hover:text-emerald-700">View all</Link>
            </div>
          </CardHeader>
          <CardContent>
            {savingsGoals.length === 0 ? (
              <EmptyState message="No savings goals yet" />
            ) : (
              <div className="space-y-4">
                {savingsGoals.slice(0, 3).map((g) => {
                  const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
                  return (
                    <div key={g.id}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="font-medium text-slate-700">{g.name}</span>
                        <span className="text-slate-500">{formatPercent(pct)}</span>
                      </div>
                      <Progress value={pct} />
                      <div className="mt-1 flex justify-between text-xs text-slate-400">
                        <span>{formatCurrency(g.current_amount, currency)}</span>
                        <span>{formatCurrency(g.target_amount, currency)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Budget vs Actual</CardTitle>
              <Link to="/budget" className="text-xs font-medium text-emerald-600 hover:text-emerald-700">Manage budget</Link>
            </div>
          </CardHeader>
          <CardContent>
            {data.catSpending.filter((c) => c.budgeted > 0).length === 0 ? (
              <EmptyState message="No budget set for this month" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.catSpending.filter((c) => c.budgeted > 0).map(c => ({ name: c.category_name, Budget: c.budgeted, Actual: c.spent }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value), currency)} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Budget" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Actual" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Financial Advice</CardTitle>
              <Link to="/advice" className="text-xs font-medium text-emerald-600 hover:text-emerald-700">View all</Link>
            </div>
          </CardHeader>
          <CardContent>
            {data.advice.length === 0 ? (
              <EmptyState message="No advice to show. Add transactions and a budget to get personalized insights." />
            ) : (
              <div className="space-y-3">
                {data.advice.map((a) => (
                  <div key={a.id} className="flex gap-3 rounded-xl border border-slate-100 p-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      a.severity === 'red' ? 'bg-red-50 text-red-600' :
                      a.severity === 'orange' ? 'bg-orange-50 text-orange-600' :
                      a.severity === 'yellow' ? 'bg-amber-50 text-amber-600' :
                      'bg-emerald-50 text-emerald-600'
                    }`}>
                      {a.severity === 'green' ? <Lightbulb className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{a.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{a.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Transactions</CardTitle>
              <Link to="/transactions" className="text-xs font-medium text-emerald-600 hover:text-emerald-700">View all</Link>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentTransactions.length === 0 ? (
              <EmptyState message="No transactions yet" />
            ) : (
              <div className="space-y-2">
                {data.recentTransactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        t.type === 'income' ? 'bg-emerald-50 text-emerald-600' :
                        t.type === 'transfer' ? 'bg-blue-50 text-blue-600' :
                        t.type === 'refund' ? 'bg-purple-50 text-purple-600' :
                        'bg-slate-50 text-slate-600'
                      }`}>
                        {t.type === 'income' || t.type === 'refund' ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{t.description}</p>
                        <p className="text-xs text-slate-400">
                          {t.category?.name || 'Uncategorized'} · {relativeTime(t.transaction_date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${t.type === 'income' || t.type === 'refund' ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {t.type === 'income' || t.type === 'refund' ? '+' : '-'}{formatCurrency(t.amount, currency)}
                      </p>
                      {t.fee_amount > 0 && (
                        <p className="text-xs text-orange-500">fee {formatCurrency(t.fee_amount, currency)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Upcoming Recurring Expenses</CardTitle></CardHeader>
          <CardContent>
            {data.upcomingRecurring.length === 0 ? (
              <EmptyState message="No upcoming recurring expenses" />
            ) : (
              <div className="space-y-2">
                {data.upcomingRecurring.map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{r.description}</p>
                        <p className="text-xs text-slate-400 capitalize">
                          {r.frequency} · Due {new Date(r.next_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(r.amount, currency)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, iconColor, bg }: {
  label: string; value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string; bg: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}
