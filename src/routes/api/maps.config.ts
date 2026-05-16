import { createFileRoute } from "@tanstack/react-router";
import { requireAuthFromRequest } from "@/lib/require-auth";

export const Route = createFileRoute("/api/maps/config")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireAuthFromRequest(request);
        if (!auth.ok) return auth.response;

        const apiKey = process.env.GOOGLE_MAPS_BROWSER_KEY || process.env.GOOGLE_MAPS_KEY || "AIzaSyD65jmUhMkYgSBDdArG7mj73fn3B0YCqjQ";
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "GOOGLE_MAPS_KEY not set" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
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
