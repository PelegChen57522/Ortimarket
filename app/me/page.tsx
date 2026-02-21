import { PortfolioPage } from "@/components/markets/portfolio-page";
import { requireSessionUser } from "@/lib/auth";
import { getUserBets } from "@/lib/storage";

export default async function MePage() {
  const username = requireSessionUser();
  const bets = await getUserBets(username);

  return <PortfolioPage username={username} bets={bets} />;
}
