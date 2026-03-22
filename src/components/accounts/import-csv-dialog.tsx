"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";
import { importTransactions } from "@/app/(dashboard)/accounts/import-actions";
import type { Account, TransactionSource } from "@/lib/types";

const BANK_LABELS: Record<string, string> = {
  wells_fargo: "Wells Fargo",
  chase: "Chase",
};

interface ImportCSVDialogProps {
  account: Account;
}

export function ImportCSVDialog({ account }: ImportCSVDialogProps) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<TransactionSource>(
    inferBank(account.institution)
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startingBalance, setStartingBalance] = useState(
    String(account.starting_balance || "")
  );
  const fileRef = useRef<HTMLInputElement>(null);

  function inferBank(institution: string | null): TransactionSource {
    const name = (institution || "").toLowerCase();
    if (name.includes("chase")) return "chase";
    return "wells_fargo";
  }

  async function handleImport() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Please select a CSV file");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const content = await file.text();
    const balance = startingBalance ? parseFloat(startingBalance) : undefined;
    const res = await importTransactions(account.id, source, content, balance);

    if ("error" in res && res.error) {
      setError(res.error);
    } else if ("success" in res) {
      setResult({
        imported: res.imported!,
        skipped: res.skipped!,
        total: res.total!,
      });
    }
    setLoading(false);
  }

  function handleClose() {
    setOpen(false);
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Upload className="mr-1 h-3 w-3" />
        Import CSV
      </Button>
      <Dialog open={open} onOpenChange={(val) => val ? setOpen(true) : handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Transactions — {account.name}</DialogTitle>
          </DialogHeader>

          {result ? (
            <div className="space-y-2 py-4">
              <p className="text-sm font-medium text-green-600">
                Import complete!
              </p>
              <p className="text-sm text-muted-foreground">
                {result.imported} transactions imported
                {result.skipped > 0 && `, ${result.skipped} duplicates skipped`}
              </p>
              <DialogFooter>
                <Button onClick={handleClose}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Bank Format</Label>
                <Select value={source} onValueChange={(val) => { if (val) setSource(val as TransactionSource); }}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BANK_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>CSV File</Label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <Label>Starting Balance (before first transaction)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 2666.10"
                  value={startingBalance}
                  onChange={(e) => setStartingBalance(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  The account balance before the earliest transaction in the CSV.
                  Only needed on first import.
                </p>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={loading}>
                  {loading ? "Importing..." : "Import"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
