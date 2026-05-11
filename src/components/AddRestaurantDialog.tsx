import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X, Loader2, Sparkles, Search, MapPin } from "lucide-react";
import type { Session } from "@supabase/supabase-js";

interface PlaceResult {
  name: string;
  address: string;
  lat: string;
  lon: string;
  neighbourhood: string;
}

interface AddRestaurantDialogProps {
  open: boolean;
  onClose: () => void;
  session: Session;
  onAdd: (data: {
    name: string;
    location: string;
    cuisine: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  }) => void;
}

const CUISINE_OPTIONS = [
  "Árabe", "Argentino", "Bar", "Bar de Vinhos", "Brasileiro", "Café",
  "Chinês", "Coreano", "Doceria", "Espanhol", "Francês", "Grego",
  "Hamburgueria", "Indiano", "Italiano", "Japonês", "Mediterrâneo",
  "Mexicano", "Padaria", "Peruano", "Pizzaria", "Português",
  "Sorveteria", "Steakhouse", "Sushi", "Tailandês", "Vegano",
  "Vegetariano", "Vietnamita", "Outro"
];

async function searchPlaces(query: string): Promise<PlaceResult[]> {
  if (query.length < 3) return [];
  const res = await fetch("/api/maps/autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    results?: Array<{
      name: string;
      address: string;
      lat: number | null;
      lon: number | null;
      neighbourhood: string;
    }>;
  };
  return (data.results ?? []).map((r) => ({
    name: r.name,
    address: r.address,
    lat: r.lat != null ? String(r.lat) : "",
    lon: r.lon != null ? String(r.lon) : "",
    neighbourhood: r.neighbourhood,
  }));
}

function shortAddress(p: PlaceResult): string {
  const cleanPart = (s: string) =>
    s
      .replace(/\b\d{5}-?\d{3}\b/g, "") // CEP
      .replace(/\bBrasil\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  const parts = p.address
    .split(",")
    .map((s) => cleanPart(s))
    .filter(Boolean);
  if (p.neighbourhood) {
    const city = parts.find((x) => x && x !== p.neighbourhood && x !== p.name);
    return city ? `${p.neighbourhood}, ${city}` : p.neighbourhood;
  }
  // No neighbourhood — try to extract bairro/district from address parts
  // Skip the street (parts[0]) and try to find a meaningful location part
  const meaningfulParts = parts.slice(1).filter((p) => {
    // Skip parts that look like street numbers, CEPs or generic terms
    return p && !/^\d+$/.test(p) && p.length > 2;
  });
  return meaningfulParts.slice(0, 2).join(", ");
}

export function AddRestaurantDialog({ open, onClose, onAdd }: AddRestaurantDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [cuisine, setCuisine] = useState("Bar");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<{ address: string; lat: number; lon: number } | null>(null);
  const [cuisineLoading, setCuisineLoading] = useState(false);
  const [cuisineSuggested, setCuisineSuggested] = useState(false);
  const [cuisineManual, setCuisineManual] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqIdRef = useRef(0);
  const cuisineReqIdRef = useRef(0);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  // Location autocomplete state (parallel to name search)
  const [locResults, setLocResults] = useState<PlaceResult[]>([]);
  const [locSearching, setLocSearching] = useState(false);
  const [locShowDropdown, setLocShowDropdown] = useState(false);
  const [locHasSearched, setLocHasSearched] = useState(false);
  const locDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locReqIdRef = useRef(0);
  const locWrapperRef = useRef<HTMLDivElement>(null);
  const locSuppressRef = useRef(false);

  // Click outside to close dropdown
  useEffect(() => {
    if (!showDropdown) return;
    const onDocClick = (e: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showDropdown]);

  const fetchCuisineSuggestion = async (n: string, addr: string) => {
    if (cuisineManual) return;
    if (!n || n.trim().length < 3) return;
    const myReq = ++cuisineReqIdRef.current;
    setCuisineLoading(true);
    try {
      const res = await fetch("/api/suggest-cuisine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n.trim(), address: addr.trim() }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { cuisine?: string };
      if (myReq !== cuisineReqIdRef.current) return;
      if (cuisineManual) return;
      const suggested = (data.cuisine || "").trim();
      if (!suggested) return;
      const match = CUISINE_OPTIONS.find(
        (c) => c.toLowerCase() === suggested.toLowerCase()
      );
      setCuisine(match || "Outro");
      setCuisineSuggested(true);
    } catch (err) {
      console.error("suggest cuisine failed", err);
    } finally {
      if (myReq === cuisineReqIdRef.current) setCuisineLoading(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = name.trim();
    if (q.length < 3) {
      setResults([]);
      setShowDropdown(false);
      setHasSearched(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const myReq = ++reqIdRef.current;
      setSearching(true);
      try {
        const res = await searchPlaces(q);
        if (myReq !== reqIdRef.current) return;
        setResults(res);
        setHasSearched(true);
        setShowDropdown(true);
      } catch (err) {
        console.error("places search failed", err);
      } finally {
        if (myReq === reqIdRef.current) setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [name]);

  if (!open) return null;

  const handlePick = (p: PlaceResult) => {
    setName(p.name);
    const short = shortAddress(p);
    setLocation(short || p.address);
    const lat = p.lat ? parseFloat(p.lat) : NaN;
    const lon = p.lon ? parseFloat(p.lon) : NaN;
    setSelectedAddress({
      address: p.address,
      lat: Number.isFinite(lat) ? lat : 0,
      lon: Number.isFinite(lon) ? lon : 0,
    });
    setShowDropdown(false);
    void fetchCuisineSuggestion(p.name, short || p.address);
  };

  const handleClearName = () => {
    setName("");
    setResults([]);
    setShowDropdown(false);
    setHasSearched(false);
    setSelectedAddress(null);
    setCuisineSuggested(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // If user typed location manually (no Google Places selection),
    // try to extract just the neighbourhood/bairro
    let finalLocation = location.trim();
    if (!selectedAddress && finalLocation) {
      const parts = finalLocation
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      // If it looks like a full address (starts with "Rua", "Av", "R.", etc.)
      const looksLikeStreet = /^(rua|av|avenida|r\.?|al|alameda|travessa|estrada|rod|rodovia)\s/i.test(parts[0] || "");
      if (looksLikeStreet && parts.length > 1) {
        // Skip the street part, take the next meaningful parts (bairro, cidade)
        const meaningful = parts.slice(1).filter((p) => !/^\d+$/.test(p) && p.length > 2);
        finalLocation = meaningful.slice(0, 2).join(", ");
      }
    }

    onAdd({
      name: name.trim(),
      location: finalLocation,
      cuisine,
      address: selectedAddress?.address,
      latitude: selectedAddress?.lat,
      longitude: selectedAddress?.lon,
    });
    setName("");
    setLocation("");
    setCuisine("Bar");
    setSelectedAddress(null);
    setResults([]);
    setShowDropdown(false);
    setHasSearched(false);
    setCuisineSuggested(false);
    setCuisineManual(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-foreground/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-card-foreground">{t("add_restaurant")}</h2>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div ref={searchWrapperRef} style={{ position: "relative" }}>
            <label className="block text-sm font-medium text-card-foreground mb-1">
              {t("search_placeholder").replace("...", "")}
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "#c4944a" }}
              />
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (selectedAddress) setSelectedAddress(null);
                }}
                onBlur={() => {
                  if (name.trim().length >= 3 && !cuisineManual) {
                    void fetchCuisineSuggestion(name, location || selectedAddress?.address || "");
                  }
                }}
                onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
                placeholder={t("search_placeholder")}
                className="w-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                style={{
                  background: "#fff",
                  border: "1px solid #ede9e3",
                  borderRadius: "12px",
                  padding: "12px 40px 12px 38px",
                }}
                required
                autoComplete="off"
              />
              {searching && (
                <Loader2 size={16} className="absolute right-10 top-1/2 -translate-y-1/2 animate-spin" style={{ color: "#c4944a" }} />
              )}
              {name && (
                <button
                  type="button"
                  onClick={handleClearName}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Limpar"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Dropdown */}
            {showDropdown && results.length > 0 && (
              <div
                className="overflow-y-auto"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 100,
                  marginTop: 4,
                  maxHeight: 240,
                  background: "#fff",
                  border: "1px solid #ede9e3",
                  borderRadius: "12px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                }}
              >
                <ul>
                  {results.map((r, i) => (
                    <li
                      key={i}
                      style={{
                        borderBottom: i < results.length - 1 ? "1px solid #f5f2ee" : "none",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handlePick(r)}
                        className="w-full text-left transition-colors flex items-start gap-3"
                        style={{ padding: "12px 16px", background: "transparent" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#faf9f7")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <MapPin size={16} style={{ color: "#c4944a", marginTop: 2, flexShrink: 0 }} />
                        <div className="min-w-0 flex-1">
                          <div style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a18" }}>
                            {r.name}
                          </div>
                          <div
                            style={{ fontSize: "12px", color: "#aaa", marginTop: 2 }}
                            className="truncate"
                          >
                            {shortAddress(r) || r.address}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* No results */}
            {showDropdown && hasSearched && !searching && results.length === 0 && (
              <div
                className="text-center"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 100,
                  marginTop: 4,
                  background: "#fff",
                  border: "1px solid #ede9e3",
                  borderRadius: "12px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  padding: "16px",
                  fontSize: "13px",
                  color: "#999",
                }}
              >
                Nenhum resultado encontrado
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-1">
              {t("location")}
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Bairro, cidade ou endereço"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="block text-sm font-medium text-card-foreground">{t("cuisine")}</label>
              {cuisineLoading && (
                <Loader2 size={12} className="animate-spin text-muted-foreground" />
              )}
              {!cuisineLoading && cuisineSuggested && !cuisineManual && (
                <span
                  className="inline-flex items-center gap-1"
                  style={{ fontSize: "11px", color: "#c4844a" }}
                >
                  <Sparkles size={11} /> sugerido pela IA
                </span>
              )}
            </div>
            <select
              value={cuisine}
              onChange={(e) => {
                setCuisine(e.target.value);
                setCuisineManual(true);
                setCuisineSuggested(false);
              }}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {CUISINE_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, #d4a855 0%, #c4944a 100%)",
              height: "52px",
              borderRadius: "14px",
            }}
          >
            {t("add_btn")}
          </button>
        </form>
      </div>
    </div>
  );
}
