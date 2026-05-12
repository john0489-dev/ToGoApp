import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { AppLogo } from "@/components/AppLogo";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "To Go — Entrar" },
      { name: "description", content: "Faça login na sua conta To Go." },
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
  component: LoginPage,
});

function LoginPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (isAuthenticated) {
    navigate({ to: "/dashboard", search: { list: undefined } });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setMessage("Verifique seu email para confirmar a conta!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard", search: { list: undefined } });
      }
    } catch (err: any) {
      setError(err.message || "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center"
      style={{ background: "#ffffff", padding: "32px 28px" }}
    >
      {/* Conjunto centralizado: topo + formulário */}
      <div className="w-full" style={{ maxWidth: 380 }}>
        {/* Topo */}
        <div className="flex flex-col items-center" style={{ marginBottom: 32 }}>
          <div
            className="flex items-center justify-center"
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "#f5f0e8",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
            aria-hidden
          >
            <AppLogo size={64} />
          </div>

          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 32,
              fontWeight: 400,
              color: "#1a1a18",
              letterSpacing: "-0.02em",
              marginTop: 20,
              lineHeight: 1.1,
            }}
          >
            To Go
          </h1>

          <div
            className="flex items-center"
            style={{
              marginTop: 12,
              fontSize: 12,
              color: "#999",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              gap: 10,
            }}
          >
            <span>Salve</span>
            <span
              aria-hidden
              style={{
                width: 4,
                height: 4,
                minWidth: 4,
                minHeight: 4,
                borderRadius: "50%",
                backgroundColor: "#d4a855",
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            <span>Explore</span>
            <span
              aria-hidden
              style={{
                width: 4,
                height: 4,
                minWidth: 4,
                minHeight: 4,
                borderRadius: "50%",
                backgroundColor: "#d4a855",
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            <span>Visite</span>
          </div>
        </div>

        {/* Formulário */}
        <div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div
              style={{
                borderRadius: 14,
                background: "rgba(220, 38, 38, 0.08)",
                color: "#b91c1c",
                fontSize: 13,
                padding: "10px 14px",
              }}
            >
              {error}
            </div>
          )}
          {message && (
            <div
              style={{
                borderRadius: 14,
                background: "rgba(212, 168, 85, 0.12)",
                color: "#8a6a2c",
                fontSize: 13,
                padding: "10px 14px",
              }}
            >
              {message}
            </div>
          )}

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("email")}
            required
            autoComplete="email"
            className="login-field"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("password")}
            required
            minLength={6}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            className="login-field"
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              height: 52,
              border: "none",
              borderRadius: 14,
              background: "linear-gradient(135deg, #e8b547 0%, #c98a2b 100%)",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 500,
              marginTop: 4,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              transition: "opacity 0.15s ease, transform 0.05s ease",
            }}
          >
            {loading ? "..." : isSignUp ? t("create_account") : t("sign_in")}
          </button>
        </form>

        <p
          style={{
            marginTop: 20,
            textAlign: "center",
            fontSize: 13,
            color: "#aaa",
          }}
        >
          {isSignUp ? t("already_have_account", { defaultValue: "Já tem conta?" }) : t("no_account")}{" "}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
              setMessage("");
            }}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "#c4944a",
              fontWeight: 500,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {isSignUp ? t("sign_in") : t("create_account")}
          </button>
        </p>

        <p
          style={{
            marginTop: 24,
            textAlign: "center",
            fontSize: 11,
            color: "#ccc",
            lineHeight: 1.6,
          }}
        >
          Ao continuar, você concorda com os{" "}
          <Link to="/terms" style={{ color: "#bbb", textDecoration: "underline" }}>
            Termos
          </Link>{" "}
          e{" "}
          <Link to="/privacy" style={{ color: "#bbb", textDecoration: "underline" }}>
            Privacidade
          </Link>
          .
        </p>
        </div>
      </div>

      <style>{`
        .login-field {
          width: 100%;
          height: 50px;
          border: 1.5px solid #f0ede8;
          border-radius: 14px;
          background: #faf9f7;
          padding: 0 16px;
          font-size: 14px;
          color: #1a1a18;
          outline: none;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .login-field::placeholder {
          color: #b5b0a8;
        }
        .login-field:focus {
          border-color: #d4a855;
          background: #ffffff;
        }
      `}</style>
    </div>
  );
}
