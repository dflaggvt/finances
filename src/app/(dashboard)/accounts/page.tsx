import { createClient } from "@/lib/supabase/server";
import { AccountCard } from "@/components/accounts/account-card";
import { AccountForm } from "@/components/accounts/account-form";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ACCOUNT_TYPE_LABELS } from "@/lib/utils";
import type { Account, AccountType } from "@/lib/types";

export default async function AccountsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("accounts")
    .select("*")
    .order("type")
    .order("name");

  const accounts = (data || []) as Account[];

  const grouped = accounts.reduce(
    (acc, account) => {
      const type = account.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(account);
      return acc;
    },
    {} as Record<AccountType, Account[]>
  );

  const typeOrder: AccountType[] = ["checking", "savings", "credit_card", "loan"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <AccountForm
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          }
        />
      </div>

      {accounts.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          No accounts yet. Add your first account to get started.
        </p>
      ) : (
        typeOrder.map(
          (type) =>
            grouped[type] && (
              <div key={type} className="space-y-3">
                <h2 className="text-lg font-semibold">
                  {ACCOUNT_TYPE_LABELS[type]}
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {grouped[type].map((account) => (
                    <AccountCard key={account.id} account={account} />
                  ))}
                </div>
              </div>
            )
        )
      )}
    </div>
  );
}
