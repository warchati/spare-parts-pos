-- AlterTable: Add pointsBalance to Client
ALTER TABLE "Client" ADD COLUMN "pointsBalance" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: Add points fields to Sale
ALTER TABLE "Sale" ADD COLUMN "pointsEarned" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Sale" ADD COLUMN "pointsRedeemed" INTEGER NOT NULL DEFAULT 0;

-- CreateTable: LoyaltyConfig
CREATE TABLE "LoyaltyConfig" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "LoyaltyConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique key for LoyaltyConfig
CREATE UNIQUE INDEX "LoyaltyConfig_key_key" ON "LoyaltyConfig"("key");

-- CreateTable: LoyaltyTransaction
CREATE TABLE "LoyaltyTransaction" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "LoyaltyTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Index for faster client queries
CREATE INDEX "LoyaltyTransaction_clientId_idx" ON "LoyaltyTransaction"("clientId");

-- CreateIndex: Index for sorting by date
CREATE INDEX "LoyaltyTransaction_createdAt_idx" ON "LoyaltyTransaction"("createdAt");

-- AddForeignKey: clientId -> Client
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: createdById -> User
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
