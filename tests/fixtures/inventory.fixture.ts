import { test as base, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import type { APIRequestContext, Locator, Page } from '@playwright/test';

const API_BASE_URL = process.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

export interface TestInventoryItem {
  sku: string;
  name: string;
  startingQuantity: number;
  reorderPoint: number;
}

interface InventoryPage {
  page: Page;
  findRowBySku: (sku: string) => Locator;
  getSkuByStatus: (status: string) => Promise<void>;
}

export interface MovementForm {
  selectSku: (sku: string) => Promise<void>;
  enterQuantity: (quantity: number) => Promise<void>;
  selectReason: (reason: string) => Promise<void>;
  saveMovement: () => Promise<void>;
}

interface StockOperations {
  receive: () => Promise<MovementForm>;
  adjust: () => Promise<MovementForm>;
}

interface Fixtures {
  inventoryItem: TestInventoryItem;
  inventoryPage: InventoryPage;
  stockOperations: StockOperations;
}

async function createInventoryItem(
  request: APIRequestContext,
  item: TestInventoryItem,
): Promise<void> {
  const response = await request.post(`${API_BASE_URL}/api/items`, {
    data: {
      sku: item.sku,
      name: item.name,
      price: 9.99,
      quantity: item.startingQuantity,
      reorder_point: item.reorderPoint,
      category: 'QA test data',
      price_currency: 'CAD',
      source_market: 'CA',
    },
  });

  if (!response.ok()) {
    throw new Error(
      `Could not create test SKU ${item.sku}: ${response.status()} ${await response.text()}`,
    );
  }
}

async function deleteInventoryItem(
  request: APIRequestContext,
  sku: string,
): Promise<void> {
  const response = await request.delete(
    `${API_BASE_URL}/api/items/${encodeURIComponent(sku)}`,
  );

  if (!response.ok() && response.status() !== 404) {
    throw new Error(`Could not clean up test SKU ${sku}: ${response.status()}`);
  }
}

function createMovementForm(
  form: Locator,
  quantityLabel: string,
): MovementForm {
  return {
    selectSku: async sku => {
      const itemSelect = form.getByLabel('Item');
      const matchingOption = itemSelect
        .locator('option')
        .filter({ hasText: sku });
      const optionValue = await matchingOption.getAttribute('value');

      if (!optionValue) {
        throw new Error(`No inventory item found for SKU: ${sku}`);
      }

      await itemSelect.selectOption(optionValue);
    },
    enterQuantity: async quantity => {
      await form.getByLabel(quantityLabel).fill(String(quantity));
    },
    selectReason: async reason => {
      await form.getByLabel('Reason').selectOption({ label: reason });
    },
    saveMovement: async () => {
      await form.getByRole('button', { name: 'Save movement' }).click();
    },
  };
}

export const test = base.extend<Fixtures>({
  inventoryItem: async ({ request }, use, testInfo) => {
    const inventoryItem: TestInventoryItem = {
      sku: `QE-${testInfo.workerIndex}-${randomUUID().slice(0, 8)}`,
      name: `Playwright stock item ${randomUUID().slice(0, 8)}`,
      startingQuantity: 24,
      reorderPoint: 10,
    };

    await createInventoryItem(request, inventoryItem);

    try {
      await use(inventoryItem);
    } finally {
      await deleteInventoryItem(request, inventoryItem.sku);
    }
  },

  inventoryPage: async ({ page, inventoryItem }, use) => {
    await page.goto('/');
    await page.getByLabel('Search inventory').fill(inventoryItem.sku);
    await page.getByRole('row').filter({ hasText: inventoryItem.sku }).waitFor();

    await use({
      page,
      findRowBySku: sku => page.getByRole('row').filter({ hasText: sku }),
      getSkuByStatus: async (status) => {
        await page.getByLabel('Status').selectOption({ label: status });
      }
    });
  },

  stockOperations: async ({ page }, use) => {
    await use({
      receive: async () => {
        await page.getByRole('button', { name: 'Receive stock' }).click();
        const receiveDialog = page.getByRole('dialog');
        return createMovementForm(receiveDialog, 'Quantity received');
      },
      adjust: async () => {
        await page.getByRole('button', { name: 'Adjust stock' }).click();
        const adjustDialog = page.getByRole('dialog');
        return createMovementForm(adjustDialog, 'Quantity to remove');
      },
    });
  },
});

export { expect };
