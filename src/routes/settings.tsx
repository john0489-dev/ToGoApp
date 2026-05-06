import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  Globe,
  Sun,
  Bell,
  CreditCard,
  Download,
  Smartphone,
  MessageCircle,
  FileText,
  LogOut,
  Check,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from "@/hooks/usePlan";
import { useLists } from "@/hooks/useLists";
import { changeLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { getRestaurants } from "@/lib/api.functions";
import { InstallGuideDialog } from "@/components/InstallGuideDialog";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Configurações — To Go" },
      { name: "description", content: "Gerencie suas listas, idioma, conta e preferências." },
    ],
  }),
  component: SettingsPage,
});

const SUPPORT_EMAIL = "john0489@gmail.com";

function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user, session, isAuthenticated } = useAuth();
  const { plan } = usePlan();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const accessToken = session?.access_token;
  const userId = user?.id;
  const {
    lists,
    listsQueryKey,
    activeListId,
    createList,
    deleteList,
    renameList,
  } = useLists({
    isAuthenticated,
    accessToken,
    userId,
    initialActiveListId: null,
  });

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [portalLoading, setPortalLoading] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);

  const currentLang = (i18n.language?.slice(0, 2) || "pt") as "pt" | "en" | "es";
  const userName = (user?.user_metadata?.name as string | undefined) || (user?.email?.split("@")[0] ?? "");
  const userEmail = user?.email ?? "";

  const handleStartRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  };

  const handleConfirmRename = async (id: string) => {
    const next = renameValue.trim();
    setRenamingId(null);
    if (!next) return;
    const list = lists.find((l) => l.id === id);
    if (!list || list.name === next) return;
    try {
      await renameList(id, next);
      await queryClient.invalidateQueries({ queryKey: listsQueryKey });
      toast.success(t("list_renamed", { defaultValue: "Lista renomeada" }));
    } catch (e: any) {
      toast.error(e?.message || "Erro ao renomear");
    }
  };

  const handleCreateList = async () => {
    const name = newListName.trim();
    if (!name) return;
    try {
      await createList(name);
      setNewListName("");
      setCreatingList(false);
      await queryClient.invalidateQueries({ queryKey: listsQueryKey });
      toast.success(t("list_created", { defaultValue: "Lista criada" }));
    } catch (e: any) {
      toast.error(e?.message || "Erro ao criar lista");
    }
  };

  const handleDeleteList = async (id: string, name: string) => {
    if (!window.confirm(`Excluir a lista "${name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteList(id);
      await queryClient.invalidateQueries({ queryKey: listsQueryKey });
      toast.success(t("list_deleted", { defaultValue: "Lista excluída" }));
    } catch (e: any) {
      toast.error(e?.message || "Erro ao excluir lista");
    }
  };

  const handleManageSubscription = async () => {
    if (!accessToken) return;
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (error || !data?.url) throw error || new Error("No URL");
      window.open(data.url, "_blank", "noopener");
    } catch {
      toast.error("Não foi possível abrir o portal. Tente novamente.");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleExportCsv = async () => {
    if (!accessToken) return;
    setExportingCsv(true);
    try {
      const all: any[] = [];
      for (const l of lists) {
        const { restaurants } = await getRestaurants({
          data: { listId: l.id },
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        for (const r of restaurants ?? []) all.push({ ...r, _list: l.name });
      }
      const headers = ["Nome", "Localização", "Culinária", "Status", "Nota", "Notas", "Tags", "Lista", "Data"];
      const escape = (v: unknown) => {
        const s = v == null ? "" : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const rows = all.map((r) =>
        [
          r.name,
          r.location ?? "",
          r.cuisine ?? "",
          r.visited ? "Visitado" : "Para Visitar",
          r.rating ?? "",
          r.notes ?? "",
          Array.isArray(r.tags) ? r.tags.join("; ") : "",
          r._list,
          r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : "",
        ]
          .map(escape)
          .join(","),
      );
      const csv = "\ufeff" + [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `togo-restaurantes-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("export_done", { defaultValue: "Exportação concluída" }));
    } catch (e: any) {
      toast.error(e?.message || "Erro ao exportar");
    } finally {
      setExportingCsv(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm(t("logout_confirm", { defaultValue: "Tem certeza que deseja sair?" }))) return;
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const handleThemeChange = (t: "light" | "dark" | "system") => {
    setTheme(t);
    try { localStorage.setItem("togo_theme", t); } catch {}
    const root = document.documentElement;
    if (t === "dark") {
      root.classList.add("dark");
    } else if (t === "light") {
      root.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      prefersDark ? root.classList.add("dark") : root.classList.remove("dark");
    }
  };

  const handleNotifToggle = async () => {
    if (notifEnabled) {
      setNotifEnabled(false);
      try { localStorage.setItem("togo_notifications", "false"); } catch {}
      toast.success("Notificações desativadas");
      return;
    }
    if (!("Notification" in window)) {
      toast.error("Notificações não suportadas neste navegador");
      return;
    }
    setNotifLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        localStorage.setItem("togo_notifications", "true");
        setNotifEnabled(true);
        toast.success("Notificações ativadas! 🔔");
      } else {
        toast.error("Permissão negada. Ative nas configurações do navegador.");
      }
    } finally {
      setNotifLoading(false);
    }
  };

  const handleFeedback = () => setFeedbackOpen(true);

  const handleFeedbackSubmit = async () => {
    if (!feedbackMsg.trim()) return;
    setFeedbackLoading(true);
    try {
      const { error } = await supabase.from("feedbacks").insert({
        user_id: userId,
        type: feedbackType,
        message: feedbackMsg.trim(),
      });
      if (error) throw error;
      toast.success("Obrigado pelo feedback! 🙏");
      setFeedbackOpen(false);
      setFeedbackMsg("");
      setFeedbackType("suggestion");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao enviar feedback");
    } finally {
      setFeedbackLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh]" style={{ background: "#faf9f7" }}>
      {/* Dark header */}
      <header
        style={{
          background:
            "linear-gradient(135deg, #1a1a18 0%, #1a1a18 60%, rgba(196,132,74,0.18) 100%)",
          color: "#fff",
          padding: "max(36px, calc(env(safe-area-inset-top) + 14px)) 20px 64px",
        }}
      >
        <div className="mx-auto max-w-lg">
          <button
            onClick={() => navigate({ to: "/", search: { list: undefined } })}
            className="flex items-center justify-center transition-colors"
            style={{
              width: 36,
              height: 36,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10,
              color: "#fff",
            }}
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
          <h1
            style={{
              marginTop: 18,
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 22,
              fontWeight: 400,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            {t("settings", { defaultValue: "Configurações" })}
          </h1>
          <p style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
            {userEmail}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-10" style={{ marginTop: -44 }}>
        {/* Profile card */}
        <section
          className="flex items-center gap-3"
          style={{
            background: "#fff",
            border: "1px solid #ede9e3",
            borderRadius: 16,
            padding: 16,
            boxShadow: "0 12px 32px rgba(0,0,0,0.06)",
          }}
        >
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #d4a855 0%, #c4844a 100%)",
              fontSize: 22,
            }}
            aria-hidden
          >
            🍽️
          </div>
          <div className="min-w-0 flex-1">
            <p style={{ fontSize: 14, fontWeight: 600, color: "#1a1a18" }} className="truncate">
              {userName || "—"}
            </p>
            <p style={{ fontSize: 12, color: "#888" }} className="truncate">
              {userEmail}
            </p>
          </div>
          <Link
            to="/pricing"
            style={
              plan === "pro"
                ? {
                    background: "#f5efe0",
                    border: "1px solid #e8d9b0",
                    color: "#c4844a",
                    fontSize: 10,
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                  }
                : {
                    background: "#f0ede8",
                    border: "1px solid #e3ddd3",
                    color: "#999",
                    fontSize: 10,
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                  }
            }
          >
            {plan === "pro" ? "✦ PRO" : "FREE"}
          </Link>
        </section>

        {/* Lists */}
        <SectionTitle>{t("my_lists", { defaultValue: "Minhas listas" })}</SectionTitle>
        <Group>
          {lists.map((l, i) => (
            <Row key={l.id} last={i === lists.length - 1 && !creatingList}>
              <IconCircle bg="#f5efe0" color="#c4844a">
                <Pencil size={14} />
              </IconCircle>
              {renamingId === l.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => handleConfirmRename(l.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConfirmRename(l.id);
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                  style={{ color: "#1a1a18", borderBottom: "1px solid #c4844a", paddingBottom: 2 }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => handleStartRename(l.id, l.name)}
                  className="flex-1 text-left"
                  style={{ fontSize: 14, color: "#1a1a18" }}
                >
                  {l.name}
                  {l.id === activeListId && (
                    <span style={{ marginLeft: 8, fontSize: 10, color: "#c4844a", fontWeight: 600 }}>
                      • atual
                    </span>
                  )}
                </button>
              )}
              {l.created_by === userId && (
                <button
                  onClick={() => handleDeleteList(l.id, l.name)}
                  className="flex h-8 w-8 items-center justify-center rounded transition-colors"
                  style={{ color: "#c4544a" }}
                  aria-label={`Excluir lista ${l.name}`}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </Row>
          ))}
          {creatingList ? (
            <Row last>
              <IconCircle bg="#f0ede8" color="#888">
                <Plus size={14} />
              </IconCircle>
              <input
                autoFocus
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateList();
                  if (e.key === "Escape") {
                    setCreatingList(false);
                    setNewListName("");
                  }
                }}
                placeholder="Nova lista..."
                className="flex-1 bg-transparent text-sm focus:outline-none"
                style={{ color: "#1a1a18" }}
              />
              <button
                onClick={handleCreateList}
                className="px-3 py-1 text-xs font-medium"
                style={{ background: "#1a1a18", color: "#fff", borderRadius: 8 }}
              >
                Criar
              </button>
            </Row>
          ) : (
            <Row last onClick={() => setCreatingList(true)}>
              <IconCircle bg="#f0ede8" color="#888">
                <Plus size={14} />
              </IconCircle>
              <span style={{ fontSize: 14, color: "#1a1a18" }} className="flex-1">
                {t("create_list", { defaultValue: "Criar nova lista" })}
              </span>
              <Chevron />
            </Row>
          )}
        </Group>

        {/* Preferences */}
        <SectionTitle>{t("preferences", { defaultValue: "Preferências" })}</SectionTitle>
        <Group>
          <Row>
            <IconCircle bg="#eaf2ff" color="#3d6fb6">
              <Globe size={14} />
            </IconCircle>
            <span style={{ fontSize: 14, color: "#1a1a18" }} className="flex-1">
              {t("language")}
            </span>
            <select
              value={currentLang}
              onChange={(e) => changeLanguage(e.target.value as "pt" | "en" | "es")}
              className="bg-transparent text-sm focus:outline-none"
              style={{ color: "#888" }}
            >
              <option value="pt">🇧🇷 Português</option>
              <option value="en">🇺🇸 English</option>
              <option value="es">🇪🇸 Español</option>
            </select>
          </Row>
          <Row>
            <IconCircle bg="#fff7e0" color="#c89b3c">
              <Sun size={14} />
            </IconCircle>
            <span style={{ fontSize: 14, color: "#1a1a18" }} className="flex-1">
              {t("theme", { defaultValue: "Tema" })}
            </span>
            <select
              value={theme}
              onChange={(e) => handleThemeChange(e.target.value as "light" | "dark" | "system")}
              className="bg-transparent text-sm focus:outline-none"
              style={{ color: "#888" }}
            >
              <option value="light">☀️ Claro</option>
              <option value="dark">🌙 Escuro</option>
              <option value="system">⚙️ Sistema</option>
            </select>
          </Row>
          <Row last>
            <IconCircle bg="#f0e8ff" color="#7c5fb3">
              <Bell size={14} />
            </IconCircle>
            <span style={{ fontSize: 14, color: "#1a1a18" }} className="flex-1">
              {t("notifications", { defaultValue: "Notificações" })}
            </span>
            <button
              type="button"
              onClick={handleNotifToggle}
              disabled={notifLoading}
              style={{
                width: 38, height: 22, borderRadius: 999,
                background: notifEnabled ? "#c4844a" : "#e3ddd3",
                position: "relative", opacity: notifLoading ? 0.6 : 1,
                transition: "background 0.15s ease", flexShrink: 0,
              }}
              aria-pressed={notifEnabled}
            >
              <span style={{
                position: "absolute", top: 2,
                left: notifEnabled ? 18 : 2,
                width: 18, height: 18, borderRadius: "50%",
                background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                transition: "left 0.15s ease",
              }} />
            </button>
          </Row>
        </Group>

        {/* Account */}
        <SectionTitle>{t("account", { defaultValue: "Conta" })}</SectionTitle>
        <Group>
          <Row onClick={portalLoading ? undefined : handleManageSubscription}>
            <IconCircle bg="#fdf3e3" color="#c4844a">
              <CreditCard size={14} />
            </IconCircle>
            <span style={{ fontSize: 14, color: "#1a1a18" }} className="flex-1">
              {portalLoading
                ? t("loading", { defaultValue: "Abrindo..." })
                : t("manage_subscription", { defaultValue: "Gerenciar assinatura" })}
            </span>
            <Chevron />
          </Row>
          <Row onClick={exportingCsv ? undefined : handleExportCsv}>
            <IconCircle bg="#e8f5ee" color="#3a9a5c">
              <Download size={14} />
            </IconCircle>
            <span style={{ fontSize: 14, color: "#1a1a18" }} className="flex-1">
              {exportingCsv
                ? t("exporting", { defaultValue: "Exportando..." })
                : t("export_data", { defaultValue: "Exportar meus dados" })}
            </span>
            <Chevron />
          </Row>
          <Row last onClick={() => setInstallOpen(true)}>
            <IconCircle bg="#eaf2ff" color="#3d6fb6">
              <Smartphone size={14} />
            </IconCircle>
            <span style={{ fontSize: 14, color: "#1a1a18" }} className="flex-1">
              {t("install_app", { defaultValue: "Instalar app" })}
            </span>
            <Chevron />
          </Row>
        </Group>

        {/* Support */}
        <SectionTitle>{t("support", { defaultValue: "Suporte" })}</SectionTitle>
        <Group>
          <Row onClick={handleFeedback}>
            <IconCircle bg="#fdf0e8" color="#c4844a">
              <MessageCircle size={14} />
            </IconCircle>
            <span style={{ fontSize: 14, color: "#1a1a18" }} className="flex-1">
              {t("send_feedback", { defaultValue: "Enviar feedback" })}
            </span>
            <Chevron />
          </Row>
          <Row to="/terms">
            <IconCircle bg="#f0ede8" color="#888">
              <FileText size={14} />
            </IconCircle>
            <span style={{ fontSize: 14, color: "#1a1a18" }} className="flex-1">
              {t("terms_short", { defaultValue: "Termos de Uso" })}
            </span>
            <Chevron />
          </Row>
          <Row to="/privacy">
            <IconCircle bg="#f0ede8" color="#888">
              <FileText size={14} />
            </IconCircle>
            <span style={{ fontSize: 14, color: "#1a1a18" }} className="flex-1">
              {t("privacy_short", { defaultValue: "Privacidade" })}
            </span>
            <Chevron />
          </Row>
          <Row last onClick={handleLogout}>
            <IconCircle bg="#fdeaea" color="#c4544a">
              <LogOut size={14} />
            </IconCircle>
            <span style={{ fontSize: 14, color: "#c4544a" }} className="flex-1">
              {t("sign_out", { defaultValue: "Sair da conta" })}
            </span>
          </Row>
        </Group>

        <p
          style={{
            marginTop: 28,
            textAlign: "center",
            fontSize: 11,
            color: "#ccc",
          }}
        >
          To Go v1.0.0 · Feito com ❤️ em SP
        </p>
      </main>

      <InstallGuideDialog open={installOpen} onOpenChange={setInstallOpen} />

      {/* Feedback Bottom Sheet */}
      {feedbackOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,0.4)", display: "flex",
          alignItems: "flex-end",
        }} onClick={() => setFeedbackOpen(false)}>
          <div
            style={{
              background: "#fff", borderRadius: "24px 24px 0 0",
              padding: "24px 20px 40px", width: "100%",
              maxWidth: 480, margin: "0 auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: 36, height: 4, background: "#e5e5e5", borderRadius: 2, margin: "0 auto 20px" }} />
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 400, color: "#1a1a18", marginBottom: 16 }}>
              Enviar feedback
            </h3>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {([["bug", "🐛", "Bug"], ["suggestion", "💡", "Sugestão"], ["compliment", "❤️", "Elogio"]] as const).map(([type, emoji, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFeedbackType(type)}
                  style={{
                    flex: 1, padding: "8px 4px", borderRadius: 10, fontSize: 12, fontWeight: 500,
                    background: feedbackType === type ? "#1a1a18" : "#f5f2ee",
                    color: feedbackType === type ? "#fff" : "#888",
                    border: feedbackType === type ? "none" : "1px solid #ede9e3",
                    transition: "all 0.15s",
                  }}
                >
                  {emoji} {label}
                </button>
              ))}
            </div>
            <textarea
              value={feedbackMsg}
              onChange={(e) => setFeedbackMsg(e.target.value)}
              maxLength={500}
              rows={5}
              placeholder="Conte o que aconteceu ou o que poderia ser melhor..."
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 12,
                border: "1px solid #ede9e3", fontSize: 14, resize: "none",
                fontFamily: "'DM Sans', sans-serif", color: "#1a1a18",
                background: "#faf9f7", outline: "none",
              }}
            />
            <div style={{ textAlign: "right", fontSize: 11, color: "#bbb", marginTop: 4, marginBottom: 16 }}>
              {feedbackMsg.length}/500
            </div>
            <button
              type="button"
              onClick={handleFeedbackSubmit}
              disabled={!feedbackMsg.trim() || feedbackLoading}
              style={{
                width: "100%", height: 52, borderRadius: 14, border: "none",
                background: feedbackMsg.trim() && !feedbackLoading
                  ? "linear-gradient(135deg, #d4a855 0%, #c4844a 100%)"
                  : "#f0ede8",
                color: feedbackMsg.trim() && !feedbackLoading ? "#fff" : "#bbb",
                fontSize: 15, fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
                cursor: feedbackMsg.trim() && !feedbackLoading ? "pointer" : "default",
                transition: "all 0.15s",
              }}
            >
              {feedbackLoading ? "Enviando..." : "Enviar feedback"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        marginTop: 24,
        marginBottom: 8,
        paddingLeft: 4,
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "#888",
      }}
    >
      {children}
    </h2>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #ede9e3",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function Row({
  children,
  last,
  onClick,
  to,
}: {
  children: React.ReactNode;
  last?: boolean;
  onClick?: () => void;
  to?: string;
}) {
  const style: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    borderBottom: last ? "none" : "1px solid #f5f2ee",
    width: "100%",
    textAlign: "left",
    background: "transparent",
  };
  if (to) {
    return (
      <Link to={to} style={style}>
        {children}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} style={style}>
        {children}
      </button>
    );
  }
  return <div style={style}>{children}</div>;
}

function IconCircle({
  children,
  bg,
  color,
}: {
  children: React.ReactNode;
  bg: string;
  color: string;
}) {
  return (
    <span
      className="shrink-0 inline-flex items-center justify-center"
      style={{ width: 32, height: 32, borderRadius: 10, background: bg, color }}
      aria-hidden
    >
      {children}
    </span>
  );
}

function Chevron() {
  return <ChevronRight size={14} style={{ color: "#bbb" }} />;
}

function Toggle({ disabled }: { disabled?: boolean }) {
  const [on, setOn] = useState(false);
  return (
    <button
      type="button"
      onClick={() => !disabled && setOn((v) => !v)}
      style={{
        width: 38,
        height: 22,
        borderRadius: 999,
        background: on ? "#c4844a" : "#e3ddd3",
        position: "relative",
        opacity: disabled ? 0.6 : 1,
        transition: "background 0.15s ease",
      }}
      aria-pressed={on}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 18 : 2,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          transition: "left 0.15s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {on && <Check size={10} style={{ color: "#c4844a" }} />}
      </span>
    </button>
  );
}
