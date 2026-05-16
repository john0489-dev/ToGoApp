import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/maps/config")({
  server: {
    handlers: {
      GET: async () => {
        const apiKey = process.env.GOOGLE_MAPS_BROWSER_KEY || process.env.GOOGLE_MAPS_KEY || "AIzaSyD65jmUhMkYgSBDdArG7mj73fn3B0YCqjQ";
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
