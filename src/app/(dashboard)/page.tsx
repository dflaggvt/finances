import { createClient } from "@/lib/supabase/server";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { UpcomingBills } from "@/components/dashboard/upcoming-bills";
import { CashFlowMini } from "@/components/dashboard/cash-flow-mini";
import { buildCashFlowForecast } from "@/lib/cashflow-engine";
import type { Bill, BillPayment, Income, Account } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [billsRes, paymentsRes, incomesRes, accountsRes] = await Promise.all([
    supabase.from("bills").select("*").eq("is_active", true),
    supabase
      .from("bill_payments")
      .select("*, bill:bills(*)")
      .in("status", ["upcoming", "overdue"])
      .order("due_date")
      .limit(10),
    supabase.from("income").select("*").eq("is_active", true),
    supabase.from("accounts").select("*"),
  ]);

  const bills = (billsRes.data || []) as Bill[];
  const payments = (paymentsRes.data || []) as (BillPayment & { bill?: Bill })[];
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
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <SummaryCards
        bills={bills}
        incomes={incomes}
        accounts={accounts}
        upcomingPayments={payments}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <CashFlowMini forecast={forecast} />
        <UpcomingBills payments={payments} />
      </div>
    </div>
  );
}
