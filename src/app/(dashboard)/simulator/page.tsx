import { createClient } from "@/lib/supabase/server";
import { AutoPaySimulator } from "@/components/simulator/autopay-simulator";
import type { Bill, Income, Account } from "@/lib/types";

export default async function SimulatorPage() {
  const supabase = await createClient();

  const [billsRes, incomesRes, accountsRes] = await Promise.all([
    supabase.from("bills").select("*").eq("is_active", true).order("name"),
    supabase.from("income").select("*").eq("is_active", true),
    supabase.from("accounts").select("*"),
  ]);

  const bills = (billsRes.data || []) as Bill[];
  const incomes = (incomesRes.data || []) as Income[];
  const accounts = (accountsRes.data || []) as Account[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Auto-Pay Simulator</h1>
        <p className="text-muted-foreground">
          Toggle auto-pay on/off for each bill to see how it affects your cash flow.
          Bills marked &quot;Safe&quot; won&apos;t cause a negative balance.
        </p>
      </div>
      <AutoPaySimulator bills={bills} income={incomes} accounts={accounts} />
    </div>
  );
}
