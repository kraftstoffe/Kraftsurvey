-- Run once when upgrading from db-push (pre-audit schema) before `prisma migrate deploy`.
-- Fresh installs should NOT run this — use migrations only.

DO $$ BEGIN
  CREATE TYPE "SurveyStatus" AS ENUM ('DRAFT', 'LIVE', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "QuestionType" AS ENUM (
    'SHORT_TEXT', 'LONG_TEXT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE',
    'SCALE_5', 'SCALE_10', 'YES_NO', 'DROPDOWN'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Survey" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Survey" ALTER COLUMN "status" TYPE "SurveyStatus" USING ("status"::text::"SurveyStatus");
ALTER TABLE "Survey" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "Question" ALTER COLUMN "type" TYPE "QuestionType" USING ("type"::text::"QuestionType");

UPDATE "Response" SET "fingerprint" = 'legacy-' || "id" WHERE "fingerprint" IS NULL;
ALTER TABLE "Response" ALTER COLUMN "fingerprint" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Response_surveyId_fingerprint_key" ON "Response"("surveyId", "fingerprint");
CREATE UNIQUE INDEX IF NOT EXISTS "Answer_responseId_questionId_key" ON "Answer"("responseId", "questionId");
