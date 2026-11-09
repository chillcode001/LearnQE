import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  Builder,
  By,
  Select,
  error as seleniumError,
  until,
} from 'selenium-webdriver';
import { Options } from 'selenium-webdriver/chrome';
import type { WebDriver } from 'selenium-webdriver';

const API_BASE_URL = process.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';
const APP_BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const SKU = `SEL-${randomUUID().slice(0, 8)}`;
const ITEM_NAME = `Selenium smoke item ${randomUUID().slice(0, 8)}`;
const STARTING_QUANTITY = 9;
const REORDER_POINT = 10;
const RECEIVED_QUANTITY = 2;
const EXPECTED_QUANTITY = STARTING_QUANTITY + RECEIVED_QUANTITY;

let driver: WebDriver | undefined;
let itemCreated = false;

async function createSmokeItem(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sku: SKU,
      name: ITEM_NAME,
      price: 19.99,
      quantity: STARTING_QUANTITY,
      reorder_point: REORDER_POINT,
      category: 'Selenium smoke test',
      price_currency: 'CAD',
      source_market: 'CA',
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Could not create Selenium smoke SKU ${SKU}: ${response.status} ${await response.text()}`,
    );
  }

  itemCreated = true;
}

async function deleteSmokeItem(): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/items/${encodeURIComponent(SKU)}`,
    { method: 'DELETE' },
  );

  if (!response.ok && response.status !== 404) {
    throw new Error(`Could not delete Selenium smoke SKU ${SKU}: ${response.status}`);
  }
}

function isStaleElementError(error: unknown): boolean {
  return error instanceof seleniumError.StaleElementReferenceError;
}

async function readSmokeItemRowText(webDriver: WebDriver): Promise<string | undefined> {
  try {
    const rows = await webDriver.findElements(
      By.css('.inventory-table tbody tr'),
    );

    for (const row of rows) {
      const rowText = await row.getText();

      if (rowText.includes(SKU)) {
        return rowText;
      }
    }
  } catch (error: unknown) {
    if (isStaleElementError(error)) {
      return undefined;
    }

    throw error;
  }

  return undefined;
}

async function waitForSmokeItemRowText(webDriver: WebDriver): Promise<string> {
  return webDriver.wait(async () => {
    const rowText = await readSmokeItemRowText(webDriver);
    return rowText?.includes(SKU) ? rowText : false;
  }, 10_000, `The inventory row for ${SKU} should appear.`);
}

async function runSmokeFlow(): Promise<void> {
  await createSmokeItem();
  const chromeOptions = new Options();

  if (process.env.CHROME_PATH) {
    chromeOptions.setChromeBinaryPath(process.env.CHROME_PATH);
  }

  if (process.env.CI) {
    chromeOptions.addArguments(
      '--headless=new',
      '--disable-dev-shm-usage',
      '--no-sandbox',
    );
  }

  driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build();

  await driver.get(APP_BASE_URL);

  const searchInput = await driver.wait(
    until.elementLocated(By.css('input[aria-label="Search inventory"]')),
    10_000,
  );
  await searchInput.sendKeys(SKU);

  const initialRowText = await waitForSmokeItemRowText(driver);
  assert.match(initialRowText, /Low stock/);

  const receiveButton = await driver.wait(
    until.elementLocated(
      By.xpath("//button[contains(normalize-space(.), 'Receive stock')]"),
    ),
    10_000,
  );
  await receiveButton.click();

  const dialog = await driver.wait(
    until.elementLocated(By.css('[role="dialog"]')),
    10_000,
  );
  await driver.wait(until.elementIsVisible(dialog), 10_000);

  const itemSelect = new Select(
    await dialog.findElement(
      By.xpath(".//label[starts-with(normalize-space(.), 'Item')]/select"),
    ),
  );
  await itemSelect.selectByValue(SKU);

  const quantityInput = await dialog.findElement(
    By.xpath(".//label[contains(normalize-space(.), 'Quantity received')]/input"),
  );
  await quantityInput.sendKeys(String(RECEIVED_QUANTITY));

  const reasonSelect = new Select(
    await dialog.findElement(
      By.xpath(".//label[starts-with(normalize-space(.), 'Reason')]/select"),
    ),
  );
  await reasonSelect.selectByVisibleText('Customer return');

  await dialog.findElement(
    By.xpath(".//button[normalize-space(.)='Save movement']"),
  ).click();

  await driver.wait(async () => {
    const rowText = await readSmokeItemRowText(driver!);
    return rowText?.includes(`${EXPECTED_QUANTITY} units`)
      && rowText.includes('In stock');
  }, 10_000, 'The inventory row should show the received quantity and in-stock status.');

  await driver.wait(async () => {
    try {
      const movementRows = await driver!.findElements(By.css('.movement-row'));
      const rowTexts = await Promise.all(movementRows.map(row => row.getText()));
      return rowTexts.some(rowText => (
        rowText.includes(SKU) && rowText.includes('Customer return')
      ));
    } catch (error: unknown) {
      if (isStaleElementError(error)) {
        return false;
      }

      throw error;
    }
  }, 10_000, 'The new stock receipt should appear in movement history.');

  const persistedItemResponse = await fetch(`${API_BASE_URL}/api/items/${SKU}`);
  assert.equal(persistedItemResponse.status, 200);
  const persistedItem = await persistedItemResponse.json() as { quantity: number };
  assert.equal(persistedItem.quantity, EXPECTED_QUANTITY);

  const movementResponse = await fetch(`${API_BASE_URL}/api/movements?limit=100`);
  assert.equal(movementResponse.status, 200);
  const movements = await movementResponse.json() as Array<{
    sku: string;
    change: number;
    reason: string;
    quantity_after: number;
  }>;
  const persistedMovement = movements.find(movement => movement.sku === SKU);

  assert.ok(persistedMovement, 'The receipt should be persisted in movement history.');
  assert.equal(persistedMovement.change, RECEIVED_QUANTITY);
  assert.equal(persistedMovement.reason, 'Customer return');
  assert.equal(persistedMovement.quantity_after, EXPECTED_QUANTITY);

  console.log(
    `Selenium smoke passed: received ${RECEIVED_QUANTITY} units for ${SKU} and verified the saved inventory and movement.`,
  );
}

async function main(): Promise<void> {
  try {
    await runSmokeFlow();
  } finally {
    try {
      await driver?.quit();
    } finally {
      if (itemCreated) {
        await deleteSmokeItem();
      }
    }
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
