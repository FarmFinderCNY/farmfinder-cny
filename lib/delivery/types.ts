export type DeliveryProviderId = "uber_direct" | "doordash_drive";

export type DeliveryAddress = {
  streetAddress: string;
  streetAddress2?: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
};

export type DeliveryQuoteRequest = {
  farmId: string;
  pickup: DeliveryAddress;
  dropoff: DeliveryAddress;
  orderValueCents?: number;
};

export type DeliveryQuote = {
  provider: DeliveryProviderId;
  available: boolean;
  feeCents?: number;
  currency: "USD";
  estimatedPickupAt?: string;
  estimatedDropoffAt?: string;
  quoteId?: string;
  expiresAt?: string;
  unavailableReason?: string;
};

export type DeliveryProvider = {
  id: DeliveryProviderId;
  displayName: string;
  isConfigured(): boolean;
  getQuote(request: DeliveryQuoteRequest): Promise<DeliveryQuote>;
};
