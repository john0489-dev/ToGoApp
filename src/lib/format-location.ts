// Format a restaurant location for display.
// - If country is empty/null or "Brasil", returns only the location.
// - Otherwise returns "<location> · <country>".
export function formatLocation(
  location: string | null | undefined,
  country: string | null | undefined,
): string {
  const loc = (location ?? "").trim();
  const c = (country ?? "").trim();
  if (!c || c.toLowerCase() === "brasil") return loc;
  if (!loc) return c;
  return `${loc} · ${c}`;
}
