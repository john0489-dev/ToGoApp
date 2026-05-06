import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

export type StatusFilter = "all" | "visited" | "to-visit";

export interface AdvancedFilters {
  neighborhoods: string[];
  occasions: string[];
  cuisines: string[];
  status: StatusFilter;
  minRating: number; // 0 = any
  tags: string[];
  openNow: boolean;
}

export const EMPTY_ADVANCED_FILTERS: AdvancedFilters = {
  neighborhoods: [],
  occasions: [],
  cuisines: [],
  status: "all",
  minRating: 0,
  tags: [],
  openNow: false,
};

export function countActiveFilters(f: AdvancedFilters): number {
  return (
    f.neighborhoods.length +
    f.occasions.length +
    f.cuisines.length +
    (f.status !== "all" ? 1 : 0) +
    (f.minRating > 0 ? 1 : 0) +
    f.tags.length +
    (f.openNow ? 1 : 0)
  );
}

const OCCASION_OPTIONS = ["Casual", "Romântico", "Reunião", "Família", "Happy Hour", "Aniversário"];
const STATUS_OPTIONS: { value: StatusFilter; labelKey: string }[] = [
  { value: "all", labelKey: "filter_all" },
  { value: "to-visit", labelKey: "filter_to_visit" },
  { value: "visited", labelKey: "filter_visited" },
];
const RATING_OPTIONS = [0, 4, 5, 6, 7, 8, 9];

interface Props {
  open: boolean;
  onClose: () => void;
  value: AdvancedFilters;
  onChange: (next: AdvancedFilters) => void;
  /** All cuisines available in the user's data (dynamic) */
  availableCuisines: string[];
  /** All tags available in the user's data (dynamic) */
  availableTags: string[];
  /** All neighborhoods available in the user's data (dynamic) */
  availableNeighborhoods: string[];
}

export function AdvancedFiltersSheet({
  open,
  onClose,
  value,
  onChange,
  availableCuisines,
  availableTags,
  availableNeighborhoods,
}: Props) {
  const { t } = useTranslation();
  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const activeCount = useMemo(() => countActiveFilters(value), [value]);

  const toggle = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Fechar filtros"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 animate-in fade-in"
      />

      {/* Sheet */}
      <div
        className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-200 flex flex-col"
        style={{ maxHeight: "85vh" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1.5 w-12 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t("advanced_filters")}</h2>
            {activeCount > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">{activeCount} filtro{activeCount > 1 ? "s" : ""} ativo{activeCount > 1 ? "s" : ""}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 active:bg-gray-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Aberto agora */}
          <Section title={t("open_now")}>
            <button
              type="button"
              onClick={() => onChange({ ...value, openNow: !value.openNow })}
              className={`w-full h-10 rounded-xl text-sm font-medium transition-colors ${
                value.openNow
                  ? "bg-[#c4844a] text-white"
                  : "bg-gray-100 text-gray-700 active:bg-gray-200"
              }`}
            >
              {value.openNow ? `✓ ${t("open_now")}` : t("open_now")}
            </button>
          </Section>

          {/* Status */}
          <Section title={t("status_label", { defaultValue: "Status" })}>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const active = value.status === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange({ ...value, status: opt.value })}
                    className={`flex-1 h-10 rounded-xl text-sm font-medium transition-colors ${
                      active
                        ? "bg-[#c4844a] text-white"
                        : "bg-gray-100 text-gray-700 active:bg-gray-200"
                    }`}
                  >
                    {t(opt.labelKey)}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Bairro */}
          {availableNeighborhoods.length > 0 && (
            <Section title={t("neighborhood", { defaultValue: "Bairro" })}>
              <div className="flex flex-wrap gap-2">
                {availableNeighborhoods.map((n) => (
                  <Chip
                    key={n}
                    active={value.neighborhoods.includes(n)}
                    onClick={() => onChange({ ...value, neighborhoods: toggle(value.neighborhoods, n) })}
                    label={n}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* Ocasião */}
          <Section title={t("occasion", { defaultValue: "Ocasião" })}>
            <div className="flex flex-wrap gap-2">
              {OCCASION_OPTIONS.map((o) => (
                <Chip
                  key={o}
                  active={value.occasions.includes(o)}
                  onClick={() => onChange({ ...value, occasions: toggle(value.occasions, o) })}
                  label={o}
                />
              ))}
            </div>
          </Section>

          {/* Avaliação */}
          <Section title={t("min_rating", { defaultValue: "Avaliação mínima" })}>
            <div className="flex flex-wrap gap-2">
              {RATING_OPTIONS.map((n) => {
                const active = value.minRating === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onChange({ ...value, minRating: n })}
                    className={`rounded-full px-3 py-1.5 transition-colors ${
                      active
                        ? "bg-[#c4844a] text-white"
                        : "bg-[#f5f2ee] text-[#888] active:bg-gray-200"
                    }`}
                    style={{ fontSize: "13px", fontWeight: 500 }}
                  >
                    {n === 0 ? t("any", { defaultValue: "Qualquer" }) : `${n}+`}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Culinária */}
          {availableCuisines.length > 0 && (
            <Section title={t("cuisine")}>
              <div className="flex flex-wrap gap-2">
                {availableCuisines.map((c) => (
                  <Chip
                    key={c}
                    active={value.cuisines.includes(c)}
                    onClick={() => onChange({ ...value, cuisines: toggle(value.cuisines, c) })}
                    label={c}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* Tags */}
          {availableTags.length > 0 && (
            <Section title={t("tags")}>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((t) => (
                  <Chip
                    key={t}
                    active={value.tags.includes(t)}
                    onClick={() => onChange({ ...value, tags: toggle(value.tags, t) })}
                    label={`#${t}`}
                  />
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3 border-t border-gray-100 flex gap-2 bg-white rounded-b-none">
          <button
            type="button"
            onClick={() => onChange(EMPTY_ADVANCED_FILTERS)}
            disabled={activeCount === 0}
            className="flex-1 h-12 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 active:bg-gray-200 transition-colors disabled:opacity-40"
          >
            {t("clear_filters", { defaultValue: "Limpar filtros" })}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-[1.4] h-12 rounded-xl text-sm font-semibold text-white transition-transform active:scale-[0.98]"
            style={{ background: "#c4844a" }}
          >
            {t("apply", { defaultValue: "Aplicar" })}{activeCount > 0 ? ` (${activeCount})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2.5">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-[#c4844a] text-white"
          : "bg-gray-100 text-gray-700 active:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
}
