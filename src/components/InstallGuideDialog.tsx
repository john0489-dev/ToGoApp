import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
};

type Step = { emoji: string; title: string; description: string; tipEmoji: string; tip: string };

const iphoneSteps: Step[] = [
  {
    emoji: "1",
    title: "Abra no Safari",
    description: "O app deve estar aberto no Safari. Não funciona no Chrome ou outros navegadores.",
    tipEmoji: "🧭",
    tip: "Use o Safari, não o Chrome",
  },
  {
    emoji: "2",
    title: "Toque em Compartilhar",
    description: "Na barra inferior do Safari, toque no ícone ⬆️",
    tipEmoji: "⬆️",
    tip: "Ícone de seta para cima, no centro da barra",
  },
  {
    emoji: "3",
    title: "Adicionar à Tela de Início",
    description:
      "Role a lista de opções e toque em 'Adicionar à Tela de Início', depois toque em Adicionar.",
    tipEmoji: "➕",
    tip: "'Adicionar à Tela de Início' → Adicionar",
  },
  {
    emoji: "4",
    title: "Pronto! 🎉",
    description: "O ícone do To Go aparece na tela inicial. Abra como qualquer app!",
    tipEmoji: "🎉",
    tip: "Pronto para usar",
  },
];

const androidSteps: Step[] = [
  {
    emoji: "1",
    title: "Abra no Chrome",
    description: "O app deve estar aberto no navegador Chrome.",
    tipEmoji: "🌐",
    tip: "Use o Chrome no Android",
  },
  {
    emoji: "2",
    title: "Toque nos 3 pontinhos ⋮",
    description: "No canto superior direito, toque no menu ⋮",
    tipEmoji: "⋮",
    tip: "Menu no canto superior direito",
  },
  {
    emoji: "3",
    title: "Adicionar à tela inicial",
    description: "Toque em 'Adicionar à tela inicial' e confirme.",
    tipEmoji: "➕",
    tip: "Confirme tocando em Adicionar",
  },
];

export function InstallGuideDialog({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<"iphone" | "android">(() => {
    if (typeof navigator !== "undefined" && /android/i.test(navigator.userAgent)) return "android";
    return "iphone";
  });
  const steps = tab === "iphone" ? iphoneSteps : androidSteps;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 gap-0 max-w-lg w-[calc(100vw-24px)] max-h-[92dvh] overflow-y-auto"
        style={{ background: "#faf9f7", borderRadius: 20, border: "1px solid #ede9e3" }}
      >
        {/* Header */}
        <div
          style={{
            background: "#1a1a18",
            padding: "28px 20px 24px",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "#c4844a",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              marginBottom: 12,
            }}
          >
            📲
          </div>
          <h2
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 24,
              color: "#fff",
              fontWeight: 400,
              letterSpacing: "-0.02em",
            }}
          >
            Instalar o To Go
          </h2>
          <p style={{ marginTop: 6, fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
            Simples como salvar uma foto
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", padding: "16px 16px 0", gap: 8 }}>
          {(["iphone", "android"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                height: 38,
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                background: tab === t ? "#c4844a" : "#fff",
                color: tab === t ? "#fff" : "#1a1a18",
                border: tab === t ? "1px solid #c4844a" : "1px solid #ede9e3",
                transition: "all 0.15s",
              }}
            >
              {t === "iphone" ? "iPhone" : "Android"}
            </button>
          ))}
        </div>

        {/* Steps */}
        <div style={{ padding: "20px" }}>
          {steps.map((step, idx) => (
            <div key={idx} style={{ position: "relative", paddingLeft: 44, paddingBottom: idx === steps.length - 1 ? 0 : 20 }}>
              {/* Number circle */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "#1a1a18",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {idx + 1}
              </div>
              {/* Connector */}
              {idx < steps.length - 1 && (
                <div
                  style={{
                    position: "absolute",
                    left: 13,
                    top: 32,
                    bottom: 4,
                    width: 1,
                    background: "#ede9e3",
                  }}
                />
              )}
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1a1a18", marginBottom: 4 }}>
                {step.title}
              </h3>
              <p style={{ fontSize: 12, color: "#666", lineHeight: 1.5, marginBottom: 8 }}>
                {step.description}
              </p>
              <div
                style={{
                  background: "#f5f2ee",
                  border: "1px solid #ede9e3",
                  borderRadius: 10,
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  color: "#1a1a18",
                }}
              >
                <span style={{ fontSize: 16 }}>{step.tipEmoji}</span>
                <span>{step.tip}</span>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
