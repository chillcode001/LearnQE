import { Builder, By, until } from 'selenium-webdriver';

// Compare Selenium's explicit waits and driver lifecycle with Playwright's auto-waiting.
const driver = await new Builder().forBrowser('chrome').build();

try {
  const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
  await driver.get(baseUrl);

  const searchInput = await driver.wait(
    until.elementLocated(By.css('input[placeholder="Find something..."]')),
    5_000,
  );
  await searchInput.sendKeys('mug');

  await driver.wait(
    until.elementLocated(By.xpath("//*[text()='Ceramic Coffee Mug']")),
    5_000,
  );

  console.log('Selenium smoke check passed: product search rendered the mug.');
} finally {
  await driver.quit();
}
