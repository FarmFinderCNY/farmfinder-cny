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
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

const loadInventory = useCallback(async () => {
  setLoading(true);
  setError("");

  try {
    const { data, error: inventoryError } =
      await getBrowserSupabaseClient()
        .from("farm_inventory")
        .select(
          "id,farm_id,name,price,quantity,status,sort_order,updated_at"
        )
        .eq("farm_id", farmId)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

    if (inventoryError) {
      setError(inventoryError.message);
      return;
    }

    setItems((data ?? []) as InventoryItem[]);
  } catch (err) {
    console.error("Unable to load farm inventory:", err);
    setError(
      "Unable to load inventory right now. Please refresh and try again."
    );
  } finally {
    setLoading(false);
  }
}, [farmId]);

  useEffect(() => {
    void loadInventory();
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
    const { error: insertError } =
      await getBrowserSupabaseClient()
        .from("farm_inventory")
        .insert({
          farm_id: farmId,
          name,
          price: String(values.get("price") ?? "").trim() || null,
          quantity: String(values.get("quantity") ?? "").trim() || null,
          status: "available",
          updated_at: new Date().toISOString(),
        });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    event.currentTarget.reset();

    const updatedAt = new Date().toISOString();

    await getBrowserSupabaseClient()
      .from("farm_stands")
      .update({
        inventory_updated_at: updatedAt,
      })
      .eq("id", farmId);

    setMessage("Product added.");
    await loadInventory();
  } catch (err) {
    console.error("Unable to add inventory product:", err);
    setError(
      "The product was saved, but FarmFinder had trouble refreshing the inventory. Please refresh and try again."
    );
  } finally {
    setLoading(false);
  }
}

  async function updateItem(
    item: InventoryItem,
    changes: Partial<InventoryItem>
  ) {
    setLoading(true);
    setError("");
    setMessage("");

    const updatedAt = new Date().toISOString();

    const { error: updateError } =
      await getBrowserSupabaseClient()
        .from("farm_inventory")
        .update({
          ...changes,
          updated_at: updatedAt,
        })
        .eq("id", item.id)
        .eq("farm_id", farmId);

    if (updateError) {
      setError(updateError.message);
    } else {
      await getBrowserSupabaseClient()
        .from("farm_stands")
        .update({
          inventory_updated_at: updatedAt,
        })
        .eq("id", farmId);

      setMessage("Inventory updated.");
      await loadInventory();
    }

    setLoading(false);
  }

  async function removeItem(item: InventoryItem) {
    const confirmed = window.confirm(
      `Remove ${item.name} from ${farmName}?`
    );

    if (!confirmed) return;

    setLoading(true);
    setError("");
    setMessage("");

    const { error: deleteError } =
      await getBrowserSupabaseClient()
        .from("farm_inventory")
        .delete()
        .eq("id", item.id)
        .eq("farm_id", farmId);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      const updatedAt = new Date().toISOString();

      await getBrowserSupabaseClient()
        .from("farm_stands")
        .update({
          inventory_updated_at: updatedAt,
        })
        .eq("id", farmId);

      setMessage("Product removed.");
      await loadInventory();
    }

    setLoading(false);
  }

  return (
    <section className="portal-section">
      <div className="fresh-heading">
        <div>
          <p className="eyebrow">Live inventory</p>
          <h2>What’s available now</h2>
          <p>
            Update products here so customers know what is actually
            available before they drive to the farm.
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

      {error && (
        <p className="form-error admin-error">{error}</p>
      )}

      {message && (
        <p className="form-success portal-message">{message}</p>
      )}

      <form onSubmit={addProduct} className="inventory-add-form">
<label className="inventory-field">
          Product
          <input
            name="name"
            placeholder="Sweet corn"
            required
          />
   </label>

      <label className="inventory-field">
          Quantity
          <input
            name="quantity"
            placeholder="Plenty, 12 dozen, 20 bags..."
          />
  </label>

      <label className="inventory-field">
          Price
          <input
            name="price"
            placeholder="$6/dozen"
          />
    </label>

        <button
         className="submit-button inventory-add-button"
          disabled={loading}
        >
          Add product
        </button>
      </form>

      {loading && items.length === 0 ? (
        <div className="admin-empty">Loading inventory...</div>
      ) : items.length === 0 ? (
        <div className="admin-empty">
          No products have been added yet.
        </div>
      ) : (
        <div className="inventory-manager">
          {items.map((item) => (
            <article
              className={`inventory-manager-item product-${item.status}`}
              key={item.id}
            >
 <div className="inventory-item-details">
  <strong className="inventory-item-name">
    {item.name}
  </strong>

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
              <div className="inventory-status-buttons">
                <button
                  type="button"
                  className={
                    item.status === "available" ? "active" : ""
                  }
                  disabled={loading}
                  onClick={() =>
                    void updateItem(item, {
                      status: "available",
                    })
                  }
                >
                  Available
                </button>

                <button
                  type="button"
                  className={
                    item.status === "low" ? "active" : ""
                  }
                  disabled={loading}
                  onClick={() =>
                    void updateItem(item, {
                      status: "low",
                    })
                  }
                >
                  Low
                </button>

                <button
                  type="button"
                  className={
                    item.status === "sold_out" ? "active" : ""
                  }
                  disabled={loading}
                  onClick={() =>
                    void updateItem(item, {
                      status: "sold_out",
                    })
                  }
                >
                  Sold out
                </button>
              </div>

              <button
                type="button"
                className="text-button"
                disabled={loading}
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
