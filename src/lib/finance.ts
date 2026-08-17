import type {
  Transaction,
  Category,
  Budget,
  BudgetSuggestion,
  CategorySpending,
  WarningLevel,
  Profile,
} from '@/types';
import { daysInMonth, daysRemaining, daysElapsed, monthKey, monthLabel } from './format';

export interface MonthlyCategoryStat {
  category_id: string;
  category_name: string;
  months: { month: string; label: string; spent: number }[];
  average: number;
  min: number;
  max: number;
  current: number;
  month_over_month_change: number;
  pct_change: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export function getMonthlyCategoryStats(
  transactions: Transaction[],
  categories: Category[]
): MonthlyCategoryStat[] {
  const byMonth = new Map<string, Map<string, number>>();
  const now = new Date();
  const months: string[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(monthKey(d));
  }

  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    const mk = monthKey(t.transaction_date);
    if (!months.includes(mk)) continue;
    if (!byMonth.has(mk)) byMonth.set(mk, new Map());
    const cat = byMonth.get(mk)!;
    const cid = t.category_id || 'uncategorized';
    cat.set(cid, (cat.get(cid) || 0) + t.amount);
  }

  return categories.map((c) => {
    const monthData = months.map((mk) => {
      const spent = byMonth.get(mk)?.get(c.id) || 0;
      return { month: mk, label: monthLabel(new Date(mk + '-01')), spent };
    });

    const spentValues = monthData.map((m) => m.spent);
    const current = spentValues[spentValues.length - 1] || 0;
    const prev = spentValues[spentValues.length - 2] || 0;
    const change = current - prev;
    const pct = prev > 0 ? (change / prev) * 100 : 0;
    const avg = spentValues.reduce((a, b) => a + b, 0) / spentValues.length;

    return {
      category_id: c.id,
      category_name: c.name,
      months: monthData,
      average: avg,
      min: Math.min(...spentValues),
      max: Math.max(...spentValues),
      current,
      month_over_month_change: change,
      pct_change: pct,
      trend: pct > 10 ? 'increasing' : pct < -10 ? 'decreasing' : 'stable',
    };
  });
}

export function getCategorySpending(
  transactions: Transaction[],
  categories: Category[],
  budget: Budget | null,
  monthDate: Date = new Date()
): CategorySpending[] {
  const mk = monthKey(monthDate);
  const spentByCat = new Map<string, number>();

  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    if (monthKey(t.transaction_date) !== mk) continue;
    const cid = t.category_id || 'uncategorized';
    spentByCat.set(cid, (spentByCat.get(cid) || 0) + t.amount);
  }

  const budgetMap = new Map<string, number>();
  if (budget?.budget_categories) {
    for (const bc of budget.budget_categories) {
      budgetMap.set(bc.category_id, bc.planned_amount);
    }
  }

  return categories.map((c) => {
    const spent = spentByCat.get(c.id) || 0;
    const budgeted = budgetMap.get(c.id) || 0;
    const remaining = budgeted - spent;
    const pct = budgeted > 0 ? (spent / budgeted) * 100 : 0;
    return {
      category_id: c.id,
      category_name: c.name,
      category_color: c.color,
      spent,
      budgeted,
      remaining,
      pct_consumed: pct,
      warning_level: getWarningLevel(spent, budgeted, monthDate),
    };
  });
}

export function getWarningLevel(
  spent: number,
  budgeted: number,
  monthDate: Date = new Date()
): WarningLevel {
  if (budgeted <= 0) return 'green';
  const pct = (spent / budgeted) * 100;
  const dRemaining = daysRemaining(monthDate);
  const dInMonth = daysInMonth(monthDate);
  const elapsedPct = (daysElapsed(monthDate) / dInMonth) * 100;
  const projectedPct = dRemaining > 0 ? pct + (pct / Math.max(1, daysElapsed(monthDate))) * dRemaining : pct;

  if (spent >= budgeted) return 'red';
  if (projectedPct >= 100) return 'orange';
  if (pct >= 80 || (pct > elapsedPct + 15)) return 'yellow';
  return 'green';
}

export interface BudgetGenerationInput {
  profile: Profile;
  categories: Category[];
  transactions: Transaction[];
  savingsGoals: { target_amount: number; deadline: string | null }[];
}

export function generateBudgetSuggestions(input: BudgetGenerationInput): BudgetSuggestion[] {
  const { profile, categories, transactions, savingsGoals } = input;
  const stats = getMonthlyCategoryStats(transactions, categories);
  const monthlyIncome = profile.monthly_income;

  const savingsTarget = (monthlyIncome * profile.savings_target_pct) / 100;

  const goalMonthly = savingsGoals.reduce((sum, g) => {
    if (!g.deadline) return sum;
    const monthsLeft = Math.max(
      1,
      Math.round(
        (new Date(g.deadline).getTime() - new Date().getTime()) / (30 * 86400000)
      )
    );
    return sum + (g.target_amount / monthsLeft);
  }, 0);

  const savingsAmount = Math.max(savingsTarget, goalMonthly);

  const fixedExpenses = profile.fixed_expenses || {};
  const debts = profile.debts || {};
  const totalDebt = Object.values(debts).reduce((a, b) => a + b, 0);

  const suggestions: BudgetSuggestion[] = [];
  let allocated = savingsAmount + totalDebt;

  for (const cat of categories) {
    const stat = stats.find((s) => s.category_id === cat.id);
    const fixed = fixedExpenses[cat.name];

    let suggested = 0;
    let reason = '';

    if (fixed && fixed > 0) {
      suggested = fixed;
      reason = `Based on your declared fixed expense of ${fixed.toLocaleString('en-KE')} KES for ${cat.name}.`;
    } else if (stat && stat.average > 0) {
      suggested = Math.round(stat.average);
      if (stat.trend === 'increasing') {
        suggested = Math.round(suggested * 0.95);
        reason = `Your ${cat.name.toLowerCase()} spending averaged ${Math.round(stat.average).toLocaleString('en-KE')} KES over the last few months and is trending up. We recommend ${suggested.toLocaleString('en-KE')} KES, slightly below your average, to curb the increase.`;
      } else if (stat.trend === 'decreasing') {
        reason = `Your ${cat.name.toLowerCase()} spending averaged ${Math.round(stat.average).toLocaleString('en-KE')} KES and is trending down. We recommend maintaining ${suggested.toLocaleString('en-KE')} KES.`;
      } else {
        reason = `Your ${cat.name.toLowerCase()} spending averaged ${Math.round(stat.average).toLocaleString('en-KE')} KES over the last few months. We recommend ${suggested.toLocaleString('en-KE')} KES based on that history.`;
      }
    } else {
      const defaultPct = DEFAULT_CATEGORY_PCT[cat.name.toLowerCase()] || 0.05;
      suggested = Math.round(monthlyIncome * defaultPct);
      reason = `No spending history for ${cat.name} yet. We allocated ${Math.round(defaultPct * 100)}% of your income (${suggested.toLocaleString('en-KE')} KES) as a starting point. Adjust as needed.`;
    }

    suggestions.push({
      category_id: cat.id,
      category_name: cat.name,
      suggested_amount: suggested,
      reason,
    });
    allocated += suggested;
  }

  if (allocated > monthlyIncome) {
    const surplus = monthlyIncome - allocated;
    const discretionary = suggestions.filter((s) => {
      const cat = categories.find((c) => c.id === s.category_id);
      return cat && !fixedExpenses[cat.name];
    });
    const totalDiscretionary = discretionary.reduce((a, s) => a + s.suggested_amount, 0);
    if (totalDiscretionary > 0) {
      for (const s of discretionary) {
        const ratio = s.suggested_amount / totalDiscretionary;
        const reduction = surplus * ratio;
        s.suggested_amount = Math.max(0, Math.round(s.suggested_amount + reduction));
      }
    }
  }

  return suggestions;
}

const DEFAULT_CATEGORY_PCT: Record<string, number> = {
  rent: 0.32,
  food: 0.16,
  transport: 0.16,
  utilities: 0.08,
  entertainment: 0.06,
  savings: 0.2,
  emergency: 0.06,
  other: 0.05,
  shopping: 0.06,
  health: 0.05,
  education: 0.05,
  insurance: 0.04,
};

export interface AdviceItem {
  id: string;
  title: string;
  message: string;
  severity: WarningLevel;
  category?: string;
}

export function generateAdvice(
  transactions: Transaction[],
  categories: Category[],
  budget: Budget | null,
  profile: Profile
): AdviceItem[] {
  const advice: AdviceItem[] = [];
  const now = new Date();
  const mk = monthKey(now);
  const dRem = daysRemaining(now);
  const dInMonth = daysInMonth(now);
  const elapsedPct = (daysElapsed(now) / dInMonth) * 100;

  const monthExpenses = transactions.filter(
    (t) => t.type === 'expense' && monthKey(t.transaction_date) === mk
  );
  const monthIncome = transactions
    .filter((t) => t.type === 'income' && monthKey(t.transaction_date) === mk)
    .reduce((a, t) => a + t.amount, 0);
  const totalSpent = monthExpenses.reduce((a, t) => a + t.amount, 0);
  const totalFees = monthExpenses.reduce((a, t) => a + t.fee_amount, 0);

  const catSpending = getCategorySpending(transactions, categories, budget, now);

  for (const cs of catSpending) {
    if (cs.budgeted <= 0) continue;
    const dailyRate = totalSpent > 0 && daysElapsed(now) > 0 ? cs.spent / daysElapsed(now) : 0;
    const projected = cs.spent + dailyRate * dRem;

    if (cs.warning_level === 'red') {
      advice.push({
        id: `over-${cs.category_id}`,
        title: `${cs.category_name} budget exceeded`,
        message: `You have spent ${cs.spent.toLocaleString('en-KE')} KES on ${cs.category_name.toLowerCase()}, exceeding your budget of ${cs.budgeted.toLocaleString('en-KE')} KES by ${Math.abs(cs.remaining).toLocaleString('en-KE')} KES. Consider pausing spending in this category for the rest of the month.`,
        severity: 'red',
        category: cs.category_name,
      });
    } else if (cs.warning_level === 'orange') {
      advice.push({
        id: `proj-${cs.category_id}`,
        title: `${cs.category_name} likely to exceed budget`,
        message: `You have ${cs.remaining.toLocaleString('en-KE')} KES remaining for ${cs.category_name.toLowerCase()} with ${dRem} days left. At your current rate, you may exceed your budget by approximately ${Math.round(projected - cs.budgeted).toLocaleString('en-KE')} KES.`,
        severity: 'orange',
        category: cs.category_name,
      });
    } else if (cs.warning_level === 'yellow') {
      advice.push({
        id: `warn-${cs.category_id}`,
        title: `${cs.category_name} approaching budget limit`,
        message: `You have spent ${Math.round(cs.pct_consumed)}% of your ${cs.category_name.toLowerCase()} budget with ${Math.round(100 - elapsedPct)}% of the month remaining. You have ${cs.remaining.toLocaleString('en-KE')} KES left.`,
        severity: 'yellow',
        category: cs.category_name,
      });
    }
  }

  const stats = getMonthlyCategoryStats(transactions, categories);
  for (const stat of stats) {
    if (stat.pct_change > 25 && stat.current > 0) {
      advice.push({
        id: `trend-${stat.category_id}`,
        title: `${stat.category_name} spending increased`,
        message: `Your ${stat.category_name.toLowerCase()} spending increased by ${Math.round(stat.pct_change)}% compared to last month. Consider reviewing what drove this increase.`,
        severity: 'yellow',
        category: stat.category_name,
      });
    }
  }

  const overspentCats = catSpending.filter((c) => c.warning_level === 'red').length;
  if (overspentCats >= 2) {
    advice.push({
      id: 'multi-overspend',
      title: 'Multiple categories overspent',
      message: `You have exceeded budgets in ${overspentCats} categories this month. Reviewing your discretionary spending could help bring things back on track.`,
      severity: 'orange',
    });
  }

  if (totalFees > 0 && totalFees > profile.monthly_income * 0.02) {
    advice.push({
      id: 'fees-high',
      title: 'Transaction fees adding up',
      message: `You have spent ${totalFees.toLocaleString('en-KE')} KES on transaction fees this month. Using bank transfers or cash for larger payments could reduce these costs.`,
      severity: 'yellow',
    });
  }

  const savingsRate = monthIncome > 0 ? ((monthIncome - totalSpent) / monthIncome) * 100 : 0;
  if (savingsRate < profile.savings_target_pct && monthIncome > 0) {
    const diff = profile.savings_target_pct - savingsRate;
    const amount = Math.round((profile.monthly_income * diff) / 100);
    advice.push({
      id: 'savings-rate',
      title: 'Savings rate below target',
      message: `Your current savings rate is ${Math.round(savingsRate)}%. Increasing it to ${Math.round(profile.savings_target_pct)}% would add approximately ${amount.toLocaleString('en-KE')} KES to your monthly savings.`,
      severity: 'yellow',
    });
  }

  const weekendTx = transactions.filter((t) => {
    if (t.type !== 'expense') return false;
    const d = new Date(t.transaction_date);
    return d.getDay() === 0 || d.getDay() === 6;
  });
  const weekdayTx = transactions.filter((t) => {
    if (t.type !== 'expense') return false;
    const d = new Date(t.transaction_date);
    return d.getDay() !== 0 && d.getDay() !== 6;
  });
  const weekendAvg = weekendTx.length > 0 ? weekendTx.reduce((a, t) => a + t.amount, 0) / (weekendTx.length || 1) : 0;
  const weekdayAvg = weekdayTx.length > 0 ? weekdayTx.reduce((a, t) => a + t.amount, 0) / (weekdayTx.length || 1) : 0;
  if (weekendAvg > weekdayAvg * 1.5 && weekendTx.length > 4) {
    advice.push({
      id: 'weekend-spending',
      title: 'Higher weekend spending detected',
      message: `You tend to spend more during weekends (avg ${Math.round(weekendAvg).toLocaleString('en-KE')} KES per transaction vs ${Math.round(weekdayAvg).toLocaleString('en-KE')} KES on weekdays). Consider setting a weekend spending limit.`,
      severity: 'yellow',
    });
  }

  return advice;
}

export interface HealthScore {
  score: number;
  factors: { name: string; score: number; weight: number; detail: string }[];
  rating: 'excellent' | 'good' | 'fair' | 'poor';
}

export function calculateHealthScore(
  transactions: Transaction[],
  categories: Category[],
  budget: Budget | null,
  profile: Profile,
  savingsGoals: { target_amount: number; current_amount: number }[]
): HealthScore {
  const now = new Date();
  const mk = monthKey(now);
  const monthExpenses = transactions.filter(
    (t) => t.type === 'expense' && monthKey(t.transaction_date) === mk
  );
  const monthIncome = transactions
    .filter((t) => t.type === 'income' && monthKey(t.transaction_date) === mk)
    .reduce((a, t) => a + t.amount, 0);
  const totalSpent = monthExpenses.reduce((a, t) => a + t.amount, 0);

  const hasAnyData =
    transactions.length > 0 ||
    !!budget ||
    savingsGoals.length > 0 ||
    profile.monthly_income > 0;

  const factors: HealthScore['factors'] = [];

  if (!hasAnyData) {
    return {
      score: 0,
      rating: 'poor',
      factors: [
        { name: 'Savings Rate', score: 0, weight: 0.25, detail: 'No data yet' },
        { name: 'Budget Adherence', score: 0, weight: 0.25, detail: 'No data yet' },
        { name: 'Overspending Frequency', score: 0, weight: 0.2, detail: 'No data yet' },
        { name: 'Emergency Fund Progress', score: 0, weight: 0.15, detail: 'No data yet' },
        { name: 'Expense-to-Income Ratio', score: 0, weight: 0.15, detail: 'No data yet' },
      ],
    };
  }

  const savingsRate = monthIncome > 0 ? ((monthIncome - totalSpent) / monthIncome) * 100 : 0;
  factors.push({
    name: 'Savings Rate',
    score: Math.min(100, Math.max(0, (savingsRate / 20) * 100)),
    weight: 0.25,
    detail: `Current rate: ${Math.round(savingsRate)}%`,
  });

  const catSpending = getCategorySpending(transactions, categories, budget, now);
  const budgetedCats = catSpending.filter((c) => c.budgeted > 0);
  const adherence = budgetedCats.length > 0
    ? budgetedCats.filter((c) => c.warning_level !== 'red').length / budgetedCats.length
    : 0;
  factors.push({
    name: 'Budget Adherence',
    score: adherence * 100,
    weight: 0.25,
    detail: `${Math.round(adherence * 100)}% of categories within budget`,
  });

  const last4Months: string[] = [];
  for (let i = 3; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    last4Months.push(monthKey(d));
  }

  const budgetByMonth = new Map<string, Budget | null>();
  for (const month of last4Months) {
    const monthBudget = month === mk ? budget : null;
    budgetByMonth.set(month, monthBudget || null);
  }

  const overspendCount = last4Months.reduce((count, m) => {
    const monthDate = new Date(`${m}-01`);
    const monthBudget = budgetByMonth.get(m) || null;
    const monthCats = getCategorySpending(transactions, categories, monthBudget, monthDate);
    return count + monthCats.filter((c) => c.warning_level === 'red').length;
  }, 0);

  const hasOverspendHistory = transactions.some((t) => t.type === 'expense');
  factors.push({
    name: 'Overspending Frequency',
    score: hasOverspendHistory ? Math.max(0, 100 - overspendCount * 15) : 0,
    weight: 0.2,
    detail: `${overspendCount} overspend events in 4 months`,
  });

  const totalGoalTarget = savingsGoals.reduce((a, g) => a + g.target_amount, 0);
  const totalGoalCurrent = savingsGoals.reduce((a, g) => a + g.current_amount, 0);
  const goalProgress = totalGoalTarget > 0 ? (totalGoalCurrent / totalGoalTarget) * 100 : 0;
  factors.push({
    name: 'Emergency Fund Progress',
    score: Math.min(100, goalProgress),
    weight: 0.15,
    detail: totalGoalTarget > 0 ? `${Math.round(goalProgress)}% of goal saved` : 'No goals set',
  });

  const expenseRatio = monthIncome > 0 ? (totalSpent / monthIncome) * 100 : 0;
  factors.push({
    name: 'Expense-to-Income Ratio',
    score: monthIncome > 0 ? Math.max(0, 100 - Math.max(0, expenseRatio - 50) * 2) : 0,
    weight: 0.15,
    detail: `${Math.round(expenseRatio)}% of income spent`,
  });

  const score = Math.round(factors.reduce((a, f) => a + f.score * f.weight, 0));
  const rating = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor';

  return { score, factors, rating };
}
