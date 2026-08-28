export const GROWING_PRACTICE_OPTIONS = [
  { value: "certified_organic", label: "USDA Certified Organic" },
  { value: "no_synthetic_pesticides", label: "No synthetic pesticides used" },
  { value: "no_synthetic_herbicides", label: "No synthetic herbicides used" },
  { value: "integrated_pest_management", label: "Integrated pest management" },
  { value: "conventional", label: "Conventional growing methods" },
  { value: "varies_by_product", label: "Practices vary by product" },
  { value: "ask_the_farmer", label: "Ask the farmer" },
] as const;

export type GrowingPractice = (typeof GROWING_PRACTICE_OPTIONS)[number]["value"];

export function getGrowingPracticeLabel(value: string) {
  return GROWING_PRACTICE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function getGrowingPracticeCardBadge(practices: string[], organicCertifier?: string | null) {
  if (practices.includes("certified_organic") && organicCertifier?.trim()) return "USDA Certified Organic";
  if (practices.includes("no_synthetic_pesticides")) return "No synthetic pesticides";
  if (practices.includes("no_synthetic_herbicides")) return "No synthetic herbicides";
  return practices.length > 0 ? "Growing practices listed" : null;
}
