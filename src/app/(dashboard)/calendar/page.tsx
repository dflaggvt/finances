import { createClient } from "@/lib/supabase/server";
import { BillCalendar } from "@/components/calendar/bill-calendar";
import type { BillPayment, Bill } from "@/lib/types";

export default async function CalendarPage() {
  const supabase = await createClient();

  // Fetch payments for a 3-month window
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 2, 0);

  const { data } = await supabase
    .from("bill_payments")
    .select("*, bill:bills(*)")
    .gte("due_date", start.toISOString().split("T")[0])
    .lte("due_date", end.toISOString().split("T")[0])
    .order("due_date");

  const payments = (data || []) as (BillPayment & { bill?: Bill })[];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Bill Calendar</h1>
      <BillCalendar payments={payments} />
    </div>
  );
}
