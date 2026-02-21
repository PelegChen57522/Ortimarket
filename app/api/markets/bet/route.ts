import { NextResponse } from "next/server";
import { z } from "next/dist/compiled/zod";

import { getSessionUserFromRequest, isAllowedOrigin } from "@/lib/auth";
import { getLatestImport, saveUserBet } from "@/lib/storage";

export const runtime = "nodejs";

const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

const betRequestSchema = z.object({
  marketSlug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
  side: z.string().min(1).max(160),
  action: z.enum(["BUY", "SELL"]),
  amount: z.number().finite().positive().max(100_000)
});

function secureJson(body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: SECURITY_HEADERS
  });
}

function normalizeSideLabel(value: string): string {
  return value.trim().toLowerCase();
}

function resolveSidePrice(market: { market_type: string; outcomes: Array<{ label: string; initial_probability: number }> }, sideInput: string) {
  const outcomes = market.outcomes.slice(0, 2);
  const first = outcomes[0];
  const second = outcomes[1];

  if (!first || !second) {
    throw new Error("Market outcomes are invalid.");
  }

  const normalized = normalizeSideLabel(sideInput);

  if (market.market_type === "YES_NO") {
    const yesOutcome = outcomes.find((entry) => normalizeSideLabel(entry.label) === "yes") ?? first;
    const noOutcome = outcomes.find((entry) => normalizeSideLabel(entry.label) === "no") ?? second;

    if (normalized === "yes" || normalized === normalizeSideLabel(yesOutcome.label)) {
      return { label: yesOutcome.label, price: yesOutcome.initial_probability };
    }

    if (normalized === "no" || normalized === normalizeSideLabel(noOutcome.label)) {
      return { label: noOutcome.label, price: noOutcome.initial_probability };
    }

    throw new Error("Invalid side for YES/NO market.");
  }

  if (normalized === normalizeSideLabel(first.label)) {
    return { label: first.label, price: first.initial_probability };
  }

  if (normalized === normalizeSideLabel(second.label)) {
    return { label: second.label, price: second.initial_probability };
  }

  throw new Error("Invalid side for this market.");
}

export async function POST(request: Request) {
  try {
    if (!isAllowedOrigin(request)) {
      return secureJson({ error: "Forbidden origin." }, { status: 403 });
    }

    const username = getSessionUserFromRequest(request);
    if (!username) {
      return secureJson({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = await request.json();
    const parsed = betRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return secureJson({ error: "Invalid bet payload." }, { status: 400 });
    }

    const latestImport = await getLatestImport();
    if (!latestImport) {
      return secureJson({ error: "No markets available yet." }, { status: 400 });
    }

    const market = latestImport.markets.find((entry) => entry.slug === parsed.data.marketSlug);
    if (!market) {
      return secureJson({ error: "Market not found." }, { status: 404 });
    }

    let side: { label: string; price: number };
    try {
      side = resolveSidePrice(market, parsed.data.side);
    } catch (error) {
      return secureJson(
        { error: error instanceof Error ? error.message : "Invalid side." },
        { status: 400 }
      );
    }

    const placedBet = await saveUserBet({
      username,
      importId: latestImport.importId,
      market,
      side: side.label,
      action: parsed.data.action,
      amount: parsed.data.amount,
      price: side.price
    });

    return secureJson({
      ok: true,
      bet: {
        betId: placedBet.betId,
        marketSlug: placedBet.marketSlug,
        side: placedBet.side,
        action: placedBet.action,
        amount: placedBet.amount,
        price: placedBet.price,
        estimatedPayout: placedBet.estimatedPayout,
        placedAt: placedBet.placedAt
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to place bet.";
    return secureJson({ error: message }, { status: 500 });
  }
}
