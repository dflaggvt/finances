import { createClient } from "@/lib/supabase/server";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import type { Account, Transaction } from "@/lib/types";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const { account: accountFilter } = await searchParams;
  const supabase = await createClient();

  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .order("name");

  const { data: bills } = await supabase
    .from("bills")
    .select("id, name")
    .order("name");

  let query = supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: false })
    .limit(500);

  if (accountFilter) {
    query = query.eq("account_id", accountFilter);
  }

  const { data: transactions } = await query;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Transactions</h1>
      <TransactionsTable
        transactions={(transactions || []) as Transaction[]}
        accounts={(accounts || []) as Account[]}
        bills={(bills || []) as { id: string; name: string }[]}
        currentAccountId={accountFilter}
      />
    </div>
  );
}
