// Format a restaurant location for display.
// - If country is empty/null or "Brasil", returns only the location.
// - Otherwise returns "<flag> <location> · <country>"
export function formatLocation(
  location: string | null | undefined,
  country: string | null | undefined,
): string {
  const loc = (location ?? "").trim();
  const c = (country ?? "").trim();
  if (!c || c.toLowerCase() === "brasil" || c.toLowerCase() === "brazil") return loc;
  if (!loc) return c;

  const flag = countryFlag(c);
  return flag ? `${flag} ${loc} · ${c}` : `${loc} · ${c}`;
}

export function countryFlag(country: string): string {
  const flags: Record<string, string> = {
    "japão": "🇯🇵", "japan": "🇯🇵",
    "frança": "🇫🇷", "france": "🇫🇷",
    "itália": "🇮🇹", "italy": "🇮🇹",
    "espanha": "🇪🇸", "spain": "🇪🇸",
    "estados unidos": "🇺🇸", "usa": "🇺🇸", "eua": "🇺🇸", "united states": "🇺🇸",
    "portugal": "🇵🇹",
    "argentina": "🇦🇷",
    "méxico": "🇲🇽", "mexico": "🇲🇽",
    "alemanha": "🇩🇪", "germany": "🇩🇪",
    "reino unido": "🇬🇧", "uk": "🇬🇧", "england": "🇬🇧",
    "peru": "🇵🇪",
    "colômbia": "🇨🇴", "colombia": "🇨🇴",
    "chile": "🇨🇱",
    "grécia": "🇬🇷", "greece": "🇬🇷",
    "índia": "🇮🇳", "india": "🇮🇳",
    "china": "🇨🇳",
    "coreia": "🇰🇷", "korea": "🇰🇷",
    "tailândia": "🇹🇭", "thailand": "🇹🇭",
    "turquia": "🇹🇷", "turkey": "🇹🇷",
    "marrocos": "🇲🇦", "morocco": "🇲🇦",
    "líbano": "🇱🇧", "lebanon": "🇱🇧",
    "israel": "🇮🇱",
    "uruguai": "🇺🇾", "uruguay": "🇺🇾",
    "venezuela": "🇻🇪",
    "cuba": "🇨🇺",
    "holanda": "🇳🇱", "netherlands": "🇳🇱",
    "bélgica": "🇧🇪", "belgium": "🇧🇪",
    "suíça": "🇨🇭", "switzerland": "🇨🇭",
    "austrália": "🇦🇺", "australia": "🇦🇺",
    "canadá": "🇨🇦", "canada": "🇨🇦",
  };
  return flags[country.toLowerCase()] || "";
}
