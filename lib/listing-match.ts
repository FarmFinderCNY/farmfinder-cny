type ListingAddress = { name?: string | null; farm_name?: string | null; address?: string | null; city?: string | null; state?: string | null; zip_code?: string | null };

export const normalizeListingField = (value: string | null | undefined) =>
  (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function listingsMatch(farm: ListingAddress, submission: ListingAddress) {
  return normalizeListingField(farm.name) === normalizeListingField(submission.farm_name ?? submission.name) &&
    normalizeListingField(farm.address) === normalizeListingField(submission.address) &&
    normalizeListingField(farm.city) === normalizeListingField(submission.city) &&
    normalizeListingField(farm.state) === normalizeListingField(submission.state) &&
    normalizeListingField(farm.zip_code) === normalizeListingField(submission.zip_code);
}
