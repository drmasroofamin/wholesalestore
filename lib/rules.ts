import { products, Product } from './catalog';
export function priceFor(quantity: number, retailer: boolean, price: number, wholesale: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500)
    throw new Error('Invalid quantity');
  return retailer
    ? quantity >= 50
      ? Math.round(wholesale * 0.96)
      : quantity >= 10
        ? wholesale
        : price
    : price;
}
export function creditAllowed(total: number, limit: number, outstanding: number, overdue: boolean) {
  return !overdue && total <= limit - outstanding;
}
export function splitTax(inclusive: number, rate: number, interstate = false) {
  const total = Math.round((inclusive * rate) / (100 + rate));
  return {
    tax: total,
    cgst: interstate ? 0 : Math.floor(total / 2),
    sgst: interstate ? 0 : total - Math.floor(total / 2),
    igst: interstate ? total : 0,
  };
}
export function quote(
  items: { id: string; quantity: number }[],
  coupon = '',
  catalogue: Product[] = products,
) {
  if (!items.length || items.length > 50) throw new Error('Add between 1 and 50 products');
  const lines = items.map((i) => {
    const p = catalogue.find((p) => p.id === i.id);
    if (!p) throw new Error('Unknown product');
    priceFor(i.quantity, false, p.price, p.wholesale);
    if (i.quantity > p.stock) throw new Error(`${p.name} has insufficient stock`);
    return { ...i, price: p.price, total: p.price * i.quantity, gst: p.gst };
  });
  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const discount =
    coupon.toUpperCase() === 'WELCOME10' ? Math.min(Math.round(subtotal * 0.1), 10000) : 0;
  const delivery = subtotal >= 99900 ? 0 : 3900;
  return {
    lines,
    subtotal,
    discount,
    delivery,
    total: subtotal - discount + delivery,
    tax: lines.reduce((s, l) => s + splitTax(l.total, l.gst).tax, 0),
  };
}
