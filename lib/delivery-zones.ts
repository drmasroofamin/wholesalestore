import { ANANTNAG_ZONES } from './store-profile';

export type PublicZone = {
  pincode: string;
  area: string;
  fee: number;
  freeAbove: number;
  codLimit: number;
};

const AREAS = new Map<string, string>(ANANTNAG_ZONES.map((zone) => [zone.pincode, zone.area]));

/** Paise. Matches the Anantnag delivery-zone migration when an admin has not edited a row. */
export const STANDARD_DELIVERY_FEE = 2500;
export const STANDARD_FREE_ABOVE = 50000;
export const STANDARD_COD_LIMIT = 500000;

export const standardZones = (): PublicZone[] =>
  ANANTNAG_ZONES.map((zone) => ({
    pincode: zone.pincode,
    area: zone.area,
    fee: STANDARD_DELIVERY_FEE,
    freeAbove: STANDARD_FREE_ABOVE,
    codLimit: STANDARD_COD_LIMIT,
  }));

/** Active DeliveryZone rows when the database is reachable, otherwise the migrated Anantnag list. */
export async function publicDeliveryZones(): Promise<PublicZone[]> {
  if (!process.env.DATABASE_URL) return standardZones();
  try {
    const { database } = await import('./db');
    const rows = await database().deliveryZone.findMany({
      where: { active: true },
      orderBy: { pincode: 'asc' },
    });
    if (!rows.length) return standardZones();
    return rows.map((row) => ({
      pincode: row.pincode,
      area: AREAS.get(row.pincode) || 'Anantnag district',
      fee: row.fee,
      freeAbove: row.freeAbove,
      codLimit: row.codLimit,
    }));
  } catch {
    return standardZones();
  }
}
