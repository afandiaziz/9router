  const modelSupportedFormats = getModelSupportedFormats(alias, model);
  const runtimeTransport = resolveTransport(provider, sourceFormat);
  // Per-model guard: when a model declares supportedFormats, only use the
  // sourceFormat-matched transport if that format is declared (opencode-go models
  // differ — kimi/glm only do /chat/completions). Undeclared models keep the
  // upstream default (use the transport), preserving behavior for glm/deepseek/...
  const sourceTransport = (!modelSupportedFormats || modelSupportedFormats.includes(sourceFormat)) ? runtimeTransport : null;
  const useTransport = sourceTransport || (modelTargetFormat ? resolveTransport(provider, modelTargetFormat) : null);
  // A source-format-matched endpoint keeps the request lossless. Prefer it
  // over a model-level targetFormat, which is only the fallback for clients
  // whose wire format has no supported transport (for example MiniMax-M3:
  // OpenAI clients should stay on /chat/completions; other clients can fall
  // back to its declared Claude target).
  const targetFormat = useTransport?.format || modelTargetFormat || getTargetFormat(provider, credentials);
  if (useTransport && credentials) credentials.runtimeTransport = useTransport;
