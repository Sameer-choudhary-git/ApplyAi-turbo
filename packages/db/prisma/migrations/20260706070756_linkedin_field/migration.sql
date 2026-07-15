-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isLinkedinEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "linkedin_scrape_queue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "rawData" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "linkedin_scrape_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "linkedin_scrape_queue_userId_processed_idx" ON "linkedin_scrape_queue"("userId", "processed");

-- CreateIndex
CREATE INDEX "linkedin_scrape_queue_userId_type_idx" ON "linkedin_scrape_queue"("userId", "type");
