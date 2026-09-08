"use client";

import { useMemo, useState } from "react";
import type { FarmStand } from "@/lib/types";
import { StandCard } from "@/components/stand-card";

type Location = { latitude: number; longitude: number };
function distanceMiles(from: Location, stand: FarmStand) {
  if (stand.latitude === null || stand.longitude === null) return null;
  const r = (n: number) => n * Math.PI / 180;
  const dLat = r(stand.latitude - from.latitude), dLon = r(stand.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(r(from.latitude)) * Math.cos(r(stand.latitude)) * Math.sin(dLon / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function freshAvailable(stand: FarmStand) {
  if (!stand.farmer_inventory_updated_at) return false;
  const age = Date.now() - new Date(stand.farmer_inventory_updated_at).getTime();
  return age >= 0 && age < 7 * 24 * 60 * 60 * 1000 && (stand.inventory ?? []).some((item) => item.status === "available" || item.status === "low");
}

export function AvailableNearMe({ stands }: { stands: FarmStand[] }) {
  const [location, setLocation] = useState<Location | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const nearby = useMemo(() => location ? stands.filter(freshAvailable).map((stand) => ({ stand, distance: distanceMiles(location, stand) })).filter((entry) => entry.distance !== null).sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)).slice(0, 6) : [], [location, stands]);

  function find() {
    if (!navigator.geolocation) { setState("error"); return; }
    setState("loading");
    navigator.geolocation.getCurrentPosition((position) => { setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }); setState("ready"); }, () => setState("error"), { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  }

  return <section className="shell" style={{ paddingTop: "2rem" }}>
    <div className="notice" style={{ padding: "1.5rem", background: "#eef5e4", borderColor: "#b7c9a7" }}>
      <p className="eyebrow">📍 Available Near Me</p><h2 style={{ margin: ".35rem 0 .65rem", color: "var(--forest)" }}>What can I actually get nearby right now?</h2>
      <p>Show farms with farmer-confirmed availability from the last 7 days, sorted by distance from you.</p>
      <button type="button" className="primary-button" onClick={find} disabled={state === "loading"} style={{ border: 0, cursor: "pointer" }}>{state === "loading" ? "Finding fresh food…" : state === "ready" ? "↻ Refresh my location" : "⌖ Show available near me"}</button>
      {state === "error" && <p role="status" style={{ marginTop: "1rem" }}>Location wasn’t available. You can still use the full FarmFinder search below.</p>}
    </div>
    {state === "ready" && <div style={{ marginTop: "1.5rem" }}><div className="section-heading" style={{ marginBottom: "1rem" }}><div><p className="eyebrow">Fresh nearby</p><h2>{nearby.length ? `${nearby.length} nearby farms with fresh updates` : "No fresh nearby updates yet"}</h2></div></div>{nearby.length > 0 ? <div className="stand-grid">{nearby.map(({ stand, distance }) => <StandCard key={stand.id} stand={stand} distanceMiles={distance} />)}</div> : <div className="empty-state"><span>🌱</span><h3>Nothing freshly confirmed nearby yet.</h3><p>Try the full search below—farms may still carry what you need even if they haven’t updated recently.</p></div>}</div>}
  </section>;
}
