import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import type { ChronleEvent } from '../../shared/types/chronle';

interface EventDetailModalProps {
  event: ChronleEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showDate?: boolean;
}

export function EventDetailModal({
  event,
  open,
  onOpenChange,
  showDate = false,
}: EventDetailModalProps) {
  if (!event) return null;

  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent className="flex h-full max-h-none w-full max-w-none flex-col overflow-hidden rounded-none border-0 p-4 sm:rounded-none">
        {/* Event Image - larger on mobile */}
        <div className="relative w-full shrink-0 overflow-hidden rounded-lg" style={{ aspectRatio: '16/9' }}>
          <img
            src={event.imageUrl}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Content area - fills remaining space */}
        <div className="flex flex-1 flex-col justify-center py-2">
          <DialogHeader>
            <DialogTitle className="text-xl">{event.title}</DialogTitle>
            {showDate && (
              <p className="text-sm font-medium text-primary">{formattedDate}</p>
            )}
          </DialogHeader>

          {/* Description - clamps to available space */}
          <DialogDescription className="mt-2 line-clamp-6 text-base leading-relaxed">
            {event.description}
          </DialogDescription>

          {/* Image credit */}
          {event.imageCreditName && (
            <p className="mt-2 text-xs text-muted-foreground">
              Image:{' '}
              {event.imageCreditUrl ? (
                <a
                  href={event.imageCreditUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  {event.imageCreditName}
                </a>
              ) : (
                event.imageCreditName
              )}
            </p>
          )}
        </div>

        {/* Close button at bottom */}
        <div className="shrink-0">
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

