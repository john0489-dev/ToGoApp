import { createFileRoute } from "@tanstack/react-router";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { requireAuthFromRequest } from "@/lib/require-auth";

interface RequestBody {
  name?: string;
  address?: string;
}

export const Route = createFileRoute("/api/suggest-cuisine")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const ip = getClientIp(request);
          if (!checkRateLimit(`suggest-cuisine:${ip}`, 20, 60_000)) {
            return Response.json(
              { error: "Muitas requisições. Aguarde um instante e tente novamente." },
              { status: 429 }
            );
          }
          const body = (await request.json()) as RequestBody;
          const name = (body.name || "").trim().slice(0, 200);
          const address = (body.address || "").trim().slice(0, 300);

          if (name.length < 2) {
            return Response.json({ cuisine: "Outro" });
          }

          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            console.error("LOVABLE_API_KEY not configured");
            return Response.json({ cuisine: "Outro" });
          }

          const prompt = `Dado o nome do restaurante "${name}"${address ? ` localizado em "${address}"` : ""}, qual é o tipo de culinária mais provável? Responda APENAS com uma palavra ou expressão curta em português. Exemplos: Japonês, Italiano, Brasileiro, Bar, Árabe, Mexicano, Pizzaria, Hamburguer, Frutos do Mar, Churrascaria, Vegano, Contemporâneo, Brunch, Café. Se não souber, responda: Outro`;

          const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: "Você classifica restaurantes por tipo de culinária. Responda apenas com uma palavra ou expressão curta em português, sem pontuação extra." },
                { role: "user", content: prompt },
              ],
            }),
          });

          if (!resp.ok) {
            if (resp.status === 429) {
              return Response.json({ error: "Muitas requisições. Tente novamente em instantes." }, { status: 429 });
            }
            if (resp.status === 402) {
              return Response.json({ error: "Créditos de IA esgotados." }, { status: 402 });
            }
            const t = await resp.text();
            console.error("suggest-cuisine ai error", resp.status, t);
            return Response.json({ cuisine: "Outro" });
          }

          const data = (await resp.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          let cuisine = (data.choices?.[0]?.message?.content || "").trim();
          // strip quotes / trailing punctuation
          cuisine = cuisine.replace(/^["'`]+|["'`.!?]+$/g, "").trim();
          if (!cuisine) cuisine = "Outro";
          // cap length
          cuisine = cuisine.slice(0, 40);

          return Response.json({ cuisine });
        } catch (err) {
          console.error("suggest-cuisine handler error", err);
          return Response.json({ cuisine: "Outro" });
        }
      },
    },
  },
});
