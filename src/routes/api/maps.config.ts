import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/maps/config")({
  server: {
    handlers: {
      GET: async () => {
        const apiKey = process.env.GOOGLE_MAPS_KEY;
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
