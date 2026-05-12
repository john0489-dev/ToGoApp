import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { acceptInvite } from "@/lib/invite.functions";

export const Route = createFileRoute("/invite/$code")({
  head: () => ({
    meta: [
      { title: "To Go — Aceitar convite" },
      { name: "description", content: "Aceite um convite para colaborar numa lista de restaurantes." },
    ],
  }),
  component: InvitePage,
});

function InvitePage() {
  const { code } = Route.useParams();
  const { isAuthenticated, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "login-required">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !session) {
      setStatus("login-required");
      return;
    }

    (async () => {
      try {
        const result = await acceptInvite({
          data: { inviteCode: code },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        // Auto-redirect to the shared list
        navigate({ to: "/dashboard", search: { list: result.listId } });
      } catch (err: any) {
        setMessage(err.message || "Erro ao aceitar convite.");
        setStatus("error");
      }
    })();
  }, [authLoading, isAuthenticated, session, code, navigate]);

  if (status === "loading" || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Processando convite...</p>
      </div>
    );
  }

  if (status === "login-required") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-sm text-center">
        <h1 className="text-2xl font-bold text-foreground">To Go</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Você precisa estar logado para aceitar este convite.
          </p>
          <Link
            to="/login"
            className="mt-4 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Entrar / Criar conta
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <h1 className="text-2xl font-bold text-foreground">To Go</h1>
        <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${status === "success" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
          {message}
        </div>
        <Link
          to="/"
          search={{ list: undefined }}
          className="mt-4 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Ir para minhas listas
        </Link>
      </div>
    </div>
  );
}
