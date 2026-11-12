import { customerWrite, privateJson } from '@/lib/customer-http';
import { requireCustomer } from '@/lib/customer-auth';
import { saveProfile, profileInput } from '@/lib/customer-profile';
import { readJson, apiError } from '@/lib/http';
export async function PUT(req: Request) {
  try {
    customerWrite(req);
    const customer = await requireCustomer(req);
    return privateJson({
      customer: await saveProfile(customer.id, profileInput.parse(await readJson(req, 4096))),
    });
  } catch (e) {
    return apiError(e);
  }
}
