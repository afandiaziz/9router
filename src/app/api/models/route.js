import { NextResponse } from "next/server";
import { getModelAliases, setModelAlias, getCustomModels } from "@/models";
import { getDisabledModels } from "@/lib/disabledModelsDb";
import { getCapsOverrides } from "@/lib/db/index.js";
import { AI_MODELS } from "@/shared/constants/config";
import { getProviderAlias } from "@/shared/constants/providers";
import { getCapabilitiesForModel } from "open-sse/providers/capabilities.js";

export const dynamic = "force-dynamic";

// GET /api/models - Get models with aliases
export async function GET() {
  try {
    const modelAliases = await getModelAliases();
    const disabled = await getDisabledModels();
    const capsOverrides = await getCapsOverrides();

    // Invert alias mapping: key=alias, val=targetModel -> targetToAlias[targetModel] = alias
    const targetToAlias = {};
    for (const [aliasName, target] of Object.entries(modelAliases || {})) {
      if (typeof target === "string") {
        targetToAlias[target] = aliasName;
      }
    }

    const models = AI_MODELS
      .filter((m) => {
        const alias = getProviderAlias(m.provider) || m.provider;
        const list = disabled[alias] || disabled[m.provider] || [];
        return !list.includes(m.model);
      })
      .map((m) => {
        const fullModel = `${m.provider}/${m.model}`;
        const providerAlias = getProviderAlias(m.provider) || m.provider;
        const routedModel = `${providerAlias}/${m.model}`;
        // User overrides (models.dev import / manual edits) win over static caps
        const override = capsOverrides[`${providerAlias}|${m.model}`] || capsOverrides[`${m.provider}|${m.model}`];
        const c = { ...getCapabilitiesForModel(m.provider, m.model), ...(override || {}) };
        return {
          ...m,
          fullModel,
          routedModel,
          alias: targetToAlias[fullModel] || targetToAlias[routedModel] || modelAliases[fullModel] || m.model,
          caps: {
            vision: c.vision,
            search: c.search,
            reasoning: c.reasoning,
            tools: c.tools,
            pdf: c.pdf,
            imageOutput: c.imageOutput,
            audioInput: c.audioInput,
            videoInput: c.videoInput,
            audioOutput: c.audioOutput,
            contextWindow: c.contextWindow,
            maxOutput: c.maxOutput,
          },
          ...(override ? { capsOverridden: true } : {}),
        };
      });

    // Custom models ride along; their stored caps override the name heuristic
    const seenFull = new Set(models.map((m) => m.fullModel));
    const customModels = (await getCustomModels()).filter((m) => {
      if (!m?.id || (m.kind || m.type || "llm") !== "llm") return false;
      return !seenFull.has(`${m.providerAlias}/${m.id}`);
    });
    for (const m of customModels) {
      const fullModel = `${m.providerAlias}/${m.id}`;
      const override = capsOverrides[`${m.providerAlias}|${m.id}`];
      const c = { ...getCapabilitiesForModel(m.providerAlias, m.id), ...(m.caps || {}), ...(override || {}) };
      models.push({
        provider: m.providerAlias,
        model: m.id,
        name: m.name || m.id,
        fullModel,
        routedModel: fullModel,
        alias: targetToAlias[fullModel] || modelAliases[fullModel] || m.id,
        caps: {
          vision: c.vision,
          search: c.search,
          reasoning: c.reasoning,
          tools: c.tools,
          pdf: c.pdf,
          imageOutput: c.imageOutput,
          audioInput: c.audioInput,
          videoInput: c.videoInput,
          audioOutput: c.audioOutput,
          contextWindow: c.contextWindow,
          maxOutput: c.maxOutput,
        },
        ...(override ? { capsOverridden: true } : {}),
      });
    }

    return NextResponse.json({ models });
  } catch (error) {
    console.log("Error fetching models:", error);
    return NextResponse.json({ error: "Failed to fetch models" }, { status: 500 });
  }
}

// PUT /api/models - Update model alias
export async function PUT(request) {
  try {
    const body = await request.json();
    const { model, alias } = body;

    if (!model || !alias) {
      return NextResponse.json({ error: "Model and alias required" }, { status: 400 });
    }

    const modelAliases = await getModelAliases();

    // Check if alias already exists for different model
    const existingModel = modelAliases[alias];
    if (existingModel && existingModel !== model) {
      return NextResponse.json({ error: "Alias already in use" }, { status: 400 });
    }

    // Update alias: setModelAlias(alias, model)
    await setModelAlias(alias, model);

    return NextResponse.json({ success: true, model, alias });
  } catch (error) {
    console.log("Error updating alias:", error);
    return NextResponse.json({ error: "Failed to update alias" }, { status: 500 });
  }
}
