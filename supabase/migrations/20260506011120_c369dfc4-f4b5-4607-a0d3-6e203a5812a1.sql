ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS opening_hours jsonb,
  ADD COLUMN IF NOT EXISTS place_id text,
  ADD COLUMN IF NOT EXISTS hours_updated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_restaurants_place_id ON public.restaurants(place_id);