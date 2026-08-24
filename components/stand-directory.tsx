"use client";

import { useMemo, useState } from "react";
import { MapPlaceholder } from "@/components/map-placeholder";
import { StandCard } from "@/components/stand-card";
import type { FarmStand } from "@/lib/types";

type UserLocation = { latitude: number; longitude: number };

function distanceInMiles(from: UserLocation, stand: FarmStand) {
  if (stand.latitude === null || stand.longitude === null) return null;
  const toRadians = (value: number) => value * Math.PI / 180;
  const earthRadiusMiles = 3958.8;
  const latitudeDelta = toRadians(stand.latitude - from.latitude);
  const longitudeDelta = toRadians(stand.longitude - from.longitude);
  const startLatitude = toRadians(from.latitude);
  const endLatitude = toRadians(stand.latitude);
  const value = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function StandDirectory({ stands }: { stands: FarmStand[] }) {
  const pageSize = 6;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationState, setLocationState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const categories = useMemo(() => Array.from(new Set(stands.flatMap((stand) => stand.product_categories))).sort(), [stands]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matches = stands.filter((stand) => {
      const searchable = [stand.name, stand.city, stand.address, stand.description, ...stand.product_categories].filter(Boolean).join(" ").toLowerCase();
      return (!query || searchable.includes(query)) && (category === "All" || stand.product_categories.includes(category));
    });
    if (!userLocation) return matches;
    return matches.map((stand, index) => ({ stand, index, distance: distanceInMiles(userLocation, stand) }))
      .sort((a, b) => (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY) || a.index - b.index)
      .map(({ stand }) => stand);
  }, [stands, search, category, userLocation]);

  const visible = filtered.slice(0, visibleCount);
  const remaining = Math.max(filtered.length - visible.length, 0);

  function updateSearch(value: string) {
    setSearch(value);
    setVisibleCount(pageSize);
  }

  function updateCategory(value: string) {
    setCategory(value);
    setVisibleCount(pageSize);
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setLocationState("error");
      return;
    }
    setLocationState("loading");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserLocation({ latitude: coords.latitude, longitude: coords.longitude });
        setVisibleCount(pageSize);
        setLocationState("ready");
      },
      () => setLocationState("error"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  return <>
    <div className="directory-tools">
      <label><span>What are you looking for?</span><input type="search" value={search} onChange={(event) => updateSearch(event.target.value)} placeholder="Try sweet corn, eggs, or Utica…" /></label>
      <div className="location-tools">
        <button type="button" className={locationState === "ready" ? "location-button active" : "location-button"} onClick={useMyLocation} disabled={locationState === "loading"}>
          {locationState === "loading" ? "Finding your location…" : locationState === "ready" ? "✓ Nearest farms first" : "⌖ Use my location"}
        </button>
        {locationState === "error" && <p role="status">We couldn’t access your location. You can still search by town.</p>}
      </div>
      {categories.length > 0 && <div className="filter-row" aria-label="Filter by product category">{["All", ...categories].map((item) => <button key={item} type="button" className={category === item ? "active" : ""} aria-pressed={category === item} onClick={() => updateCategory(item)}>{item}</button>)}</div>}
    </div>
    <MapPlaceholder stands={filtered} userLocation={userLocation} />
    {filtered.length > 0 ? <>
      <div className="results-heading" aria-live="polite">
        <div><p className="eyebrow">Matching stands</p><h3>{filtered.length} {filtered.length === 1 ? "farm found" : "farms found"}</h3></div>
        <p>Showing {visible.length} of {filtered.length}</p>
      </div>
      <div className="stand-grid">{visible.map((stand) => <StandCard key={stand.id} stand={stand} distanceMiles={userLocation ? distanceInMiles(userLocation, stand) : null} />)}</div>
      {remaining > 0 && <div className="show-more-row"><button type="button" className="show-more-button" onClick={() => setVisibleCount((count) => count + pageSize)}>Show {Math.min(pageSize, remaining)} more <span>↓</span></button><p>{remaining} remaining</p></div>}
    </> : <div className="empty-state"><span>🌾</span><h3>No matching farm stands yet.</h3><p>Try another town, product, or category.</p></div>}
  </>;
}
