import { createClient } from "@/lib/supabase/server";
import { CashFlowChart } from "@/components/cashflow/cashflow-chart";
import { CashFlowTable } from "@/components/cashflow/cashflow-table";
import { buildCashFlowForecast } from "@/lib/cashflow-engine";
import type { Bill, Income, Account } from "@/lib/types";

export default async function CashFlowPage() {
  const supabase = await createClient();

  const [billsRes, incomesRes, accountsRes] = await Promise.all([
    supabase.from("bills").select("*").eq("is_active", true),
    supabase.from("income").select("*").eq("is_active", true),
    supabase.from("accounts").select("*"),
  ]);

  const bills = (billsRes.data || []) as Bill[];
  const incomes = (incomesRes.data || []) as Income[];
  const accounts = (accountsRes.data || []) as Account[];

  const startingBalance = accounts
    .filter((a) => a.type === "checking" || a.type === "savings")
    .reduce((sum, a) => sum + a.balance, 0);

  const forecast = buildCashFlowForecast({
    startingBalance,
    bills,
    income: incomes,
    days: 30,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Cash Flow Forecast</h1>
      <CashFlowChart forecast={forecast} />
      <CashFlowTable forecast={forecast} />
    </div>
  );
}
