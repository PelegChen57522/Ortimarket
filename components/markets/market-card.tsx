import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrencyCompact, formatDateChip, formatPercentFromPrice } from "@/lib/format";
import { Market } from "@/lib/mockMarkets";
import { cn } from "@/lib/utils";

const gradients = [
  "from-sky-200/75 via-indigo-100 to-cyan-100",
  "from-emerald-200/75 via-teal-100 to-cyan-100",
  "from-violet-200/75 via-fuchsia-100 to-rose-100",
  "from-amber-200/75 via-orange-100 to-yellow-100",
  "from-blue-200/75 via-slate-100 to-indigo-100"
];

function hashString(value: string) {
  return Array.from(value).reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

type MarketCardProps = {
  market: Market;
  compact?: boolean;
};

export function MarketCard({ market, compact = false }: MarketCardProps) {
  const firstLabel = market.type === "twoway" ? market.optionLabels?.[0] ?? "Up" : "YES";
  const secondLabel = market.type === "twoway" ? market.optionLabels?.[1] ?? "Down" : "NO";
  const gradient = gradients[hashString(market.slug) % gradients.length];
  const firstPrice = market.yesPrice;
  const secondPrice = market.noPrice;

  return (
    <article
      className={cn(
        "group rounded-xl border border-border/85 bg-card p-3 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-card",
        compact && "p-2"
      )}
    >
      <div className="space-y-2.5">
        <div className="flex items-start gap-3">
          <div className={cn("shrink-0 rounded-lg bg-gradient-to-br", gradient, compact ? "h-10 w-10" : "h-11 w-11")} />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-start justify-between gap-2">
              <span className="rounded-full border border-border/80 bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {formatDateChip(market.closesAt)}
              </span>
              <div className="flex items-center gap-1">
                {market.isNew ? <Badge variant="new">NEW</Badge> : null}
                {market.isLive ? <Badge variant="live">LIVE</Badge> : null}
              </div>
            </div>
            <Link
              href={`/market/${market.slug}`}
              className="line-clamp-2 text-sm font-medium leading-snug text-foreground hover:text-primary"
            >
              {market.title}
            </Link>
          </div>
        </div>

        {market.subtitle ? <p className="line-clamp-1 text-[12px] text-muted-foreground">{market.subtitle}</p> : null}

        <div className="flex items-end justify-between rounded-lg border border-border/80 bg-muted/35 px-3 py-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Chance</p>
            <p className="mt-1 text-2xl font-semibold leading-none text-foreground">{formatPercentFromPrice(market.yesPrice)}</p>
          </div>
          <p className="text-xs text-muted-foreground">{formatCurrencyCompact(market.volume24h)} Vol.</p>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <Button
            variant="outline"
            className="h-8 justify-between border-emerald-200 bg-emerald-50/70 px-2.5 text-emerald-800 transition-colors hover:bg-emerald-100 group-hover:border-emerald-300"
          >
            <span className="text-xs font-semibold">{firstLabel}</span>
            <span className="text-xs">{Math.round(firstPrice * 100)}¢</span>
          </Button>
          <Button
            variant="outline"
            className="h-8 justify-between border-rose-200 bg-rose-50/70 px-2.5 text-rose-800 transition-colors hover:bg-rose-100 group-hover:border-rose-300"
          >
            <span className="text-xs font-semibold">{secondLabel}</span>
            <span className="text-xs">{Math.round(secondPrice * 100)}¢</span>
          </Button>
        </div>
      </div>

      <footer className="mt-2.5 flex items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
        <span className="capitalize">{market.category}</span>
        <Link href={`/market/${market.slug}`} className="font-medium text-primary hover:underline">
          Open market
        </Link>
      </footer>
    </article>
  );
}
