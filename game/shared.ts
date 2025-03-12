import { Attempt, Prisma } from '@prisma/client';

export type Page = 'home' | 'game' | 'how-to-play' | 'post-game';

export type WebviewToBlockMessage = { type: 'INIT' } | { type: 'START_GAME' };

export type BlocksToWebviewMessage =
  | {
      type: 'INIT_RESPONSE';
      payload: {
        postId: string;
      };
    }
  | {
      type: 'GET_TIMELINE_RESPONSE';
      payload: {
        timeline: Prisma.DayGetPayload<{
          include: {
            timeline: {
              include: {
                events: {
                  include: {
                    event: true;
                  };
                };
              };
            };
          };
        }> | null;
      };
    }
  | {
      type: 'GET_LAST_ATTEMPT_RESPONSE';
      payload: { lastAttempt: Attempt };
    }
  | {
      type: 'GET_SOLUTION_RESPONSE';
      payload: { solution: string[] };
    };

export type DevvitMessage = {
  type: 'devvit-message';
  data: { message: BlocksToWebviewMessage };
};
