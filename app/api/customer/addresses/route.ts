import { customerWrite, privateJson } from '@/lib/customer-http';
import { requireCustomer } from '@/lib/customer-auth';
import { saveAddress, addressInput } from '@/lib/customer-profile';
import { readJson, apiError } from '@/lib/http';
export async function POST(req: Request) {
  try {
    customerWrite(req);
    const customer = await requireCustomer(req);
    const data = addressInput.parse(await readJson(req, 4096));
    return privateJson({ customer: await saveAddress(customer.id, data) });
  } catch (e) {
    return apiError(e);
  }
}
