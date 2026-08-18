"use client";

import { useMemo, useState } from "react";
import { StandCard } from "@/components/stand-card";
import type { FarmStand } from "@/lib/types";

export function StandDirectory({ stands }: { stands: FarmStand[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const categories = useMemo(() => Array.from(new Set(stands.flatMap((stand) => stand.product_categories))).sort(), [stands]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return stands.filter((stand) => {
      const searchable = [stand.name, stand.city, stand.address, stand.description, ...stand.product_categories].filter(Boolean).join(" ").toLowerCase();
      return (!query || searchable.includes(query)) && (category === "All" || stand.product_categories.includes(category));
    });
  }, [stands, search, category]);

  return <>
    <div className="directory-tools">
      <label><span>Search farms</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Farm, town, or product…" /></label>
      {categories.length > 0 && <div className="filter-row" aria-label="Filter by product category">{["All", ...categories].map((item) => <button key={item} type="button" className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>}
    </div>
    {filtered.length > 0 ? <div className="stand-grid">{filtered.map((stand) => <StandCard key={stand.id} stand={stand} />)}</div> : <div className="empty-state"><span>🌾</span><h3>No matching farm stands yet.</h3><p>Try another town, product, or category.</p></div>}
  </>;
}
