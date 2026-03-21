"use server";

import { createClient } from "@/lib/supabase/server";
import { billSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { generatePaymentDates } from "@/lib/bill-utils";
import type { Bill } from "@/lib/types";

async function getHouseholdId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Profile not found");
  return { supabase, householdId: profile.household_id };
}

export async function createBill(formData: FormData) {
  const { supabase, householdId } = await getHouseholdId();

  const raw = Object.fromEntries(formData.entries());
  const parsed = billSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { data: bill, error } = await supabase
    .from("bills")
    .insert({
      ...parsed.data,
      household_id: householdId,
      account_id: parsed.data.account_id || null,
      url: parsed.data.url || null,
      notes: parsed.data.notes || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Generate payments for next 3 months
  await generateBillPayments(supabase, bill as Bill, householdId);

  revalidatePath("/bills");
  revalidatePath("/");
  return { success: true };
}

export async function updateBill(id: string, formData: FormData) {
  const { supabase, householdId } = await getHouseholdId();

  const raw = Object.fromEntries(formData.entries());
  const parsed = billSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase
    .from("bills")
    .update({
      ...parsed.data,
      account_id: parsed.data.account_id || null,
      url: parsed.data.url || null,
      notes: parsed.data.notes || null,
    })
    .eq("id", id)
    .eq("household_id", householdId);

  if (error) return { error: error.message };

  revalidatePath("/bills");
  revalidatePath("/");
  return { success: true };
}

export async function deleteBill(id: string) {
  const { supabase, householdId } = await getHouseholdId();

  const { error } = await supabase
    .from("bills")
    .delete()
    .eq("id", id)
    .eq("household_id", householdId);

  if (error) return { error: error.message };

  revalidatePath("/bills");
  revalidatePath("/");
  return { success: true };
}

export async function markBillPaid(paymentId: string) {
  const { supabase, householdId } = await getHouseholdId();

  const { error } = await supabase
    .from("bill_payments")
    .update({
      status: "paid",
      paid_date: new Date().toISOString().split("T")[0],
    })
    .eq("id", paymentId)
    .eq("household_id", householdId);

  if (error) return { error: error.message };

  revalidatePath("/bills");
  revalidatePath("/");
  revalidatePath("/calendar");
  return { success: true };
}

async function generateBillPayments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bill: Bill,
  householdId: string
) {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 3);

  const dates = generatePaymentDates(bill, startDate, endDate);

  const payments = dates.map((date) => ({
    bill_id: bill.id,
    household_id: householdId,
    due_date: date.toISOString().split("T")[0],
    amount: bill.amount,
    status: "upcoming" as const,
  }));

  if (payments.length > 0) {
    await supabase.from("bill_payments").insert(payments);
  }
}
