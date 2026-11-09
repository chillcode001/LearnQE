import { test as base, expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

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
  inventoryPage: InventoryPage;
  stockOperations: StockOperations;
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
  inventoryPage: async ({ page }, use) => {
    await page.goto('/');

    await use({
      page,
      findRowBySku: sku =>
        page.getByRole('row').filter({ hasText: sku }),
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
