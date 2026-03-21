import type { Bill, Income, CashFlowDay } from "./types";
import { generatePaymentDates } from "./bill-utils";

interface CashFlowParams {
  startingBalance: number;
  bills: Bill[];
  income: Income[];
  days: number;
  startDate?: Date;
}

export function buildCashFlowForecast({
  startingBalance,
  bills,
  income,
  days,
  startDate,
}: CashFlowParams): CashFlowDay[] {
  const start = startDate || new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + days);

  // Pre-compute all bill due dates in the range
  const billDueDates = new Map<string, Bill[]>();
  for (const bill of bills) {
    if (!bill.is_active) continue;
    const dates = generatePaymentDates(bill, start, end);
    for (const date of dates) {
      const key = dateKey(date);
      if (!billDueDates.has(key)) billDueDates.set(key, []);
      billDueDates.get(key)!.push(bill);
    }
  }

  // Pre-compute all income dates in the range
  const incomeDates = new Map<string, Income[]>();
  for (const inc of income) {
    if (!inc.is_active) continue;
    const dates = getIncomeDates(inc, start, end);
    for (const date of dates) {
      const key = dateKey(date);
      if (!incomeDates.has(key)) incomeDates.set(key, []);
      incomeDates.get(key)!.push(inc);
    }
  }

  const forecast: CashFlowDay[] = [];
  let runningBalance = startingBalance;

  for (let i = 0; i < days; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    const key = dateKey(date);

    const dayBills = billDueDates.get(key) || [];
    const dayIncome = incomeDates.get(key) || [];

    const totalExpenses = dayBills.reduce((sum, b) => sum + b.amount, 0);
    const totalIncome = dayIncome.reduce((sum, inc) => sum + inc.amount, 0);

    const startBalance = runningBalance;
    runningBalance = runningBalance + totalIncome - totalExpenses;

    forecast.push({
      date: new Date(date),
      startBalance,
      income: totalIncome,
      expenses: totalExpenses,
      endBalance: runningBalance,
      bills: dayBills,
      incomeItems: dayIncome,
      isShortfall: runningBalance < 0,
    });
  }

  return forecast;
}

function getIncomeDates(income: Income, start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  let current = new Date(income.next_date);
  current.setHours(0, 0, 0, 0);

  // If next_date is before start, advance to first occurrence >= start
  while (current < start) {
    current = advanceIncomeDate(current, income.frequency);
    if (income.frequency === "one_time") return [];
  }

  while (current <= end) {
    dates.push(new Date(current));
    if (income.frequency === "one_time") break;
    current = advanceIncomeDate(current, income.frequency);
  }

  return dates;
}

function advanceIncomeDate(
  date: Date,
  frequency: string
): Date {
  const d = new Date(date);
  switch (frequency) {
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "biweekly":
      d.setDate(d.getDate() + 14);
      break;
    case "semimonthly":
      if (d.getDate() <= 1) {
        d.setDate(15);
      } else if (d.getDate() <= 15) {
        // Move to 1st of next month
        d.setMonth(d.getMonth() + 1);
        d.setDate(1);
      } else {
        d.setDate(15);
        if (d.getDate() < 15) {
          // Month rolled over, set to 15th
          d.setDate(15);
        }
      }
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    default:
      d.setDate(d.getDate() + 30);
  }
  return d;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
