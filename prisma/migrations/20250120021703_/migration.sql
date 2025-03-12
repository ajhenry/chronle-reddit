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

-- CreateTable
CREATE TABLE "day_metrics" (
    "id" TEXT NOT NULL DEFAULT 'stat_' || gen_random_uuid(),
    "stats" JSONB NOT NULL,
    "solvedDays" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "day_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "day_metrics_userId_key" ON "day_metrics"("userId");

-- AddForeignKey
ALTER TABLE "day_metrics" ADD CONSTRAINT "day_metrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
