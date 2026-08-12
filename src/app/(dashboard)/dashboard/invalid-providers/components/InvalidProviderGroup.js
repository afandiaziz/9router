"use client";

import { useState } from "react";
import { Badge, Button, Card, ConfirmModal } from "@/shared/components";
import { getRelativeTime } from "@/shared/utils";
import ErrorStatusTabs from "./ErrorStatusTabs";

export default function InvalidProviderGroup({ provider, onBulk }) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(null);
  const [selected, setSelected] = useState({});
  const [confirmState, setConfirmState] = useState(null);
  const [busy, setBusy] = useState(false);

  const buckets = provider?.buckets || {};
  const tabs = Object.keys(buckets).sort((a, b) => b.length - a.length);
  const currentTab = activeTab ?? tabs[0];
  const rows = currentTab ? buckets[currentTab] || [] : [];
  const tabSelected = (selected[currentTab] || []).filter((id) => rows.some((r) => r.id === id));
  const allChecked = rows.length > 0 && tabSelected.length === rows.length;

  const toggleRow = (id) => {
    setSelected((prev) => {
      const cur = prev[currentTab] || [];
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      return { ...prev, [currentTab]: next };
    });
  };

  const toggleAll = () => {
    setSelected((prev) => ({
      ...prev,
      [currentTab]: allChecked ? [] : rows.map((r) => r.id),
    }));
  };

  const handleBulk = async () => {
    const { action, ids } = confirmState;
    setConfirmState(null);
    setBusy(true);
    try {
      await onBulk({ provider: provider.provider, action, ids });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center gap-3 w-full">
        <button
          type="button"
          className="flex flex-1 items-center gap-3 px-2 py-3 text-left"
          onClick={() => setExpanded((v) => !v)}
        >
          <span className="material-symbols-outlined text-[18px] text-text-muted">
            {expanded ? "expand_less" : "expand_more"}
          </span>
          <Badge variant="error" size="sm" dot>{provider.provider}</Badge>
          <span className="text-[13px] text-text-muted">{provider.total} invalid</span>
        </button>
      </div>

      {expanded && (
        <div className="px-2 pb-3">
          <ErrorStatusTabs buckets={buckets} activeTab={currentTab} onSelect={setActiveTab} />
          <div className="flex items-center gap-3 mb-2">
            <label className="flex items-center gap-2 text-[13px] cursor-pointer">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={toggleAll}
                className="accent-primary"
              />
              Select all ({rows.length})
            </label>
            <Button
              variant="secondary"
              size="sm"
              disabled={tabSelected.length === 0 || busy}
              onClick={() => setConfirmState({ action: "reset", ids: [...tabSelected], title: "Reset last error?", message: `Reset last error for ${tabSelected.length} connection(s)? This clears their error status but keeps the connection.` })}
            >
              Reset selected
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="!border-amber-500/40 !text-amber-400 hover:!bg-amber-500/10"
              disabled={tabSelected.length === 0 || busy}
              onClick={() => setConfirmState({ action: "disable", ids: [...tabSelected], title: "Disable selected?", message: `Disable ${tabSelected.length} connection(s) for ${provider.provider}?` })}
            >
              Disable selected
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={tabSelected.length === 0 || busy}
              onClick={() => setConfirmState({ action: "delete", ids: [...tabSelected], title: "Permanently delete?", message: `Permanently delete ${tabSelected.length} connection(s) for ${provider.provider}? This is a hard delete and cannot be undone.` })}
            >
              Delete selected
            </Button>
          </div>

          {rows.length === 0 ? (
            <p className="text-[13px] text-text-muted py-4">No connections in this bucket.</p>
          ) : (
            <table className="w-full text-left text-[13px]">
              <tbody>
                {rows.map((conn) => {
                  const checked = tabSelected.includes(conn.id);
                  return (
                    <tr key={conn.id} className="border-t border-border/50">
                      <td className="py-2 pr-2 w-8">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRow(conn.id)}
                          className="accent-primary"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <span className="text-text-main truncate max-w-[280px]">{conn.email || conn.name || conn.id.slice(0, 8)}</span>
                      </td>
                      <td className="py-2 pr-3">
                        <span className="text-text-muted">{conn.authType}</span>
                        {conn.isActive === false && <Badge variant="warning" size="sm">disabled</Badge>}
                      </td>
                      <td className="py-2 pr-3 text-red-500 truncate max-w-[260px]">{conn.lastError}</td>
                      <td className="py-2 text-text-muted whitespace-nowrap">{conn.lastErrorAt ? getRelativeTime(conn.lastErrorAt) : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={handleBulk}
        title={confirmState?.title || "Confirm"}
        message={confirmState?.message}
        variant={confirmState?.action === "reset" ? "primary" : "danger"}
        loading={busy}
      />
    </Card>
  );
}
