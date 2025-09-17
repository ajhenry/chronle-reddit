-- Add seed column to lettered_games table
ALTER TABLE public.lettered_games ADD COLUMN seed INTEGER;

-- Add index for seed column for efficient queries
CREATE INDEX IF NOT EXISTS idx_lettered_games_seed ON public.lettered_games(seed);
