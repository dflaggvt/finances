import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, DollarSign, TrendingUp, Landmark, CreditCard, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Bill, Income, Account, BillPayment } from "@/lib/types";
import { calculateMonthlyTotal } from "@/lib/bill-utils";

interface SummaryCardsProps {
  bills: Bill[];
  incomes: Income[];
  accounts: Account[];
  upcomingPayments: BillPayment[];
}

function getMonthlyIncome(incomes: Income[]): number {
  return incomes
    .filter((i) => i.is_active)
    .reduce((sum, i) => {
      switch (i.frequency) {
        case "weekly": return sum + (i.amount * 52) / 12;
        case "biweekly": return sum + (i.amount * 26) / 12;
        case "semimonthly": return sum + i.amount * 2;
        case "monthly": return sum + i.amount;
        case "one_time": return sum;
        default: return sum + i.amount;
      }
    }, 0);
}

export function SummaryCards({
  bills,
  incomes,
  accounts,
  upcomingPayments,
}: SummaryCardsProps) {
  const monthlyBills = calculateMonthlyTotal(bills);
  const monthlyIncome = getMonthlyIncome(incomes);
  const netCashFlow = monthlyIncome - monthlyBills;

  const totalBalances = accounts
    .filter((a) => a.type === "checking" || a.type === "savings")
    .reduce((sum, a) => sum + a.balance, 0);

  const totalDebt = accounts
    .filter((a) => a.type === "credit_card" || a.type === "loan")
    .reduce((sum, a) => sum + a.balance, 0);

  const nextPayment = upcomingPayments[0];

  const cards = [
    {
      title: "Monthly Bills",
      value: formatCurrency(monthlyBills),
      icon: Receipt,
      description: `${bills.filter((b) => b.is_active).length} active bills`,
    },
    {
      title: "Monthly Income",
      value: formatCurrency(monthlyIncome),
      icon: DollarSign,
      description: `${incomes.filter((i) => i.is_active).length} income sources`,
    },
    {
      title: "Net Cash Flow",
      value: formatCurrency(netCashFlow),
      icon: TrendingUp,
      description: netCashFlow >= 0 ? "Positive" : "Negative",
      className: netCashFlow >= 0 ? "text-green-600" : "text-destructive",
    },
    {
      title: "Cash on Hand",
      value: formatCurrency(totalBalances),
      icon: Landmark,
      description: "Checking + Savings",
    },
    {
      title: "Total Debt",
      value: formatCurrency(totalDebt),
      icon: CreditCard,
      description: "Credit Cards + Loans",
    },
    {
      title: "Next Bill Due",
      value: nextPayment
        ? formatCurrency(nextPayment.amount)
        : "None",
      icon: Clock,
      description: nextPayment
        ? `Due ${nextPayment.due_date}`
        : "All caught up",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.className || ""}`}>
              {card.value}
            </div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
