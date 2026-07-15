-- AlterTable
ALTER TABLE "user_networking_contacts" ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "user_networking_contacts_userId_pinned_idx" ON "user_networking_contacts"("userId", "pinned");
