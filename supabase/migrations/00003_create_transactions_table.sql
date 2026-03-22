CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  check_number TEXT,
  memo TEXT,
  source TEXT NOT NULL CHECK (source IN ('wells_fargo', 'chase', 'manual')),
  import_batch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_account ON transactions(account_id, date DESC);
CREATE INDEX idx_transactions_household ON transactions(household_id, date DESC);
CREATE INDEX idx_transactions_import_batch ON transactions(import_batch_id);

-- Prevent duplicate imports: same account, date, amount, description
CREATE UNIQUE INDEX idx_transactions_dedup ON transactions(account_id, date, amount, description);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view household transactions"
  ON transactions FOR SELECT USING (household_id = get_household_id());
CREATE POLICY "Users can insert household transactions"
  ON transactions FOR INSERT WITH CHECK (household_id = get_household_id());
CREATE POLICY "Users can update household transactions"
  ON transactions FOR UPDATE USING (household_id = get_household_id());
CREATE POLICY "Users can delete household transactions"
  ON transactions FOR DELETE USING (household_id = get_household_id());
