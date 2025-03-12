/*
  Warnings:

  - Added the required column `subject` to the `events` table without a default value. This is not possible if the table is not empty.
  - Made the column `description` on table `events` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "attempts" ALTER COLUMN "id" SET DEFAULT 'attempt_' || gen_random_uuid();

-- AlterTable
ALTER TABLE "categories" ALTER COLUMN "id" SET DEFAULT 'category_' || gen_random_uuid();

-- AlterTable
ALTER TABLE "customers" ALTER COLUMN "id" SET DEFAULT 'customer_' || gen_random_uuid();

-- AlterTable
ALTER TABLE "days" ALTER COLUMN "id" SET DEFAULT 'day_' || gen_random_uuid();

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "subject" TEXT NOT NULL,
ALTER COLUMN "id" SET DEFAULT 'event_' || gen_random_uuid(),
ALTER COLUMN "description" SET NOT NULL;

-- AlterTable
ALTER TABLE "solved_timeline_metrics" ALTER COLUMN "id" SET DEFAULT 'metric_' || gen_random_uuid();

-- AlterTable
ALTER TABLE "subscriptions" ALTER COLUMN "id" SET DEFAULT 'subscription_' || gen_random_uuid();

-- AlterTable
ALTER TABLE "timelines" ALTER COLUMN "id" SET DEFAULT 'timeline_' || gen_random_uuid();

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT 'user_' || gen_random_uuid();
