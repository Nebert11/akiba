import type { FeeRule } from '@/types';

export interface FeeResult {
  fee: number;
  rule: FeeRule | null;
  total: number;
}

export function calculateFee(
  amount: number,
  provider: string,
  transactionType: string,
  feeRules: FeeRule[]
): FeeResult {
  if (amount <= 0) return { fee: 0, rule: null, total: 0 };

  const matching = feeRules.filter(
    (r) =>
      r.provider === provider &&
      r.transaction_type === transactionType &&
      r.active &&
      r.min_amount <= amount &&
      (r.max_amount === null || r.max_amount >= amount)
  );

  if (matching.length === 0) {
    return { fee: 0, rule: null, total: amount };
  }

  const rule = matching[0];
  const fee = Math.round((rule.fixed_fee + (amount * rule.percentage_fee) / 100) * 100) / 100;

  return { fee, rule, total: amount + fee };
}

export const PROVIDER_LABELS: Record<string, string> = {
  mpesa: 'M-Pesa',
  bank: 'Bank Transfer',
  atm: 'ATM',
  card: 'Card',
  cash: 'Cash',
  airtel: 'Airtel Money',
};

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  send_registered: 'Send to M-Pesa User',
  send_unregistered: 'Send to Unregistered',
  withdrawal: 'Agent Withdrawal',
  transfer: 'Bank Transfer',
  purchase: 'Card Purchase',
};
