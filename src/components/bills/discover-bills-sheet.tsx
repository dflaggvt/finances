"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, Sparkles, ChevronDown, ChevronRight, Merge } from "lucide-react";
import {
  discoverBills,
  createBillsFromDiscovery,
} from "@/app/(dashboard)/bills/actions";
import { CATEGORY_LABELS, FREQUENCY_LABELS, formatCurrency } from "@/lib/utils";
import type { DiscoveredBill } from "@/lib/types";

interface EditableBill extends DiscoveredBill {
  selected: boolean;
  markedForMerge: boolean;
}

interface DiscoverBillsSheetProps {
  trigger: React.ReactNode;
}

export function DiscoverBillsSheet({ trigger }: DiscoverBillsSheetProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [bills, setBills] = useState<EditableBill[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function handleDiscover() {
    setLoading(true);
    setError(null);
    setResult(null);
    setBills([]);

    const res = await discoverBills();

    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      setBills(res.data.map((b) => ({ ...b, selected: true, markedForMerge: false })));
    }
    setLoading(false);
  }

  async function handleCreate() {
    const selected = bills.filter((b) => b.selected);
    if (selected.length === 0) return;

    setCreating(true);
    const res = await createBillsFromDiscovery(
      selected.map((b) => ({
        name: b.name,
        amount: b.amount,
        due_day: b.due_day,
        frequency: b.frequency,
        category: b.category,
        bill_type: b.bill_type,
        match_pattern: b.match_pattern,
      }))
    );

    if (res.error) {
      setError(res.error);
    } else {
      setResult(`Created ${res.created} bills and matched transactions.`);
      setBills([]);
    }
    setCreating(false);
  }

  function updateBill(index: number, updates: Partial<EditableBill>) {
    setBills((prev) =>
      prev.map((b, i) => (i === index ? { ...b, ...updates } : b))
    );
  }

  function toggleAll(selected: boolean) {
    setBills((prev) => prev.map((b) => ({ ...b, selected })));
  }

  function toggleMerge(index: number) {
    setBills((prev) =>
      prev.map((b, i) =>
        i === index ? { ...b, markedForMerge: !b.markedForMerge } : b
      )
    );
  }

  function handleMerge() {
    const toMerge = bills.filter((b) => b.markedForMerge);
    if (toMerge.length < 2) return;

    // Keep the first one as the primary, merge others into it
    const primary = { ...toMerge[0] };

    // Combine match patterns (deduplicated)
    const allPatterns = toMerge
      .flatMap((b) => b.match_pattern.split(",").map((p) => p.trim().toLowerCase()))
      .filter(Boolean);
    primary.match_pattern = [...new Set(allPatterns)].join(", ");

    // Combine sample transactions (deduplicated, max 10)
    const allSamples = toMerge.flatMap((b) => b.sample_transactions);
    primary.sample_transactions = [...new Set(allSamples)].slice(0, 10);

    // Use highest confidence
    primary.confidence = Math.max(...toMerge.map((b) => b.confidence));

    // Use most recent amount (first in list since sorted by confidence)
    primary.markedForMerge = false;

    // Replace merged bills with the primary
    const mergedIndices = new Set(
      bills
        .map((b, i) => (b.markedForMerge ? i : -1))
        .filter((i) => i >= 0)
    );
    const newBills = bills.filter((_, i) => !mergedIndices.has(i));
    // Insert primary at the position of the first merged bill
    const firstIndex = bills.findIndex((b) => b.markedForMerge);
    newBills.splice(
      Math.min(firstIndex, newBills.length),
      0,
      primary
    );
    setBills(newBills);
  }

  const selectedCount = bills.filter((b) => b.selected).length;
  const mergeCount = bills.filter((b) => b.markedForMerge).length;

  return (
    <>
      <span onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger}
      </span>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Discover Bills</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4">
            {!loading && bills.length === 0 && !result && (
              <div className="space-y-4 text-center py-8">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Analyze your transactions with AI to identify recurring
                    bills, subscriptions, and regular payments.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Only unmatched transactions are scanned.
                  </p>
                </div>
                <Button onClick={handleDiscover} disabled={loading}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Scan Transactions
                </Button>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center gap-3 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Analyzing transactions with AI...
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {result && (
              <div className="rounded-md bg-green-50 dark:bg-green-950 p-3 text-sm text-green-700 dark:text-green-300 text-center">
                {result}
              </div>
            )}

            {bills.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Found {bills.length} potential bills
                  </p>
                  <div className="flex items-center gap-2">
                    {mergeCount >= 2 && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleMerge}
                      >
                        <Merge className="mr-1 h-3 w-3" />
                        Merge {mergeCount}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toggleAll(selectedCount < bills.length)
                      }
                    >
                      {selectedCount === bills.length
                        ? "Deselect All"
                        : "Select All"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDiscover}
                    >
                      Re-scan
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {bills.map((bill, index) => (
                    <DiscoveredBillCard
                      key={index}
                      bill={bill}
                      onChange={(updates) => updateBill(index, updates)}
                      onToggleMerge={() => toggleMerge(index)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {bills.length > 0 && (
            <SheetFooter>
              <Button
                onClick={handleCreate}
                disabled={creating || selectedCount === 0}
                className="w-full"
              >
                {creating
                  ? "Creating..."
                  : `Create ${selectedCount} Bill${selectedCount !== 1 ? "s" : ""}`}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function DiscoveredBillCard({
  bill,
  onChange,
  onToggleMerge,
}: {
  bill: EditableBill;
  onChange: (updates: Partial<EditableBill>) => void;
  onToggleMerge: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const confidenceColor =
    bill.confidence >= 0.8
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";

  return (
    <Card className={`${bill.selected ? "" : "opacity-50"} ${bill.markedForMerge ? "ring-2 ring-primary" : ""}`}>
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-start gap-3">
          <div className="flex flex-col gap-2 pt-0.5">
            <Switch
              checked={bill.selected}
              onCheckedChange={(checked) => onChange({ selected: !!checked })}
            />
            <button
              onClick={onToggleMerge}
              className={`flex items-center justify-center rounded-md border p-1 text-xs ${
                bill.markedForMerge
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input hover:bg-muted"
              }`}
              title="Select for merge"
            >
              <Merge className="h-3 w-3" />
            </button>
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <Input
                value={bill.name}
                onChange={(e) => onChange({ name: e.target.value })}
                className="font-medium h-8"
              />
              <Badge className={`ml-2 shrink-0 ${confidenceColor}`}>
                {Math.round(bill.confidence * 100)}%
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={bill.amount}
                  onChange={(e) =>
                    onChange({ amount: parseFloat(e.target.value) || 0 })
                  }
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Due Day</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={bill.due_day}
                  onChange={(e) =>
                    onChange({ due_day: parseInt(e.target.value) || 1 })
                  }
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Frequency</Label>
                <Select
                  value={bill.frequency}
                  onValueChange={(val) => {
                    if (val) onChange({ frequency: val as EditableBill["frequency"] });
                  }}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["monthly", "quarterly", "annual", "one_time"] as const).map(
                      (f) => (
                        <SelectItem key={f} value={f}>
                          {FREQUENCY_LABELS[f]}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Category</Label>
                <Select
                  value={bill.category}
                  onValueChange={(val) => {
                    if (val) onChange({ category: val as EditableBill["category"] });
                  }}
                >
                  <SelectTrigger className="h-8">
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
              <div>
                <Label className="text-xs">Match Pattern</Label>
                <Input
                  value={bill.match_pattern}
                  onChange={(e) => onChange({ match_pattern: e.target.value })}
                  className="h-8 text-xs"
                  placeholder="keywords..."
                />
              </div>
            </div>

            {bill.sample_transactions.length > 0 && (
              <div>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {expanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  {bill.sample_transactions.length} matching transactions
                </button>
                {expanded && (
                  <div className="mt-1 space-y-0.5 pl-4">
                    {bill.sample_transactions.map((t, i) => (
                      <p
                        key={i}
                        className="text-xs text-muted-foreground truncate"
                      >
                        {t}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
