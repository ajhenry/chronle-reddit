import { Attempt, Day, Event, User } from "@/components/types/schemas";
import { prismaClient } from "./database";

export const getServerDay = () => {
  const utc = new Date().toISOString().split("T")[0];
  return utc;
};

export const getUserDetails = async (uid: string | undefined) => {
  if (!uid) {
    return null;
  }

  const user = await prismaClient.user.findUnique({
    where: { id: uid },
  });

  return user;
};

export const getLatestAttempt = async (uid: string, timelineId: string) => {
  const attempt = await prismaClient.attempt.findFirst({
    where: {
      userId: uid,
      timelineId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!attempt) {
    return null;
  }

  const attemptCount = await prismaClient.attempt.count({
    where: {
      userId: uid,
      timelineId,
    },
  });

  const formattedAttempt: Attempt = {
    count: attemptCount,
    id: attempt!.id,
    result: attempt.result,
    solution: attempt.solution,
    timestamp: attempt.createdAt.toISOString(),
  };

  return formattedAttempt;
};

export const getToday = async () => {
  const today = getServerDay();
  const day = await prismaClient.day.findFirst({
    where: {
      day: {
        equals: today,
      },
    },
    include: {
      timeline: {
        include: {
          events: {
            include: {
              event: true,
            },
          },
        },
      },
    },
  });

  if (!day) {
    console.warn("Day not found, creating new day");
    const newDay = await getDay(today);

    if (!newDay) {
      throw new Error(`Failed to create new day for ${today}`);
    }

    // Sort the timeline events by timelineEvent.id since that uses KSUID
    newDay.timeline.events.sort((a, b) => a.id.localeCompare(b.id));

    return newDay;
  }

  // Sort the timeline events by timelineEvent.id since that uses KSUID
  day.timeline.events.sort((a, b) => a.id.localeCompare(b.id));

  return day;
};

export const getDay = async (day: string) => {
  const dayData = await prismaClient.day.findFirst({
    where: {
      day: {
        equals: day,
      },
    },
    include: {
      timeline: {
        include: {
          events: {
            include: {
              event: true,
            },
          },
        },
      },
    },
  });

  if (!dayData) {
    console.warn("Day not found, creating new day", day);
    const newDay = await createRandomDay({
      day,
      name: `Events for ${day}`,
      description: `Put the events in order of when they happened`,
      numEvents: 6,
    });

    if (!newDay) {
      throw new Error(`Failed to create new day for ${day}`);
    }

    // Sort the timeline events by timelineEvent.id since that uses KSUID
    newDay.timeline.events.sort((a, b) => a.id.localeCompare(b.id));

    return newDay;
  }

  // Sort the timeline events by timelineEvent.id since that uses KSUID
  dayData.timeline.events.sort((a, b) => a.id.localeCompare(b.id));

  return dayData;
};

export const uploadEvents = async (events: Omit<Event, "id">[]) => {
  const eventPromises = events.map(async (event) => {
    const eventCategories = await uploadCategories(event.categories);

    return prismaClient.event.create({
      data: {
        title: event.name,
        description: event.description,
        subject: event.subject,
        date: event.date,
        imageUrl: event.image,
        imageCreditName: event.imageCredit.name,
        imageCreditUrl: event.imageCredit.url,
        eventCategories: {
          create: eventCategories.map((category) => ({
            categoryId: category.id,
          })),
        },
      },
    });
  });

  return Promise.all(eventPromises);
};

export const uploadCategories = async (categories: string[]) => {
  return prismaClient.category.createManyAndReturn({
    data: categories.map((category) => ({
      title: category,
    })),
    skipDuplicates: true,
  });
};

export const uploadDay = async (day: Day) => {
  // Upload events
  const newEvents = await uploadEvents(day.events);

  // Upload day
  const newDay = await prismaClient.day.create({
    data: {
      day: day.day,
      description: day.description,
      timeline: {
        create: {
          title: day.name,
          description: day.description,
          solution: day.solution,
          events: {
            createMany: {
              data: newEvents.map((event) => ({
                eventId: event.id,
              })),
            },
          },
        },
      },
    },
  });

  return newDay;
};

export const uploadDays = async (days: Day[]) => {
  const dayPromises = days.map(async (day) => {
    return uploadDay(day);
  });

  await Promise.all(dayPromises);
};

export const getLatestSubmittedSolution = async (uid: string) => {
  const day = getServerDay();
  const attempt = await prismaClient.attempt.findFirst({
    where: {
      userId: uid,
      timeline: {
        day: {
          day,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return attempt;
};

// Checks to see if the events are in the correct order for a given timeline
export const checkAnswer = async (timelineId: string, events: string[]) => {
  const timeline = await prismaClient.timeline.findFirst({
    where: { id: timelineId },
    include: {
      events: {
        include: {
          event: true,
        },
      },
    },
  });

  if (!timeline) {
    throw new Error("Timeline not found");
  }

  const solved = timeline.solution.every((id, index) => id === events[index]);

  // Identify which events are in the correct position
  const correct = events.map((_, index) => {
    return events[index] === timeline.solution[index];
  });

  return {
    solved,
    correct,
  };
};

export const createRandomDay = async ({
  numEvents: count,
  day,
  name,
  description,
}: {
  numEvents: number;
  day: string;
  name: string;
  description: string;
}) => {
  const totalEvents = await prismaClient.event.count();

  if (totalEvents < count) {
    throw new Error("Not enough events in the database");
  }

  // get numEvents random numbers without duplicates
  const set = new Set<number>();
  while (set.size < count) {
    set.add(Math.floor(Math.random() * totalEvents));
  }

  const eventIds = Array.from(set);

  // fetch the events by offset
  const eventsPromise = eventIds.map(async (eventId) => {
    console.log({ eventId });
    return prismaClient.event.findFirst({
      skip: eventId,
      take: 1,
    });
  });

  const events = await Promise.all(eventsPromise);

  // Now randomize the events
  // added an extra for good measure ;)
  const randomizedEvents = events
    .sort(() => Math.random() - 0.5)
    .sort(() => Math.random() - 0.5);
  const solution = randomizedEvents
    .sort((a, b) => a!.date.getTime() - b!.date.getTime())
    .map((event) => event!.id);

  const newDay = await prismaClient.day.create({
    data: {
      day,
      description,
      timeline: {
        create: {
          title: name,
          description,
          solution,
          events: {
            createMany: {
              data: randomizedEvents.map((event) => ({
                eventId: event!.id,
              })),
            },
          },
        },
      },
    },
    include: {
      timeline: {
        include: {
          events: {
            include: {
              event: true,
            },
          },
        },
      },
    },
  });

  return newDay;
};

export const getUserDayStats = async (uid: string) => {
  const solvedMetrics = await prismaClient.solvedTimelineMetrics.findMany({
    where: { userId: uid },
  });

  const totalSolved = solvedMetrics.length;

  const countSolvedByAttempt = solvedMetrics.reduce(
    (acc, metric) => {
      const attempts = Math.min(metric.attempts, 6);
      acc[attempts] = (acc[attempts] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>
  );

  const currentSolveStreak = solvedMetrics
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
    .reduce((streak, metric, index, arr) => {
      if (
        index === 0 ||
        arr[index - 1].completedAt.getTime() - metric.completedAt.getTime() ===
          86400000
      ) {
        return streak + 1;
      }
      return streak;
    }, 0);

  return {
    totalSolved,
    countSolvedByAttempt,
    currentSolveStreak,
  };
};
