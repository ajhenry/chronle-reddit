import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    category: 'Custom',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.phrase.trim()) {
      toast.error('Please enter a phrase');
      return;
    }

    // Validate phrase constraints
    const cleanPhrase = formData.phrase.replace(/[^a-zA-Z\s]/g, '').trim();
    
    if (!cleanPhrase) {
      toast.error('Phrase must contain at least one letter');
      return;
    }

    if (cleanPhrase.length > 45) {
      toast.error('Phrase must be 45 characters or less (including spaces)');
      return;
    }

    // Check word length limit (max 9 letters per word)
    const words = cleanPhrase.split(/\s+/);
    const longWords = words.filter(word => word.length > 9);
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
          category: formData.category.trim() || 'Custom',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create custom game');
      }

      const data = await response.json();
      
      toast.success('Custom game created successfully!');
      
      // Navigate to the custom game
      if (data.gameId) {
        navigate(`/lettered/${data.gameId}`);
      } else {
        // Fallback to opening Reddit post if gameId is not available
        if (data.postPermalink) {
          window.open(data.postPermalink, '_blank');
        }
        navigate('/');
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
    navigate('/');
  };

  return (
    <div className="flex relative flex-col min-h-screen bg-background">
      <div className="container px-4 py-6 mx-auto max-w-2xl">
        <div className="flex flex-col gap-6">
          {/* Header with back button */}
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={handleBack} type="button" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Create Custom Game</h1>
          </div>

          {/* Form Card */}
          <Card>
            <CardHeader>
              <CardTitle>Custom Lettered Game</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="category" className="text-sm font-medium">Theme (Optional)</label>
                  <Input
                    id="category"
                    placeholder="e.g., Movies, Sports, Animals..."
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    disabled={isLoading}
                  />
                  <div className="text-xs text-muted-foreground">
                    This will be displayed as the puzzle theme to help players guess
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="phrase" className="text-sm font-medium">
                    Phrase <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="phrase"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Enter your phrase here... (e.g., 'HELLO WORLD', 'PUZZLE GAME')"
                    value={formData.phrase}
                    onChange={(e) => setFormData(prev => ({ ...prev, phrase: e.target.value }))}
                    disabled={isLoading}
                    rows={3}
                    maxLength={45}
                  />
                  <div className="text-sm text-muted-foreground">
                    {formData.phrase.length}/45 characters
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Puzzle Requirements:</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Maximum 45 characters total (including spaces)</li>
                    <li>• Maximum 9 letters per word</li>
                    <li>• Use letters and spaces only (no numbers or special characters)</li>
                    <li>• Try phrases like movie titles, song names, or common sayings</li>
                  </ul>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || !formData.phrase.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Game...
                    </>
                  ) : (
                    'Create Custom Game'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>How it works</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                1. Enter your custom phrase above
              </p>
              <p>
                2. Click "Create Custom Game" to generate the puzzle
              </p>
              <p>
                3. A new Reddit post will be created with your custom Lettered game
              </p>
              <p>
                4. Share the post with others to let them solve your puzzle!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};