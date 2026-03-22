export type AccountType = "checking" | "savings" | "credit_card" | "loan";

export type BillFrequency = "monthly" | "quarterly" | "annual" | "one_time";

export type BillCategory =
  | "mortgage_rent"
  | "car_payment"
  | "insurance"
  | "utilities"
  | "groceries"
  | "gas"
  | "subscriptions"
  | "taxes"
  | "medical"
  | "childcare"
  | "other";

export type BillType = "fixed" | "variable" | "subscription" | "irregular";

export type PaymentStatus = "upcoming" | "paid" | "overdue" | "skipped";

export type IncomeFrequency =
  | "weekly"
  | "biweekly"
  | "semimonthly"
  | "monthly"
  | "one_time";

export interface Household {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  household_id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
}

export interface Account {
  id: string;
  household_id: string;
  name: string;
  type: AccountType;
  institution: string | null;
  balance: number;
  starting_balance: number;
  starting_balance_date: string | null;
  credit_limit: number | null;
  interest_rate: number | null;
  minimum_payment: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Bill {
  id: string;
  household_id: string;
  name: string;
  amount: number;
  due_day: number;
  frequency: BillFrequency;
  category: BillCategory;
  bill_type: BillType;
  is_auto_pay: boolean;
  account_id: string | null;
  match_pattern: string | null;
  url: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BillAmountHistory {
  id: string;
  bill_id: string;
  household_id: string;
  amount: number;
  effective_date: string;
  source: "manual" | "auto";
  created_at: string;
}

export interface BillPayment {
  id: string;
  bill_id: string;
  household_id: string;
  due_date: string;
  paid_date: string | null;
  amount: number;
  status: PaymentStatus;
  created_at: string;
}

export interface Income {
  id: string;
  household_id: string;
  name: string;
  amount: number;
  frequency: IncomeFrequency;
  next_date: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type TransactionSource = "wells_fargo" | "chase" | "manual";

export interface Transaction {
  id: string;
  household_id: string;
  account_id: string;
  date: string;
  amount: number;
  description: string;
  category: string | null;
  check_number: string | null;
  memo: string | null;
  source: TransactionSource;
  bill_id: string | null;
  import_batch_id: string | null;
  created_at: string;
}

export interface DiscoveredBill {
  name: string;
  amount: number;
  due_day: number;
  frequency: BillFrequency;
  category: BillCategory;
  bill_type: BillType;
  match_pattern: string;
  confidence: number;
  sample_transactions: string[];
}

export interface CashFlowDay {
  date: Date;
  startBalance: number;
  income: number;
  expenses: number;
  endBalance: number;
  bills: Bill[];
  incomeItems: Income[];
  isShortfall: boolean;
}
