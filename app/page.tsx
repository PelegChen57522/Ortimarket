import { BrowsePage } from "@/components/markets/browse-page";
import { requireSessionUser } from "@/lib/auth";
import { toDisplayMarket } from "@/lib/markets";
import { getLatestImport } from "@/lib/storage";

type HomePageProps = {
  searchParams?: {
    imported?: string;
  };
};

export default async function Home({ searchParams }: HomePageProps) {
  requireSessionUser();

  const latestImport = await getLatestImport();

  const markets = latestImport
    ? latestImport.markets.map((market) => toDisplayMarket(market, latestImport.uploadedAt))
    : [];

  const bannerMessage = searchParams?.imported === "1" ? "Markets generated from your latest upload." : null;

  return <BrowsePage markets={markets} bannerMessage={bannerMessage} />;
}
