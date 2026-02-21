"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Market } from "@/lib/mockMarkets";
import { cn } from "@/lib/utils";

type TradePanelProps = {
  market: Market;
  compact?: boolean;
};

export function TradePanel({ market, compact = false }: TradePanelProps) {
  const [side, setSide] = useState<"YES" | "NO">("YES");
  const [amount, setAmount] = useState<number>(50);

  const currentPrice = side === "YES" ? market.yesPrice : market.noPrice;

  const estimatedPayout = useMemo(() => {
    if (amount <= 0 || currentPrice <= 0) {
      return 0;
    }
    return amount / currentPrice;
  }, [amount, currentPrice]);

  const sideLabels: [string, string] =
    market.type === "twoway" ? market.optionLabels ?? ["Up", "Down"] : ["YES", "NO"];

  return (
    <div className={cn("rounded-xl border border-border/85 bg-card p-4", compact ? "p-3" : "p-4")}>
      <h3 className="text-sm font-semibold text-foreground">Trade</h3>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => setSide("YES")}
          className={cn(
            "h-9 rounded-md border text-sm font-medium transition-colors",
            side === "YES"
              ? "border-emerald-300 bg-emerald-100 text-emerald-900"
              : "border-border bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          )}
        >
          {sideLabels[0]}
        </button>
        <button
          onClick={() => setSide("NO")}
          className={cn(
            "h-9 rounded-md border text-sm font-medium transition-colors",
            side === "NO"
              ? "border-rose-300 bg-rose-100 text-rose-900"
              : "border-border bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          )}
        >
          {sideLabels[1]}
        </button>
      </div>

      <div className="mt-3 space-y-1">
        <label htmlFor="trade-amount" className="text-xs text-muted-foreground">
          Amount
        </label>
        <Input
          id="trade-amount"
          type="number"
          min={1}
          value={amount}
          onChange={(event) => setAmount(Number(event.target.value || 0))}
          className="h-10"
        />
      </div>

      <dl className="mt-3 space-y-2 rounded-md border border-border/70 bg-muted/30 p-3 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Current price</dt>
          <dd className="font-medium text-foreground">{Math.round(currentPrice * 100)}¢</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Implied probability</dt>
          <dd className="font-medium text-foreground">{Math.round(currentPrice * 100)}%</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Est. payout</dt>
          <dd className="font-medium text-foreground">${estimatedPayout.toFixed(2)}</dd>
        </div>
      </dl>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button className="h-10 bg-foreground text-background hover:bg-foreground/90">Buy</Button>
        <Button variant="secondary" className="h-10 bg-muted text-foreground">
          Sell
        </Button>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Play money mode: all fills and balances are simulated for UI prototyping.
      </p>
    </div>
  );
}
