import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Circle, MapPin, Trash2, ExternalLink, Calendar, User, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";

export type RestaurantDetails = {
  id: string;
  name: string;
  location: string;
  cuisine: string;
  visited: boolean;
  rating: number;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  added_by?: string | null;
  created_at?: string;
  list_id?: string | null;
  photos?: string[] | null;
  dish_favorite?: string | null;
  notes?: string | null;
};

interface Props {
  restaurant: RestaurantDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleVisited: (id: string) => void;
  onDelete: (id: string) => void;
  onRate: (id: string, rating: number) => void;
  onPhotosChange?: (id: string, photos: string[]) => void;
  onSaveDishFavorite?: (id: string, dish_favorite: string) => void;
}

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

export function RestaurantDetailsDialog({
  restaurant,
  open,
  onOpenChange,
  onToggleVisited,
  onDelete,
  onRate,
  onSaveDishFavorite,
}: Props) {
  const { t } = useTranslation();
  const [addedByEmail, setAddedByEmail] = useState<string | null>(null);
  const [dishFavorite, setDishFavorite] = useState<string>(restaurant.dish_favorite ?? "");

  useEffect(() => {
    setDishFavorite(restaurant.dish_favorite ?? "");
  }, [restaurant.id, restaurant.dish_favorite]);

  useEffect(() => {
    if (!open || !restaurant.added_by || !restaurant.list_id) {
      setAddedByEmail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("get_user_email_for_list_member", {
        _user_id: restaurant.added_by!,
        _list_id: restaurant.list_id!,
      });
      if (!cancelled) setAddedByEmail((data as string | null) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, restaurant.added_by, restaurant.list_id]);

  const mapsUrl =
    restaurant.latitude != null && restaurant.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`
      : restaurant.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`
        : null;

  const wazeUrl =
    restaurant.latitude != null && restaurant.longitude != null
      ? `https://waze.com/ul?ll=${restaurant.latitude},${restaurant.longitude}&navigate=yes`
      : restaurant.address
        ? `https://waze.com/ul?q=${encodeURIComponent(restaurant.address)}`
        : null;

  const createdAt = restaurant.created_at ? new Date(restaurant.created_at) : null;

  const handleDelete = () => {
    if (window.confirm(`Excluir "${restaurant.name}"? Esta ação não pode ser desfeita.`)) {
      onDelete(restaurant.id);
      onOpenChange(false);
    }
  };

  const ratingValue = Math.max(0, Math.min(10, Number(restaurant.rating) || 0));
  const ratingDisplay = ratingValue > 0 ? ratingValue.toFixed(1).replace(/\.0$/, "") : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md sm:rounded-2xl p-0 overflow-hidden border-0 [&>button]:hidden"
        style={{ background: "#faf9f7" }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 relative" style={{ background: "#faf9f7" }}>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar"
            className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center transition-colors"
            style={{ background: "#fff", border: "1px solid #ede9e3", borderRadius: 10, color: "#888" }}
          >
            <X size={16} />
          </button>

          <DialogTitle
            className="pr-12 text-left tracking-tight"
            style={{
              fontFamily: '"Playfair Display", serif',
              fontSize: 20,
              fontWeight: 600,
              color: "#1a1a18",
              lineHeight: 1.25,
            }}
          >
            {restaurant.name}
          </DialogTitle>

          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
              style={
                restaurant.visited
                  ? { background: "#edf7f0", color: "#3a9a5c" }
                  : { background: "#fff5e6", color: "#c4844a" }
              }
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: restaurant.visited ? "#3a9a5c" : "#c4844a" }}
              />
              {restaurant.visited ? t("filter_visited") : t("filter_to_visit")}
            </span>
            <span
              className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ background: "#fff", border: "1px solid #ede9e3", color: "#1a1a18" }}
            >
              {restaurant.cuisine}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5" style={{ background: "#faf9f7" }}>
          {/* Rating */}
          <div
            className="rounded-2xl p-4"
            style={{ background: "#fff", border: "1px solid #ede9e3" }}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "#888" }}
            >
              {t("rating")}
            </p>

            <div className="mt-2 flex items-baseline gap-1.5">
              {ratingDisplay ? (
                <>
                  <span
                    style={{
                      fontFamily: '"Playfair Display", serif',
                      fontSize: 32,
                      fontWeight: 700,
                      color: "#c4844a",
                      lineHeight: 1,
                    }}
                  >
                    {ratingDisplay}
                  </span>
                  <span style={{ color: "#888", fontSize: 16 }}>/10</span>
                </>
              ) : (
                <span className="text-sm" style={{ color: "#888" }}>{t("no_rating", { defaultValue: "Sem avaliação" })}</span>
              )}
            </div>

            {/* Slider 0-10, step 0.5 */}
            <div className="mt-4 [&_[data-slot=slider-track]]:bg-[#f3ede0] [&_[data-slot=slider-range]]:bg-[#c4844a] [&_[data-slot=slider-thumb]]:border-[#c4844a] [&_[data-slot=slider-thumb]]:bg-white">
              <Slider
                value={[ratingValue]}
                min={0}
                max={10}
                step={0.5}
                onValueChange={(v) => onRate(restaurant.id, v[0] ?? 0)}
                aria-label="Avaliação de 0 a 10"
                style={
                  {
                    ["--slider-track" as string]: "#f3ede0",
                    ["--slider-range" as string]: "#c4844a",
                  } as React.CSSProperties
                }
              />
              <div className="mt-2 flex justify-between text-[11px]" style={{ color: "#888" }}>
                <span>0</span>
                <span>5</span>
                <span>10</span>
              </div>
            </div>

            {ratingValue > 0 && (
              <button
                type="button"
                onClick={() => onRate(restaurant.id, 0)}
                className="mt-3 text-xs font-medium hover:underline"
                style={{ color: "#888" }}
              >
                {t("remove_rating", { defaultValue: "Remover avaliação" })}
              </button>
            )}
          </div>

          {/* Prato favorito */}
          <div
            className="rounded-2xl p-4"
            style={{ background: "#fff", border: "1px solid #ede9e3" }}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "#888" }}
            >
              {t("favorite_dish")}
            </p>
            <div
              className="mt-2 flex items-center gap-2 rounded-xl px-3"
              style={{ background: "#faf9f7", border: "1px solid #ede9e3" }}
            >
              <span style={{ fontSize: 16 }}>🍽️</span>
              <input
                type="text"
                value={dishFavorite}
                maxLength={100}
                placeholder={t("dish_placeholder")}
                onChange={(e) => setDishFavorite(e.target.value)}
                onBlur={() => {
                  const next = dishFavorite.trim();
                  const prev = (restaurant.dish_favorite ?? "").trim();
                  if (next !== prev) {
                    onSaveDishFavorite?.(restaurant.id, next);
                  }
                }}
                className="flex-1 bg-transparent py-2.5 text-sm focus:outline-none"
                style={{ color: "#1a1a18" }}
              />
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin size={18} className="mt-0.5 shrink-0" style={{ color: "#c4844a" }} />
            <div className="min-w-0 flex-1">
              <p
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "#888" }}
              >
                {t("location_label")}
              </p>
              <p className="text-sm mt-0.5" style={{ color: "#1a1a18" }}>
                {restaurant.location || "—"}
              </p>
              {restaurant.address && (
                <p className="text-sm mt-1" style={{ color: "#888" }}>
                  {restaurant.address}
                </p>
              )}
              {(mapsUrl || wazeUrl) && (
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs font-medium">
                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:underline"
                      style={{ color: "#c4844a" }}
                    >
                      {t("open_google_maps")}
                      <ExternalLink size={12} />
                    </a>
                  )}
                  {mapsUrl && wazeUrl && (
                    <span aria-hidden="true" style={{ color: "#bbb" }}>·</span>
                  )}
                  {wazeUrl && (
                    <a
                      href={wazeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:underline"
                      style={{ color: "#c4844a" }}
                    >
                      {t("open_waze")}
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Meta */}
          {(createdAt || addedByEmail) && (
            <div className="space-y-1.5 text-sm">
              {createdAt && (
                <div className="flex items-center gap-2" style={{ color: "#888" }}>
                  <Calendar size={14} style={{ color: "#c4844a" }} />
                  <span>{t("added_at")} {dateFmt.format(createdAt)}</span>
                </div>
              )}
              {addedByEmail && (
                <div className="flex items-center gap-2" style={{ color: "#888" }}>
                  <User size={14} style={{ color: "#c4844a" }} />
                  <span className="truncate">{t("added_by")} {addedByEmail}</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={() => onToggleVisited(restaurant.id)}
              className="flex items-center justify-center gap-2 text-sm font-medium transition-colors"
              style={{
                background: "#fff",
                border: "1px solid #ede9e3",
                color: "#1a1a18",
                borderRadius: 14,
                height: 48,
              }}
            >
              {restaurant.visited ? (
                <>
                  <Circle size={16} />
                  {t("mark_unvisited")}
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  {t("mark_visited")}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center justify-center gap-2 text-sm font-medium transition-colors"
              style={{
                background: "#fff5f5",
                border: "1px solid #fecaca",
                color: "#e53e3e",
                borderRadius: 14,
                height: 48,
              }}
            >
              <Trash2 size={16} />
              {t("delete_restaurant")}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
