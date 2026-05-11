import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { ArrowLeft, RefreshCw, Users, Calendar, TrendingUp, MapPin, Wand2, Globe2, Check, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  getAdminSignups,
  isAdmin as isAdminFn,
  adminListBadLocations,
  adminUpdateRestaurantLocation,
  adminListInternationalCandidates,
  adminDetectInternationalBatch,
  adminUpdateRestaurantCountry,
} from "@/lib/api.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "To Go — Painel admin" },
      { name: "description", content: "Painel administrativo de cadastros." },
    ],
  }),
  component: AdminPage,
});

type Signup = {
  id: string;
  email: string | null;
  created_at: string;
};

function AdminPage() {
  const { isAuthenticated, loading, session } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [loading, isAuthenticated, navigate]);

  // Admin check + initial load
  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const { isAdmin } = await isAdminFn({
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        setAllowed(isAdmin);
        if (isAdmin) {
          const { signups: data } = await getAdminSignups({
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          setSignups(data as Signup[]);
        }
      } catch (err: any) {
        console.error(err);
        setError(err?.message ?? "Erro ao carregar dados.");
      } finally {
        setChecking(false);
      }
    })();
  }, [session]);

  const handleRefresh = useCallback(async () => {
    if (!session || refreshing) return;
    setRefreshing(true);
    try {
      const { signups: data } = await getAdminSignups({
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setSignups(data as Signup[]);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Erro ao atualizar.");
    } finally {
      setRefreshing(false);
    }
  }, [session, refreshing]);

  const stats = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const today = signups.filter((s) => now - new Date(s.created_at).getTime() < oneDay).length;
    const week = signups.filter((s) => now - new Date(s.created_at).getTime() < 7 * oneDay).length;
    return { total: signups.length, week, today };
  }, [signups]);

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (!allowed) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold text-foreground">Acesso negado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Você não tem permissão para acessar este painel.
        </p>
        <Link
          to="/"
          search={{ list: undefined }}
          className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Header */}
      <header
        className="px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-5 shrink-0"
        style={{ background: "var(--hero-gradient)" }}
      >
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Link
                to="/"
                search={{ list: undefined }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/20 text-primary-foreground active:bg-primary-foreground/30 transition-colors shrink-0"
                aria-label="Voltar"
              >
                <ArrowLeft size={18} />
              </Link>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-primary-foreground tracking-tight">
                  Cadastros
                </h1>
                <p className="text-xs text-primary-foreground/70">Painel administrativo</p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/20 text-primary-foreground active:bg-primary-foreground/30 transition-colors disabled:opacity-50 shrink-0"
              aria-label="Atualizar"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-primary-foreground/15 px-3 py-3 backdrop-blur-sm">
            <StatCell icon={<Users size={14} />} label="Total" value={stats.total} />
            <StatCell
              icon={<TrendingUp size={14} />}
              label="7 dias"
              value={stats.week}
              bordered
            />
            <StatCell icon={<Calendar size={14} />} label="Hoje" value={stats.today} />
          </div>
        </div>
      </header>

      <main className="flex-1 px-5 py-5">
        <div className="mx-auto max-w-lg">
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {signups.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">Nenhum cadastro ainda.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {signups.map((s) => (
                <SignupRow key={s.id} signup={s} />
              ))}
            </ul>
          )}

          <LocationFixerSection session={session} />
          <InternationalDetectorSection session={session} />
        </div>
      </main>
    </div>
  );
}

function StatCell({
  icon,
  label,
  value,
  bordered,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  bordered?: boolean;
}) {
  return (
    <div className={`text-center ${bordered ? "border-x border-primary-foreground/20" : ""}`}>
      <div className="flex items-center justify-center gap-1 text-primary-foreground/80">
        {icon}
        <p className="text-[10px] font-semibold uppercase tracking-widest">{label}</p>
      </div>
      <p className="mt-0.5 text-2xl font-bold text-primary-foreground">{value}</p>
    </div>
  );
}

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
});

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.floor(months / 12);
  return `há ${years} ${years === 1 ? "ano" : "anos"}`;
}

function SignupRow({ signup }: { signup: Signup }) {
  return (
    <li className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-sm font-medium text-foreground truncate">
        {signup.email ?? "(sem e-mail)"}
      </p>
      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{dateFmt.format(new Date(signup.created_at))}</span>
        <span className="shrink-0">{relativeTime(signup.created_at)}</span>
      </div>
    </li>
  );
}

// ===== Location Fixer Section =====

type BadLocationRow = { id: string; name: string; location: string };

function extractBairro(loc: string): string {
  const parts = loc
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const streetPrefix =
    /^(rua|av\.?|avenida|al\.?|alameda|r\.|estrada|praça|praca|pça\.?|pca\.?|travessa|rod\.?|rodovia|largo)\s/i;
  for (const p of parts) {
    if (/^\d/.test(p)) continue;
    if (streetPrefix.test(p)) continue;
    return p;
  }
  return parts[0] ?? loc;
}

function LocationFixerSection({
  session,
}: {
  session: { access_token: string } | null;
}) {
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [rows, setRows] = useState<BadLocationRow[] | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    setDoneMsg(null);
    try {
      const { restaurants } = await adminListBadLocations({
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setRows(restaurants as BadLocationRow[]);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao buscar.");
    } finally {
      setLoading(false);
    }
  }, [session]);

  const handleFix = useCallback(async () => {
    if (!session || !rows || rows.length === 0) return;
    setFixing(true);
    setError(null);
    setDoneMsg(null);
    let corrected = 0;
    setProgress({ current: 0, total: rows.length });
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const bairro = extractBairro(r.location);
      if (bairro && bairro !== r.location) {
        try {
          await adminUpdateRestaurantLocation({
            headers: { Authorization: `Bearer ${session.access_token}` },
            data: { id: r.id, location: bairro },
          });
          corrected++;
        } catch (err) {
          console.error("fix location failed", r.id, err);
        }
      }
      setProgress({ current: i + 1, total: rows.length });
    }
    setDoneMsg(`${corrected} localizações corrigidas!`);
    setFixing(false);
    setProgress(null);
    // Refresh list
    try {
      const { restaurants } = await adminListBadLocations({
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setRows(restaurants as BadLocationRow[]);
    } catch {
      // ignore
    }
  }, [session, rows]);

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <MapPin size={16} className="text-primary" />
        <h2 className="text-base font-semibold text-foreground">Corrigir localizações</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Encontra restaurantes onde a localização contém endereço completo e substitui pelo bairro.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={handleSearch}
          disabled={loading || fixing}
          className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? "Buscando..." : "Buscar localizações com endereço completo"}
        </button>
        {rows && rows.length > 0 && (
          <button
            onClick={handleFix}
            disabled={fixing || loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-medium text-primary disabled:opacity-50"
          >
            <Wand2 size={14} />
            {fixing ? "Corrigindo..." : "Corrigir automaticamente"}
          </button>
        )}
      </div>

      {progress && (
        <p className="mt-3 text-xs text-muted-foreground">
          Corrigindo {progress.current}/{progress.total}...
        </p>
      )}

      {doneMsg && (
        <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
          {doneMsg}
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {rows && (
        <div className="mt-4">
          <p className="text-xs font-medium text-muted-foreground">
            {rows.length} restaurante{rows.length === 1 ? "" : "s"} encontrado{rows.length === 1 ? "" : "s"}
          </p>
          {rows.length > 0 && (
            <ul className="mt-2 space-y-1.5 max-h-96 overflow-y-auto">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-xs"
                >
                  <p className="font-medium text-foreground truncate">{r.name}</p>
                  <p className="mt-0.5 text-muted-foreground truncate">{r.location}</p>
                  <p className="mt-0.5 text-[10px] text-primary">→ {extractBairro(r.location)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

// ===== International Detector Section =====

type IntlItem = {
  id: string;
  name: string;
  location: string;
  is_international: boolean;
  suggested_country: string | null;
};

function InternationalDetectorSection({
  session,
}: {
  session: { access_token: string } | null;
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<IntlItem[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (!session) return;
    setAnalyzing(true);
    setError(null);
    setDoneMsg(null);
    try {
      const { international, total } = await adminDetectInternational({
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setItems(international as IntlItem[]);
      setTotal(total);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao analisar.");
    } finally {
      setAnalyzing(false);
    }
  }, [session]);

  const confirmOne = useCallback(
    async (item: IntlItem) => {
      if (!session || !item.suggested_country) return;
      try {
        await adminUpdateRestaurantCountry({
          headers: { Authorization: `Bearer ${session.access_token}` },
          data: { id: item.id, country: item.suggested_country },
        });
        setItems((prev) => (prev ? prev.filter((i) => i.id !== item.id) : prev));
      } catch (err: any) {
        setError(err?.message ?? "Erro ao salvar.");
      }
    },
    [session]
  );

  const ignoreOne = useCallback((id: string) => {
    setItems((prev) => (prev ? prev.filter((i) => i.id !== id) : prev));
  }, []);

  const confirmAll = useCallback(async () => {
    if (!session || !items || items.length === 0) return;
    setSaving(true);
    setError(null);
    let ok = 0;
    for (const item of items) {
      if (!item.suggested_country) continue;
      try {
        await adminUpdateRestaurantCountry({
          headers: { Authorization: `Bearer ${session.access_token}` },
          data: { id: item.id, country: item.suggested_country },
        });
        ok++;
      } catch (err) {
        console.error("confirm country failed", item.id, err);
      }
    }
    setDoneMsg(`${ok} países confirmados!`);
    setItems([]);
    setSaving(false);
  }, [session, items]);

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Globe2 size={16} className="text-primary" />
        <h2 className="text-base font-semibold text-foreground">Detectar Restaurantes Internacionais</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Usa IA para identificar restaurantes fora do Brasil entre os que ainda não têm país definido.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={handleAnalyze}
          disabled={analyzing || saving}
          className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          {analyzing ? "Analisando..." : "Analisar lista"}
        </button>
      </div>

      {doneMsg && (
        <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
          {doneMsg}
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {items !== null && total === 0 && (
        <p className="mt-4 text-xs text-muted-foreground">
          Todos os restaurantes já têm país definido ✓
        </p>
      )}

      {items !== null && total !== null && total > 0 && items.length === 0 && !doneMsg && (
        <p className="mt-4 text-xs text-muted-foreground">
          Nenhum restaurante internacional identificado entre {total} sem país.
        </p>
      )}

      {items && items.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              {items.length} internacional{items.length === 1 ? "" : "is"} identificado{items.length === 1 ? "" : "s"}
            </p>
            <button
              onClick={confirmAll}
              disabled={saving}
              className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Confirmar todos"}
            </button>
          </div>
          <ul className="space-y-1.5 max-h-96 overflow-y-auto">
            {items.map((it) => (
              <li
                key={it.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">{it.name}</p>
                  <p className="mt-0.5 text-muted-foreground truncate">{it.location}</p>
                  <p className="mt-0.5 text-[10px] text-primary">→ {it.suggested_country}</p>
                </div>
                <button
                  onClick={() => confirmOne(it)}
                  className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-1.5 text-emerald-700 dark:text-emerald-300"
                  aria-label="Confirmar"
                  title="Confirmar"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => ignoreOne(it.id)}
                  className="rounded-md border border-border bg-background p-1.5 text-muted-foreground"
                  aria-label="Ignorar"
                  title="Ignorar"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
