import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, FileDown, Loader2 } from "lucide-react";
import type { SortBy, IncludeStatus } from "@/lib/exportPdf";

export interface ExportPdfOptionsValue {
  scope: "current" | "all";
  includeStatus: IncludeStatus;
  sortBy: SortBy;
  includeNotes: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (opts: ExportPdfOptionsValue) => Promise<void> | void;
  /** When false, the "Todas as listas" option is hidden (e.g. user has only 1 list) */
  allowAllLists?: boolean;
  /** Name of the currently active list, used for the radio label */
  currentListName: string;
}

const DEFAULTS: ExportPdfOptionsValue = {
  scope: "current",
  includeStatus: "all",
  sortBy: "name",
  includeNotes: true,
};

export function ExportPdfDialog({ open, onClose, onConfirm, allowAllLists = true, currentListName }: Props) {
  const { t } = useTranslation();
  const [opts, setOpts] = useState<ExportPdfOptionsValue>(DEFAULTS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setOpts(DEFAULTS);
      setLoading(false);
    }
  }, [open]);

  // Lock scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(opts);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Fechar"
        onClick={loading ? undefined : onClose}
        className="absolute inset-0 bg-black/40"
      />

      <div
        className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom duration-200 flex flex-col"
        style={{ maxHeight: "90vh" }}
      >
        {/* Handle (mobile only feel) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "#1a1a18" }}>
              <FileDown size={15} style={{ color: "#c4844a" }} />
            </div>
            <h2 className="text-base font-semibold text-gray-900">{t("export_pdf")}</h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            aria-label="Fechar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 active:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <Section title={t("export_scope", { defaultValue: "Exportar" })}>
            <RadioRow
              label={currentListName ? `${t("current_list", { defaultValue: "Lista atual" })} (${currentListName})` : t("current_list", { defaultValue: "Lista atual" })}
              checked={opts.scope === "current"}
              onChange={() => setOpts((o) => ({ ...o, scope: "current" }))}
            />
            {allowAllLists && (
              <RadioRow
                label={t("all_lists", { defaultValue: "Todas as listas" })}
                checked={opts.scope === "all"}
                onChange={() => setOpts((o) => ({ ...o, scope: "all" }))}
              />
            )}
          </Section>

          <Section title={t("include", { defaultValue: "Incluir" })}>
            <ChipRow
              options={[
                { v: "all", label: t("filter_all") },
                { v: "to-visit", label: t("filter_to_visit") },
                { v: "visited", label: t("filter_visited") },
              ]}
              value={opts.includeStatus}
              onChange={(v) => setOpts((o) => ({ ...o, includeStatus: v as IncludeStatus }))}
            />
          </Section>

          <Section title={t("sort_by", { defaultValue: "Ordenar por" })}>
            <ChipRow
              options={[
                { v: "name", label: t("name", { defaultValue: "Nome" }) },
                { v: "location", label: t("neighborhood", { defaultValue: "Bairro" }) },
                { v: "cuisine", label: t("cuisine") },
                { v: "date", label: t("date", { defaultValue: "Data" }) },
              ]}
              value={opts.sortBy}
              onChange={(v) => setOpts((o) => ({ ...o, sortBy: v as SortBy }))}
            />
          </Section>

          <Section title={t("include_notes", { defaultValue: "Incluir notas" })}>
            <ChipRow
              options={[
                { v: "yes", label: t("yes", { defaultValue: "Sim" }) },
                { v: "no", label: t("no", { defaultValue: "Não" }) },
              ]}
              value={opts.includeNotes ? "yes" : "no"}
              onChange={(v) => setOpts((o) => ({ ...o, includeNotes: v === "yes" }))}
            />
          </Section>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex gap-2 bg-white">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 h-12 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 active:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex-[1.4] h-12 rounded-xl text-sm font-semibold text-white transition-transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
            style={{ background: "#c4844a" }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t("generating", { defaultValue: "Gerando..." })}
              </>
            ) : (
              <>
                <FileDown size={16} />
                {t("export_pdf")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function RadioRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`w-full flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
        checked ? "border-[#c4844a] bg-[#fdf8f1]" : "border-gray-200 bg-white active:bg-gray-50"
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
          checked ? "border-[#c4844a]" : "border-gray-300"
        }`}
      >
        {checked && <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#c4844a" }} />}
      </span>
      <span className="text-sm text-gray-900">{label}</span>
    </button>
  );
}

function ChipRow({
  options,
  value,
  onChange,
}: {
  options: { v: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.v === value;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              active ? "bg-[#c4844a] text-white" : "bg-gray-100 text-gray-700 active:bg-gray-200"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
