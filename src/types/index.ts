export type IncomeFrequency = 'monthly' | 'weekly' | 'biweekly' | 'irregular';
export type AccountType = 'mpesa' | 'bank' | 'cash' | 'airtel' | 'card' | 'other';
export type TransactionType = 'expense' | 'income' | 'transfer' | 'refund' | 'adjustment';
export type BudgetStatus = 'draft' | 'accepted' | 'modified' | 'rejected';
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type Severity = 'info' | 'green' | 'yellow' | 'orange' | 'red';
export type WarningLevel = 'green' | 'yellow' | 'orange' | 'red';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  currency: string;
  monthly_income: number;
  income_frequency: IncomeFrequency;
  existing_savings: number;
  savings_target_pct: number;
  financial_goals: string | null;
  fixed_expenses: Record<string, number> | null;
  debts: Record<string, number> | null;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  account_type: AccountType;
  opening_balance: number;
  currency: string;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  is_default: boolean;
  created_at: string;
}

export interface FeeRule {
  id: string;
  provider: string;
  transaction_type: string;
  min_amount: number;
  max_amount: number | null;
  fixed_fee: number;
  percentage_fee: number;
  effective_date: string;
  active: boolean;
}

export interface Budget {
  id: string;
  user_id: string;
  month_date: string;
  total_income: number;
  status: BudgetStatus;
  created_at: string;
  budget_categories?: BudgetCategory[];
}

export interface BudgetCategory {
  id: string;
  budget_id: string;
  user_id: string;
  category_id: string;
  planned_amount: number;
  reason: string | null;
  category?: Category;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  category_id: string | null;
  account_id: string | null;
  to_account_id: string | null;
  description: string;
  transaction_date: string;
  payment_method: string | null;
  fee_amount: number;
  total_amount: number;
  notes: string | null;
  is_recurring: boolean;
  recurring_id: string | null;
  created_at: string;
  category?: Category;
  account?: Account;
  to_account?: Account;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  created_at: string;
}

export interface RecurringTransaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  category_id: string | null;
  account_id: string | null;
  description: string;
  frequency: Frequency;
  next_date: string;
  active: boolean;
  created_at: string;
  category?: Category;
  account?: Account;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  severity: Severity;
  read: boolean;
  created_at: string;
}

export interface CategorySpending {
  category_id: string;
  category_name: string;
  category_color: string | null;
  spent: number;
  budgeted: number;
  remaining: number;
  pct_consumed: number;
  warning_level: WarningLevel;
}

export interface MonthlySpending {
  month: string;
  label: string;
  spent: number;
  budgeted: number;
  income: number;
}

export interface BudgetSuggestion {
  category_id: string;
  category_name: string;
  suggested_amount: number;
  reason: string;
}
