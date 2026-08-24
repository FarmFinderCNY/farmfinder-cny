"use client";

import { useMemo, useState } from "react";
import { MapPlaceholder } from "@/components/map-placeholder";
import { StandCard } from "@/components/stand-card";
import type { FarmStand } from "@/lib/types";

export function StandDirectory({ stands }: { stands: FarmStand[] }) {
const pageSize = 6;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const categories = useMemo(() => Array.from(new Set(stands.flatMap((stand) => stand.product_categories))).sort(), [stands]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return stands.filter((stand) => {
      const searchable = [stand.name, stand.city, stand.address, stand.description, ...stand.product_categories].filter(Boolean).join(" ").toLowerCase();
      return (!query || searchable.includes(query)) && (category === "All" || stand.product_categories.includes(category));
    });
  }, [stands, search, category]);

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

  return <>
    <div className="directory-tools">
      <label><span>What are you looking for?</span><input type="search" value={search} onChange={(event) => updateSearch(event.target.value)} placeholder="Try sweet corn, eggs, or Utica…" /></label>
      {categories.length > 0 && <div className="filter-row" aria-label="Filter by product category">{["All", ...categories].map((item) => <button key={item} type="button" className={category === item ? "active" : ""} aria-pressed={category === item} onClick={() => updateCategory(item)}>{item}</button>)}</div>}
    </div>
    <MapPlaceholder stands={filtered} />
    {filtered.length > 0 ? <>
      <div className="results-heading" aria-live="polite">
        <div><p className="eyebrow">Matching stands</p><h3>{filtered.length} {filtered.length === 1 ? "farm found" : "farms found"}</h3></div>
        <p>Showing {visible.length} of {filtered.length}</p>
      </div>
      <div className="stand-grid">{visible.map((stand) => <StandCard key={stand.id} stand={stand} />)}</div>
      {remaining > 0 && <div className="show-more-row"><button type="button" className="show-more-button" onClick={() => setVisibleCount((count) => count + pageSize)}>Show {Math.min(pageSize, remaining)} more <span>↓</span></button><p>{remaining} remaining</p></div>}
    </> : <div className="empty-state"><span>🌾</span><h3>No matching farm stands yet.</h3><p>Try another town, product, or category.</p></div>}
  </>;
}
