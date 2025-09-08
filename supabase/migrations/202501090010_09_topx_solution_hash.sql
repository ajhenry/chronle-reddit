-- Add solution_hash field to topx_games table for secure validation
ALTER TABLE topx_games ADD COLUMN solution_hash JSONB;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_topx_games_solution_hash ON topx_games USING GIN(solution_hash);
