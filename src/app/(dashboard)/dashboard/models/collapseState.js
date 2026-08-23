export function createCollapsedGroupSet(groups = []) {
  return new Set(
    groups
      .map((group) => group?.key)
      .filter((key) => typeof key === "string" && key.length > 0)
  );
}
