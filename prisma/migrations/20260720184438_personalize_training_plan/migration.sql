-- AlterTable
ALTER TABLE "TrainingPlan"
  ADD COLUMN     "minMinutesPerSession" INTEGER,
  ADD COLUMN     "trainingDays" INTEGER[] NOT NULL DEFAULT '{}';

-- Backfill existing rows from the column it replaces before dropping it.
UPDATE "TrainingPlan" SET "minMinutesPerSession" = "minutesPerDay" WHERE "minMinutesPerSession" IS NULL;

ALTER TABLE "TrainingPlan"
  ALTER COLUMN "minMinutesPerSession" SET NOT NULL,
  DROP COLUMN "minutesPerDay";
