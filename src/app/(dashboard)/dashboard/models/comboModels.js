import { getConservativeComboCapabilities } from "open-sse/providers/capabilities.js";

export function createComboGroup(combos = []) {
  const models = combos
    .filter((combo) => combo && (!combo.kind || combo.kind === "llm"))
    .map((combo) => ({
      key: `combo|${combo.name}`,
      providerId: "combo",
      providerAlias: "combo",
      id: combo.name,
      name: combo.name,
      models: combo.models || [],
      isCombo: true,
      isCustom: false,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    key: "combo",
    providerId: "combo",
    providerAlias: "combo",
    name: "Model Combos",
    iconId: "combo",
    models,
  };
}

export function getComboModelPresentation(row, capsOverrides = {}, pricing = {}) {
  const staticCaps = getConservativeComboCapabilities(row.models, capsOverrides);
  const override = capsOverrides[`combo|${row.id}`] || null;
  return {
    aliasKey: `combo/${row.id}`,
    staticCaps,
    caps: { ...staticCaps, ...(override || {}) },
    override,
    pricing: pricing.combo?.[row.id] || null,
  };
}
