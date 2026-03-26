-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "altitude" TEXT,
ADD COLUMN     "equipment" TEXT[] DEFAULT ARRAY[]::TEXT[];
