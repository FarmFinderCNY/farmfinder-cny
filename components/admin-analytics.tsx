"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";

type Metrics = {
  pageViews: number;
  visitorSessions: number;
  productSearches: number;
  farmViews: number;
  directions: number;
  websiteClicks: number;
  productAlerts: number;
  addFarmStarts: number;
  addFarmSubmits: number;
  inventoryUpdates: number;
  totalSubmissions: number;
  pendingSubmissions: number;
};

type AnalyticsResponse = {
  periodDays: number;
  updatedAt: string;
  metrics: Metrics;
  error?: string;
};

const cards: Array<{ key: keyof Metrics; label: string }> = [
  { key: "visitorSessions", label: "visitor sessions" },
  { key: "pageViews", label: "page views" },
  { key: "productSearches", label: "product searches" },
  { key: "farmViews", label: "farm profiles opened" },
  { key: "directions", label: "direction clicks" },
  { key: "websiteClicks", label: "farm website clicks" },
  { key: "addFarmStarts", label: "add-farm starts" },
  { key: "addFarmSubmits", label: "add-farm completions" },
  { key: "inventoryUpdates", label: "farmer updates" },
  { key: "productAlerts", label: "product alerts" },
  { key: "totalSubmissions", label: "all farm submissions" },
  { key: "pendingSubmissions", label: "waiting for review" },
];

export function AdminAnalytics() {
  const [signedIn, setSignedIn] = useState(false);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const supabase = getBrowserSupabaseClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setSignedIn(false);
      setLoading(false);
      return;
    }

    setSignedIn(true);
    try {
      const response = await fetch("/api/admin-analytics", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const result = await response.json() as AnalyticsResponse;
      if (!response.ok) {
        setError(result.error ?? "Unable to load FarmFinder activity.");
        setData(null);
      } else {
        setData(result);
      }
    } catch {
      setError("Unable to load FarmFinder activity.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    void load();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
      if (session) window.setTimeout(() => void load(), 0);
      else setData(null);
    });
    return () => listener.subscription.unsubscribe();
  }, [load]);

  if (!signedIn) return null;

  return <section className="admin-analytics" aria-label="FarmFinder activity">
    <div className="admin-analytics-heading">
      <div><p className="eyebrow">Private activity report</p><h2>FarmFinder Activity</h2><p>Website activity from the last 30 days. Submission totals are all-time.</p></div>
      <button type="button" onClick={() => void load()} disabled={loading}>{loading ? "Refreshing…" : "Refresh numbers"}</button>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {data && <div className="admin-analytics-grid">
      {cards.map((card) => <article key={card.key}><strong>{data.metrics[card.key]}</strong><span>{card.label}</span></article>)}
    </div>}
    {data && <p className="admin-analytics-updated">Updated {new Date(data.updatedAt).toLocaleString()}</p>}
  </section>;
}
