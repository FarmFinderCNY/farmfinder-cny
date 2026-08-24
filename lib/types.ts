export type FarmStand = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  phone: string | null;
  website: string | null;
  hours: string | null;
  payment_methods: string | null;
  product_categories: string[];
  photo_url: string | null;
  owner_user_id?: string | null;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  inventory_updated_at: string | null;
  submission_type?: "owner" | "community" | null;
  submitted_by_display_name?: string | null;

inventory: {
  id: string;
  farm_id: string;
  name: string;
  price: string | null;
  quantity: string | null;
  status: "available" | "low" | "sold_out";
  sort_order: number | null;
  updated_at: string;
}[];
};
