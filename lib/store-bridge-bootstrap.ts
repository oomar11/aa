import {
  DEFAULT_BRIDGE_SECRET,
  DEFAULT_STORE_URL,
  fetchStoreSafes,
  hasStoreBridgeCredentials,
  loadStoreBridgeConfig,
  saveStoreBridgeConfig,
  type StoreBridgeConfig,
} from "@/lib/store-bridge";

/**
 * Ensure workshop has store credentials in localStorage.
 * Uses saved config when present; otherwise tries defaults and picks first safe.
 */
export async function ensureStoreBridgeBootstrapped(): Promise<StoreBridgeConfig | null> {
  if (typeof window === "undefined") return null;

  const existing = loadStoreBridgeConfig();
  if (hasStoreBridgeCredentials(existing) && existing) {
    // If safe missing, try to fill it so money sync also works
    if (existing.safeId) return existing;
    try {
      const safes = await fetchStoreSafes(existing);
      const chosen = safes[0];
      if (!chosen) return existing;
      const next: StoreBridgeConfig = {
        ...existing,
        safeId: chosen.id,
        safeName: chosen.name,
        enabled: true,
      };
      saveStoreBridgeConfig(next);
      return next;
    } catch {
      return existing;
    }
  }

  try {
    const draft = {
      baseUrl: DEFAULT_STORE_URL,
      secret: DEFAULT_BRIDGE_SECRET,
    };
    const safes = await fetchStoreSafes(draft);
    const chosen = safes[0];
    const next: StoreBridgeConfig = {
      baseUrl: draft.baseUrl,
      secret: draft.secret,
      safeId: chosen?.id || "",
      safeName: chosen?.name,
      enabled: true,
      updatedAt: new Date().toISOString(),
    };
    saveStoreBridgeConfig(next);
    return next;
  } catch {
    return null;
  }
}
