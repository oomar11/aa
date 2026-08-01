"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  getWorkshopSyncStatus,
  startWorkshopSync,
  WORKSHOP_SYNC_EVENT,
  type WorkshopSyncStatus,
} from "@/lib/storage/shared-client";

const SharedDataContext = createContext<WorkshopSyncStatus | null>(null);

/**
 * يحمّل بيانات الورشة المشتركة من السيرفر ويُبقي الأجهزة متزامنة.
 */
export function SharedDataProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<WorkshopSyncStatus>(() =>
    getWorkshopSyncStatus()
  );

  useEffect(() => {
    const stop = startWorkshopSync();
    const onSync = () => setStatus(getWorkshopSyncStatus());
    window.addEventListener(WORKSHOP_SYNC_EVENT, onSync);
    return () => {
      stop();
      window.removeEventListener(WORKSHOP_SYNC_EVENT, onSync);
    };
  }, []);

  return (
    <SharedDataContext.Provider value={status}>
      {children}
    </SharedDataContext.Provider>
  );
}

export function useWorkshopSync(): WorkshopSyncStatus {
  const ctx = useContext(SharedDataContext);
  return ctx ?? getWorkshopSyncStatus();
}
