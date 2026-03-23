-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "measurementSystem" TEXT NOT NULL DEFAULT 'imperial',
    "maxDisplayImages" INTEGER NOT NULL DEFAULT 8,
    "defaultServings" INTEGER,
    "cookingAutoReadAloud" BOOLEAN NOT NULL DEFAULT false,
    "cookingKeepAwake" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
