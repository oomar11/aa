import {
  DEFAULT_STORE_URL,
  fetchStoreBridgeStatus,
  fetchStoreSafes,
  hasStoreBridgeCredentials,
  loadStoreBridgeConfig,
  MANAGED_BRIDGE_SECRET,
  saveStoreBridgeConfig,
  type StoreBridgeConfig,
} from "@/lib/store-bridge";

/**
 * Auto-link to store when the workshop server has WORKSHOP_BRIDGE_SECRET
 * (or production fallback). Also fills missing safeId.
 */
export async function ensureStoreBridgeBootstrapped(): Promise<StoreBridgeConfig | null> {
  if (typeof window === "undefined") return null;

  let existing = loadStoreBridgeConfig();

  try {
    const status = await fetchStoreBridgeStatus();
    if (status.configured) {
      const storeUrl = status.storeUrl || DEFAULT_STORE_URL;
      if (
        !existing ||
        !existing.managed ||
        existing.secret !== MANAGED_BRIDGE_SECRET ||
        existing.baseUrl !== storeUrl
      ) {
        const next: StoreBridgeConfig = {
          baseUrl: storeUrl,
          secret: MANAGED_BRIDGE_SECRET,
          safeId: existing?.safeId || "",
          safeName: existing?.safeName,
          enabled: true,
          updatedAt: new Date().toISOString(),
          managed: true,
        };
        saveStoreBridgeConfig(next);
        existing = next;
      }
    }
  } catch {
    /* status unavailable — keep local config */
  }

  if (!hasStoreBridgeCredentials(existing) || !existing) {
    return null;
  }

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

/** @deprecated Kept for call-site compatibility. */
export function defaultStoreBridgeUrl(): string {
  return DEFAULT_STORE_URL;
}
