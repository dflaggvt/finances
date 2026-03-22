CREATE TABLE household_settings (
  household_id UUID PRIMARY KEY REFERENCES households(id) ON DELETE CASCADE,
  matching_prompt TEXT NOT NULL DEFAULT 'You are a financial transaction matcher. Given a list of transactions and a list of bills, determine which transactions correspond to which bills. Consider merchant name variations, abbreviations, and partial matches. Return matches as JSON.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE household_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own household settings"
  ON household_settings FOR SELECT USING (household_id = get_household_id());
CREATE POLICY "Users can insert own household settings"
  ON household_settings FOR INSERT WITH CHECK (household_id = get_household_id());
CREATE POLICY "Users can update own household settings"
  ON household_settings FOR UPDATE USING (household_id = get_household_id());

CREATE TRIGGER household_settings_updated_at BEFORE UPDATE ON household_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
