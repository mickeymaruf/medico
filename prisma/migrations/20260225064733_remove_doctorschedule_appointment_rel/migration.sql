/*
  Warnings:

  - You are about to drop the column `doctorScheduleId` on the `appointments` table. All the data in the column will be lost.
  - Changed the type of `videoCallingId` on the `appointments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_doctorId_doctorScheduleId_fkey";

-- DropIndex
DROP INDEX "appointments_doctorId_doctorScheduleId_key";

-- DropIndex
DROP INDEX "appointments_doctorScheduleId_idx";

-- AlterTable
ALTER TABLE "appointments" DROP COLUMN "doctorScheduleId",
DROP COLUMN "videoCallingId",
ADD COLUMN     "videoCallingId" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "appointments_videoCallingId_key" ON "appointments"("videoCallingId");

-- CreateIndex
CREATE INDEX "appointments_scheduleId_idx" ON "appointments"("scheduleId");
