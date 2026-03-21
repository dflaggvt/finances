-- Automatically create household + profile when a new user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_household_id UUID;
BEGIN
  -- Check if user was invited to existing household (via metadata)
  IF NEW.raw_user_meta_data->>'household_id' IS NOT NULL THEN
    new_household_id := (NEW.raw_user_meta_data->>'household_id')::UUID;
  ELSE
    -- Create a new household
    INSERT INTO households (name) VALUES ('My Household')
    RETURNING id INTO new_household_id;
  END IF;

  -- Create profile
  INSERT INTO profiles (id, household_id, full_name, email)
  VALUES (
    NEW.id,
    new_household_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
