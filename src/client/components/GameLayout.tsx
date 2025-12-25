import { ReactNode, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { cn, apiFetch } from '../lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Menu, Plus, Share2, HelpCircle, RotateCcw, Trophy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface GameLayoutProps {
  gameTitle: string;
  time: number; // elapsed time in milliseconds
  moves?: number;
  children: ReactNode;
  onBack: () => void;
  onReset?: () => void;
  onLeaderboard?: () => void;
  onHelp?: () => void;
  onCreateGame?: () => void;
  onHeaderInteraction?: () => void; // Called when any header button is clicked (e.g., to deactivate drag mode)
  postId?: string | null;
  subredditName?: string | null;
  gameId?: string | null;
  contextGameId?: string | null;
  logoSrc?: string;
  className?: string;
  gameComplete?: boolean;
}

// Format milliseconds to MM:SS or HH:MM:SS
const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Helper to get Reddit post URL for sharing
const getRedditPostUrl = (postId?: string | null, subredditName?: string | null) => {
  if (!postId || !subredditName) return null;
  // Remove t3_ prefix if present
  const cleanPostId = postId.startsWith('t3_') ? postId.slice(3) : postId;
  return `https://www.reddit.com/r/${subredditName}/comments/${cleanPostId}/`;
};

export const GameLayout = ({
  gameTitle,
  time,
  moves,
  children,
  onBack,
  onReset,
  onLeaderboard,
  onHelp,
  onCreateGame,
  onHeaderInteraction,
  postId,
  subredditName,
  gameId,
  contextGameId,
  logoSrc = '/lettered-logo.svg',
  className,
  gameComplete = false,
}: GameLayoutProps) => {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Check if this game needs a post to be created before sharing
  // (i.e., it was created via "Play Again" and hasn't been shared yet)
  const needsPostCreation = gameId && (!contextGameId || gameId !== contextGameId);

  // Handle share action with on-demand post creation
  const handleShare = async () => {
    let shareUrl: string;

    if (needsPostCreation) {
      // Create a Reddit post for this game first
      setIsSharing(true);
      try {
        const response = await apiFetch(`/api/lettered/${gameId}/share`, {
          method: 'POST',
        });

        if (!response.ok) {
          throw new Error('Failed to create share post');
        }

        const data = await response.json();
        shareUrl = data.postPermalink;
        toast.success('Post created! Sharing...');
      } catch (error) {
        console.error('Error creating share post:', error);
        toast.error('Failed to create share link');
        setIsSharing(false);
        return;
      } finally {
        setIsSharing(false);
      }
    } else {
      // Use existing post URL
      const redditUrl = getRedditPostUrl(postId, subredditName);
      shareUrl = redditUrl || window.location.href;
    }

    const shareData = {
      title: 'Lettered',
      text: 'Check out this puzzle game on Reddit!',
      url: shareUrl,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard!');
      }
    } catch (err) {
      // User cancelled or share failed - ignore
      console.error('Share failed:', err);
    }
  };

  return (
    <div className={cn('p-4 min-h-screen bg-background', className)}>
      {/* Top Bar */}
      <div className="mx-auto mb-6 max-w-2xl">
        <div
          className="flex justify-between items-center"
          onPointerDown={() => onHeaderInteraction?.()}
        >
          {/* Logo */}
          <div className="flex gap-3 items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                onHeaderInteraction?.();
                onBack();
              }}
            >
              <img src={logoSrc} alt="Game Logo" className="object-contain w-12 h-12" />
            </Button>
            <h1 className="hidden text-2xl font-semibold text-foreground md:block">{gameTitle}</h1>
          </div>

          {/* Time and Moves */}
          <div className="flex gap-6 items-center">
            {/* Time */}
            <div className="text-center">
              <div className="text-3xl font-bold tabular-nums text-foreground">
                {formatTime(time)}
              </div>
              <div className="text-sm font-medium text-foreground">TIME</div>
            </div>

            {/* Moves */}
            {moves !== undefined && (
              <div className="text-center">
                <div className="text-3xl font-bold tabular-nums text-foreground min-w-[2ch]">
                  {moves}
                </div>
                <div className="text-sm font-medium text-foreground">MOVES</div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 items-center">
            {/* Reset Button (during game) or Leaderboard Button (after game complete) */}
            {gameComplete
              ? onLeaderboard && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      onHeaderInteraction?.();
                      onLeaderboard?.();
                    }}
                    title="Leaderboard"
                  >
                    <Trophy className="w-5 h-5" />
                  </Button>
                )
              : onReset && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      onHeaderInteraction?.();
                      onReset?.();
                    }}
                    title="Reset Pieces"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </Button>
                )}

            {/* Hamburger Menu */}
            <DropdownMenu
              onOpenChange={(open) => {
                if (open) onHeaderInteraction?.();
              }}
            >
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  onClick={() => {
                    onHeaderInteraction?.();
                    if (onHelp) {
                      onHelp();
                    } else {
                      setShowHelpModal(true);
                    }
                  }}
                  className="cursor-pointer py-3 text-base hover:bg-[#F7C846] hover:text-black focus:bg-[#F7C846] focus:text-black"
                >
                  <HelpCircle className="mr-3 w-5 h-5" />
                  Help
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* Leaderboard */}
                {onLeaderboard && (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        onHeaderInteraction?.();
                        onLeaderboard?.();
                      }}
                      className="cursor-pointer py-3 text-base hover:bg-[#F7C846] hover:text-black focus:bg-[#F7C846] focus:text-black"
                    >
                      <Trophy className="mr-3 w-5 h-5" />
                      Leaderboard
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  onClick={() => {
                    onHeaderInteraction?.();
                    void handleShare();
                  }}
                  disabled={isSharing}
                  className="cursor-pointer py-3 text-base hover:bg-[#F7C846] hover:text-black focus:bg-[#F7C846] focus:text-black disabled:opacity-70"
                >
                  {isSharing ? (
                    <>
                      <Loader2 className="mr-3 w-5 h-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Share2 className="mr-3 w-5 h-5" />
                      Share
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    onHeaderInteraction?.();
                    onCreateGame?.();
                  }}
                  className="py-3 text-base text-white bg-gradient-to-r from-purple-500 to-pink-500 cursor-pointer focus:from-purple-600 focus:to-pink-600 focus:text-white"
                >
                  <Plus className="mr-3 w-5 h-5" />
                  Create Game
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Game Content */}
      <div className="mx-auto max-w-2xl xl:max-w-6xl">{children}</div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="flex fixed inset-0 z-50 justify-center items-center p-4 bg-black/50">
          <div className="overflow-y-auto w-full max-w-md max-h-full">
            <Card className="p-6 w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-card-foreground">HOW TO PLAY</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowHelpModal(false)}
                  className="text-xl font-semibold text-card-foreground"
                >
                  ×
                </Button>
              </div>
              <CardContent>
                <div className="space-y-3 text-sm text-card-foreground">
                  <p>1. Read the prompt carefully</p>
                  <p>2. Type your answer in the input field</p>
                  <p>3. Press Enter to submit your answer</p>
                  <p>4. Get all correct answers to win!</p>
                </div>
                <Button onClick={() => setShowHelpModal(false)} className="mt-6 w-full">
                  GOT IT
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
