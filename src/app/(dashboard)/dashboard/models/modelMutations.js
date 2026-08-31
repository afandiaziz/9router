async function responseError(response, fallback) {
  let message = fallback;
  try {
    const data = await response.json();
    if (data?.error) message = data.error;
  } catch {
    // Keep the operation-specific fallback for non-JSON responses.
  }
  return new Error(message);
}

export async function deleteModelMutation(fetchImpl, url, fallback) {
  const response = await fetchImpl(url, { method: "DELETE" });
  if (!response.ok) throw await responseError(response, fallback);
}

export async function saveModelAlias({ fetchImpl, aliasKey, previousAlias, nextAlias }) {
  if (nextAlias && nextAlias !== previousAlias) {
    const response = await fetchImpl("/api/models/alias", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: aliasKey, alias: nextAlias }),
    });
    if (!response.ok) throw await responseError(response, "Failed to save alias");
    if (previousAlias) {
      await deleteModelMutation(
        fetchImpl,
        `/api/models/alias?alias=${encodeURIComponent(previousAlias)}`,
        "Failed to delete previous alias"
      );
    }
  } else if (!nextAlias && previousAlias) {
    await deleteModelMutation(
      fetchImpl,
      `/api/models/alias?alias=${encodeURIComponent(previousAlias)}`,
      "Failed to delete alias"
    );
  }
}
