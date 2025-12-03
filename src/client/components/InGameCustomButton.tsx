import React from 'react';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import { Plus, Share2 } from 'lucide-react';

interface InGameCustomButtonProps {
  className?: string;
  postId?: string | null;
  subredditName?: string | null;
}

export const InGameCustomButton: React.FC<InGameCustomButtonProps> = ({
  className,
  postId,
  subredditName,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    void navigate('/custom');
  };

  const getRedditPostUrl = () => {
    if (!postId || !subredditName) return null;
    // Remove t3_ prefix if present
    const cleanPostId = postId.startsWith('t3_') ? postId.slice(3) : postId;
    return `https://www.reddit.com/r/${subredditName}/comments/${cleanPostId}/`;
  };

  const handleShare = async () => {
    const redditUrl = getRedditPostUrl();
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
        variant="outline"
        className="flex-1 text-white border-white/30 bg-white/10 hover:bg-white/20 hover:border-white/50"
      >
        <Share2 className="mr-1 w-4 h-4" />
        Share
      </Button>
    </div>
  );
};
