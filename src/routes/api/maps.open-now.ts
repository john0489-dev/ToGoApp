import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/maps/open-now")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const apiKey = process.env.GOOGLE_MAPS_KEY;
          if (!apiKey) {
            return Response.json({ error: "GOOGLE_MAPS_KEY não configurada" }, { status: 500 });
          }

          const body = (await request.json().catch(() => ({}))) as {
            query?: unknown;
          };
          const query = typeof body.query === "string" ? body.query.trim() : "";
          if (query.length < 3 || query.length > 300) {
            return Response.json({ openNow: null });
          }

          const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": apiKey,
              "X-Goog-FieldMask": "places.id,places.currentOpeningHours.openNow,places.regularOpeningHours.openNow",
              Referer: "https://togo.lovable.app",
            },
            body: JSON.stringify({
              textQuery: query,
              languageCode: "pt-BR",
              regionCode: "BR",
              maxResultCount: 1,
            }),
          });

          if (!res.ok) {
            console.error("[maps/open-now] Google API error", res.status);
            return Response.json({ openNow: null });
          }

          const data = (await res.json()) as {
            places?: Array<{
              currentOpeningHours?: { openNow?: boolean };
              regularOpeningHours?: { openNow?: boolean };
            }>;
          };

          const place = data.places?.[0];
          const openNow =
            place?.currentOpeningHours?.openNow ??
            place?.regularOpeningHours?.openNow ??
            null;

          return Response.json(
            { openNow },
            { headers: { "Cache-Control": "private, max-age=300" } }
          );
        } catch (err) {
          console.error("[maps/open-now] unexpected error", err);
          return Response.json({ openNow: null });
        }
      },
    },
  },
});
