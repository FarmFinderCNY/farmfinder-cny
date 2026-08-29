"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPlaceholder } from "@/components/map-placeholder";
import { StandCard } from "@/components/stand-card";
import type { FarmStand } from "@/lib/types";
import { GROWING_PRACTICE_OPTIONS, getGrowingPracticeLabel } from "@/lib/growing-practices";

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

const PRACTICE_SEARCH_TERMS: Record<string, string[]> = {
  certified_organic: ["organic", "certified organic", "usda organic"],
  no_synthetic_pesticides: ["no pesticides", "pesticide free", "no synthetic pesticides", "chemical free", "spray free", "no spray"],
  no_synthetic_herbicides: ["no herbicides", "herbicide free", "no synthetic herbicides", "weed killer free"],
  integrated_pest_management: ["integrated pest management", "ipm"],
  conventional: ["conventional", "conventional growing"],
  varies_by_product: ["varies by product", "varies by crop"],
  ask_the_farmer: ["ask the farmer", "growing practices"],
};

const SEARCH_SYNONYM_GROUPS = [
  ["produce", "vegetable", "vegetables", "veggie", "veggies"],
  ["sweet corn", "sweetcorn", "corn on the cob"],
  ["farm stand", "farmstand", "roadside stand"],
  ["pesticide free", "no pesticides", "no synthetic pesticides", "chemical free", "spray free", "no spray"],
  ["herbicide free", "no herbicides", "no synthetic herbicides", "weed killer free"],
  ["certified organic", "usda organic", "organic farm", "organic"],
  ["integrated pest management", "ipm"],
  ["baked goods", "baked", "bakery"],
  ["egg", "eggs", "farm fresh eggs"],
  ["maple", "maple syrup"],
  ["beef", "cow", "cattle"],
  ["pork", "pig"],
] as const;

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function expandedSearchTerms(query: string) {
  const normalized = normalizeSearchText(query);
  const group = SEARCH_SYNONYM_GROUPS.find((items) => items.some((item) => normalizeSearchText(item) === normalized));
  return group ? Array.from(new Set(group.map(normalizeSearchText))) : [normalized];
}

function editDistanceAtMostOne(left: string, right: string) {
  if (left === right) return true;
  if (Math.abs(left.length - right.length) > 1) return false;
  let edits = 0;
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (left.length > right.length) leftIndex += 1;
    else if (right.length > left.length) rightIndex += 1;
    else {
      leftIndex += 1;
      rightIndex += 1;
    }
  }
  return edits + Number(leftIndex < left.length || rightIndex < right.length) <= 1;
}

function matchesWithLightTypoTolerance(query: string, searchable: string) {
  const queryWords = normalizeSearchText(query).split(" ").filter(Boolean);
  const searchableWords = new Set(normalizeSearchText(searchable).split(" ").filter(Boolean));
  return queryWords.length > 0 && queryWords.every((queryWord) =>
    searchableWords.has(queryWord) ||
    (queryWord.length >= 5 && Array.from(searchableWords).some((word) => editDistanceAtMostOne(queryWord, word))),
  );
}

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
  const [selectedPractices, setSelectedPractices] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationState, setLocationState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const resultsRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(
    () => Array.from(new Set(stands.flatMap((stand) => stand.product_categories))).sort(),
    [stands],
  );

  const standardCategories = categories.filter(
    (item) => item.toLowerCase() !== "produce" && item.toLowerCase() !== "seasonal",
  );

  const seasonalProduce = useMemo(() => SEASONAL_BY_MONTH[new Date().getMonth()] ?? [], []);

  const filtered = useMemo(() => {
    const query = normalizeSearchText(search);
    const queryTerms = expandedSearchTerms(query);

    return stands
      .map((stand, index) => {
        const inventory = stand.inventory ?? [];
        const matchingProducts = query
          ? inventory.filter((product) => {
              const productName = normalizeSearchText(product.name);
              return queryTerms.some((term) => productName.includes(term)) || matchesWithLightTypoTolerance(query, productName);
            })
          : inventory;

        const searchable = normalizeSearchText([
          stand.name,
          stand.city,
          stand.address,
          stand.description,
          ...stand.product_categories,
          ...(stand.growing_practices ?? []).flatMap((practice) => [
            getGrowingPracticeLabel(practice),
            ...(PRACTICE_SEARCH_TERMS[practice] ?? []),
          ]),
          stand.growing_practices_note,
          stand.organic_certifier,
        ].filter(Boolean).join(" "));

        const matchesSearch = !query ||
          queryTerms.some((term) => searchable.includes(term)) ||
          matchesWithLightTypoTolerance(query, searchable) ||
          matchingProducts.length > 0;

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
        } else if (category === "Growing practices") {
          const practices = stand.growing_practices ?? [];
          matchesCategory = selectedPractices.length === 0
            ? practices.length > 0
            : selectedPractices.some((practice) => practices.includes(practice));
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
  }, [stands, search, category, selectedVegetables, selectedPractices, seasonalProduce, userLocation]);

  useEffect(() => {
    if (search.trim().length < 2) return;

    const scrollTimer = window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 1500);

    return () => window.clearTimeout(scrollTimer);
  }, [search]);

  const visible = filtered.slice(0, visibleCount);
  const remaining = Math.max(filtered.length - visible.length, 0);

  function updateSearch(value: string) {
    setSearch(value);
    setVisibleCount(pageSize);
  }

  function updateCategory(value: string) {
    setCategory(value);
    if (value !== "Produce") setSelectedVegetables([]);
    if (value !== "Growing practices") setSelectedPractices([]);
    setVisibleCount(pageSize);
  }

  function togglePractice(practice: string) {
    setSelectedPractices((current) => current.includes(practice)
      ? current.filter((item) => item !== practice)
      : [...current, practice]);
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
        <input type="search" value={search} onChange={(event) => updateSearch(event.target.value)} placeholder="Try sweet corn, no pesticides, or Utica…" />
      </label>

      <div className="location-tools">
        <button type="button" className={locationState === "ready" ? "location-button active" : "location-button"} onClick={useMyLocation} disabled={locationState === "loading"}>
          {locationState === "loading" ? "Finding your location…" : locationState === "ready" ? "✓ Nearest farms first" : "⌖ Use my location"}
        </button>
        {locationState === "error" && <p role="status">We couldn’t access your location. You can still search by town.</p>}
      </div>

      <div className="filter-row" aria-label="Filter by product category">
        {["All", "Seasonal", "Produce", "Growing practices", ...standardCategories].map((item) => (
          <button key={item} type="button" className={category === item ? "active" : ""} aria-pressed={category === item} onClick={() => updateCategory(item)}>
            {item === "Seasonal" ? "🌱 Seasonal" : item === "Produce" ? "🥕 Produce" : item === "Growing practices" ? "🌿 Growing practices" : item}
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

      {category === "Growing practices" && (
        <div className="produce-picker practice-picker">
          <div className="produce-picker-heading">
            <div>
              <strong>Choose growing practices</strong>
              <p>These practices are reported by each farm. Select as many as you want.</p>
            </div>
            {selectedPractices.length > 0 && <button type="button" className="produce-clear" onClick={() => setSelectedPractices([])}>Clear</button>}
          </div>
          <div className="produce-options practice-filter-options">
            {GROWING_PRACTICE_OPTIONS.map((option) => (
              <label key={option.value} className={selectedPractices.includes(option.value) ? "selected" : ""}>
                <input type="checkbox" checked={selectedPractices.includes(option.value)} onChange={() => togglePractice(option.value)} />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          <p className="practice-filter-note">Farm-reported information may vary by crop. Open a farm’s details for its explanation.</p>
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

    <div ref={resultsRef} className="search-results-anchor">
    {filtered.length > 0 ? <>
      <div className="results-heading" aria-live="polite">
        <div><p className="eyebrow">Matching stands</p><h3>{filtered.length} {filtered.length === 1 ? "farm found" : "farms found"}</h3></div>
        <p>Showing {visible.length} of {filtered.length}</p>
      </div>
      <div className="stand-grid">{visible.map((stand) => <StandCard key={stand.id} stand={stand} distanceMiles={userLocation ? distanceInMiles(userLocation, stand) : null} />)}</div>
      {remaining > 0 && <div className="show-more-row"><button type="button" className="show-more-button" onClick={() => setVisibleCount((count) => count + pageSize)}>Show {Math.min(pageSize, remaining)} more <span>↓</span></button><p>{remaining} remaining</p></div>}
    </> : <div className="empty-state"><span>🌾</span><h3>No matching farm stands yet.</h3><p>Try another town, product, or category.</p></div>}
    </div>
  </>;
}
