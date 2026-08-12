"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardSkeleton } from "@/shared/components";
import { useNotificationStore } from "@/store/notificationStore";
import InvalidProviderGroup from "./components/InvalidProviderGroup";

export default function InvalidProvidersPage() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const notify = useNotificationStore();
  const fetchRef = useRef(0);

  const load = async () => {
    const seq = ++fetchRef.current;
    setLoading(true);
    try {
      const res = await fetch("/api/providers/invalid");
      const data = await res.json();
      if (seq !== fetchRef.current) return;
      setProviders(data?.providers || []);
    } catch (e) {
      if (seq !== fetchRef.current) return;
      notify.error("Failed to load invalid providers");
    } finally {
      if (seq === fetchRef.current) setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleBulk = async ({ action, ids }) => {
    const res = await fetch("/api/providers/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ids }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      notify.error(data?.error || "Bulk action failed");
      throw new Error(data?.error || "Bulk action failed");
    }
    const verb = { disable: "Disabled", delete: "Deleted", reset: "Reset last error for" }[action];
    notify.success(`${verb} ${data.affected ?? ids.length} connection(s).`);
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
        <p className="text-[14px] font-semibold text-amber-400">⚠ Invalid Providers</p>
        <p className="text-[13px] text-amber-500/90 mt-1">
          Provider connections with errors. Disable &amp; delete here are destructive — delete is a permanent hard delete that cannot be undone. Use with caution.
        </p>
      </div>

      {loading ? (
        <CardSkeleton />
      ) : providers.length === 0 ? (
        <Card><p className="p-4 text-[13px] text-text-muted">No invalid providers.</p></Card>
      ) : (
        providers.map((p) => (
          <InvalidProviderGroup key={p.provider} provider={p} onBulk={handleBulk} />
        ))
      )}
    </div>
  );
}
