import { createClient } from "@/lib/supabase/server";
import { BillsTable } from "@/components/bills/bills-table";
import { BillForm } from "@/components/bills/bill-form";
import { DiscoverBillsSheet } from "@/components/bills/discover-bills-sheet";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles } from "lucide-react";
import type { Bill, BillPayment, Account } from "@/lib/types";

export default async function BillsPage() {
  const supabase = await createClient();

  const [billsRes, paymentsRes, accountsRes] = await Promise.all([
    supabase
      .from("bills")
      .select("*")
      .eq("is_active", true)
      .order("due_day"),
    supabase
      .from("bill_payments")
      .select("*")
      .in("status", ["upcoming", "overdue"])
      .order("due_date"),
    supabase.from("accounts").select("*").order("name"),
  ]);

  const bills = (billsRes.data || []) as Bill[];
  const payments = (paymentsRes.data || []) as BillPayment[];
  const accounts = (accountsRes.data || []) as Account[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bills</h1>
        <div className="flex gap-2">
          <DiscoverBillsSheet
            trigger={
              <Button variant="outline">
                <Sparkles className="mr-2 h-4 w-4" />
                Discover Bills
              </Button>
            }
          />
          <BillForm
            accounts={accounts}
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Bill
              </Button>
            }
          />
        </div>
      </div>
      <BillsTable bills={bills} payments={payments} accounts={accounts} />
    </div>
  );
}
