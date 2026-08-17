import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import type {
  Account,
  Category,
  Transaction,
  Budget,
  SavingsGoal,
  RecurringTransaction,
  Notification,
  FeeRule,
} from '@/types';

interface DataContextValue {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  recurringTransactions: RecurringTransaction[];
  notifications: Notification[];
  feeRules: FeeRule[];
  loading: boolean;
  refreshAll: () => Promise<void>;
  addTransaction: (tx: Partial<Transaction>) => Promise<{ error: string | null }>;
  deleteTransaction: (id: string) => Promise<{ error: string | null }>;
  addAccount: (acc: Partial<Account>) => Promise<{ error: string | null }>;
  deleteAccount: (id: string) => Promise<{ error: string | null }>;
  addCategory: (cat: Partial<Category>) => Promise<{ error: string | null }>;
  addBudget: (budget: Partial<Budget>, cats: { category_id: string; planned_amount: number; reason?: string }[]) => Promise<{ error: string | null }>;
  deleteBudget: (id: string) => Promise<{ error: string | null }>;
  addSavingsGoal: (goal: Partial<SavingsGoal>) => Promise<{ error: string | null }>;
  updateSavingsGoal: (id: string, updates: Partial<SavingsGoal>) => Promise<{ error: string | null }>;
  deleteSavingsGoal: (id: string) => Promise<{ error: string | null }>;
  addRecurring: (rec: Partial<RecurringTransaction>) => Promise<{ error: string | null }>;
  deleteRecurring: (id: string) => Promise<{ error: string | null }>;
  markNotificationRead: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

const DEFAULT_CATEGORIES = [
  { name: 'Rent', icon: 'Home', color: '#ef4444' },
  { name: 'Food', icon: 'UtensilsCrossed', color: '#f97316' },
  { name: 'Transport', icon: 'Car', color: '#3b82f6' },
  { name: 'Utilities', icon: 'Zap', color: '#eab308' },
  { name: 'Entertainment', icon: 'Clapperboard', color: '#ec4899' },
  { name: 'Savings', icon: 'PiggyBank', color: '#22c55e' },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#8b5cf6' },
  { name: 'Health', icon: 'HeartPulse', color: '#06b6d4' },
  { name: 'Education', icon: 'GraduationCap', color: '#6366f1' },
  { name: 'Insurance', icon: 'Shield', color: '#14b8a6' },
  { name: 'Emergency', icon: 'AlertTriangle', color: '#f43f5e' },
  { name: 'Other', icon: 'EllipsisHorizontal', color: '#64748b' },
];

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [feeRules, setFeeRules] = useState<FeeRule[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshAll = useCallback(async () => {
    if (!user) {
      setAccounts([]);
      setCategories([]);
      setTransactions([]);
      setBudgets([]);
      setSavingsGoals([]);
      setRecurringTransactions([]);
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const [
      accRes, catRes, txRes, budRes, goalRes, recRes, notifRes, feeRes,
    ] = await Promise.all([
      supabase.from('accounts').select('*').order('created_at'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('transactions').select('*, category:categories(*), account:accounts!transactions_account_id_fkey(*), to_account:accounts!transactions_to_account_id_fkey(*)').order('transaction_date', { ascending: false }),
      supabase.from('budgets').select('*, budget_categories(*, category:categories(*))').order('month_date', { ascending: false }),
      supabase.from('savings_goals').select('*').order('created_at'),
      supabase.from('recurring_transactions').select('*, category:categories(*), account:accounts(*)').order('next_date'),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }),
      supabase.from('fee_rules').select('*').eq('active', true).order('provider, transaction_type, min_amount'),
    ]);

    setAccounts((accRes.data as Account[]) || []);
    setCategories((catRes.data as Category[]) || []);
    setTransactions((txRes.data as Transaction[]) || []);
    setBudgets((budRes.data as Budget[]) || []);
    setSavingsGoals((goalRes.data as SavingsGoal[]) || []);
    setRecurringTransactions((recRes.data as RecurringTransaction[]) || []);
    setNotifications((notifRes.data as Notification[]) || []);
    setFeeRules((feeRes.data as FeeRule[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { count } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (count === 0) {
        await supabase.from('categories').insert(
          DEFAULT_CATEGORIES.map((c) => ({ ...c, is_default: true }))
        );
      }
      await refreshAll();
    })();
  }, [user, refreshAll]);

  const addTransaction = useCallback(async (tx: Partial<Transaction>) => {
    const { error } = await supabase.from('transactions').insert(tx);
    if (!error) await refreshAll();
    return { error: error?.message || null };
  }, [refreshAll]);

  const deleteTransaction = useCallback(async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) await refreshAll();
    return { error: error?.message || null };
  }, [refreshAll]);

  const addAccount = useCallback(async (acc: Partial<Account>) => {
    const { error } = await supabase.from('accounts').insert(acc);
    if (!error) await refreshAll();
    return { error: error?.message || null };
  }, [refreshAll]);

  const deleteAccount = useCallback(async (id: string) => {
    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (!error) await refreshAll();
    return { error: error?.message || null };
  }, [refreshAll]);

  const addCategory = useCallback(async (cat: Partial<Category>) => {
    const { error } = await supabase.from('categories').insert(cat);
    if (!error) await refreshAll();
    return { error: error?.message || null };
  }, [refreshAll]);

  const addBudget = useCallback(async (
    budget: Partial<Budget>,
    cats: { category_id: string; planned_amount: number; reason?: string }[]
  ) => {
    const { data, error } = await supabase.from('budgets').insert(budget).select().single();
    if (error) return { error: error.message };
    const budgetId = data.id;
    const { error: bcError } = await supabase.from('budget_categories').insert(
      cats.map((c) => ({ ...c, budget_id: budgetId }))
    );
    if (bcError) return { error: bcError.message };
    await refreshAll();
    return { error: null };
  }, [refreshAll]);

  const deleteBudget = useCallback(async (id: string) => {
    const {error} = await supabase.from('budgets').delete().eq('id', id);
    if (!error) await refreshAll();
    return {error: error?.message || null };
  }, [refreshAll]);

  const addSavingsGoal = useCallback(async (goal: Partial<SavingsGoal>) => {
    const { error } = await supabase.from('savings_goals').insert(goal);
    if (!error) await refreshAll();
    return { error: error?.message || null };
  }, [refreshAll]);

  const updateSavingsGoal = useCallback(async (id: string, updates: Partial<SavingsGoal>) => {
    const { error } = await supabase.from('savings_goals').update(updates).eq('id', id);
    if (!error) await refreshAll();
    return { error: error?.message || null };
  }, [refreshAll]);

  const deleteSavingsGoal = useCallback(async (id: string) => {
    const { error } = await supabase.from('savings_goals').delete().eq('id', id);
    if (!error) await refreshAll();
    return { error: error?.message || null };
  }, [refreshAll]);

  const addRecurring = useCallback(async (rec: Partial<RecurringTransaction>) => {
    const { error } = await supabase.from('recurring_transactions').insert(rec);
    if (!error) await refreshAll();
    return { error: error?.message || null };
  }, [refreshAll]);

  const deleteRecurring = useCallback(async (id: string) => {
    const { error } = await supabase.from('recurring_transactions').delete().eq('id', id);
    if (!error) await refreshAll();
    return { error: error?.message || null };
  }, [refreshAll]);

  const markNotificationRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    await refreshAll();
  }, [refreshAll]);

  return (
    <DataContext.Provider
      value={{
        accounts,
        categories,
        transactions,
        budgets,
        savingsGoals,
        recurringTransactions,
        notifications,
        feeRules,
        loading,
        refreshAll,
        addTransaction,
        deleteTransaction,
        addAccount,
        deleteAccount,
        addCategory,
        addBudget,
        deleteBudget,
        addSavingsGoal,
        updateSavingsGoal,
        deleteSavingsGoal,
        addRecurring,
        deleteRecurring,
        markNotificationRead,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
