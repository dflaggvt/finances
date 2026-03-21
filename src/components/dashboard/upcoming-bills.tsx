"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { markBillPaid } from "@/app/(dashboard)/bills/actions";
import { formatCurrency, formatDate, getDaysUntil } from "@/lib/utils";
import type { BillPayment, Bill } from "@/lib/types";

interface UpcomingBillsProps {
  payments: (BillPayment & { bill?: Bill })[];
}

export function UpcomingBills({ payments }: UpcomingBillsProps) {
  async function handleMarkPaid(paymentId: string) {
    await markBillPaid(paymentId);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Bills</CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No upcoming bills
          </p>
        ) : (
          <div className="space-y-3">
            {payments.slice(0, 10).map((payment) => {
              const daysUntil = getDaysUntil(payment.due_date);
              return (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {payment.bill?.name || "Bill"}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(payment.due_date)}
                      </span>
                      <Badge
                        variant={
                          daysUntil < 0
                            ? "destructive"
                            : daysUntil <= 3
                              ? "secondary"
                              : "outline"
                        }
                        className="text-xs"
                      >
                        {daysUntil < 0
                          ? `${Math.abs(daysUntil)}d overdue`
                          : daysUntil === 0
                            ? "Due today"
                            : `${daysUntil}d`}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {formatCurrency(payment.amount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleMarkPaid(payment.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
