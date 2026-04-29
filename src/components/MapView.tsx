import { useEffect, useMemo, useRef, useState, memo, useCallback } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { Locate, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { updateRestaurant } from "@/lib/api.functions";

type Restaurant = {
  id: string;
  name: string;
  location: string;
  cuisine: string;
  visited: boolean;
  rating: number;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
};

interface MapViewProps {
  restaurants: Restaurant[];
}

const FALLBACK_CENTER = { lat: -23.5505, lng: -46.6333 }; // São Paulo
const VISITED_COLOR = "#3a9a5c";
const TOVISIT_COLOR = "#c4844a";

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.restaurant", elementType: "all", stylers: [{ visibility: "on" }] },
  { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
];

type DistanceFilter = 0 | 1 | 3 | 5; // 0 = todos

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Cache loader promise across mounts
let loaderPromise: Promise<typeof google> | null = null;

async function loadGoogleMaps(): Promise<typeof google> {
  if (loaderPromise) return loaderPromise;
  loaderPromise = (async () => {
    const res = await fetch("/api/maps/config", { credentials: "same-origin" });
    if (!res.ok) throw new Error("Failed to fetch maps config");
    const { apiKey } = (await res.json()) as { apiKey: string };
    const loader = new Loader({
      apiKey,
      version: "weekly",
      libraries: ["maps", "marker"],
      language: "pt-BR",
      region: "BR",
    });
    await loader.importLibrary("maps");
    await loader.importLibrary("marker");
    return google;
  })();
  return loaderPromise;
}

function markerSvg(color: string) {
  // Round dot with white border, drop shadow via SVG filter
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'>
    <defs><filter id='s' x='-50%' y='-50%' width='200%' height='200%'>
      <feDropShadow dx='0' dy='1.5' stdDeviation='1.5' flood-opacity='0.35'/>
    </filter></defs>
    <circle cx='14' cy='14' r='9' fill='${color}' stroke='white' stroke-width='3' filter='url(#s)'/>
  </svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function MapViewImpl({ restaurants }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const updateRestaurantFn = useServerFn(updateRestaurant);

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<DistanceFilter>(0);
  const [geocodingCount, setGeocodingCount] = useState(0);
  const [geocodedCoords, setGeocodedCoords] = useState<Record<string, { lat: number; lng: number }>>({});

  // ---- Init map once ----
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !containerRef.current) return;
        mapRef.current = new g.maps.Map(containerRef.current, {
          center: FALLBACK_CENTER,
          zoom: 13,
          styles: MAP_STYLES,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          clickableIcons: false,
        });
        infoRef.current = new g.maps.InfoWindow();
        setReady(true);
      })
      .catch((e) => {
        console.error("Google Maps load failed", e);
        setLoadError("Não foi possível carregar o Google Maps.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Get user location ----
  useEffect(() => {
    if (!ready || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(p);
        if (mapRef.current) {
          mapRef.current.setCenter(p);
          mapRef.current.setZoom(13);
        }
      },
      () => {/* keep fallback */},
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, [ready]);

  // ---- Geocode missing addresses (background) ----
  useEffect(() => {
    if (!ready) return;
    const missing = restaurants.filter(
      (r) => (r.latitude == null || r.longitude == null) && !geocodedCoords[r.id]
    );
    if (missing.length === 0) return;

    let cancelled = false;
    setGeocodingCount(missing.length);

    (async () => {
      for (const r of missing) {
        if (cancelled) break;
        const query = [r.address, r.location, r.name].filter(Boolean).join(", ");
        if (!query) continue;
        try {
          const res = await fetch("/api/maps/geocode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address: query }),
          });
          if (!res.ok) continue;
          const data = (await res.json()) as { lat: number | null; lng: number | null; status?: string };
          if (data.lat != null && data.lng != null) {
            if (cancelled) break;
            setGeocodedCoords((prev) => ({ ...prev, [r.id]: { lat: data.lat!, lng: data.lng! } }));
            // Persist asynchronously, don't await
            updateRestaurantFn({
              data: { id: r.id, latitude: data.lat, longitude: data.lng },
            }).catch(() => {});
          }
        } catch {
          /* ignore one-off errors */
        }
        // small delay to be nice
        await new Promise((r) => setTimeout(r, 150));
        setGeocodingCount((c) => Math.max(c - 1, 0));
      }
      if (!cancelled) setGeocodingCount(0);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, restaurants]);

  // ---- Build marker data ----
  const markersData = useMemo(() => {
    const all = restaurants
      .map((r) => {
        const lat = r.latitude ?? geocodedCoords[r.id]?.lat ?? null;
        const lng = r.longitude ?? geocodedCoords[r.id]?.lng ?? null;
        if (lat == null || lng == null) return null;
        return { ...r, lat, lng };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);

    if (distance === 0 || !userPos) return all;
    return all.filter(
      (m) => haversineKm(userPos.lat, userPos.lng, m.lat, m.lng) <= distance
    );
  }, [restaurants, geocodedCoords, userPos, distance]);

  // ---- Render markers ----
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;

    // Clear old
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    markersData.forEach((m) => {
      const marker = new google.maps.Marker({
        position: { lat: m.lat, lng: m.lng },
        map,
        title: m.name,
        icon: {
          url: markerSvg(m.visited ? VISITED_COLOR : TOVISIT_COLOR),
          scaledSize: new google.maps.Size(28, 28),
          anchor: new google.maps.Point(14, 14),
        },
      });
      marker.addListener("click", () => {
        if (!infoRef.current) return;
        const html = `
          <div style="font-family: inherit; max-width: 220px; padding: 4px 2px;">
            <div style="font-weight: 700; font-size: 14px; color: #1f1d1a; margin-bottom: 2px;">
              ${escapeHtml(m.name)}
            </div>
            <div style="font-size: 12px; color: #6b6760; margin-bottom: 8px;">
              ${escapeHtml(m.location || "")}${m.location && m.cuisine ? " • " : ""}${escapeHtml(m.cuisine || "")}
            </div>
            <button
              data-restaurant-id="${m.id}"
              class="togo-info-btn"
              style="
                background: #c4844a; color: white; border: none;
                border-radius: 8px; padding: 6px 12px; font-size: 12px;
                font-weight: 600; cursor: pointer; width: 100%;
              "
            >Ver detalhes</button>
          </div>
        `;
        infoRef.current.setContent(html);
        infoRef.current.open({ map, anchor: marker });

        // Wire button after content renders
        google.maps.event.addListenerOnce(infoRef.current, "domready", () => {
          const btn = document.querySelector<HTMLButtonElement>(
            `.togo-info-btn[data-restaurant-id="${m.id}"]`
          );
          btn?.addEventListener("click", () => {
            window.dispatchEvent(
              new CustomEvent("togo:open-restaurant", { detail: { id: m.id } })
            );
            infoRef.current?.close();
          });
        });
      });
      markersRef.current.push(marker);
    });
  }, [ready, markersData]);

  // ---- User marker ----
  useEffect(() => {
    if (!ready || !mapRef.current || !userPos) return;
    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition(userPos);
      return;
    }
    userMarkerRef.current = new google.maps.Marker({
      position: userPos,
      map: mapRef.current,
      icon: {
        url:
          "data:image/svg+xml;charset=UTF-8," +
          encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'>
              <circle cx='10' cy='10' r='8' fill='#1a73e8' opacity='0.25'/>
              <circle cx='10' cy='10' r='5' fill='#1a73e8' stroke='white' stroke-width='2'/>
            </svg>`
          ),
        scaledSize: new google.maps.Size(20, 20),
        anchor: new google.maps.Point(10, 10),
      },
      zIndex: 9999,
    });
  }, [ready, userPos]);

  const recenter = useCallback(() => {
    if (!mapRef.current) return;
    if (userPos) {
      mapRef.current.panTo(userPos);
      mapRef.current.setZoom(14);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserPos(p);
          mapRef.current?.panTo(p);
          mapRef.current?.setZoom(14);
        },
        () => {}
      );
    }
  }, [userPos]);

  const totalWithCoords = restaurants.filter(
    (r) => (r.latitude != null && r.longitude != null) || geocodedCoords[r.id]
  ).length;
  const unresolvedCount = restaurants.length - totalWithCoords;

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <p>{loadError}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ height: "calc(100vh - 280px)", minHeight: "400px" }}>
      <div ref={containerRef} className="h-full w-full rounded-lg overflow-hidden bg-muted" />

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin mr-2" />
          Carregando mapa...
        </div>
      )}

      {/* Distance filter */}
      {ready && (
        <div className="absolute top-3 left-3 z-10 flex gap-1 rounded-lg border border-[#ede9e3] bg-card/95 p-1 shadow-md backdrop-blur-sm">
          {([0, 1, 3, 5] as DistanceFilter[]).map((d) => (
            <button
              key={d}
              onClick={() => setDistance(d)}
              disabled={d !== 0 && !userPos}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                distance === d
                  ? "bg-[#c4844a] text-white"
                  : "text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
              }`}
              title={d === 0 ? "Mostrar todos" : `Até ${d} km da minha localização`}
            >
              {d === 0 ? "Todos" : `${d}km`}
            </button>
          ))}
        </div>
      )}

      {/* Recenter button */}
      {ready && (
        <button
          onClick={recenter}
          className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg border border-[#ede9e3] bg-card/95 text-foreground shadow-md backdrop-blur-sm hover:bg-accent transition-colors"
          title="Centralizar na minha localização"
          aria-label="Centralizar"
        >
          <Locate size={16} />
        </button>
      )}

      {/* Legend */}
      {ready && (
        <div className="absolute bottom-4 left-4 z-10 rounded-lg border border-[#ede9e3] bg-card/95 px-3 py-2 shadow-md backdrop-blur-sm">
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: VISITED_COLOR, border: "2px solid white", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
              Visitado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: TOVISIT_COLOR, border: "2px solid white", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
              Para visitar
            </span>
          </div>
          {(unresolvedCount > 0 || geocodingCount > 0) && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {geocodingCount > 0
                ? `Localizando ${geocodingCount} endereço${geocodingCount > 1 ? "s" : ""}...`
                : `${unresolvedCount} sem localização precisa.`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const MapView = memo(MapViewImpl);
