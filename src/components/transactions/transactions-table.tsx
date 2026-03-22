"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { rematchTransactions } from "@/app/(dashboard)/accounts/import-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Account, Transaction } from "@/lib/types";

const SOURCE_LABELS: Record<string, string> = {
  wells_fargo: "Wells Fargo",
  chase: "Chase",
  manual: "Manual",
};

interface TransactionsTableProps {
  transactions: Transaction[];
  accounts: Account[];
  bills: { id: string; name: string }[];
  currentAccountId?: string;
}

export function TransactionsTable({
  transactions,
  accounts,
  bills,
  currentAccountId,
}: TransactionsTableProps) {
  const router = useRouter();
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<string | null>(null);

  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const billMap = new Map(bills.map((b) => [b.id, b]));

  async function handleRematch() {
    setMatching(true);
    setMatchResult(null);
    const result = await rematchTransactions(currentAccountId);
    if ("error" in result && result.error) {
      setMatchResult(`Error: ${result.error}`);
    } else if ("matched" in result) {
      setMatchResult(
        `Matched ${result.matched} transactions, updated ${result.billsUpdated} bills`
      );
      router.refresh();
    }
    setMatching(false);
  }

  function handleAccountFilter(value: string | null) {
    if (!value || value === "all") {
      router.push("/transactions");
    } else {
      router.push(`/transactions?account=${value}`);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Account:</span>
          <Select
            value={currentAccountId || "all"}
            onValueChange={handleAccountFilter}
          >
            <SelectTrigger>
              <SelectValue>
                {currentAccountId
                  ? accountMap.get(currentAccountId)?.name || "Unknown"
                  : "All Accounts"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-sm text-muted-foreground">
          {transactions.length} transactions
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRematch}
          disabled={matching || transactions.length === 0}
        >
          <RefreshCw className={`mr-1 h-3 w-3 ${matching ? "animate-spin" : ""}`} />
          {matching ? "Matching..." : "Re-match Bills"}
        </Button>
        {matchResult && (
          <span className="text-sm text-muted-foreground">{matchResult}</span>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Bill</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-muted-foreground"
                >
                  No transactions yet. Import a CSV from the Accounts page.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((txn) => (
                <TableRow key={txn.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(txn.date)}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {txn.description}
                    {txn.check_number && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        #{txn.check_number}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {accountMap.get(txn.account_id)?.name || "—"}
                  </TableCell>
                  <TableCell>
                    {txn.category && (
                      <Badge variant="outline">{txn.category}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {txn.bill_id && billMap.get(txn.bill_id) ? (
                      <Badge variant="secondary">
                        {billMap.get(txn.bill_id)!.name}
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell
                    className={`text-right whitespace-nowrap font-medium ${
                      txn.amount < 0 ? "text-destructive" : "text-green-600"
                    }`}
                  >
                    {formatCurrency(txn.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {SOURCE_LABELS[txn.source] || txn.source}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
