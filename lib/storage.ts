import "server-only";

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
const IMPORT_ID_PATTERN = /^[a-f0-9-]{36}$/i;

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

async function ensureStorageDirs() {
  await Promise.all([
    mkdir(DATA_DIR, { recursive: true }),
    mkdir(IMPORTS_DIR, { recursive: true }),
    mkdir(RAW_DIR, { recursive: true })
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
