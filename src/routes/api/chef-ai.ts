import { createFileRoute } from "@tanstack/react-router";

type ChatMsg = { role: "user" | "assistant"; content: string };

interface RestaurantContext {
  name: string;
  cuisine?: string | null;
  location?: string | null;
  rating?: number | null;
  visited?: boolean;
  occasion?: string | null;
  tags?: string[];
}

interface RequestBody {
  messages: ChatMsg[];
  restaurants?: RestaurantContext[];
}

const SYSTEM_BASE = `Você é o Chef AI, assistente gastronômico do app To Go.
Primeiro sugira restaurantes da lista do usuário que combinam com o pedido (até 3),
depois sugira 2 lugares novos externos. Responda em português, com emojis,
de forma curta e amigável. Use **negrito** nos nomes dos restaurantes.
Se a lista do usuário estiver vazia, foque nas sugestões externas (5 lugares).`;

function buildSystemPrompt(restaurants: RestaurantContext[] | undefined): string {
  if (!restaurants || restaurants.length === 0) {
    return `${SYSTEM_BASE}\n\nLista do usuário: (vazia)`;
  }
  const summary = restaurants
    .slice(0, 60)
    .map((r) => {
      const parts = [
        r.name,
        r.cuisine ? `cozinha ${r.cuisine}` : null,
        r.location ? `bairro ${r.location}` : null,
        r.rating ? `nota ${r.rating}/10` : null,
        r.visited ? "visitado" : "ainda não visitado",
        r.occasion ? `ocasião ${r.occasion}` : null,
        r.tags && r.tags.length ? `tags: ${r.tags.join(", ")}` : null,
      ].filter(Boolean);
      return `- ${parts.join("; ")}`;
    })
    .join("\n");
  return `${SYSTEM_BASE}\n\nLista do usuário (${restaurants.length} restaurantes):\n${summary}`;
}

export const Route = createFileRoute("/api/chef-ai")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as RequestBody;
          if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
            return Response.json({ error: "messages required" }, { status: 400 });
          }
          // Basic guard: cap message size
          const cleanMessages = body.messages
            .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
            .slice(-20)
            .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

          const apiKey = process.env.ANTHROPIC_API_KEY;
          if (!apiKey) {
            return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
          }

          const system = buildSystemPrompt(body.restaurants);

          const resp = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-20250514",
              max_tokens: 600,
              system,
              messages: cleanMessages,
            }),
          });

          if (!resp.ok) {
            const errText = await resp.text();
            console.error("Anthropic error", resp.status, errText);
            return Response.json(
              { error: `Anthropic API error (${resp.status})` },
              { status: resp.status === 429 ? 429 : 500 },
            );
          }

          const data = (await resp.json()) as {
            content?: Array<{ type: string; text?: string }>;
          };
          const text =
            data.content
              ?.filter((c) => c.type === "text" && c.text)
              .map((c) => c.text as string)
              .join("\n") ?? "";

          return Response.json({ reply: text });
        } catch (err) {
          console.error("chef-ai handler error", err);
          return Response.json({ error: "Internal error" }, { status: 500 });
        }
      },
    },
  },
});
