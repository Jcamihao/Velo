-- CreateTable
CREATE TABLE "VehicleView" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehicleView_vehicleId_createdAt_idx" ON "VehicleView"("vehicleId", "createdAt");

-- CreateIndex
CREATE INDEX "VehicleView_visitorId_vehicleId_createdAt_idx" ON "VehicleView"("visitorId", "vehicleId", "createdAt");

-- CreateIndex
CREATE INDEX "VehicleView_createdAt_idx" ON "VehicleView"("createdAt");

-- AddForeignKey
ALTER TABLE "VehicleView" ADD CONSTRAINT "VehicleView_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
