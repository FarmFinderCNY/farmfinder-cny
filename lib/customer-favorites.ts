export const FAVORITES_KEY = "farmfinder_saved_farms";
export const MAX_SAVED_FARMS = 100;
const FARM_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isFarmId(value: unknown): value is string {
  return typeof value === "string" && FARM_ID.test(value);
}

export function savedFarmIds(metadata: Record<string, unknown> | undefined): string[] {
  const value = metadata?.[FAVORITES_KEY];
  return Array.isArray(value) ? [...new Set(value.filter(isFarmId))].slice(0, MAX_SAVED_FARMS) : [];
}

export function changeSavedFarms(metadata: Record<string, unknown>, farmId: string, save: boolean): string[] {
  if (!isFarmId(farmId)) throw new Error("That farm could not be saved.");
  const current = savedFarmIds(metadata);
  if (!save) return current.filter((id) => id !== farmId);
  if (current.includes(farmId)) return current;
  if (current.length >= MAX_SAVED_FARMS) throw new Error("You can save up to 100 farms. Remove one to save another.");
  return [...current, farmId];
}
