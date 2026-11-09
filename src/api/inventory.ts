import type { InventoryItem, StockMovement } from '../types/product';

type ApiInventoryItem = {
  id: number;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  reorder_point: number;
  price: number;
  price_currency: 'CAD' | 'USD';
  image_url: string;
};

type ApiStockMovement = {
  id: number;
  sku: string;
  item_name: string;
  change: number;
  reason: string;
  recorded_at: string;
  quantity_after: number;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';
export const INVENTORY_PAGE_SIZE = 15;

export type InventoryPage = {
  items: InventoryItem[];
  total: number;
};

export type InventoryFilters = {
  search: string;
  status: 'All stock' | 'In stock' | 'Low stock' | 'Out of stock';
};

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
  });

  const responseBody = await response.json().catch(() => undefined) as
    | { detail?: unknown }
    | undefined;

  if (!response.ok) {
    const detail = responseBody?.detail;
    const message = typeof detail === 'string'
      ? detail
      : `The inventory service returned ${response.status}.`;
    throw new Error(message);
  }

  return responseBody as T;
}

function toInventoryItem(item: ApiInventoryItem): InventoryItem {
  return {
    id: item.id,
    sku: item.sku,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    reorderPoint: item.reorder_point,
    price: item.price,
    priceCurrency: item.price_currency,
    imageUrl: item.image_url,
  };
}

function toStockMovement(movement: ApiStockMovement): StockMovement {
  return {
    id: movement.id,
    sku: movement.sku,
    itemName: movement.item_name,
    change: movement.change,
    reason: movement.reason,
    timestamp: movement.recorded_at,
    quantityAfter: movement.quantity_after,
  };
}

export async function fetchInventoryPage(
  page: number,
  filters: InventoryFilters,
): Promise<InventoryPage> {
  const parameters = new URLSearchParams({
    limit: String(INVENTORY_PAGE_SIZE),
    offset: String((page - 1) * INVENTORY_PAGE_SIZE),
    search: filters.search,
  });

  if (filters.status !== 'All stock') {
    parameters.set('status', filters.status.toLowerCase().replace(' ', '_'));
  }

  const response = await fetch(`${API_BASE_URL}/api/items?${parameters}`);
  const responseBody = await response.json().catch(() => undefined) as
    | ApiInventoryItem[]
    | { detail?: unknown }
    | undefined;

  if (!response.ok || !Array.isArray(responseBody)) {
    const detail = responseBody && 'detail' in responseBody
      ? responseBody.detail
      : undefined;
    const message = typeof detail === 'string'
      ? detail
      : `The inventory service returned ${response.status}.`;
    throw new Error(message);
  }

  return {
    items: responseBody.map(toInventoryItem),
    total: Number(response.headers.get('X-Total-Count') ?? responseBody.length),
  };
}

export async function fetchStockMovements(): Promise<StockMovement[]> {
  const movements = await requestJson<ApiStockMovement[]>('/api/movements?limit=5');
  return movements.map(toStockMovement);
}

export async function recordStockMovement(
  sku: string,
  mode: 'receive' | 'adjust',
  quantity: number,
  reason: string,
): Promise<StockMovement> {
  const endpoint = mode === 'receive' ? 'receipts' : 'adjustments';

  const movement = await requestJson<ApiStockMovement>(
    `/api/items/${encodeURIComponent(sku)}/${endpoint}`,
    {
      method: 'POST',
      body: JSON.stringify({ quantity, reason }),
    },
  );

  return toStockMovement(movement);
}
