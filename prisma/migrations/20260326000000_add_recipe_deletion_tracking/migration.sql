-- CreateTable
CREATE TABLE IF NOT EXISTS "RecipeDeletion" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecipeDeletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RecipeDeletion_userId_deletedAt_idx" ON "RecipeDeletion"("userId", "deletedAt");
