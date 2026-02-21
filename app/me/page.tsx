import { PortfolioPage } from "@/components/markets/portfolio-page";
import { requireSessionUser } from "@/lib/auth";

export default function MePage() {
  requireSessionUser();
  return <PortfolioPage />;
}
