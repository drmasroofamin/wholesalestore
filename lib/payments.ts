// Server-only provider boundary. Never import this module into a client component.
import { validSignature } from './security';
export interface PaymentProvider {
  createOrder(input: {
    receipt: string;
    amount: number;
  }): Promise<{ id: string; amount: number; currency: string }>;
  getPayment(
    id: string,
  ): Promise<{ id: string; order_id: string; amount: number; currency: string; status: string }>;
  refund(input: {
    paymentId: string;
    amount: number;
    reference: string;
  }): Promise<{ id: string; status: string }>;
  verifyWebhook(body: string, signature: string): boolean;
}
export class RazorpayProvider implements PaymentProvider {
  constructor(
    private keyId: string,
    private keySecret: string,
    private webhookSecret: string,
    private transport: typeof fetch = fetch,
  ) {}
  private async request(path: string, body?: unknown) {
    const response = await this.transport(`https://api.razorpay.com/v1/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Payment provider returned ${response.status}`);
    return response.json();
  }
  async createOrder(input: { receipt: string; amount: number }) {
    if (
      !Number.isSafeInteger(input.amount) ||
      input.amount < 100 ||
      !input.receipt ||
      input.receipt.length > 40
    )
      throw new Error('Invalid payment order');
    const order = await this.request('orders', {
      amount: input.amount,
      currency: 'INR',
      receipt: input.receipt,
    });
    if (typeof order.id !== 'string' || order.amount !== input.amount || order.currency !== 'INR')
      throw new Error('Gateway order mismatch');
    return { id: order.id, amount: order.amount, currency: order.currency };
  }
  async getPayment(id: string) {
    if (!/^pay_[a-zA-Z0-9]+$/.test(id)) throw new Error('Invalid payment ID');
    return this.request(`payments/${id}`);
  }
  async refund(input: { paymentId: string; amount: number; reference: string }) {
    if (
      !/^pay_[a-zA-Z0-9]+$/.test(input.paymentId) ||
      !Number.isSafeInteger(input.amount) ||
      input.amount <= 0 ||
      !input.reference
    )
      throw new Error('Invalid refund');
    // Caller must persist a unique refund reference under a transaction lock before
    // calling the provider, and reconcile timeouts rather than blindly retrying.
    return this.request(`payments/${input.paymentId}/refund`, {
      amount: input.amount,
      receipt: input.reference,
    });
  }
  verifyWebhook(body: string, signature: string) {
    return validSignature(body, signature, this.webhookSecret);
  }
}
export function assertCaptured(
  payment: { order_id: string; amount: number; currency: string; status: string },
  expected: { orderId: string; amount: number },
) {
  if (
    payment.order_id !== expected.orderId ||
    payment.amount !== expected.amount ||
    payment.currency !== 'INR' ||
    payment.status !== 'captured'
  )
    throw new Error('Payment is not captured for the expected order and amount');
}
