"use server";

import { createClient } from "@/lib/supabase/server";
import { billSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { generatePaymentDates } from "@/lib/bill-utils";
import {
  discoverBillsWithLLM,
  DEFAULT_DISCOVERY_PROMPT,
} from "@/lib/llm-discovery";
import { rematchTransactions } from "@/app/(dashboard)/accounts/import-actions";
import type { Bill, DiscoveredBill } from "@/lib/types";

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
      match_pattern: parsed.data.match_pattern || null,
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
      match_pattern: parsed.data.match_pattern || null,
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

export async function getBillAmountHistory(billId: string) {
  const { supabase } = await getHouseholdId();

  const { data, error } = await supabase
    .from("bill_amount_history")
    .select("*")
    .eq("bill_id", billId)
    .order("effective_date", { ascending: false })
    .limit(20);

  if (error) return { error: error.message };
  return { data };
}

export async function discoverBills(): Promise<{
  data?: DiscoveredBill[];
  error?: string;
}> {
  if (!process.env.OPENAI_API_KEY) {
    return { error: "OPENAI_API_KEY not configured" };
  }

  const { supabase, householdId } = await getHouseholdId();

  // Only fetch unmatched transactions from the last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: transactions } = await supabase
    .from("transactions")
    .select("date, amount, description, category")
    .eq("household_id", householdId)
    .is("bill_id", null)
    .gte("date", sixMonthsAgo.toISOString().split("T")[0])
    .order("date", { ascending: false })
    .limit(500);

  if (!transactions || transactions.length === 0) {
    return { error: "No unmatched transactions found to analyze" };
  }

  // Get existing bill names to avoid duplicates
  const { data: existingBills } = await supabase
    .from("bills")
    .select("name")
    .eq("household_id", householdId)
    .eq("is_active", true);

  const existingNames = (existingBills || []).map((b) => b.name);

  // Get discovery prompt
  const { data: settings } = await supabase
    .from("household_settings")
    .select("discovery_prompt")
    .eq("household_id", householdId)
    .single();

  const prompt = settings?.discovery_prompt || DEFAULT_DISCOVERY_PROMPT;

  const txns = transactions.map((t) => ({
    date: t.date,
    amount: Number(t.amount),
    description: t.description,
    category: t.category,
  }));

  const discovered = await discoverBillsWithLLM(txns, existingNames, prompt);

  return {
    data: discovered.map((b) => ({
      name: b.name,
      amount: b.amount,
      due_day: b.due_day,
      frequency: b.frequency as DiscoveredBill["frequency"],
      category: b.category as DiscoveredBill["category"],
      bill_type: b.bill_type as DiscoveredBill["bill_type"],
      match_pattern: b.match_pattern,
      confidence: b.confidence,
      sample_transactions: b.sample_transactions || [],
    })),
  };
}

export async function createBillsFromDiscovery(
  bills: Array<{
    name: string;
    amount: number;
    due_day: number;
    frequency: string;
    category: string;
    bill_type: string;
    match_pattern: string;
  }>
): Promise<{ success?: boolean; error?: string; created?: number }> {
  const { supabase, householdId } = await getHouseholdId();

  let created = 0;

  for (const bill of bills) {
    const parsed = billSchema.safeParse({
      ...bill,
      is_auto_pay: false,
    });

    if (!parsed.success) continue;

    const { data: newBill, error } = await supabase
      .from("bills")
      .insert({
        ...parsed.data,
        household_id: householdId,
        account_id: null,
        match_pattern: bill.match_pattern || null,
        url: null,
        notes: null,
      })
      .select()
      .single();

    if (error || !newBill) continue;

    await generateBillPayments(supabase, newBill as Bill, householdId);
    created++;
  }

  // Re-match transactions to link them to the newly created bills
  if (created > 0) {
    await rematchTransactions();
  }

  revalidatePath("/bills");
  revalidatePath("/transactions");
  revalidatePath("/");
  return { success: true, created };
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
