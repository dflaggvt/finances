"use server";

import { createClient } from "@/lib/supabase/server";
import { parseCSV } from "@/lib/csv-parsers";
import { matchWithLLM } from "@/lib/llm-matching";
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

async function getMatchingPrompt(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string
): Promise<string> {
  const { data } = await supabase
    .from("household_settings")
    .select("matching_prompt")
    .eq("household_id", householdId)
    .single();

  return (
    data?.matching_prompt ||
    "You are a financial transaction matcher. Given a list of transactions and a list of bills, determine which transactions correspond to which bills. Consider merchant name variations, abbreviations, and partial matches. Return matches as JSON."
  );
}

async function llmMatchAndUpdateBills(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  transactions: { index: number; date: string; amount: number; description: string; category: string | null }[],
  transactionIds: string[]
) {
  const { data: bills } = await supabase
    .from("bills")
    .select("id, name, amount, category, match_pattern")
    .eq("household_id", householdId)
    .eq("is_active", true);

  if (!bills || bills.length === 0) return { matched: 0, billsUpdated: 0 };

  const prompt = await getMatchingPrompt(supabase, householdId);

  // Process in batches of 50 to stay within token limits
  const batchSize = 50;
  let totalMatched = 0;
  const allLatestByBill = new Map<string, { amount: number; date: string }>();

  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);

    try {
      const matches = await matchWithLLM(batch, bills, prompt);

      for (const match of matches) {
        const globalIndex = match.transactionIndex;
        const txnId = transactionIds[globalIndex];
        if (txnId) {
          await supabase
            .from("transactions")
            .update({ bill_id: match.billId })
            .eq("id", txnId);
          totalMatched++;
        }

        // Track latest amount per bill
        const txn = transactions.find((t) => t.index === globalIndex);
        if (txn) {
          const existing = allLatestByBill.get(match.billId);
          if (!existing || txn.date > existing.date) {
            allLatestByBill.set(match.billId, {
              amount: Math.abs(txn.amount),
              date: txn.date,
            });
          }
        }
      }
    } catch (e) {
      console.error("LLM matching error for batch:", e);
    }
  }

  // Update bill amounts where they changed
  let billsUpdated = 0;
  for (const [billId, { amount, date }] of allLatestByBill) {
    const bill = bills.find((b) => b.id === billId)!;
    if (Math.abs(Number(bill.amount) - amount) < 0.01) continue;

    await supabase.from("bill_amount_history").insert({
      bill_id: billId,
      household_id: householdId,
      amount: bill.amount,
      effective_date: date,
      source: "auto",
    });

    await supabase
      .from("bills")
      .update({ amount })
      .eq("id", billId)
      .eq("household_id", householdId);

    billsUpdated++;
  }

  return { matched: totalMatched, billsUpdated };
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

  // Match transactions to bills via LLM
  let matchResult = { matched: 0, billsUpdated: 0 };
  if (process.env.OPENAI_API_KEY) {
    const txnsForMatching = parsed.map((t, i) => ({
      index: i,
      date: t.date,
      amount: t.amount,
      description: t.description,
      category: t.category,
    }));
    const txnIds = (data || []).map((d) => d.id);
    matchResult = await llmMatchAndUpdateBills(
      supabase,
      householdId,
      txnsForMatching,
      txnIds
    );
  }

  revalidatePath("/accounts");
  revalidatePath("/bills");
  revalidatePath("/transactions");
  revalidatePath("/");
  return {
    success: true,
    imported,
    total: rows.length,
    matched: matchResult.matched,
    billsUpdated: matchResult.billsUpdated,
  };
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

export async function rematchTransactions(accountId?: string) {
  const { supabase, householdId } = await getHouseholdId();

  if (!process.env.OPENAI_API_KEY) {
    return { error: "OPENAI_API_KEY not configured" };
  }

  // Clear existing bill links
  let clearQuery = supabase
    .from("transactions")
    .update({ bill_id: null })
    .eq("household_id", householdId)
    .not("bill_id", "is", null);

  if (accountId) {
    clearQuery = clearQuery.eq("account_id", accountId);
  }
  await clearQuery;

  // Get all unmatched transactions
  let txnQuery = supabase
    .from("transactions")
    .select("id, date, amount, description, category")
    .eq("household_id", householdId)
    .order("date", { ascending: false });

  if (accountId) {
    txnQuery = txnQuery.eq("account_id", accountId);
  }

  const { data: txns } = await txnQuery;
  if (!txns || txns.length === 0) {
    return { matched: 0, billsUpdated: 0 };
  }

  const txnsForMatching = txns.map((t, i) => ({
    index: i,
    date: t.date,
    amount: Number(t.amount),
    description: t.description,
    category: t.category,
  }));
  const txnIds = txns.map((t) => t.id);

  const result = await llmMatchAndUpdateBills(
    supabase,
    householdId,
    txnsForMatching,
    txnIds
  );

  revalidatePath("/transactions");
  revalidatePath("/bills");
  revalidatePath("/");
  return { success: true, ...result };
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
