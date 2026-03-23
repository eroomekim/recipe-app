-- CreateTable
CREATE TABLE "ExtractionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExtractionLog_userId_createdAt_idx" ON "ExtractionLog"("userId", "createdAt");
