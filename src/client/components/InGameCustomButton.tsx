import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Plus, Loader2 } from 'lucide-react';
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
    category: 'Custom',
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🚀 Form submission started!');
    console.log('Form submitted with data:', formData);
    
    if (!formData.phrase.trim()) {
      console.log('❌ Validation failed: No phrase');
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
      
      // Open the Reddit post instead of trying to navigate to gameId
      if (data.postPermalink) {
        window.open(data.postPermalink, '_blank');
      } else if (data.postId) {
        // Fallback: construct Reddit URL from postId if permalink not available
        window.open(`https://reddit.com/comments/${data.postId.replace('t3_', '')}`, '_blank');
      }
      
      // Reset form and close dialog
      setFormData({ phrase: '', category: 'Custom' });
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
          <Button
            size="sm"
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:translate-y-[-1px]"
          >
            <Plus className="w-4 h-4 mr-1" />
            Create Game
          </Button>
        </DialogTrigger>
            
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Custom Game</DialogTitle>
              </DialogHeader>
              
              <Card>
                <CardHeader>
                  <CardTitle>Custom Lettered Game</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6" method="post">
                    <div className="space-y-2">
                      <label htmlFor="category" className="text-sm font-medium">Theme (Optional)</label>
                      <Input
                        id="category"
                        name="category"
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
                        name="phrase"
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Enter your phrase here... (e.g., 'HELLO WORLD', 'PUZZLE GAME')"
                        value={formData.phrase}
                        onChange={(e) => setFormData(prev => ({ ...prev, phrase: e.target.value }))}
                        disabled={isLoading}
                        rows={3}
                        maxLength={45}
                        required
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
                      onClick={() => {
                        console.log('Button clicked - form data:', formData);
                        console.log('Is loading:', isLoading);
                        console.log('Form valid:', !!formData.phrase.trim());
                      }}
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

              <Card>
                <CardHeader>
                  <CardTitle>How it works</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>1. Enter your custom phrase above</p>
                  <p>2. Click "Create Custom Game" to generate the puzzle</p>
                  <p>3. A new Reddit post will be created with your custom Lettered game</p>
                  <p>4. The new game will open in a new tab so you can continue your current game!</p>
                </CardContent>
              </Card>
            </DialogContent>
          </Dialog>
    </div>
  );
};