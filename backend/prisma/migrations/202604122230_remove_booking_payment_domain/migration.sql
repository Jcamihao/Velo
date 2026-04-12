ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_bookingId_fkey";
DROP INDEX IF EXISTS "Review_bookingId_key";
ALTER TABLE "Review" DROP COLUMN IF EXISTS "bookingId";

ALTER TABLE "UserReview" DROP CONSTRAINT IF EXISTS "UserReview_bookingId_fkey";
DROP INDEX IF EXISTS "UserReview_bookingId_key";
ALTER TABLE "UserReview" DROP COLUMN IF EXISTS "bookingId";

DROP TABLE IF EXISTS "Payment";
DROP TABLE IF EXISTS "BookingChecklist";
DROP TABLE IF EXISTS "BookingStatusHistory";
DROP TABLE IF EXISTS "Booking";
DROP TABLE IF EXISTS "VehicleAvailability";
DROP TABLE IF EXISTS "VehicleBlockedDate";

ALTER TABLE "Vehicle"
  DROP COLUMN IF EXISTS "bookingApprovalMode",
  DROP COLUMN IF EXISTS "cancellationPolicy",
  DROP COLUMN IF EXISTS "addons",
  DROP COLUMN IF EXISTS "firstBookingDiscountPercent",
  DROP COLUMN IF EXISTS "weeklyDiscountPercent",
  DROP COLUMN IF EXISTS "couponCode",
  DROP COLUMN IF EXISTS "couponDiscountPercent",
  DROP COLUMN IF EXISTS "weekendSurchargePercent",
  DROP COLUMN IF EXISTS "holidaySurchargePercent",
  DROP COLUMN IF EXISTS "highDemandSurchargePercent",
  DROP COLUMN IF EXISTS "advanceBookingDiscountPercent",
  DROP COLUMN IF EXISTS "advanceBookingDaysThreshold";

CREATE TYPE "NotificationType_new" AS ENUM ('REVIEW_CREATED', 'CHAT_MESSAGE', 'SYSTEM_ALERT');
ALTER TABLE "Notification"
  ALTER COLUMN "type" TYPE "NotificationType_new"
  USING (
    CASE
      WHEN "type"::text IN ('REVIEW_CREATED', 'CHAT_MESSAGE', 'SYSTEM_ALERT') THEN "type"::text
      ELSE 'SYSTEM_ALERT'
    END
  )::"NotificationType_new";
DROP TYPE "NotificationType";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";

DROP TYPE IF EXISTS "BookingApprovalMode";
DROP TYPE IF EXISTS "CancellationPolicy";
DROP TYPE IF EXISTS "BookingChecklistType";
DROP TYPE IF EXISTS "BookingStatus";
DROP TYPE IF EXISTS "PaymentMethod";
DROP TYPE IF EXISTS "PaymentStatus";
