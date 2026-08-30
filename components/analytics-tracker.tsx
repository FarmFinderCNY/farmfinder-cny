"use client";

import { useEffect } from "react";

const SESSION_KEY = "farmfinder-analytics-session";

function getSessionId() {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function recordAnalyticsEvent(
  eventName: string,
  details: { farmId?: string; productQuery?: string; metadata?: Record<string, unknown> } = {}
) {
  const body = {
    eventName,
    sessionId: getSessionId(),
    farmId: details.farmId,
    productQuery: details.productQuery,
    metadata: details.metadata ?? {},
  };

  void fetch("/api/analytics-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => undefined);
}

export function AnalyticsPageTracker() {
  useEffect(() => {
    recordAnalyticsEvent("page_view", { metadata: { path: window.location.pathname } });
  }, []);
  return null;
}
