"use client";

import { useMemo, useState } from "react";

import { SiteHeader } from "@/components/markets/site-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrencyCompact } from "@/lib/format";
import { positions } from "@/lib/mockMarkets";
import { cn } from "@/lib/utils";

function calculatePnL(position: (typeof positions)[number]) {
  if (position.side === "YES") {
    return (position.currentPrice - position.entryPrice) * position.stake;
  }
  return (position.entryPrice - position.currentPrice) * position.stake;
}

function markToMarket(position: (typeof positions)[number]) {
  const probability = position.side === "YES" ? position.currentPrice : 1 - position.currentPrice;
  return position.stake * probability;
}

export function PortfolioPage() {
  const [statusFilter, setStatusFilter] = useState<"active" | "resolved">("active");

  const filtered = useMemo(
    () => positions.filter((position) => position.status === statusFilter),
    [statusFilter]
  );

  const openPositions = useMemo(() => positions.filter((position) => position.status === "active").length, []);

  const portfolioValue = useMemo(() => {
    return positions.reduce((total, position) => total + markToMarket(position), 0);
  }, []);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5 lg:px-6">
        <div>
          <h1 className="text-2xl font-semibold">Portfolio</h1>
          <p className="text-sm text-muted-foreground">Track open and resolved play-money positions.</p>
        </div>

        <section className="grid gap-3 sm:grid-cols-2">
          <Card className="border-border/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Portfolio value</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{formatCurrencyCompact(portfolioValue)}</p>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Open positions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{openPositions}</p>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-2xl border border-border/75 bg-card p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Positions</h2>
            <div className="flex rounded-full border border-border/80 bg-muted/35 p-1 text-sm">
              <button
                className={cn(
                  "rounded-full px-3 py-1 transition-colors",
                  statusFilter === "active" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                )}
                onClick={() => setStatusFilter("active")}
              >
                Active
              </button>
              <button
                className={cn(
                  "rounded-full px-3 py-1 transition-colors",
                  statusFilter === "resolved" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                )}
                onClick={() => setStatusFilter("resolved")}
              >
                Resolved
              </button>
            </div>
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Market</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead>Current</TableHead>
                  <TableHead className="text-right">P/L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((position) => {
                  const pnl = calculatePnL(position);
                  return (
                    <TableRow key={position.id}>
                      <TableCell className="font-medium">{position.marketTitle}</TableCell>
                      <TableCell>
                        <Badge variant={position.side === "YES" ? "new" : "live"}>{position.side}</Badge>
                      </TableCell>
                      <TableCell>{Math.round(position.entryPrice * 100)}¢</TableCell>
                      <TableCell>{Math.round(position.currentPrice * 100)}¢</TableCell>
                      <TableCell className={cn("text-right font-semibold", pnl >= 0 ? "text-emerald-700" : "text-rose-700")}>
                        {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-2 md:hidden">
            {filtered.map((position) => {
              const pnl = calculatePnL(position);
              return (
                <div key={position.id} className="rounded-xl border border-border/70 bg-muted/35 p-3">
                  <p className="text-sm font-medium leading-snug">{position.marketTitle}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{position.side}</span>
                    <span>
                      {Math.round(position.entryPrice * 100)}¢ → {Math.round(position.currentPrice * 100)}¢
                    </span>
                    <span className={cn("font-semibold", pnl >= 0 ? "text-emerald-700" : "text-rose-700")}>
                      {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
