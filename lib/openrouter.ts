import "server-only";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

type OpenRouterRole = "system" | "user" | "assistant";

export type OpenRouterMessage = {
  role: OpenRouterRole;
  content: string;
  reasoning_details?: unknown;
};

type OpenRouterChoice = {
  text?: string;
  finish_reason?: string | null;
  native_finish_reason?: string | null;
  message?: {
    content?: string | Array<string | { text?: string }> | null;
    reasoning_details?: unknown;
  };
};

type OpenRouterError = {
  message?: string;
  metadata?: {
    raw?: string;
  };
};

type OpenRouterResponse = {
  choices?: OpenRouterChoice[];
  error?: OpenRouterError;
};

export type OpenRouterCompletionResult = {
  content: string;
  reasoning_details?: unknown;
};

function isStepfunModel(model: string): boolean {
  return model.startsWith("stepfun/");
}

function extractContentFromChoice(choice: OpenRouterChoice | undefined): string {
  if (!choice) {
    return "";
  }

  const messageContent = choice.message?.content;

  if (typeof messageContent === "string") {
    return messageContent.trim();
  }

  if (Array.isArray(messageContent)) {
    const merged = messageContent
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (part && typeof part.text === "string") {
          return part.text;
        }
        return "";
      })
      .join("")
      .trim();

    if (merged) {
      return merged;
    }
  }

  if (typeof choice.text === "string") {
    return choice.text.trim();
  }

  return "";
}

function getReasoningMode(): "off" | "on" {
  return process.env.OPENROUTER_REASONING === "on" ? "on" : "off";
}

export function isOpenRouterReasoningEnabled(): boolean {
  return getReasoningMode() === "on";
}

function getRefererHeader(): string | null {
  const envReferer = process.env.OPENROUTER_REFERER?.trim();
  if (envReferer) {
    return envReferer;
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return null;
}

function getRequestTimeoutMs(): number {
  const configured = Number(process.env.OPENROUTER_REQUEST_TIMEOUT_MS || 15000);
  if (!Number.isFinite(configured) || configured < 3000) {
    return 15000;
  }
  return Math.floor(configured);
}

export async function createOpenRouterCompletion(params: {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<OpenRouterCompletionResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is missing.");
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "X-Title": "potymarket"
  };

  const referer = getRefererHeader();
  if (referer) {
    headers["HTTP-Referer"] = referer;
  }

  const configuredMaxTokens = Number(process.env.OPENROUTER_MAX_OUTPUT_TOKENS || 3500);
  const configuredStepfunMaxTokens = Number(process.env.OPENROUTER_STEPFUN_MAX_OUTPUT_TOKENS || 12000);
  const isStepfun = isStepfunModel(params.model);
  const safeMaxTokens =
    params.maxTokens && Number.isFinite(params.maxTokens) && params.maxTokens > 0
      ? params.maxTokens
      : isStepfun && Number.isFinite(configuredStepfunMaxTokens) && configuredStepfunMaxTokens > 0
        ? configuredStepfunMaxTokens
        : Number.isFinite(configuredMaxTokens) && configuredMaxTokens > 0
          ? configuredMaxTokens
          : 3500;

  const reasoningEnabled = isStepfun ? true : getReasoningMode() === "on";

  const runRequest = async (
    messages: OpenRouterMessage[],
    temperature: number,
    attemptLabel: string,
    allowEmpty = false
  ): Promise<OpenRouterCompletionResult> => {
    const requestBody: Record<string, unknown> = {
      model: params.model,
      temperature,
      messages,
      max_tokens: safeMaxTokens,
      reasoning: isStepfun
        ? { enabled: true }
        : { enabled: reasoningEnabled }
    };

    const startedAt = Date.now();
    console.log("[openrouter] request:start", {
      model: params.model,
      messageCount: messages.length,
      reasoningModeEnv: getReasoningMode(),
      reasoningEnabled,
      maxTokens: safeMaxTokens,
      attempt: attemptLabel
    });

    const timeoutMs = getRequestTimeoutMs();
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), timeoutMs);
    let response: Response;

    try {
      response = await fetch(OPENROUTER_ENDPOINT, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal: abortController.signal
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`OpenRouter request timed out after ${timeoutMs}ms.`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    const data = (await response.json()) as OpenRouterResponse;
    console.log("[openrouter] request:response", {
      model: params.model,
      status: response.status,
      elapsedMs: Date.now() - startedAt,
      attempt: attemptLabel
    });

    if (!response.ok) {
      console.log("[openrouter] request:error-payload", {
        model: params.model,
        error: data.error ?? null
      });
      const providerRaw = data.error?.metadata?.raw;
      const errorMessage = providerRaw ? `${data.error?.message ?? "OpenRouter error"} | ${providerRaw}` : data.error?.message;
      throw new Error(errorMessage ?? `OpenRouter request failed (${response.status}).`);
    }

    const choice = data.choices?.[0];
    const message = choice?.message;
    const content = extractContentFromChoice(choice);
    const result: OpenRouterCompletionResult = {
      content,
      reasoning_details: message?.reasoning_details
    };

    if (content) {
      return result;
    }

    console.log("[openrouter] request:empty-content", {
      model: params.model,
      attempt: attemptLabel,
      hasMessage: Boolean(choice?.message),
      hasReasoningDetails: Boolean(choice?.message?.reasoning_details),
      finishReason: choice?.finish_reason ?? null,
      nativeFinishReason: choice?.native_finish_reason ?? null,
      choiceKeys: choice ? Object.keys(choice) : []
    });

    if (allowEmpty) {
      return result;
    }

    throw new Error("OpenRouter returned an empty response.");
  };

  const firstPass = await runRequest(params.messages, params.temperature ?? 0.25, "initial", true);
  if (firstPass.content) {
    return firstPass;
  }
  throw new Error("OpenRouter returned an empty response.");
}
