"use server";

import { createClient } from "@/lib/supabase/server";
import { parseCSV } from "@/lib/csv-parsers";
import { matchTransactionsToBills } from "@/lib/bill-matching";
import type { TransactionSource } from "@/lib/types";
import { revalidatePath } from "next/cache";

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

async function recalculateBalance(
  supabase: Awaited<ReturnType<typeof createClient>>,
  accountId: string,
  householdId: string
) {
  const { data: account } = await supabase
    .from("accounts")
    .select("starting_balance, type")
    .eq("id", accountId)
    .single();

  const { data: txns } = await supabase
    .from("transactions")
    .select("amount")
    .eq("account_id", accountId);

  const txnTotal = txns
    ? txns.reduce((sum, t) => sum + Number(t.amount), 0)
    : 0;

  const startingBalance = Number(account?.starting_balance || 0);
  const isDebt = account?.type === "credit_card" || account?.type === "loan";

  // For credit cards/loans: purchases (negative in CSV) increase balance owed
  // so balance = starting_balance - txnTotal
  // For checking/savings: balance = starting_balance + txnTotal
  const balance = isDebt
    ? startingBalance - txnTotal
    : startingBalance + txnTotal;

  await supabase
    .from("accounts")
    .update({ balance })
    .eq("id", accountId)
    .eq("household_id", householdId);
}

async function matchAndUpdateBills(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  parsed: ReturnType<typeof parseCSV>,
  insertedRows: { id: string }[]
) {
  // Get bills with match patterns
  const { data: bills } = await supabase
    .from("bills")
    .select("id, match_pattern, amount, household_id")
    .eq("household_id", householdId)
    .not("match_pattern", "is", null);

  if (!bills || bills.length === 0) return 0;

  const matches = matchTransactionsToBills(parsed, bills);
  if (matches.length === 0) return 0;

  // Link transactions to bills
  for (const match of matches) {
    const txnRow = insertedRows[match.transactionIndex];
    if (txnRow) {
      await supabase
        .from("transactions")
        .update({ bill_id: match.billId })
        .eq("id", txnRow.id);
    }
  }

  // Find the most recent transaction per bill and update amount if changed
  const latestByBill = new Map<string, { amount: number; date: string }>();
  for (const match of matches) {
    const existing = latestByBill.get(match.billId);
    if (!existing || match.transactionDate > existing.date) {
      latestByBill.set(match.billId, {
        amount: match.transactionAmount,
        date: match.transactionDate,
      });
    }
  }

  let billsUpdated = 0;
  for (const [billId, { amount, date }] of latestByBill) {
    const bill = bills.find((b) => b.id === billId)!;
    if (Math.abs(Number(bill.amount) - amount) < 0.01) continue;

    // Record the old amount in history
    await supabase.from("bill_amount_history").insert({
      bill_id: billId,
      household_id: householdId,
      amount: bill.amount,
      effective_date: date,
      source: "auto",
    });

    // Update the bill with the new amount
    await supabase
      .from("bills")
      .update({ amount })
      .eq("id", billId)
      .eq("household_id", householdId);

    billsUpdated++;
  }

  return billsUpdated;
}

export async function importTransactions(
  accountId: string,
  source: TransactionSource,
  csvContent: string,
  startingBalance?: number
) {
  const { supabase, householdId } = await getHouseholdId();

  const parsed = parseCSV(csvContent, source);
  if (parsed.length === 0) {
    return { error: "No transactions found in file" };
  }

  const batchId = crypto.randomUUID();

  const rows = parsed.map((t) => ({
    household_id: householdId,
    account_id: accountId,
    date: t.date,
    amount: t.amount,
    description: t.description,
    category: t.category,
    check_number: t.check_number,
    memo: t.memo,
    source: t.source,
    import_batch_id: batchId,
  }));

  const { data, error } = await supabase
    .from("transactions")
    .insert(rows)
    .select();

  if (error) return { error: error.message };

  const imported = data?.length ?? 0;

  // Update starting balance if provided
  if (startingBalance !== undefined) {
    await supabase
      .from("accounts")
      .update({
        starting_balance: startingBalance,
        starting_balance_date: parsed[parsed.length - 1].date,
      })
      .eq("id", accountId)
      .eq("household_id", householdId);
  }

  // Recalculate account balance = starting_balance + sum(transactions)
  await recalculateBalance(supabase, accountId, householdId);

  // Match transactions to bills and update amounts
  const billsUpdated = await matchAndUpdateBills(supabase, householdId, parsed, data || []);

  revalidatePath("/accounts");
  revalidatePath("/bills");
  revalidatePath("/");
  return { success: true, imported, total: rows.length, billsUpdated };
}

export async function getTransactions(accountId: string) {
  const { supabase } = await getHouseholdId();

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("account_id", accountId)
    .order("date", { ascending: false })
    .limit(200);

  if (error) return { error: error.message };
  return { data };
}

export async function deleteImportBatch(batchId: string) {
  const { supabase, householdId } = await getHouseholdId();

  // Get the account_id before deleting so we can update balance
  const { data: batchTxns } = await supabase
    .from("transactions")
    .select("account_id")
    .eq("import_batch_id", batchId)
    .limit(1);

  const accountId = batchTxns?.[0]?.account_id;

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("import_batch_id", batchId)
    .eq("household_id", householdId);

  if (error) return { error: error.message };

  // Recalculate balance
  if (accountId) {
    await recalculateBalance(supabase, accountId, householdId);
  }

  revalidatePath("/accounts");
  revalidatePath("/");
  return { success: true };
}
