"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { MarketCard } from "@/components/markets/market-card";
import { MarketCardSkeleton } from "@/components/markets/market-card-skeleton";
import { SiteHeader } from "@/components/markets/site-header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { formatCurrencyCompact } from "@/lib/format";
import { browseTabs, markets, topicChips } from "@/lib/mockMarkets";
import { cn } from "@/lib/utils";

const sortOptions = ["24h Volume", "Newest", "Closing soon"] as const;

type BrowseTab = (typeof browseTabs)[number];
type SortOption = (typeof sortOptions)[number];

function tabComparator(tab: BrowseTab) {
  return (a: (typeof markets)[number], b: (typeof markets)[number]) => {
    if (tab === "New") {
      return Number(b.isNew) - Number(a.isNew) || +new Date(b.closesAt) - +new Date(a.closesAt);
    }

    if (tab === "Trending") {
      const trendA = a.volume24h * (a.isLive ? 1.2 : 1) * (a.isNew ? 1.1 : 1);
      const trendB = b.volume24h * (b.isLive ? 1.2 : 1) * (b.isNew ? 1.1 : 1);
      return trendB - trendA;
    }

    if (tab === "Popular") {
      return b.volume24h - a.volume24h;
    }

    if (tab === "Liquid") {
      return Math.abs(a.yesPrice - 0.5) - Math.abs(b.yesPrice - 0.5) || b.volume24h - a.volume24h;
    }

    if (tab === "Ending Soon") {
      return +new Date(a.closesAt) - +new Date(b.closesAt);
    }

    return Math.abs(a.yesPrice - 0.5) - Math.abs(b.yesPrice - 0.5) || b.volume24h - a.volume24h;
  };
}

function sortComparator(sortBy: SortOption) {
  if (sortBy === "Newest") {
    return (a: (typeof markets)[number], b: (typeof markets)[number]) =>
      Number(b.isNew) - Number(a.isNew) || +new Date(b.closesAt) - +new Date(a.closesAt);
  }

  if (sortBy === "Closing soon") {
    return (a: (typeof markets)[number], b: (typeof markets)[number]) => +new Date(a.closesAt) - +new Date(b.closesAt);
  }

  return (a: (typeof markets)[number], b: (typeof markets)[number]) => b.volume24h - a.volume24h;
}

export function BrowsePage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<BrowseTab>("Trending");
  const [activeTopic, setActiveTopic] = useState<(typeof topicChips)[number]>("All");
  const [sortBy, setSortBy] = useState<SortOption>("24h Volume");
  const [activeOnly, setActiveOnly] = useState(true);
  const [hideSports, setHideSports] = useState(false);
  const [hideCrypto, setHideCrypto] = useState(false);
  const [hideEarnings, setHideEarnings] = useState(false);
  const [minVolume, setMinVolume] = useState([0]);
  const [isLoading, setIsLoading] = useState(true);
  const firstLoad = useRef(true);

  const filteredAndSorted = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = markets.filter((market) => {
      if (activeOnly && !market.isActive) {
        return false;
      }

      if (hideSports && market.category === "sports") {
        return false;
      }

      if (hideCrypto && market.category === "crypto") {
        return false;
      }

      if (hideEarnings && market.category === "earnings") {
        return false;
      }

      if (market.volume24h < minVolume[0]) {
        return false;
      }

      if (activeTopic !== "All" && !market.topics.some((topic) => topic.toLowerCase() === activeTopic.toLowerCase())) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        market.title,
        market.subtitle,
        market.category,
        market.topics.join(" "),
        market.slug.replaceAll("-", " ")
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });

    const byTab = tabComparator(activeTab);
    const bySort = sortComparator(sortBy);

    return filtered.sort((a, b) => byTab(a, b) || bySort(a, b));
  }, [activeOnly, activeTab, activeTopic, hideCrypto, hideEarnings, hideSports, minVolume, search, sortBy]);

  useEffect(() => {
    setIsLoading(true);
    const timeout = setTimeout(
      () => {
        setIsLoading(false);
        firstLoad.current = false;
      },
      firstLoad.current ? 700 : 180
    );
    return () => clearTimeout(timeout);
  }, [activeOnly, activeTab, activeTopic, hideCrypto, hideEarnings, hideSports, minVolume, search, sortBy]);

  const resetFilters = () => {
    setSearch("");
    setActiveTab("Trending");
    setActiveTopic("All");
    setSortBy("24h Volume");
    setActiveOnly(true);
    setHideSports(false);
    setHideCrypto(false);
    setHideEarnings(false);
    setMinVolume([0]);
  };

  return (
    <div className="min-h-screen">
      <SiteHeader searchValue={search} onSearchChange={setSearch} />

      <main className="mx-auto max-w-7xl space-y-3 px-4 py-3 lg:px-6">
        <section className="-mx-1 flex gap-4 overflow-x-auto border-b border-border/80 px-1 pb-2">
          {browseTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "whitespace-nowrap border-b-2 px-0.5 pb-2 text-sm font-medium transition-colors",
                activeTab === tab
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </section>

        <section className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1">
          {topicChips.map((chip) => (
            <button
              key={chip}
              onClick={() => setActiveTopic(chip)}
              className={cn(
                "whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                activeTopic === chip
                  ? "border-slate-300 bg-slate-100 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {chip}
            </button>
          ))}
        </section>

        <section className="rounded-xl border border-border/80 bg-card p-3">
          <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Sort by</p>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              <label className="flex items-center justify-between gap-2 rounded-md border border-border/70 bg-muted/30 px-2.5 py-2 text-sm">
                Active only
                <Switch checked={activeOnly} onCheckedChange={setActiveOnly} />
              </label>
              <label className="flex items-center justify-between gap-2 rounded-md border border-border/70 bg-muted/30 px-2.5 py-2 text-sm">
                Hide sports
                <Switch checked={hideSports} onCheckedChange={setHideSports} />
              </label>
              <label className="flex items-center justify-between gap-2 rounded-md border border-border/70 bg-muted/30 px-2.5 py-2 text-sm">
                Hide crypto
                <Switch checked={hideCrypto} onCheckedChange={setHideCrypto} />
              </label>
              <label className="flex items-center justify-between gap-2 rounded-md border border-border/70 bg-muted/30 px-2.5 py-2 text-sm">
                Hide earnings
                <Switch checked={hideEarnings} onCheckedChange={setHideEarnings} />
              </label>
              <div className="rounded-md border border-border/70 bg-muted/30 px-2.5 py-2">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>Min 24h volume</span>
                  <span className="text-xs text-muted-foreground">{formatCurrencyCompact(minVolume[0])}</span>
                </div>
                <Slider
                  value={minVolume}
                  onValueChange={setMinVolume}
                  max={900000}
                  step={10000}
                  className="mt-2"
                  aria-label="Minimum volume"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="pb-8 pt-1">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-sm font-medium text-muted-foreground">Markets</h1>
            <p className="text-sm text-muted-foreground">{filteredAndSorted.length} shown</p>
          </div>

          {isLoading ? (
            <div className="market-grid grid gap-3 sm:gap-4">
              {Array.from({ length: 10 }).map((_, index) => (
                <MarketCardSkeleton key={`skeleton-${index}`} />
              ))}
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
              <h2 className="text-lg font-semibold">No markets match these filters</h2>
              <p className="mt-2 text-sm text-muted-foreground">Try widening topic/category filters or reducing min volume.</p>
              <Button variant="outline" className="mt-4" onClick={resetFilters}>
                Reset filters
              </Button>
            </div>
          ) : (
            <div className="market-grid grid gap-3 sm:gap-4">
              {filteredAndSorted.map((market) => (
                <MarketCard key={market.slug} market={market} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
