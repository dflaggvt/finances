"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CashFlowDay } from "@/lib/types";

export function CashFlowChart({ forecast }: { forecast: CashFlowDay[] }) {
  const data = forecast.map((day) => ({
    date: day.date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    balance: Number(day.endBalance.toFixed(2)),
    income: Number(day.income.toFixed(2)),
    expenses: Number((-day.expenses).toFixed(2)),
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Projected Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) =>
                  v >= 1000 || v <= -1000
                    ? `$${(v / 1000).toFixed(0)}k`
                    : `$${v}`
                }
              />
              <Tooltip
                formatter={(value) =>
                  `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                }
              />
              <ReferenceLine y={0} stroke="hsl(0, 84%, 60%)" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="hsl(142, 76%, 36%)"
                fill="url(#colorPos)"
                name="Balance"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Income & Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `$${Math.abs(v)}`}
              />
              <Tooltip
                formatter={(value) =>
                  `$${Math.abs(Number(value)).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}`
                }
              />
              <Bar dataKey="income" fill="hsl(142, 76%, 36%)" name="Income" />
              <Bar dataKey="expenses" fill="hsl(0, 84%, 60%)" name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
