-- Hand-written migration: things Prisma's schema language cannot express.

-- ── Thai/English substring search ─────────────────────────────────────────
-- Thai is written without spaces, so word-based full-text search does not work.
-- Trigram GIN indexes make `ILIKE '%term%'` fast for both Thai and English.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "Organisation_nameEn_trgm" ON "Organisation" USING gin ("nameEn" gin_trgm_ops);
CREATE INDEX "Organisation_nameTh_trgm" ON "Organisation" USING gin ("nameTh" gin_trgm_ops);
CREATE INDEX "Contact_nameEn_trgm" ON "Contact" USING gin ("nameEn" gin_trgm_ops);
CREATE INDEX "Contact_nameTh_trgm" ON "Contact" USING gin ("nameTh" gin_trgm_ops);
CREATE INDEX "Contact_email_trgm" ON "Contact" USING gin ("email" gin_trgm_ops);
CREATE INDEX "Opportunity_name_trgm" ON "Opportunity" USING gin ("name" gin_trgm_ops);
CREATE INDEX "RepresentativeMatter_title_trgm" ON "RepresentativeMatter" USING gin ("title" gin_trgm_ops);

-- ── Business-rule check constraints (also validated in Zod) ─────────────
ALTER TABLE "Opportunity"
  ADD CONSTRAINT "Opportunity_probability_range" CHECK ("probability" BETWEEN 0 AND 100),
  ADD CONSTRAINT "Opportunity_fee_min_le_max"
    CHECK ("feeEstimateMin" IS NULL OR "feeEstimateMax" IS NULL OR "feeEstimateMin" <= "feeEstimateMax"),
  ADD CONSTRAINT "Opportunity_fee_non_negative"
    CHECK (COALESCE("feeEstimateMin", 0) >= 0 AND COALESCE("feeEstimateMax", 0) >= 0),
  -- Closing as Won/Lost requires a reason and a closed date.
  ADD CONSTRAINT "Opportunity_closed_requires_reason"
    CHECK ("stage" NOT IN ('WON', 'LOST') OR ("outcomeReason" IS NOT NULL AND "closedDate" IS NOT NULL)),
  -- Cannot be won while a conflict exists.
  ADD CONSTRAINT "Opportunity_no_win_with_conflict"
    CHECK (NOT ("stage" = 'WON' AND "conflictStatus" = 'CONFLICT'));

ALTER TABLE "Contact"
  ADD CONSTRAINT "Contact_relationshipStrength_range" CHECK ("relationshipStrength" BETWEEN 1 AND 5);

ALTER TABLE "ClientPlan"
  ADD CONSTRAINT "ClientPlan_healthScore_range" CHECK ("healthScore" BETWEEN 1 AND 5);

ALTER TABLE "MailingConsent"
  ADD CONSTRAINT "MailingConsent_withdrawn_after_consent"
    CHECK ("withdrawnDate" IS NULL OR "withdrawnDate" >= "consentDate");

ALTER TABLE "Organisation"
  ADD CONSTRAINT "Organisation_country_iso2" CHECK ("country" ~ '^[A-Z]{2}$');

-- A task links to at most one record ("polymorphic" link with real foreign keys).
ALTER TABLE "Task"
  ADD CONSTRAINT "Task_at_most_one_link" CHECK (
    num_nonnulls("opportunityId", "organisationId", "contactId", "pitchId",
                 "submissionId", "eventId", "contentId", "clientPlanId") <= 1
  );

-- ── Audit log is append-only ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION audit_log_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only (% blocked)', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AuditLog_no_update_delete"
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();
