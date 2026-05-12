import { createFileRoute } from "@tanstack/react-router";
import { requireAuthFromRequest } from "@/lib/require-auth";

export const Route = createFileRoute("/api/maps/geocode")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Prefer a server-only key without referrer restrictions for Geocoding.
        const apiKey = process.env.GOOGLE_GEOCODING_KEY || process.env.GOOGLE_MAPS_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "GOOGLE_GEOCODING_KEY not set" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        let body: { address?: string };
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const address = (body.address ?? "").trim();
        if (!address) {
          return new Response(JSON.stringify({ error: "address required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
        url.searchParams.set("address", address);
        url.searchParams.set("region", "br");
        url.searchParams.set("language", "pt-BR");
        url.searchParams.set("key", apiKey);

        const res = await fetch(url.toString());

        if (!res.ok) {
          return new Response(
            JSON.stringify({ error: `Google Geocoding error ${res.status}` }),
            { status: 502, headers: { "Content-Type": "application/json" } }
          );
        }

        const data = (await res.json()) as {
          status: string;
          error_message?: string;
          results?: Array<{
            formatted_address: string;
            geometry: { location: { lat: number; lng: number } };
          }>;
        };

        if (data.status !== "OK" || !data.results?.length) {
          return new Response(
            JSON.stringify({
              status: data.status,
              error_message: data.error_message ?? null,
              lat: null,
              lng: null,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        const first = data.results[0];
        return new Response(
          JSON.stringify({
            status: "OK",
            lat: first.geometry.location.lat,
            lng: first.geometry.location.lng,
            formatted_address: first.formatted_address,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      },
    },
  },
});
