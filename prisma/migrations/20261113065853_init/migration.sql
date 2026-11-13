-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'BD', 'PARTNER', 'VIEWER');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('THB', 'USD');

-- CreateEnum
CREATE TYPE "OrganisationType" AS ENUM ('CLIENT', 'PROSPECT', 'REFERRER', 'FOREIGN_LAW_FIRM', 'INTERMEDIARY', 'MEDIA', 'DIRECTORY', 'ASSOCIATION');

-- CreateEnum
CREATE TYPE "OrganisationStatus" AS ENUM ('ACTIVE', 'DORMANT', 'LOST');

-- CreateEnum
CREATE TYPE "PreferredLanguage" AS ENUM ('EN', 'TH', 'OTHER');

-- CreateEnum
CREATE TYPE "MailingList" AS ENUM ('NEWSLETTER', 'CLIENT_ALERTS', 'EVENT_INVITES');

-- CreateEnum
CREATE TYPE "ConsentSource" AS ENUM ('WEB_FORM', 'EVENT_SIGNUP', 'EMAIL_REPLY', 'VERBAL', 'BUSINESS_CARD', 'IMPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('MEETING', 'CALL', 'LUNCH', 'EMAIL', 'EVENT', 'REFERRAL_GIVEN', 'REFERRAL_RECEIVED', 'GIFT');

-- CreateEnum
CREATE TYPE "OpportunitySource" AS ENUM ('REPEAT_CLIENT', 'REFERRAL', 'FOREIGN_LAW_FIRM_REFERRAL', 'RFP_TENDER', 'EVENT', 'INBOUND', 'OTHER');

-- CreateEnum
CREATE TYPE "OpportunityStage" AS ENUM ('LEAD', 'QUALIFIED', 'PROPOSAL_PREPARING', 'SUBMITTED', 'WON', 'LOST', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "ConflictStatus" AS ENUM ('NOT_REQUESTED', 'REQUESTED', 'CLEARED', 'CONFLICT');

-- CreateEnum
CREATE TYPE "OutcomeReason" AS ENUM ('PRICE', 'RELATIONSHIP', 'EXPERTISE', 'CONFLICT', 'TIMING', 'OTHER');

-- CreateEnum
CREATE TYPE "PitchFormat" AS ENUM ('WRITTEN', 'PRESENTATION', 'BOTH', 'EMAIL');

-- CreateEnum
CREATE TYPE "PitchStatus" AS ENUM ('DRAFTING', 'PARTNER_REVIEW', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PLANNING', 'DRAFTING', 'PARTNER_REVIEW', 'SUBMITTED', 'RESEARCH_INTERVIEW', 'RESULTS_PUBLISHED');

-- CreateEnum
CREATE TYPE "AwardStatus" AS ENUM ('ENTERED', 'SHORTLISTED', 'WON', 'NOT_WON');

-- CreateEnum
CREATE TYPE "EventFormat" AS ENUM ('IN_PERSON', 'ONLINE', 'HYBRID');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PLANNING', 'INVITES_SENT', 'HELD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Rsvp" AS ENUM ('NO_REPLY', 'YES', 'NO', 'MAYBE');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('CLIENT_ALERT', 'ARTICLE', 'GUIDE', 'LINKEDIN_POST', 'MEDIA_INTERVIEW', 'SPEAKING');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('IDEA', 'DRAFTING', 'REVIEW', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'ARCHIVE', 'RESTORE', 'LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'EXPORT', 'PASSWORD_RESET');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "title" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "canLogin" BOOLEAN NOT NULL DEFAULT true,
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeArea" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PracticeArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Industry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Industry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameTh" TEXT,
    "type" "OrganisationType" NOT NULL,
    "industryId" TEXT,
    "country" CHAR(2) NOT NULL DEFAULT 'TH',
    "relationshipPartnerId" TEXT,
    "status" "OrganisationStatus" NOT NULL DEFAULT 'ACTIVE',
    "isKeyClient" BOOLEAN NOT NULL DEFAULT false,
    "website" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameTh" TEXT,
    "title" TEXT,
    "organisationId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "linkedinUrl" TEXT,
    "relationshipStrength" SMALLINT NOT NULL DEFAULT 3,
    "preferredLanguage" "PreferredLanguage" NOT NULL DEFAULT 'EN',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailingConsent" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "list" "MailingList" NOT NULL,
    "optedIn" BOOLEAN NOT NULL,
    "consentDate" DATE NOT NULL,
    "withdrawnDate" DATE,
    "source" "ConsentSource" NOT NULL,
    "evidenceNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailingConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "date" DATE NOT NULL,
    "organisationId" TEXT,
    "opportunityId" TEXT,
    "summary" TEXT NOT NULL,
    "nextAction" TEXT,
    "nextActionDue" DATE,
    "ownerId" TEXT NOT NULL,
    "giftValue" DECIMAL(14,2),
    "giftCurrency" "Currency",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "source" "OpportunitySource" NOT NULL,
    "referrerOrgId" TEXT,
    "referrerContactId" TEXT,
    "leadPartnerId" TEXT NOT NULL,
    "feeEstimateMin" DECIMAL(14,2),
    "feeEstimateMax" DECIMAL(14,2),
    "currency" "Currency" NOT NULL DEFAULT 'THB',
    "probability" SMALLINT NOT NULL DEFAULT 10,
    "stage" "OpportunityStage" NOT NULL DEFAULT 'LEAD',
    "conflictStatus" "ConflictStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
    "expectedDecisionDate" DATE,
    "competitors" TEXT[],
    "confidential" BOOLEAN NOT NULL DEFAULT false,
    "outcome" TEXT,
    "outcomeReason" "OutcomeReason",
    "closedDate" DATE,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityStageChange" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "fromStage" "OpportunityStage",
    "toStage" "OpportunityStage" NOT NULL,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityStageChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pitch" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,
    "format" "PitchFormat" NOT NULL DEFAULT 'WRITTEN',
    "status" "PitchStatus" NOT NULL DEFAULT 'DRAFTING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Pitch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PitchChecklistItem" (
    "id" TEXT NOT NULL,
    "pitchId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PitchChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Directory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Directory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectorySubmission" (
    "id" TEXT NOT NULL,
    "directoryId" TEXT NOT NULL,
    "year" SMALLINT NOT NULL,
    "practiceAreaId" TEXT NOT NULL,
    "deadline" DATE,
    "ownerId" TEXT NOT NULL,
    "partnerReviewerId" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PLANNING',
    "resultTier" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "DirectorySubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referee" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "briefed" BOOLEAN NOT NULL DEFAULT false,
    "briefedDate" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepresentativeMatter" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "clientOrganisationId" TEXT,
    "clientDisplayName" TEXT,
    "anonymised" BOOLEAN NOT NULL DEFAULT false,
    "value" DECIMAL(16,2),
    "currency" "Currency" NOT NULL DEFAULT 'THB',
    "year" SMALLINT NOT NULL,
    "publishable" BOOLEAN NOT NULL DEFAULT false,
    "confidential" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "RepresentativeMatter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Award" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organiser" TEXT,
    "category" TEXT NOT NULL,
    "year" SMALLINT NOT NULL,
    "deadline" DATE,
    "ownerId" TEXT,
    "status" "AwardStatus" NOT NULL DEFAULT 'ENTERED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Award_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "format" "EventFormat" NOT NULL DEFAULT 'IN_PERSON',
    "venue" TEXT,
    "onlineUrl" TEXT,
    "externalSpeakers" TEXT,
    "budget" DECIMAL(14,2),
    "actualCost" DECIMAL(14,2),
    "currency" "Currency" NOT NULL DEFAULT 'THB',
    "status" "EventStatus" NOT NULL DEFAULT 'PLANNING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventInvite" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "invited" BOOLEAN NOT NULL DEFAULT false,
    "invitedAt" TIMESTAMP(3),
    "rsvp" "Rsvp" NOT NULL DEFAULT 'NO_REPLY',
    "attended" BOOLEAN,
    "followUpOwnerId" TEXT,
    "followUpDone" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EventInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Content" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "channel" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'IDEA',
    "publishDate" DATE,
    "url" TEXT,
    "engagementNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPlan" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "year" SMALLINT NOT NULL,
    "objectives" TEXT NOT NULL,
    "reviewMeetingDate" DATE,
    "healthScore" SMALLINT NOT NULL DEFAULT 3,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "ClientPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" DATE,
    "ownerId" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "opportunityId" TEXT,
    "organisationId" TEXT,
    "contactId" TEXT,
    "pitchId" TEXT,
    "submissionId" TEXT,
    "eventId" TEXT,
    "contentId" TEXT,
    "clientPlanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "diff" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ip" TEXT,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "_UserPracticeAreas" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserPracticeAreas_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_MatterPracticeAreas" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MatterPracticeAreas_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ContactOwners" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ContactOwners_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ContactTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ContactTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ActivityAttendees" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ActivityAttendees_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ActivityContacts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ActivityContacts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ActivityPracticeAreas" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ActivityPracticeAreas_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_OpportunityPracticeAreas" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OpportunityPracticeAreas_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_OpportunityTeam" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OpportunityTeam_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_SubmissionRankedLawyers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SubmissionRankedLawyers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_SubmissionMatters" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SubmissionMatters_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_MatterTeam" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MatterTeam_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AwardPracticeAreas" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AwardPracticeAreas_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_EventPracticeAreas" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EventPracticeAreas_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_EventSpeakers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EventSpeakers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ContentAuthors" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ContentAuthors_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ContentPracticeAreas" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ContentPracticeAreas_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ClientPlanCrossSell" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ClientPlanCrossSell_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeArea_name_key" ON "PracticeArea"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Industry_name_key" ON "Industry"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "Organisation_type_status_idx" ON "Organisation"("type", "status");

-- CreateIndex
CREATE INDEX "Organisation_relationshipPartnerId_idx" ON "Organisation"("relationshipPartnerId");

-- CreateIndex
CREATE INDEX "Contact_organisationId_idx" ON "Contact"("organisationId");

-- CreateIndex
CREATE INDEX "Contact_email_idx" ON "Contact"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MailingConsent_contactId_list_key" ON "MailingConsent"("contactId", "list");

-- CreateIndex
CREATE INDEX "Activity_date_idx" ON "Activity"("date");

-- CreateIndex
CREATE INDEX "Activity_ownerId_nextActionDue_idx" ON "Activity"("ownerId", "nextActionDue");

-- CreateIndex
CREATE INDEX "Activity_organisationId_idx" ON "Activity"("organisationId");

-- CreateIndex
CREATE INDEX "Opportunity_stage_idx" ON "Opportunity"("stage");

-- CreateIndex
CREATE INDEX "Opportunity_leadPartnerId_idx" ON "Opportunity"("leadPartnerId");

-- CreateIndex
CREATE INDEX "Opportunity_organisationId_idx" ON "Opportunity"("organisationId");

-- CreateIndex
CREATE INDEX "OpportunityStageChange_opportunityId_changedAt_idx" ON "OpportunityStageChange"("opportunityId", "changedAt");

-- CreateIndex
CREATE INDEX "Pitch_deadline_idx" ON "Pitch"("deadline");

-- CreateIndex
CREATE UNIQUE INDEX "Directory_name_key" ON "Directory"("name");

-- CreateIndex
CREATE INDEX "DirectorySubmission_deadline_idx" ON "DirectorySubmission"("deadline");

-- CreateIndex
CREATE UNIQUE INDEX "DirectorySubmission_directoryId_year_practiceAreaId_key" ON "DirectorySubmission"("directoryId", "year", "practiceAreaId");

-- CreateIndex
CREATE UNIQUE INDEX "Referee_contactId_submissionId_key" ON "Referee"("contactId", "submissionId");

-- CreateIndex
CREATE INDEX "RepresentativeMatter_year_idx" ON "RepresentativeMatter"("year");

-- CreateIndex
CREATE INDEX "Event_startsAt_idx" ON "Event"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventInvite_eventId_contactId_key" ON "EventInvite"("eventId", "contactId");

-- CreateIndex
CREATE INDEX "Content_status_publishDate_idx" ON "Content"("status", "publishDate");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPlan_organisationId_year_key" ON "ClientPlan"("organisationId", "year");

-- CreateIndex
CREATE INDEX "Task_ownerId_status_dueDate_idx" ON "Task"("ownerId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_email_createdAt_idx" ON "LoginAttempt"("email", "createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_ip_createdAt_idx" ON "LoginAttempt"("ip", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "_UserPracticeAreas_B_index" ON "_UserPracticeAreas"("B");

-- CreateIndex
CREATE INDEX "_MatterPracticeAreas_B_index" ON "_MatterPracticeAreas"("B");

-- CreateIndex
CREATE INDEX "_ContactOwners_B_index" ON "_ContactOwners"("B");

-- CreateIndex
CREATE INDEX "_ContactTags_B_index" ON "_ContactTags"("B");

-- CreateIndex
CREATE INDEX "_ActivityAttendees_B_index" ON "_ActivityAttendees"("B");

-- CreateIndex
CREATE INDEX "_ActivityContacts_B_index" ON "_ActivityContacts"("B");

-- CreateIndex
CREATE INDEX "_ActivityPracticeAreas_B_index" ON "_ActivityPracticeAreas"("B");

-- CreateIndex
CREATE INDEX "_OpportunityPracticeAreas_B_index" ON "_OpportunityPracticeAreas"("B");

-- CreateIndex
CREATE INDEX "_OpportunityTeam_B_index" ON "_OpportunityTeam"("B");

-- CreateIndex
CREATE INDEX "_SubmissionRankedLawyers_B_index" ON "_SubmissionRankedLawyers"("B");

-- CreateIndex
CREATE INDEX "_SubmissionMatters_B_index" ON "_SubmissionMatters"("B");

-- CreateIndex
CREATE INDEX "_MatterTeam_B_index" ON "_MatterTeam"("B");

-- CreateIndex
CREATE INDEX "_AwardPracticeAreas_B_index" ON "_AwardPracticeAreas"("B");

-- CreateIndex
CREATE INDEX "_EventPracticeAreas_B_index" ON "_EventPracticeAreas"("B");

-- CreateIndex
CREATE INDEX "_EventSpeakers_B_index" ON "_EventSpeakers"("B");

-- CreateIndex
CREATE INDEX "_ContentAuthors_B_index" ON "_ContentAuthors"("B");

-- CreateIndex
CREATE INDEX "_ContentPracticeAreas_B_index" ON "_ContentPracticeAreas"("B");

-- CreateIndex
CREATE INDEX "_ClientPlanCrossSell_B_index" ON "_ClientPlanCrossSell"("B");

-- AddForeignKey
ALTER TABLE "Organisation" ADD CONSTRAINT "Organisation_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organisation" ADD CONSTRAINT "Organisation_relationshipPartnerId_fkey" FOREIGN KEY ("relationshipPartnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organisation" ADD CONSTRAINT "Organisation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailingConsent" ADD CONSTRAINT "MailingConsent_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_referrerOrgId_fkey" FOREIGN KEY ("referrerOrgId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_referrerContactId_fkey" FOREIGN KEY ("referrerContactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_leadPartnerId_fkey" FOREIGN KEY ("leadPartnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityStageChange" ADD CONSTRAINT "OpportunityStageChange_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityStageChange" ADD CONSTRAINT "OpportunityStageChange_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pitch" ADD CONSTRAINT "Pitch_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pitch" ADD CONSTRAINT "Pitch_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PitchChecklistItem" ADD CONSTRAINT "PitchChecklistItem_pitchId_fkey" FOREIGN KEY ("pitchId") REFERENCES "Pitch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectorySubmission" ADD CONSTRAINT "DirectorySubmission_directoryId_fkey" FOREIGN KEY ("directoryId") REFERENCES "Directory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectorySubmission" ADD CONSTRAINT "DirectorySubmission_practiceAreaId_fkey" FOREIGN KEY ("practiceAreaId") REFERENCES "PracticeArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectorySubmission" ADD CONSTRAINT "DirectorySubmission_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectorySubmission" ADD CONSTRAINT "DirectorySubmission_partnerReviewerId_fkey" FOREIGN KEY ("partnerReviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referee" ADD CONSTRAINT "Referee_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referee" ADD CONSTRAINT "Referee_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "DirectorySubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepresentativeMatter" ADD CONSTRAINT "RepresentativeMatter_clientOrganisationId_fkey" FOREIGN KEY ("clientOrganisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Award" ADD CONSTRAINT "Award_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInvite" ADD CONSTRAINT "EventInvite_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInvite" ADD CONSTRAINT "EventInvite_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInvite" ADD CONSTRAINT "EventInvite_followUpOwnerId_fkey" FOREIGN KEY ("followUpOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPlan" ADD CONSTRAINT "ClientPlan_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPlan" ADD CONSTRAINT "ClientPlan_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_pitchId_fkey" FOREIGN KEY ("pitchId") REFERENCES "Pitch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "DirectorySubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_clientPlanId_fkey" FOREIGN KEY ("clientPlanId") REFERENCES "ClientPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserPracticeAreas" ADD CONSTRAINT "_UserPracticeAreas_A_fkey" FOREIGN KEY ("A") REFERENCES "PracticeArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserPracticeAreas" ADD CONSTRAINT "_UserPracticeAreas_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MatterPracticeAreas" ADD CONSTRAINT "_MatterPracticeAreas_A_fkey" FOREIGN KEY ("A") REFERENCES "PracticeArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MatterPracticeAreas" ADD CONSTRAINT "_MatterPracticeAreas_B_fkey" FOREIGN KEY ("B") REFERENCES "RepresentativeMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContactOwners" ADD CONSTRAINT "_ContactOwners_A_fkey" FOREIGN KEY ("A") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContactOwners" ADD CONSTRAINT "_ContactOwners_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContactTags" ADD CONSTRAINT "_ContactTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContactTags" ADD CONSTRAINT "_ContactTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActivityAttendees" ADD CONSTRAINT "_ActivityAttendees_A_fkey" FOREIGN KEY ("A") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActivityAttendees" ADD CONSTRAINT "_ActivityAttendees_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActivityContacts" ADD CONSTRAINT "_ActivityContacts_A_fkey" FOREIGN KEY ("A") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActivityContacts" ADD CONSTRAINT "_ActivityContacts_B_fkey" FOREIGN KEY ("B") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActivityPracticeAreas" ADD CONSTRAINT "_ActivityPracticeAreas_A_fkey" FOREIGN KEY ("A") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActivityPracticeAreas" ADD CONSTRAINT "_ActivityPracticeAreas_B_fkey" FOREIGN KEY ("B") REFERENCES "PracticeArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OpportunityPracticeAreas" ADD CONSTRAINT "_OpportunityPracticeAreas_A_fkey" FOREIGN KEY ("A") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OpportunityPracticeAreas" ADD CONSTRAINT "_OpportunityPracticeAreas_B_fkey" FOREIGN KEY ("B") REFERENCES "PracticeArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OpportunityTeam" ADD CONSTRAINT "_OpportunityTeam_A_fkey" FOREIGN KEY ("A") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OpportunityTeam" ADD CONSTRAINT "_OpportunityTeam_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SubmissionRankedLawyers" ADD CONSTRAINT "_SubmissionRankedLawyers_A_fkey" FOREIGN KEY ("A") REFERENCES "DirectorySubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SubmissionRankedLawyers" ADD CONSTRAINT "_SubmissionRankedLawyers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SubmissionMatters" ADD CONSTRAINT "_SubmissionMatters_A_fkey" FOREIGN KEY ("A") REFERENCES "DirectorySubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SubmissionMatters" ADD CONSTRAINT "_SubmissionMatters_B_fkey" FOREIGN KEY ("B") REFERENCES "RepresentativeMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MatterTeam" ADD CONSTRAINT "_MatterTeam_A_fkey" FOREIGN KEY ("A") REFERENCES "RepresentativeMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MatterTeam" ADD CONSTRAINT "_MatterTeam_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AwardPracticeAreas" ADD CONSTRAINT "_AwardPracticeAreas_A_fkey" FOREIGN KEY ("A") REFERENCES "Award"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AwardPracticeAreas" ADD CONSTRAINT "_AwardPracticeAreas_B_fkey" FOREIGN KEY ("B") REFERENCES "PracticeArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventPracticeAreas" ADD CONSTRAINT "_EventPracticeAreas_A_fkey" FOREIGN KEY ("A") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventPracticeAreas" ADD CONSTRAINT "_EventPracticeAreas_B_fkey" FOREIGN KEY ("B") REFERENCES "PracticeArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventSpeakers" ADD CONSTRAINT "_EventSpeakers_A_fkey" FOREIGN KEY ("A") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventSpeakers" ADD CONSTRAINT "_EventSpeakers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContentAuthors" ADD CONSTRAINT "_ContentAuthors_A_fkey" FOREIGN KEY ("A") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContentAuthors" ADD CONSTRAINT "_ContentAuthors_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContentPracticeAreas" ADD CONSTRAINT "_ContentPracticeAreas_A_fkey" FOREIGN KEY ("A") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContentPracticeAreas" ADD CONSTRAINT "_ContentPracticeAreas_B_fkey" FOREIGN KEY ("B") REFERENCES "PracticeArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClientPlanCrossSell" ADD CONSTRAINT "_ClientPlanCrossSell_A_fkey" FOREIGN KEY ("A") REFERENCES "ClientPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClientPlanCrossSell" ADD CONSTRAINT "_ClientPlanCrossSell_B_fkey" FOREIGN KEY ("B") REFERENCES "PracticeArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
