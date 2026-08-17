/*
# Seed Fee Rules and Default Category Templates

1. Overview
This migration seeds the `fee_rules` table with realistic Kenyan M-Pesa,
bank, and card transaction fee schedules. These are CONFIGURABLE reference
data — administrators can update them when providers change charges. The
application logic reads these rules at transaction time and never hard-codes
fee amounts.

2. Fee Rules Seeded
- M-Pesa send money to registered user (tiered by amount)
- M-Pesa send money to unregistered user (tiered by amount)
- M-Pesa withdrawal from agent (tiered by amount)
- Bank transfer (Equity/KCB typical)
- ATM withdrawal
- Card transaction (POS and online)

3. Notes
- Fee rules are shared across all users (reference data).
- `max_amount` NULL means no upper bound for that tier.
- Amounts in KES.
- These are illustrative rates for development; real rates should be verified.
*/

-- M-Pesa send to registered user
INSERT INTO fee_rules (provider, transaction_type, min_amount, max_amount, fixed_fee, percentage_fee)
VALUES
  ('mpesa', 'send_registered', 1, 100, 0, 0),
  ('mpesa', 'send_registered', 101, 500, 6, 0),
  ('mpesa', 'send_registered', 501, 1000, 12, 0),
  ('mpesa', 'send_registered', 1001, 1500, 22, 0),
  ('mpesa', 'send_registered', 1501, 2500, 33, 0),
  ('mpesa', 'send_registered', 2501, 3500, 53, 0),
  ('mpesa', 'send_registered', 3501, 5000, 55, 0),
  ('mpesa', 'send_registered', 5001, 7500, 75, 0),
  ('mpesa', 'send_registered', 7501, 10000, 87, 0),
  ('mpesa', 'send_registered', 10001, 15000, 97, 0),
  ('mpesa', 'send_registered', 15001, 20000, 102, 0),
  ('mpesa', 'send_registered', 20001, 70000, 105, 0)
ON CONFLICT DO NOTHING;

-- M-Pesa send to unregistered user
INSERT INTO fee_rules (provider, transaction_type, min_amount, max_amount, fixed_fee, percentage_fee)
VALUES
  ('mpesa', 'send_unregistered', 1, 100, 11, 0),
  ('mpesa', 'send_unregistered', 101, 500, 25, 0),
  ('mpesa', 'send_unregistered', 501, 1000, 27, 0),
  ('mpesa', 'send_unregistered', 1001, 1500, 40, 0),
  ('mpesa', 'send_unregistered', 1501, 2500, 52, 0),
  ('mpesa', 'send_unregistered', 2501, 3500, 78, 0),
  ('mpesa', 'send_unregistered', 3501, 5000, 90, 0),
  ('mpesa', 'send_unregistered', 5001, 7500, 100, 0),
  ('mpesa', 'send_unregistered', 7501, 10000, 110, 0),
  ('mpesa', 'send_unregistered', 10001, 15000, 122, 0),
  ('mpesa', 'send_unregistered', 15001, 20000, 132, 0),
  ('mpesa', 'send_unregistered', 20001, 70000, 165, 0)
ON CONFLICT DO NOTHING;

-- M-Pesa agent withdrawal
INSERT INTO fee_rules (provider, transaction_type, min_amount, max_amount, fixed_fee, percentage_fee)
VALUES
  ('mpesa', 'withdrawal', 1, 100, 0, 0),
  ('mpesa', 'withdrawal', 101, 500, 11, 0),
  ('mpesa', 'withdrawal', 501, 1000, 28, 0),
  ('mpesa', 'withdrawal', 1001, 1500, 28, 0),
  ('mpesa', 'withdrawal', 1501, 2500, 28, 0),
  ('mpesa', 'withdrawal', 2501, 3500, 50, 0),
  ('mpesa', 'withdrawal', 3501, 5000, 50, 0),
  ('mpesa', 'withdrawal', 5001, 7500, 75, 0),
  ('mpesa', 'withdrawal', 7501, 10000, 87, 0),
  ('mpesa', 'withdrawal', 10001, 15000, 115, 0),
  ('mpesa', 'withdrawal', 15001, 20000, 167, 0),
  ('mpesa', 'withdrawal', 20001, 35000, 185, 0),
  ('mpesa', 'withdrawal', 35001, 50000, 197, 0),
  ('mpesa', 'withdrawal', 50001, 250000, 300, 0),
  ('mpesa', 'withdrawal', 250001, 500000, 525, 0),
  ('mpesa', 'withdrawal', 500001, 1000000, 775, 0)
ON CONFLICT DO NOTHING;

-- Bank transfer
INSERT INTO fee_rules (provider, transaction_type, min_amount, max_amount, fixed_fee, percentage_fee)
VALUES
  ('bank', 'transfer', 1, 100000, 0, 0),
  ('bank', 'transfer', 100001, 500000, 200, 0),
  ('bank', 'transfer', 500001, 9999999, 500, 0)
ON CONFLICT DO NOTHING;

-- ATM withdrawal
INSERT INTO fee_rules (provider, transaction_type, min_amount, max_amount, fixed_fee, percentage_fee)
VALUES
  ('atm', 'withdrawal', 1, 5000, 0, 0),
  ('atm', 'withdrawal', 5001, 10000, 100, 0),
  ('atm', 'withdrawal', 10001, 20000, 200, 0),
  ('atm', 'withdrawal', 20001, 50000, 300, 0)
ON CONFLICT DO NOTHING;

-- Card transaction (POS / online)
INSERT INTO fee_rules (provider, transaction_type, min_amount, max_amount, fixed_fee, percentage_fee)
VALUES
  ('card', 'purchase', 1, 9999999, 0, 0)
ON CONFLICT DO NOTHING;

-- Cash (no fee)
INSERT INTO fee_rules (provider, transaction_type, min_amount, max_amount, fixed_fee, percentage_fee)
VALUES
  ('cash', 'purchase', 1, 9999999, 0, 0)
ON CONFLICT DO NOTHING;