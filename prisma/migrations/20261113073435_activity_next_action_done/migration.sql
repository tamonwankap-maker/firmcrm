-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "nextActionDone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nextActionDoneAt" TIMESTAMP(3);
