import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Loader2, Settings } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useAuth } from "@/hooks/useAuth";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Planos — To Go" },
      { name: "description", content: "Compare Free e Pro e escolha o melhor plano." },
      { property: "og:title", content: "Planos — To Go" },
      { property: "og:description", content: "Free para sempre ou Pro com recursos ilimitados." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&display=swap",
      },
    ],
  }),
  component: PricingPage,
});

const FREE_FEATURES = [
  "Até 20 restaurantes",
  "3 listas",
  "Avaliação por estrelas",
  "Compartilhar lista",
];

const PRO_FEATURES = [
  "Restaurantes ilimitados",
  "Listas ilimitadas",
  "Fotos e notas detalhadas",
  "Filtros avançados",
  "Histórico de visitas",
  "Listas colaborativas",
  "Exportar em PDF",
];

function PricingPage() {
  const navigate = useNavigate();
  const { plan, refresh } = usePlan();
  const { user, session } = useAuth();
  const { openCheckout, loading: checkoutLoading } = usePaddleCheckout();
  const isPro = plan === "pro";

  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");
  const [portalLoading, setPortalLoading] = useState(false);

  const yearlyMonthly = (99 / 12).toFixed(2).replace(".", ",");

  const handleSubscribe = async () => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    try {
      await openCheckout({
        priceId: billing === "monthly" ? "togo_pro_monthly" : "togo_pro_yearly",
        userId: user.id,
        customerEmail: user.email ?? undefined,
        successUrl: `${window.location.origin}/payment/success`,
      });
    } catch (err) {
      console.error("[checkout]", err);
      toast.error("Erro ao processar. Tente novamente.");
    }
  };

  const handleManage = async () => {
    if (!session?.access_token) return;
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error || !data?.url) throw error || new Error("No URL");
      window.open(data.url, "_blank", "noopener");
      setTimeout(refresh, 2000);
    } catch (err) {
      console.error("[portal]", err);
      toast.error("Não foi possível abrir o portal. Tente novamente.");
    } finally {
      setPortalLoading(false);
    }
  };

  const serif = "'Playfair Display', Georgia, serif";

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "#faf9f7" }}>
      <header
        style={{
          background: "#faf9f7",
          padding: "max(20px, calc(env(safe-area-inset-top) + 12px)) 20px 20px",
        }}
      >
        <div className="mx-auto max-w-lg">
          <button
            onClick={() => navigate({ to: "/", search: { list: undefined } })}
            className="flex items-center justify-center transition-colors"
            style={{
              width: 36,
              height: 36,
              background: "#fff",
              border: "1px solid #ede9e3",
              borderRadius: 10,
              color: "#888",
            }}
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="mt-7 flex flex-col items-center text-center">
            <h1
              style={{
                fontFamily: serif,
                fontSize: 28,
                fontWeight: 400,
                color: "#1a1a18",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              Escolha seu plano
            </h1>
            <p style={{ marginTop: 10, fontSize: 14, color: "#aaa", maxWidth: 280 }}>
              Comece grátis. Faça upgrade quando quiser desbloquear todos os recursos.
            </p>

            <div
              role="tablist"
              aria-label="Período de cobrança"
              className="mt-6 inline-flex items-center"
              style={{
                background: "#fff",
                border: "1px solid #ede9e3",
                borderRadius: 100,
                padding: 4,
              }}
            >
              <button
                role="tab"
                aria-selected={billing === "monthly"}
                onClick={() => setBilling("monthly")}
                className="transition-all"
                style={{
                  borderRadius: 100,
                  padding: "6px 16px",
                  fontSize: 12,
                  fontWeight: 600,
                  background: billing === "monthly" ? "#1a1a18" : "transparent",
                  color: billing === "monthly" ? "#fff" : "#888",
                }}
              >
                Mensal
              </button>
              <button
                role="tab"
                aria-selected={billing === "yearly"}
                onClick={() => setBilling("yearly")}
                className="transition-all inline-flex items-center gap-1.5"
                style={{
                  borderRadius: 100,
                  padding: "6px 16px",
                  fontSize: 12,
                  fontWeight: 600,
                  background: billing === "yearly" ? "#1a1a18" : "transparent",
                  color: billing === "yearly" ? "#fff" : "#888",
                }}
              >
                Anual
                <span
                  style={{
                    background: "#f5efe0",
                    color: "#c4844a",
                    border: "1px solid #e8d9b0",
                    borderRadius: 100,
                    padding: "2px 6px",
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                  }}
                >
                  -45%
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 mx-auto max-w-lg w-full px-4 pt-4 pb-8 space-y-4">
        {/* Free */}
        <section
          style={{
            background: "#fff",
            border: "1px solid #ede9e3",
            borderRadius: 20,
            padding: 24,
          }}
        >
          <div className="flex items-center justify-between">
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#1a1a18" }}>Free</h2>
            {!isPro && (
              <span
                style={{
                  background: "#f0ede8",
                  color: "#888",
                  border: "1px solid #e3ddd3",
                  borderRadius: 100,
                  padding: "3px 8px",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Atual
              </span>
            )}
          </div>
          <p style={{ marginTop: 10, color: "#1a1a18" }}>
            <span style={{ fontSize: 32, fontWeight: 500 }}>R$ 0</span>
            <span style={{ marginLeft: 8, fontSize: 13, color: "#aaa" }}>grátis para sempre</span>
          </p>

          <ul className="mt-5 space-y-2.5">
            {FREE_FEATURES.map((f) => (
              <li
                key={f}
                className="flex items-start gap-2.5"
                style={{ fontSize: 14, color: "#1a1a18" }}
              >
                <Check size={16} style={{ color: "#c4844a", marginTop: 2, flexShrink: 0 }} strokeWidth={2.5} />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Pro */}
        <section
          className="relative"
          style={{
            background: "#1a1a18",
            borderRadius: 20,
            padding: 24,
            paddingTop: 28,
          }}
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
            <span
              style={{
                background: "#d4a855",
                color: "#fff",
                borderRadius: 100,
                padding: "4px 12px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Recomendado
            </span>
          </div>

          <div className="flex items-center justify-between">
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>Pro</h2>
            {isPro && (
              <span
                style={{
                  background: "rgba(212, 168, 85, 0.15)",
                  color: "#d4a855",
                  border: "1px solid rgba(212, 168, 85, 0.4)",
                  borderRadius: 100,
                  padding: "3px 8px",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Ativo
              </span>
            )}
          </div>

          {billing === "monthly" ? (
            <p style={{ marginTop: 10, color: "#fff" }}>
              <span style={{ fontSize: 32, fontWeight: 500 }}>R$ 14,90</span>
              <span style={{ marginLeft: 8, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>/mês</span>
            </p>
          ) : (
            <>
              <p style={{ marginTop: 10, color: "#fff" }}>
                <span style={{ fontSize: 32, fontWeight: 500 }}>R$ 99</span>
                <span style={{ marginLeft: 8, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>/ano</span>
              </p>
              <p style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                ≈ R$ {yearlyMonthly}/mês ·{" "}
                <span style={{ color: "#d4a855", fontWeight: 600 }}>economize 45%</span>
              </p>
            </>
          )}

          <ul className="mt-5 space-y-2.5">
            {PRO_FEATURES.map((f) => (
              <li
                key={f}
                className="flex items-start gap-2.5"
                style={{ fontSize: 14, color: "#fff" }}
              >
                <Check size={16} style={{ color: "#d4a855", marginTop: 2, flexShrink: 0 }} strokeWidth={2.5} />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 space-y-2">
            {isPro ? (
              <button
                type="button"
                onClick={handleManage}
                disabled={portalLoading}
                className="w-full inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-70"
                style={{
                  height: 52,
                  background: "linear-gradient(135deg, #d4a855 0%, #c4944a 100%)",
                  borderRadius: 14,
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 500,
                }}
              >
                {portalLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Abrindo portal…
                  </>
                ) : (
                  <>
                    <Settings size={16} />
                    Gerenciar assinatura
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={checkoutLoading}
                className="w-full inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-70"
                style={{
                  height: 52,
                  background: "linear-gradient(135deg, #d4a855 0%, #c4944a 100%)",
                  borderRadius: 14,
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 500,
                }}
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Abrindo checkout…
                  </>
                ) : billing === "monthly" ? (
                  "Assinar Pro — R$ 14,90/mês"
                ) : (
                  "Assinar Pro — R$ 99/ano"
                )}
              </button>
            )}
            <p className="text-center" style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
              Pagamento seguro via Paddle. Cancele quando quiser.
            </p>
          </div>
        </section>

        <div
          className="flex items-center justify-center gap-3 pt-2"
          style={{ fontSize: 11, color: "#bbb" }}
        >
          <Link to="/terms" className="hover:underline">Termos</Link>
          <span aria-hidden>·</span>
          <Link to="/privacy" className="hover:underline">Privacidade</Link>
          <span aria-hidden>·</span>
          <Link to="/refund" className="hover:underline">Reembolso</Link>
        </div>

        <Link
          to="/"
          search={{ list: undefined }}
          className="block text-center py-2"
          style={{ fontSize: 14, color: "#aaa" }}
        >
          Voltar ao app
        </Link>
      </div>
    </div>
  );
}
