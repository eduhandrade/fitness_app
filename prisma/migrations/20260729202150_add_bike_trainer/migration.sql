-- AlterEnum
ALTER TYPE "ActivitySource" ADD VALUE 'TRAINER';

-- AlterEnum
ALTER TYPE "Sport" ADD VALUE 'BIKE_TRAINER';

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "maxCadence" DOUBLE PRECISION,
ADD COLUMN     "maxWatts" DOUBLE PRECISION,
ADD COLUMN     "normalizedPower" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "TrainingPlan" ALTER COLUMN "trainingDays" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ActivityStreamSet" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "sampleHz" DOUBLE PRECISION NOT NULL,
    "samples" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityStreamSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActivityStreamSet_activityId_key" ON "ActivityStreamSet"("activityId");

-- AddForeignKey
ALTER TABLE "ActivityStreamSet" ADD CONSTRAINT "ActivityStreamSet_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
