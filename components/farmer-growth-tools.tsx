"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";

type EventRow = { event_type: "detail_view" | "directions_click" | "website_click" | "alert_subscription" };

export function FarmerGrowthTools({ farmId }: { farmId: string }) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [intervalDays, setIntervalDays] = useState(7);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = getBrowserSupabaseClient();
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: eventData }, { data: reminder }] = await Promise.all([
      supabase.from("farm_engagement_events").select("event_type").eq("farm_id", farmId).gte("created_at", since),
      supabase.from("farmer_update_reminders").select("active,interval_days").eq("farm_id", farmId).maybeSingle(),
    ]);
    setEvents((eventData ?? []) as EventRow[]);
    setRemindersEnabled(Boolean(reminder?.active));
    setIntervalDays(reminder?.interval_days ?? 7);
    setLoading(false);
  }, [farmId]);

  useEffect(() => { const timeout = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timeout); }, [load]);

  const totals = useMemo(() => ({
    views: events.filter((event) => event.event_type === "detail_view").length,
    directions: events.filter((event) => event.event_type === "directions_click").length,
    website: events.filter((event) => event.event_type === "website_click").length,
    followers: events.filter((event) => event.event_type === "alert_subscription").length,
  }), [events]);

  async function saveReminder(active: boolean, days = intervalDays) {
    setLoading(true);
    setMessage("");
    const supabase = getBrowserSupabaseClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user?.email) { setMessage("We could not find the email for this account."); setLoading(false); return; }
    const { error } = await supabase.from("farmer_update_reminders").upsert({
      farm_id: farmId,
      user_id: user.id,
      email: user.email,
      interval_days: days,
      active,
      updated_at: new Date().toISOString(),
    }, { onConflict: "farm_id,user_id" });
    if (error) setMessage("The reminder preference could not be saved. Please try again.");
    else { setRemindersEnabled(active); setIntervalDays(days); setMessage(active ? `Update reminders are on every ${days} days.` : "Update reminders are off."); }
    setLoading(false);
  }

  return <section className="farmer-growth-tools" aria-label="Farm activity and reminders">
    <div className="growth-heading"><div><p className="eyebrow">Your impact</p><h4>Last 30 days</h4></div><span>Private to you</span></div>
    <div className="growth-stats">
      <div><strong>{totals.views}</strong><span>profile views</span></div>
      <div><strong>{totals.directions}</strong><span>direction clicks</span></div>
      <div><strong>{totals.website}</strong><span>website clicks</span></div>
      <div><strong>{totals.followers}</strong><span>new alerts</span></div>
    </div>
    <div className="reminder-setting">
      <div><strong>Seasonal update reminders</strong><span>Get a friendly email when it is time to confirm your availability.</span></div>
      <label><input type="checkbox" checked={remindersEnabled} disabled={loading} onChange={(event) => void saveReminder(event.target.checked)} /> Remind me</label>
      {remindersEnabled && <select aria-label="Reminder frequency" value={intervalDays} disabled={loading} onChange={(event) => void saveReminder(true, Number(event.target.value))}>
        <option value={3}>Every 3 days</option><option value={7}>Every 7 days</option><option value={14}>Every 14 days</option>
      </select>}
    </div>
    {message && <p className="growth-message">{message}</p>}
  </section>;
}
