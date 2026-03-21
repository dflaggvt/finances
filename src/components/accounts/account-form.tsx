"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAccount, updateAccount } from "@/app/(dashboard)/accounts/actions";
import type { Account } from "@/lib/types";
import { ACCOUNT_TYPE_LABELS } from "@/lib/utils";

interface AccountFormProps {
  account?: Account;
  trigger: React.ReactNode;
}

export function AccountForm({ account, trigger }: AccountFormProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState(account?.type || "checking");

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    formData.set("type", type);

    const result = account
      ? await updateAccount(account.id, formData)
      : await createAccount(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setOpen(false);
      setLoading(false);
    }
  }

  const showCreditFields = type === "credit_card";
  const showLoanFields = type === "loan" || type === "credit_card";

  return (
    <>
      <span onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {account ? "Edit Account" : "Add Account"}
            </DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Account Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={account?.name}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => v && setType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="institution">Institution (optional)</Label>
              <Input
                id="institution"
                name="institution"
                defaultValue={account?.institution || ""}
                placeholder="e.g., Chase, Bank of America"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="balance">Current Balance</Label>
              <Input
                id="balance"
                name="balance"
                type="number"
                step="0.01"
                defaultValue={account?.balance || 0}
                required
              />
            </div>

            {showCreditFields && (
              <div className="space-y-2">
                <Label htmlFor="credit_limit">Credit Limit</Label>
                <Input
                  id="credit_limit"
                  name="credit_limit"
                  type="number"
                  step="0.01"
                  defaultValue={account?.credit_limit || ""}
                />
              </div>
            )}

            {showLoanFields && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="interest_rate">Interest Rate (%)</Label>
                  <Input
                    id="interest_rate"
                    name="interest_rate"
                    type="number"
                    step="0.01"
                    defaultValue={account?.interest_rate || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minimum_payment">Minimum Payment</Label>
                  <Input
                    id="minimum_payment"
                    name="minimum_payment"
                    type="number"
                    step="0.01"
                    defaultValue={account?.minimum_payment || ""}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                name="notes"
                defaultValue={account?.notes || ""}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Saving..."
                : account
                  ? "Update Account"
                  : "Add Account"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
