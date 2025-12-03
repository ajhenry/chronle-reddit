import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { navigateTo } from '@devvit/web/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../lib/utils';

export const CustomGamePage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    phrase: '',
    category: '',
  });

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
    void (window.history.length > 1 ? navigate(-1) : navigate('/'));
  };

  return (
    <div className="flex relative flex-col min-h-screen bg-background">
      <div className="container px-4 py-6 mx-auto max-w-2xl">
        <div className="flex flex-col gap-6">
          {/* Header with back button */}
          <div className="flex gap-4 items-center">
            <Button
              variant="outline"
              onClick={handleBack}
              type="button"
              className="flex gap-2 items-center"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Create Custom Game</h1>
          </div>

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center">How it works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p className="flex-end">
                <span className="mr-3 text-xl font-bold text-primary">1</span> Enter your custom
                title and phrase below
              </p>
              <p className="flex-end">
                <span className="mr-2 text-xl font-bold text-primary">2</span> Click "Create Custom
                Game" to generate the puzzle
              </p>
              <p className="flex-end">
                <span className="mr-2 text-xl font-bold text-primary">3</span> A new Reddit post
                will be created with your custom Lettered game
              </p>
              <p className="flex-end">
                <span className="mr-2 text-xl font-bold text-primary">4</span> Share the post with
                others to let them solve your puzzle!
              </p>
            </CardContent>
          </Card>

          {/* Form Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Custom Lettered Game</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="category" className="text-sm font-medium">
                    Title <span className="text-primary">*</span>
                  </label>
                  <Input
                    id="category"
                    placeholder="Your title (e.g. NOLAN FILM)"
                    value={formData.category}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                    disabled={isLoading}
                  />
                  <div className="text-xs text-muted-foreground">
                    This will be displayed as the puzzle theme to help players guess
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="phrase" className="text-sm font-medium">
                    Phrase <span className="text-primary">*</span>
                  </label>
                  <textarea
                    id="phrase"
                    className="flex min-h-[80px] w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Your phrase (e.g., THE DARK KNIGHT RISES)"
                    value={formData.phrase}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phrase: e.target.value }))}
                    disabled={isLoading}
                    rows={3}
                    maxLength={70}
                  />
                  <div className="text-sm text-muted-foreground">
                    {formData.phrase.length}/70 characters
                  </div>
                </div>

                <div className="">
                  <h3 className="mb-2 font-semibold">Puzzle Requirements</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>
                      <span className="text-xl text-primary">•</span> Maximum 70 characters total
                      (including spaces)
                    </li>
                    <li>
                      <span className="text-xl text-primary">•</span> Maximum 9 letters per word
                    </li>
                    <li>
                      <span className="text-xl text-primary">•</span> Letters and spaces only (no
                      numbers or special characters)
                    </li>
                    <li>
                      <span className="text-xl text-primary">•</span> Try phrases like movie titles,
                      song names, or common sayings
                    </li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !formData.phrase.trim() || !formData.category.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                      Creating Game...
                    </>
                  ) : (
                    'Create Custom Game'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
