"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Check } from "lucide-react";
import { BillForm } from "./bill-form";
import { BillStatusBadge } from "./bill-status-badge";
import { deleteBill, markBillPaid } from "@/app/(dashboard)/bills/actions";
import {
  formatCurrency,
  CATEGORY_LABELS,
  FREQUENCY_LABELS,
} from "@/lib/utils";
import type { Bill, BillPayment, Account } from "@/lib/types";

interface BillsTableProps {
  bills: Bill[];
  payments: BillPayment[];
  accounts: Account[];
}

export function BillsTable({ bills, payments, accounts }: BillsTableProps) {
  const [deleting, setDeleting] = useState<string | null>(null);

  function getNextPayment(billId: string): BillPayment | undefined {
    return payments
      .filter((p) => p.bill_id === billId && p.status !== "paid")
      .sort(
        (a, b) =>
          new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      )[0];
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await deleteBill(id);
    setDeleting(null);
  }

  async function handleMarkPaid(paymentId: string) {
    await markBillPaid(paymentId);
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Due Day</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Auto-Pay</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {bills.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                No bills yet. Add your first bill to get started.
              </TableCell>
            </TableRow>
          ) : (
            bills.map((bill) => {
              const nextPayment = getNextPayment(bill.id);
              return (
                <TableRow key={bill.id}>
                  <TableCell className="font-medium">{bill.name}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(bill.amount)}
                  </TableCell>
                  <TableCell>{bill.due_day}</TableCell>
                  <TableCell>{FREQUENCY_LABELS[bill.frequency]}</TableCell>
                  <TableCell>{CATEGORY_LABELS[bill.category]}</TableCell>
                  <TableCell>
                    {bill.is_auto_pay ? (
                      <Badge variant="secondary">Auto</Badge>
                    ) : (
                      <Badge variant="outline">Manual</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {nextPayment ? (
                      <BillStatusBadge status={nextPayment.status} />
                    ) : (
                      <Badge variant="outline">No payments</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted">
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {nextPayment && nextPayment.status !== "paid" && (
                          <DropdownMenuItem
                            onClick={() => handleMarkPaid(nextPayment.id)}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Mark as Paid
                          </DropdownMenuItem>
                        )}
                        <BillForm
                          bill={bill}
                          accounts={accounts}
                          trigger={
                            <DropdownMenuItem>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          }
                        />
                        <DropdownMenuItem
                          onClick={() => handleDelete(bill.id)}
                          disabled={deleting === bill.id}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
