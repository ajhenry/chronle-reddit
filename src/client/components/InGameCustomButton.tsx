import React, { useState } from 'react';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import { Plus, Share2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../lib/utils';

interface InGameCustomButtonProps {
  className?: string;
  postId?: string | null;
  subredditName?: string | null;
  gameId?: string | null;
  contextGameId?: string | null;
}

export const InGameCustomButton: React.FC<InGameCustomButtonProps> = ({
  className,
  postId,
  subredditName,
  gameId,
  contextGameId,
}) => {
  const navigate = useNavigate();
  const [isSharing, setIsSharing] = useState(false);

  const handleClick = () => {
    void navigate('/custom');
  };

  const getRedditPostUrl = () => {
    if (!postId || !subredditName) return null;
    // Remove t3_ prefix if present
    const cleanPostId = postId.startsWith('t3_') ? postId.slice(3) : postId;
    return `https://www.reddit.com/r/${subredditName}/comments/${cleanPostId}/`;
  };

  // Check if this game needs a post to be created before sharing
  // (i.e., it was created via "Play Again" and hasn't been shared yet)
  const needsPostCreation = gameId && (!contextGameId || gameId !== contextGameId);

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
      const redditUrl = getRedditPostUrl();
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
    <div className={`flex gap-2 ${className || ''}`}>
      <Button
        onClick={handleClick}
        className="flex-1 text-white bg-gradient-to-r from-purple-500 to-pink-500 border-0 hover:from-purple-600 hover:to-pink-600"
      >
        <Plus className="mr-1 w-4 h-4" />
        Create Game
      </Button>
      <Button
        onClick={() => void handleShare()}
        disabled={isSharing}
        className="flex-1 bg-[#F7C846] text-black border-[#F7C846] hover:bg-[#E5B83D] hover:border-[#E5B83D] disabled:opacity-70"
      >
        {isSharing ? (
          <>
            <Loader2 className="mr-1 w-4 h-4 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <Share2 className="mr-1 w-4 h-4" />
            Share
          </>
        )}
      </Button>
    </div>
  );
};
