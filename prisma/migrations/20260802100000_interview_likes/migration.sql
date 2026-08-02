-- CreateTable
CREATE TABLE "InterviewLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InterviewLike_interviewId_idx" ON "InterviewLike"("interviewId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewLike_userId_interviewId_key" ON "InterviewLike"("userId", "interviewId");

-- AddForeignKey
ALTER TABLE "InterviewLike" ADD CONSTRAINT "InterviewLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewLike" ADD CONSTRAINT "InterviewLike_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
