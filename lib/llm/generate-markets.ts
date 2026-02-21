import "server-only";

import { createHash } from "node:crypto";

import { fixJsonPrompt, systemPrompt, userPrompt } from "@/lib/llm/prompts";
import {
  llmMarketsResponseSchema,
  type GeneratedMarketIdea,
  type LlmMarketsResponse,
  type MarketCategory
} from "@/lib/llm/schema";
import { createOpenRouterCompletion, isOpenRouterReasoningEnabled, type OpenRouterMessage } from "@/lib/openrouter";

const ONLY_MODEL = "stepfun/step-3.5-flash:free";
const DEFAULT_MAX_INPUT_CHARS = 40_000;
const DEFAULT_CHUNK_SIZE_CHARS = 12_000;
const DEFAULT_CHUNK_OVERLAP_CHARS = 1_000;
const DEFAULT_MAX_CHUNKS = 10;
const DEFAULT_CHUNK_SUMMARY_CHARS = 2_000;
const DEFAULT_USE_LLM_CHUNK_SUMMARY = false;
const DEFAULT_USE_HEURISTIC_FALLBACK = true;

function getMaxInputChars(): number {
  const configured = Number(process.env.OPENROUTER_MAX_INPUT_CHARS || DEFAULT_MAX_INPUT_CHARS);
  if (Number.isFinite(configured) && configured > 2_000) {
    return Math.floor(configured);
  }
  return DEFAULT_MAX_INPUT_CHARS;
}

function clipChatText(raw: string, maxChars: number): string {
  if (raw.length <= maxChars) {
    return raw;
  }

  const headChars = Math.floor(maxChars * 0.1);
  const tailChars = Math.max(maxChars - headChars - 64, 1_500);
  return `${raw.slice(0, headChars)}\n\n...[truncated for token budget]...\n\n${raw.slice(-tailChars)}`;
}

function splitIntoNewestFirstChunks(raw: string, chunkSize: number, overlap: number, maxChunks: number): string[] {
  if (raw.length <= chunkSize) {
    return [raw];
  }

  const chunks: string[] = [];
  let endCursor = raw.length;

  while (endCursor > 0 && chunks.length < maxChunks) {
    const start = Math.max(0, endCursor - chunkSize);
    chunks.push(raw.slice(start, endCursor));

    if (start === 0) {
      break;
    }

    endCursor = Math.min(raw.length, start + overlap);
  }

  return chunks;
}

function hashId(value: string): string {
  return createHash("sha1").update(value).digest("hex").slice(0, 12);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64);
}

function extractRecentLines(sourceText: string, limit = 300): string[] {
  return sourceText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-limit)
    .reverse();
}

function extractNamesFromRecentText(sourceText: string, limit = 12): string[] {
  const lines = extractRecentLines(sourceText, 600);
  const names: string[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const explicitSpeaker = line.match(/^\s*([A-Z][a-zA-Z]{2,})\s*:/);
    if (explicitSpeaker?.[1]) {
      const candidate = explicitSpeaker[1];
      if (!seen.has(candidate)) {
        seen.add(candidate);
        names.push(candidate);
      }
      if (names.length >= limit) {
        return names;
      }
    }

    const tokens = line.match(/\b[A-Z][a-zA-Z]{2,}\b/g) ?? [];
    for (const token of tokens) {
      if (["Today", "Tonight", "Weekend", "Saturday", "Sunday", "Friday", "Monday"].includes(token)) {
        continue;
      }
      if (!seen.has(token)) {
        seen.add(token);
        names.push(token);
      }
      if (names.length >= limit) {
        return names;
      }
    }
  }

  return names;
}

function extractEvidencePool(sourceText: string, limit = 36): Array<{ quote: string; approx_time: string | null }> {
  const evidence: Array<{ quote: string; approx_time: string | null }> = [];
  const seen = new Set<string>();

  const quotedMatches = sourceText.match(/"([^"]{8,180})"/g) ?? [];
  for (const rawQuote of quotedMatches) {
    const quote = rawQuote.replace(/^"|"$/g, "").trim();
    if (quote.length < 8 || seen.has(quote)) {
      continue;
    }
    seen.add(quote);
    evidence.push({ quote: quote.slice(0, 180), approx_time: null });
    if (evidence.length >= limit) {
      return evidence;
    }
  }

  const lines = extractRecentLines(sourceText, 400);
  for (const line of lines) {
    const message = line.includes(":") ? line.split(":").slice(1).join(":").trim() : line;
    if (message.length < 8) {
      continue;
    }
    const quote = message.slice(0, 180);
    if (seen.has(quote)) {
      continue;
    }
    seen.add(quote);
    evidence.push({ quote, approx_time: null });
    if (evidence.length >= limit) {
      return evidence;
    }
  }

  return evidence;
}

function getEvidenceSlice(
  pool: Array<{ quote: string; approx_time: string | null }>,
  index: number
): Array<{ quote: string; approx_time: string | null }> {
  if (pool.length === 0) {
    return [{ quote: "Recent chat messages indicate evolving plans and uncertainty.", approx_time: null }];
  }

  const first = pool[index % pool.length];
  const second = pool[(index + 3) % pool.length];
  if (!second || second.quote === first.quote) {
    return [first];
  }
  return [first, second];
}

function getCloseTime(index: number): string {
  const now = new Date();
  const daysAhead = 7 + (index % 8);
  const close = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  close.setUTCHours(18 + (index % 4), 0, 0, 0);
  return close.toISOString();
}

function normalizeProbabilities(outcomes: Array<{ label: string; initial_probability: number }>) {
  const safe = outcomes.map((outcome) => ({
    ...outcome,
    initial_probability: Math.max(0, Math.min(1, outcome.initial_probability))
  }));
  const sum = safe.reduce((acc, outcome) => acc + outcome.initial_probability, 0);
  if (sum <= 0) {
    const equal = 1 / safe.length;
    return safe.map((outcome) => ({ ...outcome, initial_probability: Number(equal.toFixed(2)) }));
  }
  return safe.map((outcome, idx) => {
    if (idx < safe.length - 1) {
      return {
        ...outcome,
        initial_probability: Number((outcome.initial_probability / sum).toFixed(2))
      };
    }
    const used = safe
      .slice(0, safe.length - 1)
      .reduce((acc, entry) => acc + Number((entry.initial_probability / sum).toFixed(2)), 0);
    return {
      ...outcome,
      initial_probability: Number((1 - used).toFixed(2))
    };
  });
}

type ParsedChatMessage = {
  name: string;
  text: string;
  timestamp: Date | null;
};

type PersonStat = {
  messages: number;
  proposals: number;
  confirms: number;
  cancels: number;
  lateSignals: number;
  onWaySignals: number;
  locationSignals: number;
};

function parseTimestamp(parts: {
  day: string;
  month: string;
  year: string;
  hour: string;
  minute: string;
  second?: string;
}): Date | null {
  const day = Number(parts.day);
  const month = Number(parts.month);
  const yearRaw = Number(parts.year);
  const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  const second = Number(parts.second ?? 0);

  if (
    !Number.isFinite(day) ||
    !Number.isFinite(month) ||
    !Number.isFinite(year) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    !Number.isFinite(second)
  ) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseWhatsAppMessages(sourceText: string): ParsedChatMessage[] {
  const lines = sourceText.split(/\r?\n/);
  const primaryPattern =
    /^[\u200e\u200f]*\[(\d{1,2})[./](\d{1,2})[./](\d{2,4}),\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\]\s([^:]+):\s?(.*)$/;
  const altPattern =
    /^[\u200e\u200f]*(\d{1,2})[./](\d{1,2})[./](\d{2,4}),\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s-\s([^:]+):\s?(.*)$/;

  const parsed: ParsedChatMessage[] = [];
  let current: ParsedChatMessage | null = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/[\u200e\u200f]/g, "").trimEnd();
    const primary = line.match(primaryPattern);
    const alt = line.match(altPattern);
    const match = primary ?? alt;

    if (match) {
      if (current) {
        parsed.push(current);
      }

      current = {
        name: match[7].trim(),
        text: (match[8] ?? "").trim(),
        timestamp: parseTimestamp({
          day: match[1],
          month: match[2],
          year: match[3],
          hour: match[4],
          minute: match[5],
          second: match[6]
        })
      };
      continue;
    }

    if (current) {
      current.text = `${current.text}\n${line}`.trim();
    }
  }

  if (current) {
    parsed.push(current);
  }

  return parsed;
}

function toEvidence(message: ParsedChatMessage): { quote: string; approx_time: string | null } {
  return {
    quote: message.text.replace(/\s+/g, " ").trim().slice(0, 180),
    approx_time: message.timestamp ? message.timestamp.toISOString() : null
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getCloseTimeFromBase(index: number, latestMessageTime: Date | null): string {
  const now = new Date();
  const base = latestMessageTime && latestMessageTime > now ? latestMessageTime : now;
  const daysAhead = 7 + (index % 8);
  const close = new Date(base.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  close.setUTCHours(18 + (index % 4), 0, 0, 0);
  return close.toISOString();
}

function buildHeuristicMarketResponse(sourceText: string): LlmMarketsResponse {
  const parsedMessages = parseWhatsAppMessages(sourceText);
  const usableMessages = parsedMessages.length > 0 ? parsedMessages : [{ name: "Group", text: sourceText, timestamp: null }];
  const allMessages = usableMessages;
  const newestFirst = [...allMessages].reverse();

  const proposalPattern = /(יושבים|ישיבה|רוצים|בואו|אפשר|איפה|מתי|דיבור|קובעים|נקבע|מי בא|אצלי|לבוא)/i;
  const confirmPattern = /(בעד|כן|אבוא|בא\b|מגיע|מגיעה|אצטרף|זורם|יכול|יכולה)/i;
  const cancelPattern = /(לא יכול|לא יכולה|בחוץ|לא מגיע|לא בא|פוצץ|לא מסתדר|לא זמין|לא משנה)/i;
  const latePattern = /(אאחר|מאחר|באיחור|בעיכוב|בדרך|on my way|עוד .*דקות|אצטרף ב\d)/i;
  const onWayPattern = /(בדרך|on my way|יוצא עכשיו|עוד \d+ דקות|מגיע עוד)/i;
  const locationPattern = /(גבעתיים|פשפשים|מרלן|כצנלסון|מלי|חומוס|בר|אצלי|בבית|לובי|דירה|קומה|נחלת יצחק|חיפה|צפון)/i;

  const stats = new Map<string, PersonStat>();
  const recentBoundary = Math.max(0, allMessages.length - 1800);
  for (let index = 0; index < allMessages.length; index += 1) {
    const message = allMessages[index];
    const name = message.name.trim();
    if (!name) {
      continue;
    }
    const text = message.text.replace(/\s+/g, " ");
    const recencyWeight = index >= recentBoundary ? 1 : 0.35;
    const current =
      stats.get(name) ??
      ({
        messages: 0,
        proposals: 0,
        confirms: 0,
        cancels: 0,
        lateSignals: 0,
        onWaySignals: 0,
        locationSignals: 0
      } as PersonStat);

    current.messages += recencyWeight;
    if (proposalPattern.test(text)) {
      current.proposals += recencyWeight;
    }
    if (confirmPattern.test(text)) {
      current.confirms += recencyWeight;
    }
    if (cancelPattern.test(text)) {
      current.cancels += recencyWeight;
    }
    if (latePattern.test(text)) {
      current.lateSignals += recencyWeight;
    }
    if (onWayPattern.test(text)) {
      current.onWaySignals += recencyWeight;
    }
    if (locationPattern.test(text)) {
      current.locationSignals += recencyWeight;
    }

    stats.set(name, current);
  }

  const rankedByMessages = Array.from(stats.entries()).sort((a, b) => b[1].messages - a[1].messages);
  const rankedByProposals = Array.from(stats.entries()).sort((a, b) => b[1].proposals - a[1].proposals);
  const rankedByCancels = Array.from(stats.entries()).sort((a, b) => b[1].cancels - a[1].cancels);

  const primary = rankedByMessages[0]?.[0] ?? "Someone";
  const secondary = rankedByMessages[1]?.[0] ?? "Another member";
  const topOrganizer = rankedByProposals[0]?.[0] ?? primary;
  const topCanceler = rankedByCancels[0]?.[0] ?? secondary;

  const latestMessageTime =
    [...allMessages].reverse().find((message) => message.timestamp)?.timestamp ??
    allMessages[allMessages.length - 1]?.timestamp ??
    null;

  const locationKeywords = [
    { key: "גבעתיים", label: "Givatayim" },
    { key: "פשפשים", label: "Flea Market area" },
    { key: "מרלן", label: "Merlen" },
    { key: "כצנלסון", label: "Katzenelson" },
    { key: "מלי", label: "Meli" },
    { key: "חומוס", label: "Hummus spot" },
    { key: "אצלי", label: "Someone's home" }
  ] as const;

  const locationScores = locationKeywords.map((location) => ({
    label: location.label,
    count: allMessages.reduce((acc, message, index) => {
      if (!message.text.includes(location.key)) {
        return acc;
      }
      return acc + (index >= recentBoundary ? 1 : 0.4);
    }, 0)
  }));
  const topLocations = locationScores
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((location) => location.label);

  const timeMentions = new Map<string, number>();
  for (let index = 0; index < allMessages.length; index += 1) {
    const message = allMessages[index];
    const matches = message.text.match(/\b(\d{1,2}[:.]\d{2})\b/g) ?? [];
    for (const match of matches) {
      const normalized = match.replace(".", ":");
      const weight = index >= recentBoundary ? 1 : 0.4;
      timeMentions.set(normalized, (timeMentions.get(normalized) ?? 0) + weight);
    }
  }
  const topTime =
    Array.from(timeMentions.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "22:30";

  const totalConfirms = Array.from(stats.values()).reduce((acc, entry) => acc + entry.confirms, 0);
  const totalCancels = Array.from(stats.values()).reduce((acc, entry) => acc + entry.cancels, 0);
  const totalLate = Array.from(stats.values()).reduce((acc, entry) => acc + entry.lateSignals, 0);
  const totalOnWay = Array.from(stats.values()).reduce((acc, entry) => acc + entry.onWaySignals, 0);
  const confirmingPeople = Array.from(stats.values()).filter((entry) => entry.confirms > 0).length;
  const venueSuggesters = Array.from(stats.values()).filter((entry) => entry.locationSignals > 0).length;
  const lateRate = totalLate / Math.max(1, totalConfirms);
  const onWayRate = totalOnWay / Math.max(1, totalConfirms);

  const evidencePool = newestFirst
    .filter((message) => message.text.trim().length > 8)
    .map(toEvidence)
    .slice(0, 120);

  const pickEvidence = (patterns: RegExp[], indexSeed: number) => {
    const matched: Array<{ quote: string; approx_time: string | null }> = [];
    const seen = new Set<string>();

    for (const message of newestFirst) {
      if (!patterns.some((pattern) => pattern.test(message.text))) {
        continue;
      }
      const evidence = toEvidence(message);
      if (!evidence.quote || seen.has(evidence.quote)) {
        continue;
      }
      seen.add(evidence.quote);
      matched.push(evidence);
      if (matched.length >= 2) {
        break;
      }
    }

    if (matched.length > 0) {
      return matched;
    }

    return getEvidenceSlice(evidencePool, indexSeed).slice(0, 2);
  };

  const blueprints: Array<{
    title: string;
    description: string;
    category: MarketCategory;
    market_type: "YES_NO" | "NUMERIC" | "MULTIPLE_CHOICE";
    resolution_criteria: string;
    outcomes: Array<{ label: string; initial_probability: number }>;
    evidencePatterns: RegExp[];
  }> = [
    {
      title: `Will ${topOrganizer} be the first to kick off the next meetup plan?`,
      description: "Organizer momentum based on recent planning behavior.",
      category: "Friends",
      market_type: "YES_NO",
      resolution_criteria: `Resolves YES if ${topOrganizer} posts the first concrete planning message (time/place) for the next meetup.`,
      outcomes: normalizeProbabilities([
        { label: "Yes", initial_probability: clamp(0.35 + (stats.get(topOrganizer)?.proposals ?? 0) * 0.05, 0.35, 0.78) },
        { label: "No", initial_probability: 1 }
      ]),
      evidencePatterns: [proposalPattern]
    },
    {
      title: "Will at least 6 people explicitly confirm attendance?",
      description: "Attendance strength over the next planned meetup.",
      category: "Attendance",
      market_type: "YES_NO",
      resolution_criteria:
        "Resolves YES if 6 or more unique members explicitly confirm attending the next meetup before close time.",
      outcomes: normalizeProbabilities([
        { label: "Yes", initial_probability: clamp(0.3 + confirmingPeople * 0.06, 0.28, 0.82) },
        { label: "No", initial_probability: 1 }
      ]),
      evidencePatterns: [confirmPattern]
    },
    {
      title: "Will the meetup location change after an initial location is proposed?",
      description: "Tracks last-minute place pivots.",
      category: "Plans",
      market_type: "YES_NO",
      resolution_criteria:
        "Resolves YES if the group switches to a different final location after at least one specific location was already proposed.",
      outcomes: normalizeProbabilities([
        { label: "Yes", initial_probability: clamp(0.25 + venueSuggesters * 0.05, 0.25, 0.74) },
        { label: "No", initial_probability: 1 }
      ]),
      evidencePatterns: [locationPattern]
    },
    {
      title: `Will the next meetup start later than ${topTime}?`,
      description: "Timing drift from planned start.",
      category: "Tonight",
      market_type: "YES_NO",
      resolution_criteria:
        "Resolves YES if the first clear arrival/start message appears later than the most commonly discussed meetup time.",
      outcomes: normalizeProbabilities([
        { label: "Yes", initial_probability: clamp(0.3 + lateRate * 0.6, 0.3, 0.8) },
        { label: "No", initial_probability: 1 }
      ]),
      evidencePatterns: [latePattern, /\d{1,2}[:.]\d{2}/]
    },
    {
      title: `Will ${topCanceler} cancel after initially sounding in?`,
      description: "Flip-risk for likely dropouts.",
      category: "Chaos",
      market_type: "YES_NO",
      resolution_criteria:
        `Resolves YES if ${topCanceler} sends a positive/neutral attendance signal and later sends a cancel/out signal for the same upcoming meetup.`,
      outcomes: normalizeProbabilities([
        {
          label: "Yes",
          initial_probability: clamp(
            0.22 +
              ((stats.get(topCanceler)?.cancels ?? 0) / Math.max(1, (stats.get(topCanceler)?.confirms ?? 0) + 1)) *
                0.45,
            0.22,
            0.75
          )
        },
        { label: "No", initial_probability: 1 }
      ]),
      evidencePatterns: [cancelPattern, confirmPattern]
    },
    {
      title: "Will someone send a clear “on my way / בדרך” message before arrival?",
      description: "Transport/arrival signal before meetup start.",
      category: "Logistics",
      market_type: "YES_NO",
      resolution_criteria:
        "Resolves YES if a participant sends an explicit pre-arrival movement message (e.g. on my way / בדרך) before the meetup starts.",
      outcomes: normalizeProbabilities([
        { label: "Yes", initial_probability: clamp(0.28 + onWayRate * 0.7, 0.28, 0.82) },
        { label: "No", initial_probability: 1 }
      ]),
      evidencePatterns: [onWayPattern]
    },
    {
      title: "How many people will explicitly confirm attendance?",
      description: "Numeric attendance depth.",
      category: "Attendance",
      market_type: "NUMERIC",
      resolution_criteria:
        "Resolves to the bucket containing the number of unique explicit confirmations for the next meetup.",
      outcomes: normalizeProbabilities([
        { label: "0-3", initial_probability: confirmingPeople <= 3 ? 0.5 : 0.2 },
        { label: "4-6", initial_probability: confirmingPeople >= 4 && confirmingPeople <= 6 ? 0.5 : 0.4 },
        { label: "7+", initial_probability: confirmingPeople >= 7 ? 0.5 : 0.4 }
      ]),
      evidencePatterns: [confirmPattern]
    },
    {
      title: "How many distinct location options will be proposed?",
      description: "Numeric location-option breadth.",
      category: "Logistics",
      market_type: "NUMERIC",
      resolution_criteria:
        "Resolves to the number bucket of distinct location options proposed before final venue confirmation.",
      outcomes: normalizeProbabilities([
        { label: "1-2", initial_probability: venueSuggesters <= 2 ? 0.5 : 0.25 },
        { label: "3-4", initial_probability: venueSuggesters >= 3 && venueSuggesters <= 4 ? 0.5 : 0.45 },
        { label: "5+", initial_probability: venueSuggesters >= 5 ? 0.4 : 0.3 }
      ]),
      evidencePatterns: [locationPattern]
    },
    {
      title: "How many late/delay signals will appear before meetup start?",
      description: "Numeric lateness chatter intensity.",
      category: "Plans",
      market_type: "NUMERIC",
      resolution_criteria:
        "Resolves to bucket by count of delay/late signals (e.g. late, in traffic, arriving later) before meetup starts.",
      outcomes: normalizeProbabilities([
        { label: "0-1", initial_probability: totalLate <= 1 ? 0.55 : 0.25 },
        { label: "2-4", initial_probability: totalLate >= 2 && totalLate <= 4 ? 0.55 : 0.45 },
        { label: "5+", initial_probability: totalLate >= 5 ? 0.35 : 0.3 }
      ]),
      evidencePatterns: [latePattern]
    },
    {
      title: "How many meetup-time revisions will happen before final lock?",
      description: "Numeric schedule volatility.",
      category: "Weekend",
      market_type: "NUMERIC",
      resolution_criteria:
        "Resolves to bucket by count of distinct proposed meetup times before final plan lock for next meetup.",
      outcomes: normalizeProbabilities([
        { label: "0", initial_probability: 0.2 },
        { label: "1-2", initial_probability: 0.55 },
        { label: "3+", initial_probability: 0.25 }
      ]),
      evidencePatterns: [/\d{1,2}[:.]\d{2}/]
    },
    {
      title: "Which area is most likely for the next meetup?",
      description: "Multiple-choice location forecast.",
      category: "Other",
      market_type: "MULTIPLE_CHOICE",
      resolution_criteria:
        "Resolves to the area that matches the final meetup location mentioned in the group chat.",
      outcomes: normalizeProbabilities([
        { label: topLocations[0] ?? "Givatayim", initial_probability: 0.45 },
        { label: topLocations[1] ?? "Someone's home", initial_probability: 0.33 },
        { label: topLocations[2] ?? "Other area", initial_probability: 0.22 }
      ]),
      evidencePatterns: [locationPattern]
    },
    {
      title: "Who will post the final lock-in message for the next meetup?",
      description: "Multiple-choice final decision ownership.",
      category: "Friends",
      market_type: "MULTIPLE_CHOICE",
      resolution_criteria:
        "Resolves to the person who sends the final unambiguous lock-in message (time/place confirmed) for the next meetup.",
      outcomes: normalizeProbabilities([
        { label: topOrganizer, initial_probability: 0.44 },
        { label: primary, initial_probability: 0.3 },
        { label: "Someone else", initial_probability: 0.26 }
      ]),
      evidencePatterns: [proposalPattern, confirmPattern]
    }
  ];

  const marketIdeas: GeneratedMarketIdea[] = blueprints.map((blueprint, index) => {
    const id = `heuristic-${index + 1}-${hashId(`${blueprint.title}-${index}`)}`;
    const title = blueprint.title.slice(0, 120);
    const slug = slugify(title || id) || id;
    return {
      id,
      slug,
      title,
      description: blueprint.description,
      category: blueprint.category,
      market_type: blueprint.market_type,
      resolution_criteria: blueprint.resolution_criteria,
      close_time_guess: getCloseTimeFromBase(index, latestMessageTime),
      outcomes: blueprint.outcomes,
      scores: {
        creativity: 0.66,
        clarity: 0.76,
        evidence: 0.67,
        fun: 0.71
      },
      evidence: pickEvidence(blueprint.evidencePatterns, index).slice(0, 3)
    };
  });

  return { market_ideas: marketIdeas };
}

function summarizeChunkFallback(chunkText: string): string {
  const linesChronological = chunkText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const linesNewestFirst = [...linesChronological].reverse();

  const likelyNames = new Set<string>();
  const quotes: string[] = [];
  const facts: string[] = [];

  for (const line of linesNewestFirst) {
    const nameMatch = line.match(/[-\s]?([A-Z][a-zA-Z]{2,})[:,-]/);
    if (nameMatch?.[1]) {
      likelyNames.add(nameMatch[1]);
    }

    if (line.includes(":")) {
      const message = line.split(":").slice(1).join(":").trim();
      if (message.length > 8 && quotes.length < 10) {
        quotes.push(`"${message.slice(0, 120)}"`);
      }
    }

    if (
      /\b(today|tonight|tomorrow|weekend|friday|saturday|sunday|pm|am|at\s+\d|meet|bring|arrive|leave|book|plan)\b/i.test(
        line
      )
    ) {
      if (facts.length < 10) {
        facts.push(line.slice(0, 140));
      }
    }
  }

  const namesLine = Array.from(likelyNames).slice(0, 15).join(", ") || "None detected";
  const quotesLine = quotes.length > 0 ? quotes.join(" | ") : "No stable quotes extracted";
  const factsLine = facts.length > 0 ? facts.join(" | ") : "No clear logistics extracted";

  return [
    `Names: ${namesLine}`,
    `Facts: ${factsLine}`,
    `Quotes: ${quotesLine}`,
    "Recency: prioritized newest lines in this chunk.",
    "Uncertainty: Fallback extraction used due empty model output."
  ]
    .join("\n")
    .slice(0, DEFAULT_CHUNK_SUMMARY_CHARS);
}

async function summarizeChunk(model: string, chunkText: string, index: number, total: number): Promise<string> {
  const chunkSystemPrompt = `You compress WhatsApp chat chunks for downstream market generation.
Return plain text only, no markdown.
Output must be concise and contain:
- Prioritize newest updates in this chunk over old updates in this chunk.
- Names mentioned (first names only)
- Concrete upcoming plans/logistics/timing facts
- 5-12 direct short quotes copied from the chunk
- Any uncertainty/conflicts in plans`;

  const chunkUserPrompt = `Chunk ${index}/${total} (newest-first order)
Extract only the most useful signals for prediction markets.
Focus on events likely to happen after the latest messages.
Keep it under ${DEFAULT_CHUNK_SUMMARY_CHARS} characters.

Chunk text:
"""
${chunkText}
"""`;

  const response = await createOpenRouterCompletion({
    model,
    messages: [
      { role: "system", content: chunkSystemPrompt },
      { role: "user", content: chunkUserPrompt }
    ],
    temperature: 0,
    maxTokens: 900
  });

  const trimmed = response.content.trim();
  if (!trimmed) {
    throw new Error("Chunk summary response was empty.");
  }

  return trimmed.slice(0, DEFAULT_CHUNK_SUMMARY_CHARS);
}

async function buildChunkedDigest(model: string, chatText: string, maxInputChars: number): Promise<string> {
  const chunkSize = Number(process.env.OPENROUTER_CHUNK_SIZE_CHARS || DEFAULT_CHUNK_SIZE_CHARS);
  const chunkOverlap = Number(process.env.OPENROUTER_CHUNK_OVERLAP_CHARS || DEFAULT_CHUNK_OVERLAP_CHARS);
  const maxChunks = Number(process.env.OPENROUTER_MAX_CHUNKS || DEFAULT_MAX_CHUNKS);

  const safeChunkSize = Number.isFinite(chunkSize) && chunkSize > 2_000 ? Math.floor(chunkSize) : DEFAULT_CHUNK_SIZE_CHARS;
  const safeChunkOverlap =
    Number.isFinite(chunkOverlap) && chunkOverlap >= 0 && chunkOverlap < safeChunkSize
      ? Math.floor(chunkOverlap)
      : DEFAULT_CHUNK_OVERLAP_CHARS;
  const safeMaxChunks = Number.isFinite(maxChunks) && maxChunks > 0 ? Math.floor(maxChunks) : DEFAULT_MAX_CHUNKS;
  const useLlmChunkSummary =
    (process.env.OPENROUTER_USE_LLM_CHUNK_SUMMARY || "").toLowerCase() === "on"
      ? true
      : DEFAULT_USE_LLM_CHUNK_SUMMARY;

  const chunks = splitIntoNewestFirstChunks(chatText, safeChunkSize, safeChunkOverlap, safeMaxChunks);
  console.log("[llm] chunking:start", {
    inputChars: chatText.length,
    chunkCount: chunks.length,
    chunkSize: safeChunkSize,
    chunkOverlap: safeChunkOverlap,
    maxChunks: safeMaxChunks,
    order: "newest-first",
    summaryMode: useLlmChunkSummary ? "llm" : "local"
  });

  const summaries: string[] = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const chunkIndex = i + 1;
    const startedAt = Date.now();
    console.log("[llm] chunk:summary:start", { chunkIndex, total: chunks.length, chunkChars: chunks[i].length });
    let summary: string;
    if (!useLlmChunkSummary) {
      summary = summarizeChunkFallback(chunks[i]);
    } else {
      try {
        summary = await summarizeChunk(model, chunks[i], chunkIndex, chunks.length);
      } catch (error) {
        console.log("[llm] chunk:summary:fallback", {
          chunkIndex,
          total: chunks.length,
          error: error instanceof Error ? error.message : "Unknown error"
        });
        summary = summarizeChunkFallback(chunks[i]);
      }
    }

    summaries.push(`RecentChunkRank ${chunkIndex}/${chunks.length}\n${summary}`);
    console.log("[llm] chunk:summary:done", {
      chunkIndex,
      total: chunks.length,
      summaryChars: summary.length,
      elapsedMs: Date.now() - startedAt
    });
  }

  const digest = summaries.join("\n\n");
  const clippedDigest = digest.length > maxInputChars ? clipChatText(digest, maxInputChars) : digest;
  console.log("[llm] chunking:digest-ready", { digestChars: digest.length, clippedDigestChars: clippedDigest.length });
  return clippedDigest;
}

function parseJsonObject(raw: string): unknown {
  const trimmed = raw.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    }

    throw new Error("Model output is not valid JSON.");
  }
}

function validateMarkets(parsed: unknown): LlmMarketsResponse {
  const validated = llmMarketsResponseSchema.safeParse(parsed);
  if (validated.success) {
    return validated.data;
  }

  const issues = validated.error.issues
    .map((issue: { path: Array<string | number>; message: string }) => {
      const path = issue.path.join(".") || "root";
      return `${path}: ${issue.message}`;
    })
    .join("; ");

  throw new Error(`LLM response failed schema validation: ${issues}`);
}

export async function generateMarketsFromChat(chatText: string): Promise<{
  modelUsed: string;
  result: LlmMarketsResponse;
  reasoningDetails?: unknown[];
}> {
  const trimmedChat = chatText.trim();
  if (!trimmedChat) {
    throw new Error("Chat text is empty.");
  }

  const maxInputChars = getMaxInputChars();
  const shouldUseChunking = trimmedChat.length > maxInputChars;
  const effectiveSourceText = shouldUseChunking
    ? await buildChunkedDigest(ONLY_MODEL, trimmedChat, maxInputChars)
    : trimmedChat;
  const inputBudgets = Array.from(new Set([maxInputChars, 20_000, 10_000]));
  const model = ONLY_MODEL;
  console.log("[llm] generate:start", {
    model,
    inputChars: chatText.length,
    effectiveInputChars: effectiveSourceText.length,
    chunkingUsed: shouldUseChunking,
    inputBudgets,
    maxInputChars
  });

  let lastFailureMessage: string | null = null;

  const runSingleAttempt = async (inputText: string, budget: number) => {
    const modelStartedAt = Date.now();
    console.log("[llm] model:attempt", { model, budgetChars: budget, clippedChars: inputText.length });
    const baseMessages: OpenRouterMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt(inputText) }
    ];

    const firstPass = await createOpenRouterCompletion({
      model,
      messages: baseMessages,
      temperature: 0.25
    });

    const firstReasoningDetails = firstPass.reasoning_details ? [firstPass.reasoning_details] : [];

    try {
      const parsed = parseJsonObject(firstPass.content);
      const result = validateMarkets(parsed);
      console.log("[llm] model:success-first-pass", {
        model,
        marketCount: result.market_ideas.length,
        elapsedMs: Date.now() - modelStartedAt
      });
      return {
        modelUsed: model,
        result,
        reasoningDetails: isOpenRouterReasoningEnabled() ? firstReasoningDetails : undefined
      };
    } catch {
      console.log("[llm] model:first-pass-invalid-json-or-schema", { model });
      const repairMessages: OpenRouterMessage[] = [
        ...baseMessages,
        {
          role: "assistant",
          content: firstPass.content,
          reasoning_details: firstPass.reasoning_details
        },
        {
          role: "user",
          content: fixJsonPrompt(firstPass.content)
        }
      ];

      const repairedPass = await createOpenRouterCompletion({
        model,
        messages: repairMessages,
        temperature: 0
      });

      const repairedParsed = parseJsonObject(repairedPass.content);
      const result = validateMarkets(repairedParsed);
      console.log("[llm] model:success-after-repair", {
        model,
        marketCount: result.market_ideas.length,
        elapsedMs: Date.now() - modelStartedAt
      });

      const allReasoningDetails = [
        ...firstReasoningDetails,
        ...(repairedPass.reasoning_details ? [repairedPass.reasoning_details] : [])
      ];

      return {
        modelUsed: model,
        result,
        reasoningDetails: isOpenRouterReasoningEnabled() ? allReasoningDetails : undefined
      };
    }
  };

  for (const budget of inputBudgets) {
    const clippedChat = clipChatText(effectiveSourceText, budget);
    try {
      return await runSingleAttempt(clippedChat, budget);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      lastFailureMessage = message;
      const isContextError = /context length|context_length_exceeded|maximum context/i.test(message);
      console.log("[llm] model:failed", { model, budgetChars: budget, error: message, isContextError });

      if (isContextError && budget !== inputBudgets[inputBudgets.length - 1]) {
        console.log("[llm] model:retry-with-smaller-budget", {
          model,
          nextBudget: inputBudgets[inputBudgets.indexOf(budget) + 1]
        });
        continue;
      }

      break;
    }
  }

  const useHeuristicFallback =
    (process.env.OPENROUTER_ENABLE_HEURISTIC_FALLBACK || "").toLowerCase() === "on" || DEFAULT_USE_HEURISTIC_FALLBACK;
  if (useHeuristicFallback) {
    console.log("[llm] fallback:heuristic-markets", {
      model,
      reason: lastFailureMessage ?? "empty-or-unusable-model-output",
      sourceChars: trimmedChat.length
    });
    const fallbackResult = buildHeuristicMarketResponse(trimmedChat);
    return {
      modelUsed: `${model}-heuristic-fallback`,
      result: fallbackResult
    };
  }

  throw new Error(`[${model}] ${lastFailureMessage ?? "failed after all input budgets"}`);
}
