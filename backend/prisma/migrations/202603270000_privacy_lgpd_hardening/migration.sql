-- CreateEnum
CREATE TYPE "PrivacyRequestType" AS ENUM (
    'ACCESS',
    'PORTABILITY',
    'DELETION',
    'CORRECTION',
    'RESTRICTION',
    'OBJECTION',
    'ANONYMIZATION',
    'REVOCATION'
);

-- CreateEnum
CREATE TYPE "PrivacyRequestStatus" AS ENUM (
    'OPEN',
    'IN_REVIEW',
    'COMPLETED',
    'REJECTED',
    'CANCELLED'
);

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "analyticsConsentGranted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "analyticsConsentUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PrivacyRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PrivacyRequestType" NOT NULL,
    "status" "PrivacyRequestStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PrivacyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrivacyRequest_userId_createdAt_idx" ON "PrivacyRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PrivacyRequest_status_createdAt_idx" ON "PrivacyRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PrivacyRequest_type_createdAt_idx" ON "PrivacyRequest"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "PrivacyRequest"
ADD CONSTRAINT "PrivacyRequest_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
