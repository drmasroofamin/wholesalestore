-- Additive migration: existing users, addresses, orders and inventory are kept.
ALTER TABLE "User" ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3);
ALTER TABLE "Address" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Address" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Address" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "Address_userId_isDefault_idx" ON "Address" ("userId","isDefault");
CREATE UNIQUE INDEX "Address_one_default_per_user" ON "Address" ("userId") WHERE "isDefault"=true;
CREATE TABLE "CustomerSession" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "tokenHash" TEXT NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "CustomerSession_tokenHash_key" ON "CustomerSession" ("tokenHash");
CREATE INDEX "CustomerSession_userId_idx" ON "CustomerSession" ("userId");
CREATE INDEX "CustomerSession_expiresAt_idx" ON "CustomerSession" ("expiresAt");
CREATE INDEX "Order_userId_createdAt_idx" ON "Order" ("userId","createdAt");
