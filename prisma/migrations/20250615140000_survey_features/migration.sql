-- Survey settings, team members, response drafts

DO $$ BEGIN
  CREATE TYPE "SurveyMemberRole" AS ENUM ('EDITOR');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Survey" ADD COLUMN IF NOT EXISTS "thankYouTitle" TEXT;
ALTER TABLE "Survey" ADD COLUMN IF NOT EXISTS "thankYouMessage" TEXT;
ALTER TABLE "Survey" ADD COLUMN IF NOT EXISTS "thankYouLinkUrl" TEXT;
ALTER TABLE "Survey" ADD COLUMN IF NOT EXISTS "thankYouLinkLabel" TEXT;
ALTER TABLE "Survey" ADD COLUMN IF NOT EXISTS "closedMessage" TEXT;

CREATE TABLE IF NOT EXISTS "SurveyMember" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "SurveyMemberRole" NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SurveyMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SurveyMember_surveyId_userId_key" ON "SurveyMember"("surveyId", "userId");
CREATE INDEX IF NOT EXISTS "SurveyMember_userId_idx" ON "SurveyMember"("userId");

DO $$ BEGIN
  ALTER TABLE "SurveyMember" ADD CONSTRAINT "SurveyMember_surveyId_fkey"
    FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SurveyMember" ADD CONSTRAINT "SurveyMember_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "SurveyDraft" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "fingerprint" TEXT,
    "answers" TEXT NOT NULL,
    "step" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SurveyDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SurveyDraft_tokenHash_key" ON "SurveyDraft"("tokenHash");
CREATE INDEX IF NOT EXISTS "SurveyDraft_surveyId_idx" ON "SurveyDraft"("surveyId");
CREATE INDEX IF NOT EXISTS "SurveyDraft_expiresAt_idx" ON "SurveyDraft"("expiresAt");

DO $$ BEGIN
  ALTER TABLE "SurveyDraft" ADD CONSTRAINT "SurveyDraft_surveyId_fkey"
    FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
