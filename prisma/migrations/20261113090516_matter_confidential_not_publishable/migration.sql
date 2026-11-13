-- A confidential representative matter can never be marked publishable.
ALTER TABLE "RepresentativeMatter"
  ADD CONSTRAINT "RepresentativeMatter_confidential_not_publishable" CHECK (NOT ("confidential" AND "publishable"));

-- An anonymised matter must carry the description shown instead of the client name.
ALTER TABLE "RepresentativeMatter"
  ADD CONSTRAINT "RepresentativeMatter_anonymised_needs_display_name"
    CHECK (NOT "anonymised" OR ("clientDisplayName" IS NOT NULL AND length(trim("clientDisplayName")) > 0));

-- Directory years are plausible guide years.
ALTER TABLE "DirectorySubmission"
  ADD CONSTRAINT "DirectorySubmission_year_range" CHECK ("year" BETWEEN 2000 AND 2100);
