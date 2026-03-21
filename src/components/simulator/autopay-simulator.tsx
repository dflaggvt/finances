"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatCurrency, CATEGORY_LABELS } from "@/lib/utils";
import { runSimulation } from "@/lib/simulator-engine";
import type { Bill, Income, Account } from "@/lib/types";

interface AutoPaySimulatorProps {
  bills: Bill[];
  income: Income[];
  accounts: Account[];
}

export function AutoPaySimulator({
  bills,
  income,
  accounts,
}: AutoPaySimulatorProps) {
  const [autoPaySettings, setAutoPaySettings] = useState<Record<string, boolean>>(
    () => {
      const settings: Record<string, boolean> = {};
      bills.forEach((b) => {
        settings[b.id] = b.is_auto_pay;
      });
      return settings;
    }
  );

  const startingBalance = accounts
    .filter((a) => a.type === "checking" || a.type === "savings")
    .reduce((sum, a) => sum + a.balance, 0);

  const result = useMemo(
    () =>
      runSimulation({
        startingBalance,
        bills,
        income,
        days: 30,
        simulatedAutoPay: autoPaySettings,
      }),
    [startingBalance, bills, income, autoPaySettings]
  );

  function toggleAll(value: boolean) {
    const settings: Record<string, boolean> = {};
    bills.forEach((b) => {
      settings[b.id] = value;
    });
    setAutoPaySettings(settings);
  }

  function resetToActual() {
    const settings: Record<string, boolean> = {};
    bills.forEach((b) => {
      settings[b.id] = b.is_auto_pay;
    });
    setAutoPaySettings(settings);
  }

  const chartData = result.currentForecast.map((day, i) => ({
    date: day.date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    current: Number(day.endBalance.toFixed(2)),
    simulated: Number(result.simulatedForecast[i].endBalance.toFixed(2)),
  }));

  const hasSimulatedShortfall = result.simulatedForecast.some(
    (d) => d.isShortfall
  );
  const safeBills = result.billAnalysis.filter((b) => b.isSafe);
  const riskyBills = result.billAnalysis.filter((b) => !b.isSafe);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left: Bill toggles */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">Auto-Pay Settings</CardTitle>
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => toggleAll(true)}>
              All On
            </Button>
            <Button size="sm" variant="outline" onClick={() => toggleAll(false)}>
              All Off
            </Button>
            <Button size="sm" variant="outline" onClick={resetToActual}>
              Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {bills
            .filter((b) => b.is_active)
            .map((bill) => {
              const analysis = result.billAnalysis.find(
                (a) => a.bill.id === bill.id
              );
              return (
                <div
                  key={bill.id}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{bill.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(bill.amount)} |{" "}
                      {CATEGORY_LABELS[bill.category]}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {analysis && (
                      <Badge
                        variant={analysis.isSafe ? "secondary" : "destructive"}
                        className="text-[10px]"
                      >
                        {analysis.isSafe ? "Safe" : "Risk"}
                      </Badge>
                    )}
                    <Switch
                      checked={autoPaySettings[bill.id] ?? false}
                      onCheckedChange={(checked) =>
                        setAutoPaySettings((prev) => ({
                          ...prev,
                          [bill.id]: checked,
                        }))
                      }
                    />
                  </div>
                </div>
              );
            })}
        </CardContent>
      </Card>

      {/* Right: Results */}
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Cash Flow Comparison</span>
              {hasSimulatedShortfall && (
                <Badge variant="destructive">Shortfall Detected</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
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
                    `$${Number(value).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}`
                  }
                />
                <Legend />
                <ReferenceLine
                  y={0}
                  stroke="hsl(0, 84%, 60%)"
                  strokeDasharray="3 3"
                />
                <Area
                  type="monotone"
                  dataKey="current"
                  stroke="hsl(217, 91%, 60%)"
                  fill="hsl(217, 91%, 60%)"
                  fillOpacity={0.1}
                  name="Current Settings"
                />
                <Area
                  type="monotone"
                  dataKey="simulated"
                  stroke="hsl(142, 76%, 36%)"
                  fill="hsl(142, 76%, 36%)"
                  fillOpacity={0.1}
                  name="Simulated"
                  strokeDasharray="5 5"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-green-600">
                Safe to Auto-Pay ({safeBills.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {safeBills.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No bills analyzed as safe yet
                </p>
              ) : (
                <div className="space-y-2">
                  {safeBills.map(({ bill }) => (
                    <div
                      key={bill.id}
                      className="flex justify-between text-sm"
                    >
                      <span>{bill.name}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(bill.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base text-destructive">
                Risky to Auto-Pay ({riskyBills.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {riskyBills.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  All bills are safe to auto-pay!
                </p>
              ) : (
                <div className="space-y-2">
                  {riskyBills.map(({ bill, shortfallDate }) => (
                    <div key={bill.id} className="text-sm">
                      <div className="flex justify-between">
                        <span>{bill.name}</span>
                        <span className="text-muted-foreground">
                          {formatCurrency(bill.amount)}
                        </span>
                      </div>
                      {shortfallDate && (
                        <p className="text-xs text-destructive">
                          Would cause shortfall around {shortfallDate}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
