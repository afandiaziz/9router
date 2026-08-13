import { cn } from "@/shared/utils/cn";

// Dynamic tab bar of error-status buckets. Each tab shows the bucket tag and
// its count. Only buckets with data appear (derived from Object.keys).
export default function ErrorStatusTabs({ buckets, activeTab, onSelect }) {
  const tabs = Object.keys(buckets || {}).sort((a, b) => b.length - a.length);
  if (tabs.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 border-b border-border pb-3 mb-3">
      {tabs.map((tag) => {
        const count = (buckets[tag] || []).length;
        const active = tag === activeTab;
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onSelect(tag)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              active
                ? "bg-primary/10 text-primary"
                : "text-text-muted hover:bg-surface-2 hover:text-text-main"
            )}
          >
            {tag} <span className="opacity-60">({count})</span>
          </button>
        );
      })}
    </div>
  );
}
