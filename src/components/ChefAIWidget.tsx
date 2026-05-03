import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, X } from "lucide-react";
import ReactMarkdown from "react-markdown";

type ChatMsg = { role: "user" | "assistant"; content: string };

interface RestaurantContext {
  name: string;
  cuisine?: string | null;
  location?: string | null;
  rating?: number | null;
  visited?: boolean;
  occasion?: string | null;
  tags?: string[] | null;
}

interface Props {
  restaurants: RestaurantContext[];
}

const QUICK_PROMPTS: { emoji: string; label: string; prompt: string }[] = [
  { emoji: "🍕", label: "Italiano", prompt: "Quero comer comida italiana hoje" },
  { emoji: "🍻", label: "Happy hour", prompt: "Sugira um lugar bom para happy hour" },
  { emoji: "💑", label: "Jantar romântico", prompt: "Quero um jantar romântico" },
  { emoji: "🌮", label: "Algo diferente", prompt: "Me sugira algo diferente do comum" },
  { emoji: "⭐", label: "Melhor avaliado", prompt: "Quais os melhores avaliados da minha lista?" },
  { emoji: "🆕", label: "Lugar novo", prompt: "Sugira um lugar novo que eu ainda não conheço" },
];

export function ChefAIWidget({ restaurants }: Props) {
  const [open, setOpen] = useState(false);
  const [showBadge, setShowBadge] = useState(true);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleOpen = () => {
    setOpen(true);
    setShowBadge(false);
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMsg: ChatMsg = { role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const resp = await fetch("/api/chef-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, restaurants }),
      });
      if (!resp.ok) {
        let errMsg = "Não consegui responder agora. Tente novamente.";
        if (resp.status === 429) errMsg = "Muitas requisições. Aguarde um instante e tente de novo.";
        try {
          const j = await resp.json();
          if (j?.error) errMsg = String(j.error);
        } catch {
          /* ignore */
        }
        setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${errMsg}` }]);
        return;
      }
      const data = (await resp.json()) as { reply?: string; error?: string };
      const reply = data.reply || data.error || "Não recebi resposta.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Erro de conexão. Tente novamente." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          type="button"
          onClick={handleOpen}
          aria-label="Abrir Chef AI"
          className="fixed z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg active:scale-95 transition-transform"
          style={{
            bottom: "88px",
            right: "20px",
            background: "linear-gradient(135deg, #d4a855, #c4844a)",
            boxShadow: "0 8px 24px -6px rgba(196, 132, 74, 0.5)",
          }}
        >
          <Sparkles size={22} className="text-white" fill="white" />
          {showBadge && (
            <span
              className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
              style={{ background: "#e53935", boxShadow: "0 0 0 2px #faf9f7" }}
            >
              novo
            </span>
          )}
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="fixed z-50 flex flex-col rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-200"
          style={{
            bottom: "88px",
            right: "12px",
            left: "12px",
            maxWidth: "420px",
            margin: "0 auto",
            height: "min(70vh, 560px)",
            background: "#faf9f7",
            border: "1px solid #ede9e3",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between rounded-t-2xl px-4 py-3"
            style={{ background: "#1a1a18", color: "#fff" }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🍽️</span>
              <div>
                <p className="text-sm font-semibold leading-tight">Chef AI</p>
                <p className="text-[10px] opacity-70 leading-tight">Sugestões gastronômicas</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar Chef AI"
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5"
            style={{ background: "#faf9f7" }}
          >
            {messages.length === 0 && (
              <div className="space-y-3">
                <div
                  className="rounded-2xl px-3 py-2.5 text-sm"
                  style={{ background: "#fff", border: "1px solid #ede9e3", color: "#1a1a18" }}
                >
                  Olá! 👋 Sou o <strong>Chef AI</strong>. Posso sugerir restaurantes da sua lista
                  ou novos lugares. Com vontade de quê?
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map((q) => (
                    <button
                      key={q.label}
                      type="button"
                      onClick={() => send(q.prompt)}
                      disabled={loading}
                      className="rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors disabled:opacity-50"
                      style={{
                        background: "#fff",
                        border: "1px solid #ede9e3",
                        color: "#1a1a18",
                      }}
                    >
                      {q.emoji} {q.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={i}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className="max-w-[85%] rounded-2xl px-3 py-2 text-sm"
                    style={
                      isUser
                        ? {
                            background: "linear-gradient(135deg, #d4a855, #c4844a)",
                            color: "#fff",
                          }
                        : {
                            background: "#fff",
                            border: "1px solid #ede9e3",
                            color: "#1a1a18",
                          }
                    }
                  >
                    {isUser ? (
                      <span className="whitespace-pre-wrap">{m.content}</span>
                    ) : (
                      <div className="prose prose-sm max-w-none [&_p]:my-1 [&_strong]:text-[#c4844a]">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-start">
                <div
                  className="rounded-2xl px-3 py-2.5"
                  style={{ background: "#fff", border: "1px solid #ede9e3" }}
                  aria-label="Chef AI está digitando"
                >
                  <div className="flex items-center gap-1">
                    <Dot delay={0} />
                    <Dot delay={150} />
                    <Dot delay={300} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div
            className="flex items-center gap-2 rounded-b-2xl px-3 py-2.5"
            style={{ background: "#fff", borderTop: "1px solid #ede9e3" }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Com vontade de quê?"
              disabled={loading}
              className="flex-1 rounded-full px-3.5 py-2 text-sm outline-none transition-colors disabled:opacity-50"
              style={{ background: "#faf9f7", border: "1px solid #ede9e3", color: "#1a1a18" }}
            />
            <button
              type="button"
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              aria-label="Enviar"
              className="flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-95 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #d4a855, #c4844a)" }}
            >
              <Send size={14} className="text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full"
      style={{
        background: "#c4844a",
        animation: "chefAiBlink 1.2s infinite ease-in-out",
        animationDelay: `${delay}ms`,
      }}
    />
  );
}
