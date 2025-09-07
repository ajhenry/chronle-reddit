-- Update lettered_submissions table to store complete board state instead of individual piece movements

-- Add new columns for board state storage
ALTER TABLE public.lettered_submissions
ADD COLUMN board_state JSONB NOT NULL,
ADD COLUMN submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
ADD COLUMN score_at_submission INTEGER NOT NULL;

-- Create index for efficient querying by submission time
CREATE INDEX IF NOT EXISTS idx_lettered_submissions_submitted_at ON public.lettered_submissions(submitted_at);

-- Remove old columns that are no longer needed
ALTER TABLE public.lettered_submissions
DROP COLUMN IF EXISTS piece_id,
DROP COLUMN IF EXISTS position,
DROP COLUMN IF EXISTS placed_at,
DROP COLUMN IF EXISTS score_at_placement;

-- Add constraint to ensure board_state is not null
ALTER TABLE public.lettered_submissions
ADD CONSTRAINT lettered_submissions_board_state_not_null CHECK (board_state IS NOT NULL);

-- Update trigger to automatically set submitted_at on update if not provided
CREATE OR REPLACE FUNCTION update_submitted_at_column()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.submitted_at IS NULL THEN
        NEW.submitted_at = timezone('utc'::text, now());
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-populate submitted_at
CREATE TRIGGER handle_lettered_submissions_submitted_at
    BEFORE INSERT ON public.lettered_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_submitted_at_column();
