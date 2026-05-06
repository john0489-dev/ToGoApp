import { Dialog, DialogContent } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onGoToList: () => void;
};

const features = [
  { emoji: "⚡", title: "Carregamento mais rápido", description: "Abre instantaneamente" },
  { emoji: "📴", title: "Funciona offline", description: "Veja sua lista sem internet" },
  { emoji: "🔔", title: "Notificações em breve", description: "Fique por dentro das novidades" },
];

export function InstallSuccessDialog({ open, onOpenChange, onGoToList }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 gap-0 max-w-lg w-[calc(100vw-24px)] max-h-[92dvh] overflow-y-auto"
        style={{ background: "#faf9f7", borderRadius: 20, border: "1px solid #ede9e3" }}
      >
        <div style={{ padding: "32px 20px 24px", textAlign: "center" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "#c4844a",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              boxShadow: "0 12px 32px rgba(196,132,74,0.4)",
              marginBottom: 18,
            }}
          >
            🎉
          </div>
          <h2
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 24,
              fontWeight: 400,
              color: "#1a1a18",
              letterSpacing: "-0.02em",
            }}
          >
            App instalado com sucesso!
          </h2>
          <p style={{ marginTop: 8, fontSize: 13, color: "#666" }}>
            Agora você acessa o To Go direto da tela inicial
          </p>
        </div>

        <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          {features.map((f) => (
            <div
              key={f.title}
              style={{
                background: "#fff",
                border: "1px solid #ede9e3",
                borderRadius: 12,
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ fontSize: 22 }}>{f.emoji}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a18" }}>{f.title}</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{f.description}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: 20 }}>
          <button
            onClick={onGoToList}
            style={{
              width: "100%",
              height: 52,
              borderRadius: 14,
              background: "#c4844a",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Ir para minha lista →
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
