-- Track bill amount changes over time
CREATE TABLE bill_amount_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  effective_date DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bill_amount_history_bill ON bill_amount_history(bill_id, effective_date DESC);

ALTER TABLE bill_amount_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view household bill amount history"
  ON bill_amount_history FOR SELECT USING (household_id = get_household_id());
CREATE POLICY "Users can insert household bill amount history"
  ON bill_amount_history FOR INSERT WITH CHECK (household_id = get_household_id());
CREATE POLICY "Users can delete household bill amount history"
  ON bill_amount_history FOR DELETE USING (household_id = get_household_id());

-- Add match pattern to bills for auto-matching against transactions
ALTER TABLE bills ADD COLUMN match_pattern TEXT;

-- Add bill_id to transactions for linking matched transactions
ALTER TABLE transactions ADD COLUMN bill_id UUID REFERENCES bills(id) ON DELETE SET NULL;
