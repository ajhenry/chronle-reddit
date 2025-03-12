declare global {
  namespace PrismaJson {
    // Used part of attempts
    type PrismaAttemptResult = {
      solved: boolean;
      correct: boolean[];
    };

    // Used for day metrics
    type PrismaDayMetricsStats = {
      totalDays: number;
      solvedMetrics: {
        [key: string]: number;
      };
    };

    type PrismaDayMetricsSolvedDays = {
      [key: string]: {
        solved: boolean;
        timestamp: Date;
        attempts: number;
      };
    };
  }
}

export {};
