import { NextResponse } from "next/server";

const AUTH_URL = "https://auth.uber.com/oauth/v2/token";
const API_URL = "https://api.uber.com/v1/customers";

type AddressInput = {
  street_address: string[];
  city: string;
  state: string;
  zip_code: string;
  country?: string;
};

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export async function POST(request: Request) {
  try {
    const { pickup, dropoff } = (await request.json()) as { pickup?: AddressInput; dropoff?: AddressInput };
    if (!pickup?.street_address?.[0] || !pickup.city || !pickup.state || !pickup.zip_code || !dropoff?.street_address?.[0] || !dropoff.city || !dropoff.state || !dropoff.zip_code) {
      return NextResponse.json({ error: "Pickup and delivery addresses are required." }, { status: 400 });
    }

    const clientId = requiredEnv("UBER_DIRECT_CLIENT_ID");
    const clientSecret = requiredEnv("UBER_DIRECT_CLIENT_SECRET");
    const customerId = requiredEnv("UBER_DIRECT_CUSTOMER_ID");
    const authBody = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials", scope: "eats.deliveries" });
    const authResponse = await fetch(AUTH_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: authBody, cache: "no-store" });
    const auth = await authResponse.json();
    if (!authResponse.ok || !auth.access_token) {
      const safeCode = typeof auth?.error === "string" ? auth.error : `http_${authResponse.status}`;
      console.error("Uber Direct authentication failed", safeCode);
      return NextResponse.json({ error: `Uber Direct authentication failed (${safeCode}).` }, { status: 502 });
    }

    const normalize = (address: AddressInput) => JSON.stringify({ street_address: address.street_address, city: address.city, state: address.state, zip_code: address.zip_code, country: address.country || "US" });
    const quoteResponse = await fetch(`${API_URL}/${encodeURIComponent(customerId)}/delivery_quotes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.access_token}` },
      body: JSON.stringify({ pickup_address: normalize(pickup), dropoff_address: normalize(dropoff) }),
      cache: "no-store",
    });
    const quote = await quoteResponse.json();
    if (!quoteResponse.ok) {
      console.error("Uber Direct quote failed", quote);
      return NextResponse.json({ error: quote?.message || "A delivery quote is not available for these addresses." }, { status: quoteResponse.status });
    }
    return NextResponse.json({ id: quote.id, fee: quote.fee, currency: quote.currency_type || "USD", duration: quote.duration, expires: quote.expires, dropoffEta: quote.dropoff_eta });
  } catch (error) {
    console.error("Uber Direct quote error", error);
    return NextResponse.json({ error: "Delivery quote is not configured yet." }, { status: 500 });
  }
}
