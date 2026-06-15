-- Idempotent upgrade from db-push (pre-audit) schema to migration-based schema.
-- Safe to run multiple times.

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

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Survey'
      AND column_name = 'status' AND data_type = 'text'
  ) THEN
    ALTER TABLE "Survey" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "Survey" ALTER COLUMN "status" TYPE "SurveyStatus" USING ("status"::text::"SurveyStatus");
    ALTER TABLE "Survey" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Question'
      AND column_name = 'type' AND data_type = 'text'
  ) THEN
    ALTER TABLE "Question" ALTER COLUMN "type" TYPE "QuestionType" USING ("type"::text::"QuestionType");
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Response'
      AND column_name = 'fingerprint' AND is_nullable = 'YES'
  ) THEN
    UPDATE "Response" SET "fingerprint" = 'legacy-' || "id" WHERE "fingerprint" IS NULL;
    ALTER TABLE "Response" ALTER COLUMN "fingerprint" SET NOT NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Response_surveyId_fingerprint_key" ON "Response"("surveyId", "fingerprint");
CREATE UNIQUE INDEX IF NOT EXISTS "Answer_responseId_questionId_key" ON "Answer"("responseId", "questionId");
