"use client";

import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export default function OfflineBanner() {
  const online = useNetworkStatus();

  if (online) return null;

  return (
    <div className="bg-gray-900 text-white font-sans text-xs font-semibold uppercase tracking-wider text-center py-1.5">
      Offline — changes will sync when reconnected
    </div>
  );
}
