CREATE TYPE "BookingChecklistType" AS ENUM ('PICKUP', 'RETURN');

CREATE TABLE "BookingChecklist" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "type" "BookingChecklistType" NOT NULL,
  "items" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "notes" TEXT,
  "photos" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "completedAt" TIMESTAMP(3),
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BookingChecklist_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookingChecklist_bookingId_type_key"
ON "BookingChecklist"("bookingId", "type");

CREATE INDEX "BookingChecklist_bookingId_updatedAt_idx"
ON "BookingChecklist"("bookingId", "updatedAt");

ALTER TABLE "BookingChecklist"
ADD CONSTRAINT "BookingChecklist_bookingId_fkey"
FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
