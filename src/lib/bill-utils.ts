import type { Bill, BillPayment } from "./types";

export function getNextDueDate(bill: Bill, after: Date = new Date()): Date {
  const today = new Date(after);
  today.setHours(0, 0, 0, 0);

  const dueDay = Math.min(bill.due_day, daysInMonth(today.getFullYear(), today.getMonth()));
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), dueDay);

  if (bill.frequency === "one_time") {
    return thisMonth;
  }

  if (thisMonth >= today) {
    return thisMonth;
  }

  // Move to next occurrence
  return getNextOccurrence(bill, thisMonth);
}

function getNextOccurrence(bill: Bill, from: Date): Date {
  const d = new Date(from);
  switch (bill.frequency) {
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "quarterly":
      d.setMonth(d.getMonth() + 3);
      break;
    case "annual":
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      d.setMonth(d.getMonth() + 1);
  }
  // Cap due_day at month's max
  const maxDay = daysInMonth(d.getFullYear(), d.getMonth());
  d.setDate(Math.min(bill.due_day, maxDay));
  return d;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function generatePaymentDates(
  bill: Bill,
  startDate: Date,
  endDate: Date
): Date[] {
  const dates: Date[] = [];
  let current = getNextDueDate(bill, startDate);

  while (current <= endDate) {
    dates.push(new Date(current));
    if (bill.frequency === "one_time") break;
    current = getNextOccurrence(bill, current);
  }

  return dates;
}

export function getBillStatus(payment: BillPayment): "paid" | "upcoming" | "overdue" {
  if (payment.status === "paid") return "paid";
  const dueDate = new Date(payment.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate < today ? "overdue" : "upcoming";
}

export function calculateMonthlyTotal(bills: Bill[]): number {
  return bills
    .filter((b) => b.is_active)
    .reduce((total, bill) => {
      switch (bill.frequency) {
        case "monthly":
          return total + bill.amount;
        case "quarterly":
          return total + bill.amount / 3;
        case "annual":
          return total + bill.amount / 12;
        case "one_time":
          return total;
        default:
          return total + bill.amount;
      }
    }, 0);
}
