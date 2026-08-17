import type { WarningLevel } from '@/types';

export const WARNING_COLORS: Record<WarningLevel, { bg: string; text: string; border: string; label: string }> = {
  green: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'On Track' },
  yellow: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Approaching' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: 'At Risk' },
  red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Exceeded' },
};

export const ACCOUNT_TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  mpesa: { label: 'M-Pesa', icon: 'Smartphone', color: '#16a34a' },
  bank: { label: 'Bank Account', icon: 'Building2', color: '#2563eb' },
  cash: { label: 'Cash', icon: 'Wallet', color: '#64748b' },
  airtel: { label: 'Airtel Money', icon: 'Smartphone', color: '#dc2626' },
  card: { label: 'Card', icon: 'CreditCard', color: '#7c3aed' },
  other: { label: 'Other', icon: 'CircleDollarSign', color: '#6b7280' },
};

export const CATEGORY_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
];
