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
    const hourText = hours === 1 ? `${hours} hr` : `${hours} hrs`;
    const minuteText = minutes === 1 ? `${minutes} min` : `${minutes} mins`;

    if (hours === 0) {
      return minuteText;
    } else if (minutes === 0) {
      return hourText;
    } else {
      return `${hourText} ${minuteText}`;
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
