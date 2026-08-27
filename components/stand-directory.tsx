"use client";

import { useMemo, useState } from "react";
import { MapPlaceholder } from "@/components/map-placeholder";
import { StandCard } from "@/components/stand-card";
import type { FarmStand } from "@/lib/types";

type UserLocation = { latitude: number; longitude: number };

const VEGETABLES = [
  "Asparagus",
  "Beans",
  "Beets",
  "Broccoli",
  "Brussels sprouts",
  "Cabbage",
  "Carrots",
  "Cauliflower",
  "Celery",
  "Corn",
  "Cucumbers",
  "Eggplant",
  "Garlic",
  "Greens",
  "Kale",
  "Lettuce",
  "Onions",
  "Peas",
  "Peppers",
  "Potatoes",
  "Pumpkins",
  "Radishes",
  "Spinach",
  "Squash",
  "Sweet potatoes",
  "Tomatoes",
  "Turnips",
  "Zucchini",
] as const;

const SEASONAL_BY_MONTH: Record<number, readonly string[]> = {
  0: ["Potatoes", "Onions", "Garlic", "Cabbage", "Carrots", "Beets", "Turnips"],
  1: ["Potatoes", "Onions", "Garlic", "Cabbage", "Carrots", "Beets", "Turnips"],
  2: ["Potatoes", "Onions", "Garlic", "Cabbage", "Carrots", "Beets", "Turnips"],
  3: ["Asparagus", "Greens", "Lettuce", "Radishes", "Spinach"],
  4: ["Asparagus", "Greens", "Lettuce", "Peas", "Radishes", "Spinach"],
  5: ["Asparagus", "Beans", "Beets", "Broccoli", "Cabbage", "Carrots", "Greens", "Lettuce", "Peas", "Radishes", "Spinach", "Zucchini"],
  6: ["Beans", "Beets", "Broccoli", "Cabbage", "Carrots", "Corn", "Cucumbers", "Eggplant", "Greens", "Lettuce", "Onions", "Peppers", "Potatoes", "Squash", "Tomatoes", "Zucchini"],
  7: ["Beans", "Beets", "Broccoli", "Cabbage", "Carrots", "Corn", "Cucumbers", "Eggplant", "Garlic", "Greens", "Onions", "Peppers", "Potatoes", "Squash", "Tomatoes", "Zucchini"],
  8: ["Beans", "Beets", "Broccoli", "Brussels sprouts", "Cabbage", "Carrots", "Cauliflower", "Corn", "Cucumbers", "Eggplant", "Garlic", "Greens", "Kale", "Onions", "Peppers", "Potatoes", "Pumpkins", "Squash", "Tomatoes", "Turnips", "Zucchini"],
  9: ["Beets", "Broccoli", "Brussels sprouts", "Cabbage", "Carrots", "Cauliflower", "Garlic", "Greens", "Kale", "Onions", "Potatoes", "Pumpkins", "Squash", "Sweet potatoes", "Turnips"],
  10: ["Beets", "Brussels sprouts", "Cabbage", "Carrots", "Garlic", "Kale", "Onions", "Potatoes", "Pumpkins", "Squash", "Sweet potatoes", "Turnips"],
  11: ["Potatoes", "Onions", "Garlic", "Cabbage", "Carrots", "Beets", "Turnips"],
};

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

function productMatches(productName: string, vegetable: string) {
  const product = productName.toLowerCase();
  const target = vegetable.toLowerCase();
  if (target === "corn") return product.includes("corn");
  if (target === "greens") return product.includes("green") || product.includes("chard") || product.includes("collard");
  if (target === "squash") return product.includes("squash");
  if (target === "beans") return product.includes("bean");
  if (target === "peas") return product.includes("pea");
  if (target === "peppers") return product.includes("pepper");
  if (target === "potatoes") return product.includes("potato");
  if (target === "tomatoes") return product.includes("tomato");
  if (target === "onions") return product.includes("onion");
  if (target === "carrots") return product.includes("carrot");
  if (target === "cucumbers") return product.includes("cucumber");
  if (target === "pumpkins") return product.includes("pumpkin");
  if (target === "radishes") return product.includes("radish");
  if (target === "turnips") return product.includes("turnip");
  return product.includes(target);
}

export function StandDirectory({ stands }: { stands: FarmStand[] }) {
  const pageSize = 6;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedVegetables, setSelectedVegetables] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationState, setLocationState] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const categories = useMemo(
    () => Array.from(new Set(stands.flatMap((stand) => stand.product_categories))).sort(),
    [stands],
  );

  const standardCategories = categories.filter(
    (item) => item.toLowerCase() !== "produce" && item.toLowerCase() !== "seasonal",
  );

  const seasonalProduce = useMemo(() => SEASONAL_BY_MONTH[new Date().getMonth()] ?? [], []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return stands
      .map((stand, index) => {
        const inventory = stand.inventory ?? [];
        const matchingProducts = query
          ? inventory.filter((product) => product.name.toLowerCase().includes(query))
          : inventory;

        const searchable = [
          stand.name,
          stand.city,
          stand.address,
          stand.description,
          ...stand.product_categories,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch = !query || searchable.includes(query) || matchingProducts.length > 0;

        let matchesCategory = category === "All";

        if (category === "Produce") {
          if (selectedVegetables.length === 0) {
            matchesCategory =
              stand.product_categories.some((item) => item.toLowerCase() === "produce") ||
              inventory.some((product) => VEGETABLES.some((vegetable) => productMatches(product.name, vegetable)));
          } else {
            matchesCategory = inventory.some((product) =>
              selectedVegetables.some((vegetable) => productMatches(product.name, vegetable)),
            );
          }
        } else if (category === "Seasonal") {
          matchesCategory = inventory.some((product) =>
            seasonalProduce.some((vegetable) => productMatches(product.name, vegetable)),
          );
        } else if (category !== "All") {
          matchesCategory = stand.product_categories.includes(category);
        }

        const availabilityRank = matchingProducts.some((product) => product.status === "available")
          ? 0
          : matchingProducts.some((product) => product.status === "low")
            ? 1
            : matchingProducts.some((product) => product.status === "sold_out")
              ? 2
              : 3;

        return {
          stand,
          index,
          matchesSearch,
          matchesCategory,
          availabilityRank,
          distance: userLocation ? distanceInMiles(userLocation, stand) : null,
          freshness: stand.farmer_inventory_updated_at ? new Date(stand.farmer_inventory_updated_at).getTime() : 0,
        };
      })
      .filter((result) => result.matchesSearch && result.matchesCategory)
      .sort((a, b) => {
        if (a.availabilityRank !== b.availabilityRank) return a.availabilityRank - b.availabilityRank;

        if (userLocation) {
          const distanceDifference =
            (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY);
          if (distanceDifference !== 0) return distanceDifference;
        }

        if (a.freshness !== b.freshness) return b.freshness - a.freshness;
        return a.index - b.index;
      })
      .map(({ stand }) => stand);
  }, [stands, search, category, selectedVegetables, seasonalProduce, userLocation]);

  const visible = filtered.slice(0, visibleCount);
  const remaining = Math.max(filtered.length - visible.length, 0);

  function updateSearch(value: string) {
    setSearch(value);
    setVisibleCount(pageSize);
  }

  function updateCategory(value: string) {
    setCategory(value);
    if (value !== "Produce") setSelectedVegetables([]);
    setVisibleCount(pageSize);
  }

  function toggleVegetable(vegetable: string) {
    setSelectedVegetables((current) =>
      current.includes(vegetable)
        ? current.filter((item) => item !== vegetable)
        : [...current, vegetable],
    );
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
      <label>
        <span>What are you looking for?</span>
        <input type="search" value={search} onChange={(event) => updateSearch(event.target.value)} placeholder="Try sweet corn, eggs, or Utica…" />
      </label>

      <div className="location-tools">
        <button type="button" className={locationState === "ready" ? "location-button active" : "location-button"} onClick={useMyLocation} disabled={locationState === "loading"}>
          {locationState === "loading" ? "Finding your location…" : locationState === "ready" ? "✓ Nearest farms first" : "⌖ Use my location"}
        </button>
        {locationState === "error" && <p role="status">We couldn’t access your location. You can still search by town.</p>}
      </div>

      <div className="filter-row" aria-label="Filter by product category">
        {["All", "Seasonal", "Produce", ...standardCategories].map((item) => (
          <button key={item} type="button" className={category === item ? "active" : ""} aria-pressed={category === item} onClick={() => updateCategory(item)}>
            {item === "Seasonal" ? "🌱 Seasonal" : item === "Produce" ? "🥕 Produce" : item}
          </button>
        ))}
      </div>

      {category === "Produce" && (
        <div className="produce-picker">
          <div className="produce-picker-heading">
            <div>
              <strong>Choose vegetables</strong>
              <p>Select as many as you want. Farms with any selected item will appear.</p>
            </div>
            {selectedVegetables.length > 0 && (
              <button type="button" className="produce-clear" onClick={() => setSelectedVegetables([])}>Clear</button>
            )}
          </div>
          <div className="produce-options">
            {VEGETABLES.map((vegetable) => (
              <label key={vegetable} className={selectedVegetables.includes(vegetable) ? "selected" : ""}>
                <input type="checkbox" checked={selectedVegetables.includes(vegetable)} onChange={() => toggleVegetable(vegetable)} />
                <span>{vegetable}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {category === "Seasonal" && (
        <div className="seasonal-note" role="status">
          <strong>🌱 In season now</strong>
          <p>{seasonalProduce.join(", ")}</p>
        </div>
      )}
    </div>

    <MapPlaceholder stands={filtered} userLocation={userLocation} />

    <aside className="availability-guide" aria-label="How product availability is shown">
      <strong>How availability works</strong>
      <p><b>Available today</b> appears for seven days after a farmer updates their products. After that, <b>Usually offers</b> shows their general selection until they update again. Farms that have not posted their first update do not show availability wording.</p>
    </aside>

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
