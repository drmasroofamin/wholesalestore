export type SavedAddress = {
  id: string;
  label: string;
  line: string;
  pincode: string;
  isDefault: boolean;
};
export type CustomerProfile = {
  id: string;
  name: string;
  phone: string;
  addresses: SavedAddress[];
  needsProfile: boolean;
};
export type CustomerHistoryOrder = {
  id: string;
  total: number;
  status: string;
  paymentStatus: string;
  method: string;
  createdAt: string;
  customerName: string;
  phone: string;
  address: string;
  pincode: string;
  slot: string;
  receiptToken: string;
  demo: false;
  items: {
    id: string;
    name: string;
    pack: string;
    quantity: number;
    price: number;
    total: number;
  }[];
  history: { status: string; at: string }[];
};
