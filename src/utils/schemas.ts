import { z } from 'zod'

// Attempt schema
const AttemptSchema = z.object({
  timelineId: z.string(),
  attempt: z.array(z.string()),
  userId: z.string(),
  correct: z.array(z.boolean()),
})

// Event schema
const EventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  subject: z.string(),
  imageUrl: z.string().url(),
  imageCreditName: z.string(),
  imageCreditUrl: z.string().url(),
  date: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// Timeline Event schema
const TimelineEventSchema = z.object({
  id: z.string(),
  timelineId: z.string(),
  eventId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  event: EventSchema,
})

// Timeline schema
const TimelineSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  solution: z.array(z.string()),
  events: z.array(TimelineEventSchema),
})

// Day schema
const DaySchema = z.object({
  id: z.string(),
  day: z.string(),
  description: z.string(),
  timelineId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  timeline: TimelineSchema,
})

export const DayTimelineSchema = z.object({
  day: DaySchema,
})

// Type inference
export type DayTimeline = z.infer<typeof DayTimelineSchema>
export type Day = z.infer<typeof DaySchema>
export type Timeline = z.infer<typeof TimelineSchema>
export type TimelineEvent = z.infer<typeof TimelineEventSchema>
export type Event = z.infer<typeof EventSchema>
export type Attempt = z.infer<typeof AttemptSchema>
