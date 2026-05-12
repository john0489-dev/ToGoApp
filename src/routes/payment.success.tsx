import { useEffect } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight } from "lucide-react";
import { usePlan } from "@/hooks/usePlan";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/payment/success")({
  head: () => ({
    meta: [
      { title: "Bem-vindo ao Pro — To Go" },
      { name: "description", content: "Sua assinatura To Go Pro está ativa." },
    ],
  }),
  component: SuccessPage,
});

function SuccessPage() {
  const { refresh, plan } = usePlan();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Poll the plan a few times to catch the webhook-driven upgrade
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const tick = async () => {
      if (cancelled) return;
      attempts++;
      await refresh();
      if (plan !== "pro" && attempts < 8) {
        setTimeout(tick, 1500);
      }
    };
    tick();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime fallback: listen for our own subscription row
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`subs-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refresh]);

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center px-5"
      style={{ background: "var(--hero-gradient)" }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-card p-7 shadow-xl text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-300">
          <Sparkles size={30} className="text-amber-900" fill="currentColor" />
        </div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          🎉 Bem-vindo ao To Go Pro!
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sua assinatura está ativa. Aproveite todos os recursos.
        </p>

        {plan !== "pro" && (
          <p className="mt-4 text-xs text-muted-foreground">
            Confirmando seu pagamento…
          </p>
        )}

        <button
          onClick={() => navigate({ to: "/dashboard", search: { list: undefined } })}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-primary-foreground shadow-md active:scale-[0.98] transition-transform"
          style={{ background: "var(--hero-gradient)" }}
        >
          Ir para minha lista
          <ArrowRight size={16} />
        </button>

        <Link
          to="/pricing"
          className="mt-3 block text-xs text-muted-foreground hover:underline"
        >
          Gerenciar assinatura
        </Link>
      </div>
    </div>
  );
}
