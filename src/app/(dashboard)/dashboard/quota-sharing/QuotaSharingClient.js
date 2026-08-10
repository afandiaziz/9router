"use client";

import { useState, useEffect } from "react";
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

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quota Sharing</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
        >
          New Quota Key
        </button>
      </div>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      <div className="bg-gray-900 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Key</th>
              <th className="px-4 py-3 text-left">Models</th>
              <th className="px-4 py-3 text-left">Limit</th>
              <th className="px-4 py-3 text-left">Used</th>
              <th className="px-4 py-3 text-left">Period</th>
              <th className="px-4 py-3 text-left">Resets</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                  No quota keys yet. Create one to share API access.
                </td>
              </tr>
            ) : (
              keys.map((k) => (
                <tr key={k.id} className="border-t border-gray-800">
                  <td className="px-4 py-3">{k.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{k.keyPrefix}</td>
                  <td className="px-4 py-3">
                    {k.allowedModels?.length > 0 ? (
                      <span className="text-xs bg-gray-800 px-2 py-1 rounded">
                        {k.allowedModels.length} model{k.allowedModels.length !== 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">All</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {k.limit ? k.limit.toLocaleString() : "∞"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-24">
                      <div className="flex justify-between text-xs mb-1">
                        <span>{k.progress?.tokensUsed?.toLocaleString() || 0}</span>
                        <span>{k.progress?.percent != null ? `${k.progress.percent}%` : "—"}</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            k.progress?.percent > 90 ? "bg-red-500" : k.progress?.percent > 70 ? "bg-yellow-500" : "bg-blue-500"
                          }`}
                          style={{ width: `${k.progress?.percent || 0}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">{k.limitPeriod}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {k.progress?.resetAt ? new Date(k.progress.resetAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(k.id, !k.isActive)}
                      className={`px-2 py-1 rounded text-xs ${
                        k.isActive ? "bg-green-900 text-green-300" : "bg-gray-700 text-gray-400"
                      }`}
                    >
                      {k.isActive ? "Active" : "Disabled"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(k)}
                        className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleRegenerate(k.id)}
                        className="px-2 py-1 text-xs bg-yellow-700 hover:bg-yellow-600 rounded"
                      >
                        Regen
                      </button>
                      <button
                        onClick={() => handleDelete(k.id)}
                        className="px-2 py-1 text-xs bg-red-700 hover:bg-red-600 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editKey ? "Edit" : "Create"} Quota Key</h2>

            {createdKey ? (
              <div className="space-y-4">
                <p className="text-green-400">Key created successfully!</p>
                <div className="bg-gray-800 p-3 rounded font-mono text-sm break-all">
                  {createdKey.key}
                </div>
                <button
                  onClick={copyKey}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded"
                >
                  Copy to Clipboard
                </button>
                <button
                  onClick={() => { setModalOpen(false); setCreatedKey(null); resetForm(); }}
                  className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-400 mb-1">Token Limit</label>
                    <input
                      type="number"
                      value={formLimit}
                      onChange={(e) => setFormLimit(e.target.value)}
                      disabled={formUnlimited}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500 disabled:opacity-50"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formUnlimited}
                        onChange={(e) => setFormUnlimited(e.target.checked)}
                        className="rounded border-gray-600 bg-gray-800"
                      />
                      <span className="text-sm">Unlimited</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Reset Period</label>
                  <select
                    value={formPeriod}
                    onChange={(e) => setFormPeriod(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="lifetime">Lifetime</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Allowed Models (optional)</label>
                  <QuotaModelPicker selected={formModels} onChange={setFormModels} />
                  <p className="text-xs text-gray-500 mt-1">Leave empty to allow all models</p>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Notes</label>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
                    rows={2}
                  />
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium"
                  >
                    {editKey ? "Update" : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
