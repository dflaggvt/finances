import { createClient } from "@/lib/supabase/server";
import { IncomeTable } from "@/components/income/income-table";
import { IncomeForm } from "@/components/income/income-form";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Income } from "@/lib/types";

export default async function IncomePage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("income")
    .select("*")
    .eq("is_active", true)
    .order("next_date");

  const incomes = (data || []) as Income[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Income</h1>
        <IncomeForm
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Income Source
            </Button>
          }
        />
      </div>
      <IncomeTable incomes={incomes} />
    </div>
  );
}
