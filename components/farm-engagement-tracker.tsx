"use client";

import { useEffect } from "react";

export function recordFarmEvent(farmId: string, eventType: string) {
  void fetch("/api/farm-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ farmId, eventType }),
    keepalive: true,
  }).catch(() => undefined);
}

export function FarmEngagementTracker({ farmId }: { farmId: string }) {
  useEffect(() => {
    const viewedKey = `farmfinder-viewed-${farmId}`;
    const lastViewed = Number(sessionStorage.getItem(viewedKey) ?? 0);
    if (Date.now() - lastViewed > 30 * 60 * 1000) {
      recordFarmEvent(farmId, "detail_view");
      sessionStorage.setItem(viewedKey, String(Date.now()));
    }

    const trackClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>("[data-farm-event]");
      const eventType = target?.dataset.farmEvent;
      if (eventType) recordFarmEvent(farmId, eventType);
    };
    document.addEventListener("click", trackClick);
    return () => document.removeEventListener("click", trackClick);
  }, [farmId]);

  return null;
}
