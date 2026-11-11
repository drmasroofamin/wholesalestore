-- Initial PostgreSQL schema. Derived from the validated Prisma datamodel.

CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'RETAILER', 'ADMIN', 'ORDER_MANAGER', 'INVENTORY_MANAGER', 'DELIVERY_MANAGER', 'ACCOUNTANT', 'DELIVERY_PARTNER');

CREATE TYPE "OrderStatus" AS ENUM ('PLACED', 'CONFIRMED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');

CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'PARTIALLY_PAID', 'REFUNDED', 'CREDIT_DUE', 'COD_PENDING', 'COD_COLLECTED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "phone" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
  "blocked" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "User_phone_key" ON "User" ("phone");

CREATE TABLE "Retailer" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "businessName" TEXT NOT NULL,
  "gstin" TEXT,
  "panEncrypted" TEXT,
  "kycObjectKey" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "creditLimit" INTEGER NOT NULL DEFAULT 0,
  "creditDays" INTEGER NOT NULL DEFAULT 7,
  "priceListId" TEXT
);

CREATE UNIQUE INDEX "Retailer_userId_key" ON "Retailer" ("userId");

CREATE TABLE "Address" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "label" TEXT NOT NULL DEFAULT 'Home',
  "line" TEXT NOT NULL,
  "pincode" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION
);

CREATE TABLE "Category" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL
);

CREATE UNIQUE INDEX "Category_name_key" ON "Category" ("name");

CREATE TABLE "Product" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "hindi" TEXT,
  "categoryId" TEXT NOT NULL,
  "description" TEXT,
  "image" TEXT NOT NULL,
  "hsn" TEXT NOT NULL,
  "gst" INTEGER NOT NULL DEFAULT 5,
  "active" BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX "Product_categoryId_active_idx" ON "Product" ("categoryId","active");

CREATE TABLE "ProductVariant" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "productId" TEXT NOT NULL,
  "pack" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "mrp" INTEGER NOT NULL,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "reserved" INTEGER NOT NULL DEFAULT 0,
  "lowStockThreshold" INTEGER NOT NULL DEFAULT 10
);

CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant" ("productId");

CREATE TABLE "PriceTier" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "variantId" TEXT NOT NULL,
  "minimum" INTEGER NOT NULL,
  "price" INTEGER NOT NULL
);

CREATE UNIQUE INDEX "PriceTier_variantId_minimum_key" ON "PriceTier" ("variantId","minimum");

CREATE TABLE "RetailerPrice" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "retailerId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "price" INTEGER NOT NULL
);

CREATE UNIQUE INDEX "RetailerPrice_retailerId_variantId_key" ON "RetailerPrice" ("retailerId","variantId");

CREATE TABLE "StockMovement" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "variantId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "batch" TEXT,
  "orderId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "StockMovement_variantId_createdAt_idx" ON "StockMovement" ("variantId","createdAt");

CREATE TABLE "Cart" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "items" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "Cart_userId_key" ON "Cart" ("userId");

CREATE TABLE "Order" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "idempotencyKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "userId" TEXT,
  "customerName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "pincode" TEXT NOT NULL,
  "slot" TEXT NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'PLACED',
  "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "method" TEXT NOT NULL,
  "subtotal" INTEGER NOT NULL,
  "discount" INTEGER NOT NULL DEFAULT 0,
  "deliveryFee" INTEGER NOT NULL,
  "total" INTEGER NOT NULL,
  "tax" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order" ("idempotencyKey");

CREATE INDEX "Order_createdAt_idx" ON "Order" ("createdAt");

CREATE INDEX "Order_status_createdAt_idx" ON "Order" ("status","createdAt");

CREATE INDEX "Order_phone_createdAt_idx" ON "Order" ("phone","createdAt");

CREATE INDEX "Order_paymentStatus_expiresAt_idx" ON "Order" ("paymentStatus","expiresAt");

CREATE TABLE "OrderItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "pack" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "price" INTEGER NOT NULL,
  "total" INTEGER NOT NULL,
  "gst" INTEGER NOT NULL,
  "hsn" TEXT NOT NULL
);

CREATE TABLE "OrderStatusHistory" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "status" "OrderStatus" NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "gatewayOrderId" TEXT NOT NULL,
  "gatewayPaymentId" TEXT,
  "amount" INTEGER NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Payment_gatewayOrderId_key" ON "Payment" ("gatewayOrderId");

CREATE UNIQUE INDEX "Payment_gatewayPaymentId_key" ON "Payment" ("gatewayPaymentId");

CREATE TABLE "PaymentTransaction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "paymentId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "PaymentTransaction_eventId_key" ON "PaymentTransaction" ("eventId");

CREATE TABLE "Refund" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "paymentId" TEXT NOT NULL,
  "gatewayId" TEXT,
  "amount" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Refund_gatewayId_key" ON "Refund" ("gatewayId");

CREATE TABLE "Wallet" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "balance" INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet" ("userId");

CREATE TABLE "WalletTransaction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "walletId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "reference" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "WalletTransaction_reference_key" ON "WalletTransaction" ("reference");

CREATE TABLE "CreditLedger" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "retailerId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "reference" TEXT NOT NULL,
  "dueAt" TIMESTAMP(3),
  "settled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "CreditLedger_reference_key" ON "CreditLedger" ("reference");

CREATE INDEX "CreditLedger_retailerId_settled_dueAt_idx" ON "CreditLedger" ("retailerId","settled","dueAt");

CREATE TABLE "Coupon" (
  "code" TEXT NOT NULL PRIMARY KEY,
  "percent" INTEGER NOT NULL,
  "maximum" INTEGER NOT NULL,
  "minimum" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE "DeliveryZone" (
  "pincode" TEXT NOT NULL PRIMARY KEY,
  "fee" INTEGER NOT NULL,
  "freeAbove" INTEGER NOT NULL,
  "codLimit" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE "DeliverySlot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "cutoffAt" TIMESTAMP(3) NOT NULL,
  "capacity" INTEGER NOT NULL,
  "booked" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE "DeliveryAssignment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "cashCollected" INTEGER NOT NULL DEFAULT 0,
  "deliveredAt" TIMESTAMP(3)
);

CREATE UNIQUE INDEX "DeliveryAssignment_orderId_key" ON "DeliveryAssignment" ("orderId");

CREATE TABLE "Invoice" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "objectKey" TEXT,
  "gstin" TEXT,
  "ewayBill" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Invoice_orderId_key" ON "Invoice" ("orderId");

CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice" ("number");

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Review" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "text" TEXT
);

CREATE UNIQUE INDEX "Review_userId_productId_key" ON "Review" ("userId","productId");

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog" ("actorId","createdAt");

CREATE TABLE "Setting" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "value" JSONB NOT NULL
);

CREATE TABLE "StandingOrder" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "retailerId" TEXT NOT NULL,
  "items" JSONB NOT NULL,
  "schedule" TEXT NOT NULL,
  "nextRunAt" TIMESTAMP(3) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX "StandingOrder_active_nextRunAt_idx" ON "StandingOrder" ("active","nextRunAt");

ALTER TABLE "Retailer" ADD CONSTRAINT "Retailer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PriceTier" ADD CONSTRAINT "PriceTier_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RetailerPrice" ADD CONSTRAINT "RetailerPrice_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RetailerPrice" ADD CONSTRAINT "RetailerPrice_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CreditLedger" ADD CONSTRAINT "CreditLedger_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DeliveryAssignment" ADD CONSTRAINT "DeliveryAssignment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductVariant" ADD CONSTRAINT "valid_stock" CHECK (stock >= 0 AND reserved >= 0 AND reserved <= stock);

ALTER TABLE "ProductVariant" ADD CONSTRAINT "valid_prices" CHECK (price >= 0 AND mrp >= price);

ALTER TABLE "OrderItem" ADD CONSTRAINT "valid_order_quantity" CHECK (quantity > 0 AND price >= 0 AND total >= 0);

ALTER TABLE "Order" ADD CONSTRAINT "valid_order_total" CHECK (total >= 0 AND subtotal >= 0 AND discount >= 0 AND "deliveryFee" >= 0);

ALTER TABLE "Review" ADD CONSTRAINT "valid_rating" CHECK (rating BETWEEN 1 AND 5);
