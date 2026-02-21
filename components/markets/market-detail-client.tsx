"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { MarketCard } from "@/components/markets/market-card";
import { SiteHeader } from "@/components/markets/site-header";
import { TradePanel } from "@/components/markets/trade-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrencyCompact, formatDateTime } from "@/lib/format";
import { getActivityForMarket, getChartSeries, Market } from "@/lib/mockMarkets";

type MarketDetailClientProps = {
  market: Market;
  related: Market[];
};

export function MarketDetailClient({ market, related }: MarketDetailClientProps) {
  const [mobileTradeOpen, setMobileTradeOpen] = useState(false);

  const chartData = useMemo(() => getChartSeries(market.yesPrice), [market.yesPrice]);
  const activity = useMemo(() => getActivityForMarket(market.slug), [market.slug]);

  return (
    <div className="min-h-screen pb-24 lg:pb-0">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-5 lg:px-6">
        <div className="mb-4 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Browse
          </Link>
          <span className="px-2">/</span>
          <span>{market.category}</span>
        </div>

        <div className="mb-5 rounded-xl border border-border/80 bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="capitalize">
              {market.category}
            </Badge>
            {market.isLive ? <Badge variant="live">LIVE</Badge> : null}
            {market.isNew ? <Badge variant="new">NEW</Badge> : null}
            <span className="text-xs text-muted-foreground">Closes {formatDateTime(market.closesAt)}</span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold leading-tight text-foreground md:text-3xl">{market.title}</h1>
          {market.subtitle ? <p className="mt-2 text-sm text-muted-foreground">{market.subtitle}</p> : null}
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <Tabs defaultValue="chart">
              <TabsList className="h-auto w-full justify-start gap-1 rounded-xl bg-muted/70 p-1">
                <TabsTrigger value="trade">Trade</TabsTrigger>
                <TabsTrigger value="chart">Chart</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="rules">Rules</TabsTrigger>
              </TabsList>

              <TabsContent value="trade">
                <div className="rounded-xl border border-border/80 bg-card p-4">
                  <h2 className="text-lg font-semibold">Trade Snapshot</h2>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-border/70 bg-muted/35 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Yes price</p>
                      <p className="mt-1 text-xl font-semibold">{Math.round(market.yesPrice * 100)}¢</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-muted/35 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">No price</p>
                      <p className="mt-1 text-xl font-semibold">{Math.round(market.noPrice * 100)}¢</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-muted/35 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">24h volume</p>
                      <p className="mt-1 text-xl font-semibold">{formatCurrencyCompact(market.volume24h)}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="chart">
                <div className="rounded-xl border border-border/80 bg-card p-4">
                  <h2 className="mb-3 text-lg font-semibold">Price chart</h2>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <YAxis
                          domain={[0, 1]}
                          tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`}
                          tickLine={false}
                          axisLine={false}
                          width={40}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        />
                        <Tooltip
                          formatter={(value) => `${Math.round(Number(value) * 100)}%`}
                          contentStyle={{
                            borderRadius: "12px",
                            border: "1px solid hsl(var(--border))",
                            background: "hsl(var(--card))"
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke="hsl(var(--chart-1))"
                          strokeWidth={2.5}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="activity">
                <div className="rounded-xl border border-border/80 bg-card p-4">
                  <h2 className="mb-3 text-lg font-semibold">Recent trades</h2>
                  <ul className="space-y-2">
                    {activity.map((trade) => (
                      <li
                        key={trade.id}
                        className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/35 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {trade.side} <span className="text-muted-foreground">{trade.time}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">{Math.round(trade.price * 100)}¢</p>
                        </div>
                        <p className="text-sm font-semibold">${trade.amount}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="rules">
                <div className="rounded-xl border border-border/80 bg-card p-4">
                  <h2 className="mb-3 text-lg font-semibold">Rules</h2>
                  <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                    <p>
                      This market resolves to <strong className="text-foreground">Yes</strong> if the event in the title occurs by
                      the close time shown above. Resolution source is a public, widely accepted primary report.
                    </p>
                    <p>
                      If the outcome cannot be determined unambiguously by deadline, the market may be extended to allow
                      additional reporting confirmation.
                    </p>
                    <p>
                      Trades, fills, and balances in this prototype are mock interactions for UI testing and do not execute real
                      orders.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <section className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Related markets</h2>
                <Link href="/" className="text-sm text-primary hover:underline">
                  View all
                </Link>
              </div>
              <div className="market-grid grid gap-3">
                {related.map((item) => (
                  <MarketCard key={item.slug} market={item} compact />
                ))}
              </div>
            </section>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <TradePanel market={market} />
            </div>
          </aside>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/80 bg-background/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Current Yes price</p>
            <p className="text-base font-semibold">{Math.round(market.yesPrice * 100)}¢</p>
          </div>
          <Button onClick={() => setMobileTradeOpen(true)} className="h-10 min-w-28 rounded-full">
            Open Trade
          </Button>
        </div>
      </div>

      {mobileTradeOpen ? (
        <div className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm lg:hidden">
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border border-border bg-background p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Trade panel</h3>
              <Button variant="ghost" size="sm" onClick={() => setMobileTradeOpen(false)}>
                Close
              </Button>
            </div>
            <TradePanel market={market} compact />
          </div>
        </div>
      ) : null}
    </div>
  );
}
