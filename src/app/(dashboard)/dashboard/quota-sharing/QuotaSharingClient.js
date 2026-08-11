"use client";

import { useState, useEffect } from "react";
import { Card, Badge, Button } from "@/shared/components";
import QuotaModelPicker from "./QuotaModelPicker";

export default function QuotaSharingClient() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editKey, setEditKey] = useState(null);
  const [error, setError] = useState("");
  const [createdKey, setCreatedKey] = useState(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formLimit, setFormLimit] = useState("");
  const [formUnlimited, setFormUnlimited] = useState(false);
  const [formPeriod, setFormPeriod] = useState("monthly");
  const [formModels, setFormModels] = useState([]);
  const [formNotes, setFormNotes] = useState("");

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const res = await fetch("/api/quota-keys");
      const data = await res.json();
      setKeys(data.keys || []);
    } catch (e) {
      setError("Failed to load quota keys");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormLimit("");
    setFormUnlimited(false);
    setFormPeriod("monthly");
    setFormModels([]);
    setFormNotes("");
    setEditKey(null);
    setCreatedKey(null);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (key) => {
    setEditKey(key);
    setFormName(key.name || "");
    setFormLimit(key.limit?.toString() || "");
    setFormUnlimited(key.limit == null);
    setFormPeriod(key.limitPeriod || "monthly");
    setFormModels(key.allowedModels || []);
    setFormNotes(key.notes || "");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const payload = {
      name: formName,
      limit: formUnlimited ? null : (formLimit ? Number(formLimit) : null),
      limitPeriod: formPeriod,
      allowedModels: formModels,
      notes: formNotes,
    };

    try {
      const url = editKey ? `/api/quota-keys/${editKey.id}` : "/api/quota-keys";
      const method = editKey ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save");
        return;
      }

      if (!editKey && data.key) {
        setCreatedKey(data.key);
      } else {
        setModalOpen(false);
      }
      fetchKeys();
    } catch (e) {
      setError("Network error");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this quota key?")) return;
    try {
      await fetch(`/api/quota-keys/${id}`, { method: "DELETE" });
      fetchKeys();
    } catch (e) {
      setError("Failed to delete");
    }
  };

  const handleToggle = async (id, isActive) => {
    try {
      await fetch(`/api/quota-keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      fetchKeys();
    } catch (e) {
      setError("Failed to toggle");
    }
  };

  const handleRegenerate = async (id) => {
    if (!confirm("Regenerate API key? Old key will stop working.")) return;
    try {
      const res = await fetch(`/api/quota-keys/${id}/regenerate`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.key) {
        setCreatedKey(data.key);
        setModalOpen(true);
        fetchKeys();
      }
    } catch (e) {
      setError("Failed to regenerate");
    }
  };

  const copyKey = () => {
    if (createdKey?.key) {
      navigator.clipboard.writeText(createdKey.key);
    }
  };

  if (loading) {
    return (
      <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2 leading-tight">
            Quota Sharing
          </h2>
        </div>
        <Card padding="md">
          <p className="text-text-muted text-center py-8">Loading...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2 leading-tight">
          Quota Sharing
        </h2>
        <Button variant="primary" size="sm" icon="add" onClick={openCreate}>
          New Quota Key
        </Button>
      </div>

      {error && (
        <div className="rounded-[10px] bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Keys grid */}
      {keys.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-8">
            <p className="text-text-muted mb-4">No quota keys yet. Create one to share API access.</p>
            <Button variant="primary" size="md" icon="add" onClick={openCreate}>
              Create First Key
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {keys.map((k) => (
            <Card
              key={k.id}
              padding="xs"
              className="h-full hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors"
            >
              <div className="flex flex-col gap-3">
                {/* Header: name + status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-text-main truncate">{k.name}</span>
                  </div>
                  <Badge
                    variant={k.isActive ? "success" : "default"}
                    size="sm"
                    dot
                  >
                    {k.isActive ? "Active" : "Disabled"}
                  </Badge>
                </div>

                {/* Key prefix */}
                <div className="font-mono text-xs text-text-muted">{k.keyPrefix}</div>

                {/* Models & Period */}
                <div className="flex flex-wrap gap-1.5">
                  {k.allowedModels?.length > 0 ? (
                    <Badge variant="info" size="sm">
                      {k.allowedModels.length} model{k.allowedModels.length !== 1 ? "s" : ""}
                    </Badge>
                  ) : (
                    <Badge variant="default" size="sm">All models</Badge>
                  )}
                  <Badge variant="default" size="sm">{k.limitPeriod}</Badge>
                </div>

                {/* Usage bar */}
                <div>
                  <div className="flex justify-between text-xs text-text-muted mb-1">
                    <span>{k.progress?.tokensUsed?.toLocaleString() || 0} / {k.limit ? k.limit.toLocaleString() : "∞"}</span>
                    <span>{k.progress?.percent != null ? `${k.progress.percent}%` : "—"}</span>
                  </div>
                  <div className="w-full bg-surface-2 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        k.progress?.percent > 90 ? "bg-red-500" : k.progress?.percent > 70 ? "bg-yellow-500" : "bg-brand-500"
                      }`}
                      style={{ width: `${k.progress?.percent || 0}%` }}
                    />
                  </div>
                  {k.progress?.resetAt && (
                    <p className="text-[10px] text-text-muted mt-1">
                      Resets: {new Date(k.progress.resetAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1 border-t border-border-subtle">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggle(k.id, !k.isActive)}
                  >
                    {k.isActive ? "Disable" : "Enable"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(k)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleRegenerate(k.id)}>
                    Regen
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(k.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <Card padding="md" className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-text-main mb-4">
              {createdKey ? "Key Created" : editKey ? "Edit Quota Key" : "Create Quota Key"}
            </h2>

            {createdKey ? (
              <div className="space-y-4">
                <div className="rounded-[10px] bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-400">
                  Key created successfully!
                </div>
                <Card.Section>
                  <p className="font-mono text-sm break-all text-text-main">{createdKey.key}</p>
                </Card.Section>
                <div className="flex flex-col gap-2">
                  <Button variant="primary" fullWidth onClick={copyKey}>
                    Copy to Clipboard
                  </Button>
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => { setModalOpen(false); setCreatedKey(null); resetForm(); }}
                  >
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-text-muted mb-1">Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 bg-bg border border-border-subtle rounded-[10px] text-text-main focus:outline-none focus:border-brand-500 transition"
                    required
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm text-text-muted mb-1">Token Limit</label>
                    <input
                      type="number"
                      value={formLimit}
                      onChange={(e) => setFormLimit(e.target.value)}
                      disabled={formUnlimited}
                      className="w-full px-3 py-2 bg-bg border border-border-subtle rounded-[10px] text-text-main focus:outline-none focus:border-brand-500 disabled:opacity-50 transition"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formUnlimited}
                        onChange={(e) => setFormUnlimited(e.target.checked)}
                        className="rounded border-border-subtle bg-bg"
                      />
                      <span className="text-sm text-text-main">Unlimited</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-text-muted mb-1">Reset Period</label>
                  <select
                    value={formPeriod}
                    onChange={(e) => setFormPeriod(e.target.value)}
                    className="w-full px-3 py-2 bg-bg border border-border-subtle rounded-[10px] text-text-main focus:outline-none focus:border-brand-500 transition"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="lifetime">Lifetime</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-text-muted mb-1">Allowed Models (optional)</label>
                  <QuotaModelPicker selected={formModels} onChange={setFormModels} />
                  <p className="text-xs text-text-muted mt-1">Leave empty to allow all models</p>
                </div>

                <div>
                  <label className="block text-sm text-text-muted mb-1">Notes</label>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-bg border border-border-subtle rounded-[10px] text-text-main focus:outline-none focus:border-brand-500 transition"
                    rows={2}
                  />
                </div>

                {error && (
                  <div className="rounded-[10px] bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button type="submit" variant="primary" fullWidth>
                    {editKey ? "Update" : "Create"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    fullWidth
                    onClick={() => setModalOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
