import { notFound } from "next/navigation";

import { MarketDetailClient } from "@/components/markets/market-detail-client";
import { getMarketBySlug, getRelatedMarkets } from "@/lib/mockMarkets";

type MarketPageProps = {
  params: {
    slug: string;
  };
};

export default function MarketPage({ params }: MarketPageProps) {
  const market = getMarketBySlug(params.slug);

  if (!market) {
    notFound();
  }

  const related = getRelatedMarkets(params.slug);

  return <MarketDetailClient market={market} related={related} />;
}
