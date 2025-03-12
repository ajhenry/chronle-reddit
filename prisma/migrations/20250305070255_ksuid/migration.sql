/*
  Warnings:

  - You are about to drop the column `categories` on the `events` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "attempts" ALTER COLUMN "id" SET DEFAULT 'attempt_' || ksuid_pgcrypto();

-- AlterTable
ALTER TABLE "categories" ALTER COLUMN "id" SET DEFAULT 'category_' || ksuid_pgcrypto();

-- AlterTable
ALTER TABLE "customers" ALTER COLUMN "id" SET DEFAULT 'customer_' || ksuid_pgcrypto();

-- AlterTable
ALTER TABLE "days" ALTER COLUMN "id" SET DEFAULT 'day_' || ksuid_pgcrypto();

-- AlterTable
ALTER TABLE "event_categories" ADD COLUMN     "id" TEXT NOT NULL DEFAULT 'eventcategory_' || ksuid_pgcrypto();

-- AlterTable
ALTER TABLE "events" DROP COLUMN "categories",
ALTER COLUMN "id" SET DEFAULT 'event_' || ksuid_pgcrypto();

-- AlterTable
ALTER TABLE "solved_timeline_metrics" ALTER COLUMN "id" SET DEFAULT 'metric_' || ksuid_pgcrypto();

-- AlterTable
ALTER TABLE "subscriptions" ALTER COLUMN "id" SET DEFAULT 'subscription_' || ksuid_pgcrypto();

-- AlterTable
ALTER TABLE "timeline_events" ADD COLUMN     "id" TEXT NOT NULL DEFAULT 'timelineevent_' || ksuid_pgcrypto();

-- AlterTable
ALTER TABLE "timelines" ALTER COLUMN "id" SET DEFAULT 'timeline_' || ksuid_pgcrypto();

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT 'user_' || ksuid_pgcrypto();
