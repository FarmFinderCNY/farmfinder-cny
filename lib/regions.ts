export type FarmFinderRegion = {
  slug: string;
  name: string;
  stateCode: string;
  stateName: string;
  isHomeRegion?: boolean;
};

export const US_STATES = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"],
  ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"],
  ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"],
  ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"],
  ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"],
  ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"],
  ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"],
  ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"],
  ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"],
  ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"],
  ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"],
  ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"],
  ["WI", "Wisconsin"], ["WY", "Wyoming"]
] as const;

export const HOME_REGION: FarmFinderRegion = {
  slug: "cny",
  name: "Central New York",
  stateCode: "NY",
  stateName: "New York",
  isHomeRegion: true,
};

export function stateSlug(stateName: string) {
  return stateName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function getStateBySlug(slug: string) {
  return US_STATES.find(([, name]) => stateSlug(name) === slug);
}

export function normalizeState(value?: string | null) {
  if (!value) return "";
  const cleaned = value.trim().toLowerCase();
  const match = US_STATES.find(([code, name]) => code.toLowerCase() === cleaned || name.toLowerCase() === cleaned);
  return match?.[0] ?? value.trim().toUpperCase();
}
