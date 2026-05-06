import { useTranslation } from "react-i18next";

type Props = {
  onInstall: () => void;
  onDismiss: () => void;
};

export function PWAInstallBanner({ onInstall, onDismiss }: Props) {
  const { t } = useTranslation();
  return (
    <div
      style={{
        position: "relative",
        background: "#1a1a18",
        backgroundImage:
          "radial-gradient(ellipse at top right, rgba(196,132,74,0.25), transparent 60%)",
        borderRadius: 16,
        padding: 16,
        overflow: "hidden",
        marginTop: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "#c4844a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          📲
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>
            {t("install_app")}
          </div>
          <div
            style={{
              marginTop: 3,
              fontSize: 11,
              color: "rgba(255,255,255,0.5)",
              lineHeight: 1.3,
            }}
          >
            {t("install_subtitle")}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onInstall}
          style={{
            flex: 1,
            height: 36,
            borderRadius: 10,
            background: "#c4844a",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          📲 {t("install_cta")}
        </button>
        <button
          onClick={onDismiss}
          style={{
            height: 36,
            paddingInline: 14,
            borderRadius: 10,
            background: "rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.7)",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {t("install_later")}
        </button>
      </div>
    </div>
  );
}
