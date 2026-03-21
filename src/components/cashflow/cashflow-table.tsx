"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { CashFlowDay } from "@/lib/types";

export function CashFlowTable({ forecast }: { forecast: CashFlowDay[] }) {
  // Only show days with activity or every 7th day
  const relevantDays = forecast.filter(
    (day, i) => day.income > 0 || day.expenses > 0 || i % 7 === 0 || day.isShortfall
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Day-by-Day Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Income</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relevantDays.map((day) => (
                <TableRow
                  key={day.date.toISOString()}
                  className={cn(day.isShortfall && "bg-destructive/5")}
                >
                  <TableCell className="font-medium">
                    {day.date.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    {day.income > 0 ? formatCurrency(day.income) : "-"}
                  </TableCell>
                  <TableCell className="text-right text-destructive">
                    {day.expenses > 0 ? formatCurrency(day.expenses) : "-"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-semibold",
                      day.isShortfall && "text-destructive"
                    )}
                  >
                    {formatCurrency(day.endBalance)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {[
                      ...day.bills.map((b) => b.name),
                      ...day.incomeItems.map((i) => i.name),
                    ].join(", ") || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
