import { useState, useEffect, useMemo } from "react";
import { Navigation, MapPin } from "lucide-react";
import { formatLocation } from "@/lib/format-location";

type Restaurant = {
  id: string;
  name: string;
  location: string;
  country?: string | null;
  cuisine: string;
  visited: boolean;
  rating: number;
  latitude?: number | null;
  longitude?: number | null;
};

interface NearMeViewProps {
  restaurants: Restaurant[];
  onToggleVisited: (id: string) => void;
}

type Range = 1 | 3 | 5;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function NearMeView({ restaurants, onToggleVisited }: NearMeViewProps) {
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [range, setRange] = useState<Range>(3);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocalização não é suportada pelo seu navegador.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setError("Permissão de localização negada. Ative nas configurações do navegador.");
        } else {
          setError("Não foi possível obter sua localização.");
        }
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const nearby = useMemo(() => {
    if (!userPos) return [];

    return restaurants
      .filter((r) => r.latitude != null && r.longitude != null)
      .map((r) => {
        const distance = haversineKm(userPos.lat, userPos.lng, r.latitude as number, r.longitude as number);
        return { ...r, distance };
      })
      .filter((r) => r.distance <= range)
      .sort((a, b) => a.distance - b.distance);
  }, [restaurants, userPos, range]);

  const unresolvedCount = restaurants.filter((r) => r.latitude == null || r.longitude == null).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <Navigation size={24} className="text-primary animate-pulse" />
        <p className="text-sm text-muted-foreground">Obtendo sua localização...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
        <MapPin size={24} className="text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-2">
        {([1, 3, 5] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              range === r ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {r} km
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {nearby.length} {nearby.length === 1 ? "restaurante encontrado" : "restaurantes encontrados"} em {range} km
      </p>

      {unresolvedCount > 0 && (
        <p className="text-center text-[11px] text-muted-foreground">
          {unresolvedCount} ainda aguardando localização precisa.
        </p>
      )}

      <div className="space-y-2 pb-6">
        {nearby.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum restaurante com localização precisa encontrado nesse raio ainda.
          </p>
        ) : (
          nearby.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
              <button
                onClick={() => onToggleVisited(r.id)}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  r.visited ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                }`}
              >
                {r.visited ? "✓" : "?"}
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{r.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.cuisine} • {formatLocation(r.location, r.country)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold" style={{ color: "#c4844a" }}>
                  {r.distance < 1 ? `${Math.round(r.distance * 1000)}m` : `${r.distance.toFixed(1)}km`}
                </p>
                {r.visited && r.rating > 0 && <p className="text-xs text-muted-foreground">⭐ {r.rating}</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
