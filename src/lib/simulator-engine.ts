import type { Bill, Income, CashFlowDay } from "./types";
import { buildCashFlowForecast } from "./cashflow-engine";

interface SimulatorParams {
  startingBalance: number;
  bills: Bill[];
  income: Income[];
  days: number;
  simulatedAutoPay: Record<string, boolean>;
}

export interface SimulatorResult {
  currentForecast: CashFlowDay[];
  simulatedForecast: CashFlowDay[];
  billAnalysis: BillSafety[];
}

export interface BillSafety {
  bill: Bill;
  isSafe: boolean;
  shortfallDate: string | null;
}

export function runSimulation({
  startingBalance,
  bills,
  income,
  days,
  simulatedAutoPay,
}: SimulatorParams): SimulatorResult {
  // Current forecast with actual auto-pay settings
  const currentForecast = buildCashFlowForecast({
    startingBalance,
    bills,
    income,
    days,
  });

  // Simulated forecast with overridden auto-pay settings
  // (Auto-pay doesn't change amounts, but we use it to show what the cash flow looks like
  // when bills are set to auto-pay — the key insight is which bills being on auto-pay
  // would cause a shortfall)
  const simulatedBills = bills.map((b) => ({
    ...b,
    is_auto_pay: simulatedAutoPay[b.id] ?? b.is_auto_pay,
  }));

  const simulatedForecast = buildCashFlowForecast({
    startingBalance,
    bills: simulatedBills,
    income,
    days,
  });

  // Analyze each bill: is it safe to auto-pay?
  const billAnalysis = bills
    .filter((b) => b.is_active)
    .map((bill) => {
      // Run forecast with only this bill toggled to auto-pay
      const testBills = bills.map((b) =>
        b.id === bill.id ? { ...b, is_auto_pay: true } : b
      );
      const testForecast = buildCashFlowForecast({
        startingBalance,
        bills: testBills,
        income,
        days,
      });

      const shortfallDay = testForecast.find((d) => d.isShortfall);

      return {
        bill,
        isSafe: !shortfallDay,
        shortfallDate: shortfallDay
          ? shortfallDay.date.toISOString().split("T")[0]
          : null,
      };
    });

  return { currentForecast, simulatedForecast, billAnalysis };
}
