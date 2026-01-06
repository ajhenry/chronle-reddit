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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-full max-h-none w-full max-w-none flex-col rounded-none border-0 p-4 sm:h-auto sm:max-h-[90vh] sm:w-[90vw] sm:max-w-md sm:rounded-lg sm:border sm:p-6">
        {/* Event Image - fixed aspect ratio */}
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Title and date - fixed */}
        <DialogHeader className="shrink-0 pt-2">
          <DialogTitle className="text-xl">{event.title}</DialogTitle>
          {showDate && (
            <p className="text-sm font-medium text-primary">{formattedDate}</p>
          )}
        </DialogHeader>

        {/* Description - fills remaining space and scrolls */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <DialogDescription className="text-base leading-relaxed">
            {event.description}
          </DialogDescription>
        </div>

        {/* Footer - fixed at bottom */}
        <div className="shrink-0 space-y-2 pt-2">
          {/* Image credit */}
          {event.imageCreditName && (
            <p className="text-xs text-muted-foreground">
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

          <Button onClick={() => onOpenChange(false)} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

