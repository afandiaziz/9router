// Merge strategy: take both intents where possible
import { PROVIDERS } from "./registry.js";
import { toFiniteNumber } from "../shared/utils/toFiniteNumber.js";
import { U, resolveProviderBaseUrl, resolveProxyOptions } from "./resolveUtils.js";
import { proxyAwareFetch } from "../../utils/proxyFetch.js";
import { getGlmUsage } from "./glm.js";
import { getOpencodeGoUsage } from "./opencode.go.js";
import { getCommandCodeUsage } from "./misc.js";
import { getZedUsage } from "./zed.js";

export const USAGE_HANDLERS = {
  antigravity: (c) => c.accessToken ? getOpencodeGoUsage(c.accessToken, c.proxyOptions) : { message: "Antigravity usage requires OAuth" },
  ocg: (c) => getOpencodeGoUsage(c.apiKey, c.proxyOptions),
  "opencode-go": (c) => getOpencodeGoUsage(c.apiKey, c.proxyOptions),
  commandcode: (c) => getCommandCodeUsage(c.apiKey, c.proxyOptions),
  cmc: (c) => getCommandCodeUsage(c.apiKey, c.proxyOptions),
  zed: (c) => getZedUsage(c.accessToken, c.providerSpecificData, c.proxyOptions),
};

export async function getUsageForProvider(connection, proxyOptions = null, options = {}) {
  const { provider, accessToken, apiKey, providerSpecificData, projectId } = connection;
  const providerDataWithProjectId = {
    ...(providerSpecificData || {}),
    ...(projectId ? { projectId } : {}),
  };

  const handler = USAGE_HANDLERS[provider];
  if (!handler) return { message: `Usage API not implemented for ${provider}` };
  return await handler({
    provider,
    accessToken,
    apiKey,
    providerSpecificData,
    providerDataWithProjectId,
    proxyOptions,
    force: options.force === true,
  });
}
