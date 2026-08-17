import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency, monthKey, monthLabel } from '@/lib/format';
import { getMonthlyCategoryStats } from '@/lib/finance';

export function ReportsPage() {
  const { transactions, categories } = useData();
  const { profile } = useAuth();
  const currency = profile?.currency || 'KES';

  const stats = useMemo(() => getMonthlyCategoryStats(transactions, categories), [transactions, categories]);

  const monthlySummary = useMemo(() => {
    const now = new Date();
    const months: { label: string; month: string; income: number; expenses: number; fees: number; savings: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mk = monthKey(d);
      const monthTx = transactions.filter((t) => monthKey(t.transaction_date) === mk);
      const income = monthTx.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0);
      const expenses = monthTx.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
      const fees = monthTx.filter((t) => t.type === 'expense').reduce((a, t) => a + t.fee_amount, 0);
      months.push({ label: monthLabel(d).split(' ')[0], month: mk, income, expenses, fees, savings: income - expenses });
    }
    return months;
  }, [transactions]);

  const categoryTrendData = useMemo(() => {
    return stats.filter((s) => s.average > 0).map((s) => ({
      category: s.category_name,
      ...s.months.reduce((acc, m, i) => { acc[`M${i + 1}`] = m.spent; return acc; }, {} as Record<string, number>),
    }));
  }, [stats]);

  const monthKeys = stats[0]?.months.map((_, i) => `M${i + 1}`) || [];
  const totalFees6 = monthlySummary.reduce((a, m) => a + m.fees, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports & Analysis</h1>
        <p className="mt-1 text-sm text-slate-500">Historical spending analysis and financial trends</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Monthly Income vs Expenses</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlySummary}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value), currency)} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Savings Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlySummary}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value), currency)} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                <Line type="monotone" dataKey="savings" name="Savings" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Category Spending Over 6 Months</CardTitle></CardHeader>
        <CardContent>
          {categoryTrendData.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">No spending data available yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={categoryTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value), currency)} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {monthKeys.map((mk, i) => (
                  <Bar key={mk} dataKey={mk} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][i]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Category Analysis</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-6 py-3 text-left font-medium">Category</th>
                  <th className="px-6 py-3 text-right font-medium">Avg</th>
                  <th className="px-6 py-3 text-right font-medium">Min</th>
                  <th className="px-6 py-3 text-right font-medium">Max</th>
                  <th className="px-6 py-3 text-right font-medium">Current</th>
                  <th className="px-6 py-3 text-right font-medium">Change</th>
                  <th className="px-6 py-3 text-center font-medium">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {stats.filter((s) => s.average > 0 || s.current > 0).map((s) => (
                  <tr key={s.category_id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3.5 font-medium text-slate-900">{s.category_name}</td>
                    <td className="px-6 py-3.5 text-right text-slate-600">{formatCurrency(s.average, currency)}</td>
                    <td className="px-6 py-3.5 text-right text-slate-600">{formatCurrency(s.min, currency)}</td>
                    <td className="px-6 py-3.5 text-right text-slate-600">{formatCurrency(s.max, currency)}</td>
                    <td className="px-6 py-3.5 text-right text-slate-600">{formatCurrency(s.current, currency)}</td>
                    <td className={`px-6 py-3.5 text-right font-medium ${s.pct_change > 0 ? 'text-red-600' : s.pct_change < 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {s.pct_change > 0 ? '+' : ''}{Math.round(s.pct_change)}%
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {s.trend === 'increasing' ? <TrendingUp className="inline h-4 w-4 text-red-500" /> :
                       s.trend === 'decreasing' ? <TrendingDown className="inline h-4 w-4 text-emerald-500" /> :
                       <BarChart3 className="inline h-4 w-4 text-slate-400" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Transaction Fees Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-400">Total Fees (6 months)</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(totalFees6, currency)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-400">Avg Monthly Fees</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(totalFees6 / 6, currency)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-400">This Month Fees</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(monthlySummary[monthlySummary.length - 1]?.fees || 0, currency)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
