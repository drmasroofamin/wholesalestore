-- A single internal order must have only one active gateway order association.
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment" ("orderId");
ALTER TABLE "DeliverySlot" ADD CONSTRAINT "valid_slot_capacity" CHECK (capacity >= 0 AND booked >= 0 AND booked <= capacity AND "startsAt" < "endsAt" AND "cutoffAt" <= "startsAt");
ALTER TABLE "DeliveryZone" ADD CONSTRAINT "valid_zone_fees" CHECK (fee >= 0 AND "freeAbove" >= 0 AND "codLimit" >= 0);
ALTER TABLE "Coupon" ADD CONSTRAINT "valid_coupon_values" CHECK (percent BETWEEN 0 AND 100 AND maximum >= 0 AND minimum >= 0);
