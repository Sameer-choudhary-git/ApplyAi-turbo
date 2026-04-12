-- CreateTable
CREATE TABLE "unstop_setup_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unstop_setup_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unstop_setup_tokens_userId_key" ON "unstop_setup_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "unstop_setup_tokens_token_key" ON "unstop_setup_tokens"("token");
