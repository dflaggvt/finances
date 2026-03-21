"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, RefreshCw } from "lucide-react";
import { AccountForm } from "./account-form";
import { deleteAccount, updateBalance } from "@/app/(dashboard)/accounts/actions";
import { formatCurrency, ACCOUNT_TYPE_LABELS } from "@/lib/utils";
import type { Account } from "@/lib/types";

export function AccountCard({ account }: { account: Account }) {
  const [balanceInput, setBalanceInput] = useState(String(account.balance));
  const [popoverOpen, setPopoverOpen] = useState(false);

  async function handleUpdateBalance() {
    await updateBalance(account.id, parseFloat(balanceInput));
    setPopoverOpen(false);
  }

  async function handleDelete() {
    if (confirm("Delete this account? Bills linked to it will be unlinked.")) {
      await deleteAccount(account.id);
    }
  }

  const utilization =
    account.type === "credit_card" && account.credit_limit
      ? (account.balance / account.credit_limit) * 100
      : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">{account.name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {account.institution || ACCOUNT_TYPE_LABELS[account.type]}
          </p>
        </div>
        <Badge variant="outline">{ACCOUNT_TYPE_LABELS[account.type]}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-2xl font-bold">
          {formatCurrency(account.balance)}
        </div>

        {utilization !== null && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Utilization</span>
              <span>{utilization.toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${
                  utilization > 80
                    ? "bg-destructive"
                    : utilization > 50
                      ? "bg-yellow-500"
                      : "bg-green-500"
                }`}
                style={{ width: `${Math.min(utilization, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Limit: {formatCurrency(account.credit_limit!)}
            </p>
          </div>
        )}

        {(account.type === "loan" || account.type === "credit_card") &&
          account.interest_rate && (
            <p className="text-sm text-muted-foreground">
              {account.interest_rate}% APR
              {account.minimum_payment
                ? ` | Min: ${formatCurrency(account.minimum_payment)}`
                : ""}
            </p>
          )}

        <div className="flex gap-2">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPopoverOpen(!popoverOpen)}
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Update Balance
            </Button>
            <PopoverContent className="w-64">
              <div className="space-y-2">
                <Input
                  type="number"
                  step="0.01"
                  value={balanceInput}
                  onChange={(e) => setBalanceInput(e.target.value)}
                />
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleUpdateBalance}
                >
                  Save
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <AccountForm
            account={account}
            trigger={
              <Button variant="outline" size="sm">
                <Pencil className="h-3 w-3" />
              </Button>
            }
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            className="text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
