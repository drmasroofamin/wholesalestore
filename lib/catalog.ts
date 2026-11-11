export type Product = {
  id: string;
  name: string;
  hindi: string;
  category: string;
  pack: string;
  price: number;
  mrp: number;
  wholesale: number;
  image: string;
  tag?: string;
  rating: string;
  stock: number;
  hsn: string;
  gst: number;
};
export const categories = [
  { name: 'All essentials', emoji: '✳', count: 8 },
  { name: 'Rice', emoji: '🍚', count: 1 },
  { name: 'Atta & flour', emoji: '🌾', count: 1 },
  { name: 'Pulses & dals', emoji: '🫘', count: 3 },
  { name: 'Millets', emoji: '🌿', count: 1 },
  { name: 'Oils & ghee', emoji: '🫒', count: 1 },
  { name: 'Sugar & spices', emoji: '🧂', count: 1 },
];
export const products: Product[] = [
  {
    id: 'basmati',
    name: 'Premium Basmati Rice',
    hindi: 'बासमती चावल',
    category: 'Rice',
    pack: '5 kg',
    price: 64900,
    mrp: 79900,
    wholesale: 59500,
    image: '/products/rice.svg',
    tag: 'BESTSELLER',
    rating: '4.9',
    stock: 120,
    hsn: '1006',
    gst: 5,
  },
  {
    id: 'atta',
    name: 'Chakki Fresh Atta',
    hindi: 'चक्की आटा',
    category: 'Atta & flour',
    pack: '5 kg',
    price: 22500,
    mrp: 28000,
    wholesale: 20500,
    image: '/products/atta.svg',
    tag: 'FRESHLY MILLED',
    rating: '4.8',
    stock: 180,
    hsn: '1101',
    gst: 5,
  },
  {
    id: 'toor',
    name: 'Unpolished Toor Dal',
    hindi: 'अरहर दाल',
    category: 'Pulses & dals',
    pack: '1 kg',
    price: 15900,
    mrp: 19500,
    wholesale: 14500,
    image: '/products/dal.svg',
    rating: '4.8',
    stock: 90,
    hsn: '0713',
    gst: 5,
  },
  {
    id: 'mustard',
    name: 'Cold Pressed Mustard Oil',
    hindi: 'सरसों का तेल',
    category: 'Oils & ghee',
    pack: '1 litre',
    price: 18900,
    mrp: 24000,
    wholesale: 17200,
    image: '/products/oil.svg',
    tag: '100% PURE',
    rating: '4.7',
    stock: 70,
    hsn: '1514',
    gst: 5,
  },
  {
    id: 'moong',
    name: 'Whole Green Moong',
    hindi: 'साबुत मूंग',
    category: 'Pulses & dals',
    pack: '1 kg',
    price: 12900,
    mrp: 16000,
    wholesale: 11700,
    image: '/products/moong.svg',
    rating: '4.8',
    stock: 80,
    hsn: '0713',
    gst: 5,
  },
  {
    id: 'sugar',
    name: 'Natural Sulphur-free Sugar',
    hindi: 'चीनी',
    category: 'Sugar & spices',
    pack: '1 kg',
    price: 5500,
    mrp: 6500,
    wholesale: 4800,
    image: '/products/sugar.svg',
    rating: '4.6',
    stock: 200,
    hsn: '1701',
    gst: 5,
  },
  {
    id: 'millet',
    name: 'Organic Pearl Millet',
    hindi: 'बाजरा',
    category: 'Millets',
    pack: '1 kg',
    price: 8900,
    mrp: 11500,
    wholesale: 7900,
    image: '/products/millet.svg',
    tag: 'ORGANIC',
    rating: '4.8',
    stock: 75,
    hsn: '1008',
    gst: 5,
  },
  {
    id: 'chana',
    name: 'Premium Kabuli Chana',
    hindi: 'काबुली चना',
    category: 'Pulses & dals',
    pack: '1 kg',
    price: 14900,
    mrp: 18000,
    wholesale: 13500,
    image: '/products/chana.svg',
    rating: '4.9',
    stock: 95,
    hsn: '0713',
    gst: 5,
  },
];
export const money = (paise: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);
