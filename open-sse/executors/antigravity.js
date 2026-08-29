import crypto from "crypto";
import { BaseExecutor } from "./base.js";
import { PROVIDERS } from "../config/providers.js";
import { OAUTH_ENDPOINTS, ANTIGRAVITY_HEADERS, AG_DEFAULT_TOOLS, AG_TOOL_SUFFIX, ANTIGRAVITY_PROMPT_REWRITES } from "../config/appConstants.js";
import { HTTP_STATUS } from "../config/runtimeConfig.js";
import { resolveSessionId } from "../utils/sessionManager.js";

const MAX_ANTIGRAVITY_OUTPUT_TOKENS = 500_000;

/**
 * AntigravityExecutor — talks to https://antigravity.com/zen/v1/chat/completions
 *
 * Auth: OAuth device flow with PKCE (access_token).
 * Adds the per-request `sessionId` header expected by Antigravity upstream.
 *
 * Upstream returns AI SDK v5 NDJSON (one JSON event per line, no `data:` prefix).
 * We translate each event to an OpenAI chat.completion.chunk and emit it as SSE so
 * both the streaming and non-streaming (forced SSE → JSON) downstream handlers in
 * 9router can consume it without further format translation.
 */
export class AntigravityExecutor extends BaseExecutor {
  constructor() {
    super("antigravity", PROVIDERS.antigravity);
    this.agentType = null;
    this.toolSuffix = AG_TOOL_SUFFIX;
    this.defaultTools = AG_DEFAULT_TOOLS;
    this.maxOutputTokens = MAX_ANTIGRAVITY_OUTPUT_TOKENS;
    this.oauthEndpointUrls = OAUTH_ENDPOINTS;
  }

  transformRequest(model, body, stream, credentials) {
    const maxTokens = body?.max_completion_tokens || body?.max_tokens;
    if (maxTokens && maxTokens > this.maxOutputTokens) {
      body.max_output_tokens = this.maxOutputTokens;
      delete body.max_completion_tokens;
      delete body.max_tokens;
    }
    return body;
  }

  buildHeaders(credentials, stream = true) {
    const token = credentials?.accessToken || credentials?.apiKey;
    return {
      ...ANTIGRAVITY_HEADERS,
      Authorization: `Bearer ${token}`,
      ...(stream && { Accept: "text/event-stream" }),
    };
  }

  async execute(opts) {
    const result = await super.execute(opts);
    if (!result?.response?.ok || !result.response.body) return result;
    result.response = await inspectAndWrapAntigravityResponse(result.response, opts.model);
    return result;
  }

  parseError(response, bodyText) {
    let parsed = null;
    try {
      parsed = JSON.parse(bodyText || "{}");
    } catch {
      parsed = null;
    }
    const errObj = parsed?.error || parsed;
    const msg = errObj?.message || parsed?.message || bodyText || response.statusText;
    const status = Number(errObj?.code || errObj?.statusCode || response.status) || response.status;
    return {
      status,
      message: msg || `Antigravity upstream error: ${response.status}`,
    };
  }
}

export function parseAntigravityError(event) {
  if (!event || typeof event !== "object") {
    return {
      statusCode: 503,
      message: "Antigravity upstream error",
      type: "server_error",
    };
  }

  const errVal = event.error ?? event.message ?? "unknown";
  let message = "";
  let statusCode = null;
  let type = "server_error";

  if (typeof errVal === "object" && errVal !== null) {
    message = errVal.message || errVal.error || JSON.stringify(errVal);
    if (errVal.statusCode && Number.isInteger(Number(errVal.statusCode))) {
      statusCode = Number(errVal.statusCode);
    } else if (errVal.status && Number.isInteger(Number(errVal.status))) {
      statusCode = Number(errVal.status);
    }
    if (errVal.type) type = errVal.type;
  } else if (typeof errVal === "string") {
    message = errVal;
  } else {
    message = JSON.stringify(errVal);
  }

  if (event.statusCode && Number.isInteger(Number(event.statusCode))) {
    statusCode = Number(event.statusCode);
  }

  if (!statusCode || statusCode < 400 || statusCode > 599) {
    const lower = message.toLowerCase();
    if (lower.includes("rate limit") || lower.includes("too many requests")) {
      statusCode = 429;
      type = "rate_limit_error";
    } else if (lower.includes("unauthorized") || lower.includes("invalid api key") || lower.includes("authentication")) {
      statusCode = 401;
      type = "authentication_error";
    } else if (lower.includes("payment required") || lower.includes("billing")) {
      statusCode = 402;
      type = "billing_error";
    } else if (lower.includes("quota") || lower.includes("forbidden") || lower.includes("permission")) {
      statusCode = 403;
      type = "permission_error";
    } else if (lower.includes("not found")) {
      statusCode = 404;
      type = "invalid_request_error";
    } else if (lower.includes("unavailable") || lower.includes("overloaded") || lower.includes("server error")) {
      statusCode = 503;
      type = "server_error";
    } else {
      statusCode = 503;
    }
  }

  return { statusCode, message, type };
}

export async function inspectAndWrapAntigravityResponse(originalResponse, model) {
  // This is similar to commandcode but for antigravity-specific error handling
  const reader = originalResponse.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const bufferedLines = [];
  let detectedError = null;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        bufferedLines.push(line);

        if (detectedError) continue;

        let data = null;
        try {
          data = JSON.parse(line);
        } catch {
          continue;
        }

        if (data && typeof data === "object" && data.error) {
          detectedError = parseAntigravityError(data);
          break;
        }
      }
    }

    if (detectedError) {
      return new Response(
        JSON.stringify({ error: detectedError }),
        {
          status: detectedError.statusCode,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const combinedStream = new ReadableStream({
      start(controller) {
        for (const line of bufferedLines) {
          controller.enqueue(new TextEncoder().encode(line + "\n"));
        }
        if (buffer) {
          controller.enqueue(new TextEncoder().encode(buffer + "\n"));
        }
        controller.close();
      },
    });

    return new Response(combinedStream, {
      status: originalResponse.status,
      headers: new Headers(originalResponse.headers),
    });
  } catch (error) {
    return new Response(null, { status: 503, statusText: error.message });
  }
}

export default AntigravityExecutor;
