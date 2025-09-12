-- Add moves column to lettered_sessions table
ALTER TABLE public.lettered_sessions
ADD COLUMN moves INTEGER DEFAULT 0 NOT NULL;

-- Update existing sessions to have moves count based on submissions
UPDATE public.lettered_sessions
SET moves = (
    SELECT COUNT(*)
    FROM public.lettered_submissions
    WHERE game_session_id = lettered_sessions.id
)
WHERE moves = 0;

-- Add comment to document the column
COMMENT ON COLUMN public.lettered_sessions.moves IS 'Number of moves (pieces placed) in the lettered game session';
