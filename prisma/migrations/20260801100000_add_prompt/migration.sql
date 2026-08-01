-- CreateTable
CREATE TABLE "Prompt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Prompt_userId_updatedAt_idx" ON "Prompt"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Prompt_isPublic_updatedAt_idx" ON "Prompt"("isPublic", "updatedAt");

-- CreateIndex
CREATE INDEX "Prompt_userId_isFavorite_updatedAt_idx" ON "Prompt"("userId", "isFavorite", "updatedAt");

-- AddForeignKey
ALTER TABLE "Prompt" ADD CONSTRAINT "Prompt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
