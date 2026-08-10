import {
  DEFAULT_STORE_URL,
  fetchStoreSafes,
  hasStoreBridgeCredentials,
  loadStoreBridgeConfig,
  type StoreBridgeConfig,
} from "@/lib/store-bridge";

/**
 * Ensure workshop has store credentials in localStorage.
 * Does NOT invent a secret — only fills missing safeId when already linked.
 */
export async function ensureStoreBridgeBootstrapped(): Promise<StoreBridgeConfig | null> {
  if (typeof window === "undefined") return null;

  const existing = loadStoreBridgeConfig();
  if (!hasStoreBridgeCredentials(existing) || !existing) {
    return null;
  }

  if (existing.safeId) return existing;

  try {
    const safes = await fetchStoreSafes(existing);
    const chosen = safes[0];
    if (!chosen) return existing;
    const { saveStoreBridgeConfig } = await import("@/lib/store-bridge");
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

/** @deprecated Kept for call-site compatibility — no longer auto-connects. */
export function defaultStoreBridgeUrl(): string {
  return DEFAULT_STORE_URL;
}
