"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { IncomeForm } from "./income-form";
import { deleteIncome } from "@/app/(dashboard)/income/actions";
import { formatCurrency, formatDate, FREQUENCY_LABELS } from "@/lib/utils";
import type { Income } from "@/lib/types";

function getMonthlyEquivalent(income: Income): number {
  switch (income.frequency) {
    case "weekly":
      return (income.amount * 52) / 12;
    case "biweekly":
      return (income.amount * 26) / 12;
    case "semimonthly":
      return income.amount * 2;
    case "monthly":
      return income.amount;
    case "one_time":
      return 0;
    default:
      return income.amount;
  }
}

export function IncomeTable({ incomes }: { incomes: Income[] }) {
  const monthlyTotal = incomes
    .filter((i) => i.is_active)
    .reduce((sum, i) => sum + getMonthlyEquivalent(i), 0);

  async function handleDelete(id: string) {
    await deleteIncome(id);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Next Date</TableHead>
              <TableHead className="text-right">Monthly Equiv.</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {incomes.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-muted-foreground"
                >
                  No income sources yet. Add your first income source.
                </TableCell>
              </TableRow>
            ) : (
              incomes.map((income) => (
                <TableRow key={income.id}>
                  <TableCell className="font-medium">{income.name}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(income.amount)}
                  </TableCell>
                  <TableCell>{FREQUENCY_LABELS[income.frequency]}</TableCell>
                  <TableCell>{formatDate(income.next_date)}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(getMonthlyEquivalent(income))}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted">
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <IncomeForm
                          income={income}
                          trigger={
                            <DropdownMenuItem>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          }
                        />
                        <DropdownMenuItem
                          onClick={() => handleDelete(income.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {incomes.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Estimated monthly income:{" "}
          <span className="font-semibold text-foreground">
            {formatCurrency(monthlyTotal)}
          </span>
        </p>
      )}
    </div>
  );
}
