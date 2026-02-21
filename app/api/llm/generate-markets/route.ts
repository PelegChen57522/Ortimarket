import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "next/dist/compiled/zod";

import { getSessionUserFromRequest, isAllowedOrigin } from "@/lib/auth";
import { generateMarketsFromChat } from "@/lib/llm/generate-markets";
import { saveImportResult } from "@/lib/storage";

export const runtime = "nodejs";
const MAX_CHAT_CHARS = 220_000;
const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

function secureJson(body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: SECURITY_HEADERS
  });
}

const generateRequestSchema = z.object({
  chatText: z.string().min(1).max(MAX_CHAT_CHARS),
  importId: z
    .string()
    .regex(/^[a-f0-9-]{36}$/i, "importId must be a UUID.")
    .optional(),
  sourceFileName: z.string().min(1).optional(),
  sourceFileSize: z.number().int().nonnegative().optional()
});

export async function POST(request: Request) {
  try {
    console.log("[api/llm/generate-markets] request:start");
    if (!isAllowedOrigin(request)) {
      console.log("[api/llm/generate-markets] request:forbidden-origin", { origin: request.headers.get("origin") });
      return secureJson({ error: "Forbidden origin." }, { status: 403 });
    }

    const sessionUser = getSessionUserFromRequest(request);
    if (!sessionUser) {
      console.log("[api/llm/generate-markets] request:unauthorized");
      return secureJson({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = generateRequestSchema.safeParse(body);

    if (!parsed.success) {
      console.log("[api/llm/generate-markets] request:invalid-payload");
      return secureJson({ error: "Invalid request payload." }, { status: 400 });
    }

    const importId = parsed.data.importId ?? randomUUID();
    console.log("[api/llm/generate-markets] generation:start", {
      importId,
      chatChars: parsed.data.chatText.length
    });
    const { result, modelUsed, reasoningDetails } = await generateMarketsFromChat(parsed.data.chatText);
    console.log("[api/llm/generate-markets] generation:done", {
      importId,
      modelUsed,
      marketCount: result.market_ideas.length
    });

    const stored = await saveImportResult({
      importId,
      fileName: parsed.data.sourceFileName ?? "manual-input.txt",
      fileSize: parsed.data.sourceFileSize ?? parsed.data.chatText.length,
      model: modelUsed,
      chatText: parsed.data.chatText,
      markets: result.market_ideas,
      reasoning_details: reasoningDetails
    });
    console.log("[api/llm/generate-markets] storage:done", {
      importId,
      marketCount: stored.markets.length
    });

    return secureJson({
      ok: true,
      importId: stored.importId,
      modelUsed: stored.model,
      marketCount: stored.markets.length
    });
  } catch (error) {
    console.error("LLM market generation failed:", error);
    return secureJson({ error: "Failed to generate markets." }, { status: 500 });
  }
}
