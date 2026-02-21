export type MarketType = "yesno" | "twoway";

export type Market = {
  slug: string;
  title: string;
  subtitle?: string;
  category: "sports" | "tech" | "ai" | "crypto" | "earnings" | "culture";
  yesPrice: number;
  noPrice: number;
  volume24h: number;
  closesAt: string;
  isActive: boolean;
  isLive?: boolean;
  isNew?: boolean;
  type: MarketType;
  optionLabels?: [string, string];
  topics: string[];
};

export type TradeActivity = {
  id: string;
  side: "YES" | "NO";
  amount: number;
  price: number;
  time: string;
};

export type Position = {
  id: string;
  marketSlug: string;
  marketTitle: string;
  side: "YES" | "NO";
  entryPrice: number;
  currentPrice: number;
  stake: number;
  status: "active" | "resolved";
};

export const browseTabs = [
  "New",
  "Trending",
  "Popular",
  "Liquid",
  "Ending Soon",
  "Competitive"
] as const;

export const topicChips = ["All", "Friends", "Tonight", "Weekend", "Sports", "Tech", "AI"] as const;

export const markets: Market[] = [
  {
    slug: "apple-vision-lite-announced-2026",
    title: "Will Apple announce a lower-cost Vision headset in 2026?",
    subtitle: "WWDC speculation across hardware blogs",
    category: "tech",
    yesPrice: 0.44,
    noPrice: 0.56,
    volume24h: 182000,
    closesAt: "2026-06-08T19:00:00.000Z",
    isActive: true,
    isNew: true,
    type: "yesno",
    topics: ["Tech", "Friends"]
  },
  {
    slug: "ai-model-open-weights-q3",
    title: "Will a top-5 AI lab release open weights before Q3?",
    category: "ai",
    yesPrice: 0.39,
    noPrice: 0.61,
    volume24h: 261000,
    closesAt: "2026-07-01T00:00:00.000Z",
    isActive: true,
    type: "yesno",
    topics: ["AI", "Tech"]
  },
  {
    slug: "btc-over-90k-this-weekend",
    title: "Bitcoin over $90k by this weekend close?",
    subtitle: "Spot market across top exchanges",
    category: "crypto",
    yesPrice: 0.33,
    noPrice: 0.67,
    volume24h: 890000,
    closesAt: "2026-02-23T00:00:00.000Z",
    isActive: true,
    isLive: true,
    type: "yesno",
    topics: ["Weekend", "Tonight"]
  },
  {
    slug: "sp500-up-down-friday-close",
    title: "S&P 500 at Friday close",
    category: "tech",
    yesPrice: 0.54,
    noPrice: 0.46,
    volume24h: 431000,
    closesAt: "2026-02-27T21:00:00.000Z",
    isActive: true,
    isLive: true,
    type: "twoway",
    optionLabels: ["Up", "Down"],
    topics: ["Tonight", "Friends"]
  },
  {
    slug: "nba-finals-game1-over-under",
    title: "NBA Finals Game 1 total points",
    subtitle: "Consensus line 216.5",
    category: "sports",
    yesPrice: 0.48,
    noPrice: 0.52,
    volume24h: 355000,
    closesAt: "2026-06-10T23:30:00.000Z",
    isActive: true,
    type: "twoway",
    optionLabels: ["Over", "Under"],
    topics: ["Sports", "Tonight"]
  },
  {
    slug: "movie-opens-150m",
    title: "Will a film open above $150M domestic this month?",
    category: "culture",
    yesPrice: 0.27,
    noPrice: 0.73,
    volume24h: 97000,
    closesAt: "2026-03-31T23:59:59.000Z",
    isActive: true,
    type: "yesno",
    topics: ["Weekend", "Friends"]
  },
  {
    slug: "ai-chip-launch-before-july",
    title: "Will a new AI inference chip ship before July?",
    category: "ai",
    yesPrice: 0.61,
    noPrice: 0.39,
    volume24h: 224000,
    closesAt: "2026-06-30T23:00:00.000Z",
    isActive: true,
    isNew: true,
    type: "yesno",
    topics: ["AI", "Tech"]
  },
  {
    slug: "tesla-next-earnings-beat",
    title: "Tesla next earnings beat consensus EPS?",
    category: "earnings",
    yesPrice: 0.45,
    noPrice: 0.55,
    volume24h: 524000,
    closesAt: "2026-04-23T20:00:00.000Z",
    isActive: true,
    type: "yesno",
    topics: ["Tech", "Tonight"]
  },
  {
    slug: "meta-next-earnings-beat",
    title: "Meta next earnings beat consensus EPS?",
    category: "earnings",
    yesPrice: 0.63,
    noPrice: 0.37,
    volume24h: 463000,
    closesAt: "2026-04-29T20:00:00.000Z",
    isActive: true,
    type: "yesno",
    topics: ["Tech"]
  },
  {
    slug: "openai-gpt6-public-preview-2026",
    title: "Will GPT-6 have a public preview in 2026?",
    category: "ai",
    yesPrice: 0.58,
    noPrice: 0.42,
    volume24h: 710000,
    closesAt: "2026-12-31T23:59:59.000Z",
    isActive: true,
    type: "yesno",
    topics: ["AI", "Tech", "Friends"]
  },
  {
    slug: "fed-no-rate-cut-next-meeting",
    title: "Fed holds rates at next meeting?",
    category: "tech",
    yesPrice: 0.68,
    noPrice: 0.32,
    volume24h: 340000,
    closesAt: "2026-03-18T18:00:00.000Z",
    isActive: true,
    type: "yesno",
    topics: ["Tonight", "Friends"]
  },
  {
    slug: "ethereum-etf-net-inflows-week",
    title: "Ethereum ETFs net inflows this week?",
    category: "crypto",
    yesPrice: 0.52,
    noPrice: 0.48,
    volume24h: 280000,
    closesAt: "2026-02-27T21:00:00.000Z",
    isActive: true,
    type: "yesno",
    topics: ["Weekend", "Tonight"]
  },
  {
    slug: "mlb-opening-day-rainout",
    title: "At least one MLB opening day rainout?",
    category: "sports",
    yesPrice: 0.35,
    noPrice: 0.65,
    volume24h: 151000,
    closesAt: "2026-03-26T16:00:00.000Z",
    isActive: true,
    isNew: true,
    type: "yesno",
    topics: ["Sports", "Weekend"]
  },
  {
    slug: "nvidia-close-up-down-today",
    title: "NVIDIA at market close today",
    category: "tech",
    yesPrice: 0.57,
    noPrice: 0.43,
    volume24h: 602000,
    closesAt: "2026-02-21T21:00:00.000Z",
    isActive: true,
    isLive: true,
    type: "twoway",
    optionLabels: ["Up", "Down"],
    topics: ["Tonight", "Tech"]
  },
  {
    slug: "friends-trip-booked-before-may",
    title: "Will your group book a weekend trip before May?",
    category: "culture",
    yesPrice: 0.71,
    noPrice: 0.29,
    volume24h: 31000,
    closesAt: "2026-05-01T00:00:00.000Z",
    isActive: true,
    type: "yesno",
    topics: ["Friends", "Weekend"]
  },
  {
    slug: "major-cloud-outage-q2",
    title: "Major cloud outage in Q2 lasting over 2 hours?",
    category: "tech",
    yesPrice: 0.22,
    noPrice: 0.78,
    volume24h: 86000,
    closesAt: "2026-06-30T23:59:59.000Z",
    isActive: true,
    type: "yesno",
    topics: ["Tech", "AI"]
  },
  {
    slug: "top-ai-app-10m-dau",
    title: "Will any AI app exceed 10M DAU this quarter?",
    category: "ai",
    yesPrice: 0.49,
    noPrice: 0.51,
    volume24h: 193000,
    closesAt: "2026-03-31T23:59:59.000Z",
    isActive: true,
    type: "yesno",
    topics: ["AI", "Tech"]
  },
  {
    slug: "champions-league-final-over-under",
    title: "Champions League final total goals",
    category: "sports",
    yesPrice: 0.41,
    noPrice: 0.59,
    volume24h: 412000,
    closesAt: "2026-05-30T20:00:00.000Z",
    isActive: true,
    type: "twoway",
    optionLabels: ["Over 2.5", "Under 2.5"],
    topics: ["Sports", "Weekend"]
  },
  {
    slug: "btc-dominance-over-55",
    title: "Bitcoin dominance over 55% this month?",
    category: "crypto",
    yesPrice: 0.37,
    noPrice: 0.63,
    volume24h: 142000,
    closesAt: "2026-02-28T23:59:59.000Z",
    isActive: true,
    type: "yesno",
    topics: ["Crypto", "Weekend"]
  },
  {
    slug: "open-source-agent-1m-stars",
    title: "Any open-source agent repo hits 1M stars by year-end?",
    category: "ai",
    yesPrice: 0.11,
    noPrice: 0.89,
    volume24h: 54000,
    closesAt: "2026-12-31T23:59:59.000Z",
    isActive: true,
    type: "yesno",
    topics: ["AI", "Tech"]
  },
  {
    slug: "google-q2-earnings-beat",
    title: "Google Q2 earnings beat consensus?",
    category: "earnings",
    yesPrice: 0.59,
    noPrice: 0.41,
    volume24h: 470000,
    closesAt: "2026-07-22T20:00:00.000Z",
    isActive: true,
    type: "yesno",
    topics: ["Tech"]
  },
  {
    slug: "microsoft-q2-earnings-beat",
    title: "Microsoft Q2 earnings beat consensus?",
    category: "earnings",
    yesPrice: 0.66,
    noPrice: 0.34,
    volume24h: 508000,
    closesAt: "2026-07-28T20:00:00.000Z",
    isActive: true,
    type: "yesno",
    topics: ["Tech", "AI"]
  },
  {
    slug: "xai-model-ranks-top3",
    title: "Will xAI publish a model ranking top-3 on public benchmarks?",
    category: "ai",
    yesPrice: 0.46,
    noPrice: 0.54,
    volume24h: 315000,
    closesAt: "2026-09-15T00:00:00.000Z",
    isActive: true,
    type: "yesno",
    topics: ["AI", "Friends"]
  },
  {
    slug: "weekend-box-office-over-140m",
    title: "US weekend box office over $140M?",
    category: "culture",
    yesPrice: 0.53,
    noPrice: 0.47,
    volume24h: 76000,
    closesAt: "2026-02-23T03:00:00.000Z",
    isActive: true,
    isLive: true,
    type: "yesno",
    topics: ["Weekend", "Tonight"]
  },
  {
    slug: "friend-runs-half-marathon",
    title: "Will a friend complete a half marathon this spring?",
    category: "culture",
    yesPrice: 0.62,
    noPrice: 0.38,
    volume24h: 24000,
    closesAt: "2026-05-30T17:00:00.000Z",
    isActive: true,
    type: "yesno",
    topics: ["Friends", "Weekend"]
  },
  {
    slug: "nfl-draft-qb-first",
    title: "Will a QB be selected first in the draft?",
    category: "sports",
    yesPrice: 0.74,
    noPrice: 0.26,
    volume24h: 390000,
    closesAt: "2026-04-24T01:00:00.000Z",
    isActive: true,
    type: "yesno",
    topics: ["Sports"]
  },
  {
    slug: "gpu-prices-drop-10",
    title: "Will gaming GPU prices drop 10% by summer?",
    category: "tech",
    yesPrice: 0.28,
    noPrice: 0.72,
    volume24h: 99000,
    closesAt: "2026-06-01T00:00:00.000Z",
    isActive: true,
    type: "yesno",
    topics: ["Tech", "AI"]
  },
  {
    slug: "ai-regulation-bill-passes-house",
    title: "Will a major AI regulation bill pass the House in 2026?",
    category: "ai",
    yesPrice: 0.31,
    noPrice: 0.69,
    volume24h: 228000,
    closesAt: "2026-11-15T00:00:00.000Z",
    isActive: true,
    type: "yesno",
    topics: ["AI", "Tech"]
  },
  {
    slug: "solana-over-250-month-end",
    title: "Solana over $250 by month end?",
    category: "crypto",
    yesPrice: 0.29,
    noPrice: 0.71,
    volume24h: 365000,
    closesAt: "2026-02-28T23:59:59.000Z",
    isActive: true,
    type: "yesno",
    topics: ["Crypto", "Weekend"]
  },
  {
    slug: "rain-in-sf-tonight",
    title: "Rain in San Francisco tonight?",
    category: "culture",
    yesPrice: 0.64,
    noPrice: 0.36,
    volume24h: 58000,
    closesAt: "2026-02-22T07:00:00.000Z",
    isActive: true,
    isLive: true,
    type: "yesno",
    topics: ["Tonight", "Friends"]
  },
  {
    slug: "chipmaker-ipo-q4",
    title: "Will a top private chipmaker file IPO in Q4?",
    category: "tech",
    yesPrice: 0.26,
    noPrice: 0.74,
    volume24h: 121000,
    closesAt: "2026-10-01T00:00:00.000Z",
    isActive: true,
    type: "yesno",
    topics: ["Tech", "AI"]
  },
  {
    slug: "startup-valued-over-100b-2026",
    title: "Any startup valued above $100B in 2026?",
    category: "tech",
    yesPrice: 0.42,
    noPrice: 0.58,
    volume24h: 176000,
    closesAt: "2026-12-31T23:59:59.000Z",
    isActive: true,
    type: "yesno",
    topics: ["Tech", "Friends"]
  },
  {
    slug: "world-cup-2026-over-under-goals",
    title: "World Cup opening match total goals",
    category: "sports",
    yesPrice: 0.47,
    noPrice: 0.53,
    volume24h: 448000,
    closesAt: "2026-06-11T19:00:00.000Z",
    isActive: false,
    type: "twoway",
    optionLabels: ["Over 2.5", "Under 2.5"],
    topics: ["Sports"]
  }
];

export const positions: Position[] = [
  {
    id: "pos-1",
    marketSlug: "openai-gpt6-public-preview-2026",
    marketTitle: "Will GPT-6 have a public preview in 2026?",
    side: "YES",
    entryPrice: 0.51,
    currentPrice: 0.58,
    stake: 1400,
    status: "active"
  },
  {
    id: "pos-2",
    marketSlug: "btc-over-90k-this-weekend",
    marketTitle: "Bitcoin over $90k by this weekend close?",
    side: "NO",
    entryPrice: 0.59,
    currentPrice: 0.67,
    stake: 850,
    status: "active"
  },
  {
    id: "pos-3",
    marketSlug: "fed-no-rate-cut-next-meeting",
    marketTitle: "Fed holds rates at next meeting?",
    side: "YES",
    entryPrice: 0.62,
    currentPrice: 0.68,
    stake: 2100,
    status: "active"
  },
  {
    id: "pos-4",
    marketSlug: "friends-trip-booked-before-may",
    marketTitle: "Will your group book a weekend trip before May?",
    side: "YES",
    entryPrice: 0.69,
    currentPrice: 0.71,
    stake: 220,
    status: "resolved"
  },
  {
    id: "pos-5",
    marketSlug: "major-cloud-outage-q2",
    marketTitle: "Major cloud outage in Q2 lasting over 2 hours?",
    side: "NO",
    entryPrice: 0.71,
    currentPrice: 0.78,
    stake: 980,
    status: "active"
  }
];

const baseActivity: Omit<TradeActivity, "id" | "price">[] = [
  { side: "YES", amount: 320, time: "2m ago" },
  { side: "NO", amount: 180, time: "8m ago" },
  { side: "YES", amount: 760, time: "16m ago" },
  { side: "NO", amount: 110, time: "25m ago" },
  { side: "YES", amount: 95, time: "41m ago" }
];

export function getMarketBySlug(slug: string): Market | undefined {
  return markets.find((market) => market.slug === slug);
}

export function getRelatedMarkets(slug: string, limit = 4): Market[] {
  const current = getMarketBySlug(slug);
  if (!current) {
    return markets.slice(0, limit);
  }

  return markets
    .filter((market) => market.slug !== slug && market.category === current.category)
    .slice(0, limit);
}

export function getActivityForMarket(slug: string): TradeActivity[] {
  const market = getMarketBySlug(slug);
  const price = market?.yesPrice ?? 0.5;

  return baseActivity.map((trade, index) => ({
    ...trade,
    id: `${slug}-${index}`,
    price: Number(Math.min(0.95, Math.max(0.05, price + (index - 2) * 0.02)).toFixed(2))
  }));
}

export function getChartSeries(basePrice: number) {
  const labels = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"];
  return labels.map((label, index) => {
    const drift = Math.sin(index * 0.8) * 0.03;
    return {
      time: label,
      price: Number(Math.min(0.93, Math.max(0.08, basePrice + drift - 0.02 + index * 0.004)).toFixed(2))
    };
  });
}
