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
ALTER TABLE "solved_timeline_metrics" ADD COLUMN     "dayId" TEXT,
ALTER COLUMN "id" SET DEFAULT 'metric_' || gen_random_uuid();

-- AlterTable
ALTER TABLE "subscriptions" ALTER COLUMN "id" SET DEFAULT 'subscription_' || gen_random_uuid();

-- AlterTable
ALTER TABLE "timelines" ALTER COLUMN "id" SET DEFAULT 'timeline_' || gen_random_uuid();

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT 'user_' || gen_random_uuid();

-- AddForeignKey
ALTER TABLE "solved_timeline_metrics" ADD CONSTRAINT "solved_timeline_metrics_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "days"("id") ON DELETE SET NULL ON UPDATE CASCADE;
