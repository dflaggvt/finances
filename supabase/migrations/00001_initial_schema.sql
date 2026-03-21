-- Households: the shared unit between husband and wife
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'My Household',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles: linked to Supabase auth.users
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Accounts: checking, savings, credit cards, loans
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'credit_card', 'loan')),
  institution TEXT,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  credit_limit DECIMAL(12,2),
  interest_rate DECIMAL(5,2),
  minimum_payment DECIMAL(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bills: recurring bill definitions
CREATE TABLE bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'annual', 'one_time')),
  category TEXT NOT NULL CHECK (category IN (
    'mortgage_rent', 'car_payment', 'insurance', 'utilities',
    'groceries', 'gas', 'subscriptions', 'taxes',
    'medical', 'childcare', 'other'
  )),
  bill_type TEXT NOT NULL DEFAULT 'fixed' CHECK (bill_type IN ('fixed', 'variable', 'subscription', 'irregular')),
  is_auto_pay BOOLEAN NOT NULL DEFAULT false,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  url TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bill payments: individual payment records
CREATE TABLE bill_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  paid_date DATE,
  amount DECIMAL(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'paid', 'overdue', 'skipped')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Income sources
CREATE TABLE income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'semimonthly', 'monthly', 'one_time')),
  next_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's household_id
CREATE OR REPLACE FUNCTION get_household_id()
RETURNS UUID AS $$
  SELECT household_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles policies
CREATE POLICY "Users can view own household profiles"
  ON profiles FOR SELECT USING (household_id = get_household_id());
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (id = auth.uid());

-- Households policies
CREATE POLICY "Users can view own household"
  ON households FOR SELECT USING (id = get_household_id());
CREATE POLICY "Users can update own household"
  ON households FOR UPDATE USING (id = get_household_id());

-- Accounts policies
CREATE POLICY "Users can view household accounts"
  ON accounts FOR SELECT USING (household_id = get_household_id());
CREATE POLICY "Users can insert household accounts"
  ON accounts FOR INSERT WITH CHECK (household_id = get_household_id());
CREATE POLICY "Users can update household accounts"
  ON accounts FOR UPDATE USING (household_id = get_household_id());
CREATE POLICY "Users can delete household accounts"
  ON accounts FOR DELETE USING (household_id = get_household_id());

-- Bills policies
CREATE POLICY "Users can view household bills"
  ON bills FOR SELECT USING (household_id = get_household_id());
CREATE POLICY "Users can insert household bills"
  ON bills FOR INSERT WITH CHECK (household_id = get_household_id());
CREATE POLICY "Users can update household bills"
  ON bills FOR UPDATE USING (household_id = get_household_id());
CREATE POLICY "Users can delete household bills"
  ON bills FOR DELETE USING (household_id = get_household_id());

-- Bill payments policies
CREATE POLICY "Users can view household bill payments"
  ON bill_payments FOR SELECT USING (household_id = get_household_id());
CREATE POLICY "Users can insert household bill payments"
  ON bill_payments FOR INSERT WITH CHECK (household_id = get_household_id());
CREATE POLICY "Users can update household bill payments"
  ON bill_payments FOR UPDATE USING (household_id = get_household_id());
CREATE POLICY "Users can delete household bill payments"
  ON bill_payments FOR DELETE USING (household_id = get_household_id());

-- Income policies
CREATE POLICY "Users can view household income"
  ON income FOR SELECT USING (household_id = get_household_id());
CREATE POLICY "Users can insert household income"
  ON income FOR INSERT WITH CHECK (household_id = get_household_id());
CREATE POLICY "Users can update household income"
  ON income FOR UPDATE USING (household_id = get_household_id());
CREATE POLICY "Users can delete household income"
  ON income FOR DELETE USING (household_id = get_household_id());

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER bills_updated_at BEFORE UPDATE ON bills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER income_updated_at BEFORE UPDATE ON income
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
