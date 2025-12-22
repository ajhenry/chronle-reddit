import { ReactNode, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { cn } from '../lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Menu,
  Plus,
  Share2,
  HelpCircle,
  Hand,
  MousePointer,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import type { DragMode } from '../hooks/useDragMode';

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
  postId?: string | null;
  subredditName?: string | null;
  logoSrc?: string;
  className?: string;
  dragMode?: DragMode;
  onDragModeChange?: (mode: DragMode) => void;
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

// Handle share action
const handleShare = async (postId?: string | null, subredditName?: string | null) => {
  const redditUrl = getRedditPostUrl(postId, subredditName);
  const shareUrl = redditUrl || window.location.href;

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
    }
  } catch (err) {
    // User cancelled or share failed - ignore
    console.error('Share failed:', err);
  }
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
  postId,
  subredditName,
  logoSrc = '/lettered-logo.svg',
  className,
  dragMode = 'tap-to-drag',
  onDragModeChange,
  gameComplete = false,
}: GameLayoutProps) => {
  const [showHelpModal, setShowHelpModal] = useState(false);

  return (
    <div className={cn('p-4 min-h-screen bg-background', className)}>
      {/* Top Bar */}
      <div className="mx-auto mb-6 max-w-2xl">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex gap-3 items-center">
            <Button variant="ghost" size="icon" onClick={onBack}>
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
                  <Button variant="outline" size="icon" onClick={onLeaderboard} title="Leaderboard">
                    <Trophy className="w-5 h-5" />
                  </Button>
                )
              : onReset && (
                  <Button variant="outline" size="icon" onClick={onReset} title="Reset Pieces">
                    <RotateCcw className="w-5 h-5" />
                  </Button>
                )}

            {/* Desktop: Help Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (onHelp) {
                  onHelp();
                } else {
                  setShowHelpModal(true);
                }
              }}
              className="hidden md:flex"
              title="Help"
            >
              <HelpCircle className="w-5 h-5" />
            </Button>

            {/* Desktop: Create Game Button (gradient) */}
            <Button
              size="icon"
              onClick={onCreateGame}
              className="hidden text-white bg-gradient-to-r from-purple-500 to-pink-500 border-0 md:flex hover:from-purple-600 hover:to-pink-600"
              title="Create Game"
            >
              <Plus className="w-5 h-5" />
            </Button>

            {/* Desktop: Share Button (gold) */}
            <Button
              size="icon"
              onClick={() => void handleShare(postId, subredditName)}
              className="hidden bg-[#F7C846] text-black border-[#F7C846] md:flex hover:bg-[#E5B83D] hover:border-[#E5B83D]"
              title="Share"
            >
              <Share2 className="w-5 h-5" />
            </Button>

            {/* Desktop: Drag Mode Toggle */}
            {onDragModeChange && (
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  onDragModeChange(dragMode === 'tap-to-drag' ? 'hold-to-drag' : 'tap-to-drag')
                }
                className="hidden md:flex"
                title={
                  dragMode === 'tap-to-drag'
                    ? 'Tap to Drag (click to switch)'
                    : 'Hold to Drag (click to switch)'
                }
              >
                {dragMode === 'tap-to-drag' ? (
                  <MousePointer className="w-5 h-5" />
                ) : (
                  <Hand className="w-5 h-5" />
                )}
              </Button>
            )}

            {/* Mobile: Hamburger Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  onClick={() => {
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
                      onClick={onLeaderboard}
                      className="cursor-pointer py-3 text-base hover:bg-[#F7C846] hover:text-black focus:bg-[#F7C846] focus:text-black"
                    >
                      <Trophy className="mr-3 w-5 h-5" />
                      Leaderboard
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {/* Drag Mode Toggle */}
                {onDragModeChange && (
                  <>
                    <DropdownMenuItem
                      onClick={() =>
                        onDragModeChange(
                          dragMode === 'tap-to-drag' ? 'hold-to-drag' : 'tap-to-drag'
                        )
                      }
                      className="cursor-pointer py-3 text-base hover:bg-[#F7C846] hover:text-black focus:bg-[#F7C846] focus:text-black"
                    >
                      {dragMode === 'tap-to-drag' ? (
                        <>
                          <MousePointer className="mr-3 w-5 h-5" />
                          Tap to Drag
                        </>
                      ) : (
                        <>
                          <Hand className="mr-3 w-5 h-5" />
                          Hold to Drag
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  onClick={() => void handleShare(postId, subredditName)}
                  className="cursor-pointer py-3 text-base hover:bg-[#F7C846] hover:text-black focus:bg-[#F7C846] focus:text-black"
                >
                  <Share2 className="mr-3 w-5 h-5" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onCreateGame}
                  className="cursor-pointer py-3 text-base text-white bg-gradient-to-r from-purple-500 to-pink-500 focus:from-purple-600 focus:to-pink-600 focus:text-white"
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
