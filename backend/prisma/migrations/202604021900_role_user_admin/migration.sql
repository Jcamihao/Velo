ALTER TYPE "Role" RENAME TO "Role_old";

CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

ALTER TABLE "User"
ALTER COLUMN "role" TYPE "Role"
USING (
  CASE
    WHEN "role"::text IN ('OWNER', 'RENTER') THEN 'USER'
    ELSE "role"::text
  END
)::"Role";

DROP TYPE "Role_old";
