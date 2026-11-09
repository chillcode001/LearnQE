export type InventoryItem = {
  id: number;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  reorderPoint: number;
  price: number;
  priceCurrency: 'CAD' | 'USD';
  imageUrl: string;
};

export type StockMovement = {
  id: number;
  itemName: string;
  sku: string;
  change: number;
  reason: string;
  timestamp: string;
  quantityAfter: number;
};
