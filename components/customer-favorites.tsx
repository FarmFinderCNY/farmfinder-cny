"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";
import { changeSavedFarms, FAVORITES_KEY, savedFarmIds } from "@/lib/customer-favorites";

type FavoritesContext = {
  user: User | null;
  ready: boolean;
  recovery: boolean;
  savedIds: string[];
  busy: boolean;
  error: string;
  retry: () => Promise<void>;
  finishRecovery: () => void;
  setSaved: (farmId: string, save: boolean) => Promise<void>;
};
const Context = createContext<FavoritesContext | null>(null);

export function CustomerFavoritesProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const activeUserId = useRef<string | null>(null);
  const authVersion = useRef(0);
  const saving = useRef(false);

  const acceptUser = useCallback((next: User | null) => {
    activeUserId.current = next?.id ?? null;
    setUser(next);
    setReady(true);
  }, []);

  const retry = useCallback(async () => {
    setError("");
    try {
      const { data, error: authError } = await getBrowserSupabaseClient().auth.getSession();
      if (authError) throw authError;
      if (!data.session) { acceptUser(null); return; }
      if (activeUserId.current && activeUserId.current !== data.session.user.id) return;
      const version = authVersion.current;
      const { data: fresh, error: userError } = await getBrowserSupabaseClient().auth.getUser();
      if (version !== authVersion.current) return;
      if (userError || !fresh.user) throw userError ?? new Error("Account unavailable");
      if (fresh.user.id === data.session.user.id) acceptUser(fresh.user);
    } catch {
      setError("Account access couldn’t be checked. Please try again.");
      setReady(true);
    }
  }, [acceptUser]);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      setReady(true);
      setError("Account access is temporarily unavailable.");
      return;
    }
    const client = getBrowserSupabaseClient();
    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      authVersion.current += 1;
      acceptUser(session?.user ?? null);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (event === "SIGNED_OUT") { setRecovery(false); setError(""); }
    });
    void retry();
    return () => listener.subscription.unsubscribe();
  }, [acceptUser, retry]);

  const setSaved = useCallback(async (farmId: string, save: boolean) => {
    if (saving.current) throw new Error("Please wait for your other save to finish.");
    saving.current = true;
    setBusy(true);
    try {
      const client = getBrowserSupabaseClient();
      // Read the latest account before merging, preserving other account metadata.
      const { data, error: readError } = await client.auth.getUser();
      if (readError || !data.user) throw new Error("Please sign in again to save farms.");
      const userId = data.user.id;
      if (activeUserId.current !== userId) throw new Error("Your account changed. Please try again.");
      const ids = changeSavedFarms(data.user.user_metadata, farmId, save);
      const { data: updated, error: saveError } = await client.auth.updateUser({ data: { [FAVORITES_KEY]: ids } });
      if (saveError || !updated.user) throw new Error("Your saved farms couldn’t be updated. Please try again.");
      if (activeUserId.current === userId) setUser(updated.user);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }, []);

  return <Context.Provider value={{ user, ready, recovery, savedIds: savedFarmIds(user?.user_metadata), busy, error, retry, finishRecovery: () => setRecovery(false), setSaved }}>{children}</Context.Provider>;
}

export function useCustomerFavorites() {
  const value = useContext(Context);
  if (!value) throw new Error("Saved farms provider is missing.");
  return value;
}

export function SaveFarmButton({ farmId, farmName }: { farmId: string; farmName: string }) {
  const { user, ready, savedIds, busy, setSaved } = useCustomerFavorites();
  const [error, setError] = useState("");
  const saved = savedIds.includes(farmId);
  if (ready && !user) return <Link className="save-farm-button" href={`/my-farms?save=${encodeURIComponent(farmId)}`} aria-label={`Sign in to save ${farmName}`}>♡ Save farm</Link>;
  return <div className="save-farm-control">
    <button type="button" className={`save-farm-button${saved ? " saved" : ""}`} aria-pressed={saved} aria-label={`${saved ? "Remove" : "Save"} ${farmName}${saved ? " from My Farms" : " to My Farms"}`} disabled={!ready || busy} onClick={async () => {
      setError("");
      try { await setSaved(farmId, !saved); } catch (err) { setError(err instanceof Error ? err.message : "Please try again."); }
    }}>{!ready ? "Loading…" : saved ? "♥ Saved" : "♡ Save farm"}</button>
    {error && <p className="save-farm-error" role="alert">{error}</p>}
  </div>;
}
