import Link from "next/link";

import { SiteHeader } from "@/components/markets/site-header";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { StoredBet } from "@/lib/storage";

type PortfolioPageProps = {
  username: string;
  bets: StoredBet[];
};

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function PortfolioPage({ username, bets }: PortfolioPageProps) {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5 lg:px-6">
        <div>
          <h1 className="text-2xl font-semibold">Portfolio</h1>
          <p className="text-sm text-muted-foreground">{username}'s play-money bets.</p>
        </div>

        {bets.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
            <h2 className="text-lg font-semibold">No positions yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">Place a bet from any market to see it here.</p>
            <Link href="/" className={`${buttonVariants()} mt-4 inline-flex`}>
              Browse Markets
            </Link>
          </section>
        ) : (
          <section className="rounded-xl border border-border/80 bg-card p-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Est. payout</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bets.map((bet) => (
                  <TableRow key={bet.betId}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(bet.placedAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit"
                      })}
                    </TableCell>
                    <TableCell>
                      <Link href={`/market/${bet.marketSlug}`} className="text-sm font-medium hover:underline">
                        {bet.marketTitle}
                      </Link>
                    </TableCell>
                    <TableCell>{bet.action}</TableCell>
                    <TableCell>{bet.side}</TableCell>
                    <TableCell className="text-right">{formatMoney(bet.amount)}</TableCell>
                    <TableCell className="text-right">{Math.round(bet.price * 100)}%</TableCell>
                    <TableCell className="text-right">{formatMoney(bet.estimatedPayout)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        )}
      </main>
    </div>
  );
}
