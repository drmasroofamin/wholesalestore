-- Anantnag district delivery zones for the live store.
--
-- Source: Department of Posts, All India Pincode Directory, Open Government Data
-- Platform India (data.gov.in).
--   Catalog (updated 03/10/2025):
--     https://data.gov.in/catalog/all-india-pincode-directory-through-webservice
--   Resource:
--     https://data.gov.in/resource/all-india-pincode-directory-till-last-month
--     API id 5c2f62fe-5afa-4119-a499-fec9d604d5bd
-- Filter: statename = 'JAMMU AND KASHMIR' AND district = 'ANANTNAG' (exact match,
-- so Anantapur and Thiruvananthapuram are not included). One row per distinct
-- pincode. The same 13 pincodes are in the 16 October 2024 directory extract and
-- the 2025 directory extract (114 Anantnag post offices).
--
-- Included pincodes (a delivery office in Anantnag district):
--   192101  Anantnag HO
--   192122  Anantnag City SO
--           (also used by Pulwama delivery offices such as Awantipora; kept
--           because an Anantnag post office uses this pincode)
--   192124  Bijbehara SO
--           (also used by Qaimoh B.O in Kulgam and some Pulwama/Shopian offices;
--           kept because Bijbehara and other Anantnag offices use it)
--   192125  Martand SO
--   192126  Pahalgam SO
--   192129  Ashmuqam BO / S K Gund
--   192201  Achabal SO
--   192202  Kokarnag SO
--   192210  Dialgam
--   192211  Dooru SO
--   192212  Verinaag SO
--   192221  Qazigund SO
--   192401  Srigufwaea SO
--
-- Excluded because every post office is outside Anantnag (Kulgam, and for
-- 192232 also Shopian):
--   192231  Kulgam SO
--   192232  Yaripora SO
--   192233  Damhal Hanji Pora SO
--
-- Amounts are paise: delivery fee ₹25, free when subtotal >= ₹500, COD limit
-- ₹5,000. ON CONFLICT DO NOTHING so an admin edit is never overwritten.

INSERT INTO "DeliveryZone" ("pincode", "fee", "freeAbove", "codLimit", "active")
VALUES
  ('192101', 2500, 50000, 500000, true),
  ('192122', 2500, 50000, 500000, true),
  ('192124', 2500, 50000, 500000, true),
  ('192125', 2500, 50000, 500000, true),
  ('192126', 2500, 50000, 500000, true),
  ('192129', 2500, 50000, 500000, true),
  ('192201', 2500, 50000, 500000, true),
  ('192202', 2500, 50000, 500000, true),
  ('192210', 2500, 50000, 500000, true),
  ('192211', 2500, 50000, 500000, true),
  ('192212', 2500, 50000, 500000, true),
  ('192221', 2500, 50000, 500000, true),
  ('192401', 2500, 50000, 500000, true)
ON CONFLICT ("pincode") DO NOTHING;
