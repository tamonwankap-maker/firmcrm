-- Phase 2: duplicate-detection keys and next-action completion.
-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "nameKey" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Organisation" ADD COLUMN     "nameKey" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "nameThKey" TEXT;

-- CreateIndex
CREATE INDEX "Contact_nameKey_idx" ON "Contact"("nameKey");

-- CreateIndex
CREATE INDEX "Organisation_nameKey_idx" ON "Organisation"("nameKey");

-- CreateIndex
CREATE INDEX "Organisation_nameThKey_idx" ON "Organisation"("nameThKey");
