import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { ChronleLogo } from '../components/ChronleLogo';
import { apiFetch } from '../lib/utils';
import { toast } from 'sonner';

interface EventInput {
  id: string;
  title: string;
  description: string;
  subject: string;
  imageUrl: string;
  imageCreditName: string;
  imageCreditUrl: string;
  date: string;
}

const createEmptyEvent = (): EventInput => ({
  id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  title: '',
  description: '',
  subject: '',
  imageUrl: '',
  imageCreditName: '',
  imageCreditUrl: '',
  date: '',
});

export function PuzzleCreatorPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [events, setEvents] = useState<EventInput[]>([
    createEmptyEvent(),
    createEmptyEvent(),
    createEmptyEvent(),
    createEmptyEvent(),
  ]);

  const addEvent = () => {
    if (events.length >= 8) {
      toast.error('Maximum 8 events allowed');
      return;
    }
    setEvents([...events, createEmptyEvent()]);
  };

  const removeEvent = (index: number) => {
    if (events.length <= 4) {
      toast.error('Minimum 4 events required');
      return;
    }
    setEvents(events.filter((_, i) => i !== index));
  };

  const updateEvent = (index: number, field: keyof EventInput, value: string) => {
    const updated = [...events];
    updated[index] = { ...updated[index]!, [field]: value };
    setEvents(updated);
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      toast.error('Please enter a puzzle title');
      return false;
    }
    if (!description.trim()) {
      toast.error('Please enter a puzzle description');
      return false;
    }

    for (let i = 0; i < events.length; i++) {
      const event = events[i]!;
      if (!event.title.trim()) {
        toast.error(`Event ${i + 1}: Please enter a title`);
        return false;
      }
      if (!event.date) {
        toast.error(`Event ${i + 1}: Please enter a date`);
        return false;
      }
      if (!event.imageUrl.trim()) {
        toast.error(`Event ${i + 1}: Please enter an image URL`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Format events for API
      const formattedEvents = events.map((event) => ({
        title: event.title,
        description: event.description || event.title,
        subject: event.subject || 'History',
        imageUrl: event.imageUrl,
        imageCreditName: event.imageCreditName || 'Unknown',
        imageCreditUrl: event.imageCreditUrl || event.imageUrl,
        date: new Date(event.date).toISOString(),
      }));

      const response = await apiFetch('/api/chronle/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          events: formattedEvents,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create puzzle');
      }

      const data = await response.json();
      toast.success('Puzzle created successfully!');

      // Navigate to the new game
      void navigate(`/game/${data.gameId}`);
    } catch (error) {
      console.error('Error creating puzzle:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create puzzle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <ChronleLogo size="sm" />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container max-w-2xl px-4 py-6">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Create a Chronle Puzzle</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add 4-8 historical events for players to order chronologically
          </p>
        </div>

        {/* Puzzle Info */}
        <div className="mb-8 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Puzzle Title</label>
            <Input
              placeholder="e.g., Space Exploration Milestones"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Description</label>
            <Textarea
              placeholder="e.g., Order these space exploration events from earliest to most recent"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              rows={2}
            />
          </div>
        </div>

        {/* Events */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Events ({events.length})</h2>
            <Button variant="outline" size="sm" onClick={addEvent} disabled={events.length >= 8}>
              <Plus className="mr-1 h-4 w-4" /> Add Event
            </Button>
          </div>

          {events.map((event, index) => (
            <div key={event.id} className="space-y-3 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">Event {index + 1}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeEvent(index)}
                  disabled={events.length <= 4}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Title *</label>
                  <Input
                    placeholder="Event title"
                    value={event.title}
                    onChange={(e) => updateEvent(index, 'title', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Date *</label>
                    <Input
                      type="date"
                      value={event.date}
                      onChange={(e) => updateEvent(index, 'date', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Subject</label>
                    <Input
                      placeholder="e.g., Space, History"
                      value={event.subject}
                      onChange={(e) => updateEvent(index, 'subject', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Description</label>
                  <Textarea
                    placeholder="Brief description of the event"
                    value={event.description}
                    onChange={(e) => updateEvent(index, 'description', e.target.value)}
                    rows={2}
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Image URL *</label>
                  <Input
                    placeholder="https://..."
                    value={event.imageUrl}
                    onChange={(e) => updateEvent(index, 'imageUrl', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Image Credit Name</label>
                    <Input
                      placeholder="Photographer/Source"
                      value={event.imageCreditName}
                      onChange={(e) => updateEvent(index, 'imageCreditName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Image Credit URL</label>
                    <Input
                      placeholder="https://..."
                      value={event.imageCreditUrl}
                      onChange={(e) => updateEvent(index, 'imageCreditUrl', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Submit */}
        <div className="mt-8 flex gap-3">
          <Button variant="outline" onClick={() => navigate(-1)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="flex-1">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Creating...' : 'Create Puzzle'}
          </Button>
        </div>
      </main>
    </div>
  );
}
