"use client";

import { useState, useEffect, useCallback } from "react";

// Module cache: one /api/pricing fetch shared by every usePricing instance.
let cache = null; // { provider: { model: { input, output, ... } } } | null
let inflight = null;

function loadPricing() {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = fetch("/api/pricing")
    .then(async (res) => {
      if (!res.ok) throw new Error(`pricing ${res.status}`);
      return res.json();
    })
    .then((data) => {
      cache = data || {};
      return cache;
    })
    .catch(() => ({}))
    .finally(() => { inflight = null; });
  return inflight;
}

export function usePricing() {
  const [pricing, setPricing] = useState(() => cache || {});

  useEffect(() => {
    if (cache) {
      setPricing(cache);
      return;
    }
    let alive = true;
    loadPricing().then((data) => { if (alive) setPricing(data); });
    return () => { alive = false; };
  }, []);

  // providerKey: provider alias or id (merged pricing may be keyed by either)
  const getPricing = useCallback(
    (providerKey, modelId) => (providerKey && modelId ? pricing[providerKey]?.[modelId] || null : null),
    [pricing]
  );

  return { getPricing };
}
