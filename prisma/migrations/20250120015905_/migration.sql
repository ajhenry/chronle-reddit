/*
  Warnings:

  - You are about to drop the column `description` on the `attempts` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `attempts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "attempts" DROP COLUMN "description",
DROP COLUMN "title",
ADD COLUMN     "solution" TEXT[],
ALTER COLUMN "id" SET DEFAULT 'attempt_' || gen_random_uuid();

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
