import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Settings } from 'lucide-react';
import type { User } from '../../shared/types/api';

export const AdminBanner = ({ user }: { user: User | null }) => {
  const navigate = useNavigate();

  if (!user || !user.admin) {
    return null;
  }

  return (
    <div className="flex justify-between items-center px-4 py-2 text-sm text-white bg-red-600">
      <div className="flex gap-2 items-center">
        <span className="font-semibold">Admin:</span>
        <span>{user.redditId}</span>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => navigate('/admin')}
        className="flex gap-1 items-center text-red-600 bg-white hover:bg-gray-100"
      >
        <Settings className="w-4 h-4" />
        Dashboard
      </Button>
    </div>
  );
};
