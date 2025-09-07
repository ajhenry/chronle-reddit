-- Create submission tables for tracking individual answer submissions and piece placements

-- Create topx_submissions table for tracking individual answer submissions
CREATE TABLE IF NOT EXISTS public.topx_submissions (
    id TEXT PRIMARY KEY DEFAULT ('topxsubmission_' || generate_ksuid()),
    game_session_id TEXT NOT NULL REFERENCES public.topx_sessions(id) ON DELETE CASCADE,
    answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    position INTEGER, -- Position in the solution array if correct (1-indexed)
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    score_at_submission INTEGER NOT NULL, -- Score when this answer was submitted
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create lettered_submissions table for tracking individual piece placements
CREATE TABLE IF NOT EXISTS public.lettered_submissions (
    id TEXT PRIMARY KEY DEFAULT generate_ksuid(),
    game_session_id TEXT NOT NULL REFERENCES public.lettered_sessions(id) ON DELETE CASCADE,
    piece_id TEXT NOT NULL,
    position JSONB NOT NULL, -- {row, col} position as JSON
    placed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    score_at_placement INTEGER NOT NULL, -- Score when this piece was placed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_topx_submissions_game_session_id ON public.topx_submissions(game_session_id);
CREATE INDEX IF NOT EXISTS idx_topx_submissions_submitted_at ON public.topx_submissions(submitted_at);
CREATE INDEX IF NOT EXISTS idx_topx_submissions_is_correct ON public.topx_submissions(is_correct);

CREATE INDEX IF NOT EXISTS idx_lettered_submissions_game_session_id ON public.lettered_submissions(game_session_id);
CREATE INDEX IF NOT EXISTS idx_lettered_submissions_placed_at ON public.lettered_submissions(placed_at);

-- Grant necessary permissions
GRANT ALL ON public.topx_submissions TO authenticated;
GRANT ALL ON public.topx_submissions TO service_role;
GRANT ALL ON public.lettered_submissions TO authenticated;
GRANT ALL ON public.lettered_submissions TO service_role;
