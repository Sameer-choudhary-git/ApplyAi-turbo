-- CreateTable
CREATE TABLE "user_networking_contacts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "company" TEXT,
    "email" TEXT,
    "profileUrl" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'LinkedIn',
    "relationships" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'connected',
    "notes" TEXT,
    "referralPotential" BOOLEAN NOT NULL DEFAULT false,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_networking_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_networking_contacts_userId_idx" ON "user_networking_contacts"("userId");

-- CreateIndex
CREATE INDEX "user_networking_contacts_userId_status_idx" ON "user_networking_contacts"("userId", "status");

-- AddForeignKey
ALTER TABLE "user_networking_contacts" ADD CONSTRAINT "user_networking_contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
