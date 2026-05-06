import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setMounted(true);
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!mounted || !offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: "calc(env(safe-area-inset-bottom) + 12px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        background: "#1a1a18",
        color: "#fff",
        borderRadius: 12,
        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        fontSize: 13,
        lineHeight: 1.3,
        maxWidth: 480,
        margin: "0 auto",
      }}
    >
      <WifiOff size={16} style={{ color: "#c4844a", flexShrink: 0 }} />
      <span>
        {t("offline_message", {
          defaultValue:
            "Você está offline. Sua lista está disponível mas não será sincronizada.",
        })}
      </span>
    </div>
  );
}
