import { useCountdown } from '../hooks/useCountdown';

export const GameResetCountdown = () => {
  const { hours, minutes, isLoading } = useCountdown();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center space-y-1">
        <div className="text-3xl font-bold text-card-foreground">Loading...</div>
        <div className="text-sm text-muted-foreground">Games Reset In</div>
      </div>
    );
  }

  const formatTime = (hours: number, minutes: number): string => {
    if (hours === 0) {
      return `${minutes} mins`;
    } else if (minutes === 0) {
      return `${hours} hrs`;
    } else {
      return `${hours} hrs ${minutes} mins`;
    }
  };

  return (
    <div className="flex flex-col items-center space-y-1">
      <div className="text-3xl font-bold text-card-foreground tracking-wide">
        {formatTime(hours, minutes)}
      </div>
      <div className="text-sm text-muted-foreground uppercase tracking-wide">Games Reset In</div>
    </div>
  );
};
