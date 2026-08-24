"use client";

import dynamic from "next/dynamic";
import type { FarmStand } from "@/lib/types";

const FarmMap = dynamic(() => import("@/components/farm-map").then((module) => module.FarmMap), {
  ssr: false,
  loading: () => <div className="map-loading">Loading farm map…</div>,
});

export function MapPlaceholder({ stands, userLocation = null }: { stands: FarmStand[]; userLocation?: { latitude: number; longitude: number } | null }) {
  const mapped = stands.filter((stand) => stand.latitude !== null && stand.longitude !== null);

  return (
    <section className="map-panel" aria-labelledby="map-title">
      <div className="map-copy">
        <p className="eyebrow">Explore the region</p>
        <h2 id="map-title">Browse the map. Follow what’s fresh.</h2>
        <p>
          {mapped.length > 0
            ? `${mapped.length} matching ${mapped.length === 1 ? "stand" : "stands"} on the map. Search or choose a category to narrow the view.`
            : "Farm locations will appear here as they are added."}
        </p>
      </div>
      <div className="map-canvas" aria-label="Interactive map of active farm stands">
        {mapped.length > 0 ? <FarmMap stands={mapped} userLocation={userLocation} /> : <div className="map-loading">Add coordinates to place farms on the map.</div>}
      </div>
    </section>
  );
}
