import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { GeneratedMarketIdea } from "@/lib/llm/schema";

function resolveDataDir() {
  const configuredDir = process.env.ORTIMARKET_DATA_DIR?.trim();
  if (configuredDir) {
    return path.isAbsolute(configuredDir) ? configuredDir : path.join(process.cwd(), configuredDir);
  }

  const isServerlessRuntime = Boolean(
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT
  );

  return isServerlessRuntime ? "/tmp/potymarket-data" : path.join(process.cwd(), "data");
}

const DATA_DIR = resolveDataDir();
const IMPORTS_DIR = path.join(DATA_DIR, "imports");
const RAW_DIR = path.join(DATA_DIR, "raw");
const BETS_DIR = path.join(DATA_DIR, "bets");
const IMPORT_ID_PATTERN = /^[a-f0-9-]{36}$/i;
const USERNAME_PATTERN = /^[A-Za-z0-9_-]{2,64}$/;

export type TradeAction = "BUY" | "SELL";

export type StoredImport = {
  importId: string;
  uploadedAt: string;
  fileName: string;
  fileSize: number;
  model: string;
  rawTextPath: string;
  markets: GeneratedMarketIdea[];
  reasoning_details?: unknown[];
};

export type StoredBet = {
  betId: string;
  username: string;
  importId: string;
  marketId: string;
  marketSlug: string;
  marketTitle: string;
  marketCategory: string;
  marketType: GeneratedMarketIdea["market_type"];
  side: string;
  action: TradeAction;
  amount: number;
  price: number;
  impliedProbability: number;
  estimatedPayout: number;
  placedAt: string;
};

async function ensureStorageDirs() {
  await Promise.all([
    mkdir(DATA_DIR, { recursive: true }),
    mkdir(IMPORTS_DIR, { recursive: true }),
    mkdir(RAW_DIR, { recursive: true }),
    mkdir(BETS_DIR, { recursive: true })
  ]);
}

function assertSafeImportId(importId: string): string {
  if (!IMPORT_ID_PATTERN.test(importId)) {
    throw new Error("Invalid importId format.");
  }
  return importId;
}

function importJsonPath(importId: string) {
  const safeImportId = assertSafeImportId(importId);
  return path.join(IMPORTS_DIR, `${safeImportId}.json`);
}

function rawTextPath(importId: string) {
  const safeImportId = assertSafeImportId(importId);
  return path.join(RAW_DIR, `${safeImportId}.txt`);
}

function assertSafeUsername(username: string): string {
  if (!USERNAME_PATTERN.test(username)) {
    throw new Error("Invalid username format.");
  }
  return username;
}

function userBetsPath(username: string): string {
  const safeUsername = assertSafeUsername(username);
  const digest = createHash("sha256").update(safeUsername).digest("hex").slice(0, 24);
  return path.join(BETS_DIR, `${digest}.json`);
}

function normalizeStoredImport(raw: unknown): StoredImport | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const payload = raw as Record<string, unknown>;
  const importId = typeof payload.importId === "string" ? payload.importId : null;
  const markets = Array.isArray(payload.markets)
    ? (payload.markets as GeneratedMarketIdea[])
    : Array.isArray(payload.market_ideas)
      ? (payload.market_ideas as GeneratedMarketIdea[])
      : null;

  if (!importId || !markets) {
    return null;
  }

  return {
    importId,
    uploadedAt:
      (typeof payload.uploadedAt === "string" && payload.uploadedAt) ||
      (typeof payload.createdAt === "string" && payload.createdAt) ||
      new Date().toISOString(),
    fileName:
      (typeof payload.fileName === "string" && payload.fileName) ||
      (typeof payload.sourceFileName === "string" && payload.sourceFileName) ||
      "upload.txt",
    fileSize:
      (typeof payload.fileSize === "number" && Number.isFinite(payload.fileSize) && payload.fileSize >= 0
        ? payload.fileSize
        : typeof payload.sourceFileSize === "number" && Number.isFinite(payload.sourceFileSize) && payload.sourceFileSize >= 0
          ? payload.sourceFileSize
          : 0),
    model:
      (typeof payload.model === "string" && payload.model) ||
      (typeof payload.modelUsed === "string" && payload.modelUsed) ||
      "unknown",
    rawTextPath:
      (typeof payload.rawTextPath === "string" && payload.rawTextPath) ||
      (typeof payload.rawChatPath === "string" && payload.rawChatPath) ||
      "",
    markets,
    reasoning_details: Array.isArray(payload.reasoning_details) ? payload.reasoning_details : undefined
  };
}

async function readImportFile(filePath: string): Promise<StoredImport | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return normalizeStoredImport(parsed);
  } catch {
    return null;
  }
}

async function readUserBetsFile(username: string): Promise<StoredBet[]> {
  try {
    const raw = await readFile(userBetsPath(username), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((entry): entry is StoredBet => {
      if (!entry || typeof entry !== "object") {
        return false;
      }
      const value = entry as Record<string, unknown>;
      return (
        typeof value.betId === "string" &&
        typeof value.username === "string" &&
        typeof value.marketSlug === "string" &&
        typeof value.side === "string" &&
        typeof value.action === "string" &&
        typeof value.amount === "number" &&
        typeof value.price === "number" &&
        typeof value.placedAt === "string"
      );
    });
  } catch {
    return [];
  }
}

export async function saveImportResult(params: {
  importId: string;
  fileName: string;
  fileSize: number;
  model: string;
  chatText: string;
  markets: GeneratedMarketIdea[];
  reasoning_details?: unknown[];
}): Promise<StoredImport> {
  await ensureStorageDirs();
  console.log("[storage] saveImportResult:start", {
    importId: params.importId,
    fileName: params.fileName,
    fileSize: params.fileSize,
    markets: params.markets.length,
    dataDir: DATA_DIR
  });

  const rawPath = rawTextPath(params.importId);
  await writeFile(rawPath, params.chatText, { encoding: "utf8", mode: 0o600 });

  const storedImport: StoredImport = {
    importId: params.importId,
    uploadedAt: new Date().toISOString(),
    fileName: params.fileName,
    fileSize: params.fileSize,
    model: params.model,
    rawTextPath: rawPath.startsWith(process.cwd()) ? path.relative(process.cwd(), rawPath) : rawPath,
    markets: params.markets,
    reasoning_details: params.reasoning_details
  };

  await writeFile(importJsonPath(params.importId), JSON.stringify(storedImport, null, 2), {
    encoding: "utf8",
    mode: 0o600
  });
  console.log("[storage] saveImportResult:done", { importId: params.importId });
  return storedImport;
}

export async function getImportById(importId: string): Promise<StoredImport | null> {
  await ensureStorageDirs();
  if (!IMPORT_ID_PATTERN.test(importId)) {
    return null;
  }
  return readImportFile(importJsonPath(importId));
}

export async function getLatestImport(): Promise<StoredImport | null> {
  await ensureStorageDirs();

  const files = await readdir(IMPORTS_DIR);
  const imports = (
    await Promise.all(
      files
        .filter((fileName) => fileName.endsWith(".json"))
        .map((fileName) => readImportFile(path.join(IMPORTS_DIR, fileName)))
    )
  ).filter((entry): entry is StoredImport => Boolean(entry));

  if (imports.length === 0) {
    console.log("[storage] getLatestImport:none", { dataDir: DATA_DIR });
    return null;
  }

  imports.sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt));
  console.log("[storage] getLatestImport:found", { importId: imports[0].importId, dataDir: DATA_DIR });
  return imports[0];
}

export async function getMarketsByImport(importId: string): Promise<GeneratedMarketIdea[]> {
  const foundImport = await getImportById(importId);
  return foundImport?.markets ?? [];
}

export async function getMarketBySlug(
  slug: string,
  importId?: string
): Promise<{ importData: StoredImport; market: GeneratedMarketIdea } | null> {
  const importData = importId ? await getImportById(importId) : await getLatestImport();

  if (!importData) {
    return null;
  }

  const market = importData.markets.find((entry) => entry.slug === slug);
  if (!market) {
    return null;
  }

  return { importData, market };
}

export async function saveUserBet(params: {
  username: string;
  importId: string;
  market: GeneratedMarketIdea;
  side: string;
  action: TradeAction;
  amount: number;
  price: number;
}): Promise<StoredBet> {
  await ensureStorageDirs();

  const username = assertSafeUsername(params.username);
  const amount = Number(params.amount);
  const price = Number(params.price);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid amount.");
  }

  if (!Number.isFinite(price) || price <= 0 || price > 1) {
    throw new Error("Invalid price.");
  }

  const roundedAmount = Number(amount.toFixed(2));
  const roundedPrice = Number(price.toFixed(4));

  const bet: StoredBet = {
    betId: randomUUID(),
    username,
    importId: assertSafeImportId(params.importId),
    marketId: params.market.id,
    marketSlug: params.market.slug,
    marketTitle: params.market.title,
    marketCategory: params.market.category,
    marketType: params.market.market_type,
    side: params.side.trim(),
    action: params.action,
    amount: roundedAmount,
    price: roundedPrice,
    impliedProbability: Number((roundedPrice * 100).toFixed(2)),
    estimatedPayout: Number((roundedAmount / roundedPrice).toFixed(2)),
    placedAt: new Date().toISOString()
  };

  const existing = await readUserBetsFile(username);
  const next = [bet, ...existing].slice(0, 1000);

  await writeFile(userBetsPath(username), JSON.stringify(next, null, 2), {
    encoding: "utf8",
    mode: 0o600
  });

  return bet;
}

export async function getUserBets(username: string, limit = 200): Promise<StoredBet[]> {
  await ensureStorageDirs();

  const safeUsername = assertSafeUsername(username);
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 200;
  const bets = await readUserBetsFile(safeUsername);

  return bets
    .sort((a, b) => +new Date(b.placedAt) - +new Date(a.placedAt))
    .slice(0, Math.min(safeLimit, 1000));
}
