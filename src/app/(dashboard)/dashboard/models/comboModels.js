import { getConservativeComboCapabilities } from "open-sse/providers/capabilities.js";
import { getProviderAlias } from "@/shared/constants/providers";

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

export function createActiveProviderSet(connections = []) {
  const activeProviders = new Set();
  for (const connection of connections) {
    if (connection.isActive === false) continue;
    if (connection.provider) {
      activeProviders.add(connection.provider);
      activeProviders.add(getProviderAlias(connection.provider) || connection.provider);
    }
    if (connection.providerSpecificData?.prefix) {
      activeProviders.add(connection.providerSpecificData.prefix);
    }
  }
  return activeProviders;
}

export function isGroupActive(group, activeProviderAliases) {
  if (group.key !== "combo") {
    return activeProviderAliases.has(group.key) || activeProviderAliases.has(group.providerId);
  }
  return group.models.some((combo) =>
    combo.models.some((member) => {
      const provider = typeof member === "string" ? member.split("/", 1)[0] : "";
      return activeProviderAliases.has(provider);
    })
  );
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
