export type RazorpayResult = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};
type Options = {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  handler: (result: RazorpayResult) => void;
  modal: { ondismiss: () => void };
  theme: { color: string };
};
declare global {
  interface Window {
    Razorpay?: new (options: Options) => { open: () => void };
  }
}
let loading: Promise<void> | undefined;
export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  if (!loading)
    loading = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () =>
        window.Razorpay ? resolve() : reject(new Error('Payment checkout could not load'));
      script.onerror = () =>
        reject(new Error('Payment checkout could not load. Check your connection and try again.'));
      document.head.appendChild(script);
    }).catch((error) => {
      loading = undefined;
      throw error;
    });
  return loading;
}
