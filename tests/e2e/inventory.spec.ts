import { test, expect } from '../fixtures/inventory.fixture';
import type { MovementForm } from '../fixtures/inventory.fixture';

// helper methods to fill forms
async function adjustStockBy(
    adjustStock: MovementForm,
    details: {
        sku: string,
        quantityToRemove: number,
        reason: 'Damaged goods' | 'Cycle count correction' | 'Lost or stolen' | 'Write-off'
    }
) {
    await adjustStock.selectSku(details.sku);
    await adjustStock.enterQuantity(details.quantityToRemove);
    await adjustStock.selectReason(details.reason);
    await adjustStock.saveMovement();
}

async function addStockBy(
    receiveStock: MovementForm,
    details: {
        sku: string,
        quantityToAdd: number,
        reason: | 'Purchase order received' | 'Customer return' | 'Transfer received'
    }
) {
    await receiveStock.selectSku(details.sku);
    await receiveStock.enterQuantity(details.quantityToAdd);
    await receiveStock.selectReason(details.reason);
    await receiveStock.saveMovement();
}

test('check for out of stock status at zero quantity', async ({ inventoryItem, inventoryPage, stockOperations }) => {
    const { sku } = inventoryItem;

    // make the stock '0'
    const adjustment = await stockOperations.adjust();
    await adjustStockBy(adjustment, {
        sku,
        quantityToRemove: 24,
        reason: 'Write-off'
    });

    // check if it is out of stock status
    const row = inventoryPage.findRowBySku(sku);
    await expect(row).toBeVisible();
    await expect(row).toContainText('Out of stock');
})

test('check for low stock status at reorder point', async ({ inventoryItem, inventoryPage, stockOperations }) => {
    const { sku } = inventoryItem;

    // make the stock '0'
    const adjustment = await stockOperations.adjust();
    await adjustStockBy(adjustment, {
        sku,
        quantityToRemove: 24,
        reason: 'Write-off'
    });

    // add the stock upto reorder point
    const receipt = await stockOperations.receive();
    await addStockBy(receipt, {
        sku,
        quantityToAdd: 10,
        reason: 'Purchase order received'
    })

    // check if it is low stock status
    const row = inventoryPage.findRowBySku(sku);
    await expect(row).toBeVisible();
    await expect(row).toContainText('Low stock');
})

test('check for in stock status at one plus reorder point', async ({ inventoryItem, inventoryPage, stockOperations }) => {
    const { sku } = inventoryItem;

    // make the stock '0'
    const adjustment = await stockOperations.adjust();
    await adjustStockBy(adjustment, {
        sku,
        quantityToRemove: 24,
        reason: 'Write-off'
    });

    // add the stock above reorder point
    const receipt = await stockOperations.receive();
    await addStockBy(receipt, {
        sku,
        quantityToAdd: 11,
        reason: 'Purchase order received'
    })

    // check if it is in stock status
    const row = inventoryPage.findRowBySku(sku);
    await expect(row).toBeVisible();
    await expect(row).toContainText('In stock');
})

test('check for adding negative value', async ({ inventoryItem, inventoryPage, stockOperations }) => {
    const { sku } = inventoryItem;
    // add the negative value
    const receipt = await stockOperations.receive();
    await addStockBy(receipt, {
        sku,
        quantityToAdd: -1,
        reason: 'Purchase order received'
    })

    // check if it is invalid
    await expect(inventoryPage.page.getByLabel('Quantity received')).toHaveJSProperty('validity.valid', false);
})

test('check for removing negative value', async ({ inventoryItem, inventoryPage, stockOperations }) => {
    const { sku } = inventoryItem;
    // make the stock '0'
    const adjustment = await stockOperations.adjust();
    await adjustStockBy(adjustment, {
        sku,
        quantityToRemove: -6,
        reason: 'Write-off'
    });

    // check if it is invalid
    await expect(inventoryPage.page.getByLabel('Quantity to remove')).toHaveJSProperty('validity.valid', false);
})


test('check for adding invalid value', async ({ inventoryItem, inventoryPage, stockOperations }) => {
    const { sku } = inventoryItem;
    // add the negative value
    const receipt = await stockOperations.receive();
    await addStockBy(receipt, {
        sku,
        quantityToAdd: 3.67,
        reason: 'Purchase order received'
    })

    // check if it is invalid
    await expect(inventoryPage.page.getByLabel('Quantity received')).toHaveJSProperty('validity.valid', false);
})

test('check for removing invalid value', async ({ inventoryItem, inventoryPage, stockOperations }) => {
    const { sku } = inventoryItem;
    // make the stock '0'
    const adjustment = await stockOperations.adjust();
    await adjustStockBy(adjustment, {
        sku,
        quantityToRemove: 4.66,
        reason: 'Write-off'
    });

    // check if it is invalid
    await expect(inventoryPage.page.getByLabel('Quantity to remove')).toHaveJSProperty('validity.valid', false);
})

test('shows only low-stock items when the Low stock filter is selected', async ({ inventoryItem, inventoryPage, stockOperations }) => {
    const { sku, startingQuantity, reorderPoint } = inventoryItem;
    const adjustment = await stockOperations.adjust();
    await adjustStockBy(adjustment, {
        sku,
        quantityToRemove: startingQuantity - reorderPoint,
        reason: 'Cycle count correction'
    });

    // select the low stock status
    const status = 'Low stock';
    await inventoryPage.getSkuByStatus(status);

    const inventoryTable = inventoryPage.page.locator('.inventory-table');
    const rows = inventoryTable.locator('tbody').getByRole('row');

    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText(sku);
    await expect(rows.first()).toContainText(status);
});
