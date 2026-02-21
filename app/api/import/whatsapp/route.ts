import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getSessionUserFromRequest, isAllowedOrigin } from "@/lib/auth";
import { generateMarketsFromChat } from "@/lib/llm/generate-markets";
import { saveImportResult } from "@/lib/storage";

export const runtime = "nodejs";

const TXT_FILE_PATTERN = /\.txt$/i;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
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

export async function POST(request: Request) {
  try {
    console.log("[import/whatsapp] request:start");
    if (!isAllowedOrigin(request)) {
      console.log("[import/whatsapp] request:forbidden-origin", { origin: request.headers.get("origin") });
      return secureJson({ error: "Forbidden origin." }, { status: 403 });
    }

    const sessionUser = getSessionUserFromRequest(request);
    if (!sessionUser) {
      console.log("[import/whatsapp] request:unauthorized");
      return secureJson({ error: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      console.log("[import/whatsapp] request:no-file");
      return secureJson({ error: "No file uploaded." }, { status: 400 });
    }
    console.log("[import/whatsapp] file:received", { name: file.name, size: file.size, type: file.type });

    const isTxt = TXT_FILE_PATTERN.test(file.name) || file.type === "text/plain";
    if (!isTxt) {
      console.log("[import/whatsapp] file:invalid-type", { name: file.name, type: file.type });
      return secureJson({ error: "Please select a .txt WhatsApp export file." }, { status: 400 });
    }

    if (file.size <= 0) {
      console.log("[import/whatsapp] file:empty");
      return secureJson({ error: "The uploaded file is empty." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      console.log("[import/whatsapp] file:too-large", { size: file.size });
      return secureJson({ error: "File is too large. Maximum size is 10MB." }, { status: 413 });
    }

    const buffer = await file.arrayBuffer();
    const chatText = new TextDecoder("utf-8").decode(buffer);
    console.log("[import/whatsapp] file:decoded", { charCount: chatText.length });

    if (!chatText.trim()) {
      console.log("[import/whatsapp] file:blank-after-trim");
      return secureJson({ error: "The uploaded file is empty." }, { status: 400 });
    }

    const importId = randomUUID();
    const generationStartedAt = Date.now();
    console.log("[import/whatsapp] generation:start", { importId });
    const { result, modelUsed, reasoningDetails } = await generateMarketsFromChat(chatText);
    console.log("[import/whatsapp] generation:done", {
      importId,
      modelUsed,
      marketCount: result.market_ideas.length,
      elapsedMs: Date.now() - generationStartedAt
    });

    const storageStartedAt = Date.now();
    console.log("[import/whatsapp] storage:start", { importId });
    const stored = await saveImportResult({
      importId,
      fileName: file.name,
      fileSize: file.size,
      model: modelUsed,
      chatText,
      markets: result.market_ideas,
      reasoning_details: reasoningDetails
    });
    console.log("[import/whatsapp] storage:done", {
      importId,
      marketCount: stored.markets.length,
      elapsedMs: Date.now() - storageStartedAt
    });

    console.log("[import/whatsapp] request:success", { importId });
    return secureJson({
      ok: true,
      importId: stored.importId,
      marketCount: stored.markets.length
    });
  } catch (error) {
    console.error("WhatsApp import failed:", error);
    return secureJson({ error: "Failed to import WhatsApp export." }, { status: 500 });
  }
}
