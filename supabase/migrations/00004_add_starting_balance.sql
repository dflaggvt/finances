ALTER TABLE accounts ADD COLUMN starting_balance DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE accounts ADD COLUMN starting_balance_date DATE;
