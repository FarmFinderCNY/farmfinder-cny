"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";

type InventoryItem = {
  id: string;
  farm_id: string;
  name: string;
  price: string | null;
  quantity: string | null;
  status: "available" | "low" | "sold_out";
  sort_order: number | null;
  updated_at: string;
};

export function FarmerInventory({
  farmId,
  farmName,
}: {
  farmId: string;
  farmName: string;
}) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastConfirmedAt, setLastConfirmedAt] = useState<string | null>(null);
  const hasProducts = items.length > 0;
  const isFresh = Boolean(
    lastConfirmedAt &&
    Date.now() - new Date(lastConfirmedAt).getTime() < 7 * 24 * 60 * 60 * 1000,
  );

  async function notifySubscribers(inventoryItemId: string) {
    try {
      const { data } = await getBrowserSupabaseClient().auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) return;
      const response = await fetch("/api/inventory-alerts/dispatch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ farmId, inventoryItemId }),
      });
      if (!response.ok)
        console.error(
          "Unable to deliver inventory alerts:",
          await response.text(),
        );
    } catch (notificationError) {
      console.error("Inventory alert delivery failed:", notificationError);
    }
  }

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = getBrowserSupabaseClient();
      const [{ data, error: inventoryError }, { data: farm }] =
        await Promise.all([
          supabase
            .from("farm_inventory")
            .select(
              "id,farm_id,name,price,quantity,status,sort_order,updated_at",
            )
            .eq("farm_id", farmId)
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true }),
          supabase
            .from("farm_stands")
            .select("farmer_inventory_updated_at")
            .eq("id", farmId)
            .maybeSingle(),
        ]);
      if (inventoryError) {
        setError(inventoryError.message);
        return;
      }
      setItems((data ?? []) as InventoryItem[]);
      setLastConfirmedAt(farm?.farmer_inventory_updated_at ?? null);
    } catch (err) {
      console.error(err);
      setError(
        "Unable to load inventory right now. Please refresh and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [farmId]);

  async function confirmStillAccurate() {
    setLoading(true);
    setError("");
    setMessage("");
    const updatedAt = new Date().toISOString();
    const { error: confirmationError } = await getBrowserSupabaseClient()
      .from("farm_stands")
      .update({
        inventory_updated_at: updatedAt,
        farmer_inventory_updated_at: updatedAt,
      })
      .eq("id", farmId);
    if (confirmationError)
      setError("FarmFinder could not confirm the listing. Please try again.");
    else {
      setLastConfirmedAt(updatedAt);
      setMessage("Confirmed—everything is current for the next 7 days.");
    }
    setLoading(false);
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadInventory(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadInventory]);

  async function addProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const name = String(values.get("name") ?? "").trim();
    if (!name) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const updatedAt = new Date().toISOString();
      const { data: insertedItem, error: insertError } =
        await getBrowserSupabaseClient()
          .from("farm_inventory")
          .insert({
            farm_id: farmId,
            name,
            price: String(values.get("price") ?? "").trim() || null,
            quantity: String(values.get("quantity") ?? "").trim() || null,
            status: "available",
            updated_at: updatedAt,
          })
          .select("id")
          .single();
      if (insertError) {
        setError(insertError.message);
        return;
      }
      event.currentTarget.reset();
      const { error: freshnessError } = await getBrowserSupabaseClient()
        .from("farm_stands")
        .update({
          inventory_updated_at: updatedAt,
          farmer_inventory_updated_at: updatedAt,
        })
        .eq("id", farmId);
      if (freshnessError) {
        setError(
          "Product saved, but live availability could not be confirmed. Please use ‘Everything is still accurate’ once.",
        );
        await loadInventory();
        return;
      }
      setLastConfirmedAt(updatedAt);
      setMessage(`${name} added and marked available.`);
      await loadInventory();
      if (insertedItem) void notifySubscribers(insertedItem.id);
    } catch (err) {
      console.error(err);
      setError(
        "The product was saved, but FarmFinder had trouble refreshing the inventory.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(
    item: InventoryItem,
    status: InventoryItem["status"],
  ) {
    if (item.status === status || savingItemId === item.id) return;
    const previousStatus = item.status;
    const updatedAt = new Date().toISOString();
    setSavingItemId(item.id);
    setError("");
    setMessage("");
    setItems((current) =>
      current.map((currentItem) =>
        currentItem.id === item.id
          ? { ...currentItem, status, updated_at: updatedAt }
          : currentItem,
      ),
    );
    const supabase = getBrowserSupabaseClient();
    const { error: updateError } = await supabase
      .from("farm_inventory")
      .update({ status, updated_at: updatedAt })
      .eq("id", item.id)
      .eq("farm_id", farmId);
    if (updateError) {
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id
            ? { ...currentItem, status: previousStatus }
            : currentItem,
        ),
      );
      setError("That update didn’t save. Please tap it again.");
      setSavingItemId(null);
      return;
    }
    const { error: farmUpdateError } = await supabase
      .from("farm_stands")
      .update({
        inventory_updated_at: updatedAt,
        farmer_inventory_updated_at: updatedAt,
      })
      .eq("id", farmId);
    if (farmUpdateError)
      setError(
        "Product updated, but FarmFinder couldn’t refresh the listing timestamp.",
      );
    else {
      setLastConfirmedAt(updatedAt);
      setMessage(
        `${item.name}: ${status === "available" ? "Available" : status === "low" ? "Low stock" : "Sold out"}. Saved.`,
      );
    }
    setSavingItemId(null);
    if (status === "available" || status === "low")
      void notifySubscribers(item.id);
  }

  async function removeItem(item: InventoryItem) {
    if (!window.confirm(`Remove ${item.name} from ${farmName}?`)) return;
    setSavingItemId(item.id);
    setError("");
    setMessage("");
    const { error: deleteError } = await getBrowserSupabaseClient()
      .from("farm_inventory")
      .delete()
      .eq("id", item.id)
      .eq("farm_id", farmId);
    if (deleteError) setError(deleteError.message);
    else {
      const updatedAt = new Date().toISOString();
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      const { error: freshnessError } = await getBrowserSupabaseClient()
        .from("farm_stands")
        .update({
          inventory_updated_at: updatedAt,
          farmer_inventory_updated_at: updatedAt,
        })
        .eq("id", farmId);
      if (freshnessError) {
        setError(
          `${item.name} was removed, but the listing timestamp could not be refreshed.`,
        );
      } else {
        setLastConfirmedAt(updatedAt);
        setMessage(`${item.name} removed.`);
      }
    }
    setSavingItemId(null);
  }

  return (
    <section className="portal-section">
      <div className="fresh-heading">
        <div>
          <p className="eyebrow">Quick update</p>
          <h2>What’s available now</h2>
          <p>
            Just tap a status. Each tap saves immediately—no extra save button.
          </p>
        </div>
        <button
          type="button"
          className="text-button"
          onClick={() => void loadInventory()}
          disabled={loading}
        >
          Refresh
        </button>
      </div>
      <section
        className="farmer-onboarding"
        aria-label="Getting started checklist"
      >
        <div className="onboarding-heading">
          <div>
            <p className="eyebrow">
              {hasProducts && isFresh ? "Listing ready" : "Start here"}
            </p>
            <h3>
              {hasProducts && isFresh
                ? "Customers can trust what they see."
                : "Get your listing working in 3 simple steps."}
            </h3>
          </div>
          <strong>
            {hasProducts && isFresh
              ? "Ready"
              : `${Number(hasProducts) + Number(isFresh)}/2 key actions`}
          </strong>
        </div>
        <ol>
          <li className={hasProducts ? "complete" : ""}>
            <span>{hasProducts ? "✓" : "1"}</span>
            <div>
              <strong>Add your first product</strong>
              <small>Tell customers what they can find.</small>
            </div>
          </li>
          <li className={isFresh ? "complete" : ""}>
            <span>{isFresh ? "✓" : "2"}</span>
            <div>
              <strong>Confirm current availability</strong>
              <small>
                Any status tap refreshes your listing for seven days.
              </small>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <strong>Check your public listing</strong>
              <small>See exactly what customers see.</small>
            </div>
            <a href={`/farms/${farmId}`} target="_blank" rel="noreferrer">
              View listing ↗
            </a>
          </li>
        </ol>
      </section>
      {error && <p className="form-error admin-error">{error}</p>}
      {message && (
        <p className="form-success portal-message" aria-live="polite">
          {message}
        </p>
      )}
      {items.length > 0 && (
        <div className="inventory-confirmation">
          <div>
            <strong>Nothing changed today?</strong>
            <span>
              {lastConfirmedAt
                ? `Last confirmed ${new Date(lastConfirmedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                : "Not confirmed yet"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void confirmStillAccurate()}
            disabled={loading}
          >
            ✓ Everything is still accurate
          </button>
        </div>
      )}
      <form onSubmit={addProduct} className="inventory-add-form">
        <label className="inventory-field">
          Product
          <input name="name" placeholder="Sweet corn" required />
        </label>
        <label className="inventory-field">
          Quantity
          <input name="quantity" placeholder="Plenty, 12 dozen, 20 bags..." />
        </label>
        <label className="inventory-field">
          Price
          <input name="price" placeholder="$6/dozen" />
        </label>
        <button
          className="submit-button inventory-add-button"
          disabled={loading}
        >
          Add as available
        </button>
      </form>
      {loading && items.length === 0 ? (
        <div className="admin-empty">Loading inventory...</div>
      ) : items.length === 0 ? (
        <div className="admin-empty">No products have been added yet.</div>
      ) : (
        <div className="inventory-manager">
          {items.map((item) => (
            <article
              className={`inventory-manager-item product-${item.status}`}
              key={item.id}
            >
              <div className="inventory-item-details">
                <strong className="inventory-item-name">{item.name}</strong>
                {item.quantity && (
                  <div className="inventory-item-meta">
                    <span className="inventory-item-label">Quantity</span>
                    <span>{item.quantity}</span>
                  </div>
                )}
                {item.price && (
                  <div className="inventory-item-meta">
                    <span className="inventory-item-label">Price</span>
                    <span>{item.price}</span>
                  </div>
                )}
              </div>
              <div
                className="inventory-status-buttons"
                aria-label={`Update ${item.name}`}
              >
                <button
                  type="button"
                  className={`inventory-status available ${item.status === "available" ? "active" : ""}`}
                  disabled={savingItemId === item.id}
                  onClick={() => void updateStatus(item, "available")}
                >
                  ✓ Available
                </button>
                <button
                  type="button"
                  className={`inventory-status low ${item.status === "low" ? "active" : ""}`}
                  disabled={savingItemId === item.id}
                  onClick={() => void updateStatus(item, "low")}
                >
                  Low stock
                </button>
                <button
                  type="button"
                  className={`inventory-status sold-out ${item.status === "sold_out" ? "active" : ""}`}
                  disabled={savingItemId === item.id}
                  onClick={() => void updateStatus(item, "sold_out")}
                >
                  Sold out
                </button>
              </div>
              {savingItemId === item.id && (
                <small aria-live="polite">Saving…</small>
              )}
              <button
                type="button"
                className="text-button"
                disabled={savingItemId === item.id}
                onClick={() => void removeItem(item)}
              >
                Remove
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
