type ListingAddress = { name?: string | null; farm_name?: string | null; address?: string | null; city?: string | null; state?: string | null; zip_code?: string | null };

export const normalizeListingField = (value: string | null | undefined) =>
  (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

const canonicalAddress = (value: string | null | undefined) => {
  const aliases: Record<string, string> = {
    road: "rd", street: "st", avenue: "ave", boulevard: "blvd", drive: "dr",
    lane: "ln", highway: "hwy", route: "rte", county: "co", state: "st",
  };
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/)
    .map((part) => aliases[part] ?? part).join("");
};

const canonicalName = (value: string | null | undefined) => {
  const parts = (value ?? "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/);
  while (["llc", "inc", "farm", "farms", "farmstand", "stand"].includes(parts.at(-1) ?? "")) parts.pop();
  return parts.join("");
};

export function listingsMatch(farm: ListingAddress, submission: ListingAddress) {
  const farmName = farm.name ?? farm.farm_name;
  const submissionName = submission.farm_name ?? submission.name;
  const namesMatch = normalizeListingField(farmName) === normalizeListingField(submissionName) || canonicalName(farmName) === canonicalName(submissionName);
  return namesMatch &&
    canonicalAddress(farm.address) === canonicalAddress(submission.address) &&
    normalizeListingField(farm.city) === normalizeListingField(submission.city) &&
    normalizeListingField(farm.state) === normalizeListingField(submission.state) &&
    normalizeListingField(farm.zip_code) === normalizeListingField(submission.zip_code);
}
