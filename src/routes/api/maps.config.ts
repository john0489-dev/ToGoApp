import { createFileRoute } from "@tanstack/react-router";
import { requireAuthFromRequest } from "@/lib/require-auth";

export const Route = createFileRoute("/api/maps/config")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireAuthFromRequest(request);
        if (!auth.ok) return auth.response;

        const apiKey =
          process.env.GOOGLE_MAPS_BROWSER_KEY || process.env.GOOGLE_MAPS_KEY;
        if (!apiKey) {
          return Response.json(
            { error: "Maps key not configured" },
            { status: 500 },
          );
        }
        return new Response(JSON.stringify({ apiKey }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "private, max-age=300",
          },
        });
      },
    },
  },
});
