import { createFileRoute } from "@tanstack/react-router";

interface PlacePrediction {
  name: string;
  address: string;
  lat: number | null;
  lon: number | null;
  neighbourhood: string;
  placeId: string;
}

async function callGoogle(apiKey: string, query: string): Promise<Response> {
  return fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.shortFormattedAddress",
        "places.location",
        "places.addressComponents",
      ].join(","),
      // Some Google edges echo the Referer back into restriction checks even
      // for keys with no app restriction; sending an explicit referer avoids
      // the rare API_KEY_HTTP_REFERRER_BLOCKED edge cases.
      Referer: "https://togo.lovable.app",
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: "pt-BR",
      regionCode: "BR",
      maxResultCount: 5,
      locationBias: {
        rectangle: {
          low: { latitude: -33.75, longitude: -73.99 },
          high: { latitude: 5.27, longitude: -34.79 },
        },
      },
    }),
  });
}

export const Route = createFileRoute("/api/maps/autocomplete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const apiKey = process.env.GOOGLE_MAPS_KEY;
          if (!apiKey) {
            return Response.json(
              { error: "GOOGLE_MAPS_KEY não configurada" },
              { status: 500 }
            );
          }

          const body = (await request.json().catch(() => ({}))) as {
            query?: unknown;
          };
          const query = typeof body.query === "string" ? body.query.trim() : "";

          if (query.length < 3) {
            return Response.json({ results: [] satisfies PlacePrediction[] });
          }
          if (query.length > 200) {
            return Response.json({ error: "query muito longa" }, { status: 400 });
          }

          // Try once; on transient failure (5xx / 403 propagation), retry once.
          let res = await callGoogle(apiKey, query);
          if (!res.ok && (res.status === 403 || res.status >= 500)) {
            await new Promise((r) => setTimeout(r, 250));
            res = await callGoogle(apiKey, query);
          }

          if (!res.ok) {
            const text = await res.text().catch(() => "");
            console.error(
              "[maps/autocomplete] Google API error",
              res.status,
              text.slice(0, 500)
            );
            return Response.json(
              { error: "Falha na busca de lugares" },
              { status: 502 }
            );
          }

          const data = (await res.json()) as {
            places?: Array<{
              id?: string;
              displayName?: { text?: string };
              formattedAddress?: string;
              shortFormattedAddress?: string;
              location?: { latitude?: number; longitude?: number };
              addressComponents?: Array<{
                longText?: string;
                shortText?: string;
                types?: string[];
              }>;
            }>;
          };

          const results: PlacePrediction[] = (data.places ?? []).map((p) => {
            const comps = p.addressComponents ?? [];
            const findComp = (...types: string[]) =>
              comps.find((c) => c.types?.some((t) => types.includes(t)))
                ?.longText ?? "";
            const neighbourhood =
              findComp("sublocality", "sublocality_level_1", "neighborhood") ||
              findComp("administrative_area_level_2") ||
              findComp("locality") ||
              "";
            return {
              name: p.displayName?.text ?? p.formattedAddress ?? "",
              address: p.formattedAddress ?? p.shortFormattedAddress ?? "",
              lat: p.location?.latitude ?? null,
              lon: p.location?.longitude ?? null,
              neighbourhood,
              placeId: p.id ?? "",
            };
          });

          return Response.json(
            { results },
            { headers: { "Cache-Control": "private, max-age=60" } }
          );
        } catch (err) {
          console.error("[maps/autocomplete] unexpected error", err);
          return Response.json(
            { error: "Erro inesperado" },
            { status: 500 }
          );
        }
      },
    },
  },
});
