-- Drop the overly strict unique index that prevents legitimate duplicate transactions
-- (e.g., two E-ZPass tolls on the same day, multiple baggage fees)
DROP INDEX idx_transactions_dedup;

-- Replace with a non-unique index for query performance
CREATE INDEX idx_transactions_lookup ON transactions(account_id, date, amount, description);
