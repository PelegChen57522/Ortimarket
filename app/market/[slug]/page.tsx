import { notFound } from "next/navigation";

import { MarketDetailClient } from "@/components/markets/market-detail-client";
import { requireSessionUser } from "@/lib/auth";
import { toDisplayMarket } from "@/lib/markets";
import { getLatestImport, getMarketBySlug } from "@/lib/storage";

type MarketPageProps = {
  params: {
    slug: string;
  };
};

export default async function MarketPage({ params }: MarketPageProps) {
  requireSessionUser();

  const latestImport = await getLatestImport();

  if (!latestImport) {
    notFound();
  }

  const found = await getMarketBySlug(params.slug, latestImport.importId);

  if (!found) {
    notFound();
  }

  const market = toDisplayMarket(found.market, latestImport.uploadedAt);
  const related = latestImport.markets
    .filter((entry) => entry.slug !== params.slug && entry.category === found.market.category)
    .slice(0, 4)
    .map((entry) => toDisplayMarket(entry, latestImport.uploadedAt));

  return <MarketDetailClient market={market} related={related} />;
}
