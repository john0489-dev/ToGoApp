import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getEarlyAdopterStatus, activateEarlyAdopterTrial } from "@/lib/early-adopter.functions";
import { toast } from "sonner";

const DISMISSED_KEY = "early_adopter_dismissed_until";

export function EarlyAdopterBanner({ plan, onActivated }: { plan: string; onActivated: () => void }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<{ slotsLeft: number; totalClaimed: number; userClaimed: any } | null>(null);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (plan !== "free") return;
    // Check if dismissed recently
    const dismissedUntil = localStorage.getItem(DISMISSED_KEY);
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil)) return;

    getEarlyAdopterStatus().then((s) => {
      setStatus(s);
      if (s.isAvailable && !s.userClaimed) setVisible(true);
    }).catch(() => {});
  }, [plan]);

  const handleActivate = async () => {
    setLoading(true);
    try {
      const result = await activateEarlyAdopterTrial();
      toast.success(result.message);
      setVisible(false);
      onActivated();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao ativar trial");
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
    setVisible(false);
  };

  if (!visible || !status) return null;

  const claimed = status.totalClaimed;
  const progress = (claimed / 100) * 100;

  return (
    <div style={{
      margin: "0 0 12px",
      background: "linear-gradient(135deg, #1a1a18 0%, #2d2d2a 100%)",
      borderRadius: 16,
      padding: 16,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Glow */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at 20% 80%, rgba(212,168,85,0.2) 0%, transparent 55%)",
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          background: "rgba(212,168,85,0.2)", border: "1px solid rgba(212,168,85,0.35)",
          borderRadius: 20, padding: "3px 10px", marginBottom: 10,
        }}>
          <span style={{ fontSize: 11, color: "#d4a855", fontWeight: 600, letterSpacing: "0.06em" }}>
            🎉 OFERTA ESPECIAL
          </span>
        </div>

        {/* Title */}
        <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 4 }}>
          Você pode ser um dos primeiros 100!
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>
          <span style={{ color: "#d4a855", fontWeight: 600 }}>{status.slotsLeft} vagas restantes</span>
          {" · "}30 dias de Pro grátis
        </div>

        {/* Progress bar */}
        <div style={{
          height: 4, background: "rgba(255,255,255,0.1)",
          borderRadius: 2, marginBottom: 14, overflow: "hidden",
        }}>
          <div style={{
            height: "100%", width: `${progress}%`,
            background: "linear-gradient(90deg, #d4a855, #c4844a)",
            borderRadius: 2, transition: "width 0.5s ease",
          }} />
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleActivate}
            disabled={loading}
            style={{
              flex: 1, height: 38, borderRadius: 10, border: "none",
              background: loading ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #d4a855, #c4844a)",
              color: "#fff", fontSize: 13, fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif", cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Ativando..." : "✨ Ativar agora — é grátis"}
          </button>
          <button
            onClick={handleDismiss}
            style={{
              height: 38, padding: "0 14px", borderRadius: 10,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.45)", fontSize: 12,
              fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
            }}
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
