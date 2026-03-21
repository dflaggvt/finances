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
import { createIncome, updateIncome } from "@/app/(dashboard)/income/actions";
import type { Income } from "@/lib/types";
import { FREQUENCY_LABELS } from "@/lib/utils";

interface IncomeFormProps {
  income?: Income;
  trigger: React.ReactNode;
}

export function IncomeForm({ income, trigger }: IncomeFormProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const result = income
      ? await updateIncome(income.id, formData)
      : await createIncome(formData);

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
      <span onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {income ? "Edit Income" : "Add Income Source"}
            </DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Source Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={income?.name}
                placeholder="e.g., Salary, Freelance"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  defaultValue={income?.amount}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  name="frequency"
                  defaultValue={income?.frequency || "biweekly"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      [
                        "weekly",
                        "biweekly",
                        "semimonthly",
                        "monthly",
                        "one_time",
                      ] as const
                    ).map((f) => (
                      <SelectItem key={f} value={f}>
                        {FREQUENCY_LABELS[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="next_date">Next Payment Date</Label>
              <Input
                id="next_date"
                name="next_date"
                type="date"
                defaultValue={income?.next_date}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                name="notes"
                defaultValue={income?.notes || ""}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Saving..."
                : income
                  ? "Update Income"
                  : "Add Income Source"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
