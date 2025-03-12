/*
  Warnings:

  - You are about to drop the `day_metrics` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "day_metrics" DROP CONSTRAINT "day_metrics_userId_fkey";

-- AlterTable
ALTER TABLE "attempts" ALTER COLUMN "id" SET DEFAULT 'attempt_' || gen_random_uuid();

-- AlterTable
ALTER TABLE "categories" ALTER COLUMN "id" SET DEFAULT 'category_' || gen_random_uuid();

-- AlterTable
ALTER TABLE "customers" ALTER COLUMN "id" SET DEFAULT 'customer_' || gen_random_uuid();

-- AlterTable
ALTER TABLE "days" ALTER COLUMN "id" SET DEFAULT 'day_' || gen_random_uuid();

-- AlterTable
ALTER TABLE "events" ALTER COLUMN "id" SET DEFAULT 'event_' || gen_random_uuid();

-- AlterTable
ALTER TABLE "subscriptions" ALTER COLUMN "id" SET DEFAULT 'subscription_' || gen_random_uuid();

-- AlterTable
ALTER TABLE "timelines" ALTER COLUMN "id" SET DEFAULT 'timeline_' || gen_random_uuid();

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT 'user_' || gen_random_uuid();

-- DropTable
DROP TABLE "day_metrics";

-- CreateTable
CREATE TABLE "solved_timeline_metrics" (
    "id" TEXT NOT NULL DEFAULT 'metric_' || gen_random_uuid(),
    "solved" BOOLEAN NOT NULL,
    "completedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timelineId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "solved_timeline_metrics_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "solved_timeline_metrics" ADD CONSTRAINT "solved_timeline_metrics_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES "timelines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solved_timeline_metrics" ADD CONSTRAINT "solved_timeline_metrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
