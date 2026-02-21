"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DisplayMarket } from "@/lib/markets";
import { cn } from "@/lib/utils";

type TradePanelProps = {
  market: DisplayMarket;
  compact?: boolean;
};

export function TradePanel({ market, compact = false }: TradePanelProps) {
  const [side, setSide] = useState<"YES" | "NO">("YES");
  const [amount, setAmount] = useState<number>(50);
  const [pendingAction, setPendingAction] = useState<"BUY" | "SELL" | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const currentPrice = side === "YES" ? market.yesPrice : market.noPrice;

  const estimatedPayout = useMemo(() => {
    if (amount <= 0 || currentPrice <= 0) {
      return 0;
    }
    return amount / currentPrice;
  }, [amount, currentPrice]);

  const sideLabels: [string, string] =
    market.type === "twoway" ? market.optionLabels ?? ["Option A", "Option B"] : ["YES", "NO"];
  const selectedSideLabel = side === "YES" ? sideLabels[0] : sideLabels[1];
  const isSubmitting = pendingAction !== null;

  async function submitTrade(action: "BUY" | "SELL") {
    setFeedback(null);

    if (!Number.isFinite(amount) || amount <= 0) {
      setFeedback({ type: "error", message: "Enter a valid amount greater than 0." });
      return;
    }

    setPendingAction(action);

    try {
      const response = await fetch("/api/markets/bet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          marketSlug: market.slug,
          side: selectedSideLabel,
          action,
          amount
        })
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        ok?: boolean;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Failed to place bet.");
      }

      setFeedback({
        type: "success",
        message: `${action} submitted: ${selectedSideLabel} $${amount.toFixed(2)}`
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to place bet."
      });
    } finally {
      setPendingAction(null);
    }
  }

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
        <Button
          className="h-10 bg-foreground text-background hover:bg-foreground/90"
          disabled={isSubmitting}
          onClick={() => submitTrade("BUY")}
        >
          {pendingAction === "BUY" ? "Buying..." : "Buy"}
        </Button>
        <Button
          variant="secondary"
          className="h-10 bg-muted text-foreground"
          disabled={isSubmitting}
          onClick={() => submitTrade("SELL")}
        >
          {pendingAction === "SELL" ? "Selling..." : "Sell"}
        </Button>
      </div>

      {feedback ? (
        <p
          className={cn(
            "mt-3 rounded-md border px-2.5 py-2 text-xs",
            feedback.type === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : "border-destructive/35 bg-destructive/10 text-destructive"
          )}
        >
          {feedback.message}
        </p>
      ) : null}

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Play money mode: bets are saved for your logged-in account only.
      </p>
    </div>
  );
}
