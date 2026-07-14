import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, CheckCircle2, Circle } from "lucide-react";
import { RestaurantDetailsDialog, type RestaurantDetails } from "./RestaurantDetailsDialog";
import { formatLocation } from "@/lib/format-location";

interface RestaurantCardProps {
  restaurant: RestaurantDetails;
  onToggleVisited: (id: string) => void;
  onDelete: (id: string) => void;
  onRate: (id: string, rating: number) => void;
  onSaveDishFavorite?: (id: string, dish_favorite: string) => void;
  onSaveTags?: (id: string, tags: string[]) => void;
  onSaveCuisine?: (id: string, cuisine: string) => void;
  isOpen?: boolean | null;
}

function RestaurantCardImpl({
  restaurant,
  onToggleVisited,
  onDelete,
  onRate,
  onSaveDishFavorite,
  onSaveTags,
  onSaveCuisine,
  isOpen,
}: RestaurantCardProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const stop = (e: React.MouseEvent | React.KeyboardEvent) => e.stopPropagation();

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="rounded-[14px] p-4 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-ring"
        style={{ background: "#fff", border: "1px solid #ede9e3" }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-card-foreground truncate">
                {restaurant.name}
              </h3>
              <p className="text-sm text-muted-foreground truncate">{formatLocation(restaurant.location, restaurant.country)}</p>
            </div>
            <button
              onClick={(e) => {
                stop(e);
                onDelete(restaurant.id);
              }}
              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
              aria-label={`Excluir ${restaurant.name}`}
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
              {restaurant.cuisine}
            </span>
            {!restaurant.visited && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-[var(--status-to-visit)]/15 text-[var(--status-to-visit)]"
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--status-to-visit)]" />
                Para Visitar
              </span>
            )}
            {isOpen === true && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  background: "#edf7f0",
                  color: "#3a9a5c",
                  border: "1px solid #c0e8cf",
                }}
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#3a9a5c]" />
                Aberto agora
              </span>
            )}
          </div>

          {restaurant.dish_favorite && (
            <p
              className="mt-2 truncate italic"
              style={{ fontSize: 12, color: "#aaa" }}
            >
              🍽️ {restaurant.dish_favorite}
            </p>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between" onClick={stop}>
          {restaurant.rating > 0 ? (
            <span
              className="inline-flex items-baseline gap-0.5"
              style={{
                background: "#fff5e6",
                border: "1px solid #e8d9b0",
                borderRadius: 20,
                padding: "4px 10px",
                fontSize: 13,
                lineHeight: 1.2,
              }}
            >
              <span style={{ color: "#c4844a", fontWeight: 700 }}>
                {Number(restaurant.rating).toFixed(1).replace(/\.0$/, "")}
              </span>
              <span style={{ color: "#888" }}>/10</span>
            </span>
          ) : (
            <span />
          )}
          <button
            onClick={(e) => {
              stop(e);
              onToggleVisited(restaurant.id);
            }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {restaurant.visited ? (
              <>
                <CheckCircle2 size={16} className="text-[var(--status-visited)]" />
                <span className="text-[var(--status-visited)]">Visitado</span>
              </>
            ) : (
              <>
                <Circle size={16} />
                <span>Marcar como visitado</span>
              </>
            )}
          </button>
        </div>
      </div>

      <RestaurantDetailsDialog
        restaurant={restaurant}
        open={open}
        onOpenChange={setOpen}
        onToggleVisited={onToggleVisited}
        onDelete={onDelete}
        onRate={onRate}
        onSaveDishFavorite={onSaveDishFavorite}
        onSaveTags={onSaveTags}
        onSaveCuisine={onSaveCuisine}
      />
    </>
  );
}

export const RestaurantCard = memo(RestaurantCardImpl);
