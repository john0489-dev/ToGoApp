import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles, X, Check } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export type UpgradeReason = "restaurants" | "lists" | "feature";

interface Props {
  open: boolean;
  onClose: () => void;
  reason?: UpgradeReason;
  featureName?: string;
}

export function UpgradeModal({ open, onClose, reason = "feature", featureName }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const COPY: Record<UpgradeReason, { title: string; text: string; highlights: string[] }> = {
    restaurants: {
      title: "Você atingiu seu limite de restaurantes",
      text: "Usuários Free podem salvar até 20 restaurantes. Faça upgrade para o To Go Pro e salve quantos quiser.",
      highlights: [
        "Restaurantes ilimitados",
        "Listas ilimitadas",
        "Fotos, notas e tags",
        t("advanced_filters"),
      ],
    },
    lists: {
      title: "Limite de listas atingido",
      text: "Plano Free permite até 3 listas. Upgrade para listas ilimitadas.",
      highlights: [
        "Listas ilimitadas e customizáveis",
        "Compartilhamento colaborativo",
        "Tags personalizadas",
        t("export_pdf"),
      ],
    },
    feature: {
      title: "Recurso exclusivo do To Go Pro",
      text: "Esse recurso está disponível apenas para assinantes do To Go Pro.",
      highlights: [
        "Fotos e notas detalhadas",
        "Tags personalizadas",
        t("advanced_filters"),
        "Histórico de visitas e PDF",
      ],
    },
  };

  const copy = COPY[reason];
  const title = reason === "feature" && featureName ? `${featureName} é Pro` : copy.title;

  // Inject Playfair Display once
  useEffect(() => {
    if (typeof document === "undefined") return;
    const id = "playfair-display-font";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&display=swap";
    document.head.appendChild(link);
  }, []);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-sm p-0 overflow-hidden border-0"
        style={{ borderRadius: 24, background: "#fff" }}
      >
        {/* Hero */}
        <div
          className="relative px-6 pt-7 pb-6 text-center"
          style={{ background: "#1a1a18" }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 flex items-center justify-center transition-colors"
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              background: "rgba(255,255,255,0.1)",
              color: "#fff",
            }}
            aria-label="Fechar"
          >
            <X size={14} />
          </button>
          <div
            className="mx-auto mb-4 flex items-center justify-center"
            style={{
              width: 52,
              height: 52,
              background: "#d4a855",
              borderRadius: 14,
            }}
          >
            <Sparkles size={24} style={{ color: "#fff" }} fill="currentColor" />
          </div>
          <span
            className="inline-block mb-3"
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              borderRadius: 100,
              padding: "4px 12px",
            }}
          >
            To Go Pro
          </span>
          <h2
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 20,
              fontWeight: 400,
              color: "#fff",
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
              padding: "0 8px",
            }}
          >
            {title}
          </h2>
        </div>

        {/* Body */}
        <div className="px-6 py-5" style={{ background: "#fff" }}>
          <p style={{ fontSize: 14, color: "#888", textAlign: "center", lineHeight: 1.5 }}>
            {copy.text}
          </p>

          <ul className="mt-5 space-y-3">
            {copy.highlights.map((h) => (
              <li key={h} className="flex items-start gap-2.5">
                <Check
                  size={16}
                  strokeWidth={2.5}
                  style={{ color: "#c4844a", marginTop: 1, flexShrink: 0 }}
                />
                <span style={{ fontSize: 14, color: "#1a1a18" }}>{h}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 space-y-2">
            <button
              onClick={() => {
                onClose();
                navigate({ to: "/pricing" });
              }}
              className="w-full active:scale-[0.98] transition-transform"
              style={{
                height: 52,
                background: "linear-gradient(135deg, #d4a855 0%, #c4944a 100%)",
                borderRadius: 14,
                color: "#fff",
                fontSize: 15,
                fontWeight: 500,
                border: "none",
              }}
            >
              Ver planos Pro
            </button>
            <button
              onClick={onClose}
              className="w-full transition-colors"
              style={{
                height: 44,
                background: "#f5f2ee",
                borderRadius: 14,
                color: "#888",
                fontSize: 14,
                fontWeight: 500,
                border: "none",
              }}
            >
              Agora não
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
