-- Create lettered_games table for storing lettered game data
CREATE TABLE IF NOT EXISTS public.lettered_games (
    id TEXT DEFAULT ('letteredgame_' || generate_ksuid()) PRIMARY KEY,
    category TEXT NOT NULL,
    phrase TEXT NOT NULL,
    grid JSONB NOT NULL, -- NxM grid as JSON
    rows INTEGER NOT NULL, -- Number of rows in the grid
    cols INTEGER NOT NULL, -- Number of columns in the grid
    pieces JSONB NOT NULL, -- Array of letter pieces as JSON
    solution JSONB NOT NULL, -- Solution positions for each piece as JSON
    solution_hash TEXT NOT NULL, -- SHA256 hash of the solved grid for verification
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_lettered_games_category ON public.lettered_games(category);
CREATE INDEX IF NOT EXISTS idx_lettered_games_board_size ON public.lettered_games(rows, cols);
CREATE INDEX IF NOT EXISTS idx_lettered_games_solution_hash ON public.lettered_games(solution_hash);

-- Create trigger to automatically update updated_at
CREATE TRIGGER handle_lettered_games_updated_at
    BEFORE UPDATE ON public.lettered_games
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
