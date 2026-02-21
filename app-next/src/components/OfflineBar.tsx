"use client";

import { useOfflineSync } from "@/hooks/useOfflineSync";

export function OfflineBar() {
  const { online, pendingCount } = useOfflineSync();

  if (online && pendingCount === 0) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-lg"
      role="status"
      aria-live="polite"
    >
      {!online ? (
        <span>Offline — changes saved locally and will sync when you’re back online.</span>
      ) : (
        <span>Syncing {pendingCount} change{pendingCount !== 1 ? "s" : ""}…</span>
      )}
    </div>
  );
}
