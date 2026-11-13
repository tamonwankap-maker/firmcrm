-- CreateIndex
CREATE INDEX "Organisation_nameKey_trgm" ON "Organisation" USING GIN ("nameKey" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Organisation_nameThKey_trgm" ON "Organisation" USING GIN ("nameThKey" gin_trgm_ops);
