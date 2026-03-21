"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { CashFlowDay } from "@/lib/types";

export function CashFlowMini({ forecast }: { forecast: CashFlowDay[] }) {
  const data = forecast.map((day) => ({
    date: day.date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    balance: Number(day.endBalance.toFixed(2)),
  }));

  const hasShortfall = forecast.some((d) => d.isShortfall);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>30-Day Cash Flow</span>
          {hasShortfall && (
            <span className="text-sm font-normal text-destructive">
              Shortfall detected
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {forecast.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Add accounts, bills, and income to see your cash flow forecast
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
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
                fill="url(#colorBalance)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
