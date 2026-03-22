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
import { Switch } from "@/components/ui/switch";
import { createBill, updateBill } from "@/app/(dashboard)/bills/actions";
import type { Bill, Account } from "@/lib/types";
import { CATEGORY_LABELS, FREQUENCY_LABELS } from "@/lib/utils";

interface BillFormProps {
  bill?: Bill;
  accounts: Account[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function BillForm({ bill, accounts, trigger, open: controlledOpen, onOpenChange }: BillFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const result = bill
      ? await updateBill(bill.id, formData)
      : await createBill(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setOpen(false);
      setLoading(false);
    }
  }

  return (
    <>
      {trigger && (
        <span onClick={() => setOpen(true)} className="cursor-pointer">
          {trigger}
        </span>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{bill ? "Edit Bill" : "Add Bill"}</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={bill?.name} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  defaultValue={bill?.amount}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_day">Due Day (1-31)</Label>
                <Input
                  id="due_day"
                  name="due_day"
                  type="number"
                  min={1}
                  max={31}
                  defaultValue={bill?.due_day}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  name="frequency"
                  defaultValue={bill?.frequency || "monthly"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      ["monthly", "quarterly", "annual", "one_time"] as const
                    ).map((f) => (
                      <SelectItem key={f} value={f}>
                        {FREQUENCY_LABELS[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  name="category"
                  defaultValue={bill?.category || "other"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bill Type</Label>
              <Select
                name="bill_type"
                defaultValue={bill?.bill_type || "fixed"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="variable">Variable</SelectItem>
                  <SelectItem value="subscription">Subscription</SelectItem>
                  <SelectItem value="irregular">Irregular</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {accounts.length > 0 && (
              <div className="space-y-2">
                <Label>Payment Account</Label>
                <Select
                  name="account_id"
                  defaultValue={bill?.account_id || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Switch
                id="is_auto_pay"
                name="is_auto_pay"
                defaultChecked={bill?.is_auto_pay}
                value="true"
              />
              <Label htmlFor="is_auto_pay">Auto-pay enabled</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">Website URL (optional)</Label>
              <Input
                id="url"
                name="url"
                type="url"
                defaultValue={bill?.url || ""}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="match_pattern">
                Transaction Match Pattern (optional)
              </Label>
              <Input
                id="match_pattern"
                name="match_pattern"
                defaultValue={bill?.match_pattern || ""}
                placeholder="e.g. VERIZON, CON ED"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated keywords to match against imported transactions.
                When matched, the bill amount auto-updates.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                name="notes"
                defaultValue={bill?.notes || ""}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving..." : bill ? "Update Bill" : "Add Bill"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
