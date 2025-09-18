import React from 'react';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';

interface InGameCustomButtonProps {
  className?: string;
}

export const InGameCustomButton: React.FC<InGameCustomButtonProps> = ({ className }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    void navigate('/custom');
  };

  return (
    <div className={className || ''}>
      <Button
        onClick={handleClick}
        className="w-full text-white bg-gradient-to-r from-purple-500 to-pink-500 border-0 sm:w-auto hover:from-purple-600 hover:to-pink-600"
      >
        <Plus className="mr-1 w-4 h-4" />
        Create Game
      </Button>
    </div>
  );
};
