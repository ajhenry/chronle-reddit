import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from './ui/dialog';
import { Plus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../lib/utils';

interface InGameCustomButtonProps {
  className?: string;
}

export const InGameCustomButton: React.FC<InGameCustomButtonProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    phrase: '',
    category: '',
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.category.trim()) {
      toast.error('Please enter a title');
      return;
    }

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

      // Open the Reddit post instead of trying to navigate to gameId
      if (data.postPermalink) {
        window.open(data.postPermalink, '_blank');
      } else if (data.postId) {
        // Fallback: construct Reddit URL from postId if permalink not available
        window.open(`https://reddit.com/comments/${data.postId.replace('t3_', '')}`, '_blank');
      }

      // Reset form and close dialog
      setFormData({ phrase: '', category: '' });
      setIsOpen(false);
    } catch (error) {
      console.error('Error creating custom game:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create custom game');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={className || ''}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="w-full text-white bg-gradient-to-r from-purple-500 to-pink-500 border-0 hover:from-purple-600 hover:to-pink-600">
            <Plus className="mr-1 w-4 h-4" />
            Create Game
          </Button>
        </DialogTrigger>

        <DialogContent className="overflow-y-auto max-w-2xl">
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent text-primary">
            <X className="w-4 h-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <DialogHeader>
            <DialogTitle>Create Custom Game</DialogTitle>
          </DialogHeader>

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
                    maxLength={45}
                  />
                  <div className="text-sm text-muted-foreground">
                    {formData.phrase.length}/45 characters
                  </div>
                </div>

                <div className="">
                  <h3 className="mb-2 font-semibold">Puzzle Requirements</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>
                      <span className="text-xl text-primary">•</span> Maximum 45 characters total
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

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-center">How it works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p className="flex-end">
                <span className="mr-3 text-xl font-bold text-primary">1</span> Enter your custom
                phrase above
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
        </DialogContent>
      </Dialog>
    </div>
  );
};
