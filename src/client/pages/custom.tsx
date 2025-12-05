import { FormEvent, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { navigateTo } from '@devvit/web/client';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { RegExpMatcher, DataSet, englishDataset, englishRecommendedTransformers } from 'obscenity';
import { apiFetch } from '../lib/utils';
import { Button } from '../components/ui/button';

// Initialize obscenity filter with custom whitelist
const customDataset = new DataSet<{ originalWord: string }>()
  .addAll(englishDataset)
  .removePhrasesIf((phrase) => phrase.metadata?.originalWord === 'ass');

const obscenityMatcher = new RegExpMatcher({
  ...customDataset.build(),
  ...englishRecommendedTransformers,
});

// LETTERED logo component with yellow tile styling
function LetteredLogo() {
  const letters = ['L', 'E', 'T', 'T', 'E', 'R', 'E', 'D'];

  return (
    <div className="flex gap-1">
      {letters.map((letter, index) => (
        <div
          key={index}
          className="flex items-center justify-center w-7 h-7 sm:w-10 sm:h-10 bg-[#F7C846] text-black font-black text-base sm:text-xl rounded-sm"
        >
          {letter}
        </div>
      ))}
    </div>
  );
}

const MAX_TITLE_LENGTH = 200;

// Helper function to check for obscenity
const containsObscenity = (text: string): boolean => {
  return obscenityMatcher.hasMatch(text);
};

export const CustomGamePage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    phrase: '',
    category: '',
  });

  // Real-time validation errors
  const validationErrors = useMemo(() => {
    const errors: { title?: string; phrase?: string } = {};

    // Title validation
    if (formData.category.trim()) {
      if (formData.category.length > MAX_TITLE_LENGTH) {
        errors.title = `Title must be ${MAX_TITLE_LENGTH} characters or less`;
      } else if (containsObscenity(formData.category)) {
        errors.title = 'Title contains inappropriate language';
      }
    }

    // Phrase validation
    if (formData.phrase.trim()) {
      if (containsObscenity(formData.phrase)) {
        errors.phrase = 'Phrase contains inappropriate language';
      }
    }

    return errors;
  }, [formData.category, formData.phrase]);

  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.phrase.trim()) {
      toast.error('Please enter a phrase');
      return;
    }

    if (!formData.category.trim()) {
      toast.error('Please enter a title');
      return;
    }

    // Check for validation errors before submitting
    if (validationErrors.title) {
      toast.error(validationErrors.title);
      return;
    }

    if (validationErrors.phrase) {
      toast.error(validationErrors.phrase);
      return;
    }

    // Validate phrase constraints
    const cleanPhrase = formData.phrase.replace(/[^a-zA-Z\s]/g, '').trim();

    if (!cleanPhrase) {
      toast.error('Phrase must contain at least one letter');
      return;
    }

    if (cleanPhrase.length > 70) {
      toast.error('Phrase must be 70 characters or less (including spaces)');
      return;
    }

    // Check word length limit (max 9 letters per word)
    const words = cleanPhrase.split(/\s+/);
    const longWords = words.filter((word) => word.length > 9);
    if (longWords.length > 0) {
      toast.error(`Words must be 9 letters or less. Found: ${longWords.join(', ')}`);
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiFetch('/api/custom/lettered', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phrase: formData.phrase.trim(),
          category: formData.category.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create custom game');
      }

      const data = await response.json();

      toast.success('Custom game created successfully!');

      // Navigate to the newly created Reddit post
      if (data.postPermalink) {
        navigateTo(data.postPermalink);
      } else {
        // Fallback to in-app navigation if postPermalink is not available
        if (data.gameId) {
          void navigate(`/lettered/${data.gameId}`);
        } else {
          void navigate('/');
        }
      }
    } catch (error) {
      console.error('Error creating custom game:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create custom game');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = (e?: React.MouseEvent) => {
    e?.preventDefault();
    void navigate('/');
  };

  return (
    <div className="flex relative flex-col min-h-screen bg-black">
      <div className="container px-4 py-6 mx-auto max-w-lg">
        <div className="flex flex-col gap-6">
          {/* Header with Logo */}
          <div className="flex flex-col items-center pt-4 pb-2">
            <LetteredLogo />
            <p className="mt-3 text-sm font-semibold tracking-wide text-white/80">
              CREATE YOUR OWN PUZZLE
            </p>
          </div>

          {/* Back Button */}
          <Button onClick={handleBack} type="button" variant="outline" className="self-start">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          {/* How it works */}
          <div className="p-4 space-y-3 rounded-lg border bg-zinc-900 border-zinc-700">
            <h3 className="text-sm font-bold tracking-wider text-white/70">HOW IT WORKS</h3>
            <div className="space-y-2">
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 bg-[#F7C846] text-black flex items-center justify-center text-xs font-black flex-shrink-0 rounded-sm">
                  1
                </div>
                <p className="text-sm text-white/80">Enter your custom title and phrase below</p>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 bg-[#F7C846] text-black flex items-center justify-center text-xs font-black flex-shrink-0 rounded-sm">
                  2
                </div>
                <p className="text-sm text-white/80">Click "Create Puzzle" to generate the game</p>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 bg-[#F7C846] text-black flex items-center justify-center text-xs font-black flex-shrink-0 rounded-sm">
                  3
                </div>
                <p className="text-sm text-white/80">
                  A new Reddit post will be created with your puzzle
                </p>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 bg-[#F7C846] text-black flex items-center justify-center text-xs font-black flex-shrink-0 rounded-sm">
                  4
                </div>
                <p className="text-sm text-white/80">Share with others and see who can solve it!</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="category" className="text-sm font-bold text-white">
                Title <span className="text-[#F7C846]">*</span>
              </label>
              <input
                id="category"
                type="text"
                placeholder="e.g. NOLAN FILM"
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                disabled={isLoading}
                maxLength={MAX_TITLE_LENGTH + 50}
                className={`w-full px-4 py-3 text-white placeholder-white/40 bg-zinc-900 rounded-lg border focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 ${
                  validationErrors.title
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-zinc-700 focus:ring-[#F7C846]'
                }`}
              />
              {validationErrors.title ? (
                <p className="text-xs text-red-500">{validationErrors.title}</p>
              ) : (
                <p className="text-xs text-white/50">
                  This will be displayed as the puzzle theme to help players guess (
                  {formData.category.length}/{MAX_TITLE_LENGTH})
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="phrase" className="text-sm font-bold text-white">
                Phrase <span className="text-[#F7C846]">*</span>
              </label>
              <textarea
                id="phrase"
                placeholder="e.g. THE DARK KNIGHT RISES"
                value={formData.phrase}
                onChange={(e) => setFormData((prev) => ({ ...prev, phrase: e.target.value }))}
                disabled={isLoading}
                rows={3}
                maxLength={70}
                className={`w-full px-4 py-3 text-white placeholder-white/40 bg-zinc-900 rounded-lg border focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 resize-none ${
                  validationErrors.phrase
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-zinc-700 focus:ring-[#F7C846]'
                }`}
              />
              {validationErrors.phrase ? (
                <p className="text-xs text-red-500">{validationErrors.phrase}</p>
              ) : (
                <p className="text-xs text-white/50">{formData.phrase.length}/70 characters</p>
              )}
            </div>

            {/* Requirements */}
            <div className="p-4 space-y-2 rounded-lg border bg-zinc-900 border-zinc-700">
              <h4 className="text-xs font-bold tracking-wider text-white/70">REQUIREMENTS</h4>
              <ul className="space-y-1 text-sm text-white/60">
                <li className="flex gap-2 items-center">
                  <span className="text-[#F7C846]">-</span> Maximum 70 characters total
                </li>
                <li className="flex gap-2 items-center">
                  <span className="text-[#F7C846]">-</span> Maximum 9 letters per word
                </li>
                <li className="flex gap-2 items-center">
                  <span className="text-[#F7C846]">-</span> Letters and spaces only
                </li>
              </ul>
            </div>

            <Button
              type="submit"
              disabled={
                isLoading ||
                !formData.phrase.trim() ||
                !formData.category.trim() ||
                hasValidationErrors
              }
              className="w-full text-lg tracking-wide"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Puzzle...
                </>
              ) : (
                'Create Puzzle'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
