"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { runSync, isOnline, getPendingCount } from "@/lib/offline-api";

/** Runs sync when online; exposes online status and pending count for UI. */
export function useOfflineSync() {
  const queryClient = useQueryClient();
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState(0);

  const doSync = async () => {
    if (!isOnline()) return;
    const result = await runSync();
    if (result.replacedTempId) {
      const { tempId, realId } = result.replacedTempId;
      if (typeof window !== "undefined" && window.location.pathname === `/sheets/${tempId}`) {
        window.history.replaceState(null, "", `/sheets/${realId}`);
        queryClient.invalidateQueries({ queryKey: ["sheet", realId] });
        queryClient.invalidateQueries({ queryKey: ["sheets"] });
      }
    }
    if (result.synced > 0) {
      queryClient.invalidateQueries({ queryKey: ["sheets"] });
      queryClient.invalidateQueries({ queryKey: ["sheet"] });
    }
    const count = await getPendingCount();
    setPendingCount(count);
  };

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      doSync();
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    getPendingCount().then(setPendingCount);
    doSync();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      getPendingCount().then(setPendingCount);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return { online, pendingCount, runSync: doSync };
}
