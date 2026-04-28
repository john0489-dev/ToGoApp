import { useState, useEffect, useRef } from "react";
import { X, Loader2, Sparkles } from "lucide-react";
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
  const url =
    "https://nominatim.openstreetmap.org/search?" +
    new URLSearchParams({
      q: query,
      format: "json",
      addressdetails: "1",
      limit: "5",
      countrycodes: "br",
      "accept-language": "pt-BR",
    });
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((item: any) => ({
    name: item.name || String(item.display_name).split(",")[0],
    address: item.display_name,
    lat: item.lat,
    lon: item.lon,
    neighbourhood:
      item.address?.suburb ||
      item.address?.neighbourhood ||
      item.address?.city_district ||
      item.address?.city ||
      item.address?.town ||
      "",
  }));
}

function shortAddress(p: PlaceResult): string {
  const parts = p.address.split(",").map((s) => s.trim());
  // Try neighbourhood + city
  if (p.neighbourhood) {
    const city = parts.find((x) => x && x !== p.neighbourhood && x !== p.name);
    return city ? `${p.neighbourhood}, ${city}` : p.neighbourhood;
  }
  return parts.slice(1, 3).join(", ");
}

export function AddRestaurantDialog({ open, onClose, onAdd }: AddRestaurantDialogProps) {
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
        console.error("nominatim search failed", err);
      } finally {
        if (myReq === reqIdRef.current) setSearching(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [name]);

  if (!open) return null;

  const handlePick = (p: PlaceResult) => {
    setName(p.name);
    const short = shortAddress(p);
    setLocation(short || p.address);
    setSelectedAddress({ address: p.address, lat: parseFloat(p.lat), lon: parseFloat(p.lon) });
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
    onAdd({
      name: name.trim(),
      location: location.trim(),
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
          <h2 className="text-lg font-semibold text-card-foreground">Adicionar Restaurante</h2>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-1">
              Nome ou endereço do restaurante
            </label>
            <div className="relative">
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
                placeholder="Ex: Spot Burger, Pinheiros"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-16 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                required
                autoComplete="off"
              />
              {searching && (
                <Loader2 size={16} className="absolute right-9 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
              {name && (
                <button
                  type="button"
                  onClick={handleClearName}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Limpar"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Dropdown */}
            {showDropdown && results.length > 0 && (
              <div
                className="mt-1 overflow-hidden"
                style={{
                  background: "#fff",
                  border: "1px solid #ede9e3",
                  borderRadius: "12px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
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
                        className="w-full text-left transition-colors"
                        style={{ padding: "12px 16px", background: "transparent" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#faf9f7")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <div style={{ fontSize: "14px", fontWeight: 500, color: "#1a1a18" }}>
                          {r.name}
                        </div>
                        <div style={{ fontSize: "12px", color: "#aaa", marginTop: 2 }}>
                          {shortAddress(r) || r.address}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* No results */}
            {showDropdown && hasSearched && !searching && results.length === 0 && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Nenhum resultado. Digite o endereço manualmente.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-1">
              Localização / Endereço
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
              <label className="block text-sm font-medium text-card-foreground">Culinária</label>
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
            Adicionar
          </button>
        </form>
      </div>
    </div>
  );
}
