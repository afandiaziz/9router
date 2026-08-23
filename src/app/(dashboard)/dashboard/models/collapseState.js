export function createCollapsedGroupSet(groups = []) {
  return new Set(
    groups
      .map((group) => group?.key)
      .filter((key) => typeof key === "string" && key.length > 0)
  );
}

export function getInitialCollapsedGroupSet({
  groups = [],
  loading = true,
  initialCollapseApplied = false,
} = {}) {
  if (loading || initialCollapseApplied || groups.length === 0) return null;

  return createCollapsedGroupSet(groups);
}
