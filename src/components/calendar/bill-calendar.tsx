"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { markBillPaid } from "@/app/(dashboard)/bills/actions";
import type { BillPayment, Bill } from "@/lib/types";

interface BillCalendarProps {
  payments: (BillPayment & { bill?: Bill })[];
}

export function BillCalendar({ payments }: BillCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function getPaymentsForDay(day: number) {
    return payments.filter((p) => {
      const d = new Date(p.due_date);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  }

  function getDayStatus(dayPayments: (BillPayment & { bill?: Bill })[]) {
    if (dayPayments.length === 0) return "none";
    if (dayPayments.every((p) => p.status === "paid")) return "paid";
    if (dayPayments.some((p) => p.status === "overdue")) return "overdue";
    return "upcoming";
  }

  const selectedDayPayments = selectedDate
    ? getPaymentsForDay(selectedDate.getDate())
    : [];

  const days = [];
  // Empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-24" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayPayments = getPaymentsForDay(day);
    const status = getDayStatus(dayPayments);
    const isToday =
      year === today.getFullYear() &&
      month === today.getMonth() &&
      day === today.getDate();

    days.push(
      <button
        key={day}
        onClick={() => setSelectedDate(new Date(year, month, day))}
        className={cn(
          "flex h-24 flex-col rounded-md border p-1.5 text-left transition-colors hover:bg-muted/50",
          isToday && "border-primary",
          status === "paid" && "bg-green-50 dark:bg-green-950/20",
          status === "overdue" && "bg-red-50 dark:bg-red-950/20",
          status === "upcoming" && "bg-yellow-50 dark:bg-yellow-950/20"
        )}
      >
        <span
          className={cn(
            "text-sm font-medium",
            isToday && "text-primary font-bold"
          )}
        >
          {day}
        </span>
        <div className="mt-0.5 space-y-0.5 overflow-hidden">
          {dayPayments.slice(0, 2).map((p) => (
            <div
              key={p.id}
              className="truncate text-[10px] leading-tight text-muted-foreground"
            >
              {p.bill?.name || "Bill"} ({formatCurrency(p.amount)})
            </div>
          ))}
          {dayPayments.length > 2 && (
            <div className="text-[10px] text-muted-foreground">
              +{dayPayments.length - 2} more
            </div>
          )}
        </div>
      </button>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {currentDate.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="py-2 text-center text-xs font-medium text-muted-foreground"
              >
                {d}
              </div>
            ))}
            {days}
          </div>

          <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-sm bg-green-100 dark:bg-green-950" />
              Paid
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-sm bg-yellow-100 dark:bg-yellow-950" />
              Upcoming
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-sm bg-red-100 dark:bg-red-950" />
              Overdue
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={selectedDate !== null}
        onOpenChange={(open) => !open && setSelectedDate(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDate?.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </DialogTitle>
          </DialogHeader>
          {selectedDayPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No bills due on this day.
            </p>
          ) : (
            <div className="space-y-3">
              {selectedDayPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium">{payment.bill?.name || "Bill"}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(payment.amount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        payment.status === "paid"
                          ? "default"
                          : payment.status === "overdue"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {payment.status}
                    </Badge>
                    {payment.status !== "paid" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await markBillPaid(payment.id);
                        }}
                      >
                        <Check className="mr-1 h-3 w-3" />
                        Mark Paid
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
