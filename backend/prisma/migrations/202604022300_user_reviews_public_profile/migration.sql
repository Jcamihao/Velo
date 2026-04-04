CREATE TABLE "UserReview" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "targetUserId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserReview_bookingId_key" ON "UserReview"("bookingId");
CREATE INDEX "UserReview_targetUserId_rating_idx" ON "UserReview"("targetUserId", "rating");
CREATE INDEX "UserReview_authorId_createdAt_idx" ON "UserReview"("authorId", "createdAt");

ALTER TABLE "UserReview"
ADD CONSTRAINT "UserReview_bookingId_fkey"
FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "UserReview"
ADD CONSTRAINT "UserReview_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "UserReview"
ADD CONSTRAINT "UserReview_targetUserId_fkey"
FOREIGN KEY ("targetUserId") REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
