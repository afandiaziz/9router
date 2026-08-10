"use client";

import { useState, useEffect, useMemo } from "react";

export default function QuotaModelPicker({ selected, onChange }) {
  const [byProvider, setByProvider] = useState({});
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState({});
  const [aliasErrors, setAliasErrors] = useState({});
  const [manualModel, setManualModel] = useState("");
  const [manualModelError, setManualModelError] = useState("");

  useEffect(() => {
    fetch("/api/quota-keys/available-models")
      .then((r) => r.json())
      .then((data) => setByProvider(data.byProvider || {}))
      .catch(() => setByProvider({}));
  }, []);

  // Validate alias uniqueness
  useEffect(() => {
    const errors = {};
    const seen = {};
    for (const s of selected) {
      if (!s.alias) continue;
      if (seen[s.alias]) {
        errors[s.alias] = `Alias "${s.alias}" is used by multiple models`;
      }
      seen[s.alias] = s.model;
    }
    setAliasErrors(errors);
  }, [selected]);

  const filtered = useMemo(() => {
    if (!search.trim()) return byProvider;
    const lower = search.toLowerCase();
    const out = {};
    for (const [provider, models] of Object.entries(byProvider)) {
      const filteredModels = models.filter((m) => m.toLowerCase().includes(lower));
      if (filteredModels.length > 0) out[provider] = filteredModels;
    }
    return out;
  }, [byProvider, search]);

  const isSelected = (model) => selected.some((s) => s.model === model);
  const getAlias = (model) => selected.find((s) => s.model === model)?.alias || "";

  const toggleModel = (model) => {
    if (isSelected(model)) {
      onChange(selected.filter((s) => s.model !== model));
    } else {
      onChange([...selected, { model, alias: null }]);
    }
  };

  const setAlias = (model, alias) => {
    onChange(selected.map((s) => (s.model === model ? { ...s, alias: alias || null } : s)));
  };

  // Manual add: allows arbitrary model ids (e.g. gcli/grok-4.5-high)
  const addManualModel = () => {
    const model = manualModel.trim();
    if (!model) return;
    if (isSelected(model)) {
      setManualModelError("Model already added");
      return;
    }
    onChange([...selected, { model, alias: null }]);
    setManualModel("");
    setManualModelError("");
  };

  const removeManualModel = (model) => {
    onChange(selected.filter((s) => s.model !== model));
  };

  const providers = Object.keys(filtered).sort();

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <div className="p-3 bg-gray-800 border-b border-gray-700 space-y-2">
        <input
          type="text"
          placeholder="Search models..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
        />
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add manual model (e.g. gcli/grok-4.5-high)"
            value={manualModel}
            onChange={(e) => { setManualModel(e.target.value); setManualModelError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addManualModel(); } }}
            className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm font-mono focus:outline-none focus:border-blue-500"
          />
          <button
            type="button"
            onClick={addManualModel}
            className="px-3 py-2 bg-blue-700 hover:bg-blue-600 rounded text-sm"
          >
            Add
          </button>
        </div>
        {manualModelError && <p className="text-xs text-red-400">{manualModelError}</p>}
      </div>

      {/* Already selected manual models not in provider list */}
      {selected.some((s) => !Object.values(byProvider).some((arr) => arr.includes(s.model))) && (
        <div className="p-3 bg-gray-900 border-b border-gray-700">
          <p className="text-xs text-gray-400 mb-2">Manually Added</p>
          <div className="flex flex-wrap gap-2">
            {selected
              .filter((s) => !Object.values(byProvider).some((arr) => arr.includes(s.model)))
              .map((s) => (
                <div key={s.model} className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded">
                  <span className="font-mono text-xs">{s.model}</span>
                  <button
                    type="button"
                    onClick={() => removeManualModel(s.model)}
                    className="text-red-400 text-xs hover:text-red-300"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="max-h-64 overflow-y-auto">
        {providers.length === 0 ? (
          <p className="p-4 text-gray-500 text-sm text-center">
            No models available. Use the manual input above to add models manually.
          </p>
        ) : (
          providers.map((provider) => (
            <div key={provider} className="border-b border-gray-800 last:border-b-0">
              <button
                type="button"
                onClick={() => setExpanded((e) => ({ ...e, [provider]: !e[provider] }))}
                className="w-full px-4 py-2 bg-gray-850 hover:bg-gray-800 flex justify-between items-center text-left"
              >
                <span className="font-medium text-sm">{provider}</span>
                <span className="text-xs text-gray-500">{filtered[provider].length} models</span>
              </button>
              {expanded[provider] && (
                <div className="bg-gray-900">
                  {filtered[provider].map((model) => (
                    <div key={model} className="flex items-center gap-2 px-4 py-2 border-t border-gray-800">
                      <input
                        type="checkbox"
                        checked={isSelected(model)}
                        onChange={() => toggleModel(model)}
                        className="rounded border-gray-600 bg-gray-800"
                      />
                      <span className="flex-1 text-sm font-mono truncate" title={model}>
                        {model}
                      </span>
                      {isSelected(model) && (
                        <input
                          type="text"
                          placeholder="Alias (optional)"
                          value={getAlias(model)}
                          onChange={(e) => setAlias(model, e.target.value)}
                          className={`w-40 px-2 py-1 text-xs bg-gray-800 border rounded focus:outline-none ${
                            aliasErrors[getAlias(model)] ? "border-red-500" : "border-gray-600"
                          }`}
                        />
                      )}
                      {aliasErrors[getAlias(model)] && (
                        <span className="text-xs text-red-400">{aliasErrors[getAlias(model)]}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      <div className="p-2 bg-gray-800 border-t border-gray-700 text-xs text-gray-400">
        {selected.length} model{selected.length !== 1 ? "s" : ""} selected
      </div>
    </div>
  );
}
